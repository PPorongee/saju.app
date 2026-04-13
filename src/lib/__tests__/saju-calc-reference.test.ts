/**
 * Comprehensive reference-verification tests for the saju calculation engine.
 *
 * All expected values are derived by running the engine's own formulas (not an
 * external almanac), so the engine is the single source of truth. The tests
 * lock in deterministic output and guard against regressions.
 *
 * Coverage:
 *  1. Four-pillar verification – 30+ birth dates across decades (1940s–2026)
 *  2. 십성(Sipsung) – all ten relationships for every yin/yang day-master pair
 *  3. 신살(Shinsal) – 도화살, 역마살, 화개살 pattern verification
 *  4. 오행(Ohaeng) balance – element counts for specific charts
 *  5. Unknown birth time (hour = -1) – 3-pillar mode
 */

import { describe, test, expect } from 'vitest';
import {
  calcSaju,
  calcSipsung,
  getSipsung,
  calcShinsal,
  getOhCount,
  get12Unsung,
  CG,
  JJ,
} from '@/lib/saju-calc';

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

/** Build the Korean pillar string, e.g. '경오'. */
function p(stem: number, branch: number): string {
  return CG[stem] + JJ[branch];
}

// ---------------------------------------------------------------------------
// 1. Four-pillar verification
// ---------------------------------------------------------------------------
describe('Four-pillar verification – 1940s', () => {
  test('1945-08-15 오시(6) → 을유/갑신/병진/갑오', () => {
    const r = calcSaju(1945, 8, 15, 6);
    expect(p(r.yStem, r.yBranch)).toBe('을유');
    expect(p(r.mStem, r.mBranch)).toBe('갑신');
    expect(p(r.dStem, r.dBranch)).toBe('병진');
    expect(p(r.hStem, r.hBranch)).toBe('갑오');
    expect(r.sajuYear).toBe(1945);
  });

  test('1948-03-20 묘시(3) → 무자/을묘/갑진/정묘', () => {
    const r = calcSaju(1948, 3, 20, 3);
    expect(p(r.yStem, r.yBranch)).toBe('무자');
    expect(p(r.mStem, r.mBranch)).toBe('을묘');
    expect(p(r.dStem, r.dBranch)).toBe('갑진');
    expect(p(r.hStem, r.hBranch)).toBe('정묘');
    expect(r.sajuYear).toBe(1948);
  });

  test('1943-01-15 묘시(3) – before ipchun → sajuYear=1942, 임오/계축/계유/을묘', () => {
    const r = calcSaju(1943, 1, 15, 3);
    expect(r.sajuYear).toBe(1942);
    expect(p(r.yStem, r.yBranch)).toBe('임오');
    expect(p(r.mStem, r.mBranch)).toBe('계축');
    expect(p(r.dStem, r.dBranch)).toBe('계유');
    expect(p(r.hStem, r.hBranch)).toBe('을묘');
  });
});

describe('Four-pillar verification – 1950s', () => {
  test('1950-06-25 사시(9) → 경인/임오/신묘/정유', () => {
    const r = calcSaju(1950, 6, 25, 9);
    expect(p(r.yStem, r.yBranch)).toBe('경인');
    expect(p(r.mStem, r.mBranch)).toBe('임오');
    expect(p(r.dStem, r.dBranch)).toBe('신묘');
    expect(p(r.hStem, r.hBranch)).toBe('정유');
    expect(r.sajuYear).toBe(1950);
  });

  test('1951-03-21 오시(6) → 신묘/신묘/경신/임오', () => {
    const r = calcSaju(1951, 3, 21, 6);
    expect(p(r.yStem, r.yBranch)).toBe('신묘');
    expect(p(r.mStem, r.mBranch)).toBe('신묘');
    expect(p(r.dStem, r.dBranch)).toBe('경신');
    expect(p(r.hStem, r.hBranch)).toBe('임오');
  });

  test('1955-11-11 인시(2) → 을미/정해/병자/경인', () => {
    const r = calcSaju(1955, 11, 11, 2);
    expect(p(r.yStem, r.yBranch)).toBe('을미');
    expect(p(r.mStem, r.mBranch)).toBe('정해');
    expect(p(r.dStem, r.dBranch)).toBe('병자');
    expect(p(r.hStem, r.hBranch)).toBe('경인');
  });

  test('1957-04-10 신시(8) → 정유/갑진/임자/무신', () => {
    const r = calcSaju(1957, 4, 10, 8);
    expect(p(r.yStem, r.yBranch)).toBe('정유');
    expect(p(r.mStem, r.mBranch)).toBe('갑진');
    expect(p(r.dStem, r.dBranch)).toBe('임자');
    expect(p(r.hStem, r.hBranch)).toBe('무신');
  });
});

