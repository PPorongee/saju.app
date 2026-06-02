// Fortune Questions Verdict V1 — deterministic 판정 씨앗(VerdictSeed) 추출.
//
// grounding 원칙:
//   - 재물=재성 강약+용신관계, 횡재=편재, 투자성향=정재(축적)/편재(거래·사업), 직장=정관(안정)/편관(도전),
//     이직=편관·상관·세운 관성, 사업=식상+비겁+재성, 이동수=역마 신살, 부동산=재성+인성,
//     관계=성별별 관성/재성+도화(status별), 자녀=식상(女)/관성(男)+시주, 시기=현재 대운 나이대 + 십성의 주(柱) 위치(초/청/중/말년).
//   - 명리 용어는 생활 언어로 번역해서 basisSignals에 담는다. 없는 시기/숫자(자녀 수·출산일) 생성 금지.
//   - 근거 약하면 strength=weak / not_prominent (회피 아님, 판정).

import { ELEMENT_KO, type Element } from '../rules/elements';
import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type { YongsinDiagnostic } from '../analysis/yongsinDiagnostic';
import type { YearlyFortuneAnalysis } from '../yearly/yearlyTypes';
import type { CompatibilityAnalysisBundle } from '../compatibility/compatibilityTypes';
import type { PregnancyAnalysisBundle } from '../pregnancy/narrative/pregnancyMomBabyAnalyzer';
import type {
  FortuneVerdictEvidence, VerdictSeed, VerdictStrength, RelationshipStatus, ConcernKey,
} from './fortuneVerdictTypes';

const ELEMENT_KEYS = ['wood', 'fire', 'earth', 'metal', 'water'];
const STRENGTH_KO: Record<string, string> = {
  'very-strong': '매우 강함', strong: '강함', balanced: '균형', weak: '여림', 'very-weak': '매우 여림',
};
// 십성 → 생활 언어 (basis 번역; raw 십성명 노출 최소화)
const TG_LIFE: Record<string, string> = {
  정재: '성실·고정형 돈 기운', 편재: '변동·확장형 돈/기회 기운',
  식신: '꾸준한 생산·표현 기운', 상관: '재능·표현·전환 기운',
  정관: '안정된 직장·책임 기운', 편관: '압박·권한·도전 기운',
  정인: '문서·자격·배움 기운', 편인: '전문성·전환 기운',
  비견: '자립·동료 기운', 겁재: '경쟁·확장 기운',
};

function toKo(v: unknown): string {
  if (typeof v !== 'string') return String(v ?? '');
  return ELEMENT_KEYS.includes(v) ? ELEMENT_KO[v as Element] : v;
}
function gsum(totals: Record<string, number>, names: string[]): number {
  return names.reduce((a, n) => a + (Number(totals?.[n]) || 0), 0);
}
function inList(list: Array<unknown> | undefined, names: string[]): boolean {
  const s = new Set((list ?? []).map(x => String(x)));
  return names.some(n => s.has(n));
}
function normStatus(v: unknown): RelationshipStatus {
  const s = String(v ?? 'unknown');
  if (s === 'single' || s === 'dating' || s === 'married' || s === 'divorced') return s;
  if (s === 'widowed') return 'married';
  return 'unknown';
}
const allowsNewRomance = (s: RelationshipStatus) => s === 'single' || s === 'dating';

const POS_LIFE: Record<string, string> = {
  yearStem: '초년', yearBranch: '초년', monthStem: '청년', monthBranch: '청년',
  dayStem: '중년', dayBranch: '중년', hourStem: '말년', hourBranch: '말년',
};
/** tenGods.visible/hidden에서 특정 십성군이 어느 주(생애 단계)에 있는지. */
function lifeStagesOfTenGods(core: any, names: string[]): string[] {
  const out = new Set<string>();
  const scan = (arr: any[]) => (arr ?? []).forEach((e: any) => { if (names.includes(e?.tenGod) && POS_LIFE[e?.position]) out.add(POS_LIFE[e.position]); });
  scan(core?.tenGods?.visible); scan(core?.tenGods?.hidden);
  return [...out];
}
function hasStar(core: any, re: RegExp): boolean {
  return (core?.specialStars ?? []).some((s: any) => re.test(String(s?.name ?? '')));
}
function str3(n: number): VerdictStrength {
  if (n >= 3) return 'strong';
  if (n >= 1.5) return 'moderate';
  if (n > 0) return 'weak';
  return 'not_prominent';
}
function coreLinesFromPerson(gpt: PersonalSajuGptInput): string[] {
  const core: any = (gpt as any).coreAnalysis ?? {};
  const ug: any = core.usefulGod ?? {};
  const dm: any = core.dayMasterStrength ?? {};
  const lines: string[] = [];
  if (ug.primaryUseful) lines.push(`용신: ${toKo(ug.primaryUseful.value)}${ug.unfavorable?.length ? ` / 기신: ${(ug.unfavorable as any[]).map(toKo).join(',')}` : ''}`);
  if (dm.level) lines.push(`일간 강약: ${STRENGTH_KO[dm.level] ?? dm.level}`);
  return lines;
}
function auxLines(diag: YongsinDiagnostic | undefined | null): string[] {
  if (!diag) return [];
  const out: string[] = [];
  const p = ELEMENT_KO[diag.currentFinalYongsin?.primary as Element];
  if (p) out.push(`주 용신(${p}) 유지 — 보조 결만 참고`);
  if (diag.drainCandidate?.element) out.push(`설기 보조: ${ELEMENT_KO[diag.drainCandidate.element]}`);
  if (diag.controlCandidate?.element) out.push(`극제 보조: ${ELEMENT_KO[diag.controlCandidate.element]}`);
  return out;
}

