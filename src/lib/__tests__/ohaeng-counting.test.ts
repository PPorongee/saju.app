/**
 * 오행 counting convention tests — P0 correctness
 *
 * Convention: Full count = 4 천간 + all 지장간 from 4 지지
 * Reference: 연해자평, 자평진전
 */
import { describe, it, expect } from 'vitest';
import {
  calcSaju, getOhCount, getOhCountFull, getJijanggan,
  JIJANGGAN, OH_CG, CG,
} from '../saju-calc';

describe('지장간 (Hidden Stems) Table', () => {
  it('子 contains 壬, 癸 (ground-truth verified)', () => {
    expect(JIJANGGAN[0]).toEqual([8, 9]); // 임, 계
    expect(OH_CG[8]).toBe('수');
    expect(OH_CG[9]).toBe('수');
  });

  it('丑 contains 癸, 辛, 己', () => {
    expect(JIJANGGAN[1]).toEqual([9, 7, 5]); // 계, 신, 기
  });

  it('寅 contains 戊, 丙, 甲', () => {
    expect(JIJANGGAN[2]).toEqual([4, 2, 0]); // 무, 병, 갑
  });

  it('卯 contains 乙 only', () => {
    expect(JIJANGGAN[3]).toEqual([1]); // 을
  });

  it('辰 contains 乙, 癸, 戊', () => {
    expect(JIJANGGAN[4]).toEqual([1, 9, 4]); // 을, 계, 무
  });

  it('巳 contains 戊, 庚, 丙', () => {
    expect(JIJANGGAN[5]).toEqual([4, 6, 2]); // 무, 경, 병
  });

  it('午 contains 己, 丁', () => {
    expect(JIJANGGAN[6]).toEqual([5, 3]); // 기, 정
  });

  it('未 contains 丁, 乙, 己', () => {
    expect(JIJANGGAN[7]).toEqual([3, 1, 5]); // 정, 을, 기
  });

  it('申 contains 戊, 壬, 庚', () => {
    expect(JIJANGGAN[8]).toEqual([4, 8, 6]); // 무, 임, 경
  });

  it('酉 contains 辛 only', () => {
    expect(JIJANGGAN[9]).toEqual([7]); // 신
  });

  it('戌 contains 辛, 丁, 戊', () => {
    expect(JIJANGGAN[10]).toEqual([7, 3, 4]); // 신, 정, 무
  });

  it('亥 contains 戊, 甲, 壬 (ground-truth verified)', () => {
    expect(JIJANGGAN[11]).toEqual([4, 0, 8]); // 무, 갑, 임
  });

  it('all 12 branches have at least 1 hidden stem', () => {
    for (let i = 0; i < 12; i++) {
      expect(JIJANGGAN[i].length).toBeGreaterThanOrEqual(1);
      expect(JIJANGGAN[i].length).toBeLessThanOrEqual(3);
    }
  });

  it('all hidden stem indices are valid (0-9)', () => {
    for (let i = 0; i < 12; i++) {
      for (const stem of JIJANGGAN[i]) {
        expect(stem).toBeGreaterThanOrEqual(0);
        expect(stem).toBeLessThanOrEqual(9);
      }
    }
  });
});

describe('getOhCount — Surface 오행 count (visible 8 characters)', () => {
  it('surface total is exactly 8 with hour pillar', () => {
    const saju = calcSaju(1990, 3, 15, 5);
    const surface = getOhCount(saju);
    const surfaceTotal = Object.values(surface).reduce((a, b) => a + b, 0);
    expect(surfaceTotal).toBe(8);
  });

  it('surface total is exactly 6 without hour pillar', () => {
    const saju = calcSaju(1990, 3, 15, -1);
    const surface = getOhCount(saju);
    const surfaceTotal = Object.values(surface).reduce((a, b) => a + b, 0);
    expect(surfaceTotal).toBe(6);
  });
});

describe('getOhCountFull — Full 오행 count with 지장간', () => {
  it('full count total is higher than surface total', () => {
    const saju = calcSaju(1990, 3, 15, 5); // 사시
    const surface = getOhCount(saju);
    const full = getOhCountFull(saju);
    const surfaceTotal = Object.values(surface).reduce((a, b) => a + b, 0);
    const fullTotal = Object.values(full).reduce((a, b) => a + b, 0);
    expect(fullTotal).toBeGreaterThan(surfaceTotal);
  });

  it('includes all 5 elements in result', () => {
    const saju = calcSaju(1990, 3, 15, 5);
    const full = getOhCountFull(saju);
    expect(full).toHaveProperty('목');
    expect(full).toHaveProperty('화');
    expect(full).toHaveProperty('토');
    expect(full).toHaveProperty('금');
    expect(full).toHaveProperty('수');
  });

  it('without hour pillar, full count = 3 stems + 지장간 from 3 branches', () => {
    const saju = calcSaju(1990, 3, 15, -1);
    const full = getOhCountFull(saju);
    const total = Object.values(full).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(6);
    expect(total).toBeLessThanOrEqual(12);
  });

  it('with hour pillar, full count = 4 stems + 지장간 from 4 branches', () => {
    const saju = calcSaju(1990, 3, 15, 5);
    const full = getOhCountFull(saju);
    const total = Object.values(full).reduce((a, b) => a + b, 0);
    expect(total).toBeGreaterThanOrEqual(8);
    expect(total).toBeLessThanOrEqual(16);
  });

  it('is deterministic for same input', () => {
    const saju = calcSaju(1985, 7, 20, 7);
    const r1 = getOhCountFull(saju);
    const r2 = getOhCountFull(saju);
    expect(r1).toEqual(r2);
  });
});

describe('getJijanggan helper', () => {
  it('returns hidden stems for valid branch', () => {
    expect(getJijanggan(0)).toEqual([8, 9]); // 子 = 壬癸 (ground-truth)
    expect(getJijanggan(2)).toEqual([4, 2, 0]); // 寅 = 戊丙甲
  });

  it('returns empty for invalid branch', () => {
    expect(getJijanggan(-1)).toEqual([]);
    expect(getJijanggan(12)).toEqual([]);
  });
});

describe('Surface vs Full count comparison', () => {
  it('surface count always <= full count for each element', () => {
    // Test 20 different dates
    const dates = [
      [1940, 5, 10, 3], [1955, 8, 22, 7], [1970, 1, 1, 0],
      [1980, 11, 15, 9], [1990, 3, 15, 5], [1995, 6, 30, 2],
      [2000, 12, 25, 11], [2005, 4, 8, 6], [2010, 9, 17, 4],
      [2020, 2, 29, 1],
    ];
    for (const [y, m, d, h] of dates) {
      const saju = calcSaju(y, m, d, h);
      const surface = getOhCount(saju);
      const full = getOhCountFull(saju);
      for (const element of ['목', '화', '토', '금', '수']) {
        expect(full[element]).toBeGreaterThanOrEqual(surface[element]);
      }
    }
  });
});