describe('Four-pillar verification – 1960s', () => {
  test('1961-05-16 사시(5) → 신축/계사/기유/기사', () => {
    const r = calcSaju(1961, 5, 16, 5);
    expect(p(r.yStem, r.yBranch)).toBe('신축');
    expect(p(r.mStem, r.mBranch)).toBe('계사');
    expect(p(r.dStem, r.dBranch)).toBe('기유');
    expect(p(r.hStem, r.hBranch)).toBe('기사');
  });

  test('1963-12-17 미시(7) → 계묘/갑자/갑오/신미', () => {
    const r = calcSaju(1963, 12, 17, 7);
    expect(p(r.yStem, r.yBranch)).toBe('계묘');
    expect(p(r.mStem, r.mBranch)).toBe('갑자');
    expect(p(r.dStem, r.dBranch)).toBe('갑오');
    expect(p(r.hStem, r.hBranch)).toBe('신미');
  });

  test('1965-09-03 자시(0) → 을사/갑신/경신/병자', () => {
    const r = calcSaju(1965, 9, 3, 0);
    expect(p(r.yStem, r.yBranch)).toBe('을사');
    expect(p(r.mStem, r.mBranch)).toBe('갑신');
    expect(p(r.dStem, r.dBranch)).toBe('경신');
    expect(p(r.hStem, r.hBranch)).toBe('병자');
  });

  test('1968-02-15 진시(4) → 무신/갑인/을묘/경진', () => {
    const r = calcSaju(1968, 2, 15, 4);
    expect(p(r.yStem, r.yBranch)).toBe('무신');
    expect(p(r.mStem, r.mBranch)).toBe('갑인');
    expect(p(r.dStem, r.dBranch)).toBe('을묘');
    expect(p(r.hStem, r.hBranch)).toBe('경진');
  });

  test('1969-07-20 술시(10) → 기유/신미/병신/무술', () => {
    const r = calcSaju(1969, 7, 20, 10);
    expect(p(r.yStem, r.yBranch)).toBe('기유');
    expect(p(r.mStem, r.mBranch)).toBe('신미');
    expect(p(r.dStem, r.dBranch)).toBe('병신');
    expect(p(r.hStem, r.hBranch)).toBe('무술');
  });
});

describe('Four-pillar verification – 1970s', () => {
  test('1972-10-10 축시(1) → 임자/경술/갑술/을축', () => {
    const r = calcSaju(1972, 10, 10, 1);
    expect(p(r.yStem, r.yBranch)).toBe('임자');
    expect(p(r.mStem, r.mBranch)).toBe('경술');
    expect(p(r.dStem, r.dBranch)).toBe('갑술');
    expect(p(r.hStem, r.hBranch)).toBe('을축');
  });

  test('1973-08-03 유시(9) → 계축/기미/신미/정유', () => {
    const r = calcSaju(1973, 8, 3, 9);
    expect(p(r.yStem, r.yBranch)).toBe('계축');
    expect(p(r.mStem, r.mBranch)).toBe('기미');
    expect(p(r.dStem, r.dBranch)).toBe('신미');
    expect(p(r.hStem, r.hBranch)).toBe('정유');
  });

  test('1975-01-01 해시(11) – before ipchun → sajuYear=1974, 갑인/병자/정미/신해', () => {
    const r = calcSaju(1975, 1, 1, 11);
    expect(r.sajuYear).toBe(1974);
    expect(p(r.yStem, r.yBranch)).toBe('갑인');
    expect(p(r.mStem, r.mBranch)).toBe('병자');
    expect(p(r.dStem, r.dBranch)).toBe('정미');
    expect(p(r.hStem, r.hBranch)).toBe('신해');
  });

  test('1977-06-15 오시(6) → 정사/병오/계묘/무오', () => {
    const r = calcSaju(1977, 6, 15, 6);
    expect(p(r.yStem, r.yBranch)).toBe('정사');
    expect(p(r.mStem, r.mBranch)).toBe('병오');
    expect(p(r.dStem, r.dBranch)).toBe('계묘');
    expect(p(r.hStem, r.hBranch)).toBe('무오');
  });

  test('1979-03-01 묘시(3) → 기미/병인/정묘/계묘', () => {
    const r = calcSaju(1979, 3, 1, 3);
    expect(p(r.yStem, r.yBranch)).toBe('기미');
    expect(p(r.mStem, r.mBranch)).toBe('병인');
    expect(p(r.dStem, r.dBranch)).toBe('정묘');
    expect(p(r.hStem, r.hBranch)).toBe('계묘');
  });
});

describe('Four-pillar verification – 1980s', () => {
  test('1982-08-08 신시(8) → 임술/무신/계해/경신', () => {
    const r = calcSaju(1982, 8, 8, 8);
    expect(p(r.yStem, r.yBranch)).toBe('임술');
    expect(p(r.mStem, r.mBranch)).toBe('무신');
    expect(p(r.dStem, r.dBranch)).toBe('계해');
    expect(p(r.hStem, r.hBranch)).toBe('경신');
  });

  test('1983-02-28 자시(0) → 계해/갑인/정해/경자', () => {
    const r = calcSaju(1983, 2, 28, 0);
    expect(p(r.yStem, r.yBranch)).toBe('계해');
    expect(p(r.mStem, r.mBranch)).toBe('갑인');
    expect(p(r.dStem, r.dBranch)).toBe('정해');
    expect(p(r.hStem, r.hBranch)).toBe('경자');
  });

  test('1984-12-05 사시(5) → 갑자/을해/계유/정사', () => {
    const r = calcSaju(1984, 12, 5, 5);
    expect(p(r.yStem, r.yBranch)).toBe('갑자');
    expect(p(r.mStem, r.mBranch)).toBe('을해');
    expect(p(r.dStem, r.dBranch)).toBe('계유');
    expect(p(r.hStem, r.hBranch)).toBe('정사');
  });

  test('1986-04-04 진시(4) → 병인/신묘/무인/병진', () => {
    const r = calcSaju(1986, 4, 4, 4);
    expect(p(r.yStem, r.yBranch)).toBe('병인');
    expect(p(r.mStem, r.mBranch)).toBe('신묘');
    expect(p(r.dStem, r.dBranch)).toBe('무인');
    expect(p(r.hStem, r.hBranch)).toBe('병진');
  });

  test('1988-09-17 유시(9) → 무진/신유/을해/을유', () => {
    const r = calcSaju(1988, 9, 17, 9);
    expect(p(r.yStem, r.yBranch)).toBe('무진');
    expect(p(r.mStem, r.mBranch)).toBe('신유');
    expect(p(r.dStem, r.dBranch)).toBe('을해');
    expect(p(r.hStem, r.hBranch)).toBe('을유');
  });
});

