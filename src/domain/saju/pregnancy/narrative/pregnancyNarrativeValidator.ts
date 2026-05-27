// 임산부 모드 V4 — Report Validator (Phase 5)
//
// 역할:
//   - PregnancyNarrativeReport를 받아 ABSOLUTE_RULES + 품질 룰 위반을 issue로 산출.
//   - severity 정책 (의료/출산 민감 → 강하게):
//       · 사용자 노출 위험 = high (의료/건강/출산위험/성별/성격단정/엄마탓/출산일/운명/invented/log/parse/length)
//       · 품질·분량·일반론 = medium
//   - high 1+ 섹션 또는 medium 누적(2+) 섹션을 repairTargets로 표시.
//   - 최종 게이트: highCount === 0 아니면 isValid=false → 노출 금지 (generator/route에서 처리).
//
// 정합: LLM 호출 X. 정규식·구조 검사만. sanitizer와 키워드 align.

import type {
  PregnancyNarrativeReport, PregnancyNarrativeSectionId,
  PregnancyNarrativeContext, PregnancyNarrativePlanSet,
  PregnancyNarrativeIssueType, PregnancyNarrativeValidationIssue, PregnancyNarrativeValidationResult,
} from './pregnancyNarrativeTypes';
import type { PregnancyAnalysisBundle } from './pregnancyMomBabyAnalyzer';

export interface PregnancyNarrativeValidatorInput {
  report: PregnancyNarrativeReport;
  bundle: PregnancyAnalysisBundle;
  plans: PregnancyNarrativePlanSet;
  ctx: PregnancyNarrativeContext;
  generatorFlags?: {
    jsonParseFailedSections?: PregnancyNarrativeSectionId[];
    finishLengthSections?: PregnancyNarrativeSectionId[];
  };
}

const MEDIUM_REPAIR_THRESHOLD = 2;
const MEDIUM_GLOBAL_THRESHOLD = 6;
const MEDIUM_INVALID_THRESHOLD = 12;

const LLM_SECTIONS: PregnancyNarrativeSectionId[] = [
  'openingConnection', 'motherChildMechanism', 'motherComfortRhythm',
  'babyEnergyAndFit', 'taegyoGuide', 'motherFortuneRoutine', 'familySupportAndFinalMessage',
];

function mkIssue(
  type: PregnancyNarrativeIssueType,
  sectionId: PregnancyNarrativeSectionId | 'global',
  sentence: string,
  reason: string,
  severity: 'low' | 'medium' | 'high',
  suggestion: string,
): PregnancyNarrativeValidationIssue {
  return { type, sectionId, sentence, reason, severity, suggestion };
}

function firstMatch(text: string | undefined, re: RegExp): string | undefined {
  if (!text) return undefined;
  const m = text.match(re);
  return m ? m[0] : undefined;
}

function body(report: PregnancyNarrativeReport, sec: PregnancyNarrativeSectionId): string {
  switch (sec) {
    case 'openingConnection': return `${report.openingConnection?.oneLine ?? ''} ${report.openingConnection?.body ?? ''}`;
    case 'motherChildMechanism': return report.motherChildMechanism?.body ?? '';
    case 'motherComfortRhythm': return report.motherComfortRhythm?.body ?? '';
    case 'babyEnergyAndFit': return report.babyEnergyAndFit?.body ?? '';
    case 'taegyoGuide': return report.taegyoGuide?.body ?? '';
    case 'motherFortuneRoutine': return report.motherFortuneRoutine?.body ?? '';
    case 'familySupportAndFinalMessage': return `${report.familySupportAndFinalMessage?.body ?? ''} ${report.familySupportAndFinalMessage?.finalMessage ?? ''}`;
    default: return '';
  }
}

function sectionBodies(report: PregnancyNarrativeReport): Array<[PregnancyNarrativeSectionId, string]> {
  return LLM_SECTIONS.map(sec => [sec, body(report, sec)] as [PregnancyNarrativeSectionId, string]);
}

