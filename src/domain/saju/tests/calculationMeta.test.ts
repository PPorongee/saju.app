// Precision V1 — Phase 1: calculationMeta 타입/빌더 테스트 (순수, 계산 파이프라인 미배선).
import { describe, it, expect } from 'vitest';
import {
  buildCalculationMeta,
  legacyCalculationMeta,
  ZI_HOUR_POLICY_BY_MODE,
  DEFAULT_CALCULATION_MODE,
  type CalculationMeta,
} from '../calendar/calculationMeta';

describe('P1 calculationMeta — 기본값/정책', () => {
  it('기본 모드는 legacy', () => {
    expect(DEFAULT_CALCULATION_MODE).toBe('legacy');
  });
  it('모드별 자시 정책: legacy=standard-23, precision-v1=zi-midnight-day-boundary', () => {
    expect(ZI_HOUR_POLICY_BY_MODE['legacy']).toBe('standard-23');
    expect(ZI_HOUR_POLICY_BY_MODE['precision-v1']).toBe('zi-midnight-day-boundary');
  });
});

describe('P1 buildCalculationMeta', () => {
  it('자시 정책은 모드에서 강제 도출(인자로 못 덮음)', () => {
    const m = buildCalculationMeta({ mode: 'precision-v1', birthTimeConfidence: 'exact' });
    expect(m.ziHourPolicy).toBe('zi-midnight-day-boundary');
    expect(m.calculationVersion).toBe('precision-v1');
    expect(m.calendarBasis).toBe('solar-term');
  });
  it('지역 known + 태양시 보정 적용 케이스 (서울 -32분 예시)', () => {
    const m = buildCalculationMeta({
      mode: 'precision-v1', birthTimeConfidence: 'exact',
      birthPlacePrecision: 'region', timeZoneId: 'Asia/Seoul',
      utcOffsetMinutes: 540, dstApplied: false,
      solarTimeAdjustmentApplied: true, solarTimeAdjustmentMinutes: -32,
      birthPlaceId: 'KR-11',
    });
    expect(m.solarTimeAdjustmentApplied).toBe(true);
    expect(m.solarTimeAdjustmentMinutes).toBe(-32);
    expect(m.birthPlacePrecision).toBe('region');
    expect(m.birthPlaceId).toBe('KR-11');
    expect(m.utcOffsetMinutes).toBe(540);
  });
  it('지역 unknown → 보정 미적용(adj null), 자시 정책은 동일 유지', () => {
    const m = buildCalculationMeta({
      mode: 'precision-v1', birthTimeConfidence: 'unknown',
      birthPlacePrecision: 'unknown', timeZoneId: 'Asia/Seoul',
      solarTimeAdjustmentApplied: false,
    });
    expect(m.solarTimeAdjustmentApplied).toBe(false);
    expect(m.solarTimeAdjustmentMinutes).toBeNull();
    expect(m.ziHourPolicy).toBe('zi-midnight-day-boundary');
  });
  it('warnings 기본 빈 배열, equationOfTime 기본 null', () => {
    const m = buildCalculationMeta({ mode: 'precision-v1', birthTimeConfidence: 'exact' });
    expect(m.warnings).toEqual([]);
    expect(m.equationOfTimeMinutes).toBeNull();
  });
});

describe('P1 legacyCalculationMeta', () => {
  it('legacy 메타: standard-23, 보정 없음, Asia/Seoul +540', () => {
    const m: CalculationMeta = legacyCalculationMeta('exact');
    expect(m.calculationVersion).toBe('legacy');
    expect(m.ziHourPolicy).toBe('standard-23');
    expect(m.solarTimeAdjustmentApplied).toBe(false);
    expect(m.timeZoneId).toBe('Asia/Seoul');
    expect(m.utcOffsetMinutes).toBe(540);
    expect(m.birthPlacePrecision).toBe('unknown');
    expect(m.birthPlaceId).toBeNull();
  });
});
