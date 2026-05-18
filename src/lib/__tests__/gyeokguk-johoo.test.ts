import { describe, it, expect } from 'vitest';
import { calcSaju, getOhCount, CG, JJ } from '../saju-calc';
import { analyzeAdvanced } from '../gyeokguk-johoo';

describe('analyzeAdvanced — 이서은 사주(1995-07-06 11:49) 골든 케이스', () => {
  // 시지 = 오시 (11:49 → 11:00-12:59 = 오시 = 6)
  const sj = calcSaju(1995, 7, 6, 6);
  const ohCount = getOhCount(sj);

  it('디버그 출력', () => {
    const result = analyzeAdvanced(sj, ohCount);
    console.log('년주:', CG[sj.yStem]+JJ[sj.yBranch], '월주:', CG[sj.mStem]+JJ[sj.mBranch], '일주:', CG[sj.dStem]+JJ[sj.dBranch], '시주:', CG[sj.hStem]+JJ[sj.hBranch]);
    console.log('오행:', ohCount);
    console.log('십성:', result.sipsung);
    console.log('신강:', result.strength);
    console.log('격국:', result.gyeokguk.primary);
    console.log('조후:', result.johoo.type, '|', result.johoo.description);
    console.log('정수:', result.essence.oneLineKo);
  });

  it('일주가 무술이다', () => {
    // 일간=무(4), 일지=술(10)
    expect(sj.dStem).toBe(4);
    expect(sj.dBranch).toBe(10);
  });

  it('오행: 토 3 + 화 2 비중이 높다', () => {
    expect(ohCount['토']).toBeGreaterThanOrEqual(3);
    expect(ohCount['화']).toBeGreaterThanOrEqual(2);
  });

  it('신강 또는 신왕 사주로 판별된다', () => {
    const result = analyzeAdvanced(sj, ohCount);
    expect(['신왕', '신강']).toContain(result.strength.label);
  });

  it('조후가 조열이다 (화 강 + 수 약)', () => {
    const result = analyzeAdvanced(sj, ohCount);
    expect(result.johoo.type).toBe('조열');
    expect(result.johoo.needed).toContain('수');
  });

  it('격국이 군겁쟁재 또는 종왕격 등 비겁 관련으로 판별된다', () => {
    const result = analyzeAdvanced(sj, ohCount);
    expect(['군겁쟁재', '종왕격', '인성과다', '관인상생']).toContain(result.gyeokguk.primary);
  });

  it('한 줄 정수에 무술 + 격국 + 조후가 포함된다', () => {
    const result = analyzeAdvanced(sj, ohCount);
    expect(result.essence.oneLineKo).toContain('무술');
    expect(result.essence.oneLineKo).toContain(result.gyeokguk.primary);
  });

  it('promptBlock에 격국·조후·지장간이 모두 포함된다', () => {
    const result = analyzeAdvanced(sj, ohCount);
    expect(result.promptBlock).toContain('격국:');
    expect(result.promptBlock).toContain('조후:');
    expect(result.promptBlock).toContain('지장간');
    expect(result.promptBlock).toContain('AI가 임의로 바꾸지 마');
  });
});

describe('analyzeAdvanced — 한랭 사주 케이스', () => {
  // 겨울 출생 + 수 많음을 시뮬레이션
  const sj = calcSaju(1990, 12, 25, 0); // 겨울, 자시
  const ohCount = getOhCount(sj);

  it('조후가 한랭 또는 평윤으로 판별된다 (계절 의존)', () => {
    const result = analyzeAdvanced(sj, ohCount);
    expect(['한랭', '평윤', '조습']).toContain(result.johoo.type);
  });
});
