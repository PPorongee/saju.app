// yearly-verify-helpers.mjs — 순수 헬퍼 (네트워크/env 의존 없음).
//
// 사용처:
//   - scripts/verify-yearly-fixtures.mjs (verify runner)
//   - src/domain/saju/tests/yearlyVerifyHelpers.test.ts (vitest)
//
// 이 파일은 tsx로 실행되는 .mjs이므로 TypeScript import는 사용하지 않는다.
// buildYearlyAnalysis 호출은 runner에서 tsx를 통해 TS 파일을 직접 import.

/**
 * 검증용 fixture 목록.
 * yearlyFortunePipeline.test.ts의 FIXTURES와 동일한 생년월일을 사용하고,
 * currentDate를 '2026-05-25'로 고정한다.
 *
 * @returns {{ name: string, input: object }[]}
 */
export function getYearlyFixtures() {
  return [
    {
      name: 'A (1995-07-06 12:00 여)',
      input: {
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
      },
    },
    {
      name: 'B (1988-03-15 03:30 남)',
      input: {
        birth: {
          gender: 'male',
          calendarType: 'solar',
          birthDate: '1988-03-15',
          birthTime: '03:30',
          birthTimeConfidence: 'exact',
          timezone: 'Asia/Seoul',
        },
        currentDate: '2026-05-25',
        relationshipStatus: 'unknown',
      },
    },
    {
      name: 'C (2001-11-22 20:45 여)',
      input: {
        birth: {
          gender: 'female',
          calendarType: 'solar',
          birthDate: '2001-11-22',
          birthTime: '20:45',
          birthTimeConfidence: 'exact',
          timezone: 'Asia/Seoul',
        },
        currentDate: '2026-05-25',
        relationshipStatus: 'unknown',
      },
    },
    {
      name: 'D (1983-08-10 06:00 남)',
      input: {
        birth: {
          gender: 'male',
          calendarType: 'solar',
          birthDate: '1983-08-10',
          birthTime: '06:00',
          birthTimeConfidence: 'exact',
          timezone: 'Asia/Seoul',
        },
        currentDate: '2026-05-25',
        relationshipStatus: 'unknown',
      },
    },
    {
      name: 'E (1977-02-10 15:30 여)',
      input: {
        birth: {
          gender: 'female',
          calendarType: 'solar',
          birthDate: '1977-02-10',
          birthTime: '15:30',
          birthTimeConfidence: 'exact',
          timezone: 'Asia/Seoul',
        },
        currentDate: '2026-05-25',
        relationshipStatus: 'unknown',
      },
    },
  ];
}

