/**
 * Consistency Fixtures Test
 * Proves deterministic calc + prompt layers produce IDENTICAL outputs.
 */
import { describe, test, expect } from 'vitest';
import {
  calcSaju, getOhCount, getSipsung, calcShinsal, get12Unsung,
  CG, JJ, OH_CG, OH_JJ,
} from '@/lib/saju-calc';
import { buildSajuPrompts } from '@/lib/saju-prompt-builder';
import type { UserData } from '@/lib/saju-prompt';

const INPUTS = [
  { label: '1990-05-15 hour=6', y: 1990, m: 5, d: 15, h: 6 },
  { label: '1985-12-31 hour=3', y: 1985, m: 12, d: 31, h: 3 },
  { label: '2000-01-15 hour=-1', y: 2000, m: 1, d: 15, h: -1 },
] as const;

function mkUser(overrides: Partial<UserData> = {}): UserData {
  return {
    name: 'TestUser', gender: 'm', year: 1990, month: 5, day: 15, hour: 6,
    concern: 0, state: 0, personality: [0, 0, 0], relationship: 0, wantToKnow: 0,
    ...overrides,
  };
}

// === LAYER 1: Deterministic Calculation Consistency ===

describe('Layer 1: calcSaju determinism', () => {
  for (const input of INPUTS) {
    test('calcSaju identical x3 ' + input.label, () => {
      const r1 = calcSaju(input.y, input.m, input.d, input.h);
      const r2 = calcSaju(input.y, input.m, input.d, input.h);
      const r3 = calcSaju(input.y, input.m, input.d, input.h);
      expect(r1).toStrictEqual(r2);
      expect(r2).toStrictEqual(r3);
    });
  }
});

describe('Layer 1: getOhCount determinism', () => {
  for (const input of INPUTS) {
    test('getOhCount identical x3 ' + input.label, () => {
      const sj = calcSaju(input.y, input.m, input.d, input.h);
      const r1 = getOhCount(sj);
      const r2 = getOhCount(sj);
      const r3 = getOhCount(sj);
      expect(r1).toStrictEqual(r2);
      expect(r2).toStrictEqual(r3);
    });
  }
});

describe('Layer 1: getSipsung determinism', () => {
  for (const input of INPUTS) {
    test('getSipsung identical x3 ' + input.label, () => {
      const sj = calcSaju(input.y, input.m, input.d, input.h);
      const r1 = getSipsung(sj);
      const r2 = getSipsung(sj);
      const r3 = getSipsung(sj);
      expect(r1).toStrictEqual(r2);
      expect(r2).toStrictEqual(r3);
    });
  }
});

describe('Layer 1: calcShinsal determinism', () => {
  for (const input of INPUTS) {
    test('calcShinsal identical x3 ' + input.label, () => {
      const sj = calcSaju(input.y, input.m, input.d, input.h);
      const r1 = calcShinsal(sj);
      const r2 = calcShinsal(sj);
      const r3 = calcShinsal(sj);
      expect(r1).toStrictEqual(r2);
      expect(r2).toStrictEqual(r3);
    });
  }
});

describe('Layer 1: get12Unsung determinism', () => {
  for (const input of INPUTS) {
    test('get12Unsung identical x3 ' + input.label, () => {
      const sj = calcSaju(input.y, input.m, input.d, input.h);
      const r1 = get12Unsung(sj);
      const r2 = get12Unsung(sj);
      const r3 = get12Unsung(sj);
      expect(r1).toStrictEqual(r2);
      expect(r2).toStrictEqual(r3);
    });
  }
});

// === LAYER 1: Regression Fixtures ===

describe('Layer 1: regression fixtures', () => {
  test('1990-05-15 h=6 pillar data', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    expect(sj.sajuYear).toBe(1990);
    expect(sj.yStem).toBe(6);
    expect(sj.yBranch).toBe(6);
    expect(sj.sajuMonthIdx).toBe(3);
    expect(sj.mBranch).toBe(5);
    expect(sj.mStem).toBe(7);
    expect(CG[sj.yStem]).toBe('경');
    expect(JJ[sj.yBranch]).toBe('오');
    expect(CG[sj.mStem]).toBe('신');
    expect(JJ[sj.mBranch]).toBe('사');
  });

  test('1985-12-31 h=3 pillar data', () => {
    const sj = calcSaju(1985, 12, 31, 3);
    expect(sj.sajuYear).toBe(1985);
    expect(sj.yStem).toBe(1);
    expect(sj.yBranch).toBe(1);
    expect(sj.sajuMonthIdx).toBe(10);
    expect(sj.mBranch).toBe(0);
  });

  test('2000-01-15 h=-1 before ipchun', () => {
    const sj = calcSaju(2000, 1, 15, -1);
    expect(sj.sajuYear).toBe(1999);
    expect(sj.hStem).toBe(-1);
    expect(sj.hBranch).toBe(-1);
  });

  test('getOhCount sums to 8 with hour (surface convention)', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    const oh = getOhCount(sj);
    const t = oh['목'] + oh['화'] + oh['토'] + oh['금'] + oh['수'];
    expect(t).toBe(8);
  });

  test('getOhCount sums to 6 without hour (surface convention)', () => {
    const sj = calcSaju(2000, 1, 15, -1);
    const oh = getOhCount(sj);
    const t = oh['목'] + oh['화'] + oh['토'] + oh['금'] + oh['수'];
    expect(t).toBe(6);
  });

  test('getSipsung keys for hour=6', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    const sip = getSipsung(sj);
    expect(Object.keys(sip).sort()).toEqual(['년간', '시간', '월간']);
  });

  test('getSipsung keys for hour=-1', () => {
    const sj = calcSaju(2000, 1, 15, -1);
    const sip = getSipsung(sj);
    expect(Object.keys(sip).sort()).toEqual(['년간', '월간']);
  });

  test('calcShinsal all valid names', () => {
    const validNames = ['도화살','역마살','화개살','홍염살','괴강살','백호살','천을귀인','문창귀인','양인살','귀문관살','고진살','과숙살','장성살'];
    for (const input of INPUTS) {
      const sj = calcSaju(input.y, input.m, input.d, input.h);
      for (const s of calcShinsal(sj)) { expect(validNames).toContain(s); }
    }
  });

  test('get12Unsung all valid stages', () => {
    const valid = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];
    for (const input of INPUTS) {
      const sj = calcSaju(input.y, input.m, input.d, input.h);
      const un = get12Unsung(sj);
      for (const key of ['년지','월지','일지']) {
        expect(valid).toContain(un[key]);
      }
    }
  });
});

