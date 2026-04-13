import { describe, test, expect } from 'vitest';
import { calcSaju, isBeforeIpchun } from '@/lib/saju-calc';

describe('isBeforeIpchun — year-aware ipchun boundary', () => {
  // 2025: ipchun is Feb 3
  test('Feb 3, 2025: on ipchun day => NOT before (new year pillar)', () => {
    expect(isBeforeIpchun(2, 3, 2025)).toBe(false);
  });
  test('Feb 2, 2025: one day before ipchun => before (previous year pillar)', () => {
    expect(isBeforeIpchun(2, 2, 2025)).toBe(true);
  });

  // 2024: ipchun is Feb 4
  test('Feb 4, 2024: on ipchun day => NOT before (new year pillar)', () => {
    expect(isBeforeIpchun(2, 4, 2024)).toBe(false);
  });
  test('Feb 3, 2024: one day before ipchun => before (previous year pillar)', () => {
    expect(isBeforeIpchun(2, 3, 2024)).toBe(true);
  });

  // 2017: ipchun is Feb 3
  test('Feb 4, 2017: one day after ipchun => NOT before (new year pillar)', () => {
    expect(isBeforeIpchun(2, 4, 2017)).toBe(false);
  });
  test('Feb 3, 2017: on ipchun day => NOT before (new year pillar)', () => {
    expect(isBeforeIpchun(2, 3, 2017)).toBe(false);
  });
  test('Feb 2, 2017: before ipchun => before (previous year pillar)', () => {
    expect(isBeforeIpchun(2, 2, 2017)).toBe(true);
  });

  // fallback for year outside lookup table (1990 defaults to Feb 4)
  test('Feb 4, 1990 (fallback Feb 4): on ipchun => NOT before', () => {
    expect(isBeforeIpchun(2, 4, 1990)).toBe(false);
  });
  test('Feb 3, 1990 (fallback Feb 4): before ipchun => before', () => {
    expect(isBeforeIpchun(2, 3, 1990)).toBe(true);
  });

  // no year argument still works (backward compat, defaults to Feb 4)
  test('Feb 4, no year: NOT before', () => {
    expect(isBeforeIpchun(2, 4)).toBe(false);
  });
  test('Feb 3, no year: before', () => {
    expect(isBeforeIpchun(2, 3)).toBe(true);
  });
});

describe('calcSaju year pillar — ipchun boundary', () => {
  // 2025: ipchun is Feb 3 — born Feb 3 should use 2025 year pillar
  test('Feb 3, 2025: sajuYear should be 2025 (on ipchun)', () => {
    expect(calcSaju(2025, 2, 3, 0).sajuYear).toBe(2025);
  });
  // Feb 2, 2025: before ipchun — should use 2024 year pillar
  test('Feb 2, 2025: sajuYear should be 2024 (before ipchun)', () => {
    expect(calcSaju(2025, 2, 2, 0).sajuYear).toBe(2024);
  });

  // 2024: ipchun is Feb 4 — born Feb 4 should use 2024 year pillar
  test('Feb 4, 2024: sajuYear should be 2024 (on ipchun)', () => {
    expect(calcSaju(2024, 2, 4, 0).sajuYear).toBe(2024);
  });
  // Feb 3, 2024: before ipchun — should use 2023 year pillar
  test('Feb 3, 2024: sajuYear should be 2023 (before ipchun)', () => {
    expect(calcSaju(2024, 2, 3, 0).sajuYear).toBe(2023);
  });

  // 2017: ipchun is Feb 3 — born Feb 4 (already past ipchun) uses 2017
  test('Feb 4, 2017: sajuYear should be 2017 (past ipchun)', () => {
    expect(calcSaju(2017, 2, 4, 0).sajuYear).toBe(2017);
  });
  // 2017: Feb 3 is ipchun itself — uses 2017
  test('Feb 3, 2017: sajuYear should be 2017 (on ipchun)', () => {
    expect(calcSaju(2017, 2, 3, 0).sajuYear).toBe(2017);
  });
  // 2017: Feb 2 is before ipchun — uses 2016
  test('Feb 2, 2017: sajuYear should be 2016 (before ipchun)', () => {
    expect(calcSaju(2017, 2, 2, 0).sajuYear).toBe(2016);
  });

  // Cross-year comparison: same date Feb 3 differs between 2024 (before) and 2025 (on ipchun)
  test('Feb 3 gives different sajuYear in 2024 vs 2025', () => {
    const y2024 = calcSaju(2024, 2, 3, 0).sajuYear;
    const y2025 = calcSaju(2025, 2, 3, 0).sajuYear;
    expect(y2024).toBe(2023); // before ipchun in 2024
    expect(y2025).toBe(2025); // on ipchun in 2025
    expect(y2024).not.toBe(y2025);
  });
});