function joinReportText(report: PregnancyNarrativeReport): string {
  const parts: Array<string | undefined> = [
    ...LLM_SECTIONS.map(sec => body(report, sec)),
    ...((report.motherChildMechanism?.evidenceBlocks ?? []).flatMap(b => [
      b.causalExplanation, b.betweenScene, b.positiveUse, b.shadowPattern, b.taegyoAdvice,
      ...(b.evidence ?? []).map(e => `${e.label} ${e.plainMeaning}`),
    ])),
  ];
  return parts.filter((s): s is string => Boolean(s)).join('\n');
}

// ============================================================
// HIGH — 정규식
// ============================================================
const ENGLISH_ELEMENT_RE = /\b(wood|fire|earth|metal|water)\b/i;

// medical-advice-risk: 약/영양제/치료/병원대체/식단·운동 처방
const MEDICAL_RE = /(?:영양제|보약|한약)\s*(?:을|를)?\s*(?:드세요|챙겨\s*드세요|복용)|(?:치료|처방|진단)(?:을|를)?\s*(?:받(?:으세요)|해야)|(?:병원|의사|의료진)\s*(?:말|판단)?\s*(?:대신|보다)\s*사주|매일\s*\d+\s*(?:분|시간)\s*(?:이상\s*)?(?:걷기|운동)/;

// pregnancy-health-prediction: 임신 중 건강 예측
const HEALTH_PRED_RE = /(?:입덧|임신성|산후우울)[가-힣]*\s*(?:심|있을\s*것|예상|겪)|임신\s*중\s*(?:건강이?\s*나빠|몸이\s*(?:크게\s*)?약해)/;

// birth-risk-prediction: 출산 난이도/분만 위험
const BIRTH_RISK_RE = /순산(?:합니다|할\s*거예요|하게\s*됩니다|입니다)|난산|출산(?:이)?\s*(?:힘들|어렵|위험)|분만\s*(?:위험|이\s*어렵)/;

// miscarriage-or-preterm-claim: 조산/유산
const MISCARRIAGE_RE = /조산|유산|早産|流産/;

// gender-prediction
const GENDER_RE = /(?:아기|아이|태아)(?:는|가)?\s*(?:아마\s*)?(?:아들|딸|남자아이|여자아이|남아|여아)(?:입니다|일\s*거예요|예요|이에요|로\s*보)|성별(?:은|이)?\s*[가-힣\s]*?(?:아들|딸|남아|여아)/;

// deterministic-child-personality
const CHILD_PERSONALITY_RE = /(?:이|그)\s*아(?:이|기)는?\s*(?:반드시|틀림없이|분명히|꼭)\s*[가-힣\s]+?(?:성격|아이)(?:입니다|이에요|이\s*됩니다|으로\s*자랍니다)|아(?:이|기)\s*성격은\s*[가-힣\s]+(?:입니다|이에요)/;

// mother-blame-language
const MOTHER_BLAME_RE = /엄마(?:가|의\s*기운이|때문에)\s*[가-힣\s]*?(?:아이|아기)(?:에게|한테)\s*(?:안\s*좋|나쁘|해롭|악영향)|엄마\s*탓/;

// birth-date-determination-claim
const BIRTHDATE_RE = /(?:이|그|해당)\s*날(?:짜)?\s*(?:에)?\s*낳으(?:면|시면)\s*(?:좋|나쁘|안\s*좋)|(?:최고의|가장\s*좋은|최적의)\s*출산일|(?:이|그|해당)\s*날(?:짜)?(?:은|는)\s*피하|택일|(?:\d{1,2}월\s*\d{1,2}일|며칠)에\s*낳/;

// fatalistic-claim
const FATALISM_RE = /운명(?:적인|의)?\s*(?:입니다|이에요)|전생(?:부터)?(?:의)?\s*인연(?:입니다|이에요)|아(?:기|이)가\s*엄마를\s*(?:선택했|골랐)|(?:천재|영재|대박)\s*(?:아이|아기|사주)|반드시\s|무조건\s|틀림없이\s|100\s*%/;

