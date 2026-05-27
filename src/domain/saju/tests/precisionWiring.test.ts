// Precision V1 — Phase 5: 배선 테스트.
// legacy byte-identical 최우선 + precision opt-in 동작 검증.
import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import type { BirthInput } from '../calendar/normalizeBirthInput';
import { getYongsinCacheKey } from '@/lib/saju-prompt-builder';

const NOW = new Date('2026-05-27T00:00:00Z');
const BASE: BirthInput = {
  name: 't', gender: 'female', calendarType: 'solar',
  birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};

describe('P5 legacy byte-identical', () => {
  it('mode 미지정 == mode legacy (deep-equal) + calculationMeta 미부착', () => {
    const a = calculateAnalysisOnly(BASE, NOW);
    const b = calculateAnalysisOnly({ ...BASE, calculationMode: 'legacy' }, NOW);
    expect(b).toEqual(a);
    expect(a.calculationMeta).toBeUndefined();
    expect(b.calculationMeta).toBeUndefined();
  });
  it('legacy는 birthPlaceId가 있어도 무시 (precision 아님 → 보정/메타 없음)', () => {
    const a = calculateAnalysisOnly(BASE, NOW);
    const c = calculateAnalysisOnly({ ...BASE, calculationMode: 'legacy', birthPlaceId: 'KR-11' }, NOW);
    expect(c).toEqual(a);
  });
});

describe('P5 precision-v1 — calculationMeta', () => {
  it('지역 known(서울) → version precision-v1, 보정 -32, 조자시', () => {
    const p = calculateAnalysisOnly({ ...BASE, calculationMode: 'precision-v1', birthPlaceId: 'KR-11' }, NOW);
    expect(p.calculationMeta?.calculationVersion).toBe('precision-v1');
    expect(p.calculationMeta?.solarTimeAdjustmentApplied).toBe(true);
    expect(p.calculationMeta?.solarTimeAdjustmentMinutes).toBe(-32);
    expect(p.calculationMeta?.ziHourPolicy).toBe('zi-midnight-day-boundary');
    expect(p.calculationMeta?.birthPlacePrecision).toBe('region');
    expect(p.calculationMeta?.timeZoneId).toBe('Asia/Seoul');
  });
  it('지역 unknown → 보정 미적용, 그러나 조자시 정책은 유지', () => {
    const pu = calculateAnalysisOnly({ ...BASE, calculationMode: 'precision-v1' }, NOW);
    expect(pu.calculationMeta?.calculationVersion).toBe('precision-v1');
    expect(pu.calculationMeta?.solarTimeAdjustmentApplied).toBe(false);
    expect(pu.calculationMeta?.birthPlacePrecision).toBe('unknown');
    expect(pu.calculationMeta?.ziHourPolicy).toBe('zi-midnight-day-boundary');
  });
});

describe('P5 precision-v1 — 자시 정책(조자시) 효과', () => {
  it('23:30 출생: legacy(야자시)는 일주 익일 시프트, precision(조자시)은 시프트 없음 → dayMaster 다름', () => {
    const leg = calculateAnalysisOnly({ ...BASE, birthTime: '23:30' }, NOW);
    const pre = calculateAnalysisOnly({ ...BASE, birthTime: '23:30', calculationMode: 'precision-v1' }, NOW);
    expect(pre.birthChart.dayMaster).not.toBe(leg.birthChart.dayMaster);
  });
  it('12:00 출생(자시 무관) + 지역unknown precision: 일주는 legacy와 동일 (시프트 비관여)', () => {
    const leg = calculateAnalysisOnly({ ...BASE, birthTime: '12:00' }, NOW);
    const pre = calculateAnalysisOnly({ ...BASE, birthTime: '12:00', calculationMode: 'precision-v1' }, NOW);
    expect(pre.birthChart.day).toBe(leg.birthChart.day);  // 정오 → 어느 정책이든 일주 동일
  });
  it('지역known 태양시 보정으로 시주가 바뀔 수 있음: 서울 11:10 precision', () => {
    const preNoPlace = calculateAnalysisOnly({ ...BASE, birthTime: '11:10', calculationMode: 'precision-v1' }, NOW);
    const prePlace = calculateAnalysisOnly({ ...BASE, birthTime: '11:10', calculationMode: 'precision-v1', birthPlaceId: 'KR-11' }, NOW);
    // 11:10 → -32 → 10:38 (오시→사시) : 시주가 달라져야 함
    expect(prePlace.birthChart.hour).not.toBe(preNoPlace.birthChart.hour);
  });
});

describe('P5 mode 결정 우선순위 (env / input)', () => {
  it('env SAJU_CALC_MODE=precision-v1 → opt-in 적용', () => {
    const prev = process.env.SAJU_CALC_MODE;
    try {
      process.env.SAJU_CALC_MODE = 'precision-v1';
      const e = calculateAnalysisOnly(BASE, NOW);
      expect(e.calculationMeta?.calculationVersion).toBe('precision-v1');
      // input.calculationMode가 env보다 우선
      const o = calculateAnalysisOnly({ ...BASE, calculationMode: 'legacy' }, NOW);
      expect(o.calculationMeta).toBeUndefined();
    } finally {
      if (prev === undefined) delete process.env.SAJU_CALC_MODE;
      else process.env.SAJU_CALC_MODE = prev;
    }
  });
  it('env 없으면 기본 legacy', () => {
    const prev = process.env.SAJU_CALC_MODE;
    try {
      delete process.env.SAJU_CALC_MODE;
      const r = calculateAnalysisOnly(BASE, NOW);
      expect(r.calculationMeta).toBeUndefined();
    } finally {
      if (prev !== undefined) process.env.SAJU_CALC_MODE = prev;
    }
  });
});

describe('P5 yongsin 캐시 키 분리', () => {
  const sj = { yStem: '갑', yBranch: '자', mStem: '을', mBranch: '축', dStem: '병', dBranch: '인', hStem: '정', hBranch: '묘' } as never;
  it('legacy(미지정/legacy) 키는 기존과 동일', () => {
    const base = 'yongsin:갑-자-을-축-병-인-정-묘';
    expect(getYongsinCacheKey(sj)).toBe(base);
    expect(getYongsinCacheKey(sj, { calculationVersion: 'legacy' })).toBe(base);
  });
  it('precision-v1은 별도 suffix 키 (legacy 재사용 안 함)', () => {
    const base = 'yongsin:갑-자-을-축-병-인-정-묘';
    const k = getYongsinCacheKey(sj, {
      calculationVersion: 'precision-v1', birthPlaceId: 'KR-11',
      utcOffsetMinutes: 540, solarTimeAdjustmentMinutes: -32, ziHourPolicy: 'zi-midnight-day-boundary',
    });
    expect(k).not.toBe(base);
    expect(k.startsWith(base + '::')).toBe(true);
    expect(k).toContain('precision-v1');
    expect(k).toContain('KR-11');
  });
});
