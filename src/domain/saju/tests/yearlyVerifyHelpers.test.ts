// yearlyVerifyHelpers.test.ts — scripts/lib/yearly-verify-helpers.mjs 순수 헬퍼 단위 테스트.
//
// 정책:
//   - 네트워크 호출 절대 없음. 실제 OpenAI/GptCaller import 없음.
//   - buildYearlyAnalysis(deterministic)만 사용해 실제 analysis 객체 생성.
//   - vitest는 .mjs를 직접 import 가능.

import { describe, it, expect } from 'vitest';
import {
  getYearlyFixtures,
  assertAnalysisShape,
  assertReportShape,
} from '../../../../scripts/lib/yearly-verify-helpers.mjs';
import { buildYearlyAnalysis } from '../yearly/generateYearlyFortuneReport';
import type { YearlyFortuneInput } from '../yearly/yearlyTypes';

const NOW = new Date('2026-05-25T00:00:00Z');

const SAMPLE_INPUT: YearlyFortuneInput = {
  birth: {
    gender: 'female',
    calendarType: 'solar',
    birthDate: '1995-07-06',
    birthTime: '12:00',
    birthTimeConfidence: 'exact',
    timezone: 'Asia/Seoul',
  },
  currentDate: '2026-05-25',
  relationshipStatus: 'unknown',
};

// ============================================================
// getYearlyFixtures
// ============================================================
describe('getYearlyFixtures', () => {
  it('비어있지 않은 배열 반환', () => {
    const fixtures = getYearlyFixtures();
    expect(Array.isArray(fixtures)).toBe(true);
    expect(fixtures.length).toBeGreaterThan(0);
  });

  it('각 fixture는 name(string)과 input(object)을 가짐', () => {
    const fixtures = getYearlyFixtures();
    for (const fx of fixtures) {
      expect(typeof fx.name).toBe('string');
      expect(fx.name.length).toBeGreaterThan(0);
      expect(fx.input).toBeTruthy();
      expect(typeof fx.input).toBe('object');
    }
  });

  it('각 fixture input은 birth.birthDate와 currentDate를 가짐', () => {
    const fixtures = getYearlyFixtures();
    for (const fx of fixtures) {
      expect(typeof fx.input.birth?.birthDate).toBe('string');
      expect(fx.input.currentDate).toBe('2026-05-25');
    }
  });
});

// ============================================================
// assertAnalysisShape
// ============================================================
describe('assertAnalysisShape', () => {
  it('실제 buildYearlyAnalysis 결과에서 ok=true', () => {
    const analysis = buildYearlyAnalysis(SAMPLE_INPUT, NOW);
    const result = assertAnalysisShape(analysis);
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('빈 객체 {}에서 ok=false, errors 비어있지 않음', () => {
    const result = assertAnalysisShape({});
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('null에서 ok=false', () => {
    const result = assertAnalysisShape(null);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('targetYear 누락 시 errors에 targetYear 언급', () => {
    const analysis = buildYearlyAnalysis(SAMPLE_INPUT, NOW);
    const stripped = { ...analysis, targetYear: undefined };
    const result = assertAnalysisShape(stripped);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('targetYear'))).toBe(true);
  });

  it('nextTwoYears 길이가 2가 아니면 ok=false', () => {
    const analysis = buildYearlyAnalysis(SAMPLE_INPUT, NOW);
    const stripped = { ...analysis, nextTwoYears: [] };
    const result = assertAnalysisShape(stripped);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('nextTwoYears'))).toBe(true);
  });
});

// ============================================================
// assertReportShape
// ============================================================

/** 8개 필드를 모두 갖춘 최소 유효 report mock */
function makeCompleteReport() {
  return {
    yearFlowCard: { title: '검증', subtitle: '부제', keywords: ['연결'], summary: '요약' },
    yearlyOverview: { oneLine: '한 줄', body: '본문' },
    yearlyMechanism: { body: '본문', evidenceBlocks: [] },
    remainingMonths: [],
    topicFortunes: { career: '일', money: '돈', relationship: '관계', rhythm: '리듬' },
    actionGuide: { mustCatch: ['결과물'], betterAvoid: ['무리'], bestStrategy: '전략' },
    nextTwoYears: [
      { year: 2027, keyword: '연결', summary: '흐름', opportunity: '소개', caution: '확장' },
      { year: 2028, keyword: '결산', summary: '정리', opportunity: '재정리', caution: '급진' },
    ],
    evidenceView: {
      yearGanji: { stem: '병', branch: '오', display: '병오' },
      currentDaewoonPillar: '갑술',
      yearStemTenGod: '식신',
      yearBranchTenGod: '상관',
      yearElement: '화',
      usefulGodRelation: 'useful',
      natalSewoonInteractions: [],
      daewoonSewoonInteractions: [],
      monthlySummary: [],
      activatedSpecialStars: [],
    },
  };
}

describe('assertReportShape', () => {
  it('완전한 report mock에서 ok=true', () => {
    const result = assertReportShape(makeCompleteReport());
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('빈 객체 {}에서 ok=false, errors 비어있지 않음', () => {
    const result = assertReportShape({});
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('null에서 ok=false', () => {
    const result = assertReportShape(null);
    expect(result.ok).toBe(false);
  });

  it('evidenceView 누락 시 ok=false, errors에 evidenceView 언급', () => {
    const report = makeCompleteReport();
    delete report.evidenceView;
    const result = assertReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('evidenceView'))).toBe(true);
  });

  it('topicFortunes.career 누락 시 ok=false', () => {
    const report = makeCompleteReport();
    delete report.topicFortunes.career;
    const result = assertReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('career'))).toBe(true);
  });

  it('nextTwoYears 길이가 1이면 ok=false', () => {
    const report = makeCompleteReport();
    report.nextTwoYears = [report.nextTwoYears[0]];
    const result = assertReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('nextTwoYears'))).toBe(true);
  });

  it('yearFlowCard 누락 시 ok=false, errors에 yearFlowCard 언급', () => {
    const report = makeCompleteReport();
    delete report.yearFlowCard;
    const result = assertReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some(e => e.includes('yearFlowCard'))).toBe(true);
  });
});