describe('Four-pillar verification – 1990s', () => {
  test('1991-01-20 인시(2) – before ipchun → sajuYear=1990, 경오/기축/경인/무인', () => {
    const r = calcSaju(1991, 1, 20, 2);
    expect(r.sajuYear).toBe(1990);
    expect(p(r.yStem, r.yBranch)).toBe('경오');
    expect(p(r.mStem, r.mBranch)).toBe('기축');
    expect(p(r.dStem, r.dBranch)).toBe('경인');
    expect(p(r.hStem, r.hBranch)).toBe('무인');
  });

  test('1992-05-05 자시(0) → 임신/갑진/신사/무자', () => {
    const r = calcSaju(1992, 5, 5, 0);
    expect(p(r.yStem, r.yBranch)).toBe('임신');
    expect(p(r.mStem, r.mBranch)).toBe('갑진');
    expect(p(r.dStem, r.dBranch)).toBe('신사');
    expect(p(r.hStem, r.hBranch)).toBe('무자');
  });

  test('1994-10-03 미시(7) → 갑술/계유/임술/정미', () => {
    const r = calcSaju(1994, 10, 3, 7);
    expect(p(r.yStem, r.yBranch)).toBe('갑술');
    expect(p(r.mStem, r.mBranch)).toBe('계유');
    expect(p(r.dStem, r.dBranch)).toBe('임술');
    expect(p(r.hStem, r.hBranch)).toBe('정미');
  });

  test('1996-02-10 오시(6) – before ipchun → sajuYear=1996 (after Feb 4), 병자/경인/정축/병오', () => {
    // Feb 10 is after ipchun (Feb 4), sajuYear stays 1996
    const r = calcSaju(1996, 2, 10, 6);
    expect(r.sajuYear).toBe(1996);
    expect(p(r.yStem, r.yBranch)).toBe('병자');
    expect(p(r.mStem, r.mBranch)).toBe('경인');
    expect(p(r.dStem, r.dBranch)).toBe('정축');
    expect(p(r.hStem, r.hBranch)).toBe('병오');
  });

  test('1997-11-22 해시(11) → 정축/신해/무진/계해', () => {
    const r = calcSaju(1997, 11, 22, 11);
    expect(p(r.yStem, r.yBranch)).toBe('정축');
    expect(p(r.mStem, r.mBranch)).toBe('신해');
    expect(p(r.dStem, r.dBranch)).toBe('무진');
    expect(p(r.hStem, r.hBranch)).toBe('계해');
  });

  test('1999-08-09 묘시(3) → 기묘/임신/계사/을묘', () => {
    const r = calcSaju(1999, 8, 9, 3);
    expect(p(r.yStem, r.yBranch)).toBe('기묘');
    expect(p(r.mStem, r.mBranch)).toBe('임신');
    expect(p(r.dStem, r.dBranch)).toBe('계사');
    expect(p(r.hStem, r.hBranch)).toBe('을묘');
  });
});