// ── 나이대 라벨 ──
function ageBandOf(age: number | null): string {
  if (age == null || !Number.isFinite(age) || age <= 0) return '';
  if (age < 20) return '10대';
  if (age < 25) return '20대 초반';
  if (age < 30) return '20대 후반';
  if (age < 35) return '30대 초반';
  if (age < 40) return '30대 후반';
  if (age < 45) return '40대 초반';
  if (age < 50) return '40대 후반';
  if (age < 55) return '50대 초반';
  if (age < 60) return '50대 후반';
  return '60대 이후';
}

// ── 관심사 정규화(배열 + merge + dedup) ──
const CONCERN_RULES: Array<{ key: ConcernKey; re: RegExp }> = [
  { key: 'money', re: /money|invest|wealth|돈|재물|재테크|투자|수입|소득/i },
  { key: 'housing_move', re: /move|hous|real.?estate|relocat|이사|이동|생활권|집|부동산|주거|전세|매매/i },
  { key: 'child_family', re: /child|kid|education|pregnan|family|자녀|아이|애|육아|교육|임신|출산|가족/i },
  { key: 'career', re: /career|job|promot|employ|이직|직장|직업|커리어|승진|취업|진로/i },
  { key: 'business', re: /business|startup|freelance|사업|창업|장사|프리랜|동업/i },
  { key: 'relationship', re: /relationship|marriage|spouse|dating|love|연애|결혼|배우자|인연|관계|이성/i },
];
function normalizeConcerns(raw: unknown): ConcernKey[] {
  const arr: string[] = Array.isArray(raw) ? raw.map(String) : (typeof raw === 'string' && raw ? [raw] : []);
  const out: ConcernKey[] = [];
  for (const item of arr) {
    for (const { key, re } of CONCERN_RULES) {
      if (re.test(item) && !out.includes(key)) out.push(key);
    }
  }
  return out;
}

// ── 개인사주 섹션 플랜(우선순위: 공통축 → 관심사 → 생애상태 → evidence강. 6~8개) ──
const SEC = {
  daewoon: '운이 커지는 시기와 대운',
  money: '돈과 재물운',
  career: '일·사업·이직',
  housing: '이동수와 집·부동산',
  child: '자녀와 가족',
  spouse: '배우자와 집안',
  relationship: '인연과 결혼',
  invest: '투자 성향과 돈의 형태',
  noble: '귀인운과 피해야 할 사람',
  document: '문서·계약에서 조심할 것',
};
// Depth-Up V1: 7~9개 섹션 허용. housing은 관심사/역마뿐 아니라 기혼+자녀·충 신호로도 우선 포함.
// 귀인(noble)·문서계약(document)은 evidence(천을귀인/인성)가 있으면 별도 섹션으로 승격.
function buildPersonalSectionPlan(a: {
  concerns: ConcernKey[]; status: RelationshipStatus; hasChildren: boolean | 'unknown';
  yeokma: boolean; noble: boolean; housingSignal: boolean; document: boolean;
}): string[] {
  const plan: string[] = [SEC.daewoon, SEC.money, SEC.career]; // P1 필수 공통축
  const add = (s: string) => { if (!plan.includes(s)) plan.push(s); };
  // P2 관심사
  for (const c of a.concerns) {
    if (c === 'housing_move') add(SEC.housing);
    else if (c === 'child_family') add(SEC.child);
    else if (c === 'relationship') add(a.status === 'married' || a.status === 'divorced' ? SEC.spouse : SEC.relationship);
    else if (c === 'business') add(SEC.career); // 사업은 일·사업·이직에 포함(이미 있음)
    else if (c === 'money') add(SEC.invest); // 돈 관심 → 투자 성향 섹션도
    // career → 이미 P1
  }
  // P3 생애상태
  if ((a.status === 'married' || a.status === 'divorced')) add(SEC.spouse);
  if (a.hasChildren === true) add(SEC.child);
  if ((a.status === 'single' || a.status === 'dating' || a.status === 'unknown') && !plan.includes(SEC.relationship)) {
    add(SEC.relationship); // 미혼/연애중은 인연운 기본 포함
  }
  // P3.5 evidence강 — 4대 강화 주제(이동수/문서계약/귀인)를 신호 있을 때 승격
  if (a.housingSignal) add(SEC.housing);     // 역마 OR 기혼+자녀 OR 충 신호
  if (a.document) add(SEC.document);          // 인성(문서·자격·계약 기운) 있음
  // 귀인/피해야 할 사람은 천을귀인이 없어도 누구에게나 궁금한 축 — 항상 포함.
  // (천을귀인 있으면 seed.strength=moderate "귀인운 강함", 없으면 weak이되 tenGod 기반 "어떤 사람"으로 풀림)
  add(SEC.noble);
  // P4 채움 — 관심사 없어도 최소 7섹션 보장(얇아짐 방지). evidence 약한 축으로 채움.
  for (const f of [SEC.invest, SEC.document, SEC.housing]) {
    if (plan.length >= 7) break;
    add(f);
  }
  return plan.slice(0, 9); // 7~9 허용
}

