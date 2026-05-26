// 궁합 narrative V4 — Report Validator (Phase 4)
//
// 역할:
//   - CompatibilityNarrativeReport를 받아 ABSOLUTE_RULES + 품질 룰 위반을 issue로 산출.
//   - severity 정책 (핵심 lesson):
//       · 사용자 노출 위험 = high (fatalism/단정/노출/invented/score/log/parse/length)
//       · 품질·분량·일반론 = medium
//       · relationship-fatalism = high
//   - high 1+ 섹션 또는 medium 누적 기준 위반 섹션을 repairTargets로 표시.
//   - generator(Phase 5)는 shouldRepair=true면 sanitizer 재실행 또는 sectionwise repair prompt 호출.
//
// 정합:
//   - LLM 호출 X. 정규식·구조 검사만.
//   - sanitizer 와 키워드 align (fatalism/deterministic/english key/log leak 등).
//   - 결정적 섹션(compatibilityCard/evidenceView)은 LLM 산출이 아니므로 high section-missing 대상 제외.

import type { CompatibilityAnalysisBundle } from '../compatibilityTypes';
import type {
  CompatibilityNarrativeReport, CompatNarrativeSectionId,
  CompatNarrativeContext, CompatNarrativePlanSet,
  CompatNarrativeIssueType, CompatNarrativeValidationIssue, CompatNarrativeValidationResult,
} from './compatNarrativeTypes';

export interface CompatNarrativeValidatorInput {
  report: CompatibilityNarrativeReport;
  bundle: CompatibilityAnalysisBundle;
  plans: CompatNarrativePlanSet;
  ctx: CompatNarrativeContext;
  /** generator가 채워 넘기는 플래그 (JSON 파싱 실패 / 길이 초과 섹션) */
  generatorFlags?: {
    jsonParseFailedSections?: CompatNarrativeSectionId[];
    finishLengthSections?: CompatNarrativeSectionId[];
  };
}

// repair trigger 정책:
//   - high 1+ 발생한 섹션은 repair 대상
//   - 같은 섹션에 medium 2+ 누적 시 repair 대상
const MEDIUM_REPAIR_THRESHOLD = 2;
// shouldRepair 글로벌 기준: high 1+ → repair, mediumCount >= 6 → repair
const MEDIUM_GLOBAL_THRESHOLD = 6;
// isValid 기준: highCount === 0 && mediumCount < 12 (yearly와 동일 임계)
const MEDIUM_INVALID_THRESHOLD = 12;

// ============================================================
// helper
// ============================================================
function mkIssue(
  type: CompatNarrativeIssueType,
  sectionId: CompatNarrativeSectionId | 'global',
  sentence: string,
  reason: string,
  severity: 'low' | 'medium' | 'high',
  suggestion: string,
): CompatNarrativeValidationIssue {
  return { type, sectionId, sentence, reason, severity, suggestion };
}

function firstMatch(text: string | undefined, re: RegExp): string | undefined {
  if (!text) return undefined;
  const m = text.match(re);
  return m ? m[0] : undefined;
}

// LLM 섹션 본문만 모아 join (결정적 섹션 제외)
function joinReportText(report: CompatibilityNarrativeReport): string {
  const parts: Array<string | undefined> = [
    report.relationshipOverview?.oneLine,
    report.relationshipOverview?.body,
    report.relationshipMechanism?.body,
    ...((report.relationshipMechanism?.evidenceBlocks ?? []).flatMap(b => [
      b.causalExplanation, b.betweenScene, b.positiveUse, b.shadowPattern, b.practicalAdvice,
      ...b.evidence.map(e => `${e.label} ${e.plainMeaning}`),
    ])),
    report.attractionAndFriction?.body,
    report.repeatedPattern?.body,
    report.relationshipGuide?.body,
    report.finalAdvice?.body,
  ];
  return parts.filter((s): s is string => Boolean(s)).join('\n');
}

// LLM 섹션 id → 본문 텍스트 (섹션 단위 검사용)
function sectionBodies(report: CompatibilityNarrativeReport): Array<[CompatNarrativeSectionId, string]> {
  return [
    ['relationshipOverview', `${report.relationshipOverview?.oneLine ?? ''} ${report.relationshipOverview?.body ?? ''}`],
    ['relationshipMechanism', report.relationshipMechanism?.body ?? ''],
    ['attractionAndFriction', report.attractionAndFriction?.body ?? ''],
    ['repeatedPattern', report.repeatedPattern?.body ?? ''],
    ['relationshipGuide', report.relationshipGuide?.body ?? ''],
    ['finalAdvice', report.finalAdvice?.body ?? ''],
  ];
}

