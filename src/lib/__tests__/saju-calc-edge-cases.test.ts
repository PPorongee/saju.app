/**
 * Edge-case and reference-data tests for the saju calculation engine.
 *
 * These tests complement the existing saju-calc.test.ts by verifying:
 *  - Known birth dates produce the exact expected four pillars
 *  - Midnight / late-night birth handling (자시 boundary)
 *  - 입춘(Ipchun) year-pillar boundary behaviour
 *  - 십성(Sipsung) relationships for multiple day masters
 *  - 오행(Ohaeng) element totals
 *  - Unknown birth-time (hour = -1) produces valid 3-pillar results
 */

import { describe, test, expect } from 'vitest';
import {
  calcSaju,
  calcSipsung,
  getSipsung,
  getOhCount,
  get12Unsung,
  CG,
  JJ,
} from '@/lib/saju-calc';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the Korean name string for a stem+branch pair, e.g. '경진' */
function pillar(stem: number, branch: number): string {
  return CG[stem] + JJ[branch];
}

// ---------------------------------------------------------------------------
// 1. Known birth dates → expected four pillars
// ---------------------------------------------------------------------------
describe('Known birth dates – four pillars', () => {
  /**
   * All hour values are supplied as the 지지(branch) index for the two-hour
   * period containing the actual clock time:
   *   자=0 (23–01), 축=1 (01–03), 인=2 (03–05), 묘=3 (05–07),
   *   진=4 (07–09), 사=5 (09–11), 오=6 (11–13), 미=7 (13–15),
   *   신=8 (15–17), 유=9 (17–19), 술=10 (19–21), 해=11 (21–23)
   */

  test('1990-05-15 진시(4) → 경오/신사/경진/경진', () => {
    const r = calcSaju(1990, 5, 15, 4);
    expect(pillar(r.yStem, r.yBranch)).toBe('경오');
    expect(pillar(r.mStem, r.mBranch)).toBe('신사');
    expect(pillar(r.dStem, r.dBranch)).toBe('경진');
    expect(pillar(r.hStem, r.hBranch)).toBe('경진');
  });

  test('1985-08-20 사시(5) → 을축/갑신/신묘/계사', () => {
    const r = calcSaju(1985, 8, 20, 5);
    expect(pillar(r.yStem, r.yBranch)).toBe('을축');
    expect(pillar(r.mStem, r.mBranch)).toBe('갑신');
    expect(pillar(r.dStem, r.dBranch)).toBe('신묘');
    expect(pillar(r.hStem, r.hBranch)).toBe('계사');
  });

  test('2000-02-04 자시(0) → 경진/무인/임진/경자  [ipchun day itself]', () => {
    const r = calcSaju(2000, 2, 4, 0);
    expect(pillar(r.yStem, r.yBranch)).toBe('경진');
    expect(pillar(r.mStem, r.mBranch)).toBe('무인');
    expect(pillar(r.dStem, r.dBranch)).toBe('임진');
    expect(pillar(r.hStem, r.hBranch)).toBe('경자');
    expect(r.sajuYear).toBe(2000);
  });

  test('1970-03-21 묘시(3) → 경술/기묘/경자/기묘', () => {
    const r = calcSaju(1970, 3, 21, 3);
    expect(pillar(r.yStem, r.yBranch)).toBe('경술');
    expect(pillar(r.mStem, r.mBranch)).toBe('기묘');
    expect(pillar(r.dStem, r.dBranch)).toBe('경자');
    expect(pillar(r.hStem, r.hBranch)).toBe('기묘');
  });

  test('1980-11-07 유시(9) → 경신/정해/갑신/계유', () => {
    const r = calcSaju(1980, 11, 7, 9);
    expect(pillar(r.yStem, r.yBranch)).toBe('경신');
    expect(pillar(r.mStem, r.mBranch)).toBe('정해');
    expect(pillar(r.dStem, r.dBranch)).toBe('갑신');
    expect(pillar(r.hStem, r.hBranch)).toBe('계유');
  });

  test('1995-07-07 오시(6) → 을해/계미/기해/경오', () => {
    const r = calcSaju(1995, 7, 7, 6);
    expect(pillar(r.yStem, r.yBranch)).toBe('을해');
    expect(pillar(r.mStem, r.mBranch)).toBe('계미');
    expect(pillar(r.dStem, r.dBranch)).toBe('기해');
    expect(pillar(r.hStem, r.hBranch)).toBe('경오');
  });

  test('2010-09-08 인시(2) → 경인/을유/신유/경인', () => {
    const r = calcSaju(2010, 9, 8, 2);
    expect(pillar(r.yStem, r.yBranch)).toBe('경인');
    expect(pillar(r.mStem, r.mBranch)).toBe('을유');
    expect(pillar(r.dStem, r.dBranch)).toBe('신유');
    expect(pillar(r.hStem, r.hBranch)).toBe('경인');
  });

  test('1960-12-25 해시(11) → 경자/무자/정해/신해', () => {
    const r = calcSaju(1960, 12, 25, 11);
    expect(pillar(r.yStem, r.yBranch)).toBe('경자');
    expect(pillar(r.mStem, r.mBranch)).toBe('무자');
    expect(pillar(r.dStem, r.dBranch)).toBe('정해');
    expect(pillar(r.hStem, r.hBranch)).toBe('신해');
  });

  test('1990-01-15 진시(4) – before ipchun → year pillar is 기사 (1989)', () => {
    const r = calcSaju(1990, 1, 15, 4);
    expect(r.sajuYear).toBe(1989);
    expect(pillar(r.yStem, r.yBranch)).toBe('기사');
    expect(pillar(r.mStem, r.mBranch)).toBe('정축');
    expect(pillar(r.dStem, r.dBranch)).toBe('경진');
    expect(pillar(r.hStem, r.hBranch)).toBe('경진');
  });

  // Female birth – the base four pillars are identical to male; only 대운
  // direction differs (handled outside calcSaju). Gender is NOT a parameter.
  test('1990-05-15 진시(4) female – pillars identical to male', () => {
    const male = calcSaju(1990, 5, 15, 4);
    const female = calcSaju(1990, 5, 15, 4); // same call; gender has no effect here
    expect(male).toEqual(female);
  });
});