// ============================================================
// 1) 개인사주 — 인생 큰 질문 판정 (메인)
// ============================================================
export function buildPersonalFortuneVerdictEvidence(gpt: PersonalSajuGptInput): FortuneVerdictEvidence {
  const core: any = (gpt as any).coreAnalysis ?? {};
  const totals: Record<string, number> = core.tenGods?.totals ?? {};
  const ug: any = core.usefulGod ?? {};
  const dm: string = core.dayMasterStrength?.level ?? 'balanced';
  const strongDM = /strong/.test(dm); // very-strong/strong
  const fortune: any = (gpt as any).fortune ?? {};
  const gender: string = (gpt as any).userContext?.gender ?? 'unknown';
  const status = normStatus((gpt as any).userContext?.relationshipStatus);
  const hasChildren = (gpt as any).userContext?.hasChildren ?? 'unknown';

  const jeongJae = Number(totals['정재']) || 0, pyeonJae = Number(totals['편재']) || 0, jae = jeongJae + pyeonJae;
  const sikSang = gsum(totals, ['식신', '상관']);
  const jeongGwan = Number(totals['정관']) || 0, pyeonGwan = Number(totals['편관']) || 0, gwan = jeongGwan + pyeonGwan;
  const insung = gsum(totals, ['정인', '편인']);
  const bigeop = gsum(totals, ['비견', '겁재']);
  const sangGwan = Number(totals['상관']) || 0;
  const jaeFavorable = inList(ug.favorable, ['정재', '편재']);
  const jaeUnfavorable = inList(ug.unfavorable, ['정재', '편재']);

  const seeds: VerdictSeed[] = [];
  const cd = fortune.currentDaewoon;
  const cdAge = cd?.ageRange ? `현재 대운(${cd.ageRange}세)` : '현재 대운';
  const jaeStages = lifeStagesOfTenGods(core, ['정재', '편재']);
  const gwanStages = lifeStagesOfTenGods(core, ['정관', '편관']);

  // Depth-Up V1 — 나이대/관심사 + 4대 강화 신호(이동수·귀인·문서계약·40대 재물)
  const currentAge: number | null = typeof (gpt as any).userContext?.age === 'number' ? (gpt as any).userContext.age : null;
  const ageBand = ageBandOf(currentAge);
  const concerns = normalizeConcerns((gpt as any).userContext?.currentConcerns);
  const before40 = currentAge != null && currentAge < 40; // 40대 이전 → "판 까는 시기" 서사
  const yeokma = hasStar(core, /역마/);
  const nobleStar = hasStar(core, /천을귀인|월덕귀인|천덕귀인/);
  const cac: any = core?.combinationsAndConflicts ?? {};
  const conflictList: any[] = cac.conflicts ?? cac.clashes ?? (Array.isArray(cac) ? cac : []);
  const hasConflict = Array.isArray(conflictList) && conflictList.length > 0;
  const housingSignal = yeokma || (status === 'married' && hasChildren === true) || hasConflict || concerns.includes('housing_move');
  const docSignal = insung >= 1; // 인성 = 문서·자격·계약 기운

  // 1) 재물운
  {
    let st = str3(jae);
    if (jaeUnfavorable && st === 'strong') st = 'moderate';
    const basis = [`돈 기운 비중 ${jae >= 3 ? '큼' : jae >= 1.5 ? '보통' : '약함'}`];
    if (jaeFavorable) basis.push('돈 기운이 사주에 도움이 되는 결(용신·희신)');
    else if (jaeUnfavorable) basis.push('돈 기운이 과하면 부담이 되는 결(기신) — 관리형');
    if (jaeStages.length) basis.push(`재물 흐름이 강해지는 생애 단계: ${jaeStages.join('·')}`);
    if (before40) basis.push('지금은 40대 이전 — 돈이 바로 터지는 시기가 아니라 40대 이후 돈이 붙을 판을 까는 시기');
    const claims = [
      pyeonJae >= jeongJae ? '한 번에 크게보다 기회·거래로 움직이는 편' : '한 방보다 직책·소유·고정수입으로 늦게 크게 쌓이는 축적형',
      '돈복 강/약을 선명히 판정 가능',
    ];
    // 40대 이후 자산화 서사 강화(2~3문단으로 풀 것): 30대는 판 까는 시기, 40대 이후 굵어짐 + 자산 형태 연결
    claims.push('40대 이후 자산화 흐름을 2~3문단으로: 30대에 깐 전문성·고정수입·계약·소유가 40대 이후 자산으로 굵어지는 그림');
    claims.push('한 방형이 아니라 축적형 — 고정수입·부동산성 자산·장기 계약·전문성의 가격이 시간이 붙을수록 오르는 쪽으로 돈이 남음');
    seeds.push({
      question: '돈복이 있는가? 언제부터 굵어지는가?', verdictType: 'wealth', strength: st,
      timing: jaeStages.length ? `${jaeStages.join('·')}${cd?.ageRange ? ` / 현재 대운 ${cd.ageRange}세` : ''}` : cdAge,
      basisSignals: basis,
      allowedClaims: claims,
    });
  }
  // 2) 횡재수
  {
    const st: VerdictStrength = (pyeonJae >= 2 && sikSang >= 1) ? 'moderate' : pyeonJae >= 1 ? 'weak' : 'not_prominent';
    seeds.push({
      question: '횡재수가 있는가?', verdictType: 'windfall', strength: st,
      timing: '', basisSignals: [pyeonJae >= 2 ? '변동·기회형 돈 기운(편재)이 있음' : '한 방에 터지는 돈 기운은 약한 편'],
      allowedClaims: ['횡재수 있음/약함을 선명히 판정', st === 'not_prominent' ? '횡재로 크게 먹는 사주는 아니라고 판정 가능' : '큰 한 방보다 흐름으로'],
    });
  }
  // 3) 투자 성향
  {
    const tradingType = pyeonJae > jeongJae && strongDM;
    seeds.push({
      question: '주식·코인처럼 변동성 큰 투자가 맞는가?', verdictType: 'wealth_style', strength: jae >= 1 ? 'moderate' : 'weak',
      timing: '', basisSignals: [tradingType ? '변동·확장형 돈 기운 + 추진력' : '성실·고정형 돈 기운 + 안정 지향'],
      allowedClaims: (tradingType
        ? ['변동성을 감당하되 규모를 키우기 전 구조를 먼저 잡는 거래·사업형', '단타 몰빵보다 현금흐름 보이는 자산']
        : ['주식처럼 변동성 큰 승부보다 현금흐름·실물·고정수입 기반 축적이 맞다고 판정', '부동산/계약형/전문직 쪽이 더 맞음'])
        .concat([
          '★투자 성향 판정은 선명하게 하되, "원금 손실/투자 수익/매수·매도 지시"로 들리는 표현은 금지',
          '변동성 자산은 수익보다 피로·흔들림을 먼저 만든다 / 감으로 들어간 돈은 오래 버티기 어렵다 식으로 결을 풀 것',
        ]),
    });
  }
  // 4) 직장 vs 사업/이직
  {
    const jobStable = jeongGwan >= pyeonGwan && jeongGwan >= 1;
    seeds.push({
      question: '직장 안에서 크는 타입인가, 독립·사업형인가?', verdictType: 'career_job', strength: str3(gwan + sikSang),
      timing: gwanStages.length ? gwanStages.join('·') : '', basisSignals: [jobStable ? '안정된 직장·책임 기운(정관)이 또렷' : (pyeonGwan >= 1 ? '압박·권한·도전 기운(편관)이 강함' : '조직보다 자기 일·표현 기운이 강함')],
      allowedClaims: [jobStable ? '조직 안에서 직책·책임으로 크는 타입' : '자기 기준·시스템을 상품화하는 독립형에 가까움'],
    });
    // 이직운
    const jc: VerdictStrength = (pyeonGwan >= 1.5 || sangGwan >= 1.5) ? 'strong' : (pyeonGwan + sangGwan >= 1) ? 'moderate' : 'weak';
    seeds.push({
      question: '이직운이 있는가?', verdictType: 'job_change', strength: jc,
      timing: '', basisSignals: [(pyeonGwan >= 1.5 || sangGwan >= 1.5) ? '판을 바꾸는 도전·표현 기운이 강함' : '한자리에서 오래 쌓는 결이 더 강함'],
      allowedClaims: ['이직운 있음/약함 판정', jc === 'weak' ? '잦은 이직보다 한자리 축적이 유리' : '판을 바꿀 때 운이 살아남'],
    });
    // 사업/확장
    const biz: VerdictStrength = (sikSang >= 1.5 && jae >= 1.5) ? 'strong' : (sikSang >= 1 || bigeop >= 2) ? 'moderate' : 'weak';
    const expYear = (Array.isArray(fortune.nextThreeYears) ? fortune.nextThreeYears : [])
      .find((y: any) => (y.activatedTenGods ?? []).some((g: string) => ['정재', '편재', '식신', '상관'].includes(g)));
    const bizInterest = concerns.includes('business');
    seeds.push({
      question: '독립·사업운이 있는가? 확장은 언제가 나은가?', verdictType: 'business', strength: biz,
      timing: expYear ? `${expYear.year}년 무렵` : (jaeStages[0] || ''),
      basisSignals: [
        (sikSang >= 1.5 && jae >= 1.5) ? '생산·표현 기운이 돈으로 이어지는 결(식상생재)' : '확장보다 구조·정비가 먼저인 결',
        bizInterest ? '사용자가 사업을 직접 관심사로 고름 — "직장형"으로 끊지 말고 "어떤 사업이 맞는지"까지 풀 것' : '',
      ].filter(Boolean),
      allowedClaims: [
        '★사업 섹션은 이 도입부로 직접 시작: "사업을 아예 하지 말라는 사주는 아닙니다. 다만 직장을 끊고 바로 크게 벌리는 사업보다, 직장에서 쌓은 전문성과 기준을 작게 상품화하는 방식이 먼저입니다." (복붙 아닌 이 호흡으로)',
        '맞는 형태를 특정: 부업·컨설팅·강의·시스템화된 서비스처럼 "내 기준을 파는 구조"가 먼저 (큰 확장형 vs 작게 반복되는 구조 중 어느 쪽인지 단정)',
        biz === 'weak' ? '크게 벌리는 확장형보다, 작게 시작해 반복·자동화되는 구조가 맞음' : '식상생재 결 — 전문성이 상품이 될 때 확장운이 붙음',
        '동업은 역할·돈 기준을 먼저 못 박을 때만 가능(기준 없으면 같이 샌다)',
        '확장 시기 판정 가능(없는 연도 생성 금지)',
      ],
    });
  }
  // 5) 이동수 — 집·아이 동선·배우자 일정·일하는 장소·계약 조건으로 구체화
  {
    const married = status === 'married' || status === 'divorced';
    seeds.push({
      question: '이사운·이동수가 있는가? 어떤 조건으로 움직이는가?', verdictType: 'move',
      strength: yeokma ? 'moderate' : 'not_prominent',
      timing: yeokma ? cdAge : '',
      basisSignals: [
        yeokma ? '이동·변화에서 운이 살아나는 결(역마)' : '한곳에 뿌리내리는 결이 더 강함',
        married && hasChildren === true ? '기혼·자녀 — 이동은 여행이 아니라 집·아이 동선·배우자 일정·일하는 장소 조건으로 움직임' : '이동은 여행운이 아니라 현실 조건(집·근무지·생활권)으로',
        hasConflict ? '원국 충 신호 — 자리·환경이 흔들려 이동이 올라올 결' : '',
      ].filter(Boolean),
      allowedClaims: [
        yeokma ? '집·근무지·생활권 중 하나가 현실적으로 바뀌는 이동수' : '잦은 이동보다 뿌리내리는 쪽 — 다만 집·가족 조건 때문에 한 번은 움직일 수 있음',
        '이동의 트리거는 아이 동선(전학·학군)·배우자 일정·일하는 장소·집 계약 만료 — 이 조건들이 겹칠 때 실제 이동',
        '여행이 아니라 집과 가족 조건 때문에 움직이는 운',
      ],
    });
  }
  // 6) 부동산·집 계약 (매수/매도 확정 지시 금지)
  {
    const re: VerdictStrength = (jae >= 1.5 && insung >= 1) ? 'moderate' : 'weak';
    seeds.push({
      question: '부동산·집 계약운은 어떻게 움직이는가?', verdictType: 'real_estate', strength: re,
      timing: '',
      basisSignals: ['돈 기운 + 문서·계약 기운(인성)의 조합', docSignal ? '문서·계약 기운 있음 — 조건을 직접 따질 때 실속' : ''].filter(Boolean),
      allowedClaims: [
        '빠르게 잡는 운이 아니라 대출·보증금·계약 기간·가족 동선을 따질 때 실속',
        '분위기에 밀려 급하게 도장 찍으면 그 부담(이자·계약 조항)이 몇 년을 따라옴',
        '사라/팔아라 확정 지시가 아니라 계약 조건과 시점을 따지는 판단으로만',
      ],
    });
  }
  // 7) 관계/배우자
  {
    if (allowsNewRomance(status)) {
      const relG = gender === 'female' ? ['정관', '편관'] : ['정재', '편재'];
      const relSum = gsum(totals, relG);
      const dohwa = hasStar(core, /도화|홍염/);
      seeds.push({
        question: '인연·결혼운이 있는가?', verdictType: 'relationship', strength: str3(relSum + (dohwa ? 1 : 0)),
        timing: '', basisSignals: [`${gender === 'female' ? '관계·공식화' : '현실 인연'} 기운 ${relSum >= 2 ? '또렷' : '있음'}`, dohwa ? '끌림·매력 신살(도화·홍염)' : ''].filter(Boolean),
        allowedClaims: ['인연운 강/약 판정', '갑자기 타오르는 인연보다 생활·책임이 맞을 때 깊어지는 결 등 결 판정', '반드시 만난다/결혼한다 단정만 금지'],
      });
    } else {
      seeds.push({
        question: '배우자·집안·가족 구조는 어떻게 움직이는가?', verdictType: 'family_spouse', strength: 'moderate',
        timing: '', basisSignals: ['기혼 — 새 인연이 아니라 배우자·집·돈·아이·부모 문제로 움직이는 관계운'],
        allowedClaims: [
          '집안의 돈·역할·책임을 누가 어디까지 질지 다시 정하는 흐름',
          '★최소 2문단 — 돈(누가 통장을 쥐고 어디에 쓰나)·아이(교육비·생활권)·집(이사·계약)·역할분담 중 2개 이상을 엮어, 이 부부 사이에 무엇이 테이블 위로 올라오는지 구체로 풀 것',
          '"배우자와 조율하라/소통하라"는 상담문으로 끝내지 말 것 — 무엇을 두고 부딪히고 무엇을 숫자로 못 박아야 하는지로',
          '새 연애 인연 절대 금지',
        ],
      });
    }
  }
  // 8) 자녀운 (숫자·건강·출산 예측 금지)
  {
    const childG = gender === 'female' ? ['식신', '상관'] : ['정관', '편관'];
    const childSum = gsum(totals, childG);
    const hourChild = lifeStagesOfTenGods(core, childG).includes('말년') || (core?.tenGods?.visible ?? []).some((e: any) => /hour/.test(e?.position) && childG.includes(e?.tenGod));
    const concentrated = childG.reduce((a, g) => a + (Number(totals[g]) || 0), 0) > 0 && (Number(totals[childG[0]]) || 0) >= (Number(totals[childG[1]]) || 0) * 2;
    const childHas = hasChildren === true;
    seeds.push({
      question: childHas
        ? '이미 자녀가 있다면, 앞으로 자녀운은 교육·생활권·돈·역할 중 어디로 움직이는가?'
        : '자녀운은 강한가? 한 아이 집중형인가, 여럿으로 퍼지는가?',
      verdictType: 'child', strength: str3(childSum),
      timing: '', basisSignals: [`자녀 인연 기운 ${childSum >= 2 ? '또렷' : childSum >= 1 ? '있음' : '약함'}`, hourChild ? '자식궁(시주)에 관련 기운' : ''].filter(Boolean),
      allowedClaims: childHas
        ? [
            '"약함"으로 끊지 말 것 — 이미 자녀가 있으므로 새 아이 여부가 아니라 "앞으로의 자녀운"이 어디로 움직이는지로 풀 것',
            '새로 생기는 아이보다 아이의 교육·생활권(전학·이사)·가족의 돈 배분·배우자와의 역할 분담 문제로 움직인다는 결',
            concentrated ? '관심·책임이 한 아이에게 집중되는 그림' : '가족 전체 책임으로 넓게 번지는 그림',
            '임신·출산·성별·건강·아이 수 확정은 절대 금지(경향·방향 판정만)',
          ]
        : [
            '자녀운 강/약 + 그림 판정(여럿 vs 한 아이 집중)',
            concentrated ? '한 아이에게 책임·관심이 집중되는 그림' : '가족 전체 책임이 더 강조되는 그림',
            '임신·출산·성별·건강·아이 수 확정은 절대 금지',
          ],
    });
  }

  // 9) 귀인운 / 피해야 할 사람 (B) — 운을 열어주는 사람 vs 돈·시간을 새게 만드는 사람.
  //    천을귀인 없어도 항상 출력(누구나 궁금한 축). 신살 대신 tenGod로 "어떤 사람"인지 grounding.
  {
    // 천을귀인 강 → "귀인운 강함". 없으면 사주의 기운으로 조력자 유형을 특정(억지 과장 금지).
    const helperType = insung >= 1
      ? '윗사람·멘토·문서나 자격을 챙겨주는 어른형 조력자'
      : bigeop >= 2
        ? '실무로 같이 뛰는 동료형 — 단, 돈·역할 기준 없는 동료는 같이 새게 만드는 쪽'
        : jae >= 1.5
          ? '거래·계약으로 엮이는 사람 — 숫자를 명확히 하는 상대일 때만 득'
          : '감정 응원형보다 숫자·계약·일정을 같이 잡아주는 실무형 소수';
    seeds.push({
      question: '나에게 귀인은 어떤 사람인가? 피해야 할 사람은 누구인가?', verdictType: 'noble',
      strength: nobleStar ? 'moderate' : 'weak',
      timing: '',
      basisSignals: [
        nobleStar ? '사람·소개·계약을 통해 막힌 일이 풀리는 결(천을귀인류 신살) — 귀인운 강함' : '두드러진 귀인 신살은 없음 — 화려한 인맥이 아니라 실무로 받쳐주는 소수가 귀인',
        `이 사주에서 운을 여는 사람 유형: ${helperType}`,
        '명리 용어를 노출하지 말고 "어떤 사람"인지로만 풀 것 (없는 귀인을 억지로 과장 금지)',
      ],
      allowedClaims: [
        nobleStar ? '귀인운이 강한 편 — 결정적 순간에 사람·소개·계약으로 막힌 일이 풀린다' : '귀인운이 요란하진 않지만, 운을 여는 사람은 감정적으로 응원만 하는 사람이 아니라 숫자·계약·일정·문서를 같이 잡아주는 사람',
        '피해야 할 사람 = 기준 없이 부탁만 늘리는 사람 — 당신의 돈과 시간을 같이 새게 만든다',
        '★ 누가 판을 키워주고 누가 까먹게 하는지, 사람 고르는 기준을 1~2문단으로 구체화(천을귀인 유무와 무관하게 반드시 풀 것)',
      ],
    });
  }
  // 10) 문서·계약 리스크 (C) — 계약서·정산 기준·집 문서·가족 간 돈 (법률 조언 금지)
  {
    const docYear = (Array.isArray(fortune.nextThreeYears) ? fortune.nextThreeYears : [])
      .find((y: any) => (y.activatedTenGods ?? []).some((g: string) => ['정인', '편인'].includes(g)));
    seeds.push({
      question: '문서·계약에서 조심할 것은 무엇인가?', verdictType: 'document',
      strength: docSignal ? 'moderate' : 'weak',
      timing: docYear ? `${docYear.year}년 무렵 문서·자격 흐름` : '',
      basisSignals: [
        docSignal ? '문서·자격·계약 기운(인성)이 있음 — 종이로 남기는 일에서 운이 갈림' : '문서·계약은 두드러지지 않으나 큰 결정 때 한 번은 걸림',
        docYear ? `${docYear.year}년 무렵 문서·자격·배움 흐름이 올라옴` : '',
      ].filter(Boolean),
      allowedClaims: [
        '명리 용어 대신 생활 언어로: 계약서, 정산 기준, 가족 간 돈 문제, 집 관련 문서, 사인하기 전에 다시 봐야 하는 종이',
        '구두 약속·분위기로 넘기면 나중에 돈·관계가 새는 결 — 범위·금액·기한을 종이에 박아둘 때 실속',
        docYear ? `${docYear.year}년 문서·계약 흐름은 돈/사업 섹션 안에서라도 반드시 깊게 풀 것` : '문서·계약은 돈/사업 섹션 안에서라도 한 문단 이상 풀 것',
        '법률 자문을 대체하는 단정 금지 — 어떤 종이를 다시 봐야 하는지까지만',
      ],
    });
  }

  // 운 터지는 시기
  const breakthroughLines: string[] = [];
  if (cd?.theme || cd?.ageRange) breakthroughLines.push(`${cdAge}: ${cd?.theme ?? ''}`.trim());
  if (jaeStages.length) breakthroughLines.push(`재물이 강해지는 생애 단계: ${jaeStages.join('·')}`);
  if (before40) breakthroughLines.push('30대는 판을 까는 시기 / 40대 이후 깐 전문성·계약·소유가 자산으로 굵어지는 시기');
  if (gwanStages.length) breakthroughLines.push(`직장·책임이 강해지는 생애 단계: ${gwanStages.join('·')}`);
  const next3: any[] = Array.isArray(fortune.nextThreeYears) ? fortune.nextThreeYears : [];
  for (const y of next3.slice(0, 3)) {
    const tg = (y.activatedTenGods ?? []).map((g: string) => TG_LIFE[g] || g).slice(0, 2).join('·');
    if (y.year && tg) breakthroughLines.push(`${y.year}년: ${tg} 강해짐`);
  }

  const sectionPlan = buildPersonalSectionPlan({
    concerns, status, hasChildren,
    yeokma, noble: nobleStar, housingSignal, document: docSignal,
  });

  return {
    mode: 'personal',
    relationshipStatus: status,
    hasChildren,
    currentAge, ageBand, concerns, sectionPlan,
    coreLines: coreLinesFromPerson(gpt),
    seeds,
    breakthroughLines,
    auxiliaryLines: auxLines((gpt as any).yongsinDiagnostic),
    timingRule: '생애 단계(초/청/중/말년)는 사주 주(柱) 위치 기준, 연도는 계산된 세운만. 특정 월·날짜·자녀 수·출산일은 만들지 말 것.',
  };
}

