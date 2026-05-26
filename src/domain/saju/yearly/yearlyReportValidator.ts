// Yearly Fortune V4 — Report Validator (Y5)
//
// 역할:
//   - YearlyFortuneReport를 받아 ABSOLUTE_RULES + 품질 룰 위반을 issue로 산출.
//   - severity 3단계: high (사용자 노출 blocking) / medium (품질) / low (스타일).
//   - high 1+ 또는 medium 누적 기준 위반 섹션을 repairTargets로 표시.
//   - generator(Y6)는 shouldRepair=true면 sanitizer 재실행 또는 sectionwise repair prompt 호출.
//
// 정합:
//   - LLM 호출 X. 정규식·구조 검사만.
//   - sanitizer 와 키워드 align (financial/medical/fear/deterministic/english key 등).
//   - evidenceView는 deterministic — validator는 high section-missing 대상에서 제외.

import type {
  YearlyFortuneReport, YearlyFortuneSectionId,
  YearlyValidationIssue, YearlyValidationIssueType, YearlyValidationResult,
  YearlyPlanSet, YearlyFortuneAnalysis, YearlyRelationshipStatus,
  RemainingMonthSection,
} from './yearlyTypes';

export interface YearlyValidatorContext {
  relationshipStatus: YearlyRelationshipStatus;
  hasChildren: boolean | 'unknown';
}

export interface YearlyValidatorInput {
  report: YearlyFortuneReport;
  analysis: YearlyFortuneAnalysis;
  plans: YearlyPlanSet;
  ctx: YearlyValidatorContext;
}

// repair trigger 정책:
//   - high 1+ 발생한 섹션은 repair 대상
//   - 같은 섹션에 medium 2+ 누적 시 repair 대상
const MEDIUM_REPAIR_THRESHOLD = 2;
// shouldRepair 글로벌 기준:
//   - high 1+ → repair
//   - mediumCount >= MEDIUM_GLOBAL_THRESHOLD → repair
const MEDIUM_GLOBAL_THRESHOLD = 6;

// isValid 기준 (명세 §14):
//   - highCount === 0 && mediumCount < 12
const MEDIUM_INVALID_THRESHOLD = 12;

// ============================================================
// helper
// ============================================================
function mkIssue(
  type: YearlyValidationIssueType,
  sectionId: YearlyFortuneSectionId | 'global',
  sentence: string,
  reason: string,
  severity: 'low' | 'medium' | 'high',
  suggestion: string,
): YearlyValidationIssue {
  return { type, sectionId, sentence, reason, severity, suggestion };
}

function joinReportText(report: YearlyFortuneReport): string {
  const parts: Array<string | undefined> = [
    report.yearFlowCard?.title, report.yearFlowCard?.subtitle, report.yearFlowCard?.summary,
    ...(report.yearFlowCard?.keywords ?? []),
    report.yearlyOverview?.oneLine, report.yearlyOverview?.body,
    report.yearlyMechanism?.body,
    ...((report.yearlyMechanism?.evidenceBlocks ?? []).flatMap(b => [
      b.causalExplanation, b.lifeScene, b.positiveUse, b.shadowPattern, b.practicalAdvice,
      ...b.evidence.map(e => `${e.label} ${e.plainMeaning}`),
    ])),
    ...((report.remainingMonths ?? []).flatMap(m => [
      m.monthLabel, m.periodLabel, m.keyword, m.body, m.work, m.money, m.relationship, m.goodChoice, m.caution,
    ])),
    report.topicFortunes?.career, report.topicFortunes?.money,
    report.topicFortunes?.relationship, report.topicFortunes?.rhythm,
    ...(report.actionGuide?.mustCatch ?? []),
    ...(report.actionGuide?.betterAvoid ?? []),
    report.actionGuide?.bestStrategy,
    ...((report.nextTwoYears ?? []).flatMap(y => [y.keyword, y.summary, y.opportunity, y.caution])),
  ];
  return parts.filter((s): s is string => Boolean(s)).join('\n');
}

