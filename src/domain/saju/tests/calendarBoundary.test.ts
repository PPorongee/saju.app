// Module 1-4 통합 + 경계값 테스트
// Phase 1 게이트: 95년 7월 6일 오시 → 사주팔자 정확히 산출되는지.

import { describe, it, expect } from 'vitest';
import { normalizeBirthInput, isAtHourBoundary, classifyAgeGroup, type BirthInput } from '../calendar/normalizeBirthInput';
import { calculatePillars } from '../calendar/pillarCalculator';
import { lunarToSolar, solarToLunar } from '../calendar/solarLunarConverter';

describe('Module 1 — normalizeBirthInput', () => {
  it('정상 양력 입력', () => {
    const input: BirthInput = {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTime: '12:00',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    };
    const n = normalizeBirthInput(input);
    expect(n.year).toBe(1995);
    expect(n.month).toBe(7);
    expect(n.day).toBe(6);
    expect(n.hour).toBe(12);
    expect(n.minute).toBe(0);
    expect(n.hourUnknown).toBe(false);
    expect(n.hourUncertain).toBe(false);
  });

  it('시간 미상 처리', () => {
    const input: BirthInput = {
      gender: 'unknown',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTimeConfidence: 'unknown',
      timezone: 'Asia/Seoul',
    };
    const n = normalizeBirthInput(input);
    expect(n.hour).toBe(null);
    expect(n.hourUnknown).toBe(true);
    expect(n.hourUncertain).toBe(false);
  });

  it('approximate + 시진 경계 검출', () => {
    const input: BirthInput = {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1990-01-01',
      birthTime: '11:10',  // 오시 시작(11:00) +10분 → 경계
      birthTimeConfidence: 'approximate',
      timezone: 'Asia/Seoul',
    };
    const n = normalizeBirthInput(input);
    expect(n.hourUncertain).toBe(true);
    expect(n.hourAtBoundary).toBe(true);
  });

  it('approximate인데 경계가 아니면 atBoundary=false', () => {
    const input: BirthInput = {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1990-01-01',
      birthTime: '12:00',  // 오시 한가운데
      birthTimeConfidence: 'approximate',
      timezone: 'Asia/Seoul',
    };
    const n = normalizeBirthInput(input);
    expect(n.hourAtBoundary).toBe(false);
  });

  it('만 나이 계산', () => {
    const input: BirthInput = {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTimeConfidence: 'unknown',
      timezone: 'Asia/Seoul',
    };
    const n = normalizeBirthInput(input, new Date('2026-05-22'));
    expect(n.context.ageYears).toBe(31);
    expect(n.context.ageGroup).toBe('thirties');
  });

  it('컨텍스트 필드 보존', () => {
    const input: BirthInput = {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTimeConfidence: 'exact',
      birthTime: '12:00',
      timezone: 'Asia/Seoul',
      relationshipStatus: 'single',
      hasChildren: false,
      occupation: '디자이너',
      currentConcerns: ['career', 'relationship'],
    };
    const n = normalizeBirthInput(input);
    expect(n.context.relationshipStatus).toBe('single');
    expect(n.context.hasChildren).toBe(false);
    expect(n.context.occupation).toBe('디자이너');
    expect(n.context.currentConcerns).toEqual(['career', 'relationship']);
  });

  it('잘못된 birthDate', () => {
    const input: BirthInput = {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1995/07/06',
      birthTimeConfidence: 'unknown',
      timezone: 'Asia/Seoul',
    };
    expect(() => normalizeBirthInput(input)).toThrow();
  });
});

describe('Module 1 헬퍼 — 시진 경계', () => {
  it('11:00 정각은 경계', () => expect(isAtHourBoundary(11, 0)).toBe(true));
  it('10:50은 경계 (11시 -10분)', () => expect(isAtHourBoundary(10, 50)).toBe(true));
  it('11:15는 경계', () => expect(isAtHourBoundary(11, 15)).toBe(true));
  it('11:30은 경계 아님', () => expect(isAtHourBoundary(11, 30)).toBe(false));
  it('00:00 자시 경계', () => expect(isAtHourBoundary(0, 0)).toBe(true));
  it('23:50 자시 경계', () => expect(isAtHourBoundary(23, 50)).toBe(true));
});

describe('연령대 분류', () => {
  it.each([
    [10, 'child'],
    [15, 'teen'],
    [25, 'twenties'],
    [35, 'thirties'],
    [45, 'forties'],
    [55, 'fifties'],
    [65, 'sixties_plus'],
  ])('age %d → %s', (age, group) => {
    expect(classifyAgeGroup(age as number)).toBe(group);
  });
});