// === LAYER 2: Prompt Construction Consistency ===

describe('Layer 2: buildSajuPrompts determinism (3 inputs x 3 runs)', () => {
  const testCases = [
    { label: '1990 male unmarried', userData: mkUser({ year: 1990, month: 5, day: 15, hour: 6, relationship: 0 }) },
    { label: '1985 female married', userData: mkUser({ name: 'Kim', gender: 'f', year: 1985, month: 12, day: 31, hour: 3, relationship: 3 }) },
    { label: '2000 no hour', userData: mkUser({ year: 2000, month: 1, day: 15, hour: -1 }) },
  ];

  for (const tc of testCases) {
    test('prompt identical x3 ' + tc.label, () => {
      const sj = calcSaju(tc.userData.year, tc.userData.month, tc.userData.day, tc.userData.hour);
      const oh = getOhCount(sj);
      const [p1a, p1b] = buildSajuPrompts(sj, oh, tc.userData);
      const [p2a, p2b] = buildSajuPrompts(sj, oh, tc.userData);
      const [p3a, p3b] = buildSajuPrompts(sj, oh, tc.userData);
      expect(p1a).toBe(p2a);
      expect(p2a).toBe(p3a);
      expect(p1b).toBe(p2b);
      expect(p2b).toBe(p3b);
    });
  }

  test('prompt contains pillar chars', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    const oh = getOhCount(sj);
    const [p1] = buildSajuPrompts(sj, oh, mkUser());
    expect(p1).toContain(CG[sj.yStem] + JJ[sj.yBranch]);
    expect(p1).toContain(CG[sj.mStem] + JJ[sj.mBranch]);
    expect(p1).toContain(CG[sj.dStem] + JJ[sj.dBranch]);
  });

  test('prompt contains ohaeng distribution', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    const oh = getOhCount(sj);
    const [p1] = buildSajuPrompts(sj, oh, mkUser());
    for (const key of ['목','화','토','금','수']) {
      expect(p1).toContain(key + ':' + oh[key] + '개');
    }
  });

  test('prompt contains sipsung', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    const oh = getOhCount(sj);
    const sip = getSipsung(sj);
    const [p1] = buildSajuPrompts(sj, oh, mkUser());
    for (const [key, val] of Object.entries(sip)) {
      expect(p1).toContain(key + ':' + val);
    }
  });

  test('prompt contains shinsal', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    const oh = getOhCount(sj);
    const sals = calcShinsal(sj);
    const [p1] = buildSajuPrompts(sj, oh, mkUser());
    if (sals.length > 0) {
      for (const sal of sals) { expect(p1).toContain(sal); }
    } else {
      expect(p1).toContain('없음');
    }
  });

  test('prompt contains 12unsung', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    const oh = getOhCount(sj);
    const un = get12Unsung(sj);
    const [p1] = buildSajuPrompts(sj, oh, mkUser());
    expect(p1).toContain('년지:'+un['년지']);
    expect(p1).toContain('월지:'+un['월지']);
    expect(p1).toContain('일지:'+un['일지']);
  });
});

// === LAYER 2: Control tests ===

describe('Layer 2: different inputs produce different prompts', () => {
  test('different births produce different prompts', () => {
    const sj1 = calcSaju(1990, 5, 15, 6);
    const sj2 = calcSaju(1985, 12, 31, 3);
    const [p1] = buildSajuPrompts(sj1, getOhCount(sj1), mkUser({ year: 1990, month: 5, day: 15, hour: 6 }));
    const [p2] = buildSajuPrompts(sj2, getOhCount(sj2), mkUser({ year: 1985, month: 12, day: 31, hour: 3 }));
    expect(p1).not.toBe(p2);
  });

  test('married vs unmarried', () => {
    const sj = calcSaju(1990, 5, 15, 6);
    const oh = getOhCount(sj);
    const promM = buildSajuPrompts(sj, oh, mkUser({ relationship: 3 }));
    const promU = buildSajuPrompts(sj, oh, mkUser({ relationship: 0 }));
    // Section 5 (love/marriage) is in prompt[1] (Part 2: sections 5-10)
    expect(promM[1]).toContain('부부 관계');
    expect(promU[1]).toContain('연애 & 인연의 지도');
    expect(promM[1]).not.toContain('연애 & 인연의 지도');
    expect(promU[1]).not.toContain('부부 관계');
  });
});
