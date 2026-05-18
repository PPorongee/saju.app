/**
 * 궁합 관계 정의 풀 (40종)
 *
 * 두 사람의 사주 분석 결과(CompatContext)에 따라 점수를 매겨
 * 상위 1~3개의 "관계 정의"를 자동 매칭한다.
 * 점수가 0이면 부적합으로 제외된다.
 *
 * 카테고리:
 *   운명형 - 천간합·일지합 등 끌림 구조
 *   보완형 - 오행/조후/용신 보완
 *   역할형 - 일방적 생/극 (돌봄·관리)
 *   도전형 - 경쟁/단련 (성장 동력)
 *   다이내믹형 - 충/극단 (격렬한 흔들림)
 *   안정형 - 잔잔한 동행
 *   주의형 - 손상/마찰 신호 (부드럽게 경고)
 *   성장형 - 시간이 지날수록 깊어짐
 *   매콤형 - 도화·홍염·일지합·편관 (남녀관계 전용)
 */

import type { CompatContext } from './compatibility-analyzer';
import { CG, JJ } from './saju-calc';

export type RelationshipCategory =
  | '운명형' | '보완형' | '역할형' | '도전형'
  | '다이내믹형' | '안정형' | '주의형' | '성장형' | '매콤형';

export interface Relationship {
  id: string;
  category: RelationshipCategory;
  title: string;
  tagline: string;
  description: string;
  match: (ctx: CompatContext) => { score: number; reasons: string[] };
  applicableTo?: Array<CompatContext['relationType']>;
}

export interface RelationshipMatch {
  relationship: Relationship;
  score: number;
  matchReasons: string[];
}

const ROMANTIC: Array<CompatContext['relationType']> = ['love', 'marriage', 'crush', 'reunion'];
const NON_ROMANTIC: Array<CompatContext['relationType']> = ['friendship', 'colleague'];

function dayPair(ctx: CompatContext): string {
  return `${CG[ctx.p1.saju.dStem]}+${CG[ctx.p2.saju.dStem]}`;
}
function branchPair(ctx: CompatContext): string {
  return `${JJ[ctx.p1.saju.dBranch]}+${JJ[ctx.p2.saju.dBranch]}`;
}

