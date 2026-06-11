// Convergence Guard (Narrative Differentiation Safety Net V1)
//
// 목적: 서로 다른 사주가 "차트 근거 없이" 같은 생활코치 문장으로 수렴하는 것을 탐지.
//   - 이 모듈은 **inert**다. 프로덕션 파이프라인(validator/sanitizer)에 아직 배선하지 않는다.
//     순수 함수 + 상수만 export → import해도 런타임 동작 변화 없음(byte-identical).
//   - 핵심 원칙: 단순 문자열 전면 금지가 아니라 **"차트에 근거가 있으면 허용, 근거 없이 여러
//     차트에 동일하게 들어가면 FAIL"**. → isConvergencePhraseJustified()로 근거 분기.
//
// 문구 출처(전부 audit에서 실측 확인된 하드코딩):
//   - narrativePlanBuilder.ts 합성 mustUseFacts / styleExamples(GOLD)
//   - topicCoverageTypes.ts FINAL_LINE_CANDIDATES
//   - fortuneVerdictEvidence.ts seed allowedClaims (verdict 경로)

export interface ConvergencePhrase {
  /** 안정 식별자 (테스트 assert/리포트용) */
  id: string;
  /** 매칭 정규식 — non-global(lastIndex 상태 없음). 조사/어미 변형 흡수. */
  re: RegExp;
  /** 왜 수렴 유발 문구인지 + 어떤 분석값이 있어야 허용되는지 메모 */
  note: string;
}

export const CONVERGENCE_PHRASES: ConvergencePhrase[] = [
  { id: 'lone-endurance',           re: /혼자\s*(너무\s*오래\s*)?버티|버티는\s*힘/,        note: '"혼자 버틴다/버티는 힘" — 신강+양인·괴강일 때만 허용.' },
  { id: 'inner-strong',             re: /내면(은|이)?\s*(강|단단)|안쪽에(는|선)?\s*(쉽게\s*)?물러서지\s*않/, note: '"내면은 강함" — 신강 구조일 때만.' },
  { id: 'outer-calm-inner',         re: /겉으로는?\s*차분|겉과\s*속이\s*다/,               note: '"겉으로는 차분/겉과 속이 다른" — 천간-지장간 대조(반전) 있을 때만.' },
  { id: 'set-standard-divide-role', re: /기준을\s*(세우|잡).{0,12}역할을?\s*나/,           note: '"기준을 세우고 역할을 나눈다" — FINAL_LINE/GOLD 하드코딩. 근거 없음.' },
  { id: 'action-over-words',        re: /말보다\s*행동의?\s*일관성/,                       note: '"말보다 행동의 일관성을 본다" — relationship 합성 fact. 근거 없음.' },
  { id: 'scope-and-reward',         re: /작업\s*범위.{0,8}보상\s*기준/,                    note: '"작업 범위·보상 기준" — money/final 하드코딩. 근거 없음.' },
  { id: 'accumulation-type',        re: /축적형|한\s*방보다\s*(직책|소유|고정|축적)/,      note: '"한 방보다 축적형" — 정재 우위(재성 있음)일 때만. 편재 우위엔 모순.' },
  { id: 'asset-after-40',           re: /(40대\s*이후|30대(에|는)?\s*기반).{0,12}자산|자산화/, note: '"30대 기반 → 40대 자산" — 나이(before40) 산물. 차트 근거 없음.' },
  { id: 'lay-the-board',            re: /판을?\s*(깔|까는)/,                               note: '"판을 까는 시기" — 나이 분기 하드코딩. 근거 없음.' },
  { id: 'document-contract',        re: /문서[·,]?\s*계약/,                                note: '"문서·계약 조심" — 인성(문서·자격) 신호 있을 때만.' },
  { id: 'numbers-contracts',        re: /숫자[·,]?\s*계약[·,]?\s*일정/,                    note: '"귀인=숫자·계약·일정 잡아주는 사람" — verdict noble seed. 근거 없음.' },
  { id: 'no-standard-favor',        re: /기준\s*없이\s*부탁/,                              note: '"기준 없이 부탁만 늘리는 사람" — 하드코딩. 근거 없음.' },
  { id: 'free-labor',               re: /무료로\s*해주(던|는)|무료가\s*당연/,              note: '"무료로 해주던 능력" — money 합성 fact. 근거 없음.' },
  { id: 'commoditize-standard',     re: /(내\s*기준을\s*파|기준이\s*상품|전문성.{0,4}상품화)/, note: '"전문성 상품화/내 기준을 파는 구조" — 식상생재일 때만.' },
];