function firstMatch(text: string | undefined, re: RegExp): string | undefined {
  if (!text) return undefined;
  const m = text.match(re);
  return m ? m[0] : undefined;
}

// ============================================================
// HIGH — 10개
// ============================================================
const ENGLISH_ELEMENT_RE = /\b(wood|fire|earth|metal|water)\b/i;
const DETERMINISTIC_RE = /(반드시|무조건|100\s*%|틀림없이|필연적으로|분명히)|(이직|결혼|이혼|승진|당첨|합격)합니다|연애운이\s*폭발|대박납니다?|돈이\s*크게\s*들어옵니다|꼭\s*헤어집니다?|올해\s*망합니다?/;
const FINANCIAL_RE = /매수|매도|시세|수익률|레버리지|(시장|투자|거래)\s*타이밍|코인|주식|단기\s*투자|트레이딩|큰돈을?\s*굴|가격\s*흐름을?\s*보고\s*들어/;
const MEDICAL_RE = /위장병|우울증|질병|발병|중병|위독|진단|치료|약물|처방/;
const FEAR_RE = /사망|파산|사고가\s*납니다?|사고\s*위험|위독|이혼\s*확정|실패\s*확정|무너집니다?|큰일\s*납니다?/;
const VALIDATOR_LEAK_RE = /\b(yfc|ym|rm|tf|ag|nty|ev)-[a-zA-Z0-9\-_]+|english-element-key-leak|financial-advice-risk|medical-advice-risk|deterministic-future-claim|fear-based-claim|invented-evidence|section-missing|cross-section-leak|validator-log-output|missing-year-ten-god-interpretation|missing-daewoon-sewoon-link|missing-useful-god-link|missing-monthly-guidance|missing-action-guide|missing-next-two-years|generic-yearly-overview|weak-evidence-to-narrative|special-star-too-shallow|missing-life-scene|missing-palace-impact|missing-strength-impact|weak-transition|minor-repetition|tone-too-dry|mustUseFacts?|computedEvidence|ABSOLUTE_RULES|\bvalidation\b|\bvalidator\b|\bissue\s+type\b|\bhigh\s+severity\b|\bmedium\s+(?:issue|severity)\b|\brepair\s+mode\b|\bJSON\s+schema\b/i;

function checkEnglishElement(report: YearlyFortuneReport, issues: YearlyValidationIssue[]) {
  const m = firstMatch(joinReportText(report), ENGLISH_ELEMENT_RE);
  if (m) issues.push(mkIssue('english-element-key-leak', 'global', m, '영문 오행 키 노출', 'high', '한글 목/화/토/금/수로 교체'));
}

function checkDeterministic(report: YearlyFortuneReport, issues: YearlyValidationIssue[]) {
  const m = firstMatch(joinReportText(report), DETERMINISTIC_RE);
  if (m) issues.push(mkIssue('deterministic-future-claim', 'global', m, '단정 미래/사건 표현', 'high', '"~할 수 있어요" 톤'));
}

function checkFinancial(report: YearlyFortuneReport, issues: YearlyValidationIssue[]) {
  const scope: Array<[YearlyFortuneSectionId, string | undefined]> = [
    ['topicFortunes', report.topicFortunes?.money],
    ['topicFortunes', report.topicFortunes?.career],
    ...((report.remainingMonths ?? []).map(m => ['remainingMonths', m.money] as [YearlyFortuneSectionId, string | undefined])),
    ...((report.nextTwoYears ?? []).map(y => ['nextTwoYears', y.summary] as [YearlyFortuneSectionId, string | undefined])),
  ];
  for (const [sec, txt] of scope) {
    const m = firstMatch(txt, FINANCIAL_RE);
    if (m) {
      issues.push(mkIssue('financial-advice-risk', sec, m, '투자 조언성 표현', 'high', '보상 기준/작업 범위/수익 구조 결로'));
      return;
    }
  }
}