/**
 * YearlyFortuneAnalysis 구조 검증.
 * - targetYear: number
 * - targetYearGanji: { stem, branch, display }
 * - yearTenGod: { stemTenGod, branchMainTenGod }
 * - currentDaewoon.pillar: { pillarKo }
 * - yearElementEffect: { element, relationToUsefulGod }
 * - strengthImpact: { natalStrength }
 * - remainingMonthlyFortunes: array (length >= 0)
 * - nextTwoYears: array length === 2
 *
 * @param {unknown} analysis
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function assertAnalysisShape(analysis) {
  const errors = [];

  if (!analysis || typeof analysis !== 'object') {
    return { ok: false, errors: ['analysis가 object가 아님'] };
  }

  // targetYear
  if (typeof analysis.targetYear !== 'number') {
    errors.push(`targetYear가 number가 아님: ${typeof analysis.targetYear}`);
  }

  // targetYearGanji
  const ganji = analysis.targetYearGanji;
  if (!ganji || typeof ganji !== 'object') {
    errors.push('targetYearGanji가 없음');
  } else {
    if (typeof ganji.stem !== 'string' || !ganji.stem) errors.push('targetYearGanji.stem 누락');
    if (typeof ganji.branch !== 'string' || !ganji.branch) errors.push('targetYearGanji.branch 누락');
    if (typeof ganji.display !== 'string' || !ganji.display) errors.push('targetYearGanji.display 누락');
  }

  // yearTenGod
  const ytg = analysis.yearTenGod;
  if (!ytg || typeof ytg !== 'object') {
    errors.push('yearTenGod가 없음');
  } else {
    if (!ytg.stemTenGod) errors.push('yearTenGod.stemTenGod 누락');
    if (!ytg.branchMainTenGod) errors.push('yearTenGod.branchMainTenGod 누락');
  }

  // currentDaewoon.pillar.pillarKo
  const cd = analysis.currentDaewoon;
  if (!cd || typeof cd !== 'object') {
    errors.push('currentDaewoon이 없음');
  } else if (!cd.pillar || typeof cd.pillar !== 'object') {
    errors.push('currentDaewoon.pillar가 없음');
  } else if (typeof cd.pillar.pillarKo !== 'string') {
    errors.push('currentDaewoon.pillar.pillarKo가 string이 아님');
  }

  // yearElementEffect
  const yee = analysis.yearElementEffect;
  if (!yee || typeof yee !== 'object') {
    errors.push('yearElementEffect가 없음');
  } else {
    if (!yee.element) errors.push('yearElementEffect.element 누락');
    if (!yee.relationToUsefulGod) errors.push('yearElementEffect.relationToUsefulGod 누락');
  }

  // strengthImpact
  const si = analysis.strengthImpact;
  if (!si || typeof si !== 'object') {
    errors.push('strengthImpact가 없음');
  } else {
    if (!si.natalStrength) errors.push('strengthImpact.natalStrength 누락');
  }

  // remainingMonthlyFortunes (배열, 길이 무관)
  if (!Array.isArray(analysis.remainingMonthlyFortunes)) {
    errors.push('remainingMonthlyFortunes가 배열이 아님');
  }

  // nextTwoYears: 정확히 2개
  if (!Array.isArray(analysis.nextTwoYears)) {
    errors.push('nextTwoYears가 배열이 아님');
  } else if (analysis.nextTwoYears.length !== 2) {
    errors.push(`nextTwoYears 길이가 2가 아님: ${analysis.nextTwoYears.length}`);
  }

  return { ok: errors.length === 0, errors };
}

/**
 * YearlyFortuneReport 구조 검증.
 * - 8개 최상위 필드 존재
 * - topicFortunes: { career, money, relationship, rhythm }
 * - nextTwoYears: length === 2
 * - evidenceView: 존재
 *
 * @param {unknown} report
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function assertReportShape(report) {
  const errors = [];

  if (!report || typeof report !== 'object') {
    return { ok: false, errors: ['report가 object가 아님'] };
  }

  // 8개 최상위 필드
  const requiredFields = [
    'yearFlowCard',
    'yearlyOverview',
    'yearlyMechanism',
    'remainingMonths',
    'topicFortunes',
    'actionGuide',
    'nextTwoYears',
    'evidenceView',
  ];
  for (const f of requiredFields) {
    if (!(f in report) || report[f] === undefined || report[f] === null) {
      errors.push(`필드 누락: ${f}`);
    }
  }

  // topicFortunes 4 keys
  const tf = report.topicFortunes;
  if (tf && typeof tf === 'object') {
    for (const key of ['career', 'money', 'relationship', 'rhythm']) {
      if (typeof tf[key] !== 'string') {
        errors.push(`topicFortunes.${key}가 string이 아님`);
      }
    }
  }

  // nextTwoYears: length === 2
  if (Array.isArray(report.nextTwoYears)) {
    if (report.nextTwoYears.length !== 2) {
      errors.push(`nextTwoYears 길이가 2가 아님: ${report.nextTwoYears.length}`);
    }
  }

  // evidenceView 존재
  if (!report.evidenceView || typeof report.evidenceView !== 'object') {
    errors.push('evidenceView가 없거나 object가 아님');
  }

  return { ok: errors.length === 0, errors };
}
