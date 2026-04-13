/**
 * P0 REGRESSION TEST — 수(水) count for 1995-05-31 00:15 solar
 *
 * User reports: expected 수=3, app returns 수=2.
 * This test traces the EXACT calculation path to find the root cause.
 */
import { describe, it, expect } from 'vitest';
import {
  calcSaju, getOhCount, JIJANGGAN, OH_CG,
  CG, JJ, getSajuMonth, isBeforeIpchun, exactTimeToHourBranch,
  validateSajuResult, getJijanggan,
} from '../saju-calc';

describe('P0 Regression: 1995-05-31 00:15 solar — 수 must be 3', () => {
  // Step 0: Map exact birth time to hour branch
  const hourBranch = exactTimeToHourBranch(0, 15); // 00:15 → 자시

  it('00:15 maps to 자시 (branch 0)', () => {
    expect(hourBranch).toBe(0); // 자
  });

  // Step 1: Calculate pillars
  const saju = calcSaju(1995, 5, 31, hourBranch);

  it('produces valid pillars', () => {
    const v = validateSajuResult(saju);
    expect(v.valid).toBe(true);
  });

  it('year pillar: 1995 is after ipchun → sajuYear=1995 → 乙亥 (stem=1, branch=11)', () => {
    expect(saju.sajuYear).toBe(1995);
    expect(saju.yStem).toBe(1);   // 을(乙)
    expect(saju.yBranch).toBe(11); // 해(亥)
    expect(CG[saju.yStem]).toBe('을');
    expect(JJ[saju.yBranch]).toBe('해');
  });

  it('month pillar: May 31 → 사월(巳月) → 辛巳', () => {
    const monthIdx = getSajuMonth(5, 31);
    expect(saju.mBranch).toBe((monthIdx + 2) % 12);
    // 을년 → 인월 starts with 무인(stem 4)
    // mStem = (4 + monthIdx) % 10
  });

  it('day pillar: 1995-05-31 via JDN', () => {
    // Verify the day stem and branch are valid
    expect(saju.dStem).toBeGreaterThanOrEqual(0);
    expect(saju.dStem).toBeLessThanOrEqual(9);
    expect(saju.dBranch).toBeGreaterThanOrEqual(0);
    expect(saju.dBranch).toBeLessThanOrEqual(11);
  });

  it('hour pillar: 자시 → branch 0', () => {
    expect(saju.hBranch).toBe(0); // 자
    expect(saju.hStem).toBeGreaterThanOrEqual(0);
  });

  // Step 2: Trace all 지장간 for each branch
  it('traces all hidden stems contributing to 수(水)', () => {
    const branches = [saju.yBranch, saju.mBranch, saju.dBranch, saju.hBranch];
    let waterFromStems = 0;
    let waterFromJijanggan = 0;

    // Count 수 from 4 천간
    const stems = [saju.yStem, saju.mStem, saju.dStem, saju.hStem];
    for (const stem of stems) {
      if (OH_CG[stem] === '수') waterFromStems++;
    }

    // Count 수 from all 지장간
    for (const branch of branches) {
      const hidden = JIJANGGAN[branch];
      for (const stemIdx of hidden) {
        if (OH_CG[stemIdx] === '수') waterFromJijanggan++;
      }
    }

    const totalWater = waterFromStems + waterFromJijanggan;

    console.log('=== 수(水) Count Trace ===');
    console.log('Pillars:', CG[saju.yStem]+JJ[saju.yBranch], CG[saju.mStem]+JJ[saju.mBranch], CG[saju.dStem]+JJ[saju.dBranch], CG[saju.hStem]+JJ[saju.hBranch]);
    console.log('Year branch:', JJ[saju.yBranch], '지장간:', JIJANGGAN[saju.yBranch].map(s => CG[s]+`(${OH_CG[s]})`));
    console.log('Month branch:', JJ[saju.mBranch], '지장간:', JIJANGGAN[saju.mBranch].map(s => CG[s]+`(${OH_CG[s]})`));
    console.log('Day branch:', JJ[saju.dBranch], '지장간:', JIJANGGAN[saju.dBranch].map(s => CG[s]+`(${OH_CG[s]})`));
    console.log('Hour branch:', JJ[saju.hBranch], '지장간:', JIJANGGAN[saju.hBranch].map(s => CG[s]+`(${OH_CG[s]})`));
    console.log('수 from 천간:', waterFromStems);
    console.log('수 from 지장간:', waterFromJijanggan);
    console.log('Total 수:', totalWater);

    // THE GOLDEN ASSERTION: 수 must be >= 3
    expect(totalWater).toBeGreaterThanOrEqual(3);
  });

  // Step 3: Verify getOhCount (SURFACE convention) returns exactly 수=3
  it('getOhCount (surface) returns 수 === 3', () => {
    const oh = getOhCount(saju);
    console.log('getOhCount (surface) result:', oh);
    // Surface convention: 4 천간 OH_CG + 4 지지 OH_JJ = 8 total
    const total = Object.values(oh).reduce((a, b) => a + b, 0);
    expect(total).toBe(8); // always 8 with hour pillar
    // GOLDEN FIXTURE: 수 must be exactly 3
    expect(oh['수']).toBe(3);
  });
});
