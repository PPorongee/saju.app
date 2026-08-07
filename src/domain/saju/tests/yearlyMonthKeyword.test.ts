// 올해운세 월별 keyword 차별화 회귀 테스트.
//
// buildMonthKeyword는 (1) 십성×용신효과 3버전 + (2) 원국 궁 합충 작용으로
// "이 사람만의" 월별 문구를 만든다. 배선(computeMonthlyFortuneAnalysis → buildMonthKeyword에
// interactions 전달)이 빠지면 궁-특정 문구가 죽고 십성 하나당 문구가 하나로 collapse(사메니스)된다.
// 그 회귀를 막는다.

import { describe, it, expect } from 'vitest';
import { buildYearlyAnalysis } from '../yearly/generateYearlyFortuneReport';
import type { YearlyFortuneInput } from '../yearly/yearlyTypes';
import type { BirthInput } from '../calendar/normalizeBirthInput';

// 남은 월이 넉넉히 잡히도록 연초에 가까운 NOW.
const NOW = new Date('2026-05-25T00:00:00Z');

function monthKeywords(birth: BirthInput): string[] {
  const input: YearlyFortuneInput = { birth, currentDate: '2026-05-25', relationshipStatus: 'unknown' };
  return buildYearlyAnalysis(input, NOW).remainingMonthlyFortunes.map(m => m.keyword);
}

const PERSON_A: BirthInput = {
  gender: 'female', calendarType: 'solar', birthDate: '1995-07-06',
  birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};
const PERSON_B: BirthInput = {
  gender: 'male', calendarType: 'solar', birthDate: '1988-11-23',
  birthTime: '07:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};

describe('yearly 월별 keyword — 원국 궁 합충 차별화', () => {
  it('원국을 강하게 건드리는 달은 궁-특정 keyword를 낸다 (palaceLeadKeyword 배선)', () => {
    // 궁-특정 문구는 "...흐름이 닿는 달" 형태로 끝난다. 배선이 빠지면 0건이 된다.
    const a = monthKeywords(PERSON_A);
    const palaceHits = a.filter(k => k.includes('흐름이 닿는 달'));
    expect(palaceHits.length).toBeGreaterThan(0);
  });

  it('원국이 다른 두 사람은 월별 keyword 시퀀스가 다르다 (사메니스 방지)', () => {
    const a = monthKeywords(PERSON_A);
    const b = monthKeywords(PERSON_B);
    expect(a.length).toBeGreaterThan(0);
    expect(b.length).toBeGreaterThan(0);
    // 두 사람의 겹치는 개월 수에서 문구가 최소 한 번은 갈려야 한다.
    const n = Math.min(a.length, b.length);
    const differing = Array.from({ length: n }).filter((_, i) => a[i] !== b[i]).length;
    expect(differing).toBeGreaterThan(0);
  });

  it('같은 입력은 결정론적으로 같은 keyword를 낸다', () => {
    expect(monthKeywords(PERSON_A)).toEqual(monthKeywords(PERSON_A));
  });
});
