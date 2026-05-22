// SpecialPoint 점수 계산 (spec §9-3).
//
// 기본 +20: 해당 구조 존재
// 월·일주 직접 연결 +20 / 일지 +20 / 월령 +15 / 용신·희신 연결 +20
// 현재 대운 활성화 +15 / 향후 3년 활성화 +10 / 보강 요소 +10
// 충·형·파·해 손상 -15 / 기신 강 연결 -15 / 시간 미상 -20
// 등급: 80+ signature, 65+ strong, 50+ noticeable, 35+ weak, 0-34 hide

import type { SpecialPointRarityLevel } from '../report/sajuReportSchema';

export interface ScoreSignals {
  base: boolean;                  // 기본 구조 존재
  monthOrDayPillar?: boolean;     // 월/일주 직접 연결
  dayBranch?: boolean;            // 일지 연결
  monthBranch?: boolean;          // 월령 연결
  usefulGodLink?: boolean;        // 용신/희신과 연결
  currentDaewoonActivation?: boolean;
  nextYearsActivation?: boolean;  // 향후 3년
  supportingFactors?: number;     // 같은 주제 보강 요소 수
  damaged?: boolean;              // 충/형/파/해 손상
  kiLinked?: boolean;             // 기신과 강 연결
  hourUnknown?: boolean;          // 시간 미상
}

export interface ScoreResult {
  score: number;          // 0~100 클램프
  grade: 'signature' | 'strong' | 'noticeable' | 'weak' | 'hidden';
  shouldDisplay: boolean; // 50 이상만
  rarityLevel: SpecialPointRarityLevel;
}

export function scoreSpecialPoint(sig: ScoreSignals): ScoreResult {
  let s = 0;
  if (sig.base) s += 20;
  if (sig.monthOrDayPillar) s += 20;
  if (sig.dayBranch) s += 20;
  if (sig.monthBranch) s += 15;
  if (sig.usefulGodLink) s += 20;
  if (sig.currentDaewoonActivation) s += 15;
  if (sig.nextYearsActivation) s += 10;
  if (sig.supportingFactors) s += Math.min(sig.supportingFactors, 3) * 10;
  if (sig.damaged) s -= 15;
  if (sig.kiLinked) s -= 15;
  if (sig.hourUnknown) s -= 20;

  s = Math.max(0, Math.min(100, s));

  const grade =
    s >= 80 ? 'signature' :
    s >= 65 ? 'strong' :
    s >= 50 ? 'noticeable' :
    s >= 35 ? 'weak' : 'hidden';

  const rarityLevel: SpecialPointRarityLevel =
    s >= 80 ? 'very-rare' :
    s >= 65 ? 'rare' :
    s >= 50 ? 'uncommon' :
    s >= 35 ? 'noticeable' : 'common';

  return { score: s, grade, shouldDisplay: s >= 50, rarityLevel };
}