export const RELATIONSHIP_POOL: Relationship[] = [
  // ============================================================
  // 운명형 (5)
  // ============================================================
  {
    id: 'fate-magnet',
    category: '운명형',
    title: '운명의 자석같은 관계',
    tagline: '천간과 지지가 동시에 끌어당기는 사주적 운명',
    description: '두 사람의 일간이 천간합을 이루고 일지까지 합·반합으로 묶여있어, 우연한 만남도 운명처럼 느껴지는 구조. 한 번 마주치면 잊기 어렵고, 떨어져 있어도 끌려오게 되는 흡인력.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.cheonganHap) { s += 6; r.push(`천간합 ${dayPair(ctx)}`); }
      if (ctx.yukHap) { s += 3; r.push(`일지 육합 ${branchPair(ctx)}`); }
      if (ctx.samHap) { s += 2; r.push('일지 삼합 일부'); }
      if (ctx.banHap) { s += 1.5; r.push('일지 반합'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'past-life',
    category: '운명형',
    title: '전생 인연같은 관계',
    tagline: '처음 만났는데도 오래 알았던 것 같은 사이',
    description: '일간 천간합 또는 일지 육합으로 묶여있어 처음 봐도 익숙하고 편안한 친밀감. 말 없이도 통하는 코드가 있고, 거리를 빨리 좁히는 인연.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.cheonganHap) { s += 4; r.push(`천간합 ${dayPair(ctx)}`); }
      if (ctx.yukHap) { s += 4; r.push(`일지 육합 ${branchPair(ctx)}`); }
      if (!ctx.cheonganHap && ctx.dayOhSameElement) { s += 1; r.push('일간 동일 오행'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'fortune-bringer',
    category: '운명형',
    title: '서로 복을 불러들이는 관계',
    tagline: '곁에 있으면 운이 풀리는 보약 같은 인연',
    description: '서로의 용신 오행을 상대가 풍부하게 가지고 있어, 함께 있으면 사주의 부족분이 자연 보충되는 구조. 만난 후로 일이 풀리거나 건강이 좋아지는 사례가 많은 인연.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.mutualYongsin) { s += 6; r.push('양방향 용신 매칭'); }
      else if (ctx.p1HasP2Yongsin || ctx.p2HasP1Yongsin) { s += 3; r.push('한쪽 용신 매칭'); }
      if (ctx.p1IsCheoneulForP2 || ctx.p2IsCheoneulForP1) { s += 2; r.push('천을귀인 상호'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'star-and-moon',
    category: '운명형',
    title: '별과 달같은 관계',
    tagline: '서로 비추며 서로를 빛나게 하는 깊은 정',
    description: '일지 육합으로 묶여 정이 깊고 떨어지기 어려운 인연. 격렬한 끌림보다는 잔잔하고 지속적인 끌어당김.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.yukHap) { s += 5; r.push(`일지 육합 ${branchPair(ctx)}`); }
      if (ctx.johooMatch === 'complementary') { s += 1.5; r.push('조후 보완'); }
      return { score: s, reasons: r };
    },
  },

  {
    id: 'zodiac-pair',
    category: '운명형',
    title: '별자리 짝꿍같은 관계',
    tagline: '같은 별자리 아래 묶인 사주적 동행',
    description: '일지가 삼합·방합으로 묶여 같은 흐름을 타는 인연. 따로 살았어도 비슷한 시기에 비슷한 일을 겪었을 가능성이 높고, 함께하면 그 흐름이 두 배로 강해지는 구조.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.samHap) { s += 4; r.push('일지 삼합'); }
      if (ctx.bangHap) { s += 3.5; r.push('일지 방합'); }
      if (ctx.banHap) { s += 2; r.push('일지 반합'); }
      return { score: s, reasons: r };
    },
  },

  // ============================================================
  // 보완형 (5)
  // ============================================================
  {
    id: 'puzzle-piece',
    category: '보완형',
    title: '퍼즐 조각같은 관계',
    tagline: '한쪽의 빈자리에 다른 쪽이 정확히 맞물려 들어가',
    description: '서로의 부족한 오행을 정확히 채워주는 구조. 혼자선 안 풀리던 일이 함께 있으면 풀리고, 약점이 가려지고 강점이 두 배가 되는 시너지.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.ohComplementScore >= 6) { s += 5; r.push(`오행 보완 ${ctx.ohComplementScore.toFixed(1)}`); }
      else if (ctx.ohComplementScore >= 4) { s += 3; r.push(`오행 보완 ${ctx.ohComplementScore.toFixed(1)}`); }
      if (ctx.ohBalanceScore >= 7) { s += 2; r.push('합산 균형 우수'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'sunlight-and-rain',
    category: '보완형',
    title: '햇빛과 비같은 관계',
    tagline: '한쪽이 뜨거우면 한쪽이 식혀주는 자연 균형',
    description: '한 사람은 조열(뜨거움)하고 다른 한 사람은 한랭(차가움)해서 서로의 조후를 맞춰주는 구조. 함께 있을 때 균형이 잡혀 마음이 편안해짐.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.johooMatch === 'complementary') { s += 6; r.push(`조후 보완 ${ctx.p1.advanced.johoo.type}+${ctx.p2.advanced.johoo.type}`); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'left-right-brain',
    category: '보완형',
    title: '좌뇌와 우뇌같은 관계',
    tagline: '이성과 감성이 합쳐져 완성되는 한 사람',
    description: '음양과 십성이 정반대로 배치돼 한쪽이 분석/판단을, 한쪽이 직관/표현을 맡는 구조. 따로 보면 부족하지만 합치면 완전한 한 명이 됨.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.yinYangBalance === 'balanced' && ctx.strengthMatch === 'contrast') { s += 4; r.push('음양 균형 + 강도 대조'); }
      else if (ctx.strengthMatch === 'contrast') { s += 2.5; r.push('신강신약 대조'); }
      if (ctx.ohComplementScore >= 4) { s += 2; r.push('오행 보완'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'gears',
    category: '보완형',
    title: '톱니바퀴같은 관계',
    tagline: '정확히 맞물려 함께 굴러가는 정교한 동행',
    description: '서로 다른 격국·격이 충돌 없이 맞물려 협업이 잘 되는 구조. 일·프로젝트·생활 패턴이 자연스럽게 분담되는 실용적 시너지.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.ohBalanceScore >= 7) { s += 3; r.push('오행 합산 균형'); }
      if (!ctx.chung && !ctx.hyung && ctx.ohComplementScore >= 3) { s += 2.5; r.push('충형 없음 + 보완'); }
      if (ctx.yinYangBalance === 'balanced') { s += 1.5; r.push('음양 균형'); }
      return { score: s, reasons: r };
    },
  },

  {
    id: 'day-and-night',
    category: '보완형',
    title: '낮과 밤같은 관계',
    tagline: '정반대지만 만나야 하루가 완성되는',
    description: '음양이 정반대로 배치돼 한쪽이 활동·표현을, 다른 쪽이 휴식·내성을 맡는 구조. 따로 있으면 한쪽으로 치우치지만 함께 있으면 균형이 맞는 천생연분형.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.yinYangBalance === 'balanced' && ctx.p1.dayPolarity !== ctx.p2.dayPolarity) {
        s += 4; r.push('음양 균형 + 일간 음양 다름');
      }
      if (ctx.strengthMatch === 'contrast') { s += 2; r.push('신강신약 대조'); }
      if (ctx.ohComplementScore >= 4) { s += 1.5; r.push('오행 보완'); }
      return { score: s, reasons: r };
    },
  },

  // ============================================================
  // 역할형 (5)
  // ============================================================
  {
    id: 'parent-child',
    category: '역할형',
    title: '부모와 자식같은 관계',
    tagline: '한쪽이 무조건 챙기고 한쪽이 받아 자라는 구조',
    description: '한 사람의 일간이 상대의 일간을 일방적으로 생(生)해주는 관계. 누가 더 많이 주고 누가 더 많이 받는지가 사주적으로 정해진 구조라 자연스럽게 역할이 나뉨.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.daySaeng12 && !ctx.daySaeng21) { s += 5; r.push(`${ctx.p1.name} → ${ctx.p2.name} 생`); }
      if (ctx.daySaeng21 && !ctx.daySaeng12) { s += 5; r.push(`${ctx.p2.name} → ${ctx.p1.name} 생`); }
      if (ctx.strengthMatch === 'contrast') { s += 2; r.push('신강신약 대조'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'mentor-student',
    category: '역할형',
    title: '스승과 제자같은 관계',
    tagline: '한쪽이 깨우치고 한쪽이 따라 성장하는 관계',
    description: '인성·식상 구조로 묶여 한쪽이 지혜·경험을 전해주고 한쪽이 받아 성장하는 구조. 시간이 지나면 역할이 바뀌기도 함.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.daySipsung12 === '정인' || ctx.daySipsung12 === '편인' ||
          ctx.daySipsung21 === '정인' || ctx.daySipsung21 === '편인') {
        s += 4; r.push('인성 관계');
      }
      if (ctx.daySipsung12 === '식신' || ctx.daySipsung12 === '상관' ||
          ctx.daySipsung21 === '식신' || ctx.daySipsung21 === '상관') {
        s += 2; r.push('식상 관계');
      }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'protector',
    category: '역할형',
    title: '보호자같은 관계',
    tagline: '한쪽이 든든히 지켜주고 한쪽이 그 그늘에서 쉬는',
    description: '한쪽이 신강하고 한쪽이 신약한 구조에서, 강한 쪽이 약한 쪽을 자연스럽게 보호하는 다이내믹. 안정감이 큰 만큼 의존성도 주의.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const s1 = ctx.p1.advanced.strength.isStrong;
      const s2 = ctx.p2.advanced.strength.isStrong;
      if (s1 !== s2) { s += 4; r.push(`강도 대조 ${ctx.p1.advanced.strength.label}/${ctx.p2.advanced.strength.label}`); }
      if (ctx.p1IsCheoneulForP2 || ctx.p2IsCheoneulForP1) { s += 1.5; r.push('천을귀인'); }
      return { score: s, reasons: r };
    },
  },

  {
    id: 'coach-player',
    category: '역할형',
    title: '코치와 선수같은 관계',
    tagline: '한쪽이 방향을 잡고 한쪽이 실행해 결과를 내는',
    description: '관성-식상 관계로 한쪽이 전략·기준을 세우고 한쪽이 그걸 행동으로 옮기는 구조. 직장·프로젝트·운동에서 시너지가 큼.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const hasGwan = ctx.daySipsung12 === '정관' || ctx.daySipsung12 === '편관' ||
                     ctx.daySipsung21 === '정관' || ctx.daySipsung21 === '편관';
      const hasSiksang = ctx.daySipsung12 === '식신' || ctx.daySipsung12 === '상관' ||
                        ctx.daySipsung21 === '식신' || ctx.daySipsung21 === '상관';
      if (hasGwan && hasSiksang) { s += 5; r.push('관성+식상 동시'); }
      else if (hasGwan) { s += 2.5; r.push('관성 관계'); }
      if (ctx.strengthMatch === 'contrast') { s += 1.5; r.push('신강신약 대조'); }
      return { score: s, reasons: r };
    },
    applicableTo: ['colleague', 'friendship', 'love', 'marriage'],
  },
  {
    id: 'farmer-land',
    category: '역할형',
    title: '농부와 땅같은 관계',
    tagline: '한쪽이 정성껏 가꾸고 한쪽이 결실로 보답하는',
    description: '식상-재성 관계 또는 일간이 상대의 재성을 만나는 구조. 시간을 들여 가꾸면 반드시 결실이 돌아오는 인연. 단기 성과보다 누적 효과가 큼.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.daySipsung12 === '정재' || ctx.daySipsung12 === '편재' ||
          ctx.daySipsung21 === '정재' || ctx.daySipsung21 === '편재') {
        s += 4; r.push('일간이 재성으로 보임');
      }
      if (ctx.dayGeuk12 || ctx.dayGeuk21) { s += 1.5; r.push('일간 상극(재성 구조)'); }
      if (!ctx.chung && !ctx.hyung) { s += 1; r.push('충형 없음'); }
      return { score: s, reasons: r };
    },
  },

  // ============================================================
  // 도전형 (4)
  // ============================================================
  {
    id: 'sparring-partner',
    category: '도전형',
    title: '스파링 파트너같은 관계',
    tagline: '경쟁이 성장의 동력이 되는 라이벌형 인연',
    description: '비견·겁재 관계로 동질감이 높지만 경쟁심도 강한 구조. 서로 자극을 주고받으며 둘 다 성장하는 관계. 다만 같은 것을 원할 때 충돌 주의.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.daySipsung12 === '비견' || ctx.daySipsung12 === '겁재') { s += 4; r.push(`십성 ${ctx.daySipsung12}`); }
      if (ctx.dayOhSameElement) { s += 2; r.push('일간 동일 오행'); }
      if (ctx.strengthMatch === 'similar' && ctx.p1.advanced.strength.isStrong) { s += 1.5; r.push('둘 다 신강'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'trainer-client',
    category: '도전형',
    title: '트레이너와 회원같은 관계',
    tagline: '한쪽이 단련시키고 한쪽이 단련당하며 강해지는',
    description: '관성 관계로 한쪽이 압박·기준을, 다른 쪽이 그 압박을 견디며 단단해지는 구조. 처음엔 답답하지만 결국 자기 한계를 넘게 만들어주는 인연.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.daySipsung12 === '정관' || ctx.daySipsung12 === '편관' ||
          ctx.daySipsung21 === '정관' || ctx.daySipsung21 === '편관') {
        s += 4; r.push('관성 관계');
      }
      if (ctx.dayGeuk12 || ctx.dayGeuk21) { s += 2; r.push('일간 상극'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'rival-friend',
    category: '도전형',
    title: '라이벌 친구같은 관계',
    tagline: '미워하면서 따라가고 싶은 묘한 자극',
    description: '겁재 관계로 가까운 만큼 견제도 큰 다이내믹. 서로 비교하며 자신을 다듬게 만드는 관계지만, 돈·기회 앞에서는 충돌 가능성.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.daySipsung12 === '겁재' || ctx.daySipsung21 === '겁재') { s += 4.5; r.push('겁재 관계'); }
      if (ctx.dayOhSameElement && ctx.p1.dayPolarity !== ctx.p2.dayPolarity) { s += 2; r.push('동일 오행 음양 다름'); }
      return { score: s, reasons: r };
    },
  },

  {
    id: 'gym-buddy',
    category: '도전형',
    title: '헬스 메이트같은 관계',
    tagline: '같은 목표를 향해 함께 단단해지는',
    description: '같은 오행이 둘 다 강하고 신강 구조라 함께 도전하면 동반 성장하는 인연. 혼자선 못 갈 거리를 같이 가면 가는 구조. 단, 같은 영역 경쟁 시 충돌 주의.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.dayOhSameElement && ctx.p1.advanced.strength.isStrong && ctx.p2.advanced.strength.isStrong) {
        s += 4; r.push('동일 오행 + 둘 다 신강');
      }
      if (!ctx.chung && !ctx.hyung && ctx.dayOhSameElement) { s += 2; r.push('충형 없음'); }
      return { score: s, reasons: r };
    },
  },

  // ============================================================
  // 다이내믹형 (4)
  // ============================================================
  {
    id: 'rollercoaster',
    category: '다이내믹형',
    title: '롤러코스터같은 관계',
    tagline: '올라갈 땐 짜릿하고 내려갈 땐 비명, 그래도 못 끊는',
    description: '일지 충으로 격렬하게 끌리고 격렬하게 부딪히는 구조. 평온하지 않지만 그 진폭이 오히려 살아있다는 느낌을 줌. 권태기가 거의 없는 대신 갈등 진폭이 큼.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.chung) { s += 5; r.push(`일지 충 ${branchPair(ctx)}`); }
      if (ctx.bothYangin) { s += 2; r.push('둘 다 양인살'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'ramen-kimchi',
    category: '다이내믹형',
    title: '라면과 김치같은 관계',
    tagline: '따로 보면 평범한데 같이 두면 멈출 수 없는 조합',
    description: '오행과 음양이 정반대로 배치돼 따로 보면 평범하지만 합쳤을 때 시너지가 폭발하는 구조. 다른 점이 매력이 되는 케미.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.ohComplementScore >= 5 && ctx.yinYangBalance === 'balanced') { s += 4; r.push('오행 보완 + 음양 균형'); }
      if (ctx.dayGeuk12 || ctx.dayGeuk21) { s += 2; r.push('일간 상극이 시너지로'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'firework-show',
    category: '다이내믹형',
    title: '폭죽쇼같은 관계',
    tagline: '같이 있으면 어디서든 분위기 메이커',
    description: '둘 다 화 기운이 많거나 도화·홍염이 공명해서, 만나면 주변까지 환해지는 폭발적 에너지. 단점은 둘 다 지치기 쉬움.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const totalFire = (ctx.combinedOh['화'] || 0);
      if (totalFire >= 5) { s += 3; r.push(`합산 화 ${totalFire}`); }
      if (ctx.bothDohwa) { s += 3; r.push('둘 다 도화살'); }
      if (ctx.yinYangBalance === 'allYang') { s += 1.5; r.push('양 편중'); }
      return { score: s, reasons: r };
    },
  },

  {
    id: 'thunder-lightning',
    category: '다이내믹형',
    title: '천둥과 번개같은 관계',
    tagline: '동시에 터지면 하늘이 갈라지는 강대강 조합',
    description: '둘 다 양인살·괴강살이 있거나 양 편중인 구조라 만나면 분위기가 폭발적. 같은 편일 땐 무서운 추진력이지만 부딪히면 양쪽 다 손상.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.bothYangin) { s += 4; r.push('둘 다 양인살'); }
      if (ctx.yinYangBalance === 'allYang') { s += 2; r.push('양 편중'); }
      if (ctx.sharedShinsal.includes('괴강살')) { s += 2; r.push('공통 괴강살'); }
      return { score: s, reasons: r };
    },
  },

  // ============================================================
  // 안정형 (4)
  // ============================================================
  {
    id: 'old-friend',
    category: '안정형',
    title: '오랜 친구같은 관계',
    tagline: '큰 사건 없이 잔잔하게 오래가는 안정',
    description: '비견 관계 + 충·형 없음의 구조. 폭발적 끌림은 아니지만 함께 있어 편하고 다툼이 적어 오래가는 인연.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.daySipsung12 === '비견' || ctx.daySipsung21 === '비견') { s += 3; r.push('비견 관계'); }
      if (!ctx.chung && !ctx.hyung && !ctx.wonjin) { s += 2.5; r.push('충형 원진 없음'); }
      if (ctx.dayOhSameElement && ctx.p1.dayPolarity === ctx.p2.dayPolarity) { s += 1.5; r.push('동일 오행 동일 음양'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'wool-blanket',
    category: '안정형',
    title: '양털 이불같은 관계',
    tagline: '말없이 곁에 있어도 따뜻한 포근함',
    description: '토 기운이 강하거나 격국이 안정적이라 묵직한 안정감을 주는 인연. 화려하진 않지만 어디 가지 않을 거라는 신뢰가 있는 관계.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const totalEarth = (ctx.combinedOh['토'] || 0);
      if (totalEarth >= 5) { s += 3; r.push(`합산 토 ${totalEarth}`); }
      if (ctx.ohBalanceScore >= 7) { s += 2; r.push('합산 균형'); }
      if (!ctx.chung && !ctx.hyung) { s += 1.5; r.push('충형 없음'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'warm-tea',
    category: '안정형',
    title: '따뜻한 차같은 관계',
    tagline: '뜨겁지 않게 천천히 스며드는 정',
    description: '일지 육합 + 평온한 격국 조합으로 잔잔하지만 깊이 스미는 관계. 시간이 지날수록 빠질 수 없는 인연이 됨.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.yukHap) { s += 3; r.push(`일지 육합 ${branchPair(ctx)}`); }
      if (!ctx.chung && !ctx.hyung && !ctx.bothYangin) { s += 2; r.push('충돌 요소 적음'); }
      return { score: s, reasons: r };
    },
  },

  {
    id: 'library',
    category: '안정형',
    title: '도서관같은 관계',
    tagline: '말 없이 옆에 있어도 충분히 채워지는',
    description: '인성 관계 + 차분한 격국 조합으로, 시끄럽지 않게 깊어지는 인연. 함께 공부·연구·취미를 즐기는 데 최적이고 정신적 안정감이 큼.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const hasInseong = ctx.daySipsung12 === '정인' || ctx.daySipsung12 === '편인' ||
                        ctx.daySipsung21 === '정인' || ctx.daySipsung21 === '편인';
      if (hasInseong) { s += 3; r.push('인성 관계'); }
      if (ctx.yinYangBalance === 'allYin') { s += 2; r.push('음 편중(차분)'); }
      if (!ctx.chung && !ctx.hyung && !ctx.bothYangin) { s += 1.5; r.push('충돌 요소 적음'); }
      return { score: s, reasons: r };
    },
    applicableTo: ['friendship', 'colleague', 'love', 'marriage'],
  },

  // ============================================================
  // 주의형 (4) — 부드럽게 경고
  // ============================================================
  {
    id: 'rose-with-thorns',
    category: '주의형',
    title: '가시 박힌 장미같은 관계',
    tagline: '끌리는데 가까이 가면 베이는 매혹',
    description: '강한 끌림이 있지만 일지 형이나 원진으로 잦은 마찰이 따르는 구조. 매력 자체가 위험에서 나오는 인연. 거리 조절이 핵심.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const attract = ctx.cheonganHap || ctx.yukHap;
      const conflict = ctx.hyung || ctx.wonjin || ctx.guimun;
      if (attract && conflict) { s += 5; r.push('끌림 + 마찰 공존'); }
      else if (conflict) { s += 2; r.push('마찰 요소'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'foggy-road',
    category: '주의형',
    title: '안개길같은 관계',
    tagline: '어디로 가는지 모르겠는 묘한 얽힘',
    description: '원진·귀문관으로 정신적 얽힘이 강한 인연. 서로 미운정 든 듯한 애증 패턴이 반복되는 구조.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.wonjin) { s += 3; r.push('원진'); }
      if (ctx.guimun) { s += 3; r.push('귀문관'); }
      if (ctx.hae) { s += 1.5; r.push('해'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'parallel-lines',
    category: '주의형',
    title: '평행선같은 관계',
    tagline: '나란히 가지만 끝내 만나지 못하는 거리감',
    description: '공통 합이 없고 오행도 안 맞아 같이 있어도 거리감이 줄지 않는 구조. 깊은 갈등은 없지만 깊은 친밀도 어려운 인연.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const noConnect = !ctx.cheonganHap && !ctx.yukHap && !ctx.samHap && !ctx.banHap;
      if (noConnect && ctx.ohComplementScore <= 2 && ctx.ohOverlapScore <= 2) {
        s += 4; r.push('합 없음 + 보완 없음');
      }
      return { score: s, reasons: r };
    },
  },

  {
    id: 'timebomb',
    category: '주의형',
    title: '시한폭탄같은 관계',
    tagline: '평소엔 멀쩡한데 한 번 터지면 크게 갈라지는',
    description: '일지 충 + 양인살 공명으로 평소엔 잘 지내다가 결정적 순간 폭발하는 위험 신호. 감정 누적이 크기 때문에 작은 마찰도 즉시 풀어야 안전.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.chung && ctx.bothYangin) { s += 5; r.push('일지 충 + 둘 다 양인'); }
      else if (ctx.chung && (ctx.hyung || ctx.wonjin)) { s += 3.5; r.push('충 + 형/원진'); }
      if (ctx.dayGeuk12 && ctx.dayGeuk21) { s += 1.5; r.push('일간 상호 극'); }
      return { score: s, reasons: r };
    },
  },

  // ============================================================
  // 성장형 (4)
  // ============================================================
  {
    id: 'wine',
    category: '성장형',
    title: '와인같은 관계',
    tagline: '시간이 지날수록 깊어지는 맛',
    description: '초반엔 평범해 보이지만 함께 보내는 시간이 쌓일수록 진가가 드러나는 인연. 신뢰가 술 익듯 천천히 깊어지는 관계.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (!ctx.chung && !ctx.hyung && (ctx.yukHap || ctx.banHap)) { s += 3; r.push('충형 없음 + 약한 합'); }
      if (ctx.ohComplementScore >= 3 && ctx.ohBalanceScore >= 5) { s += 2; r.push('보완 + 균형'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'sapling-sunlight',
    category: '성장형',
    title: '묘목과 햇빛같은 관계',
    tagline: '한쪽이 자라는 데 다른 쪽이 절대적으로 필요한',
    description: '한쪽 일간이 약한데 상대가 일간을 키우는 오행을 풍부하게 가지고 있어, 그 관계 안에서 약한 쪽이 본격적으로 성장하는 구조.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const oneWeak = !ctx.p1.advanced.strength.isStrong || !ctx.p2.advanced.strength.isStrong;
      if (oneWeak && (ctx.daySaeng12 || ctx.daySaeng21)) { s += 4; r.push('한쪽 약 + 일간 생'); }
      if (oneWeak && (ctx.p1HasP2Yongsin || ctx.p2HasP1Yongsin)) { s += 2; r.push('약한 쪽 용신 보충'); }
      return { score: s, reasons: r };
    },
  },

  {
    id: 'four-seasons',
    category: '성장형',
    title: '사계절같은 관계',
    tagline: '둘이 합쳐야 한 해가 완성되는 보완',
    description: '방합·삼합 라인의 일부를 각자 들고 있어 함께하면 사계절이 완성되는 구조. 어느 한 시기에 한쪽이 약해도 다른 쪽이 받쳐주는 사주적 보험.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.bangHap) { s += 4; r.push('일지 방합 라인'); }
      if (ctx.samHap) { s += 2.5; r.push('일지 삼합 라인'); }
      if (ctx.ohBalanceScore >= 7) { s += 1.5; r.push('합산 균형 우수'); }
      return { score: s, reasons: r };
    },
  },
  {
    id: 'hiking-buddy',
    category: '성장형',
    title: '등산 메이트같은 관계',
    tagline: '천천히 같이 올라가다 보면 정상에 함께 도착하는',
    description: '비견 + 충형 없음 + 인성 보완 조합으로 큰 사건 없이 꾸준히 성장하는 동행. 화려한 진폭은 없지만 시간 흐를수록 두 사람 모두 단단해짐.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const hasInseong = ctx.daySipsung12 === '정인' || ctx.daySipsung12 === '편인' ||
                        ctx.daySipsung21 === '정인' || ctx.daySipsung21 === '편인';
      if (!ctx.chung && !ctx.hyung && (ctx.daySipsung12 === '비견' || ctx.daySipsung21 === '비견')) {
        s += 3; r.push('비견 + 충형 없음');
      }
      if (hasInseong) { s += 2; r.push('인성 보완'); }
      if (ctx.ohBalanceScore >= 6) { s += 1.5; r.push('합산 균형'); }
      return { score: s, reasons: r };
    },
  },

  // ============================================================
  // 매콤형 (5) — 남녀관계 전용
  // ============================================================
  {
    id: 'spicy-chemistry',
    category: '매콤형',
    title: '심장 뛰는 화학반응',
    tagline: '단순 호감 아닌 사주가 만든 끌림',
    description: '천간합이나 일지 육합으로 끌림이 사주에 새겨진 인연. 이성적으로 설명할 수 없는 두근거림의 정체는 결국 명리학적 합 구조. 만나면 분명한 떨림이 있고, 떨어져 있어도 잊히지 않는 케미.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.cheonganHap) { s += 5; r.push(`천간합 ${dayPair(ctx)}`); }
      if (ctx.yukHap) { s += 3; r.push(`일지 육합 ${branchPair(ctx)}`); }
      if (ctx.bothDohwa) { s += 2; r.push('둘 다 도화살'); }
      return { score: s, reasons: r };
    },
    applicableTo: ROMANTIC,
  },
  {
    id: 'spicy-danger',
    category: '매콤형',
    title: '위험한데 못 끊는 코드',
    tagline: '아는데 도망 못 가는 매혹',
    description: '편관(七殺) 끌림 + 일지 충 + 도화/귀문관 같은 위험한 매력 신호. 머리로는 위험을 아는데 본능이 끌어당기는 구조. 잠자리 케미는 강렬하지만 일상에서 마찰도 큰 양날의 검.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.daySipsung12 === '편관' || ctx.daySipsung21 === '편관') { s += 3; r.push('편관 끌림'); }
      if (ctx.chung) { s += 2.5; r.push(`일지 충 ${branchPair(ctx)}`); }
      if (ctx.bothDohwa) { s += 2; r.push('둘 다 도화'); }
      if (ctx.guimun) { s += 2; r.push('귀문관'); }
      if (ctx.bothYangin) { s += 1.5; r.push('둘 다 양인'); }
      return { score: s, reasons: r };
    },
    applicableTo: ROMANTIC,
  },
  {
    id: 'spicy-tropic',
    category: '매콤형',
    title: '한여름 열대야같은 관계',
    tagline: '식을 줄 모르는 격정의 열기',
    description: '둘 다 화 기운이 많거나 양 편중에 도화·홍염 신호가 강해 만나기만 하면 뜨거워지는 구조. 권태기가 잘 안 오는 대신 둘 다 빨리 지치는 게 함정. 식히는 법(수 보충)이 핵심.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const totalFire = (ctx.combinedOh['화'] || 0);
      if (totalFire >= 5) { s += 3; r.push(`합산 화 ${totalFire}`); }
      if (ctx.bothDohwa) { s += 2.5; r.push('둘 다 도화'); }
      if (ctx.yinYangBalance === 'allYang') { s += 2; r.push('양 편중'); }
      const totalWater = (ctx.combinedOh['수'] || 0);
      if (totalWater <= 2) { s += 1; r.push(`합산 수 약 ${totalWater}`); }
      return { score: s, reasons: r };
    },
    applicableTo: ROMANTIC,
  },
  {
    id: 'spicy-code',
    category: '매콤형',
    title: '비밀의 코드같은 관계',
    tagline: '둘만 아는 신호로 통하는 은밀한 케미',
    description: '일지 육합 + 도화살 공명으로 잠자리 케미와 비언어적 신호 교환이 강한 구조. 말 안 해도 통하는 코드가 있고, 작은 손짓·시선만으로도 분위기가 만들어지는 인연.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      if (ctx.yukHap) { s += 3; r.push(`일지 육합 ${branchPair(ctx)}`); }
      if (ctx.bothDohwa) { s += 3; r.push('둘 다 도화살'); }
      if (ctx.p1.shinsal.includes('홍염살') || ctx.p2.shinsal.includes('홍염살')) {
        s += 2; r.push('홍염살 보유');
      }
      return { score: s, reasons: r };
    },
    applicableTo: ROMANTIC,
  },
  {
    id: 'spicy-tsundere',
    category: '매콤형',
    title: '츤데레 콤비같은 관계',
    tagline: '싫다면서 끌리고 밀어내면서 다가가는',
    description: '일간 상극이지만 합·도화 신호가 있어 머리는 거부하는데 몸이 끌리는 모순 구조. "이 사람 별로야"라고 말하면서도 자꾸 생각나는 패턴.',
    match: (ctx) => {
      let s = 0; const r: string[] = [];
      const geuk = ctx.dayGeuk12 || ctx.dayGeuk21;
      const attract = ctx.cheonganHap || ctx.yukHap || ctx.bothDohwa;
      if (geuk && attract) { s += 5; r.push('일간 상극 + 합/도화'); }
      else if (geuk && (ctx.hyung || ctx.wonjin)) { s += 2.5; r.push('상극 + 형/원진'); }
      return { score: s, reasons: r };
    },
    applicableTo: ROMANTIC,
  },
];

/**
 * 매콤형을 제외한 메인 관계 풀에서 상위 N개 매칭.
 * 점수 0인 항목은 제외.
 */
export function selectMainRelationships(ctx: CompatContext, n: number = 3): RelationshipMatch[] {
  return scoreAndRank(ctx, n, (rel) => rel.category !== '매콤형');
}

/**
 * 매콤형 풀에서만 상위 N개 매칭. 남녀관계에서만 호출.
 */
export function selectSpicyRelationships(ctx: CompatContext, n: number = 2): RelationshipMatch[] {
  if (!ROMANTIC.includes(ctx.relationType)) return [];
  return scoreAndRank(ctx, n, (rel) => rel.category === '매콤형');
}

function scoreAndRank(
  ctx: CompatContext,
  n: number,
  filter: (rel: Relationship) => boolean,
): RelationshipMatch[] {
  return RELATIONSHIP_POOL
    .filter(filter)
    .filter(r => !r.applicableTo || r.applicableTo.includes(ctx.relationType))
    .map(r => {
      const result = r.match(ctx);
      return { relationship: r, score: result.score, matchReasons: result.reasons };
    })
    .filter(m => m.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, n);
}