// ============================================================
// HIGH — 정규식
// ============================================================
const ENGLISH_ELEMENT_RE = /\b(wood|fire|earth|metal|water)\b/i;
// relationship-fatalism: 운명·반드시 헤어진다·재회 단정·상대 마음 단정
const FATALISM_RE = /(?:반드시|무조건|틀림없이)\s*(?:헤어집니다|헤어진다|이별합니다|재회합니다|재회한다)|절대\s*안\s*맞|운명입니다|운명(?:적인|의)\s*(?:상대|만남|짝)|천생연분|바람(?:이?\s*)?(?:납니다|난다|핍니다)|상대는?\s*(?:당신을|너를)?\s*(?:좋아하지\s*않|좋아합니다|반드시\s*돌아옵니다)|상대는?\s*(?:속으로|마음속으로|분명히|확실히)\s*[가-힣]+(?:합니다|해요)/;
// deterministic-future-claim: 결혼/이혼/재회/이별 단정
const DETERMINISTIC_RE = /(?:결혼|이혼|재회)(?:하게\s*)?(?:합니다|한다|할\s*것입니다)|(?:헤어질\s*것입니다|헤어지게\s*됩니다|이별할\s*것입니다)|반드시\s*결혼/;
// fear-based-claim: 불안 조장
const FEAR_RE = /끝장(?:납니다|난다)?|파국|망합니다|관계가\s*파탄|돌이킬\s*수\s*없|회복\s*불가능|반드시\s*불행/;
// score-leak: N점 / 상위 N% / 궁합 N
const SCORE_RE = /\d+\s*점|상위\s*\d+\s*%|궁합\s*\d+/;
// validator-log-output: fact id 접두사 / sectionId / 내부 schema 토큰 / issue type
const VALIDATOR_LEAK_RE = /\b(ro|mech|af|rp|rg|fa|cc)-[a-zA-Z0-9\-_]+|\b(relationshipOverview|relationshipMechanism|attractionAndFriction|repeatedPattern|relationshipGuide|finalAdvice|compatibilityCard|evidenceView)\b|\b(section-missing|cross-section-leak|unsupported-user-context|deterministic-future-claim|fear-based-claim|relationship-fatalism|invented-evidence|validator-log-output|score-leak|json-parse-failed|finish-length|relationship-type-focus-missing|weak-evidence-to-narrative|generic-advice|repeated-content|missing-life-scene|weak-final-advice|mechanism-too-shallow|attraction-friction-too-separated|qna-interest-not-absorbed)\b|mustUseFacts?|computedEvidence|ABSOLUTE_RULES|ownerSection|matchTokens?|REPAIR_MODE|\bsectionId\b|\bvalidator\b|\bvalidation\b|\bissue\s+type\b|\bJSON\s+schema\b/i;

function checkEnglishElement(report: CompatibilityNarrativeReport, issues: CompatNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), ENGLISH_ELEMENT_RE);
  // 영문 오행 키 노출 — 사용자 노출 위험 → validator-log-output 계열로 high 처리
  if (m) issues.push(mkIssue('validator-log-output', 'global', m, '영문 오행 키 노출', 'high', '한글 목/화/토/금/수로 교체'));
}

function checkFatalism(report: CompatibilityNarrativeReport, issues: CompatNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), FATALISM_RE);
  if (m) issues.push(mkIssue('relationship-fatalism', 'global', m, '운명/관계 단정/상대 마음 단정', 'high', '가능성·조건·선택기준 톤으로'));
}

function checkDeterministic(report: CompatibilityNarrativeReport, issues: CompatNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), DETERMINISTIC_RE);
  if (m) issues.push(mkIssue('deterministic-future-claim', 'global', m, '결혼/이혼/재회/이별 단정 미래', 'high', '"~할 가능성/신호" 톤으로'));
}

function checkFear(report: CompatibilityNarrativeReport, issues: CompatNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), FEAR_RE);
  if (m) issues.push(mkIssue('fear-based-claim', 'global', m, '공포 조장 표현', 'high', '"흔들림/주의/점검" 톤으로'));
}

