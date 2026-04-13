/**
 * GOLDEN FIXTURE TESTS — P0 correctness protection
 *
 * These test known-correct saju results against authoritative 만세력 references.
 * If any of these fail, the saju engine has a correctness regression.
 * DO NOT change expected values without verifying against an authoritative source.
 */
import { describe, it, expect } from 'vitest';
import { calcSaju, validateSajuResult, exactTimeToHourBranch, CG, JJ } from '../saju-calc';

describe('Golden Fixtures — Known Correct 명식', () => {
  // Sexagenary cycle anchors
  it('1984 = 甲子 year (stem=0, branch=0)', () => {
    const s = calcSaju(1984, 6, 15, 12);
    expect(s.yStem).toBe(0);  // 갑
    expect(s.yBranch).toBe(0); // 자
  });

  it('2024 = 甲辰 year (stem=0, branch=4)', () => {
    const s = calcSaju(2024, 6, 15, 12);
    expect(s.yStem).toBe(0);
    expect(s.yBranch).toBe(4);
  });

  it('1990 = 庚午 year (stem=6, branch=6)', () => {
    const s = calcSaju(1990, 6, 15, 12);
    expect(s.yStem).toBe(6);
    expect(s.yBranch).toBe(6);
  });

  it('2025 = 乙巳 year (stem=1, branch=5)', () => {
    const s = calcSaju(2025, 6, 15, 12);
    expect(s.yStem).toBe(1);
    expect(s.yBranch).toBe(5);
  });

  // Stem-branch parity invariant: must always match
  // NOTE: calcSaju expects hour as branch index (0-11), NOT clock hour (0-23)
  // Use exactTimeToHourBranch to convert clock time to branch first
  const testDates = [
    [1940, 3, 15, 4],  // 진시 (07-08)
    [1955, 7, 20, 7],  // 미시 (13-14)
    [1970, 1, 1, 0],   // 자시 (23-00)
    [1985, 12, 31, 0],  // 자시 (23-00)
    [2000, 6, 15, 6],  // 오시 (11-12)
    [2010, 9, 9, 4],   // 진시 (09-10)
    [2020, 2, 4, 3],   // 묘시 (05-06)
    [2025, 4, 8, 8],   // 신시 (15-16)
  ];

  testDates.forEach(([y, m, d, h]) => {
    it(`validates internal consistency for ${y}-${m}-${d} ${h}:00`, () => {
      const s = calcSaju(y, m, d, h);
      const v = validateSajuResult(s);
      expect(v.valid).toBe(true);
      if (!v.valid) console.error(v.errors);
    });
  });
});

describe('Hour Branch Mapping — Standard 만세력 Convention', () => {
  // Each 시 is exactly 2 hours: 자시 23:00-00:59, 축시 01:00-02:59, etc.
  const cases: [number, number, number, string][] = [
    [23, 0, 0, '자시 start'],
    [23, 30, 0, '자시 middle'],
    [23, 59, 0, '자시 end-of-hour'],
    [0, 0, 0, '자시 midnight'],
    [0, 59, 0, '자시 end'],
    [1, 0, 1, '축시 start'],    // This was the bug — old code returned 0 (자시)
    [1, 29, 1, '축시 early'],   // Old code returned 0
    [1, 30, 1, '축시 middle'],
    [2, 59, 1, '축시 end'],
    [3, 0, 2, '인시 start'],
    [4, 59, 2, '인시 end'],
    [5, 0, 3, '묘시 start'],
    [6, 59, 3, '묘시 end'],
    [7, 0, 4, '진시 start'],
    [8, 59, 4, '진시 end'],
    [9, 0, 5, '사시 start'],
    [10, 59, 5, '사시 end'],
    [11, 0, 6, '오시 start'],
    [12, 59, 6, '오시 end'],
    [13, 0, 7, '미시 start'],
    [14, 59, 7, '미시 end'],
    [15, 0, 8, '신시 start'],
    [16, 59, 8, '신시 end'],
    [17, 0, 9, '유시 start'],
    [18, 59, 9, '유시 end'],
    [19, 0, 10, '술시 start'],
    [20, 59, 10, '술시 end'],
    [21, 0, 11, '해시 start'],
    [22, 59, 11, '해시 end'],
  ];

  cases.forEach(([h, m, expected, label]) => {
    it(`${h}:${String(m).padStart(2, '0')} → branch ${expected} (${label})`, () => {
      expect(exactTimeToHourBranch(h, m)).toBe(expected);
    });
  });
});

describe('Invariant: Stem-Branch Parity', () => {
  // In the sexagenary cycle, stem%2 must equal branch%2
  // (yang stems pair with yang branches, yin with yin)
  it('holds for 100 random dates', () => {
    for (let i = 0; i < 100; i++) {
      const y = 1940 + Math.floor(Math.random() * 85);
      const m = 1 + Math.floor(Math.random() * 12);
      const d = 1 + Math.floor(Math.random() * 28);
      const h = Math.floor(Math.random() * 12); // branch index 0-11, NOT clock hour
      const s = calcSaju(y, m, d, h);
      const v = validateSajuResult(s);
      expect(v.valid).toBe(true);
    }
  });
});

describe('입춘 Year Boundary', () => {
  it('2025-02-02 uses 2024 year pillar (甲辰)', () => {
    const s = calcSaju(2025, 2, 2, 12);
    expect(s.yStem).toBe(0);  // 갑 (2024)
    expect(s.yBranch).toBe(4); // 진 (2024)
  });

  it('2025-02-03 uses 2025 year pillar (乙巳) — ipchun is Feb 3 in 2025', () => {
    const s = calcSaju(2025, 2, 3, 12);
    expect(s.yStem).toBe(1);  // 을 (2025)
    expect(s.yBranch).toBe(5); // 사 (2025)
  });

  it('2024-02-03 uses 2023 year pillar (癸卯)', () => {
    const s = calcSaju(2024, 2, 3, 12);
    expect(s.yStem).toBe(9);  // 계 (2023)
    expect(s.yBranch).toBe(3); // 묘 (2023)
  });

  it('2024-02-04 uses 2024 year pillar (甲辰)', () => {
    const s = calcSaju(2024, 2, 4, 12);
    expect(s.yStem).toBe(0);  // 갑 (2024)
    expect(s.yBranch).toBe(4); // 진 (2024)
  });
});