function checkMedical(report: YearlyFortuneReport, issues: YearlyValidationIssue[]) {
  const scope: Array<[YearlyFortuneSectionId, string | undefined]> = [
    ['topicFortunes', report.topicFortunes?.rhythm],
    ...((report.remainingMonths ?? []).map(m => ['remainingMonths', m.body] as [YearlyFortuneSectionId, string | undefined])),
  ];
  for (const [sec, txt] of scope) {
    const m = firstMatch(txt, MEDICAL_RE);
    if (m) {
      issues.push(mkIssue('medical-advice-risk', sec, m, '의학 진단/치료/약물 표현', 'high', '루틴/수면/회복 결로'));
      return;
    }
  }
}

function checkFear(report: YearlyFortuneReport, issues: YearlyValidationIssue[]) {
  const m = firstMatch(joinReportText(report), FEAR_RE);
  if (m) issues.push(mkIssue('fear-based-claim', 'global', m, '공포 조장 표현', 'high', '"흔들림/주의" 톤으로'));
}

function checkUnsupportedUserContext(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  const status = input.ctx.relationshipStatus;
  const spouseAllowed = status === 'married';
  const childAllowed = input.ctx.hasChildren === true;
  // 배우자궁은 명리 용어 — 항상 허용. 부정 lookahead로 차단.
  const spouseRe = /(아내|남편|기혼자|부부|결혼\s*생활)|배우자(?!궁)/;
  const childRe  = /(자녀|아들|딸|아이가|자식이)/;
  const r = input.report;
  const candidates: Array<[YearlyFortuneSectionId, string | undefined]> = [
    ['topicFortunes', r.topicFortunes?.relationship],
    ['yearlyMechanism', r.yearlyMechanism?.body],
    ...((r.remainingMonths ?? []).map(m => ['remainingMonths', m.relationship] as [YearlyFortuneSectionId, string | undefined])),
  ];
  for (const [sec, txt] of candidates) {
    if (!txt) continue;
    if (!spouseAllowed) {
      const m1 = firstMatch(txt, spouseRe);
      if (m1) { issues.push(mkIssue('unsupported-user-context', sec, m1, '관계 상태 미상 - 배우자/아내/남편 단정', 'high', '"가까운 관계" 중립 표현')); return; }
    }
    if (!childAllowed) {
      const m2 = firstMatch(txt, childRe);
      if (m2) { issues.push(mkIssue('unsupported-user-context', sec, m2, '자녀 컨텍스트 없음 - 단정 금지', 'high', '"돌봄이 필요한 대상" 중립 표현')); return; }
    }
  }
}

function checkInventedEvidence(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  // 알려진 token 풀: plan.matchTokens + analysis 핵심 한글 token
  const known = new Set<string>();
  for (const p of input.plans) for (const f of p.mustUseFacts) for (const t of f.matchTokens) if (t) known.add(t);
  known.add(input.analysis.targetYearGanji.display);
  known.add(input.analysis.targetYearGanji.stem);
  known.add(input.analysis.targetYearGanji.branch);
  known.add(input.analysis.currentDaewoon.pillar.pillarKo);
  for (const m of input.analysis.remainingMonthlyFortunes) known.add(m.monthGanji.display);

  const all = joinReportText(input.report);

  // (a) 합/충/형/파/해 label — 본문에 등장한 "X-Y 합/충/형/파/해" pattern
  const interactions = all.match(/[가-힣]{1,2}-[가-힣]{1,2}\s*(합|충|형|파|해)/g) ?? [];
  for (const cand of interactions) {
    if (![...known].some(t => t && cand.includes(t))) {
      issues.push(mkIssue('invented-evidence', 'global', cand, 'computedEvidence 외 합·충·형·파·해 생성', 'high', 'mustUseFacts에 있는 작용만 사용'));
      return;
    }
  }

  // (b) 주요 신살 (귀인/도화/역마/화개/양인/괴강/백호/홍염) 언급이 analysis.specialStarsActivated에 없으면 invented
  const STAR_KEYWORDS = ['천을귀인', '도화', '역마', '화개', '양인', '괴강', '백호', '홍염'];
  const declaredStars = new Set((input.analysis.specialStarsActivated ?? []).map(s => s.name));
  for (const star of STAR_KEYWORDS) {
    if (all.includes(star) && !declaredStars.has(star)) {
      issues.push(mkIssue('invented-evidence', 'global', star, `${star} 신살은 계산되지 않은 요소`, 'high', '계산된 신살만 언급'));
      return;
    }
  }
}