function checkScoreLeak(report: CompatibilityNarrativeReport, issues: CompatNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), SCORE_RE);
  if (m) issues.push(mkIssue('score-leak', 'global', m, '점수/등급/퍼센트 노출', 'high', '점수 대신 결·분위기로 설명'));
}

function checkValidatorLogLeak(report: CompatibilityNarrativeReport, issues: CompatNarrativeValidationIssue[]) {
  const m = firstMatch(joinReportText(report), VALIDATOR_LEAK_RE);
  if (m) issues.push(mkIssue('validator-log-output', 'global', m, '내부 토큰/issue type/검증 용어 노출', 'high', '내부 식별자 제거'));
}

function checkUnsupportedUserContext(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  const status = input.ctx.relationshipType === 'married' ? 'married' : 'unknown';
  const spouseAllowed = status === 'married';
  // 배우자궁은 명리 용어 — 항상 허용. 부정 lookahead로 차단.
  const spouseRe = /(아내|남편|기혼자|부부|결혼\s*생활|신혼)|배우자(?!궁)/;
  for (const [sec, txt] of sectionBodies(input.report)) {
    if (!txt || spouseAllowed) continue;
    const m = firstMatch(txt, spouseRe);
    if (m) {
      issues.push(mkIssue('unsupported-user-context', sec, m, '관계 상태 미상 - 배우자/아내/남편 단정', 'high', '"가까운 관계" 중립 표현'));
      return;
    }
  }
}

// invented-evidence: 본문의 합/충/형/파/해·신살 언급이
//   bundle.combinationConflicts + plan.mustUseFacts.matchTokens에 없으면 high.
function checkInventedEvidence(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  // 알려진 token 풀
  const known = new Set<string>();
  for (const p of input.plans) for (const f of p.mustUseFacts) for (const t of f.matchTokens) if (t) known.add(t);
  const cc = input.bundle.combinationConflicts;
  for (const arr of [cc.combinations, cc.conflicts, cc.punishments, cc.destructions, cc.harms]) {
    for (const s of arr) if (s) known.add(s);
  }

  const all = joinReportText(input.report);

  // (a) "X-Y 합/충/형/파/해" pattern — 본문에 등장한 상호작용 라벨
  const interactions = all.match(/[가-힣]{1,2}-[가-힣]{1,2}\s*(합|충|형|파|해)/g) ?? [];
  for (const cand of interactions) {
    if (![...known].some(t => t && cand.includes(t))) {
      issues.push(mkIssue('invented-evidence', 'global', cand, 'computedEvidence 외 합·충·형·파·해 생성', 'high', '계산된 작용만 사용'));
      return;
    }
  }

  // (b) 주요 신살 (귀인/도화/역마/화개/양인/괴강/백호/홍염/원진) 언급이 known에 없으면 invented
  const STAR_KEYWORDS = ['천을귀인', '도화', '역마', '화개', '양인', '괴강', '백호', '홍염', '원진'];
  for (const star of STAR_KEYWORDS) {
    if (all.includes(star) && ![...known].some(t => t && t.includes(star))) {
      issues.push(mkIssue('invented-evidence', 'global', star, `${star} 신살은 계산되지 않은 요소`, 'high', '계산된 신살만 언급'));
      return;
    }
  }
}

function checkSectionMissing(report: CompatibilityNarrativeReport, issues: CompatNarrativeValidationIssue[]) {
  // LLM 산출 6개 섹션만 검사 (결정적 2개 제외)
  if (!report.relationshipOverview?.oneLine && !report.relationshipOverview?.body) {
    issues.push(mkIssue('section-missing', 'relationshipOverview', '', 'relationshipOverview 누락', 'high', 'oneLine + body 채움'));
  }
  if (!report.relationshipMechanism?.body) {
    issues.push(mkIssue('section-missing', 'relationshipMechanism', '', 'relationshipMechanism.body 누락', 'high', '본문 추가'));
  }
  if (!report.attractionAndFriction?.body) {
    issues.push(mkIssue('section-missing', 'attractionAndFriction', '', 'attractionAndFriction.body 누락', 'high', '본문 추가'));
  }
  if (!report.repeatedPattern?.body) {
    issues.push(mkIssue('section-missing', 'repeatedPattern', '', 'repeatedPattern.body 누락', 'high', '본문 추가'));
  }
  if (!report.relationshipGuide?.body) {
    issues.push(mkIssue('section-missing', 'relationshipGuide', '', 'relationshipGuide.body 누락', 'high', '본문 추가'));
  }
  if (!report.finalAdvice?.body) {
    issues.push(mkIssue('section-missing', 'finalAdvice', '', 'finalAdvice.body 누락', 'high', '본문 추가'));
  }
}

