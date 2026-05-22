// 합 (合) — 천간합·지지 육합·삼합·반합·방합

import type { HeavenlyStem } from './heavenlyStems';
import type { EarthlyBranch } from './earthlyBranches';
import type { Element } from './elements';

// 천간합 (天干合) — 갑기합화토, 을경합화금, 병신합화수, 정임합화목, 무계합화화
export interface StemCombo { pair: [HeavenlyStem, HeavenlyStem]; produces: Element; name: string }
export const STEM_COMBOS: StemCombo[] = [
  { pair: ['갑', '기'], produces: 'earth', name: '갑기합화토' },
  { pair: ['을', '경'], produces: 'metal', name: '을경합화금' },
  { pair: ['병', '신'], produces: 'water', name: '병신합화수' },
  { pair: ['정', '임'], produces: 'wood',  name: '정임합화목' },
  { pair: ['무', '계'], produces: 'fire',  name: '무계합화화' },
];

// 지지 육합 (六合)
export interface BranchSix { pair: [EarthlyBranch, EarthlyBranch]; produces: Element; name: string }
export const BRANCH_SIX: BranchSix[] = [
  { pair: ['자', '축'], produces: 'earth', name: '자축합화토' },
  { pair: ['인', '해'], produces: 'wood',  name: '인해합화목' },
  { pair: ['묘', '술'], produces: 'fire',  name: '묘술합화화' },
  { pair: ['진', '유'], produces: 'metal', name: '진유합화금' },
  { pair: ['사', '신'], produces: 'water', name: '사신합화수' },
  { pair: ['오', '미'], produces: 'fire',  name: '오미합화화' }, // 일파에 따라 토
];

// 지지 삼합 (三合)
export interface BranchThree { triplet: [EarthlyBranch, EarthlyBranch, EarthlyBranch]; produces: Element; name: string }
export const BRANCH_THREE: BranchThree[] = [
  { triplet: ['인', '오', '술'], produces: 'fire',  name: '인오술 화국' },
  { triplet: ['사', '유', '축'], produces: 'metal', name: '사유축 금국' },
  { triplet: ['신', '자', '진'], produces: 'water', name: '신자진 수국' },
  { triplet: ['해', '묘', '미'], produces: 'wood',  name: '해묘미 목국' },
];

// 반합 (半合) — 삼합의 두 글자 조합 (장생+제왕 또는 제왕+묘)
export interface BranchHalf { pair: [EarthlyBranch, EarthlyBranch]; produces: Element; name: string }
export const BRANCH_HALF: BranchHalf[] = [
  { pair: ['인', '오'], produces: 'fire',  name: '인오 반합' },
  { pair: ['오', '술'], produces: 'fire',  name: '오술 반합' },
  { pair: ['사', '유'], produces: 'metal', name: '사유 반합' },
  { pair: ['유', '축'], produces: 'metal', name: '유축 반합' },
  { pair: ['신', '자'], produces: 'water', name: '신자 반합' },
  { pair: ['자', '진'], produces: 'water', name: '자진 반합' },
  { pair: ['해', '묘'], produces: 'wood',  name: '해묘 반합' },
  { pair: ['묘', '미'], produces: 'wood',  name: '묘미 반합' },
];

// 방합 (方合) — 계절합
export interface BranchDirection { triplet: [EarthlyBranch, EarthlyBranch, EarthlyBranch]; produces: Element; name: string }
export const BRANCH_DIRECTION: BranchDirection[] = [
  { triplet: ['인', '묘', '진'], produces: 'wood',  name: '인묘진 동방 목국' },
  { triplet: ['사', '오', '미'], produces: 'fire',  name: '사오미 남방 화국' },
  { triplet: ['신', '유', '술'], produces: 'metal', name: '신유술 서방 금국' },
  { triplet: ['해', '자', '축'], produces: 'water', name: '해자축 북방 수국' },
];