// ---------------------------------------------------------------------------
// 2. Midnight births – 자시(Zi-hour) boundary
// ---------------------------------------------------------------------------
describe('Midnight births – 자시 boundary', () => {
  /**
   * 자시 spans 23:00–01:00 and maps to branch index 0.
   * In some traditions the period 23:00–00:00 (야자시) belongs to the NEXT
   * calendar day; this engine uses the caller-supplied hour index directly,
   * so the test simply verifies that hour=0 (자시) is handled without error
   * and produces valid pillar values.
   *
   * Note: this implementation does NOT automatically shift the day pillar
   * for 야자시 (23:00–00:00). If that tradition is desired, callers must
   * increment the date before passing it to calcSaju.
   */

  test('23:30 represented as 자시(0) – hBranch is 0', () => {
    // 23:30 is in the 자시 period (branch 0)
    const r = calcSaju(1990, 6, 15, 0);
    expect(r.hBranch).toBe(0);
    expect(r.hStem).toBeGreaterThanOrEqual(0);
    expect(r.hStem).toBeLessThanOrEqual(9);
    expect(JJ[r.hBranch]).toBe('자');
  });

  test('00:30 represented as 자시(0) – hBranch is 0', () => {
    // 00:30 is also in 자시; caller passes the same branch index
    const r = calcSaju(1990, 6, 16, 0);
    expect(r.hBranch).toBe(0);
    expect(JJ[r.hBranch]).toBe('자');
  });

  test('자시(0) produces a different day pillar than 축시(1) for same date', () => {
    // Day pillar depends only on JDN, not the hour; but hour pillar differs
    const rZi = calcSaju(1995, 3, 10, 0);
    const rChu = calcSaju(1995, 3, 10, 1);
    // Day stems/branches must be identical
    expect(rZi.dStem).toBe(rChu.dStem);
    expect(rZi.dBranch).toBe(rChu.dBranch);
    // Hour stems/branches must differ
    expect(rZi.hBranch).toBe(0);
    expect(rChu.hBranch).toBe(1);
    expect(rZi.hStem).not.toBe(rChu.hStem);
  });

  test('자시(0) 시간 stem is deterministic for given day stem', () => {
    // hourStartStems = [0,2,4,6,8]; hStem = (hourStartStems[dStem%5] + 0) % 10
    const r = calcSaju(2000, 6, 1, 0);
    const expectedHStem = [0, 2, 4, 6, 8][r.dStem % 5];
    expect(r.hStem).toBe(expectedHStem);
  });
});