// ============================================================
// 2) 올해운세 — 올해의 큰 결론 판정
// ============================================================
export function buildYearlyFortuneVerdictEvidence(
  analysis: YearlyFortuneAnalysis,
  relationshipStatus: RelationshipStatus = 'unknown',
  hasChildren: boolean | 'unknown' = 'unknown',
  rawConcerns: unknown = undefined,
  currentAge: number | null = null,
): FortuneVerdictEvidence {
  const carried: any = analysis.carriedOver ?? {};
  const ug: any = carried.usefulGod ?? {};
  const coreLines: string[] = [];
  if (ug.primaryUseful) coreLines.push(`용신: ${toKo(ug.primaryUseful.value)}`);
  const yee: any = analysis.yearElementEffect ?? {};
  const status = normStatus(relationshipStatus);

  const topics = new Set<string>();
  (analysis.remainingMonthlyFortunes ?? []).forEach((m: any) => (m.activatedTopics ?? []).forEach((t: string) => topics.add(t)));
  const has = (t: string) => topics.has(t);
  const seeds: VerdictSeed[] = [];
  seeds.push({ question: '올해 돈 흐름이 열리는가?', verdictType: 'wealth', strength: (has('돈') || has('계약')) ? 'moderate' : 'weak', timing: '올해', basisSignals: [(has('돈') || has('계약')) ? '올해 돈·계약 주제가 활성' : '돈보다 다른 주제가 강한 해'], allowedClaims: ['올해 돈 흐름 강/약 판정', '한 방보다 조건·정산·계약 정리에서 살아남'] });
  seeds.push({ question: '올해 이직·직장 변화가 있는가?', verdictType: 'job_change', strength: has('일') ? 'moderate' : 'weak', timing: '올해', basisSignals: [has('일') ? '올해 일·역할 주제가 활성' : '직장 변화는 두드러지지 않는 해'], allowedClaims: ['올해 직장 변화 강/약 판정'] });
  seeds.push({ question: '올해 이동수·계약·부동산이 움직이는가?', verdictType: 'move', strength: (has('계약') || has('이동')) ? 'moderate' : 'weak', timing: '올해', basisSignals: [(has('계약') || has('이동')) ? '올해 계약·이동 주제 활성' : '큰 이동은 약한 해'], allowedClaims: ['올해 이동·계약 강/약 판정'] });
  if (allowsNewRomance(status)) seeds.push({ question: '올해 인연·관계가 움직이는가?', verdictType: 'relationship', strength: (has('관계') || has('연애')) ? 'moderate' : 'weak', timing: '올해', basisSignals: [(has('관계') || has('연애')) ? '올해 관계·연애 주제 활성' : '관계는 잔잔한 해'], allowedClaims: ['올해 인연운 강/약 판정', '반드시 만난다 단정 금지'] });
  else seeds.push({ question: '올해 배우자·가족·집 문제가 움직이는가?', verdictType: 'family_spouse', strength: (has('가족') || has('계약')) ? 'moderate' : 'weak', timing: '올해', basisSignals: ['기혼 — 집안 돈·역할·생활 구조로 움직임'], allowedClaims: ['새 연애 금지'] });

  return {
    mode: 'yearly', relationshipStatus: status, hasChildren,
    currentAge, ageBand: ageBandOf(currentAge), concerns: normalizeConcerns(rawConcerns), sectionPlan: [],
    coreLines, seeds,
    breakthroughLines: [yee.label ? `올해 세운 작용: ${yee.label}` : ''].filter(Boolean),
    auxiliaryLines: [],
    timingRule: '올해 안의 큰 결론 중심(월별 잔조언 금지). 절기 구간/상·하반기까지만, 없는 날짜 생성 금지.',
  };
}