// validator-log-output: 내부 토큰
const VALIDATOR_LEAK_RE = /\b(oc|mech|comf|baby|tg|fr|fam)-[a-zA-Z0-9\-_]+|\b(motherBabyCard|openingConnection|motherChildMechanism|motherComfortRhythm|babyEnergyAndFit|taegyoGuide|motherFortuneRoutine|familySupportAndFinalMessage|babyNames|evidenceView)\b|mustUseFacts?|computedEvidence|ABSOLUTE_RULES|ownerSection|matchTokens?|evidenceBlocks?|finalMessage|REPAIR_MODE|\bsectionId\b|\bvalidator\b|\bvalidation\b|\bJSON\s+schema\b/i;

function checkEnglishElement(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), ENGLISH_ELEMENT_RE);
  if (m) issues.push(mkIssue('validator-log-output', 'global', m, '영문 오행 키 노출', 'high', '한글 목/화/토/금/수로 교체'));
}
function checkMedical(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), MEDICAL_RE);
  if (m) issues.push(mkIssue('medical-advice-risk', 'global', m, '의료/약/치료/식단·운동 처방', 'high', '정서·생활 리듬 표현으로, 의료는 의료진 안내로'));
}
function checkHealthPrediction(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), HEALTH_PRED_RE);
  if (m) issues.push(mkIssue('pregnancy-health-prediction', 'global', m, '임신 중 건강 예측', 'high', '건강은 담당 의료진 안내로'));
}
function checkBirthRisk(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), BIRTH_RISK_RE);
  if (m) issues.push(mkIssue('birth-risk-prediction', 'global', m, '출산 난이도/분만 위험 예측', 'high', '분만은 담당 의료진 판단으로'));
}
function checkMiscarriage(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), MISCARRIAGE_RE);
  if (m) issues.push(mkIssue('miscarriage-or-preterm-claim', 'global', m, '조산/유산 언급', 'high', '관련 건강은 의료진 안내로 — 언급 제거'));
}
function checkGender(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), GENDER_RE);
  if (m) issues.push(mkIssue('gender-prediction', 'global', m, '성별 예측', 'high', '성별은 사주로 알 수 없음 — 제거'));
}
function checkChildPersonality(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), CHILD_PERSONALITY_RE);
  if (m) issues.push(mkIssue('deterministic-child-personality', 'global', m, '아이 성격 단정', 'high', '"예정일 기준으로 보면 이런 결" 톤으로'));
}
function checkMotherBlame(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), MOTHER_BLAME_RE);
  if (m) issues.push(mkIssue('mother-blame-language', 'global', m, '엄마 탓 표현', 'high', '엄마를 지지·안심시키는 톤으로'));
}
function checkBirthDate(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), BIRTHDATE_RE);
  if (m) issues.push(mkIssue('birth-date-determination-claim', 'global', m, '출산일 결정/추천/택일', 'high', '출산일은 담당 의료진 판단 우선'));
}
function checkFatalism(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), FATALISM_RE);
  if (m) issues.push(mkIssue('fatalistic-claim', 'global', m, '운명/단정/과장(천재·대박) 표현', 'high', '가능성·방향 톤으로'));
}
function checkValidatorLeak(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), VALIDATOR_LEAK_RE);
  if (m) issues.push(mkIssue('validator-log-output', 'global', m, '내부 토큰/검증 용어 노출', 'high', '내부 식별자 제거'));
}

// unsupported-user-context: 입력에 없는 다른 자녀/구체 가족 상황 단정 (보수적)
const UNSUPPORTED_CONTEXT_RE = /(?:첫째|둘째|셋째)\s*(?:아이|아기|는|가|와)|이미\s*(?:아이|자녀)가\s*있/;
function checkUnsupportedContext(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  for (const [sec, txt] of sectionBodies(report)) {
    const m = firstMatch(txt, UNSUPPORTED_CONTEXT_RE);
    if (m) { issues.push(mkIssue('unsupported-user-context', sec, m, '입력에 없는 다른 자녀/가족 상황 단정', 'high', '입력에 없는 가족 상황 단정 제거')); return; }
  }
}

