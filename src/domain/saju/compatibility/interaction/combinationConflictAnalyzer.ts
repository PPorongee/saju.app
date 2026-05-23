// 두 사람 원국 전체(연·월·일·시 8지지)에서의 합·충·형·파·해.

import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';
import type { CompatibilityCombinationConflictAnalysis } from '../compatibilityTypes';
import type { EarthlyBranch } from '../../rules/earthlyBranches';
import { BRANCH_CONFLICTS, BRANCH_PUNISHMENTS, BRANCH_DESTRUCTIONS, BRANCH_HARMS } from '../../rules/conflicts';
import { BRANCH_SIX, BRANCH_HALF, STEM_COMBOS } from '../../rules/combinations';
import type { HeavenlyStem } from '../../rules/heavenlyStems';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
}

function chartBranches(p: PersonalSajuGptInput): { label: string; branch: EarthlyBranch }[] {
  const list: { label: string; branch: EarthlyBranch }[] = [];
  list.push({ label: '연지', branch: p.birthChart.year.slice(-1) as EarthlyBranch });
  list.push({ label: '월지', branch: p.birthChart.month.slice(-1) as EarthlyBranch });
  list.push({ label: '일지', branch: p.birthChart.day.slice(-1) as EarthlyBranch });
  if (p.birthChart.hour) list.push({ label: '시지', branch: p.birthChart.hour.slice(-1) as EarthlyBranch });
  return list;
}

function chartStems(p: PersonalSajuGptInput): { label: string; stem: HeavenlyStem }[] {
  const list: { label: string; stem: HeavenlyStem }[] = [];
  list.push({ label: '연간', stem: p.birthChart.year.charAt(0) as HeavenlyStem });
  list.push({ label: '월간', stem: p.birthChart.month.charAt(0) as HeavenlyStem });
  list.push({ label: '일간', stem: p.birthChart.day.charAt(0) as HeavenlyStem });
  if (p.birthChart.hour) list.push({ label: '시간', stem: p.birthChart.hour.charAt(0) as HeavenlyStem });
  return list;
}

export function analyzeCompatibilityCombinationConflict({ personA, personB }: Args): CompatibilityCombinationConflictAnalysis {
  const aB = chartBranches(personA);
  const bB = chartBranches(personB);
  const aS = chartStems(personA);
  const bS = chartStems(personB);

  const combinations: string[] = [];
  const conflicts: string[] = [];
  const punishments: string[] = [];
  const destructions: string[] = [];
  const harms: string[] = [];

  // 천간합
  for (const a of aS) for (const b of bS) {
    const combo = STEM_COMBOS.find(c =>
      (c.pair[0] === a.stem && c.pair[1] === b.stem) || (c.pair[1] === a.stem && c.pair[0] === b.stem)
    );
    if (combo) combinations.push(`A ${a.label}(${a.stem}) ↔ B ${b.label}(${b.stem}) ${combo.name}`);
  }

  // 지지 육합 / 반합
  for (const a of aB) for (const b of bB) {
    const six = BRANCH_SIX.find(c =>
      (c.pair[0] === a.branch && c.pair[1] === b.branch) || (c.pair[1] === a.branch && c.pair[0] === b.branch)
    );
    if (six) combinations.push(`A ${a.label}(${a.branch}) ↔ B ${b.label}(${b.branch}) ${six.name}`);
    const half = BRANCH_HALF.find(c =>
      (c.pair[0] === a.branch && c.pair[1] === b.branch) || (c.pair[1] === a.branch && c.pair[0] === b.branch)
    );
    if (half) combinations.push(`A ${a.label}(${a.branch}) ↔ B ${b.label}(${b.branch}) ${half.name}`);

    // 충
    if (BRANCH_CONFLICTS.some(([x, y]) => (x === a.branch && y === b.branch) || (x === b.branch && y === a.branch))) {
      conflicts.push(`A ${a.label}(${a.branch}) ↔ B ${b.label}(${b.branch}) 충`);
    }
    // 파
    if (BRANCH_DESTRUCTIONS.some(([x, y]) => (x === a.branch && y === b.branch) || (x === b.branch && y === a.branch))) {
      destructions.push(`A ${a.label}(${a.branch}) ↔ B ${b.label}(${b.branch}) 파`);
    }
    // 해
    if (BRANCH_HARMS.some(([x, y]) => (x === a.branch && y === b.branch) || (x === b.branch && y === a.branch))) {
      harms.push(`A ${a.label}(${a.branch}) ↔ B ${b.label}(${b.branch}) 해`);
    }
  }

  // 형 — 두 지지가 같은 punishment set에 있는지
  for (const a of aB) for (const b of bB) {
    for (const p of BRANCH_PUNISHMENTS) {
      if (p.subtype === '자형' && a.branch === b.branch && p.branches[0] === a.branch) {
        punishments.push(`A ${a.label}(${a.branch}) ↔ B ${b.label}(${b.branch}) ${p.name}`);
        continue;
      }
      if (p.subtype !== '자형') {
        const set = new Set(p.branches);
        if (set.has(a.branch) && set.has(b.branch) && a.branch !== b.branch) {
          punishments.push(`A ${a.label}(${a.branch}) ↔ B ${b.label}(${b.branch}) ${p.name}`);
        }
      }
    }
  }

  return {
    combinations: Array.from(new Set(combinations)),
    conflicts:    Array.from(new Set(conflicts)),
    punishments:  Array.from(new Set(punishments)),
    destructions: Array.from(new Set(destructions)),
    harms:        Array.from(new Set(harms)),
  };
}