function checkCrossSectionLeak(report: CompatibilityNarrativeReport, issues: CompatNarrativeValidationIssue[]) {
  // 1) overview가 명리 구조(mechanism 전용)를 길게 풀어씀
  const overview = `${report.relationshipOverview?.oneLine ?? ''} ${report.relationshipOverview?.body ?? ''}`;
  if (overview.length > 600 && /(합|충|형|파|해)\b|일지|십성|용신|기신/.test(overview)) {
    issues.push(mkIssue('cross-section-leak', 'relationshipOverview', overview.slice(0, 30) + '...', 'overview가 명리 구조까지 풀어씀', 'high', '구조 원인은 relationshipMechanism에서만'));
  }
  // 2) finalAdvice가 3년 흐름을 길게 재서술 (여러 연도 나열)
  const fa = report.finalAdvice?.body ?? '';
  const yearMentions = fa.match(/\d{4}년/g) ?? [];
  if (yearMentions.length >= 2) {
    issues.push(mkIssue('cross-section-leak', 'finalAdvice', yearMentions.join(', '), 'finalAdvice가 3년 흐름을 재서술', 'high', '앞으로의 흐름은 1문장 이내로만'));
  }
}

function checkGeneratorFlags(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  const flags = input.generatorFlags;
  if (!flags) return;
  for (const sec of flags.jsonParseFailedSections ?? []) {
    issues.push(mkIssue('json-parse-failed', sec, '', `${sec} JSON 파싱 실패`, 'high', '섹션 재생성'));
  }
  for (const sec of flags.finishLengthSections ?? []) {
    issues.push(mkIssue('finish-length', sec, '', `${sec} 길이 초과로 잘림`, 'high', '더 짧게 또는 maxTokens 상향 후 재생성'));
  }
}

// ============================================================
// MEDIUM — 품질
// ============================================================

// relationship-type-focus-missing: focus.primaryConcerns 토큰이 type-aware 섹션 본문에 미흡수
function checkTypeFocusMissing(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  const concerns = input.ctx.focus.primaryConcerns;
  if (concerns.length === 0) return;
  // 토큰화: 관심사 문구에서 2자 이상 한글 토큰 추출
  const concernTokens = concerns.flatMap(c => (c.match(/[가-힣]{2,}/g) ?? []));
  const typeAware = [
    report_body(input.report, 'repeatedPattern'),
    report_body(input.report, 'relationshipGuide'),
    report_body(input.report, 'finalAdvice'),
  ].join('\n');
  const hit = concernTokens.some(t => typeAware.includes(t));
  if (!hit) {
    issues.push(mkIssue('relationship-type-focus-missing', 'repeatedPattern', '', '유형 관심사 토큰이 type-aware 섹션에 미흡수', 'medium', `${input.ctx.relationshipTypeKo} 관심사를 본문에 녹일 것`));
  }
}

function report_body(report: CompatibilityNarrativeReport, sec: CompatNarrativeSectionId): string {
  switch (sec) {
    case 'relationshipOverview': return `${report.relationshipOverview?.oneLine ?? ''} ${report.relationshipOverview?.body ?? ''}`;
    case 'relationshipMechanism': return report.relationshipMechanism?.body ?? '';
    case 'attractionAndFriction': return report.attractionAndFriction?.body ?? '';
    case 'repeatedPattern': return report.repeatedPattern?.body ?? '';
    case 'relationshipGuide': return report.relationshipGuide?.body ?? '';
    case 'finalAdvice': return report.finalAdvice?.body ?? '';
    default: return '';
  }
}

// weak-evidence-to-narrative: mechanism.evidenceBlocks 비거나 6단계 일부 누락
function checkWeakEvidenceToNarrative(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  const blocks = input.report.relationshipMechanism?.evidenceBlocks ?? [];
  if (blocks.length === 0) {
    issues.push(mkIssue('weak-evidence-to-narrative', 'relationshipMechanism', '', 'evidenceBlocks 비어있음', 'medium', '1~3개 block 추가'));
    return;
  }
  for (const b of blocks) {
    if (!b.causalExplanation || !b.betweenScene || !b.positiveUse || !b.shadowPattern || !b.practicalAdvice
        || !b.evidence || b.evidence.length === 0) {
      issues.push(mkIssue('weak-evidence-to-narrative', 'relationshipMechanism', '', 'evidenceBlock 단계 일부 누락', 'medium', 'evidence + 5단계 모두 채움'));
      return;
    }
  }
}

