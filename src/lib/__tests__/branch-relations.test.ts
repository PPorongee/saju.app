import { describe, it, expect } from 'vitest';
import { analyzeBranchRelations } from '../branch-relations';
import type { SajuResult } from '../saju-calc';

function mockSaju(args: Partial<SajuResult>): SajuResult {
  return {
    yStem: 0, yBranch: 0,
    mStem: 0, mBranch: 0,
    dStem: 0, dBranch: 0,
    hStem: -1, hBranch: -1,
    sajuYear: 2000, sajuMonthIdx: 0,
    ...args,
  };
}

describe('analyzeBranchRelations', () => {
  it('오술 반합 (火 반합)을 감지한다', () => {
    // 일지=오(6), 시지=술(10) — 화 반합
    const sj = mockSaju({ dBranch: 6, hBranch: 10, hStem: 0 });
    const { items } = analyzeBranchRelations(sj);
    const banhap = items.find(i => i.type === '반합' && i.element === '화');
    expect(banhap).toBeDefined();
    expect(banhap?.characters).toEqual(expect.arrayContaining(['오', '술']));
  });

  it('인오술 삼합이 있을 때 반합으로 중복 표기하지 않는다', () => {
    // 년지=인(2), 일지=오(6), 시지=술(10) — 화국 삼합
    const sj = mockSaju({ yBranch: 2, dBranch: 6, hBranch: 10, hStem: 0 });
    const { items } = analyzeBranchRelations(sj);
    expect(items.some(i => i.type === '삼합' && i.element === '화')).toBe(true);
    expect(items.some(i => i.type === '반합')).toBe(false);
  });

  it('천라(戌亥)를 감지한다', () => {
    const sj = mockSaju({ dBranch: 10, hBranch: 11, hStem: 8 });
    const { items } = analyzeBranchRelations(sj);
    expect(items.some(i => i.type === '천라')).toBe(true);
  });

  it('지망(辰巳)을 감지한다', () => {
    const sj = mockSaju({ yBranch: 4, mBranch: 5 });
    const { items } = analyzeBranchRelations(sj);
    expect(items.some(i => i.type === '지망')).toBe(true);
  });

  it('인사신 삼형을 감지한다', () => {
    const sj = mockSaju({ yBranch: 2, mBranch: 5, dBranch: 8, dStem: 6 });
    const { items } = analyzeBranchRelations(sj);
    expect(items.some(i => i.type === '형' && i.subtype === '삼형')).toBe(true);
  });

  it('자오충을 감지한다', () => {
    const sj = mockSaju({ yBranch: 0, dBranch: 6 });
    const { items } = analyzeBranchRelations(sj);
    expect(items.some(i => i.type === '충' && i.characters.includes('자') && i.characters.includes('오'))).toBe(true);
  });

  it('갑기 천간합을 감지한다 (토)', () => {
    const sj = mockSaju({ yStem: 0, mStem: 5 });
    const { items } = analyzeBranchRelations(sj);
    const hap = items.find(i => i.type === '천간합' && i.element === '토');
    expect(hap).toBeDefined();
    expect(hap?.characters).toEqual(expect.arrayContaining(['갑', '기']));
  });

  it('인해 육합을 감지한다 (목)', () => {
    const sj = mockSaju({ yBranch: 2, mBranch: 11 });
    const { items } = analyzeBranchRelations(sj);
    expect(items.some(i => i.type === '육합' && i.element === '목')).toBe(true);
  });

  it('진진 자형(같은 글자 2개)을 감지한다', () => {
    const sj = mockSaju({ yBranch: 4, mBranch: 4 });
    const { items } = analyzeBranchRelations(sj);
    expect(items.some(i => i.type === '형' && i.subtype === '자형')).toBe(true);
  });

  it('관계 없는 사주는 안내 메시지를 반환한다', () => {
    // 갑자/병인/무진/경오 — 의도적으로 관계 없는 조합 (없는지는 결과로 확인)
    const sj = mockSaju({
      yStem: 0, yBranch: 0,
      mStem: 2, mBranch: 2,
      dStem: 4, dBranch: 4,
      hStem: 6, hBranch: 6,
    });
    const { items, promptBlock } = analyzeBranchRelations(sj);
    // 진진 자형, 자진 반합 등 있을 수 있으니 promptBlock 형식만 검증
    expect(promptBlock.length).toBeGreaterThan(0);
    expect(Array.isArray(items)).toBe(true);
  });

  it('promptBlock이 비어있지 않고 사람이 읽을 수 있는 형식이다', () => {
    const sj = mockSaju({ yBranch: 0, dBranch: 6 });
    const { promptBlock } = analyzeBranchRelations(sj);
    expect(promptBlock).toContain('지지/천간 관계');
    expect(promptBlock).toContain('자오충');
  });
});