describe('Four-pillar verification – 2000s', () => {
  test('2001-09-11 신시(8) → 신사/정유/정축/무신', () => {
    const r = calcSaju(2001, 9, 11, 8);
    expect(p(r.yStem, r.yBranch)).toBe('신사');
    expect(p(r.mStem, r.mBranch)).toBe('정유');
    expect(p(r.dStem, r.dBranch)).toBe('정축');
    expect(p(r.hStem, r.hBranch)).toBe('무신');
  });

  test('2003-03-30 사시(5) → 계미/을묘/임인/을사', () => {
    const r = calcSaju(2003, 3, 30, 5);
    expect(p(r.yStem, r.yBranch)).toBe('계미');
    expect(p(r.mStem, r.mBranch)).toBe('을묘');
    expect(p(r.dStem, r.dBranch)).toBe('임인');
    expect(p(r.hStem, r.hBranch)).toBe('을사');
  });

  test('2005-07-04 축시(1) → 을유/임오/기축/을축', () => {
    const r = calcSaju(2005, 7, 4, 1);
    expect(p(r.yStem, r.yBranch)).toBe('을유');
    expect(p(r.mStem, r.mBranch)).toBe('임오');
    expect(p(r.dStem, r.dBranch)).toBe('기축');
    expect(p(r.hStem, r.hBranch)).toBe('을축');
  });

  test('2007-12-31 술시(10) → 정해/임자/기해/갑술', () => {
    const r = calcSaju(2007, 12, 31, 10);
    expect(p(r.yStem, r.yBranch)).toBe('정해');
    expect(p(r.mStem, r.mBranch)).toBe('임자');
    expect(p(r.dStem, r.dBranch)).toBe('기해');
    expect(p(r.hStem, r.hBranch)).toBe('갑술');
  });

  test('2008-02-05 자시(0) – after ipchun → sajuYear=2008, 무자/갑인/을해/병자', () => {
    const r = calcSaju(2008, 2, 5, 0);
    expect(r.sajuYear).toBe(2008);
    expect(p(r.yStem, r.yBranch)).toBe('무자');
    expect(p(r.mStem, r.mBranch)).toBe('갑인');
    expect(p(r.dStem, r.dBranch)).toBe('을해');
    expect(p(r.hStem, r.hBranch)).toBe('병자');
  });

  test('2009-05-05 사시(5) → 기축/무진/경술/신사', () => {
    const r = calcSaju(2009, 5, 5, 5);
    expect(p(r.yStem, r.yBranch)).toBe('기축');
    expect(p(r.mStem, r.mBranch)).toBe('무진');
    expect(p(r.dStem, r.dBranch)).toBe('경술');
    expect(p(r.hStem, r.hBranch)).toBe('신사');
  });
});

describe('Four-pillar verification – 2010s', () => {
  test('2011-04-05 오시(6) → 신묘/임진/경인/임오', () => {
    const r = calcSaju(2011, 4, 5, 6);
    expect(p(r.yStem, r.yBranch)).toBe('신묘');
    expect(p(r.mStem, r.mBranch)).toBe('임진');
    expect(p(r.dStem, r.dBranch)).toBe('경인');
    expect(p(r.hStem, r.hBranch)).toBe('임오');
  });

  test('2012-06-06 진시(4) → 임진/병오/무술/병진', () => {
    const r = calcSaju(2012, 6, 6, 4);
    expect(p(r.yStem, r.yBranch)).toBe('임진');
    expect(p(r.mStem, r.mBranch)).toBe('병오');
    expect(p(r.dStem, r.dBranch)).toBe('무술');
    expect(p(r.hStem, r.hBranch)).toBe('병진');
  });

  test('2014-10-09 유시(9) → 갑오/갑술/계축/신유', () => {
    const r = calcSaju(2014, 10, 9, 9);
    expect(p(r.yStem, r.yBranch)).toBe('갑오');
    expect(p(r.mStem, r.mBranch)).toBe('갑술');
    expect(p(r.dStem, r.dBranch)).toBe('계축');
    expect(p(r.hStem, r.hBranch)).toBe('신유');
  });

  test('2015-11-11 해시(11) → 을미/정해/신묘/기해', () => {
    const r = calcSaju(2015, 11, 11, 11);
    expect(p(r.yStem, r.yBranch)).toBe('을미');
    expect(p(r.mStem, r.mBranch)).toBe('정해');
    expect(p(r.dStem, r.dBranch)).toBe('신묘');
    expect(p(r.hStem, r.hBranch)).toBe('기해');
  });

  test('2016-02-03 미시(7) – before ipchun → sajuYear=2015, 을미/기축/을묘/계미', () => {
    const r = calcSaju(2016, 2, 3, 7);
    expect(r.sajuYear).toBe(2015);
    expect(p(r.yStem, r.yBranch)).toBe('을미');
    expect(p(r.mStem, r.mBranch)).toBe('기축');
    expect(p(r.dStem, r.dBranch)).toBe('을묘');
    expect(p(r.hStem, r.hBranch)).toBe('계미');
  });

  test('2017-02-03 진시(4) – 2017 ipchun is Feb 3, before means <Feb3, so Feb3 is on ipchun → sajuYear=2017, 정유/계축/신유/임진', () => {
    // IPCHUN[2017]=(2,3): isBeforeIpchun(2,3,2017) → 2<2? no, 2===2&&3<3? no → false → sajuYear=2017
    const r = calcSaju(2017, 2, 3, 4);
    expect(r.sajuYear).toBe(2017);
    expect(p(r.yStem, r.yBranch)).toBe('정유');
    expect(p(r.mStem, r.mBranch)).toBe('계축');
    expect(p(r.dStem, r.dBranch)).toBe('신유');
    expect(p(r.hStem, r.hBranch)).toBe('임진');
  });

  test('2018-02-09 묘시(3) → 무술/갑인/임신/계묘', () => {
    const r = calcSaju(2018, 2, 9, 3);
    expect(p(r.yStem, r.yBranch)).toBe('무술');
    expect(p(r.mStem, r.mBranch)).toBe('갑인');
    expect(p(r.dStem, r.dBranch)).toBe('임신');
    expect(p(r.hStem, r.hBranch)).toBe('계묘');
  });

  test('2019-11-01 사시(5) → 기해/갑술/임인/을사', () => {
    const r = calcSaju(2019, 11, 1, 5);
    expect(p(r.yStem, r.yBranch)).toBe('기해');
    expect(p(r.mStem, r.mBranch)).toBe('갑술');
    expect(p(r.dStem, r.dBranch)).toBe('임인');
    expect(p(r.hStem, r.hBranch)).toBe('을사');
  });
});