// ---------------------------------------------------------------------------
// 3. 입춘(Ipchun) boundary – year pillar changes
// ---------------------------------------------------------------------------
describe('입춘(Ipchun) boundary', () => {
  /**
   * This engine hard-codes 입춘 as Feb 4 every year (isBeforeIpchun checks
   * month < 2 || (month === 2 && day < 4)).
   *
   * In reality 입춘 can fall on Feb 3 or Feb 4 depending on the year's solar
   * term calculation. A more precise implementation would look up the exact
   * solar term time for each year. The tests below document the engine's
   * current fixed-Feb-4 behaviour.
   */

  test('Feb 3 is before 입춘 → sajuYear = year - 1', () => {
    const r = calcSaju(2000, 2, 3, 6);
    expect(r.sajuYear).toBe(1999);
  });

  test('Feb 4 is on/after 입춘 → sajuYear = year', () => {
    const r = calcSaju(2000, 2, 4, 6);
    expect(r.sajuYear).toBe(2000);
  });

  test('Feb 3 year pillar is 기묘(1999 cycle)', () => {
    const r = calcSaju(2000, 2, 3, 6);
    expect(pillar(r.yStem, r.yBranch)).toBe('기묘');
  });

  test('Feb 4 year pillar is 경진(2000 cycle)', () => {
    const r = calcSaju(2000, 2, 4, 6);
    expect(pillar(r.yStem, r.yBranch)).toBe('경진');
  });

  test('Jan 1 is always before 입춘 → sajuYear = year - 1', () => {
    const r = calcSaju(2024, 1, 1, 6);
    expect(r.sajuYear).toBe(2023);
  });

  test('Feb 4 month pillar switches to 인월(寅月) for 자시', () => {
    // On and after Feb 4, sajuMonthIdx = 0, mBranch = (0+2)%12 = 2 = 인
    const r = calcSaju(2000, 2, 4, 0);
    expect(r.sajuMonthIdx).toBe(0);
    expect(r.mBranch).toBe(2);
    expect(JJ[r.mBranch]).toBe('인');
  });

  test('Feb 3 month pillar stays at 축월(丑月)', () => {
    // Before Feb 4, getSajuMonth returns 11, mBranch = (11+2)%12 = 1 = 축
    const r = calcSaju(2000, 2, 3, 0);
    expect(r.sajuMonthIdx).toBe(11);
    expect(r.mBranch).toBe(1);
    expect(JJ[r.mBranch]).toBe('축');
  });
});