// ============================================================
// 3) 궁합 — 이 관계가 어디까지 갈 수 있는가 판정
// ============================================================
export function buildCompatFortuneVerdictEvidence(
  bundle: CompatibilityAnalysisBundle,
  personA: PersonalSajuGptInput,
  personB: PersonalSajuGptInput,
  relationshipType?: string,
): FortuneVerdictEvidence {
  const relationLines: string[] = [];
  const ec: any = bundle.elementComplement ?? {};
  if ((ec.aNeedsFromB ?? []).length) relationLines.push(`A는 ${(ec.aNeedsFromB as Element[]).map(e => ELEMENT_KO[e]).join('·')} 기운이 더해질 때 편안`);
  if ((ec.bNeedsFromA ?? []).length) relationLines.push(`B는 ${(ec.bNeedsFromA as Element[]).map(e => ELEMENT_KO[e]).join('·')} 기운이 더해질 때 편안`);
  const dmr: any = bundle.dayMasterRelation ?? {};
  if (dmr.description) relationLines.push(`일간 관계 결: ${dmr.description}`);
  const choices: any = bundle.relationshipChoices ?? {};
  for (const c of (choices.harmfulChoices ?? []).slice(0, 2)) if (c?.title) relationLines.push(`갈라지기 쉬운 결: ${c.title}`);

  const seeds: VerdictSeed[] = [
    { question: '이 관계가 결혼·동거·가족까지 갈 수 있는가?', verdictType: 'relationship', strength: 'moderate', timing: '', basisSignals: ['두 사람의 기운 보완/마찰 구조로 본 판정'], allowedClaims: ['오래가려면 무엇이 현실적으로 맞아야 하는지 판정', '동거·결혼은 거론·갈림으로(단정 금지)', '상대를 용신/기신으로 단정 금지'] },
    { question: '돈·생활·가족이 얽힐 때 어떤 문제가 생기는가?', verdictType: 'family_spouse', strength: 'moderate', timing: '', basisSignals: ['생활·돈·역할 분담에서 드러나는 결'], allowedClaims: ['책임 분담이 흐려질 때 한쪽이 소모되는 구조 등 판정'] },
  ];

  const aAge: number | null = typeof (personA as any).userContext?.age === 'number' ? (personA as any).userContext.age : null;
  return {
    mode: 'compat', relationshipStatus: relationshipType === 'married' ? 'married' : 'unknown', hasChildren: 'unknown',
    currentAge: aAge, ageBand: ageBandOf(aAge), concerns: [], sectionPlan: [],
    coreLines: relationLines, seeds, breakthroughLines: [], auxiliaryLines: [],
    timingRule: '관계는 연 단위까지만. 결혼/이별 확정 금지. 상대를 용신/기신/운명으로 단정 금지.',
    partner: { aLines: coreLinesFromPerson(personA), bLines: coreLinesFromPerson(personB), relationLines },
  };
}

