/**
 * 궁합 분석기 — 두 사주를 받아 결정론적으로 분석하고 관계 정의를 매칭한다.
 *
 * 흐름:
 *   buildPersonProfile(각 사주) → buildCompatContext(두 프로파일) →
 *   selectMain/SpicyRelationships → buildPromptBlock
 *
 * AI는 이 결과를 받아 해석/문장만 입힌다.
 */

import {
  SajuResult, OH_CG, OH_JJ, CG, JJ,
  calcSipsung, calcShinsal, get12Unsung, getOhCount,
} from './saju-calc';
import { analyzeAdvanced, type AdvancedAnalysis } from './gyeokguk-johoo';
import { analyzeBranchRelations, type BranchRelationsResult } from './branch-relations';
import {
  selectMainRelationships, selectSpicyRelationships,
  type RelationshipMatch,
} from './compatibility-relationship-pool';

// ============================================================
// 룩업 테이블
// ============================================================
const CHEONGAN_HAP_KEYS = new Set(['0-5', '1-6', '2-7', '3-8', '4-9']);
const YUKHAP_PAIRS: Array<[number, number]> = [[0,1],[2,11],[3,10],[4,9],[5,8],[6,7]];
const SAMHAP_SETS: Array<[number, number, number]> = [[8,0,4],[2,6,10],[5,9,1],[11,3,7]];
const BANHAP_PAIRS: Array<[number, number]> = [
  [8,0],[0,4],[2,6],[6,10],[5,9],[9,1],[11,3],[3,7],
];
const BANGHAP_SETS: Array<[number, number, number]> = [[2,3,4],[5,6,7],[8,9,10],[11,0,1]];
const CHUNG_PAIRS: Array<[number, number]> = [[0,6],[1,7],[2,8],[3,9],[4,10],[5,11]];
const SAMHYUNG_SETS: Array<[number, number, number]> = [[2,5,8],[1,10,7]];
const SANGHYUNG_PAIR: [number, number] = [0, 3];
const JAHYUNG_BRANCHES: number[] = [4, 6, 9, 11];
const PA_PAIRS: Array<[number, number]> = [[0,9],[1,4],[2,11],[3,6],[5,8],[7,10]];
const HAE_PAIRS: Array<[number, number]> = [[0,7],[1,6],[2,5],[3,4],[8,11],[9,10]];
const WONJIN_PAIRS: Array<[number, number]> = [[0,7],[1,6],[2,9],[3,8],[4,11],[5,10]];
const GUIMUN_PAIRS: Array<[number, number]> = [[2,5],[3,4],[8,11],[9,10]];

const CHEONEUL_MAP: Record<number, number[]> = {
  0: [1, 7], 1: [0, 8], 2: [11, 9], 3: [11, 9], 4: [1, 7],
  5: [1, 7], 6: [2, 6], 7: [2, 6], 8: [3, 5], 9: [3, 5],
};

const OH_SAENG: Record<string, string> = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
const OH_GEUK: Record<string, string> = { '목': '토', '화': '금', '토': '수', '금': '목', '수': '화' };

function pairInSet(a: number, b: number, set: Array<[number, number]>): boolean {
  for (const [x, y] of set) {
    if ((a === x && b === y) || (a === y && b === x)) return true;
  }
  return false;
}
function setContainsBoth(a: number, b: number, sets: Array<[number, number, number]>): boolean {
  for (const set of sets) {
    if (set.includes(a) && set.includes(b) && a !== b) return true;
  }
  return false;
}

// ============================================================
// 타입
// ============================================================
export type RelationType = 'love' | 'marriage' | 'friendship' | 'colleague' | 'reunion' | 'crush';

export const REL_TYPE_BY_IDX: Record<number, RelationType> = {
  0: 'love', 1: 'marriage', 2: 'friendship', 3: 'colleague', 4: 'reunion', 5: 'crush',
};

export interface CompatPersonProfile {
  name: string;
  gender: 'm' | 'f';
  age: number;
  saju: SajuResult;
  ohCount: Record<string, number>;
  advanced: AdvancedAnalysis;
  branchRelations: BranchRelationsResult;
  shinsal: string[];
  unsung: Record<string, string>;
  dayOh: string;
  dayPolarity: 'yang' | 'yin';
}