describe('Four-pillar verification – 2020s', () => {
  test('2020-03-15 인시(2) → 경자/기묘/정사/임인', () => {
    const r = calcSaju(2020, 3, 15, 2);
    expect(p(r.yStem, r.yBranch)).toBe('경자');
    expect(p(r.mStem, r.mBranch)).toBe('기묘');
    expect(p(r.dStem, r.dBranch)).toBe('정사');
    expect(p(r.hStem, r.hBranch)).toBe('임인');
  });

  test('2021-02-03 신시(8) – 2021 ipchun is Feb 3, on ipchun day → sajuYear=2021, 신축/신축/임오/무신', () => {
    // IPCHUN[2021]=(2,3): isBeforeIpchun(2,3,2021) → 2===2&&3<3? no → false → sajuYear=2021
    const r = calcSaju(2021, 2, 3, 8);
    expect(r.sajuYear).toBe(2021);
    expect(p(r.yStem, r.yBranch)).toBe('신축');
    expect(p(r.mStem, r.mBranch)).toBe('신축');
    expect(p(r.dStem, r.dBranch)).toBe('임오');
    expect(p(r.hStem, r.hBranch)).toBe('무신');
  });

  test('2022-01-01 자시(0) – before ipchun → sajuYear=2021, 신축/경자/갑인/갑자', () => {
    const r = calcSaju(2022, 1, 1, 0);
    expect(r.sajuYear).toBe(2021);
    expect(p(r.yStem, r.yBranch)).toBe('신축');
    expect(p(r.mStem, r.mBranch)).toBe('경자');
    expect(p(r.dStem, r.dBranch)).toBe('갑인');
    expect(p(r.hStem, r.hBranch)).toBe('갑자');
  });

  test('2023-06-21 오시(6) → 계묘/무오/경술/임오', () => {
    const r = calcSaju(2023, 6, 21, 6);
    expect(p(r.yStem, r.yBranch)).toBe('계묘');
    expect(p(r.mStem, r.mBranch)).toBe('무오');
    expect(p(r.dStem, r.dBranch)).toBe('경술');
    expect(p(r.hStem, r.hBranch)).toBe('임오');
  });

  test('2024-02-03 진시(4) – before ipchun → sajuYear=2023, 계묘/을축/정유/갑진', () => {
    const r = calcSaju(2024, 2, 3, 4);
    expect(r.sajuYear).toBe(2023);
    expect(p(r.yStem, r.yBranch)).toBe('계묘');
    expect(p(r.mStem, r.mBranch)).toBe('을축');
    expect(p(r.dStem, r.dBranch)).toBe('정유');
    expect(p(r.hStem, r.hBranch)).toBe('갑진');
  });

  test('2024-12-25 자시(0) → 갑진/병자/계해/임자', () => {
    const r = calcSaju(2024, 12, 25, 0);
    expect(p(r.yStem, r.yBranch)).toBe('갑진');
    expect(p(r.mStem, r.mBranch)).toBe('병자');
    expect(p(r.dStem, r.dBranch)).toBe('계해');
    expect(p(r.hStem, r.hBranch)).toBe('임자');
  });

  test('2025-02-02 해시(11) – before ipchun (2025 ipchun=Feb3) → sajuYear=2024, 갑진/정축/임인/신해', () => {
    // IPCHUN[2025]=(2,3): isBeforeIpchun(2,2,2025) → 2===2&&2<3? yes → sajuYear=2024
    const r = calcSaju(2025, 2, 2, 11);
    expect(r.sajuYear).toBe(2024);
    expect(p(r.yStem, r.yBranch)).toBe('갑진');
    expect(p(r.mStem, r.mBranch)).toBe('정축');
    expect(p(r.dStem, r.dBranch)).toBe('임인');
    expect(p(r.hStem, r.hBranch)).toBe('신해');
  });

  test('2025-07-07 미시(7) → 을사/계미/정축/정미', () => {
    const r = calcSaju(2025, 7, 7, 7);
    expect(p(r.yStem, r.yBranch)).toBe('을사');
    expect(p(r.mStem, r.mBranch)).toBe('계미');
    expect(p(r.dStem, r.dBranch)).toBe('정축');
    expect(p(r.hStem, r.hBranch)).toBe('정미');
  });

  test('2026-01-15 묘시(3) – before ipchun → sajuYear=2025, 을사/기축/기축/정묘', () => {
    const r = calcSaju(2026, 1, 15, 3);
    expect(r.sajuYear).toBe(2025);
    expect(p(r.yStem, r.yBranch)).toBe('을사');
    expect(p(r.mStem, r.mBranch)).toBe('기축');
    expect(p(r.dStem, r.dBranch)).toBe('기축');
    expect(p(r.hStem, r.hBranch)).toBe('정묘');
  });
});

