// 충·형·파·해 (沖刑破害) — 지지 간 충돌·갈등 관계.

import type { EarthlyBranch } from './earthlyBranches';

// 지지 충 (沖) — 6쌍
export const BRANCH_CONFLICTS: Array<[EarthlyBranch, EarthlyBranch]> = [
  ['자', '오'], ['축', '미'], ['인', '신'], ['묘', '유'], ['진', '술'], ['사', '해'],
];

// 형 (刑) — 무례·지세·무은·자형
export interface BranchPunishment { branches: EarthlyBranch[]; name: string; subtype: '무례지형' | '지세지형' | '무은지형' | '자형' }
export const BRANCH_PUNISHMENTS: BranchPunishment[] = [
  { branches: ['자', '묘'],        name: '자묘 무례지형',   subtype: '무례지형' },
  { branches: ['인', '사', '신'],  name: '인사신 지세지형', subtype: '지세지형' },
  { branches: ['축', '술', '미'],  name: '축술미 무은지형', subtype: '무은지형' },
  { branches: ['진', '진'],        name: '진진 자형',        subtype: '자형' },
  { branches: ['오', '오'],        name: '오오 자형',        subtype: '자형' },
  { branches: ['유', '유'],        name: '유유 자형',        subtype: '자형' },
  { branches: ['해', '해'],        name: '해해 자형',        subtype: '자형' },
];

// 파 (破)
export const BRANCH_DESTRUCTIONS: Array<[EarthlyBranch, EarthlyBranch]> = [
  ['자', '유'], ['인', '해'], ['묘', '오'], ['진', '축'], ['사', '신'], ['미', '술'],
];

// 해 (害) — 천을귀인을 해치는 별
export const BRANCH_HARMS: Array<[EarthlyBranch, EarthlyBranch]> = [
  ['자', '미'], ['축', '오'], ['인', '사'], ['묘', '진'], ['신', '해'], ['유', '술'],
];
