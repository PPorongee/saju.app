// Module 7 — 오행 강약 분석.
// spec §7 10가중치를 다음 단순화된 점수로 통합:
//   1. 월령(가장 큰 가중) — MONTH_BRANCH_PRIMARY_MULTIPLIER
//   2. 통근(지지 본기에 일간 오행) — DAY_BRANCH_PRIMARY_MULTIPLIER
//   3. 투출(천간) — WEIGHT_OTHER_STEM
//   4. 지장간 비중 — hidden weight × HIDDEN_STEM_WEIGHT_MULTIPLIER
//   5. 계절 조후 — SEASON_BONUS
//   6,7,8,9,10 (생조/극제/합충형파해/고립/과다) — 임계값 분류로 처리

import type { FourPillars } from '../calendar/pillarCalculator';
import type { ElementStrengthAnalysis } from '../report/sajuReportSchema';
import { ELEMENTS, STEM_ELEMENT, BRANCH_ELEMENT, SEASON_ELEMENT, type Element } from '../rules/elements';
import { HIDDEN_STEMS } from '../rules/hiddenStems';
import { SCORING } from '../rules/scoringWeights';

export function analyzeElementStrength(pillars: FourPillars): ElementStrengthAnalysis {
  const scores: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  const reasons: string[] = [];

  // 천간 4개 (일간 1.0, 나머지 0.8)
  const stemList: Array<{ stem: typeof pillars.day.stem; isDay: boolean; pos: string }> = [
    { stem: pillars.year.stem,  isDay: false, pos: '년간' },
    { stem: pillars.month.stem, isDay: false, pos: '월간' },
    { stem: pillars.day.stem,   isDay: true,  pos: '일간' },
  ];
  if (pillars.hour) stemList.push({ stem: pillars.hour.stem, isDay: false, pos: '시간' });
  for (const { stem, isDay, pos } of stemList) {
    const el = STEM_ELEMENT[stem];
    const w = isDay ? SCORING.WEIGHT_DAY_STEM : SCORING.WEIGHT_OTHER_STEM;
    scores[el] += w;
    reasons.push(`${pos} ${stem}(${el}) +${w}`);
  }

  // 지장간 (각 지지의 본기·중기·여기)
  const branchList: Array<{ branch: typeof pillars.day.branch; pos: 'month' | 'day' | 'other'; posName: string }> = [
    { branch: pillars.year.branch,  pos: 'other', posName: '년지' },
    { branch: pillars.month.branch, pos: 'month', posName: '월지' },
    { branch: pillars.day.branch,   pos: 'day',   posName: '일지' },
  ];
  if (pillars.hour) branchList.push({ branch: pillars.hour.branch, pos: 'other', posName: '시지' });

  for (const { branch, pos, posName } of branchList) {
    for (const hs of HIDDEN_STEMS[branch]) {
      const el = STEM_ELEMENT[hs.stem];
      let mult = SCORING.HIDDEN_STEM_WEIGHT_MULTIPLIER;
      if (pos === 'month' && hs.role === 'primary') mult *= SCORING.MONTH_BRANCH_PRIMARY_MULTIPLIER;
      if (pos === 'day'   && hs.role === 'primary') mult *= SCORING.DAY_BRANCH_PRIMARY_MULTIPLIER;
      const add = hs.weight * mult;
      scores[el] += add;
      reasons.push(`${posName} 지장간 ${hs.stem}(${el}, ${hs.role}) +${add.toFixed(2)}`);
    }
  }

  // 계절 조후 (월지 계절 왕 오행)
  const seasonEl = SEASON_ELEMENT[pillars.month.branch];
  scores[seasonEl] += SCORING.SEASON_BONUS;
  reasons.push(`월지(${pillars.month.branch}) 계절 왕 ${seasonEl} +${SCORING.SEASON_BONUS}`);

  // 분류
  const entries = ELEMENTS.map(el => [el, scores[el]] as [Element, number]);
  const sortedDesc = [...entries].sort((a, b) => b[1] - a[1]);
  const maxVal = sortedDesc[0][1];
  const strongest = entries.filter(([, v]) => v >= SCORING.ELEMENT_STRONG_THRESHOLD || v >= maxVal * 0.85).map(([e]) => e);
  const weakest   = entries.filter(([, v]) => v <= SCORING.ELEMENT_DEFICIENT_THRESHOLD).map(([e]) => e);
  const excessive = entries.filter(([, v]) => v >= SCORING.ELEMENT_EXCESSIVE_THRESHOLD).map(([e]) => e);
  const deficient = entries.filter(([, v]) => v <= SCORING.ELEMENT_DEFICIENT_THRESHOLD).map(([e]) => e);
  const isolated  = entries.filter(([, v]) => v <= SCORING.ELEMENT_ISOLATED_THRESHOLD).map(([e]) => e);

  // 조후 (월지 계절 → coldHot, 수/화 비율 → dryWet)
  const monthBranch = pillars.month.branch;
  let coldHot: ElementStrengthAnalysis['climate']['coldHot'] = 'balanced';
  if (['해', '자', '축'].includes(monthBranch)) coldHot = scores.water > scores.fire * 2 ? 'too-cold' : 'cold';
  else if (['사', '오', '미'].includes(monthBranch)) coldHot = scores.fire > scores.water * 2 ? 'too-hot' : 'hot';

  let dryWet: ElementStrengthAnalysis['climate']['dryWet'] = 'balanced';
  const wetScore = scores.water + scores.wood * 0.5;
  const dryScore = scores.fire + scores.metal * 0.5;
  if (dryScore > wetScore * 2.5) dryWet = 'too-dry';
  else if (dryScore > wetScore * 1.5) dryWet = 'dry';
  else if (wetScore > dryScore * 2.5) dryWet = 'too-wet';
  else if (wetScore > dryScore * 1.5) dryWet = 'wet';

  const comment = buildClimateComment(coldHot, dryWet, monthBranch);

  return {
    scores,
    strongest,
    weakest,
    excessive,
    deficient,
    isolated,
    climate: { coldHot, dryWet, comment },
    reasons,
  };
}

function buildClimateComment(
  coldHot: ElementStrengthAnalysis['climate']['coldHot'],
  dryWet: ElementStrengthAnalysis['climate']['dryWet'],
  monthBranch: string,
): string {
  const parts: string[] = [`월지 ${monthBranch}`];
  if (coldHot === 'too-cold') parts.push('한기 과다 — 火 조후 필요');
  if (coldHot === 'cold')     parts.push('한기 — 火 조후 유익');
  if (coldHot === 'too-hot')  parts.push('열기 과다 — 水 조후 필요');
  if (coldHot === 'hot')      parts.push('열기 — 水 조후 유익');
  if (dryWet === 'too-dry')   parts.push('조열 — 水 가미');
  if (dryWet === 'too-wet')   parts.push('한습 — 火 가미');
  return parts.join(' / ');
}