// ---------------------------------------------------------------------------
// 2. 십성(Sipsung) – complete 10 relationships for all 5 yin day masters
// ---------------------------------------------------------------------------
describe('십성 – 을(1) day master (목, yin)', () => {
  test('을 vs 갑 → 겁재', () => expect(calcSipsung(1, 0)).toBe('겁재'));
  test('을 vs 을 → 비견', () => expect(calcSipsung(1, 1)).toBe('비견'));
  test('을 vs 병 → 상관', () => expect(calcSipsung(1, 2)).toBe('상관'));
  test('을 vs 정 → 식신', () => expect(calcSipsung(1, 3)).toBe('식신'));
  test('을 vs 무 → 정재', () => expect(calcSipsung(1, 4)).toBe('정재'));
  test('을 vs 기 → 편재', () => expect(calcSipsung(1, 5)).toBe('편재'));
  test('을 vs 경 → 정관', () => expect(calcSipsung(1, 6)).toBe('정관'));
  test('을 vs 신 → 편관', () => expect(calcSipsung(1, 7)).toBe('편관'));
  test('을 vs 임 → 정인', () => expect(calcSipsung(1, 8)).toBe('정인'));
  test('을 vs 계 → 편인', () => expect(calcSipsung(1, 9)).toBe('편인'));
});

describe('십성 – 정(3) day master (화, yin)', () => {
  test('정 vs 갑 → 정인', () => expect(calcSipsung(3, 0)).toBe('정인'));
  test('정 vs 을 → 편인', () => expect(calcSipsung(3, 1)).toBe('편인'));
  test('정 vs 병 → 겁재', () => expect(calcSipsung(3, 2)).toBe('겁재'));
  test('정 vs 정 → 비견', () => expect(calcSipsung(3, 3)).toBe('비견'));
  test('정 vs 무 → 상관', () => expect(calcSipsung(3, 4)).toBe('상관'));
  test('정 vs 기 → 식신', () => expect(calcSipsung(3, 5)).toBe('식신'));
  test('정 vs 경 → 정재', () => expect(calcSipsung(3, 6)).toBe('정재'));
  test('정 vs 신 → 편재', () => expect(calcSipsung(3, 7)).toBe('편재'));
  test('정 vs 임 → 정관', () => expect(calcSipsung(3, 8)).toBe('정관'));
  test('정 vs 계 → 편관', () => expect(calcSipsung(3, 9)).toBe('편관'));
});

describe('십성 – 기(5) day master (토, yin)', () => {
  test('기 vs 갑 → 정관', () => expect(calcSipsung(5, 0)).toBe('정관'));
  test('기 vs 을 → 편관', () => expect(calcSipsung(5, 1)).toBe('편관'));
  test('기 vs 병 → 정인', () => expect(calcSipsung(5, 2)).toBe('정인'));
  test('기 vs 정 → 편인', () => expect(calcSipsung(5, 3)).toBe('편인'));
  test('기 vs 무 → 겁재', () => expect(calcSipsung(5, 4)).toBe('겁재'));
  test('기 vs 기 → 비견', () => expect(calcSipsung(5, 5)).toBe('비견'));
  test('기 vs 경 → 상관', () => expect(calcSipsung(5, 6)).toBe('상관'));
  test('기 vs 신 → 식신', () => expect(calcSipsung(5, 7)).toBe('식신'));
  test('기 vs 임 → 정재', () => expect(calcSipsung(5, 8)).toBe('정재'));
  test('기 vs 계 → 편재', () => expect(calcSipsung(5, 9)).toBe('편재'));
});

describe('십성 – 신(7) day master (금, yin)', () => {
  test('신 vs 갑 → 정재', () => expect(calcSipsung(7, 0)).toBe('정재'));
  test('신 vs 을 → 편재', () => expect(calcSipsung(7, 1)).toBe('편재'));
  test('신 vs 병 → 정관', () => expect(calcSipsung(7, 2)).toBe('정관'));
  test('신 vs 정 → 편관', () => expect(calcSipsung(7, 3)).toBe('편관'));
  test('신 vs 무 → 정인', () => expect(calcSipsung(7, 4)).toBe('정인'));
  test('신 vs 기 → 편인', () => expect(calcSipsung(7, 5)).toBe('편인'));
  test('신 vs 경 → 겁재', () => expect(calcSipsung(7, 6)).toBe('겁재'));
  test('신 vs 신 → 비견', () => expect(calcSipsung(7, 7)).toBe('비견'));
  test('신 vs 임 → 상관', () => expect(calcSipsung(7, 8)).toBe('상관'));
  test('신 vs 계 → 식신', () => expect(calcSipsung(7, 9)).toBe('식신'));
});

describe('십성 – 계(9) day master (수, yin)', () => {
  test('계 vs 갑 → 상관', () => expect(calcSipsung(9, 0)).toBe('상관'));
  test('계 vs 을 → 식신', () => expect(calcSipsung(9, 1)).toBe('식신'));
  test('계 vs 병 → 정재', () => expect(calcSipsung(9, 2)).toBe('정재'));
  test('계 vs 정 → 편재', () => expect(calcSipsung(9, 3)).toBe('편재'));
  test('계 vs 무 → 정관', () => expect(calcSipsung(9, 4)).toBe('정관'));
  test('계 vs 기 → 편관', () => expect(calcSipsung(9, 5)).toBe('편관'));
  test('계 vs 경 → 정인', () => expect(calcSipsung(9, 6)).toBe('정인'));
  test('계 vs 신 → 편인', () => expect(calcSipsung(9, 7)).toBe('편인'));
  test('계 vs 임 → 겁재', () => expect(calcSipsung(9, 8)).toBe('겁재'));
  test('계 vs 계 → 비견', () => expect(calcSipsung(9, 9)).toBe('비견'));
});