// ============================================================
// 4) 임산부 — 자녀운/가족운 판정 (의료·출산 예측 금지)
// ============================================================
export function buildPregnancyFortuneVerdictEvidence(bundle: PregnancyAnalysisBundle): FortuneVerdictEvidence {
  const mother: PersonalSajuGptInput = (bundle as any).mother;
  const coreLines = mother ? coreLinesFromPerson(mother) : [];
  const seeds: VerdictSeed[] = [
    { question: '자녀·가족운은 어떤 그림인가?', verdictType: 'child', strength: 'moderate', timing: '', basisSignals: ['엄마 사주로 본 자녀·가족 책임의 결'], allowedClaims: ['자녀운 강/약, 한 아이 집중형/가족 책임형 등 그림 판정', '임신·출산·성별·건강·아이 수·출산일 예측 절대 금지'] },
    { question: '엄마가 떠안기 쉬운 구조와 가족 도움', verdictType: 'family_spouse', strength: 'moderate', timing: '', basisSignals: ['엄마가 혼자 떠안기 쉬운 구조 — 가족의 구체적 분담이 필요한 결'], allowedClaims: ['집안 준비·역할 분담을 누가 어디까지 질지 판정', '의료/출산 판단 대체 금지'] },
  ];
  const mAge: number | null = typeof (mother as any)?.userContext?.age === 'number' ? (mother as any).userContext.age : null;
  return {
    mode: 'pregnancy', relationshipStatus: 'unknown', hasChildren: 'unknown',
    currentAge: mAge, ageBand: ageBandOf(mAge), concerns: [], sectionPlan: [],
    coreLines, seeds, breakthroughLines: [], auxiliaryLines: auxLines((mother as any)?.yongsinDiagnostic),
    timingRule: '출산일·출산시간·성별·건강·아이 수·태아 운명 예측 절대 금지. 시기는 임신 초/중/후기 국면만. 의료 판단은 의료진 우선.',
  };
}