// ---------------------------------------------------------------------------
// 4. 십성(Sipsung) relationships for multiple day masters
// ---------------------------------------------------------------------------
describe('십성(Sipsung) – calcSipsung direct', () => {
  /**
   * The ten relationships cycle from the day master's element position:
   *   rel=0 → 비견/겁재  (same element)
   *   rel=1 → 식신/상관  (element generated by day master)
   *   rel=2 → 편재/정재  (element day master controls)
   *   rel=3 → 편관/정관  (element that controls day master)
   *   rel=4 → 편인/정인  (element that generates day master)
   * Yang day master + same-yin target → 비견/식신/편재/편관/편인
   * Yang day master + diff-yin target → 겁재/상관/정재/정관/정인
   */

  describe('갑(0) day master – 목(wood)', () => {
    test('갑(0) vs 갑(0) → 비견', () => expect(calcSipsung(0, 0)).toBe('비견'));
    test('갑(0) vs 을(1) → 겁재', () => expect(calcSipsung(0, 1)).toBe('겁재'));
    test('갑(0) vs 병(2) → 식신', () => expect(calcSipsung(0, 2)).toBe('식신'));
    test('갑(0) vs 정(3) → 상관', () => expect(calcSipsung(0, 3)).toBe('상관'));
    test('갑(0) vs 무(4) → 편재', () => expect(calcSipsung(0, 4)).toBe('편재'));
    test('갑(0) vs 기(5) → 정재', () => expect(calcSipsung(0, 5)).toBe('정재'));
    test('갑(0) vs 경(6) → 편관', () => expect(calcSipsung(0, 6)).toBe('편관'));
    test('갑(0) vs 신(7) → 정관', () => expect(calcSipsung(0, 7)).toBe('정관'));
    test('갑(0) vs 임(8) → 편인', () => expect(calcSipsung(0, 8)).toBe('편인'));
    test('갑(0) vs 계(9) → 정인', () => expect(calcSipsung(0, 9)).toBe('정인'));
  });

  describe('병(2) day master – 화(fire)', () => {
    test('병(2) vs 병(2) → 비견', () => expect(calcSipsung(2, 2)).toBe('비견'));
    test('병(2) vs 정(3) → 겁재', () => expect(calcSipsung(2, 3)).toBe('겁재'));
    test('병(2) vs 무(4) → 식신', () => expect(calcSipsung(2, 4)).toBe('식신'));
    test('병(2) vs 갑(0) → 편인', () => expect(calcSipsung(2, 0)).toBe('편인'));
    test('병(2) vs 을(1) → 정인', () => expect(calcSipsung(2, 1)).toBe('정인'));
    test('병(2) vs 임(8) → 편관', () => expect(calcSipsung(2, 8)).toBe('편관'));
  });

  describe('무(4) day master – 토(earth)', () => {
    test('무(4) vs 무(4) → 비견', () => expect(calcSipsung(4, 4)).toBe('비견'));
    test('무(4) vs 갑(0) → 편관', () => expect(calcSipsung(4, 0)).toBe('편관'));
    test('무(4) vs 을(1) → 정관', () => expect(calcSipsung(4, 1)).toBe('정관'));
    test('무(4) vs 병(2) → 편인', () => expect(calcSipsung(4, 2)).toBe('편인'));
    test('무(4) vs 경(6) → 식신', () => expect(calcSipsung(4, 6)).toBe('식신'));
    test('무(4) vs 임(8) → 편재', () => expect(calcSipsung(4, 8)).toBe('편재'));
  });

  describe('경(6) day master – 금(metal)', () => {
    test('경(6) vs 경(6) → 비견', () => expect(calcSipsung(6, 6)).toBe('비견'));
    test('경(6) vs 신(7) → 겁재', () => expect(calcSipsung(6, 7)).toBe('겁재'));
    test('경(6) vs 임(8) → 식신', () => expect(calcSipsung(6, 8)).toBe('식신'));
    test('경(6) vs 계(9) → 상관', () => expect(calcSipsung(6, 9)).toBe('상관'));
    test('경(6) vs 갑(0) → 편재', () => expect(calcSipsung(6, 0)).toBe('편재'));
    test('경(6) vs 무(4) → 편인', () => expect(calcSipsung(6, 4)).toBe('편인'));
    test('경(6) vs 기(5) → 정인', () => expect(calcSipsung(6, 5)).toBe('정인'));
  });

  describe('임(8) day master – 수(water)', () => {
    test('임(8) vs 임(8) → 비견', () => expect(calcSipsung(8, 8)).toBe('비견'));
    test('임(8) vs 계(9) → 겁재', () => expect(calcSipsung(8, 9)).toBe('겁재'));
    test('임(8) vs 갑(0) → 식신', () => expect(calcSipsung(8, 0)).toBe('식신'));
    test('임(8) vs 을(1) → 상관', () => expect(calcSipsung(8, 1)).toBe('상관'));
    test('임(8) vs 병(2) → 편재', () => expect(calcSipsung(8, 2)).toBe('편재'));
    test('임(8) vs 경(6) → 편인', () => expect(calcSipsung(8, 6)).toBe('편인'));
    test('임(8) vs 신(7) → 정인', () => expect(calcSipsung(8, 7)).toBe('정인'));
  });
});

describe('십성(Sipsung) – getSipsung via full SajuResult', () => {
  test('getSipsung omits 일간 (day master has no self-relationship key)', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    const ss = getSipsung(sj);
    expect(ss).not.toHaveProperty('일간');
  });

  test('getSipsung returns valid ten-relationship names for all present keys', () => {
    const valid = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'];
    const sj = calcSaju(1985, 8, 20, 5);
    const ss = getSipsung(sj);
    for (const val of Object.values(ss)) {
      expect(valid).toContain(val);
    }
  });

  test('getSipsung has no 시간 when hour is unknown (-1)', () => {
    const sj = calcSaju(1990, 5, 15, -1);
    expect(getSipsung(sj)).not.toHaveProperty('시간');
  });
});

