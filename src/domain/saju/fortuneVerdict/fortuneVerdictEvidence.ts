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
  FortuneVerdictEvidence, VerdictSeed, VerdictStrength, RelationshipStatus,
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

  // 1) 재물운
  {
    let st = str3(jae);
    if (jaeUnfavorable && st === 'strong') st = 'moderate';
    const basis = [`돈 기운 비중 ${jae >= 3 ? '큼' : jae >= 1.5 ? '보통' : '약함'}`];
    if (jaeFavorable) basis.push('돈 기운이 사주에 도움이 되는 결(용신·희신)');
    else if (jaeUnfavorable) basis.push('돈 기운이 과하면 부담이 되는 결(기신) — 관리형');
    if (jaeStages.length) basis.push(`재물 흐름이 강해지는 생애 단계: ${jaeStages.join('·')}`);
    seeds.push({
      question: '돈복이 있는가?', verdictType: 'wealth', strength: st,
      timing: jaeStages.length ? jaeStages.join('·') : cdAge,
      basisSignals: basis,
      allowedClaims: [pyeonJae >= jeongJae ? '한 번에 크게보다 기회·거래로 움직이는 편' : '한 방보다 직책·소유·고정수입으로 늦게 크게 쌓이는 축적형', '돈복 강/약을 선명히 판정 가능'],
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
      allowedClaims: tradingType
        ? ['변동성을 감당하되 규모를 키우기 전 구조를 먼저 잡는 거래·사업형', '단타 몰빵보다 현금흐름 보이는 자산']
        : ['주식처럼 변동성 큰 승부보다 현금흐름·실물·고정수입 기반 축적이 맞다고 판정', '부동산/계약형/전문직 쪽이 더 맞음'],
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
    seeds.push({
      question: '독립·사업운이 있는가? 확장은 언제가 나은가?', verdictType: 'business', strength: biz,
      timing: expYear ? `${expYear.year}년 무렵` : (jaeStages[0] || ''),
      basisSignals: [(sikSang >= 1.5 && jae >= 1.5) ? '생산·표현 기운이 돈으로 이어지는 결(식상생재)' : '확장보다 구조·정비가 먼저인 결'],
      allowedClaims: ['초반 크게 벌리기보다 기준·시스템을 상품화하는 구조', '확장 시기 판정 가능(없는 연도 생성 금지)', '동업은 역할·돈 기준 먼저'],
    });
  }
  // 5) 이동수
  {
    const yeokma = hasStar(core, /역마/);
    seeds.push({
      question: '이사운·이동수가 있는가?', verdictType: 'move', strength: yeokma ? 'moderate' : 'not_prominent',
      timing: yeokma ? cdAge : '', basisSignals: [yeokma ? '이동·변화에서 운이 살아나는 결(역마)' : '한곳에 뿌리내리는 결이 더 강함'],
      allowedClaims: [yeokma ? '집·근무지·생활권 중 하나가 현실적으로 바뀌는 이동수' : '잦은 이동보다 정착형'],
    });
  }
  // 6) 부동산
  {
    const re: VerdictStrength = (jae >= 1.5 && insung >= 1) ? 'moderate' : 'weak';
    seeds.push({
      question: '부동산·큰 계약운이 있는가?', verdictType: 'real_estate', strength: re,
      timing: '', basisSignals: ['돈 기운 + 문서·계약 기운의 조합으로 본 판정'],
      allowedClaims: ['빠르게 잡는 운이 아니라 대출·보증금·계약 기간·가족 동선을 따질 때 실속', '분위기에 밀려 급하게 결정하면 부담'],
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
        allowedClaims: ['집안의 돈·역할·책임을 누가 어디까지 질지 다시 정하는 흐름', '새 연애 인연 절대 금지'],
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

  // 운 터지는 시기
  const breakthroughLines: string[] = [];
  if (cd?.theme || cd?.ageRange) breakthroughLines.push(`${cdAge}: ${cd?.theme ?? ''}`.trim());
  if (jaeStages.length) breakthroughLines.push(`재물이 강해지는 생애 단계: ${jaeStages.join('·')}`);
  if (gwanStages.length) breakthroughLines.push(`직장·책임이 강해지는 생애 단계: ${gwanStages.join('·')}`);
  const next3: any[] = Array.isArray(fortune.nextThreeYears) ? fortune.nextThreeYears : [];
  for (const y of next3.slice(0, 3)) {
    const tg = (y.activatedTenGods ?? []).map((g: string) => TG_LIFE[g] || g).slice(0, 2).join('·');
    if (y.year && tg) breakthroughLines.push(`${y.year}년: ${tg} 강해짐`);
  }

  return {
    mode: 'personal',
    relationshipStatus: status,
    hasChildren,
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

  return {
    mode: 'compat', relationshipStatus: relationshipType === 'married' ? 'married' : 'unknown', hasChildren: 'unknown',
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
  return {
    mode: 'pregnancy', relationshipStatus: 'unknown', hasChildren: 'unknown',
    coreLines, seeds, breakthroughLines: [], auxiliaryLines: auxLines((mother as any)?.yongsinDiagnostic),
    timingRule: '출산일·출산시간·성별·건강·아이 수·태아 운명 예측 절대 금지. 시기는 임신 초/중/후기 국면만. 의료 판단은 의료진 우선.',
  };
}