export interface CompatContext {
  p1: CompatPersonProfile;
  p2: CompatPersonProfile;
  relationType: RelationType;

  // 일간 관계
  cheonganHap: boolean;
  dayOhSameElement: boolean;
  daySaeng12: boolean;
  daySaeng21: boolean;
  dayGeuk12: boolean;
  dayGeuk21: boolean;
  daySipsung12: string;
  daySipsung21: string;

  // 일지 관계
  yukHap: boolean;
  samHap: boolean;
  bangHap: boolean;
  banHap: boolean;
  chung: boolean;
  hyung: boolean;
  hyungType: '삼형' | '상형' | '자형' | null;
  pa: boolean;
  hae: boolean;
  wonjin: boolean;
  guimun: boolean;

  // 오행
  combinedOh: Record<string, number>;
  ohComplementScore: number;
  ohOverlapScore: number;
  ohBalanceScore: number;

  // 조후
  johooMatch: 'complementary' | 'same' | 'neutral';

  // 용신
  p1HasP2Yongsin: boolean;
  p2HasP1Yongsin: boolean;
  mutualYongsin: boolean;

  // 신살
  sharedShinsal: string[];
  bothDohwa: boolean;
  bothYangin: boolean;

  // 천을귀인 상호
  p1IsCheoneulForP2: boolean;
  p2IsCheoneulForP1: boolean;

  // 음양·신강·격국
  yinYangBalance: 'balanced' | 'allYang' | 'allYin';
  strengthMatch: 'similar' | 'contrast';
  bothSameGyeokguk: boolean;
}

export interface CompatAnalysisResult {
  ctx: CompatContext;
  mainRelationships: RelationshipMatch[];
  spicyRelationships: RelationshipMatch[];
  promptBlock: string;
  /** UI 카드 표시용 — 점수 자리 대체 */
  summaryCards: SummaryCard[];
}

export interface SummaryCard {
  category: string;
  title: string;
  emoji: string;
  tagline: string;
  reasons: string[];
  isSpicy?: boolean;
}

// ============================================================
// 프로파일 빌드
// ============================================================
export function buildPersonProfile(
  name: string,
  gender: 'm' | 'f',
  age: number,
  saju: SajuResult,
): CompatPersonProfile {
  const ohCount = getOhCount(saju);
  const advanced = analyzeAdvanced(saju, ohCount);
  const branchRelations = analyzeBranchRelations(saju);
  const shinsal = calcShinsal(saju);
  const unsung = get12Unsung(saju);
  const dayOh = OH_CG[saju.dStem];
  const dayPolarity: 'yang' | 'yin' = saju.dStem % 2 === 0 ? 'yang' : 'yin';
  return {
    name, gender, age, saju, ohCount,
    advanced, branchRelations, shinsal, unsung,
    dayOh, dayPolarity,
  };
}