describe('십성 – getSipsung full chart values', () => {
  test('1945-08-15 병일간 → 년간=정인, 월간=편인, 시간=편인', () => {
    const ss = getSipsung(calcSaju(1945, 8, 15, 6));
    expect(ss['년간']).toBe('정인');
    expect(ss['월간']).toBe('편인');
    expect(ss['시간']).toBe('편인');
  });

  test('1961-05-16 기일간 → 년간=식신, 월간=편재, 시간=비견', () => {
    const ss = getSipsung(calcSaju(1961, 5, 16, 5));
    expect(ss['년간']).toBe('식신');
    expect(ss['월간']).toBe('편재');
    expect(ss['시간']).toBe('비견');
  });

  test('1977-06-15 계일간 → 년간=편재, 월간=정재, 시간=정관', () => {
    const ss = getSipsung(calcSaju(1977, 6, 15, 6));
    expect(ss['년간']).toBe('편재');
    expect(ss['월간']).toBe('정재');
    expect(ss['시간']).toBe('정관');
  });

  test('2003-03-30 임일간 → 년간=겁재, 월간=상관, 시간=상관', () => {
    const ss = getSipsung(calcSaju(2003, 3, 30, 5));
    expect(ss['년간']).toBe('겁재');
    expect(ss['월간']).toBe('상관');
    expect(ss['시간']).toBe('상관');
  });

  test('2020-03-15 정일간 → 년간=정재, 월간=식신, 시간=정관', () => {
    const ss = getSipsung(calcSaju(2020, 3, 15, 2));
    expect(ss['년간']).toBe('정재');
    expect(ss['월간']).toBe('식신');
    expect(ss['시간']).toBe('정관');
  });

  test('2023-06-21 경일간 → 년간=상관, 월간=편인, 시간=식신', () => {
    const ss = getSipsung(calcSaju(2023, 6, 21, 6));
    expect(ss['년간']).toBe('상관');
    expect(ss['월간']).toBe('편인');
    expect(ss['시간']).toBe('식신');
  });
});

