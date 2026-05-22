// 지장간 (地藏干) — 지지 안에 숨어 있는 천간.
// 본기(主氣)·중기(中氣)·여기(餘氣) 비중을 기록한다.
// 십성·강약 분석에서 천간 투출 여부와 함께 사용.

import type { HeavenlyStem } from './heavenlyStems';
import type { EarthlyBranch } from './earthlyBranches';

export interface HiddenStem {
  stem: HeavenlyStem;
  /** 'primary' = 본기, 'middle' = 중기, 'residual' = 여기 */
  role: 'primary' | 'middle' | 'residual';
  /** 가중치 (본기 0.6, 중기 0.3, 여기 0.1 합 1.0 기본; 합/충/형 등 조정은 analyzer에서) */
  weight: number;
}

/** 지지 → 지장간 (배열은 본기 → 중기 → 여기 순) */
export const HIDDEN_STEMS: Record<EarthlyBranch, HiddenStem[]> = {
  자: [
    { stem: '계', role: 'primary',  weight: 1.0 },
  ],
  축: [
    { stem: '기', role: 'primary',  weight: 0.6 },
    { stem: '계', role: 'middle',   weight: 0.3 },
    { stem: '신', role: 'residual', weight: 0.1 },
  ],
  인: [
    { stem: '갑', role: 'primary',  weight: 0.6 },
    { stem: '병', role: 'middle',   weight: 0.3 },
    { stem: '무', role: 'residual', weight: 0.1 },
  ],
  묘: [
    { stem: '을', role: 'primary',  weight: 1.0 },
  ],
  진: [
    { stem: '무', role: 'primary',  weight: 0.6 },
    { stem: '을', role: 'middle',   weight: 0.3 },
    { stem: '계', role: 'residual', weight: 0.1 },
  ],
  사: [
    { stem: '병', role: 'primary',  weight: 0.6 },
    { stem: '경', role: 'middle',   weight: 0.3 },
    { stem: '무', role: 'residual', weight: 0.1 },
  ],
  오: [
    { stem: '정', role: 'primary',  weight: 0.7 },
    { stem: '기', role: 'middle',   weight: 0.3 },
  ],
  미: [
    { stem: '기', role: 'primary',  weight: 0.6 },
    { stem: '정', role: 'middle',   weight: 0.3 },
    { stem: '을', role: 'residual', weight: 0.1 },
  ],
  신: [
    { stem: '경', role: 'primary',  weight: 0.6 },
    { stem: '임', role: 'middle',   weight: 0.3 },
    { stem: '무', role: 'residual', weight: 0.1 },
  ],
  유: [
    { stem: '신', role: 'primary',  weight: 1.0 },
  ],
  술: [
    { stem: '무', role: 'primary',  weight: 0.6 },
    { stem: '신', role: 'middle',   weight: 0.3 },
    { stem: '정', role: 'residual', weight: 0.1 },
  ],
  해: [
    { stem: '임', role: 'primary',  weight: 0.7 },
    { stem: '갑', role: 'middle',   weight: 0.3 },
  ],
};

/** 지지의 본기 천간 (1차 오행 판정용) */
export function primaryHiddenStem(branch: EarthlyBranch): HeavenlyStem {
  return HIDDEN_STEMS[branch].find(h => h.role === 'primary')!.stem;
}

/** 지지의 모든 지장간 천간 리스트 */
export function allHiddenStems(branch: EarthlyBranch): HeavenlyStem[] {
  return HIDDEN_STEMS[branch].map(h => h.stem);
}