const GENERIC_ADVICE_RE = /(서로\s*배려|서로\s*노력|소통이?\s*중요|대화를?\s*많이\s*하세요|이해하려고\s*노력|믿음이?\s*중요|사랑하면\s*됩니다)/;

function checkGenericAdvice(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  for (const [sec, txt] of sectionBodies(input.report)) {
    const m = firstMatch(txt, GENERIC_ADVICE_RE);
    if (m) {
      issues.push(mkIssue('generic-advice', sec, m, '일반론 조언', 'medium', '구체 행동(언제·무엇을·어떻게)으로'));
      return;
    }
  }
}

// repeated-content: 섹션 간 동일 문장 반복
function checkRepeatedContent(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  const seen = new Map<string, CompatNarrativeSectionId>();
  for (const [sec, txt] of sectionBodies(input.report)) {
    const sentences = txt.split(/(?<=[.!?])\s+/).map(s => s.trim()).filter(s => s.length >= 15);
    for (const s of sentences) {
      const norm = s.replace(/\s+/g, '');
      if (seen.has(norm) && seen.get(norm) !== sec) {
        issues.push(mkIssue('repeated-content', sec, s.slice(0, 30), '섹션 간 동일 문장 반복', 'medium', '섹션마다 다른 각도로 서술'));
        return;
      }
      seen.set(norm, sec);
    }
  }
}

const LIFE_SCENE_HINTS_RE = /(장면|상황|순간|메시지|연락|대화|만났을\s*때|함께|식사|약속|여행|싸울\s*때|다툴\s*때|화났을\s*때)/;

function checkMissingLifeScene(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  // 관계 장면은 attractionAndFriction / repeatedPattern에서 핵심
  const body = `${report_body(input.report, 'attractionAndFriction')}\n${report_body(input.report, 'repeatedPattern')}`;
  if (body.trim().length > 0 && !LIFE_SCENE_HINTS_RE.test(body)) {
    issues.push(mkIssue('missing-life-scene', 'repeatedPattern', '', '관계 장면 부족', 'medium', '실제 관계 상황/장면 추가'));
  }
}

// weak-final-advice: finalAdvice가 앞 섹션 재요약 (재요약 표시어 또는 앞 섹션 문장과 겹침)
const RESUMMARY_RE = /(앞에서\s*말(?:했|한)|앞서\s*말|요약하면|정리하면|결국\s*궁합이)/;

function checkWeakFinalAdvice(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  const fa = report_body(input.report, 'finalAdvice');
  if (!fa.trim()) return;
  if (RESUMMARY_RE.test(fa)) {
    issues.push(mkIssue('weak-final-advice', 'finalAdvice', firstMatch(fa, RESUMMARY_RE) ?? '', 'finalAdvice가 앞 섹션 재요약', 'medium', '선택 기준으로 닫을 것'));
  }
}

// mechanism-too-shallow: 명리 근거 토큰(일간/오행/십성/용신/일지/합충) 미언급
const MECH_TOKEN_RE = /(일간|오행|십성|용신|기신|일지|배우자궁|합|충)/;

function checkMechanismTooShallow(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  const body = report_body(input.report, 'relationshipMechanism');
  if (body.trim().length > 0 && !MECH_TOKEN_RE.test(body)) {
    issues.push(mkIssue('mechanism-too-shallow', 'relationshipMechanism', '', '명리 근거 토큰 미언급', 'medium', '일간·오행·십성·용신·일지 결을 본문에'));
  }
}

// attraction-friction-too-separated: 끌림/엇갈림이 한 뿌리로 안 엮임
const SAME_ROOT_RE = /(같은\s*(뿌리|지점|자리|특성|이유)|바로\s*그\s*(지점|특성|모습)|한\s*뿌리|동시에)/;

function checkAttractionFrictionTooSeparated(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  const body = report_body(input.report, 'attractionAndFriction');
  if (body.trim().length > 0 && !SAME_ROOT_RE.test(body)) {
    issues.push(mkIssue('attraction-friction-too-separated', 'attractionAndFriction', '', '끌림/엇갈림이 한 뿌리로 안 엮임', 'medium', '"끌림 = 부담의 뿌리" 한 구조로 묶을 것'));
  }
}