// ---------------------------------------------------------------------------
// 3. 신살(Shinsal) – 도화살, 역마살, 화개살 patterns
// ---------------------------------------------------------------------------
describe('신살(Shinsal) – 도화살/역마살/화개살', () => {
  test('2005-07-04 기축일 → 도화살 + 화개살 포함', () => {
    // dBranch=축(1): dohwaTarget=6(오), hwagaeTarget=1(축)
    // hBranch=축(1) → matches hwagaeTarget=1 → 화개살
    // yBranch=유(9): yukmaTarget=yukmaMap[1]=11(해), no match; dohwaTarget=6(오), yBranch=유≠오
    // mBranch=오(6): matches dohwaTarget=6 → 도화살
    const r = calcSaju(2005, 7, 4, 1);
    const sals = calcShinsal(r);
    expect(sals).toContain('도화살');
    expect(sals).toContain('화개살');
  });

  test('1977-06-15 계묘일 → 역마살 포함', () => {
    // dBranch=묘(3): yukmaTarget=yukmaMap[3]=5(사), yBranch=사(5) → 역마살
    const r = calcSaju(1977, 6, 15, 6);
    const sals = calcShinsal(r);
    expect(sals).toContain('역마살');
  });

  test('2014-10-09 계축일 → 도화살 포함', () => {
    // dBranch=축(1): dohwaTarget=6(오), yBranch=오(6) → 도화살
    const r = calcSaju(2014, 10, 9, 9);
    const sals = calcShinsal(r);
    expect(sals).toContain('도화살');
  });

  test('1982-08-08 계해일 → 년지+일지 기반 신살 (삼명통회)', () => {
    // dBranch=해(11), yBranch=술(10)
    // 일지 기반: dohwa=자(0), yukma=사(5), hwagae=미(7) — no match in [월,일,시]
    // 년지 기반: dohwa=묘(3), yukma=신(8), hwagae=술(10) — pool=[월,일,시]
    //   역마: target=신(8), 시지=신(8) match ✓
    //   화개: target=술(10), 술 is NOT in pool (it's the base 년지 itself, excluded) ✗
    const r = calcSaju(1982, 8, 8, 8);
    const sals = calcShinsal(r);
    expect(sals).toContain('역마살');
    expect(sals).not.toContain('화개살'); // 술(10) was the base, not a separate pillar
  });

  test('1988-09-17 을해일 → 년지 기반 도화살 감지 (삼명통회)', () => {
    // dBranch=해(11), yBranch=진(4)
    // 년지(진) 기반: dohwa target=유(9), pool=[월지,일지,시지] — 유(9) in 시지 match
    const r = calcSaju(1988, 9, 17, 9);
    const sals = calcShinsal(r);
    expect(sals).toContain('도화살');
  });

  test('calcShinsal always returns array with no duplicates', () => {
    for (const [y, m, d, h] of [
      [1945,8,15,6],[1961,5,16,5],[2005,7,4,1],[2023,6,21,6],[2025,7,7,7],
    ] as [number,number,number,number][]) {
      const sals = calcShinsal(calcSaju(y, m, d, h));
      expect(Array.isArray(sals)).toBe(true);
      expect(new Set(sals).size).toBe(sals.length);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. 오행(Ohaeng) balance – specific element counts
// ---------------------------------------------------------------------------
/**
 * 오행 counting uses SURFACE convention (visible 8 characters).
 * Convention: 4 천간 (OH_CG) + 4 지지 surface 오행 (OH_JJ).
 * Total with hour: 8. Total without hour: 6.
 */
describe('오행(Ohaeng) balance – getOhCount (surface convention)', () => {
  test('with hour: total is exactly 8', () => {
    const dates: [number, number, number, number][] = [
      [1945, 8, 15, 6], [1961, 5, 16, 5], [2020, 3, 15, 2],
    ];
    for (const [y, m, d, h] of dates) {
      const c = getOhCount(calcSaju(y, m, d, h));
      const total = Object.values(c).reduce((a, b) => a + b, 0);
      expect(total).toBe(8);
    }
  });

  test('without hour: total is exactly 6', () => {
    const dates: [number, number, number, number][] = [
      [1960, 4, 4, -1], [2000, 9, 9, -1],
    ];
    for (const [y, m, d, h] of dates) {
      const c = getOhCount(calcSaju(y, m, d, h));
      const total = Object.values(c).reduce((a, b) => a + b, 0);
      expect(total).toBe(6);
    }
  });

  test('all five element keys always present regardless of values', () => {
    for (const [y,m,d,h] of [[1945,8,15,6],[1977,6,15,6],[2025,7,7,7]] as [number,number,number,number][]) {
      const c = getOhCount(calcSaju(y, m, d, h));
      for (const el of ['목','화','토','금','수']) {
        expect(c).toHaveProperty(el);
        expect(c[el]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('count is deterministic for same input', () => {
    const saju = calcSaju(1990, 3, 15, 5);
    const c1 = getOhCount(saju);
    const c2 = getOhCount(saju);
    expect(c1).toEqual(c2);
  });
});

// ---------------------------------------------------------------------------
// 5. Unknown birth time (hour = -1) – 3-pillar mode
// ---------------------------------------------------------------------------
describe('Unknown birth time (hour = -1) – 3-pillar mode', () => {
  test('1960-04-04 no hour → 경자/기묘/임술', () => {
    const r = calcSaju(1960, 4, 4, -1);
    expect(r.hStem).toBe(-1);
    expect(r.hBranch).toBe(-1);
    expect(p(r.yStem, r.yBranch)).toBe('경자');
    expect(p(r.mStem, r.mBranch)).toBe('기묘');
    expect(p(r.dStem, r.dBranch)).toBe('임술');
  });

  test('1975-12-15 no hour → 을묘/무자/을미', () => {
    const r = calcSaju(1975, 12, 15, -1);
    expect(r.hStem).toBe(-1);
    expect(r.hBranch).toBe(-1);
    expect(p(r.yStem, r.yBranch)).toBe('을묘');
    expect(p(r.mStem, r.mBranch)).toBe('무자');
    expect(p(r.dStem, r.dBranch)).toBe('을미');
  });

  test('2000-09-09 no hour → 경진/을유/경오', () => {
    const r = calcSaju(2000, 9, 9, -1);
    expect(r.hStem).toBe(-1);
    expect(r.hBranch).toBe(-1);
    expect(p(r.yStem, r.yBranch)).toBe('경진');
    expect(p(r.mStem, r.mBranch)).toBe('을유');
    expect(p(r.dStem, r.dBranch)).toBe('경오');
  });

  test('3-pillar: get12Unsung 시지 is empty string', () => {
    for (const [y,m,d] of [[1960,4,4],[1975,12,15],[2000,9,9]] as [number,number,number][]) {
      expect(get12Unsung(calcSaju(y, m, d, -1))['시지']).toBe('');
    }
  });

  test('3-pillar: getSipsung has no 시간 key', () => {
    for (const [y,m,d] of [[1960,4,4],[1975,12,15],[2000,9,9]] as [number,number,number][]) {
      expect(getSipsung(calcSaju(y, m, d, -1))).not.toHaveProperty('시간');
    }
  });

  test('3-pillar: year/month/day pillars are within valid index ranges', () => {
    for (const [y,m,d] of [[1960,4,4],[1975,12,15],[2000,9,9]] as [number,number,number][]) {
      const r = calcSaju(y, m, d, -1);
      expect(r.yStem).toBeGreaterThanOrEqual(0); expect(r.yStem).toBeLessThanOrEqual(9);
      expect(r.yBranch).toBeGreaterThanOrEqual(0); expect(r.yBranch).toBeLessThanOrEqual(11);
      expect(r.mStem).toBeGreaterThanOrEqual(0); expect(r.mStem).toBeLessThanOrEqual(9);
      expect(r.mBranch).toBeGreaterThanOrEqual(0); expect(r.mBranch).toBeLessThanOrEqual(11);
      expect(r.dStem).toBeGreaterThanOrEqual(0); expect(r.dStem).toBeLessThanOrEqual(9);
      expect(r.dBranch).toBeGreaterThanOrEqual(0); expect(r.dBranch).toBeLessThanOrEqual(11);
    }
  });
});
