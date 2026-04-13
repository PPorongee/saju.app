import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { calcSaju, getSipsung, getOhCount, calcShinsal, get12Unsung } from '../saju-calc';

const fixture = JSON.parse(
  readFileSync(join(__dirname, 'fixtures/saju-regression.json'), 'utf-8')
) as {
  inputs: Array<{ year: number; month: number; day: number; hour: number }>;
  expectedOutputs: Array<{
    saju: ReturnType<typeof calcSaju>;
    sipsung: Record<string, string>;
    ohCount: Record<string, number>;
    shinsal: string[];
    unsung: Record<string, string>;
  }>;
};

describe('Regression fixtures', () => {
  fixture.inputs.forEach((input, idx) => {
    const expected = fixture.expectedOutputs[idx];

    it(`fixture ${idx + 1}: calcSaju matches snapshot`, () => {
      const saju = calcSaju(input.year, input.month, input.day, input.hour);
      expect(saju).toEqual(expected.saju);
    });

    it(`fixture ${idx + 1}: getSipsung matches snapshot`, () => {
      const saju = calcSaju(input.year, input.month, input.day, input.hour);
      expect(getSipsung(saju)).toEqual(expected.sipsung);
    });

    it(`fixture ${idx + 1}: getOhCount is deterministic and valid`, () => {
      const saju = calcSaju(input.year, input.month, input.day, input.hour);
      const oh = getOhCount(saju);
      // Must have all 5 elements
      for (const el of ['목','화','토','금','수']) {
        expect(oh[el]).toBeGreaterThanOrEqual(0);
      }
      // Surface convention: 8 with hour, 6 without
      const total = Object.values(oh).reduce((a, b) => a + b, 0);
      const hasHour = input.hour >= 0;
      expect(total).toBe(hasHour ? 8 : 6);
      // Must be deterministic
      expect(getOhCount(saju)).toEqual(oh);
    });

    it(`fixture ${idx + 1}: calcShinsal matches snapshot`, () => {
      const saju = calcSaju(input.year, input.month, input.day, input.hour);
      expect(calcShinsal(saju)).toEqual(expected.shinsal);
    });

    it(`fixture ${idx + 1}: get12Unsung matches snapshot`, () => {
      const saju = calcSaju(input.year, input.month, input.day, input.hour);
      expect(get12Unsung(saju)).toEqual(expected.unsung);
    });
  });
});
