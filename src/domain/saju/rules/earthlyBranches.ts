// 지지 (地支) — 12개. 사주팔자의 아래(地) 글자.

import type { YinYang } from './heavenlyStems';

export const EARTHLY_BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'] as const;
export type EarthlyBranch = typeof EARTHLY_BRANCHES[number];

export function branchByIndex(i: number): EarthlyBranch {
  return EARTHLY_BRANCHES[((i % 12) + 12) % 12];
}

export function branchIndex(b: EarthlyBranch): number {
  return EARTHLY_BRANCHES.indexOf(b);
}

export const HANJA_TO_BRANCH: Record<string, EarthlyBranch> = {
  子: '자', 丑: '축', 寅: '인', 卯: '묘', 辰: '진', 巳: '사',
  午: '오', 未: '미', 申: '신', 酉: '유', 戌: '술', 亥: '해',
};

export function branchYinYang(b: EarthlyBranch): YinYang {
  return branchIndex(b) % 2 === 0 ? 'yang' : 'yin';
}

// 월건 — 절기 인덱스(1=입춘후) → 월지
export const MONTH_INDEX_TO_BRANCH: Record<number, EarthlyBranch> = {
  1: '인', 2: '묘', 3: '진', 4: '사', 5: '오', 6: '미',
  7: '신', 8: '유', 9: '술', 10: '해', 11: '자', 12: '축',
};

/** 시각 (시,분) → 시지 + 야자시/조자시 구분 */
export function hourToBranch(hour: number, _minute: number = 0): {
  branch: EarthlyBranch;
  category: '야자시' | '조자시' | '일반';
} {
  if (hour === 23) return { branch: '자', category: '야자시' };
  if (hour === 0)  return { branch: '자', category: '조자시' };
  const idx = Math.floor((hour + 1) / 2);
  return { branch: branchByIndex(idx), category: '일반' };
}