// ============================================================
// 컨텍스트 빌드
// ============================================================
export function buildCompatContext(
  p1: CompatPersonProfile,
  p2: CompatPersonProfile,
  relationType: RelationType,
): CompatContext {
  const a = p1.saju.dStem;
  const b = p2.saju.dStem;
  const aB = p1.saju.dBranch;
  const bB = p2.saju.dBranch;
  const aOh = OH_CG[a];
  const bOh = OH_CG[b];

  // 일간 관계
  const stemKey = `${Math.min(a, b)}-${Math.max(a, b)}`;
  const cheonganHap = CHEONGAN_HAP_KEYS.has(stemKey);
  const dayOhSameElement = aOh === bOh;
  const daySaeng12 = OH_SAENG[aOh] === bOh;
  const daySaeng21 = OH_SAENG[bOh] === aOh;
  const dayGeuk12 = OH_GEUK[aOh] === bOh;
  const dayGeuk21 = OH_GEUK[bOh] === aOh;
  const daySipsung12 = calcSipsung(a, b);
  const daySipsung21 = calcSipsung(b, a);

  // 일지 관계
  const yukHap = pairInSet(aB, bB, YUKHAP_PAIRS);
  const samHap = setContainsBoth(aB, bB, SAMHAP_SETS);
  const bangHap = setContainsBoth(aB, bB, BANGHAP_SETS);
  const banHap = pairInSet(aB, bB, BANHAP_PAIRS) && !samHap;
  const chung = pairInSet(aB, bB, CHUNG_PAIRS);
  const samHyung = setContainsBoth(aB, bB, SAMHYUNG_SETS);
  const sangHyung = (aB === SANGHYUNG_PAIR[0] && bB === SANGHYUNG_PAIR[1]) ||
                    (aB === SANGHYUNG_PAIR[1] && bB === SANGHYUNG_PAIR[0]);
  const jaHyung = aB === bB && JAHYUNG_BRANCHES.includes(aB);
  const hyung = samHyung || sangHyung || jaHyung;
  const hyungType: CompatContext['hyungType'] =
    samHyung ? '삼형' : sangHyung ? '상형' : jaHyung ? '자형' : null;
  const pa = pairInSet(aB, bB, PA_PAIRS);
  const hae = pairInSet(aB, bB, HAE_PAIRS);
  const wonjin = pairInSet(aB, bB, WONJIN_PAIRS);
  const guimun = pairInSet(aB, bB, GUIMUN_PAIRS);

  // 오행 합산
  const combinedOh: Record<string, number> = { 목: 0, 화: 0, 토: 0, 금: 0, 수: 0 };
  for (const k of Object.keys(combinedOh)) {
    combinedOh[k] = (p1.ohCount[k] || 0) + (p2.ohCount[k] || 0);
  }

  // 보완 점수
  const p1Needs = p1.advanced.johoo.needed;
  const p2Needs = p2.advanced.johoo.needed;
  let complementRaw = 0;
  for (const need of p1Needs) complementRaw += Math.min(p2.ohCount[need] || 0, 3);
  for (const need of p2Needs) complementRaw += Math.min(p1.ohCount[need] || 0, 3);
  const ohComplementScore = Math.min(complementRaw, 10);

  // 중복(과다) 점수
  let overlapRaw = 0;
  for (const k of Object.keys(combinedOh)) {
    const a1 = p1.ohCount[k] || 0;
    const a2 = p2.ohCount[k] || 0;
    if (a1 >= 3 && a2 >= 3) overlapRaw += 4;
    else if (a1 >= 2 && a2 >= 2) overlapRaw += 2;
  }
  const ohOverlapScore = Math.min(overlapRaw, 10);

  // 합산 균형
  const vals = Object.values(combinedOh);
  const max = Math.max(...vals);
  const min = Math.min(...vals);
  const ohBalanceScore = Math.max(0, 10 - (max - min));

  // 조후 매칭
  const j1 = p1.advanced.johoo.type;
  const j2 = p2.advanced.johoo.type;
  let johooMatch: CompatContext['johooMatch'] = 'neutral';
  if ((j1 === '조열' && j2 === '한랭') || (j1 === '한랭' && j2 === '조열')) johooMatch = 'complementary';
  else if (j1 === j2 && j1 !== '평윤') johooMatch = 'same';

  // 용신 매칭
  function hasOhIn(saju: SajuResult, target: string): number {
    let n = 0;
    const stems = [saju.yStem, saju.mStem, saju.dStem, saju.hStem].filter(x => x >= 0);
    const branches = [saju.yBranch, saju.mBranch, saju.dBranch, saju.hBranch].filter(x => x >= 0);
    for (const s of stems) if (OH_CG[s] === target) n++;
    for (const br of branches) if (OH_JJ[br] === target) n++;
    return n;
  }
  const p1HasP2Yongsin = p2Needs.length > 0 && p2Needs.some(y => hasOhIn(p1.saju, y) >= 1);
  const p2HasP1Yongsin = p1Needs.length > 0 && p1Needs.some(y => hasOhIn(p2.saju, y) >= 1);
  const mutualYongsin = p1HasP2Yongsin && p2HasP1Yongsin;

  // 신살
  const sharedShinsal = p1.shinsal.filter(s => p2.shinsal.includes(s));
  const bothDohwa = p1.shinsal.includes('도화살') && p2.shinsal.includes('도화살');
  const bothYangin = p1.shinsal.includes('양인살') && p2.shinsal.includes('양인살');

  // 천을귀인 상호 — p1의 일지가 p2의 천을귀인 위치에 있는지
  const p1Cheoneul = CHEONEUL_MAP[a] || [];
  const p2Cheoneul = CHEONEUL_MAP[b] || [];
  const p1Branches = [p1.saju.yBranch, p1.saju.mBranch, p1.saju.dBranch, p1.saju.hBranch].filter(x => x >= 0);
  const p2Branches = [p2.saju.yBranch, p2.saju.mBranch, p2.saju.dBranch, p2.saju.hBranch].filter(x => x >= 0);
  const p1IsCheoneulForP2 = p2Cheoneul.some(t => p1Branches.includes(t));
  const p2IsCheoneulForP1 = p1Cheoneul.some(t => p2Branches.includes(t));

  // 음양
  const yangCount = [p1.saju, p2.saju].reduce((acc, sj) => {
    const stems = [sj.yStem, sj.mStem, sj.dStem, sj.hStem].filter(x => x >= 0);
    return acc + stems.filter(x => x % 2 === 0).length;
  }, 0);
  const yinCount = [p1.saju, p2.saju].reduce((acc, sj) => {
    const stems = [sj.yStem, sj.mStem, sj.dStem, sj.hStem].filter(x => x >= 0);
    return acc + stems.filter(x => x % 2 === 1).length;
  }, 0);
  let yinYangBalance: CompatContext['yinYangBalance'] = 'balanced';
  if (yinCount === 0 || yangCount >= yinCount * 2) yinYangBalance = 'allYang';
  else if (yangCount === 0 || yinCount >= yangCount * 2) yinYangBalance = 'allYin';

  // 신강신약 매칭
  const strengthMatch: 'similar' | 'contrast' =
    p1.advanced.strength.isStrong === p2.advanced.strength.isStrong ? 'similar' : 'contrast';

  // 격국
  const bothSameGyeokguk = p1.advanced.gyeokguk.primary === p2.advanced.gyeokguk.primary;

  return {
    p1, p2, relationType,
    cheonganHap, dayOhSameElement,
    daySaeng12, daySaeng21, dayGeuk12, dayGeuk21,
    daySipsung12, daySipsung21,
    yukHap, samHap, bangHap, banHap,
    chung, hyung, hyungType,
    pa, hae, wonjin, guimun,
    combinedOh, ohComplementScore, ohOverlapScore, ohBalanceScore,
    johooMatch,
    p1HasP2Yongsin, p2HasP1Yongsin, mutualYongsin,
    sharedShinsal, bothDohwa, bothYangin,
    p1IsCheoneulForP2, p2IsCheoneulForP1,
    yinYangBalance, strengthMatch, bothSameGyeokguk,
  };
}