// invented-evidence: 본문 합/충/형/파/해·신살이 known 토큰에 없음
function checkInventedEvidence(input: PregnancyNarrativeValidatorInput, issues: PregnancyNarrativeValidationIssue[]) {
  const known = new Set<string>();
  for (const p of input.plans) for (const f of p.mustUseFacts) for (const t of f.matchTokens) if (t) known.add(t);
  const cc = input.bundle.combinationConflicts;
  for (const arr of [cc.combinations, cc.conflicts, cc.punishments, cc.destructions, cc.harms]) {
    for (const s of arr) if (s) known.add(s);
  }
  const all = joinReportText(input.report);
  const interactions = all.match(/[가-힣]{1,2}-[가-힣]{1,2}\s*(합|충|형|파|해)/g) ?? [];
  for (const cand of interactions) {
    if (![...known].some(t => t && cand.includes(t))) {
      issues.push(mkIssue('invented-evidence', 'global', cand, 'computedEvidence 외 합·충·형·파·해 생성', 'high', '계산된 작용만 사용'));
      return;
    }
  }
  const STAR_KEYWORDS = ['천을귀인', '도화', '역마', '화개', '양인', '괴강', '백호', '홍염', '원진'];
  for (const star of STAR_KEYWORDS) {
    if (all.includes(star) && ![...known].some(t => t && t.includes(star))) {
      issues.push(mkIssue('invented-evidence', 'global', star, `${star}은 계산되지 않은 요소`, 'high', '계산된 요소만 언급'));
      return;
    }
  }
}

function checkSectionMissing(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  if (!report.openingConnection?.oneLine && !report.openingConnection?.body)
    issues.push(mkIssue('section-missing', 'openingConnection', '', 'openingConnection 누락', 'high', 'oneLine + body 채움'));
  if (!report.motherChildMechanism?.body)
    issues.push(mkIssue('section-missing', 'motherChildMechanism', '', 'motherChildMechanism.body 누락', 'high', '본문 추가'));
  if (!report.motherComfortRhythm?.body)
    issues.push(mkIssue('section-missing', 'motherComfortRhythm', '', 'motherComfortRhythm.body 누락', 'high', '본문 추가'));
  if (!report.babyEnergyAndFit?.body)
    issues.push(mkIssue('section-missing', 'babyEnergyAndFit', '', 'babyEnergyAndFit.body 누락', 'high', '본문 추가'));
  if (!report.taegyoGuide?.body)
    issues.push(mkIssue('section-missing', 'taegyoGuide', '', 'taegyoGuide.body 누락', 'high', '본문 추가'));
  if (!report.motherFortuneRoutine?.body)
    issues.push(mkIssue('section-missing', 'motherFortuneRoutine', '', 'motherFortuneRoutine.body 누락', 'high', '본문 추가'));
  if (!report.familySupportAndFinalMessage?.body || !report.familySupportAndFinalMessage?.finalMessage)
    issues.push(mkIssue('section-missing', 'familySupportAndFinalMessage', '', 'familySupportAndFinalMessage.body/finalMessage 누락', 'high', 'body + finalMessage 채움'));
}

// 고정 안내문 누락 — 의료 안전상 필수
function checkDisclaimer(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const d = report.disclaimer ?? '';
  if (!(d.includes('출생예정일 기준') && d.includes('의료진'))) {
    issues.push(mkIssue('medical-advice-risk', 'global', '', '고정 안내문(의료진 안내) 누락', 'high', 'PREGNANCY_DISCLAIMER 삽입'));
  }
}

function checkGeneratorFlags(input: PregnancyNarrativeValidatorInput, issues: PregnancyNarrativeValidationIssue[]) {
  const flags = input.generatorFlags;
  if (!flags) return;
  for (const sec of flags.jsonParseFailedSections ?? [])
    issues.push(mkIssue('json-parse-failed', sec, '', `${sec} JSON 파싱 실패`, 'high', '섹션 재생성'));
  for (const sec of flags.finishLengthSections ?? [])
    issues.push(mkIssue('finish-length', sec, '', `${sec} 길이 초과로 잘림`, 'high', '더 짧게 또는 maxTokens 상향 후 재생성'));
}