// qna-interest-not-absorbed: 유형 관심사가 어느 섹션에도 반영 안 됨 (전 LLM 섹션 통합 검사)
function checkQnaInterestNotAbsorbed(input: CompatNarrativeValidatorInput, issues: CompatNarrativeValidationIssue[]) {
  const concerns = input.ctx.focus.primaryConcerns;
  if (concerns.length === 0) return;
  const concernTokens = concerns.flatMap(c => (c.match(/[가-힣]{2,}/g) ?? []));
  const all = joinReportText(input.report);
  const hitCount = concernTokens.filter(t => all.includes(t)).length;
  // 관심사 토큰이 전혀 흡수되지 않으면 medium (focus-missing과 별개: 전체 차원)
  if (hitCount === 0) {
    issues.push(mkIssue('qna-interest-not-absorbed', 'global', '', '유형 관심사 미반영', 'medium', `${input.ctx.relationshipTypeKo} 관심사를 본문 곳곳에 흡수`));
  }
}

// ============================================================
// 통합 — validateCompatNarrativeReport
// ============================================================
export function validateCompatNarrativeReport(input: CompatNarrativeValidatorInput): CompatNarrativeValidationResult {
  const issues: CompatNarrativeValidationIssue[] = [];

  // HIGH
  checkEnglishElement(input.report, issues);
  checkFatalism(input.report, issues);
  checkDeterministic(input.report, issues);
  checkFear(input.report, issues);
  checkScoreLeak(input.report, issues);
  checkValidatorLogLeak(input.report, issues);
  checkUnsupportedUserContext(input, issues);
  checkInventedEvidence(input, issues);
  checkSectionMissing(input.report, issues);
  checkCrossSectionLeak(input.report, issues);
  checkGeneratorFlags(input, issues);

  // MEDIUM
  checkTypeFocusMissing(input, issues);
  checkWeakEvidenceToNarrative(input, issues);
  checkGenericAdvice(input, issues);
  checkRepeatedContent(input, issues);
  checkMissingLifeScene(input, issues);
  checkWeakFinalAdvice(input, issues);
  checkMechanismTooShallow(input, issues);
  checkAttractionFrictionTooSeparated(input, issues);
  checkQnaInterestNotAbsorbed(input, issues);

  // ============================================================
  // 집계
  // ============================================================
  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount = issues.filter(i => i.severity === 'low').length;

  const sectionIssues: Record<string, CompatNarrativeValidationIssue[]> = {};
  for (const iss of issues) {
    const key = iss.sectionId;
    if (!sectionIssues[key]) sectionIssues[key] = [];
    sectionIssues[key].push(iss);
  }

  // repair 대상: high 1+ 섹션 또는 medium 누적(2+) 섹션
  const repairTargetSet = new Set<CompatNarrativeSectionId>();
  for (const [secId, list] of Object.entries(sectionIssues)) {
    if (secId === 'global') {
      // global high는 가장 가까운 user-facing 섹션 relationshipMechanism로 redirect
      const hasHigh = list.some(i => i.severity === 'high');
      if (hasHigh) repairTargetSet.add('relationshipMechanism');
      continue;
    }
    const hasHigh = list.some(i => i.severity === 'high');
    const mediumN = list.filter(i => i.severity === 'medium').length;
    if (hasHigh || mediumN >= MEDIUM_REPAIR_THRESHOLD) {
      repairTargetSet.add(secId as CompatNarrativeSectionId);
    }
  }

  const shouldRepair = highCount > 0 || mediumCount >= MEDIUM_GLOBAL_THRESHOLD;
  const isValid = highCount === 0 && mediumCount < MEDIUM_INVALID_THRESHOLD;

  return {
    isValid,
    issues,
    highCount,
    mediumCount,
    lowCount,
    sectionIssues,
    repairTargets: [...repairTargetSet],
    shouldRepair,
  };
}

// 외부 helper
export function partitionCompatIssues(result: CompatNarrativeValidationResult) {
  return {
    high: result.issues.filter(i => i.severity === 'high'),
    medium: result.issues.filter(i => i.severity === 'medium'),
    low: result.issues.filter(i => i.severity === 'low'),
  };
}