function checkSectionMissing(report: YearlyFortuneReport, issues: YearlyValidationIssue[]) {
  // evidenceView는 deterministic — validator는 LLM 산출 섹션만 체크 (명세 §12)
  if (!report.yearFlowCard?.title)        issues.push(mkIssue('section-missing', 'yearFlowCard', '', 'yearFlowCard.title 누락', 'high', '제목 한 줄 추가'));
  if (!report.yearlyOverview?.oneLine)    issues.push(mkIssue('section-missing', 'yearFlowCard', '', 'yearlyOverview.oneLine 누락', 'high', '한 줄 요약 추가'));
  if (!report.yearlyMechanism?.body)      issues.push(mkIssue('section-missing', 'yearlyMechanism', '', 'yearlyMechanism.body 누락', 'high', '본문 추가'));
  if ((report.remainingMonths ?? []).length === 0) issues.push(mkIssue('section-missing', 'remainingMonths', '', 'remainingMonths 누락', 'high', '월별 분석 추가'));
  if (!report.topicFortunes?.career || !report.topicFortunes?.money || !report.topicFortunes?.relationship || !report.topicFortunes?.rhythm) {
    issues.push(mkIssue('section-missing', 'topicFortunes', '', 'topicFortunes 4영역 누락', 'high', 'career/money/relationship/rhythm 모두 채움'));
  }
  if (!report.actionGuide?.bestStrategy || (report.actionGuide?.mustCatch ?? []).length === 0) {
    issues.push(mkIssue('section-missing', 'actionGuide', '', 'actionGuide 누락', 'high', 'mustCatch + bestStrategy 채움'));
  }
  if ((report.nextTwoYears ?? []).length === 0) issues.push(mkIssue('section-missing', 'nextTwoYears', '', 'nextTwoYears 누락', 'high', '2개 연도 추가'));
}

function checkCrossSectionLeak(report: YearlyFortuneReport, issues: YearlyValidationIssue[]) {
  // 1) yearFlowCard summary가 너무 길고 월별 흐름을 끌고 옴
  const summary = report.yearFlowCard?.summary ?? '';
  if (summary.length > 600 && /\d+월[에는]/.test(summary)) {
    issues.push(mkIssue('cross-section-leak', 'yearFlowCard', summary.slice(0, 30) + '...', 'yearFlowCard가 월별 흐름까지 풀어씀', 'high', '월별은 remainingMonths에서만'));
  }
  // 2) remainingMonths가 "이후 2년" 식으로 nextTwoYears 영역 침범
  for (const m of report.remainingMonths ?? []) {
    if (/(이후\s*2년|다음\s*해\s*에는?|내년에는|2027년에는|2028년에는)/.test(m.body) ||
        /(이후\s*2년|다음\s*해|내년에는)/.test(m.relationship + m.money + m.work)) {
      issues.push(mkIssue('cross-section-leak', 'remainingMonths', m.monthLabel, '월별 섹션이 이후 2년 영역 침범', 'high', '이후 2년은 nextTwoYears에서만'));
      return;
    }
  }
  // 3) nextTwoYears가 월별 흐름 풀어씀
  for (const y of report.nextTwoYears ?? []) {
    if (/\d+월[에은는도]/.test(y.summary)) {
      issues.push(mkIssue('cross-section-leak', 'nextTwoYears', y.summary.slice(0, 30), 'nextTwoYears가 월별 흐름을 풀어씀', 'high', '월별 흐름은 remainingMonths에서만'));
      return;
    }
  }
  // 4) actionGuide가 월별 단정
  const strat = report.actionGuide?.bestStrategy ?? '';
  if (/\d+월에\s*(는|반드시|꼭|무조건)/.test(strat)) {
    issues.push(mkIssue('cross-section-leak', 'actionGuide', strat.slice(0, 30), '선택 가이드가 월별 단정', 'high', '월별은 remainingMonths에서만'));
  }
}