// ============================================================
// 통합 분석
// ============================================================
export function analyzeCompatibility(
  p1: CompatPersonProfile,
  p2: CompatPersonProfile,
  relationType: RelationType,
): CompatAnalysisResult {
  const ctx = buildCompatContext(p1, p2, relationType);
  const mainRelationships = selectMainRelationships(ctx, 1);
  const spicyRelationships = selectSpicyRelationships(ctx, 2);

  // 메인 1개만 UI 카드(히어로)로. 매콤은 본문 매콤 섹션에서만 활용.
  const summaryCards: SummaryCard[] = mainRelationships.map(m => ({
    category: m.relationship.category,
    title: m.relationship.title,
    emoji: m.relationship.emoji,
    tagline: m.relationship.tagline,
    reasons: m.matchReasons,
  }));

  const promptBlock = buildPromptBlock(ctx, mainRelationships, spicyRelationships);
  return { ctx, mainRelationships, spicyRelationships, promptBlock, summaryCards };
}

// ============================================================
// 프롬프트 블록
// ============================================================
function buildPromptBlock(
  ctx: CompatContext,
  main: RelationshipMatch[],
  spicy: RelationshipMatch[],
): string {
  const lines: string[] = [];
  lines.push('=== 두 사주 관계 사전 계산 (시스템 결정론 — 해석의 토대로 활용) ===');

  // 1. 핵심 관계 정의
  lines.push('');
  lines.push('★ 메인 관계 정의 (상위 매칭 — 본문 #1 "관계의 정의" 섹션의 핵심 비유로 활용):');
  if (main.length === 0) {
    lines.push('  (특수 관계 신호 없음 → 평이한 케미로 해석)');
  } else {
    main.forEach((m, i) => {
      lines.push(`  ${i + 1}. [${m.relationship.category}] ${m.relationship.title}`);
      lines.push(`     - 한 줄: ${m.relationship.tagline}`);
      lines.push(`     - 시드 설명: ${m.relationship.description}`);
      if (m.matchReasons.length > 0) {
        lines.push(`     - 매칭 근거: ${m.matchReasons.join(' / ')}`);
      }
    });
  }

  // 2. 매콤 관계 정의 (남녀관계만)
  if (spicy.length > 0) {
    lines.push('');
    lines.push('🌶️ 매콤 관계 정의 (남녀관계 전용 — "끌리는 진짜 이유/위험한 매력/다시 불붙이는 법" 섹션의 핵심으로):');
    spicy.forEach((m, i) => {
      lines.push(`  ${i + 1}. [매콤] ${m.relationship.title}`);
      lines.push(`     - 한 줄: ${m.relationship.tagline}`);
      lines.push(`     - 시드 설명: ${m.relationship.description}`);
      if (m.matchReasons.length > 0) {
        lines.push(`     - 매칭 근거: ${m.matchReasons.join(' / ')}`);
      }
    });
  }

  // 3. 일간 관계
  lines.push('');
  lines.push(`일간 관계: ${CG[ctx.p1.saju.dStem]}(${OH_CG[ctx.p1.saju.dStem]}) vs ${CG[ctx.p2.saju.dStem]}(${OH_CG[ctx.p2.saju.dStem]})`);
  const dayRels: string[] = [];
  if (ctx.cheonganHap) dayRels.push('천간합!');
  if (ctx.dayOhSameElement) dayRels.push('같은 오행(비화)');
  if (ctx.daySaeng12) dayRels.push(`${ctx.p1.name}→${ctx.p2.name} 생(돌봄)`);
  if (ctx.daySaeng21) dayRels.push(`${ctx.p2.name}→${ctx.p1.name} 생(받음)`);
  if (ctx.dayGeuk12) dayRels.push(`${ctx.p1.name}→${ctx.p2.name} 극(관리/압박)`);
  if (ctx.dayGeuk21) dayRels.push(`${ctx.p2.name}→${ctx.p1.name} 극(압박받음)`);
  lines.push(`  → ${dayRels.join(' / ') || '특수 관계 없음'}`);
  lines.push(`  → ${ctx.p1.name}이 ${ctx.p2.name} 일간을 보는 십성: ${ctx.daySipsung12}`);
  lines.push(`  → ${ctx.p2.name}이 ${ctx.p1.name} 일간을 보는 십성: ${ctx.daySipsung21}`);

  // 4. 일지 관계
  lines.push('');
  lines.push(`일지 관계 (배우자궁/내면): ${JJ[ctx.p1.saju.dBranch]} vs ${JJ[ctx.p2.saju.dBranch]}`);
  const branchRels: string[] = [];
  if (ctx.yukHap) branchRels.push('육합(깊은 정)');
  if (ctx.samHap) branchRels.push('삼합 일부(큰 기운 형성)');
  if (ctx.bangHap) branchRels.push('방합 일부(같은 방향)');
  if (ctx.banHap) branchRels.push('반합(오행 응집)');
  if (ctx.chung) branchRels.push('충!(변화/충돌)');
  if (ctx.hyung) branchRels.push(`형/${ctx.hyungType ?? ''}(스트레스/구설)`);
  if (ctx.pa) branchRels.push('파(균열 요소)');
  if (ctx.hae) branchRels.push('해(은근한 방해)');
  if (ctx.wonjin) branchRels.push('원진(미운정/애증)');
  if (ctx.guimun) branchRels.push('귀문관(정신적 얽힘)');
  lines.push(`  → ${branchRels.join(' / ') || '중립'}`);

  // 5. 오행 보완
  lines.push('');
  lines.push(`오행 합산: 목${ctx.combinedOh['목']} 화${ctx.combinedOh['화']} 토${ctx.combinedOh['토']} 금${ctx.combinedOh['금']} 수${ctx.combinedOh['수']}`);
  lines.push(`  → 보완 점수 ${ctx.ohComplementScore.toFixed(1)}/10 (상대가 내 부족 오행을 채우는 정도)`);
  lines.push(`  → 중복 위험 ${ctx.ohOverlapScore.toFixed(1)}/10 (같은 오행 과다 폭주)`);
  lines.push(`  → 합산 균형 ${ctx.ohBalanceScore.toFixed(1)}/10 (오행 분포 평탄도)`);

  // 6. 조후
  lines.push('');
  lines.push(`조후: ${ctx.p1.name}=${ctx.p1.advanced.johoo.type} / ${ctx.p2.name}=${ctx.p2.advanced.johoo.type}`);
  const johooLabel = ctx.johooMatch === 'complementary' ? '서로 보완! 한쪽 뜨겁고 한쪽 차가워 균형'
                   : ctx.johooMatch === 'same' ? '같은 조후 (공통 약점 — 같은 보완 필요)'
                   : '평이';
  lines.push(`  → ${johooLabel}`);

  // 7. 용신
  lines.push('');
  lines.push('용신 매칭:');
  lines.push(`  → ${ctx.p1.name} 용신(${ctx.p1.advanced.johoo.needed.join('·') || '평이'})이 ${ctx.p2.name} 사주에: ${ctx.p2HasP1Yongsin ? '있음 ✓' : '없음'}`);
  lines.push(`  → ${ctx.p2.name} 용신(${ctx.p2.advanced.johoo.needed.join('·') || '평이'})이 ${ctx.p1.name} 사주에: ${ctx.p1HasP2Yongsin ? '있음 ✓' : '없음'}`);
  if (ctx.mutualYongsin) lines.push('  → ★ 양방향 용신 매칭! 서로의 보약 같은 관계');

  // 8. 신살
  lines.push('');
  lines.push(`${ctx.p1.name} 신살: ${ctx.p1.shinsal.join(', ') || '없음'}`);
  lines.push(`${ctx.p2.name} 신살: ${ctx.p2.shinsal.join(', ') || '없음'}`);
  if (ctx.sharedShinsal.length > 0) lines.push(`  → 공통 신살: ${ctx.sharedShinsal.join(', ')} (같은 에너지로 공명)`);
  if (ctx.bothDohwa) lines.push('  → ⚠ 둘 다 도화살: 매력 폭발 + 외부 유혹에 함께 노출');
  if (ctx.bothYangin) lines.push('  → ⚠ 둘 다 양인살: 강대강 충돌 위험');

  // 9. 천을귀인 상호
  if (ctx.p1IsCheoneulForP2 || ctx.p2IsCheoneulForP1) {
    lines.push('');
    lines.push('★ 천을귀인 상호:');
    if (ctx.p1IsCheoneulForP2) lines.push(`  → ${ctx.p1.name}은 ${ctx.p2.name}에게 천을귀인 (귀한 도움 주는 인연)`);
    if (ctx.p2IsCheoneulForP1) lines.push(`  → ${ctx.p2.name}은 ${ctx.p1.name}에게 천을귀인`);
  }

  // 10. 음양·강도·격국
  lines.push('');
  lines.push(`음양 균형: ${ctx.yinYangBalance === 'balanced' ? '균형'
    : ctx.yinYangBalance === 'allYang' ? '양 편중(활동성↑ 휴식↓)'
    : '음 편중(내성·안정 but 외향성 부족)'}`);
  lines.push(`신강신약: ${ctx.p1.name}=${ctx.p1.advanced.strength.label} / ${ctx.p2.name}=${ctx.p2.advanced.strength.label} (${ctx.strengthMatch === 'similar' ? '비슷' : '대조'})`);
  lines.push(`격국: ${ctx.p1.name}=${ctx.p1.advanced.gyeokguk.primary} / ${ctx.p2.name}=${ctx.p2.advanced.gyeokguk.primary}${ctx.bothSameGyeokguk ? ' (동일!)' : ''}`);

  lines.push('');
  lines.push('⚠️ 위 결과는 결정론적 계산값. 임의로 바꾸지 말고 이 토대 위에 해석을 입힐 것.');
  lines.push('⚠️ 본문에서는 "점수"가 아닌 "관계 정의(예: 운명의 자석같은 관계)"로 표현. 상위 매칭 관계 정의를 본문 핵심 비유로 활용.');

  return lines.join('\n');
}
