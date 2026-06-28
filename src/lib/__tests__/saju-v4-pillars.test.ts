/**
 * calcSajuV4 어댑터 검증:
 *  - v4 한글 → v3 인덱스 변환이 깨지지 않는다(인덱스 -1 없음).
 *  - 비(非)절기일에는 v3 calcSaju와 모든 칸이 동일하다.
 *  - 시주(시두법)는 v3와 동일하다.
 */
import { describe, it, expect } from 'vitest';
import { calcSaju } from '@/lib/saju-calc';
import { calcSajuV4 } from '@/lib/saju-v4-pillars';

describe('calcSajuV4 어댑터', () => {
  it('한글→인덱스 변환이 항상 유효하다 (-1 없음)', () => {
    for (let y = 1970; y <= 2025; y += 5) {
      for (let m = 1; m <= 12; m++) {
        const s = calcSajuV4(y, m, 15, 6);
        for (const v of [s.yStem, s.yBranch, s.mStem, s.mBranch, s.dStem, s.dBranch, s.hStem, s.hBranch]) {
          expect(v).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('비절기일(15·21·28일)에는 v3와 연·월·일·시주가 완전 동일하다', () => {
    const diffs: string[] = [];
    for (let y = 1960; y <= 2025; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of [15, 21, 28]) {
          const hourIdx = (y + m + d) % 12; // 다양한 시지로 시주도 검증
          const a = calcSaju(y, m, d, hourIdx);
          const b = calcSajuV4(y, m, d, hourIdx);
          for (const k of ['yStem','yBranch','mStem','mBranch','dStem','dBranch','hStem','hBranch'] as const) {
            if (a[k] !== b[k]) diffs.push(`${y}-${m}-${d} ${k}: v3=${a[k]} v4=${b[k]}`);
          }
        }
      }
    }
    expect(diffs).toEqual([]);
  }, 60_000);

  it('일주는 절기일 포함 전 구간에서 v3와 동일하다 (검증된 불변식)', () => {
    const diffs: string[] = [];
    for (let y = 1960; y <= 2025; y++) {
      for (let m = 1; m <= 12; m++) {
        for (const d of [4, 6, 7, 8]) {
          const a = calcSaju(y, m, d, 6);
          const b = calcSajuV4(y, m, d, 6);
          if (a.dStem !== b.dStem || a.dBranch !== b.dBranch) {
            diffs.push(`${y}-${m}-${d}: v3=${a.dStem}/${a.dBranch} v4=${b.dStem}/${b.dBranch}`);
          }
        }
      }
    }
    expect(diffs).toEqual([]);
  }, 60_000);

  it('시간 미상(-1)이면 시주가 -1로 비워진다', () => {
    const s = calcSajuV4(1990, 5, 15, -1);
    expect(s.hStem).toBe(-1);
    expect(s.hBranch).toBe(-1);
  });
});