describe('Module 2 — 양/음력 변환', () => {
  it('양력 → 음력 (95년 7월 6일)', () => {
    const lunar = solarToLunar({ year: 1995, month: 7, day: 6 });
    expect(lunar.year).toBe(1995);
    expect(lunar.month).toBe(6);
    expect(lunar.day).toBe(9);
    expect(lunar.isLeapMonth).toBe(false);
  });

  it('음력 → 양력 (95년 음 6월 9일)', () => {
    const solar = lunarToSolar({ year: 1995, month: 6, day: 9, isLeapMonth: false });
    expect(solar).toEqual({ year: 1995, month: 7, day: 6 });
  });

  it('음력 윤달 처리 (2020년 윤4월)', () => {
    // 2020년은 윤4월. 음력 윤4월 1일 = 양력 2020-05-23
    const solar = lunarToSolar({ year: 2020, month: 4, day: 1, isLeapMonth: true });
    expect(solar.year).toBe(2020);
    expect(solar.month).toBe(5);
    expect(solar.day).toBe(23);
  });
});

describe('Module 3+4 — 사주팔자 계산 (Phase 1 게이트)', () => {
  it('★ 95년 7월 6일 오시 → 乙亥 壬午 戊戌 戊午', () => {
    const input: BirthInput = {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTime: '12:00',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    };
    const n = normalizeBirthInput(input);
    const r = calculatePillars(n);
    expect(r.pillars.year).toMatchObject({ stem: '을', branch: '해' });
    expect(r.pillars.month).toMatchObject({ stem: '임', branch: '오' });
    expect(r.pillars.day).toMatchObject({ stem: '무', branch: '술' });
    expect(r.pillars.hour).toMatchObject({ stem: '무', branch: '오' });
    expect(r.pillars.dayMaster).toBe('무');
    expect(r.pillars.isHourEstimated).toBe(false);
    // 1995-07-06 12:00 → 소서(7/7 15:01) 전 → 망종 적용 → 월지=오
    expect(r.monthBranchSource.name).toBe('망종');
    expect(r.monthBranchSource.monthBranch).toBe('오');
  });

  it('시간 미상 → 시주 undefined, 일·월·년주는 계산', () => {
    const input: BirthInput = {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTimeConfidence: 'unknown',
      timezone: 'Asia/Seoul',
    };
    const n = normalizeBirthInput(input);
    const r = calculatePillars(n);
    expect(r.pillars.hour).toBeUndefined();
    expect(r.pillars.isHourEstimated).toBe(true);
    expect(r.pillars.missingHourReason).toBeTruthy();
    expect(r.hourMethod).toBe('미상');
    expect(r.pillars.year).toMatchObject({ stem: '을', branch: '해' });
    expect(r.pillars.day).toMatchObject({ stem: '무', branch: '술' });
  });

  it('입춘 경계: 1995년 2월 4일 (입춘 15:12) 전후', () => {
    // 입춘 전 (12:00) → 갑술년
    const before: BirthInput = {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1995-02-04',
      birthTime: '12:00',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    };
    const rBefore = calculatePillars(normalizeBirthInput(before));
    // 입춘 후 (2월 5일) → 을해년
    const after: BirthInput = { ...before, birthDate: '1995-02-05' };
    const rAfter = calculatePillars(normalizeBirthInput(after));
    expect(rBefore.pillars.year.stem).not.toBe(rAfter.pillars.year.stem);
    expect(rAfter.pillars.year.stem).toBe('을');
    expect(rAfter.pillars.year.branch).toBe('해');
  });

  it('자시 경계: 23시 야자시 정책 (shift-day → 다음날 일주)', () => {
    const input: BirthInput = {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTime: '23:30',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    };
    const r = calculatePillars(normalizeBirthInput(input));
    expect(r.hourMethod).toBe('야자시');
    expect(r.dayPillarShifted).toBe(true);
    // 7/6 무술 → 다음날 7/7은 기해
    expect(r.pillars.day.stem).toBe('기');
    expect(r.pillars.day.branch).toBe('해');
  });

  it('조자시: 00:30은 당일 일주', () => {
    const input: BirthInput = {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1995-07-07',
      birthTime: '00:30',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    };
    const r = calculatePillars(normalizeBirthInput(input));
    expect(r.hourMethod).toBe('조자시');
    expect(r.dayPillarShifted).toBe(false);
    expect(r.pillars.day.stem).toBe('기');
    expect(r.pillars.day.branch).toBe('해');
  });

  it('Pillar shape: hiddenStems / yinYang 포함', () => {
    const input: BirthInput = {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTime: '12:00',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    };
    const r = calculatePillars(normalizeBirthInput(input));
    // 무토 일간: yang
    expect(r.pillars.day.stemYinYang).toBe('yang');
    // 술(戌) 지지의 지장간: 무·신·정
    expect(r.pillars.day.hiddenStems).toEqual(['무', '신', '정']);
    // 오(午) 월지의 지장간: 정·기
    expect(r.pillars.month.hiddenStems).toEqual(['정', '기']);
  });
});
