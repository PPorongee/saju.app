// Precision V1 — Phase 4: precisionAdjust 준비 레이어 테스트 (calculatePillars 미연결).
import { describe, it, expect } from 'vitest';
import { prepareCalculation } from '../calendar/precisionAdjust';

describe('P4 prepareCalculation — legacy', () => {
  it('legacy: 시각 원본 유지 + standard-23 + 보정 없음', () => {
    const r = prepareCalculation({
      mode: 'legacy', solarYear: 1995, solarMonth: 7, solarDay: 6,
      hour: 12, minute: 0, birthTimeConfidence: 'exact', birthPlaceId: 'KR-11',
    });
    expect(r.mode).toBe('legacy');
    expect(r.ziHourPolicy).toBe('standard-23');
    expect(r.adjustedClock).toMatchObject({ year: 1995, month: 7, day: 6, hour: 12, minute: 0 });
    expect(r.calculationMeta.calculationVersion).toBe('legacy');
    expect(r.calculationMeta.solarTimeAdjustmentApplied).toBe(false);
    expect(r.calculationMeta.ziHourPolicy).toBe('standard-23');
  });
});

describe('P4 prepareCalculation — precision-v1', () => {
  it('지역 known(서울) + 시간 known → 태양시 보정(-32), 조자시, meta region', () => {
    const r = prepareCalculation({
      mode: 'precision-v1', solarYear: 1995, solarMonth: 7, solarDay: 6,
      hour: 12, minute: 0, birthTimeConfidence: 'exact', birthPlaceId: 'KR-11',
    });
    expect(r.mode).toBe('precision-v1');
    expect(r.ziHourPolicy).toBe('zi-midnight-day-boundary');
    expect(r.adjustedClock).toMatchObject({ hour: 11, minute: 28 });   // 12:00 - 32
    const m = r.calculationMeta;
    expect(m.calculationVersion).toBe('precision-v1');
    expect(m.birthPlacePrecision).toBe('region');
    expect(m.birthPlaceId).toBe('KR-11');
    expect(m.solarTimeAdjustmentApplied).toBe(true);
    expect(m.solarTimeAdjustmentMinutes).toBe(-32);
    expect(m.timeZoneId).toBe('Asia/Seoul');
    expect(m.utcOffsetMinutes).toBe(540);
  });

  it('해외 도시(LA) + 시간 known → 보정 적용 + city precision + tz America/Los_Angeles', () => {
    const r = prepareCalculation({
      mode: 'precision-v1', solarYear: 1990, solarMonth: 7, solarDay: 1,
      hour: 12, minute: 0, birthTimeConfidence: 'exact', birthPlaceId: 'US-LAX',
    });
    expect(r.calculationMeta.birthPlacePrecision).toBe('city');
    expect(r.calculationMeta.timeZoneId).toBe('America/Los_Angeles');
    expect(r.calculationMeta.solarTimeAdjustmentApplied).toBe(true);
    expect(r.adjustedClock).not.toBeNull();
  });

  it('지역 unknown(미입력) + 시간 known → 표준시 기준, 보정 없음(adj 0), 시각 원본, precision은 zi-midnight', () => {
    const r = prepareCalculation({
      mode: 'precision-v1', solarYear: 2000, solarMonth: 5, solarDay: 5,
      hour: 14, minute: 20, birthTimeConfidence: 'exact', birthPlaceId: null,
    });
    expect(r.ziHourPolicy).toBe('zi-midnight-day-boundary');
    expect(r.adjustedClock).toMatchObject({ hour: 14, minute: 20 });   // 보정 없음
    const m = r.calculationMeta;
    expect(m.birthPlacePrecision).toBe('unknown');
    expect(m.solarTimeAdjustmentApplied).toBe(false);
    expect(m.solarTimeAdjustmentMinutes).toBeNull();
    expect(m.timeZoneId).toBe('Asia/Seoul');
    expect(m.warnings.some(w => w.includes('출생지역 미입력'))).toBe(true);
  });

  it('지역 미해결(존재 안 하는 id) → unknown 취급', () => {
    const r = prepareCalculation({
      mode: 'precision-v1', solarYear: 2000, solarMonth: 5, solarDay: 5,
      hour: 14, minute: 20, birthTimeConfidence: 'exact', birthPlaceId: 'XX-NOPE',
    });
    expect(r.calculationMeta.birthPlacePrecision).toBe('unknown');
    expect(r.calculationMeta.solarTimeAdjustmentApplied).toBe(false);
  });

  it('시간 unknown → adjustedClock null, 보정 미적용, warning에 시간미상', () => {
    const r = prepareCalculation({
      mode: 'precision-v1', solarYear: 1988, solarMonth: 3, solarDay: 15,
      hour: null, minute: 0, birthTimeConfidence: 'unknown', birthPlaceId: 'KR-11',
    });
    expect(r.adjustedClock).toBeNull();
    expect(r.calculationMeta.solarTimeAdjustmentApplied).toBe(false);
    expect(r.calculationMeta.warnings.some(w => w.includes('출생시간 미상'))).toBe(true);
    // 시간 미상이어도 지역 known이면 tz/offset 메타는 산출
    expect(r.calculationMeta.timeZoneId).toBe('Asia/Seoul');
  });

  it('국가 fallback(일본) → precision=country + warning', () => {
    const r = prepareCalculation({
      mode: 'precision-v1', solarYear: 1990, solarMonth: 6, solarDay: 1,
      hour: 9, minute: 0, birthTimeConfidence: 'exact', birthPlaceId: 'C-JP',
    });
    expect(r.calculationMeta.birthPlacePrecision).toBe('country');
    expect(r.calculationMeta.timeZoneId).toBe('Asia/Tokyo');
    expect(r.calculationMeta.warnings.some(w => w.includes('국가 단위'))).toBe(true);
  });
});
