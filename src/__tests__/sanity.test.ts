import { describe, test, expect } from 'vitest';
import { CG, JJ, CG_HANJA, JJ_HANJA, OH_CG, OH_JJ, PROFILES } from '@/lib/saju-calc';
import { SAJU_REFS } from '@/lib/saju-references';
import { T } from '@/lib/i18n';

describe('Sanity: Arrays', () => {
  test('CG=10 JJ=12', () => { expect(CG).toHaveLength(10); expect(JJ).toHaveLength(12); });
  test('CG_HANJA=10 JJ_HANJA=12', () => { expect(CG_HANJA).toHaveLength(10); expect(JJ_HANJA).toHaveLength(12); });
  test('OH_CG=10 OH_JJ=12', () => { expect(OH_CG).toHaveLength(10); expect(OH_JJ).toHaveLength(12); });
  test('unique stems', () => expect(new Set(CG).size).toBe(10));
  test('unique branches', () => expect(new Set(JJ).size).toBe(12));
  test('OH values are valid elements', () => {
    const v = ['목','화','토','금','수'];
    OH_CG.forEach(e => expect(v).toContain(e));
    OH_JJ.forEach(e => expect(v).toContain(e));
  });
});

describe('Sanity: PROFILES', () => {
  test('0-9 exist with fields', () => {
    for (let i=0;i<=9;i++) {
      const p = PROFILES[i];
      expect(p).toBeDefined();
      for (const f of ['name','short','desc','trait','strength','weakness'])
        expect((p as any)[f].length).toBeGreaterThan(0);
    }
  });
});

describe('Sanity: SAJU_REFS', () => {
  test('8 categories with >=5 refs each', () => {
    for (const k of ['personality','wealth','love','career','health','compatibility','timing','general']) {
      expect(SAJU_REFS).toHaveProperty(k);
      expect((SAJU_REFS as any)[k].length).toBeGreaterThanOrEqual(5);
    }
  });
});

describe('Sanity: i18n', () => {
  test('>100 keys', () => expect(Object.keys(T).length).toBeGreaterThan(100));
  test('critical keys exist', () => {
    for (const k of ['appTitle','appSubtitle','next','prev','restart','saveResult','sajuTitle','compatTitle','yearlyTitle','backBtn','disclaimer'])
      expect(T[k]).toBeDefined();
  });
});