function checkValidatorLogLeak(report: YearlyFortuneReport, issues: YearlyValidationIssue[]) {
  const m = firstMatch(joinReportText(report), VALIDATOR_LEAK_RE);
  if (m) issues.push(mkIssue('validator-log-output', 'global', m, '내부 토큰/issue type/검증 용어 노출', 'high', '내부 식별자 제거'));
}

// ============================================================
// MEDIUM — 12개
// ============================================================
function checkMissingYearTenGod(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  const stem = input.analysis.yearTenGod.stemTenGod;
  const branch = input.analysis.yearTenGod.branchMainTenGod;
  const all = (input.report.yearFlowCard?.summary ?? '') + (input.report.yearlyMechanism?.body ?? '');
  if (!all.includes(stem) && !all.includes(branch)) {
    issues.push(mkIssue('missing-year-ten-god-interpretation', 'yearlyMechanism', '', '세운 십성 해석 누락', 'medium', `${stem}/${branch} 결을 본문에 풀이`));
  }
}

function checkMissingDaewoonSewoonLink(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  if (!/대운/.test(input.report.yearlyMechanism?.body ?? '')) {
    issues.push(mkIssue('missing-daewoon-sewoon-link', 'yearlyMechanism', '', '대운-세운 연결 누락', 'medium', '대운(큰 환경) 언급 추가'));
  }
}

function checkMissingUsefulGodLink(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  if (!/(용신|희신|기신|중립)/.test(input.report.yearlyMechanism?.body ?? '')) {
    issues.push(mkIssue('missing-useful-god-link', 'yearlyMechanism', '', '용신/기신 연결 누락', 'medium', '용신/기신 관계 1회 이상'));
  }
}

function checkMissingMonthlyGuidance(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  if ((input.report.remainingMonths ?? []).length === 0) {
    issues.push(mkIssue('missing-monthly-guidance', 'remainingMonths', '', '남은 월별 가이드 누락', 'medium', '월별 분석 추가'));
  }
}

function checkMissingActionGuide(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  const ag = input.report.actionGuide;
  if (!ag || (ag.mustCatch ?? []).length === 0 || (ag.betterAvoid ?? []).length === 0) {
    issues.push(mkIssue('missing-action-guide', 'actionGuide', '', '선택 가이드 부족', 'medium', 'mustCatch/betterAvoid 각각 2개 이상'));
  }
}

function checkMissingNextTwoYears(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  if ((input.report.nextTwoYears ?? []).length !== 2) {
    issues.push(mkIssue('missing-next-two-years', 'nextTwoYears', '', '이후 2년 정확히 2개 필요', 'medium', 'targetYear+1, +2 두 개'));
  }
}

const GENERIC_OVERVIEW_RE = /(평범한\s*해|평이한\s*한\s*해|좋은\s*해|나쁜\s*해|특별한\s*것이\s*없|항상\s*긍정)/;

function checkGenericOverview(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  const one = input.report.yearlyOverview?.oneLine ?? '';
  if (one.length < 12 || GENERIC_OVERVIEW_RE.test(one)) {
    issues.push(mkIssue('generic-yearly-overview', 'yearFlowCard', one, '한 줄 요약이 일반론', 'medium', '구체 키워드 + 흐름 결로'));
  }
}

