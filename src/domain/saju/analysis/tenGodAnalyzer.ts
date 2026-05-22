// Module 5 — 십성 분석.
// 입력: FourPillars (calendar/pillarCalculator)
// 출력: TenGodAnalysis (visible + hidden + totals + 분류)

import type { FourPillars } from '../calendar/pillarCalculator';
import type {
  TenGodAnalysis, TenGod,
  StemPosition, BranchPosition,
} from '../report/sajuReportSchema';
import { calcTenGod, ALL_TEN_GODS } from '../rules/tenGods';
import { HIDDEN_STEMS } from '../rules/hiddenStems';
import { SCORING } from '../rules/scoringWeights';

export function analyzeTenGods(pillars: FourPillars): TenGodAnalysis {
  const dm = pillars.dayMaster;
  const visible: TenGodAnalysis['visible'] = [];
  const hidden: TenGodAnalysis['hidden'] = [];
  const totals: Record<TenGod, number> = Object.fromEntries(
    ALL_TEN_GODS.map(t => [t, 0])
  ) as Record<TenGod, number>;

  // visible — 년·월·시 천간 (일간 자기 자신 제외)
  const stemPositions: Array<[StemPosition, string | undefined]> = [
    ['yearStem',  pillars.year.stem],
    ['monthStem', pillars.month.stem],
    ['hourStem',  pillars.hour?.stem],
  ];
  for (const [pos, stem] of stemPositions) {
    if (!stem) continue;
    const tg = calcTenGod(dm, stem as Parameters<typeof calcTenGod>[1]);
    visible.push({ position: pos, tenGod: tg, source: stem as never });
    const bonus = pos === 'monthStem' ? SCORING.TEN_GOD_MONTH_STEM_BONUS : 0;
    totals[tg] += SCORING.TEN_GOD_VISIBLE_WEIGHT + bonus;
  }

  // hidden — 4지지 각각의 지장간
  const branchPositions: Array<[BranchPosition, typeof pillars.year | undefined]> = [
    ['yearBranch',  pillars.year],
    ['monthBranch', pillars.month],
    ['dayBranch',   pillars.day],
    ['hourBranch',  pillars.hour],
  ];
  for (const [pos, pillar] of branchPositions) {
    if (!pillar) continue;
    for (const hs of HIDDEN_STEMS[pillar.branch]) {
      const tg = calcTenGod(dm, hs.stem);
      hidden.push({ position: pos, tenGod: tg, source: hs.stem, weight: hs.weight });
      totals[tg] += hs.weight * SCORING.HIDDEN_STEM_WEIGHT_MULTIPLIER;
    }
  }

  // 분류
  const entries = ALL_TEN_GODS.map(t => [t, totals[t]] as [TenGod, number]);
  const maxVal = Math.max(...entries.map(([, v]) => v));
  const strongest = entries
    .filter(([, v]) => v >= maxVal * SCORING.TEN_GOD_STRONG_RATIO && v > 0)
    .map(([t]) => t);
  const weakest = entries
    .filter(([, v]) => v <= SCORING.TEN_GOD_DEFICIENT_THRESHOLD)
    .map(([t]) => t);
  const excessive = entries
    .filter(([, v]) => v >= SCORING.TEN_GOD_EXCESSIVE_THRESHOLD)
    .map(([t]) => t);
  const deficient = entries
    .filter(([, v]) => v === 0)
    .map(([t]) => t);

  return { visible, hidden, totals, strongest, weakest, excessive, deficient };
}