// ============================================================
// MEDIUM — 품질
// ============================================================
const CONCRETE_TAEGYO_RE = /(음악|산책|기록|정리|호흡|식물|초록|자연광|대화|공간|물소리|그림책)/;
function checkWeakPrenatalGuide(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const tg = body(report, 'taegyoGuide');
  if (tg.trim().length > 0 && !CONCRETE_TAEGYO_RE.test(tg)) {
    issues.push(mkIssue('weak-prenatal-guide', 'taegyoGuide', '', '태교 조언이 구체적이지 않음', 'medium', '구체 태교 활동(음악·산책·기록 등) 포함'));
  }
}
const GENERIC_TAEGYO_RE = /(태교는?\s*중요|좋은\s*태교를\s*하세요|마음을?\s*편하게\s*가지세요)(?![가-힣])/;
function checkGenericTaegyo(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const tg = body(report, 'taegyoGuide');
  const m = firstMatch(tg, GENERIC_TAEGYO_RE);
  if (m) issues.push(mkIssue('generic-taegyo', 'taegyoGuide', m, '일반적인 태교 나열', 'medium', '이 조합에 맞는 구체 태교로'));
}
const LINK_TOKEN_RE = /(일간|오행|용신|기신|합|충|보완|기운)/;
function checkMissingMotherChildLink(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const b = body(report, 'motherChildMechanism');
  if (b.trim().length > 0 && !LINK_TOKEN_RE.test(b))
    issues.push(mkIssue('missing-mother-child-link', 'motherChildMechanism', '', '엄마-아이 명리 연결 근거 미흡', 'medium', '일간·오행·용신·합충 결을 본문에'));
}
const USEFUL_GOD_RE = /(용신|희신|기신|도움이?\s*되는\s*기운|편안(?:한|해지는))/;
function checkMissingUsefulGodLink(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const b = `${body(report, 'motherComfortRhythm')}\n${body(report, 'motherFortuneRoutine')}`;
  if (b.trim().length > 0 && !USEFUL_GOD_RE.test(b))
    issues.push(mkIssue('missing-useful-god-link', 'motherComfortRhythm', '', '용신/희신 연결 미흡', 'medium', '엄마에게 도움이 되는 기운 연결'));
}
const CONCRETE_HELP_RE = /(분담|대신|맡아|함께|구체적|이걸\s*할게|챙겨)/;
function checkWeakFamilySupport(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const b = report.familySupportAndFinalMessage?.body ?? '';
  if (b.trim().length > 0 && !CONCRETE_HELP_RE.test(b))
    issues.push(mkIssue('weak-family-support', 'familySupportAndFinalMessage', '', '가족 도움이 구체적이지 않음', 'medium', '구체적 분담 예시 포함'));
}
function checkWeakBabyNameReason(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const cands = report.babyNames?.candidates ?? [];
  if (cands.length === 0) {
    issues.push(mkIssue('weak-baby-name-reason', 'babyNames', '', '태명 후보 없음', 'medium', '오행 풀에서 3~5개 선정'));
    return;
  }
  if (cands.some(c => !c.reason || !c.reason.trim()))
    issues.push(mkIssue('weak-baby-name-reason', 'babyNames', '', '태명 이유 누락', 'medium', '각 태명에 오행 근거 이유 추가'));
}
function checkRepeatedContent(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const seen = new Map<string, PregnancyNarrativeSectionId>();
  for (const [sec, txt] of sectionBodies(report)) {
    const sentences = txt.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 15);
    for (const s of sentences) {
      const norm = s.replace(/\s+/g, '');
      if (seen.has(norm) && seen.get(norm) !== sec) {
        issues.push(mkIssue('repetitive-content', sec, s.slice(0, 30), '섹션 간 동일 문장 반복', 'medium', '섹션마다 다른 각도로 서술'));
        return;
      }
      seen.set(norm, sec);
    }
  }
}
// too-medical-tone (경계): 의료 단어가 등장하지만 처방형은 아님 (medium 경고)
const MEDICAL_TONE_RE = /(건강\s*관리|몸조리|영양|체중|혈압|입덧)/;
function checkTooMedicalTone(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), MEDICAL_TONE_RE);
  if (m) issues.push(mkIssue('too-medical-tone', 'global', m, '의료처럼 들리는 톤(경계)', 'medium', '정서·생활 리듬 표현으로 전환'));
}
// too-fatalistic-tone (경계): 운명론적 어휘 (medium)
const FATALISTIC_TONE_RE = /(타고난\s*운명|정해진\s*운명|숙명|피할\s*수\s*없)/;
function checkTooFatalisticTone(report: PregnancyNarrativeReport, issues: PregnancyNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), FATALISTIC_TONE_RE);
  if (m) issues.push(mkIssue('too-fatalistic-tone', 'global', m, '운명론적 톤(경계)', 'medium', '가능성·흐름 톤으로'));
}