function checkWeakEvidenceToNarrative(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  const blocks = input.report.yearlyMechanism?.evidenceBlocks ?? [];
  if (blocks.length === 0) {
    issues.push(mkIssue('weak-evidence-to-narrative', 'yearlyMechanism', '', 'evidenceBlocks 비어있음', 'medium', '1~3개 block 추가'));
    return;
  }
  for (const b of blocks) {
    if (!b.causalExplanation || !b.lifeScene || !b.positiveUse || !b.shadowPattern || !b.practicalAdvice) {
      issues.push(mkIssue('weak-evidence-to-narrative', 'yearlyMechanism', '', 'evidenceBlock 6단계 일부 누락', 'medium', '6단계 모두 채움'));
      return;
    }
  }
}

function checkSpecialStarTooShallow(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  const stars = input.analysis.specialStarsActivated ?? [];
  if (stars.length === 0) return;
  const body = (input.report.yearlyMechanism?.body ?? '') + (input.report.yearFlowCard?.summary ?? '');
  for (const s of stars) {
    if (body.includes(s.name)) {
      const meaningTokens = (s.yearlyMeaning || s.plainMeaning || '').split(/\s+/).filter(t => t.length >= 2);
      const hasMeaning = meaningTokens.some(t => body.includes(t));
      if (!hasMeaning) {
        issues.push(mkIssue('special-star-too-shallow', 'yearlyMechanism', s.name, '신살 단어만 등장, 의미 풀이 없음', 'medium', '의미와 결을 함께 설명'));
        return;
      }
    }
  }
}

const LIFE_SCENE_HINTS_RE = /(장면|상황|현실에서|환경|회의|점심|메시지|문서|역할|일정|순간)/;

function checkMissingLifeScene(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  if (!LIFE_SCENE_HINTS_RE.test(input.report.yearlyMechanism?.body ?? '')) {
    issues.push(mkIssue('missing-life-scene', 'yearlyMechanism', '', '현실 장면 부족', 'medium', '실제 상황/현실 결 추가'));
  }
}

const PALACE_RE = /(년주|월주|일주|시주|배우자궁|궁)/;

function checkMissingPalaceImpact(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  if (!PALACE_RE.test(input.report.yearlyMechanism?.body ?? '')) {
    issues.push(mkIssue('missing-palace-impact', 'yearlyMechanism', '', '세운이 어느 궁을 건드리는지 없음', 'medium', '년/월/일/시주 1회 이상'));
  }
}

function checkMissingStrengthImpact(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  if (!/(신강|신약|중화)/.test(input.report.yearlyMechanism?.body ?? '')) {
    issues.push(mkIssue('missing-strength-impact', 'yearlyMechanism', '', '신강/신약 부담/지원 없음', 'medium', '신강/신약 결을 1회 이상'));
  }
}

// ============================================================
// LOW — 3개
// ============================================================
const TRANSITION_RE = /(그래서|다만|대신|한편|이럴\s*때|또한|반대로|결국|이렇게)/;

function checkWeakTransition(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  const body = input.report.yearlyMechanism?.body ?? '';
  if (body.length > 0 && !TRANSITION_RE.test(body)) {
    issues.push(mkIssue('weak-transition', 'yearlyMechanism', '', '문장 전환어가 부족', 'low', '"그래서/다만/한편" 등 자연스럽게'));
  }
}

function checkMinorRepetition(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  const body = input.report.yearlyMechanism?.body ?? '';
  if (body.length < 80) return;
  const tokens = body.match(/[가-힣]{3,6}/g) ?? [];
  const counts = new Map<string, number>();
  for (const t of tokens) counts.set(t, (counts.get(t) ?? 0) + 1);
  for (const [t, n] of counts) {
    if (n >= 4) {
      issues.push(mkIssue('minor-repetition', 'yearlyMechanism', t, `"${t}" 4회 이상 반복`, 'low', '동의어/변형 사용'));
      return;
    }
  }
}

