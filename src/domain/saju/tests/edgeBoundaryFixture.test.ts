// Edge boundary fixture — 申/酉(17:00) 시진 경계 × 지역별 태양시 보정 관찰 회귀 테스트.
//
// 목적(관찰/회귀 가드 — 알고리즘 수정 아님):
//   synthetic "edge boundary fixture"(이름 없음, 1995-06-22 female)로
//   legacy vs precision-v1 의 시주/일주/용신(calc fallback) 거동을 고정한다.
//   엔진을 특정 케이스로 하드코딩하지 않으며, 엔진이 산출한 값을 그대로 단언해 회귀를 잡는다.
//
// 핵심 관찰:
//   - 일주(갑신)는 모든 케이스 불변(자정 경계 미통과).
//   - 시주만 申/酉(17:00) 경계에서 갈림. 보정량(경도)에 따라 지역별로 다르게 갈린다.
//   - 대전(-30분, 실 fixture 지역)에서 17:29(→16:59 申) vs 17:30(→17:00 酉) 가 1분차로 갈린다.
//   - calc 용신은 모든 케이스에서 水(여름 조후 + 신약). 실서비스 용신은 LLM-primary 라 다를 수 있음.
import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { prepareCalculation } from '../calendar/precisionAdjust';

const NOW = new Date('2026-05-28T00:00:00Z');
const base = (birthTime: string) => ({
  gender: 'female' as const,
  calendarType: 'solar' as const,
  birthDate: '1995-06-22',
  birthTime,
  birthTimeConfidence: 'exact' as const,
  timezone: 'Asia/Seoul',
});
const chart = (birthTime: string, mode: 'legacy' | 'precision-v1', placeId?: string) =>
  calculateAnalysisOnly({ ...base(birthTime), calculationMode: mode, birthPlaceId: placeId } as any, NOW).birthChart as any;
const yong = (birthTime: string, mode: 'legacy' | 'precision-v1', placeId?: string) =>
  (calculateAnalysisOnly({ ...base(birthTime), calculationMode: mode, birthPlaceId: placeId } as any, NOW).coreAnalysis.usefulGod) as any;
const adjMin = (h: number, m: number, placeId: string | null) =>
  (prepareCalculation({ mode: 'precision-v1', solarYear: 1995, solarMonth: 6, solarDay: 22, hour: h, minute: m, birthTimeConfidence: 'exact', birthPlaceId: placeId }).calculationMeta as any).solarTimeAdjustmentMinutes;

describe('edge boundary fixture — 일주는 불변 (자정 경계 미통과)', () => {
  for (const t of ['17:29', '17:30']) {
    for (const [label, pid] of [['legacy', undefined], ['unknown', undefined], ['서울', 'KR-11'], ['대전', 'KR-30'], ['부산', 'KR-26']] as const) {
      it(`${t} ${label}: 일주 = 갑신`, () => {
        const mode = label === 'legacy' ? 'legacy' : 'precision-v1';
        expect(chart(t, mode as any, pid).day).toBe('갑신');
      });
    }
  }
});

describe('edge boundary fixture — 시주 申/酉 경계 갈림', () => {
  it('legacy: 17:29 와 17:30 모두 계유(酉) — 지역 무관, 보정 없음', () => {
    expect(chart('17:29', 'legacy').hour).toBe('계유');
    expect(chart('17:30', 'legacy').hour).toBe('계유');
  });
  it('서울(-32분): 17:29·17:30 둘 다 임신(申)으로 시프트', () => {
    expect(chart('17:29', 'precision-v1', 'KR-11').hour).toBe('임신');
    expect(chart('17:30', 'precision-v1', 'KR-11').hour).toBe('임신');
  });
  it('대전(-30분, 실 fixture 지역): 17:29→임신(申) vs 17:30→계유(酉) — 1분차 split', () => {
    expect(chart('17:29', 'precision-v1', 'KR-30').hour).toBe('임신'); // 16:59 → 申
    expect(chart('17:30', 'precision-v1', 'KR-30').hour).toBe('계유'); // 17:00 → 酉
  });
  it('부산(-24분): 보정이 작아 둘 다 계유(酉) 유지', () => {
    expect(chart('17:29', 'precision-v1', 'KR-26').hour).toBe('계유');
    expect(chart('17:30', 'precision-v1', 'KR-26').hour).toBe('계유');
  });
  it('지역 unknown: 보정 미적용 → legacy와 동일(계유)', () => {
    expect(chart('17:29', 'precision-v1').hour).toBe('계유');
    expect(chart('17:30', 'precision-v1').hour).toBe('계유');
  });
});

describe('edge boundary fixture — 지역별 태양시 보정량(경도 기반)', () => {
  it('서울 -32 / 대전 -30 / 부산 -24 / unknown 미적용(null)', () => {
    expect(adjMin(17, 29, 'KR-11')).toBe(-32);
    expect(adjMin(17, 29, 'KR-30')).toBe(-30);
    expect(adjMin(17, 29, 'KR-26')).toBe(-24);
    expect(adjMin(17, 29, null)).toBeNull(); // 지역 unknown → 보정 미적용
  });
});

describe('edge boundary fixture — calc 용신은 水로 견고 (수/화 갈림 미발생)', () => {
  // 현 엔진 거동 문서화: 여름(午월) 조후 + 신약 → 用 水 / 喜 木 / 忌 火.
  // (실서비스 용신은 LLM-primary 라 이 calc fallback 과 다를 수 있음 — 한계는 리포트 참조.)
  for (const t of ['17:29', '17:30']) {
    for (const [label, pid] of [['unknown', undefined], ['서울', 'KR-11'], ['대전', 'KR-30'], ['부산', 'KR-26']] as const) {
      it(`${t} ${label}: 용신 水 / 기신 火 (calc)`, () => {
        const u = yong(t, 'precision-v1', pid);
        expect(u.primaryUseful.value).toBe('water');
        expect(u.unfavorable[0]).toBe('fire');
      });
    }
  }
});
