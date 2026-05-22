// 원국 내 합·충·형·파·해 detection (지지 기준).
// 결과는 한 줄 텍스트 배열 — GPT가 인용·해석에 사용.

import type { FourPillars } from '../calendar/pillarCalculator';
import type { CombinationsAndConflicts } from '../report/sajuReportSchema';
import type { EarthlyBranch } from '../rules/earthlyBranches';
import {
  BRANCH_SIX, BRANCH_THREE, BRANCH_HALF, BRANCH_DIRECTION,
} from '../rules/combinations';
import {
  BRANCH_CONFLICTS, BRANCH_PUNISHMENTS, BRANCH_DESTRUCTIONS, BRANCH_HARMS,
} from '../rules/conflicts';

export function analyzeCombinationsAndConflicts(pillars: FourPillars): CombinationsAndConflicts {
  const branches: EarthlyBranch[] = [pillars.year.branch, pillars.month.branch, pillars.day.branch];
  if (pillars.hour) branches.push(pillars.hour.branch);
  const set = new Set(branches);

  const combinations: string[] = [];
  const conflicts: string[] = [];
  const punishments: string[] = [];
  const harms: string[] = [];
  const destructions: string[] = [];

  // 육합
  for (const c of BRANCH_SIX) {
    if (set.has(c.pair[0]) && set.has(c.pair[1])) combinations.push(c.name);
  }
  // 삼합
  for (const c of BRANCH_THREE) {
    if (c.triplet.every(b => set.has(b))) combinations.push(c.name);
  }
  // 반합
  for (const c of BRANCH_HALF) {
    if (set.has(c.pair[0]) && set.has(c.pair[1])) combinations.push(c.name);
  }
  // 방합
  for (const c of BRANCH_DIRECTION) {
    if (c.triplet.every(b => set.has(b))) combinations.push(c.name);
  }
  // 충
  for (const [a, b] of BRANCH_CONFLICTS) {
    if (set.has(a) && set.has(b)) conflicts.push(`${a}-${b} 충`);
  }
  // 형
  for (const p of BRANCH_PUNISHMENTS) {
    if (p.branches.every(b => set.has(b))) punishments.push(p.name);
  }
  // 파
  for (const [a, b] of BRANCH_DESTRUCTIONS) {
    if (set.has(a) && set.has(b)) destructions.push(`${a}-${b} 파`);
  }
  // 해
  for (const [a, b] of BRANCH_HARMS) {
    if (set.has(a) && set.has(b)) harms.push(`${a}-${b} 해`);
  }

  return { combinations, conflicts, punishments, harms, destructions };
}