const SOFT_TONE_RE = /(좋습니다|좋아요|편합니다|편해요|살아납니다|살아나요|어울립니다|괜찮습니다|괜찮아요|있습니다|있어요|할\s*수\s*있어요)/;

function checkToneTooDry(input: YearlyValidatorInput, issues: YearlyValidationIssue[]) {
  const body = input.report.yearlyMechanism?.body ?? '';
  if (body.length > 0 && !SOFT_TONE_RE.test(body)) {
    issues.push(mkIssue('tone-too-dry', 'yearlyMechanism', '', '톤이 건조함', 'low', '"~할 수 있어요" 등 연결 톤'));
  }
}

// ============================================================
// 통합 — validateYearlyReport
// ============================================================
export function validateYearlyReport(input: YearlyValidatorInput): YearlyValidationResult {
  const issues: YearlyValidationIssue[] = [];

  // HIGH (10)
  checkEnglishElement(input.report, issues);
  checkDeterministic(input.report, issues);
  checkFinancial(input.report, issues);
  checkMedical(input.report, issues);
  checkFear(input.report, issues);
  checkUnsupportedUserContext(input, issues);
  checkInventedEvidence(input, issues);
  checkSectionMissing(input.report, issues);
  checkCrossSectionLeak(input.report, issues);
  checkValidatorLogLeak(input.report, issues);

  // MEDIUM (12)
  checkMissingYearTenGod(input, issues);
  checkMissingDaewoonSewoonLink(input, issues);
  checkMissingUsefulGodLink(input, issues);
  checkMissingMonthlyGuidance(input, issues);
  checkMissingActionGuide(input, issues);
  checkMissingNextTwoYears(input, issues);
  checkGenericOverview(input, issues);
  checkWeakEvidenceToNarrative(input, issues);
  checkSpecialStarTooShallow(input, issues);
  checkMissingLifeScene(input, issues);
  checkMissingPalaceImpact(input, issues);
  checkMissingStrengthImpact(input, issues);

  // LOW (3)
  checkWeakTransition(input, issues);
  checkMinorRepetition(input, issues);
  checkToneTooDry(input, issues);

  // ============================================================
  // 집계
  // ============================================================
  const highCount   = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const lowCount    = issues.filter(i => i.severity === 'low').length;

  // sectionIssues map
  const sectionIssues: Record<string, YearlyValidationIssue[]> = {};
  for (const iss of issues) {
    const key = iss.sectionId;
    if (!sectionIssues[key]) sectionIssues[key] = [];
    sectionIssues[key].push(iss);
  }

  // repair 대상: high 1+ 섹션 또는 medium 누적(2+) 섹션 (low는 제외)
  const repairTargetSet = new Set<YearlyFortuneSectionId>();
  for (const [secId, list] of Object.entries(sectionIssues)) {
    if (secId === 'global') {
      // global high는 가장 가까운 user-facing 섹션 yearlyMechanism로 redirect
      const hasHigh = list.some(i => i.severity === 'high');
      if (hasHigh) repairTargetSet.add('yearlyMechanism');
      continue;
    }
    const hasHigh = list.some(i => i.severity === 'high');
    const mediumN = list.filter(i => i.severity === 'medium').length;
    if (hasHigh || mediumN >= MEDIUM_REPAIR_THRESHOLD) {
      repairTargetSet.add(secId as YearlyFortuneSectionId);
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
export function partitionIssues(result: YearlyValidationResult) {
  return {
    high:   result.issues.filter(i => i.severity === 'high'),
    medium: result.issues.filter(i => i.severity === 'medium'),
    low:    result.issues.filter(i => i.severity === 'low'),
  };
}

// 헬퍼: generator/test에서 빈 month section 만들 때
export function emptyRemainingMonth(): RemainingMonthSection {
  return {
    monthLabel: '', periodLabel: '', keyword: '', body: '',
    work: '', money: '', relationship: '', goodChoice: '', caution: '',
  };
}