// ──────────────────────────────────────────────────────────────
// 차트 근거(ChartSignals) 추출 — coreAnalysis/specialPoints에서 결정론으로.
// ──────────────────────────────────────────────────────────────
export interface ChartSignals {
  strongDM: boolean;   // 신강/매우신강
  weakDM: boolean;     // 신약/매우신약
  jae: number;         // 재성(정재+편재)
  jeongJae: number;
  pyeonJae: number;
  sikSang: number;     // 식상(식신+상관)
  insung: number;      // 인성(정인+편인)
  gwan: number;        // 관성(정관+편관)
  hasYangin: boolean;
  hasGoegang: boolean;
  hasNoble: boolean;   // 천을/월덕/천덕귀인
  hasYeokma: boolean;
  hasReversal: boolean; // 천간-지장간 대조(반전형 specialPoint)
}

const g = (totals: Record<string, number>, names: string[]) =>
  names.reduce((a, n) => a + (Number(totals?.[n]) || 0), 0);

export function extractChartSignals(gpt: any): ChartSignals {
  const core: any = gpt?.coreAnalysis ?? {};
  const totals: Record<string, number> = core.tenGods?.totals ?? {};
  const level: string = core.dayMasterStrength?.level ?? 'balanced';
  const starNames = new Set<string>((core.specialStars ?? []).map((s: any) => String(s?.name ?? s)));
  const spNames = new Set<string>((gpt?.specialPoints ?? []).map((p: any) => String(p?.name ?? p)));
  const jeongJae = g(totals, ['정재']), pyeonJae = g(totals, ['편재']);
  return {
    strongDM: /strong/.test(level),
    weakDM: /weak/.test(level),
    jae: jeongJae + pyeonJae, jeongJae, pyeonJae,
    sikSang: g(totals, ['식신', '상관']),
    insung: g(totals, ['정인', '편인']),
    gwan: g(totals, ['정관', '편관']),
    hasYangin: starNames.has('양인'),
    hasGoegang: starNames.has('괴강'),
    hasNoble: ['천을귀인', '월덕귀인', '천덕귀인'].some(n => starNames.has(n)),
    hasYeokma: starNames.has('역마'),
    hasReversal: spNames.has('천간-지장간 대조') || [...spNames].some(n => /반전/.test(n)),
  };
}

/**
 * 이 수렴 문구가 "이 차트에서는" 근거가 있어 허용되는가.
 * 미등록 id는 기본 false(=근거 없음 → 수렴 취급). 안전 방향.
 */
export function isConvergencePhraseJustified(id: string, s: ChartSignals): boolean {
  switch (id) {
    case 'lone-endurance':
    case 'inner-strong':           return s.strongDM && (s.hasYangin || s.hasGoegang);
    case 'outer-calm-inner':       return s.hasReversal;
    case 'accumulation-type':      return s.jae >= 1.5 && s.jeongJae >= s.pyeonJae;
    case 'document-contract':      return s.insung >= 1.5;
    case 'commoditize-standard':   return s.sikSang >= 1.5;
    // 나이/생활코치 산물 — 어떤 차트도 정당화 못 함:
    case 'asset-after-40':
    case 'lay-the-board':
    case 'set-standard-divide-role':
    case 'action-over-words':
    case 'scope-and-reward':
    case 'numbers-contracts':
    case 'no-standard-favor':
    case 'free-labor':             return false;
    default:                       return false;
  }
}

/** text에 등장하는 수렴 문구 id들. (중복 제거) */
export function findConvergencePhrases(text: string): string[] {
  const out: string[] = [];
  for (const p of CONVERGENCE_PHRASES) if (p.re.test(text)) out.push(p.id);
  return out;
}

/** 여러 텍스트가 **공통으로** 가진 수렴 문구 id들. 비어 있어야 정상. */
export function sharedConvergencePhrases(texts: string[]): string[] {
  if (texts.length === 0) return [];
  const perText = texts.map(t => new Set(findConvergencePhrases(t)));
  const [first, ...rest] = perText;
  return [...first].filter(id => rest.every(set => set.has(id)));
}

/**
 * 핵심 가드: 여러 차트의 같은 섹션 텍스트가 공통으로 가진 수렴 문구 중,
 * **하나라도 근거 없이(미정당화) 들어간** 것들. → 비어 있어야 정상.
 * (모든 차트가 정당화하면 우연 일치로 보고 통과. 한 차트라도 근거 없으면 수렴 위반.)
 */
export function unjustifiedSharedPhrases(entries: Array<{ text: string; signals: ChartSignals }>): string[] {
  const shared = sharedConvergencePhrases(entries.map(e => e.text));
  return shared.filter(id => entries.some(e => !isConvergencePhraseJustified(id, e.signals)));
}

/** 임의의 문자열 배열에서 모든 그룹에 공통 등장하는 정확-일치 문자열 — 합성 fact 공유 검출용. */
export function sharedExactStrings(groups: string[][]): string[] {
  if (groups.length === 0) return [];
  const [first, ...rest] = groups.map(g2 => new Set(g2));
  return [...first].filter(s => rest.every(set => set.has(s)));
}