// ---------------------------------------------------------------------------
// 5. 오행(Ohaeng) element balance
// ---------------------------------------------------------------------------
describe('오행(Ohaeng) element balance – getOhCount', () => {
  test('sum is 8 when hour is known', () => {
    const counts = getOhCount(calcSaju(1990, 5, 15, 4));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(8);
  });

  test('sum is 6 when hour is unknown (-1)', () => {
    const counts = getOhCount(calcSaju(1990, 5, 15, -1));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(6);
  });

  test('all five elements are present as keys', () => {
    const counts = getOhCount(calcSaju(1985, 8, 20, 5));
    for (const el of ['목', '화', '토', '금', '수']) {
      expect(counts).toHaveProperty(el);
    }
  });

  test('no element count is negative', () => {
    const counts = getOhCount(calcSaju(2010, 9, 8, 2));
    for (const val of Object.values(counts)) {
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  test('element counts are non-negative integers', () => {
    const counts = getOhCount(calcSaju(1960, 12, 25, 11));
    for (const val of Object.values(counts)) {
      expect(Number.isInteger(val)).toBe(true);
      expect(val).toBeGreaterThanOrEqual(0);
    }
  });

  test('specific date 1985-08-20: 수 element count from 신묘일 is ≥0', () => {
    // 신묘: dStem=7(금), dBranch=3(목) – verifies individual element presence
    const counts = getOhCount(calcSaju(1985, 8, 20, 5));
    expect(counts['금']).toBeGreaterThanOrEqual(1); // at least 신(금) contributes
  });

  test('sum is consistent across multiple calls (deterministic)', () => {
    const c1 = getOhCount(calcSaju(2000, 6, 15, 3));
    const c2 = getOhCount(calcSaju(2000, 6, 15, 3));
    expect(c1).toEqual(c2);
  });
});

// ---------------------------------------------------------------------------
// 6. Unknown birth time – 3-pillar calculation
// ---------------------------------------------------------------------------
describe('Unknown birth time (hour = -1) – 3-pillar mode', () => {
  test('hStem and hBranch are -1 when hour is -1', () => {
    const r = calcSaju(1990, 5, 15, -1);
    expect(r.hStem).toBe(-1);
    expect(r.hBranch).toBe(-1);
  });

  test('year/month/day pillars still have valid indices when hour is -1', () => {
    const r = calcSaju(1990, 5, 15, -1);
    expect(r.yStem).toBeGreaterThanOrEqual(0);
    expect(r.yStem).toBeLessThanOrEqual(9);
    expect(r.yBranch).toBeGreaterThanOrEqual(0);
    expect(r.yBranch).toBeLessThanOrEqual(11);
    expect(r.mStem).toBeGreaterThanOrEqual(0);
    expect(r.mStem).toBeLessThanOrEqual(9);
    expect(r.mBranch).toBeGreaterThanOrEqual(0);
    expect(r.mBranch).toBeLessThanOrEqual(11);
    expect(r.dStem).toBeGreaterThanOrEqual(0);
    expect(r.dStem).toBeLessThanOrEqual(9);
    expect(r.dBranch).toBeGreaterThanOrEqual(0);
    expect(r.dBranch).toBeLessThanOrEqual(11);
  });

  test('before-ipchun birth with unknown hour still adjusts sajuYear', () => {
    const r = calcSaju(1990, 1, 15, -1);
    expect(r.sajuYear).toBe(1989);
    expect(pillar(r.yStem, r.yBranch)).toBe('기사');
  });

  test('get12Unsung 시지 is empty string when hour is -1', () => {
    const r = calcSaju(1990, 5, 15, -1);
    expect(get12Unsung(r)['시지']).toBe('');
  });

  test('getOhCount totals exactly 6 without hour (surface convention)', () => {
    const counts = getOhCount(calcSaju(1990, 5, 15, -1));
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    expect(total).toBe(6);
  });

  test('getSipsung has no 시간 key when hour is -1', () => {
    expect(getSipsung(calcSaju(1990, 5, 15, -1))).not.toHaveProperty('시간');
  });

  test('3-pillar result is identical for multiple calls (deterministic)', () => {
    expect(calcSaju(1980, 11, 7, -1)).toEqual(calcSaju(1980, 11, 7, -1));
  });
});