// ============================================================
// 통합
// ============================================================
export function validatePregnancyNarrativeReport(input: PregnancyNarrativeValidatorInput): PregnancyNarrativeValidationResult {
  const issues: PregnancyNarrativeValidationIssue[] = [];
  const r = input.report;

  // HIGH
  checkEnglishElement(r, issues);
  checkMedical(r, issues);
  checkHealthPrediction(r, issues);
  checkBirthRisk(r, issues);
  checkMiscarriage(r, issues);
  checkGender(r, issues);
  checkChildPersonality(r, issues);
  checkMotherBlame(r, issues);
  checkBirthDate(r, issues);
  checkFatalism(r, issues);
  checkValidatorLeak(r, issues);
  checkUnsupportedContext(r, issues);
  checkInventedEvidence(input, issues);
  checkSectionMissing(r, issues);
  checkDisclaimer(r, issues);
  checkGeneratorFlags(input, issues);

  // MEDIUM
  checkWeakPrenatalGuide(r, issues);
  checkGenericTaegyo(r, issues);
  checkMissingMotherChildLink(r, issues);
  checkMissingUsefulGodLink(r, issues);
  checkWeakFamilySupport(r, issues);
  checkWeakBabyNameReason(r, issues);
  checkRepeatedContent(r, issues);
  checkTooMedicalTone(r, issues);
  checkTooFatalisticTone(r, issues);

  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

  const sectionIssues: Record<string, PregnancyNarrativeValidationIssue[]> = {};
  for (const iss of issues) {
    const key = iss.sectionId;
    if (!sectionIssues[key]) sectionIssues[key] = [];
    sectionIssues[key].push(iss);
  }

  const repairTargetSet = new Set<PregnancyNarrativeSectionId>();
  for (const [secId, list] of Object.entries(sectionIssues)) {
    if (secId === 'global') {
      const hasHigh = list.some(i => i.severity === 'high');
      if (hasHigh) repairTargetSet.add('motherChildMechanism'); // global high redirect
      continue;
    }
    const hasHigh = list.some(i => i.severity === 'high');
    const mediumN = list.filter(i => i.severity === 'medium').length;
    if (hasHigh || mediumN >= MEDIUM_REPAIR_THRESHOLD) {
      // 결정적 섹션(babyNames 등)은 LLM repair 대상 아님 → LLM 섹션만
      if (LLM_SECTIONS.includes(secId as PregnancyNarrativeSectionId)) {
        repairTargetSet.add(secId as PregnancyNarrativeSectionId);
      }
    }
  }

  const shouldRepair = highCount > 0 || mediumCount >= MEDIUM_GLOBAL_THRESHOLD;
  const isValid = highCount === 0 && mediumCount < MEDIUM_INVALID_THRESHOLD;

  return { isValid, issues, highCount, mediumCount, lowCount, sectionIssues, repairTargets: [...repairTargetSet], shouldRepair };
}

export function partitionPregnancyIssues(result: PregnancyNarrativeValidationResult) {
  return {
    high: result.issues.filter(i => i.severity === 'high'),
    medium: result.issues.filter(i => i.severity === 'medium'),
    low: result.issues.filter(i => i.severity === 'low'),
  };
}
