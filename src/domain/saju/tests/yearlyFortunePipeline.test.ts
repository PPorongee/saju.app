// Yearly Fortune V4 — pipeline 회귀 테스트 (LLM 호출 X).
//
// 정책:
//   - 이 파일은 실제 GPT/OpenAI API를 호출하지 않는다.
//   - 모든 검증은 deterministic 함수(yearlyAnalysisBuilder 등)와 hand-crafted 입력으로만.
//   - 실제 GPT 호출은 scripts/verify-yearly-fixtures.mjs (RUN_LLM_INTEGRATION_TESTS=true)에서 별도로 수행.

import { describe, it, expect } from 'vitest';
import {
  resolveTargetSajuYear,
  computeYearGanji,
  computeYearTenGod,
  buildY2a,
  computeDecimalAge,
  selectActiveDaewoon,
  computeDaewoonTenGod,
  buildY2b,
  computeDaewoonSewoonInteractions,
  buildY2c,
  computeNatalSewoonInteractions,
  detectNatalSewoonAdvancedHints,
  buildY2d,
  computeYearElementEffect,
  computeStrengthImpact,
  buildY2e,
  findRemainingMonthSegments,
  computeMonthlyFortuneAnalysis,
  buildY2f,
  buildY2g,
} from '../yearly/yearlyAnalysisBuilder';
import { formatYearlyEvidence, getOwnerSectionOf } from '../yearly/yearlyEvidenceFormatter';
import { buildYearlyPlans, YEARLY_LLM_SECTION_IDS } from '../yearly/yearlyPlanBuilder';
import {
  buildYearlyPromptForSection,
  buildYearlyPromptsAll,
  buildYearlyRepairPrompt,
  YEARLY_PROMPT_INTERNAL,
  type YearlyPromptContext,
} from '../yearly/yearlyPromptBuilder';
import type { YearlyFortuneAnalysis, YearlyFortuneSectionId } from '../yearly/yearlyTypes';
import { YEARLY_SECTION_TITLES, YEARLY_SECTION_MAX_TOKENS } from '../yearly/yearlyTypes';
import type { FourPillars, Pillar } from '../calendar/pillarCalculator';
import type { UsefulGodAnalysis, DayMasterStrengthAnalysis } from '../report/sajuReportSchema';
import { analyzeTenGods } from '../analysis/tenGodAnalyzer';
import { analyzeElementStrength } from '../analysis/elementStrengthAnalyzer';
import { analyzeDayMasterStrength } from '../analysis/dayMasterStrengthAnalyzer';
import { analyzeStructure } from '../analysis/structureAnalyzer';
import { analyzeUsefulGod } from '../analysis/usefulGodAnalyzer';
import type { HeavenlyStem } from '../rules/heavenlyStems';
import { normalizeBirthInput, type BirthInput } from '../calendar/normalizeBirthInput';
import { calculatePillars } from '../calendar/pillarCalculator';
import { calculateFortuneCycles, type DaewoonPillar } from '../calendar/fortuneCycleCalculator';
// Y5 — sanitizer + validator
import {
  sanitizeDeterministicFuture,
  sanitizeMedicalAdvice,
  sanitizeFearBased,
  sanitizeYearlyFinancialAdviceRisk,
  sanitizeYearlyUnsupportedUserContext,
  sanitizeEnglishElementKeys,
  sanitizeValidatorLogLeak,
  applyYearlyFinalSanitizers,
} from '../yearly/yearlySanitizer';
import {
  validateYearlyReport,
  partitionIssues,
  type YearlyValidatorContext,
} from '../yearly/yearlyReportValidator';
import type {
  YearlyFortuneReport,
  YearlyValidationIssueType,
} from '../yearly/yearlyTypes';

// fixture (개인사주 narrativePipeline.test.ts와 동일)
const FIXTURES: Array<{ name: string; input: BirthInput }> = [
  {
    name: 'A',
    input: { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  },
  {
    name: 'B',
    input: { gender: 'male',   calendarType: 'solar', birthDate: '1988-03-15', birthTime: '03:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  },
  {
    name: 'C',
    input: { gender: 'female', calendarType: 'solar', birthDate: '2001-11-22', birthTime: '20:45', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  },
];
const NOW_DATE = new Date('2026-05-25T00:00:00Z');
const CURRENT_DATE = '2026-05-25';

// ============================================================
// Y2a-1. resolveTargetSajuYear — 입춘 경계
// ============================================================
describe('Y2a-1 resolveTargetSajuYear — 입춘 경계 처리', () => {
  it('5월(입춘 한참 후) → 양력연도 그대로', () => {
    expect(resolveTargetSajuYear('2026-05-25')).toBe(2026);
  });

  it('1월(입춘 전) → 전년도', () => {
    expect(resolveTargetSajuYear('2026-01-15')).toBe(2025);
  });

  it('2월 초(입춘 직전) → 전년도', () => {
    // 2026년 입춘은 양력 2026-02-04 ~ 02-05. 02-03은 확실히 입춘 전.
    expect(resolveTargetSajuYear('2026-02-03')).toBe(2025);
  });

  it('2월 중순(입춘 후) → 양력연도', () => {
    expect(resolveTargetSajuYear('2026-02-15')).toBe(2026);
  });

  it('12월(자월, 다음해 직전) → 양력연도 (자월=11, 축월=12이 아님)', () => {
    // 12월은 대설~소한 사이 = 자월(monthIndex=11) → 양력연도 유지
    expect(resolveTargetSajuYear('2026-12-15')).toBe(2026);
  });

  it('override가 주어지면 그대로 반환', () => {
    expect(resolveTargetSajuYear('2026-05-25', 2030)).toBe(2030);
    expect(resolveTargetSajuYear('2026-01-15', 2026)).toBe(2026); // 입춘 전이라도 override 우선
  });

  it('잘못된 currentDate 형식이면 throw', () => {
    expect(() => resolveTargetSajuYear('not-a-date')).toThrow();
    expect(() => resolveTargetSajuYear('2026/05/25')).toThrow();
  });
});

// ============================================================
// Y2a-2. computeYearGanji — 60갑자 cycle
// ============================================================
describe('Y2a-2 computeYearGanji — 알려진 연도', () => {
  const cases: Array<[number, string]> = [
    [1924, '갑자'],   // 갑자년 (기준)
    [1984, '갑자'],   // 60년 후 갑자년
    [1995, '을해'],   // fixture A 출생년
    [1988, '무진'],   // fixture B 출생년
    [2001, '신사'],   // fixture C 출생년
    [2024, '갑진'],
    [2025, '을사'],
    [2026, '병오'],
    [2027, '정미'],
    [2028, '무신'],
  ];

  for (const [year, expected] of cases) {
    it(`${year} → ${expected}`, () => {
      const g = computeYearGanji(year);
      expect(g.display).toBe(expected);
      expect(g.stem + g.branch).toBe(expected);
    });
  }

  it('60년 주기성 검증', () => {
    expect(computeYearGanji(2026).display).toBe(computeYearGanji(2026 - 60).display);
    expect(computeYearGanji(2026).display).toBe(computeYearGanji(2026 + 60).display);
  });
});

// ============================================================
// Y2a-3. computeYearTenGod — 일간 × 세운
// ============================================================
describe('Y2a-3 computeYearTenGod — 일간×세운 십성', () => {
  it('무 일간 × 병오년 → 천간 편인, 지지 본기 정인, 지장간 겁재', () => {
    const ganji = computeYearGanji(2026); // 병오
    const result = computeYearTenGod('무', ganji);
    expect(result.stemTenGod).toBe('편인');       // 병→무: 양양 동기, 화→토 생, 동음양 → 편인
    expect(result.branchMainTenGod).toBe('정인'); // 오의 본기 정. 정→무: 화→토, 음양 다름 → 정인
    expect(result.hiddenStemTenGods).toEqual(['겁재']); // 오의 중기 기. 기→무: 같은 토, 음/양 다름 → 겁재
  });

  it('plainMeaning에 세운 디스플레이·천간·지지가 모두 포함', () => {
    const ganji = computeYearGanji(2026);
    const result = computeYearTenGod('무', ganji);
    expect(result.plainMeaning).toContain('병오');
    expect(result.plainMeaning).toContain('병');
    expect(result.plainMeaning).toContain('오');
    expect(result.plainMeaning).toContain('편인');
  });

  it('지장간이 1개뿐인 지지(자/묘/유)는 hiddenStemTenGods가 빈 배열', () => {
    // 갑자년: 자는 본기 계 1개만 가짐
    const ganji = computeYearGanji(1984); // 갑자
    const result = computeYearTenGod('갑', ganji);
    expect(result.hiddenStemTenGods).toEqual([]);
    // 갑 일간 → 천간 갑은 비견, 자의 본기 계는 정인
    expect(result.stemTenGod).toBe('비견');
    expect(result.branchMainTenGod).toBe('정인');
  });

  it('3 fixture (A=무 / B=기 / C=기) × 2026 → 모두 결정론적', () => {
    const ganji = computeYearGanji(2026);
    const a = computeYearTenGod('무', ganji);
    const b = computeYearTenGod('기', ganji);
    const c = computeYearTenGod('기', ganji);
    // 동일 dayMaster는 동일 결과
    expect(b).toEqual(c);
    // 다른 dayMaster는 다른 십성
    expect(a.stemTenGod).not.toBe(b.stemTenGod);
  });
});

// ============================================================
// Y2a 통합 — buildY2a
// ============================================================
describe('Y2a 통합 buildY2a', () => {
  it('currentDate + dayMaster만으로 sajuYear/ganji/yearTenGod 결정론적 산출', () => {
    const r = buildY2a({ currentDate: '2026-05-25', dayMaster: '무' });
    expect(r.sajuYear).toBe(2026);
    expect(r.ganji.display).toBe('병오');
    expect(r.yearTenGod.stemTenGod).toBe('편인');
  });

  it('targetYear override 시 currentDate 무관하게 그 연도 결과 사용', () => {
    const r = buildY2a({ currentDate: '2026-05-25', dayMaster: '무', targetYear: 2027 });
    expect(r.sajuYear).toBe(2027);
    expect(r.ganji.display).toBe('정미');
  });

  it('입춘 전 호출은 자동으로 전년도 saju로 잡힘 (override 없을 때)', () => {
    const r = buildY2a({ currentDate: '2026-01-15', dayMaster: '무' });
    expect(r.sajuYear).toBe(2025);
    expect(r.ganji.display).toBe('을사');
  });
});

// ============================================================
// Y2b-1. computeDecimalAge
// ============================================================
describe('Y2b-1 computeDecimalAge — 소수점 만 나이', () => {
  it('같은 날이면 0', () => {
    expect(computeDecimalAge('1995-07-06', '1995-07-06')).toBe(0);
  });
  it('1년 후이면 약 1.0', () => {
    const a = computeDecimalAge('1995-07-06', '1996-07-06');
    expect(a).toBeGreaterThan(0.99);
    expect(a).toBeLessThan(1.01);
  });
  it('30년 후이면 약 30.0', () => {
    const a = computeDecimalAge('1995-07-06', '2025-07-06');
    expect(a).toBeGreaterThan(29.99);
    expect(a).toBeLessThan(30.01);
  });
  it('생일 직전 1일이면 만 나이가 1 작음 (boundary)', () => {
    // 1995-07-06 출생, 2026-07-05 = 만 30세
    const a = computeDecimalAge('1995-07-06', '2026-07-05');
    expect(Math.floor(a)).toBe(30);
  });
  it('생일 당일이면 만 나이 +1 (정확히 startAge에 도달)', () => {
    // 1995-07-06 출생, 2026-07-06 = 만 31세
    const a = computeDecimalAge('1995-07-06', '2026-07-06');
    expect(Math.floor(a)).toBe(31);
  });
  it('잘못된 형식이면 throw', () => {
    expect(() => computeDecimalAge('1995/07/06', '2026-05-25')).toThrow();
    expect(() => computeDecimalAge('1995-07-06', 'not-a-date')).toThrow();
  });
});

// ============================================================
// Y2b-2. selectActiveDaewoon — 경계 규칙
// ============================================================
describe('Y2b-2 selectActiveDaewoon — 대운 시작/종료 경계', () => {
  const synth: DaewoonPillar[] = [
    { index: 1, startAge: 1.0,  endAge: 10.9, stem: '갑', branch: '인', pillarKo: '갑인' },
    { index: 2, startAge: 11.0, endAge: 20.9, stem: '을', branch: '묘', pillarKo: '을묘' },
    { index: 3, startAge: 21.0, endAge: 30.9, stem: '병', branch: '진', pillarKo: '병진' },
    { index: 4, startAge: 31.0, endAge: 40.9, stem: '정', branch: '사', pillarKo: '정사' },
    { index: 5, startAge: 41.0, endAge: 50.9, stem: '무', branch: '오', pillarKo: '무오' },
  ];

  it('age < 첫 대운 startAge → 첫 대운', () => {
    expect(selectActiveDaewoon(synth, 0.5).index).toBe(1);
    expect(selectActiveDaewoon(synth, 0.99).index).toBe(1);
  });
  it('age == 첫 대운 startAge → 첫 대운 (closed start)', () => {
    expect(selectActiveDaewoon(synth, 1.0).index).toBe(1);
  });
  it('age == 다음 대운 startAge → 다음 대운 (closed-open: 새 대운으로 진입)', () => {
    expect(selectActiveDaewoon(synth, 11.0).index).toBe(2);
    expect(selectActiveDaewoon(synth, 21.0).index).toBe(3);
    expect(selectActiveDaewoon(synth, 31.0).index).toBe(4);
  });
  it('age = 시작 직전 (startAge - 0.01) → 이전 대운', () => {
    expect(selectActiveDaewoon(synth, 10.99).index).toBe(1);
    expect(selectActiveDaewoon(synth, 20.99).index).toBe(2);
    expect(selectActiveDaewoon(synth, 30.99).index).toBe(3);
  });
  it('age = 시작 직후 (startAge + 0.01) → 새 대운', () => {
    expect(selectActiveDaewoon(synth, 11.01).index).toBe(2);
    expect(selectActiveDaewoon(synth, 21.01).index).toBe(3);
  });
  it('age >= 마지막 대운 endAge + ε → 마지막 대운 (배열 끝 보호)', () => {
    // synth 마지막 startAge=41 → 41+10=51 이후는 마지막 대운 반환
    expect(selectActiveDaewoon(synth, 51.0).index).toBe(5);
    expect(selectActiveDaewoon(synth, 100).index).toBe(5);
  });
  it('빈 배열이면 throw', () => {
    expect(() => selectActiveDaewoon([], 30)).toThrow();
  });
});

// ============================================================
// Y2b-3. computeDaewoonTenGod
// ============================================================
describe('Y2b-3 computeDaewoonTenGod — 대운 천간/지지 십성', () => {
  it('무 일간 × 병오 대운 → 천간 편인, 지지 본기 정인, 지장간 겁재 (세운 계산과 같은 패턴)', () => {
    const synth: DaewoonPillar = { index: 3, startAge: 21.0, endAge: 30.9, stem: '병', branch: '오', pillarKo: '병오' };
    const r = computeDaewoonTenGod('무', synth);
    expect(r.stemTenGod).toBe('편인');
    expect(r.branchTenGod).toBe('정인');
    expect(r.hiddenStemTenGods).toEqual(['겁재']);
    expect(r.plainMeaning).toContain('병오');
    expect(r.plainMeaning).toContain('편인');
  });

  it('지장간 1개뿐인 지지(자/묘/유) → hiddenStemTenGods는 빈 배열', () => {
    const synth: DaewoonPillar = { index: 1, startAge: 1.0, endAge: 10.9, stem: '갑', branch: '자', pillarKo: '갑자' };
    const r = computeDaewoonTenGod('갑', synth);
    expect(r.hiddenStemTenGods).toEqual([]);
    expect(r.stemTenGod).toBe('비견');
  });
});

// ============================================================
// Y2b-4. buildY2b — A/B/C fixture currentDate=2026-05-25
// ============================================================
describe('Y2b-4 buildY2b — A/B/C fixture 활성 대운 식별', () => {
  for (const fx of FIXTURES) {
    it(`${fx.name} fixture — currentDate=${CURRENT_DATE}에서 활성 대운이 deterministic`, () => {
      const nb = normalizeBirthInput(fx.input, NOW_DATE);
      const pr = calculatePillars(nb);
      const r = buildY2b({ normalizedBirth: nb, pillars: pr.pillars, currentDate: CURRENT_DATE });

      // 기본 정합성
      expect(r.daewoonList.length).toBe(8);
      expect(r.fortuneCycle.daewoonList).toBe(r.daewoonList); // 동일 참조
      expect(r.activeDaewoon).toBeDefined();
      expect(r.currentDaewoon.pillar).toBe(r.activeDaewoon);
      expect(r.currentDaewoon.stemTenGod).toBeDefined();
      expect(r.currentDaewoon.branchTenGod).toBeDefined();

      // 활성 대운은 daewoonList 안의 항목이어야 함
      expect(r.daewoonList).toContain(r.activeDaewoon);

      // decimalAge가 활성 대운의 [startAge, startAge+10) 안에 있어야 함
      const sa = r.activeDaewoon.startAge;
      // age < firstStart인 fallback 케이스가 아닌 한
      if (r.decimalAge >= r.daewoonList[0].startAge && r.decimalAge < r.daewoonList[r.daewoonList.length - 1].startAge + 10) {
        expect(r.decimalAge).toBeGreaterThanOrEqual(sa);
        expect(r.decimalAge).toBeLessThan(sa + 10);
      }

      // 두 번 호출해도 같은 결과 (deterministic)
      const r2 = buildY2b({ normalizedBirth: nb, pillars: pr.pillars, currentDate: CURRENT_DATE });
      expect(r2.currentDaewoon.pillar.pillarKo).toBe(r.currentDaewoon.pillar.pillarKo);
      expect(r2.activeDaewoon).toEqual(r.activeDaewoon);
    });
  }
});

// ============================================================
// Y2b-5. 개인사주 정합 — 기존 calculateFortuneCycles.currentDaewoon과 비교
// ============================================================
describe('Y2b-5 개인사주 정합 — 기존 currentDaewoon과 활성 대운 비교', () => {
  for (const fx of FIXTURES) {
    it(`${fx.name} fixture — 기존 calculateFortuneCycles.currentDaewoon과 ±1 인접 (정합 또는 경계 인접)`, () => {
      const nb = normalizeBirthInput(fx.input, NOW_DATE);
      const pr = calculatePillars(nb);
      const r = buildY2b({ normalizedBirth: nb, pillars: pr.pillars, currentDate: CURRENT_DATE });
      const legacy = r.fortuneCycle.currentDaewoon; // 기존 코드 결과 (year-level integer age)

      const newIdx = r.activeDaewoon.index;
      const legacyIdx = legacy.index;
      // 경계 직후 ±1년 misalignment 허용 — 그 외에는 동일해야 함
      expect(Math.abs(newIdx - legacyIdx)).toBeLessThanOrEqual(1);
    });
  }
});

// ============================================================
// Y2b-6. 경계 시뮬레이션 — 대운 시작일과 동일한 날 호출 시 새 대운으로 들어감
// ============================================================
describe('Y2b-6 currentDate==대운 시작일 → 새 대운 진입', () => {
  it('synthetic — daewoonList[1] startAge에 정확히 도달하면 그 대운 선택', () => {
    const list: DaewoonPillar[] = [
      { index: 1, startAge: 1.0,  endAge: 10.9, stem: '갑', branch: '인', pillarKo: '갑인' },
      { index: 2, startAge: 11.0, endAge: 20.9, stem: '을', branch: '묘', pillarKo: '을묘' },
    ];
    // 정확히 11.0
    expect(selectActiveDaewoon(list, 11.0).index).toBe(2);
    // 11.0 - epsilon
    expect(selectActiveDaewoon(list, 10.9999).index).toBe(1);
    // 11.0 + epsilon
    expect(selectActiveDaewoon(list, 11.0001).index).toBe(2);
  });

  it('fixture A — 활성 대운 startAge 정확 도달 시 그 대운 선택 (계산된 startAge 사용)', () => {
    const nb = normalizeBirthInput(FIXTURES[0].input, NOW_DATE);
    const pr = calculatePillars(nb);
    const fc = calculateFortuneCycles(nb, pr.pillars, 2026);
    // 활성 대운 직전 대운의 endAge ≈ activeDaewoon.startAge - 0.1
    // activeDaewoon.startAge 직전 ε → 그 직전 대운, 정확 도달 → 새 대운
    const idxOfActive = fc.daewoonList.findIndex(d => d.pillarKo === fc.currentDaewoon.pillarKo);
    if (idxOfActive > 0) {
      const sa = fc.daewoonList[idxOfActive].startAge;
      // ε 작은 값
      expect(selectActiveDaewoon(fc.daewoonList, sa - 0.001).index).toBe(idxOfActive); // 이전
      expect(selectActiveDaewoon(fc.daewoonList, sa).index).toBe(idxOfActive + 1);     // 정확 도달 = 새
    }
  });
});

// ============================================================
// Y2c. 대운-세운 합·충·형·파·해
// ============================================================
import type { DaewoonPillar as DP } from '../calendar/fortuneCycleCalculator';

function mkDaewoon(stem: string, branch: string, idx = 4, startAge = 30): DP {
  return {
    index: idx,
    startAge,
    endAge: startAge + 9.9,
    stem: stem as DP['stem'],
    branch: branch as DP['branch'],
    pillarKo: stem + branch,
  };
}
function mkGanji(stem: string, branch: string) {
  return { stem, branch, display: stem + branch };
}

describe('Y2c-1 천간합 (5종 중 1)', () => {
  it('대운 갑 + 세운 기 → 갑기합화토', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '인'), mkGanji('기', '미'));
    const stemCombo = out.find(i => i.target === 'stem' && i.kind === '합');
    expect(stemCombo).toBeDefined();
    expect(stemCombo!.label).toBe('갑기합화토');
    expect(stemCombo!.from).toBe('대운');
    expect(stemCombo!.to).toBe('세운');
    expect(stemCombo!.intensity).toBe('medium');
    expect(stemCombo!.adviceHint?.actionable).toBeTruthy();
  });
  it('대운 무 + 세운 계 → 무계합화화 (양방향 매칭 — 세운이 갑/기 위치 아니어도 OK)', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('무', '오'), mkGanji('계', '축'));
    expect(out.some(i => i.label === '무계합화화')).toBe(true);
  });
});

describe('Y2c-2 천간충 (4종)', () => {
  it('대운 갑 + 세운 경 → 천간충', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '인'), mkGanji('경', '신'));
    const conflict = out.find(i => i.target === 'stem' && i.kind === '충');
    expect(conflict).toBeDefined();
    expect(conflict!.label).toContain('천간충');
    expect(conflict!.intensity).toBe('strong');
    expect(conflict!.adviceHint?.avoidPattern).toBeTruthy();
  });
  it('무·기는 천간충 대상 아님 (테이블에 없음)', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('무', '오'), mkGanji('기', '미'));
    expect(out.some(i => i.target === 'stem' && i.kind === '충')).toBe(false);
  });
});

describe('Y2c-3 지지 육합', () => {
  it('대운 자 + 세운 축 → 자축합화토', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '자'), mkGanji('을', '축'));
    const six = out.find(i => i.target === 'branch' && i.kind === '합' && i.scopeTag.includes('six'));
    expect(six).toBeDefined();
    expect(six!.label).toBe('자축합화토');
    expect(six!.intensity).toBe('medium');
  });
});

describe('Y2c-4 지지 반합', () => {
  it('대운 인 + 세운 오 → 인오 반합', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '인'), mkGanji('병', '오'));
    const half = out.find(i => i.scopeTag.includes('half'));
    expect(half).toBeDefined();
    expect(half!.label).toBe('인오 반합');
  });
});

describe('Y2c-5 지지 충', () => {
  it('대운 묘 + 세운 유 → 묘유 충, strong', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('을', '묘'), mkGanji('신', '유'));
    const conflict = out.find(i => i.target === 'branch' && i.kind === '충');
    expect(conflict).toBeDefined();
    expect(conflict!.label).toBe('묘-유 충');
    expect(conflict!.intensity).toBe('strong');
    expect(conflict!.plainMeaning).toContain('흔들림');
  });
});

describe('Y2c-6 지지 형', () => {
  it('대운 자 + 세운 묘 → 자묘 무례지형, medium', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '자'), mkGanji('을', '묘'));
    const pun = out.find(i => i.kind === '형');
    expect(pun).toBeDefined();
    expect(pun!.label).toBe('자묘 무례지형');
    expect(pun!.intensity).toBe('medium');
  });
  it('대운 오 + 세운 오 → 자형(오오), medium', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '오'), mkGanji('병', '오'));
    const pun = out.find(i => i.kind === '형');
    expect(pun).toBeDefined();
    expect(pun!.label).toContain('자형');
  });
  it('대운 인 + 세운 사 → 자형(인사신 3-pillar 형은 본 함수에서 적용 안 함)', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '인'), mkGanji('병', '사'));
    // 자묘/자형이 아니라 인사 단독은 2-pillar 형으로 잡지 않음
    expect(out.some(i => i.kind === '형')).toBe(false);
  });
});

describe('Y2c-7 지지 파', () => {
  it('대운 자 + 세운 유 → 자유 파, mild', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '자'), mkGanji('신', '유'));
    const dest = out.find(i => i.kind === '파');
    expect(dest).toBeDefined();
    expect(dest!.intensity).toBe('mild');
  });
});

describe('Y2c-8 지지 해', () => {
  it('대운 자 + 세운 미 → 자미 해, mild', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '자'), mkGanji('기', '미'));
    const harm = out.find(i => i.kind === '해');
    expect(harm).toBeDefined();
    expect(harm!.intensity).toBe('mild');
  });
});

describe('Y2c-9 복합 — 한 쌍에서 여러 작용이 동시에 잡힐 수 있음', () => {
  it('대운 인 + 세운 해 → 인해합화목 + 인해 파 동시', () => {
    const out = computeDaewoonSewoonInteractions(mkDaewoon('갑', '인'), mkGanji('을', '해'));
    expect(out.some(i => i.label === '인해합화목')).toBe(true);
    expect(out.some(i => i.kind === '파')).toBe(true);
  });
});

describe('Y2c-10 buildY2c summary + plainMeaning', () => {
  it('아무 작용 없는 케이스 — summary가 "두드러진 작용 없음" 톤', () => {
    const r = buildY2c({ daewoonPillar: mkDaewoon('갑', '인'), sewoonGanji: mkGanji('계', '축') });
    expect(r.interactions.length).toBe(0);
    expect(r.summary).toContain('두드러진');
    expect(r.plainMeaning).toContain('기존 결이 이어지는');
  });

  it('작용 있는 케이스 — summary에 label 나열, plainMeaning에 "단정이 아닌 흐름 신호"', () => {
    const r = buildY2c({ daewoonPillar: mkDaewoon('을', '묘'), sewoonGanji: mkGanji('신', '유') });
    expect(r.interactions.length).toBeGreaterThan(0);
    expect(r.summary).toContain('묘-유 충');
    expect(r.plainMeaning).toContain('흐름 신호');
  });
});

describe('Y2c-11 A/B/C fixture — 대운/세운 interaction 결정론', () => {
  for (const fx of FIXTURES) {
    it(`${fx.name} fixture — 두 번 호출해도 동일 결과 + 안전 톤`, () => {
      const nb = normalizeBirthInput(fx.input, NOW_DATE);
      const pr = calculatePillars(nb);
      const y2b = buildY2b({ normalizedBirth: nb, pillars: pr.pillars, currentDate: CURRENT_DATE });
      // currentDate=2026-05-25 → sajuYear=2026 → 병오
      const sewoon = mkGanji('병', '오');
      const r1 = buildY2c({ daewoonPillar: y2b.activeDaewoon, sewoonGanji: sewoon });
      const r2 = buildY2c({ daewoonPillar: y2b.activeDaewoon, sewoonGanji: sewoon });
      expect(r2.interactions.length).toBe(r1.interactions.length);
      expect(r2.interactions.map(i => i.label)).toEqual(r1.interactions.map(i => i.label));

      // 모든 interaction에서 from='대운' / to='세운', intensity 필수
      for (const i of r1.interactions) {
        expect(i.from).toBe('대운');
        expect(i.to).toBe('세운');
        expect(['mild','medium','strong']).toContain(i.intensity);
        // 불안 조장 표현 금지 — 천간 "병"(병화) 단독은 false positive이므로 복합어로만 검사
        expect(i.plainMeaning).not.toMatch(/사고|사망|파산|이혼|이별|질병|발병|중병|위독/);
      }
    });
  }
});

// ============================================================
// Y2d. 세운 ↔ 원국 4주 합·충·형·파·해 + 궁 영향
// ============================================================

// FourPillars 합성 helper (test 전용)
function mkPillar(stem: string, branch: string): Pillar {
  return {
    stem: stem as Pillar['stem'],
    branch: branch as Pillar['branch'],
    stemElement: 'wood', stemYinYang: 'yang', branchElement: 'wood', branchYinYang: 'yang',
    hiddenStems: [],
  };
}
function mkFourPillars(y: [string, string], m: [string, string], d: [string, string], h?: [string, string]): FourPillars {
  return {
    year: mkPillar(y[0], y[1]),
    month: mkPillar(m[0], m[1]),
    day: mkPillar(d[0], d[1]),
    hour: h ? mkPillar(h[0], h[1]) : undefined,
    dayMaster: d[0] as Pillar['stem'],
    isHourEstimated: false,
  };
}

describe('Y2d-1 궁 매핑 — pillar별 pillarLabel/palaceTopic', () => {
  it('년주→배경, 월주→사회/일, 일주→나/관계, 시주→미래/결과물', () => {
    const fp = mkFourPillars(['갑', '자'], ['을', '축'], ['병', '인'], ['정', '묘']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('기', '미'), { relationshipStatus: 'unknown', hasChildren: 'unknown' });
    expect(groups.length).toBe(4);
    const byKey = Object.fromEntries(groups.map(g => [g.pillar, g]));
    expect(byKey.year.pillarLabel).toBe('년주');
    expect(byKey.year.palaceTopic).toBe('배경');
    expect(byKey.month.pillarLabel).toBe('월주');
    expect(byKey.month.palaceTopic).toBe('사회/일');
    expect(byKey.day.pillarLabel).toBe('일주');
    expect(byKey.day.palaceTopic).toBe('나/관계');
    expect(byKey.hour.pillarLabel).toBe('시주');
    expect(byKey.hour.palaceTopic).toBe('미래/결과물');
  });

  it('시간 미상이면 시주 group 생성 X (length=3)', () => {
    const fp = mkFourPillars(['갑', '자'], ['을', '축'], ['병', '인']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('기', '미'));
    expect(groups.length).toBe(3);
  });
});

describe('Y2d-2 from/to 라벨 — from=세운 / to=원국-N주', () => {
  it('월주 작용에서 from=세운 / to=원국-월주', () => {
    const fp = mkFourPillars(['갑', '자'], ['을', '묘'], ['병', '오'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('신', '유'));
    const monthGroup = groups.find(g => g.pillar === 'month')!;
    expect(monthGroup.interactions.length).toBeGreaterThan(0);
    for (const i of monthGroup.interactions) {
      expect(i.from).toBe('세운');
      expect(i.to).toBe('원국-월주');
    }
  });
});

describe('Y2d-3 궁 영향 매핑 — kind+palace lifeSceneHint', () => {
  it('합 + 월주 → 직장·팀 협업 결', () => {
    const fp = mkFourPillars(['갑', '자'], ['기', '축'], ['병', '인'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('갑', '자'));
    const monthGroup = groups.find(g => g.pillar === 'month')!;
    const combo = monthGroup.interactions.find(i => i.kind === '합' && i.target === 'stem');
    expect(combo?.label).toBe('갑기합화토');
    expect(monthGroup.lifeSceneHint).toContain('직장');
    expect(monthGroup.adviceHint?.actionable).toBeTruthy();
  });

  it('충 + 월주 → 직장·역할·업무 변화 신호', () => {
    const fp = mkFourPillars(['갑', '자'], ['을', '묘'], ['병', '오'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('신', '유'));
    const monthGroup = groups.find(g => g.pillar === 'month')!;
    const conflict = monthGroup.interactions.find(i => i.kind === '충' && i.target === 'branch');
    expect(conflict?.label).toBe('묘-유 충');
    expect(monthGroup.lifeSceneHint).toMatch(/직장|역할|업무/);
    expect(conflict?.intensity).toBe('strong');
  });

  it('합 + 일주 → 가까운 관계·생활 리듬 결', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '묘'], ['무', '자'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('계', '해'));
    const dayGroup = groups.find(g => g.pillar === 'day')!;
    const stemCombo = dayGroup.interactions.find(i => i.kind === '합' && i.target === 'stem');
    expect(stemCombo?.label).toBe('무계합화화');
    expect(dayGroup.lifeSceneHint).toMatch(/가까운 관계|생활 리듬/);
  });

  it('충 + 일주 → 가까운 관계·리듬 변화 신호', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '묘'], ['갑', '오'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('경', '자'));
    const dayGroup = groups.find(g => g.pillar === 'day')!;
    const stemConflict = dayGroup.interactions.find(i => i.kind === '충' && i.target === 'stem');
    const branchConflict = dayGroup.interactions.find(i => i.kind === '충' && i.target === 'branch');
    expect(stemConflict?.label).toContain('천간충');
    expect(branchConflict?.label).toBe('자-오 충');
    expect(dayGroup.lifeSceneHint).toMatch(/가까운 관계|리듬/);
  });

  it('파 + 시주 → 결과물/일정 누수 신호', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '묘'], ['병', '오'], ['신', '유']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('무', '자'));
    const hourGroup = groups.find(g => g.pillar === 'hour')!;
    const destruction = hourGroup.interactions.find(i => i.kind === '파');
    expect(destruction).toBeDefined();
    expect(hourGroup.lifeSceneHint).toMatch(/결과물|일정|약속/);
    expect(destruction?.intensity).toBe('mild');
  });

  it('해 + 시주 → 후배/장기 계획 어긋남 신호', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '묘'], ['병', '오'], ['계', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('갑', '자'));
    const hourGroup = groups.find(g => g.pillar === 'hour')!;
    const harm = hourGroup.interactions.find(i => i.kind === '해');
    expect(harm).toBeDefined();
    expect(hourGroup.lifeSceneHint).toMatch(/후배|장기 계획|어긋남/);
  });
});

describe('Y2d-4 caution — relationshipStatus/hasChildren 미상 안내', () => {
  it('relationshipStatus=unknown → 일주 group에 caution 존재', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '묘'], ['병', '오'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('신', '유'), { relationshipStatus: 'unknown' });
    const dayGroup = groups.find(g => g.pillar === 'day')!;
    expect(dayGroup.caution).toBeTruthy();
    expect(dayGroup.caution).toMatch(/가까운 관계|장기적 관계/);
  });

  it('hasChildren=unknown → 시주 group에 caution 존재', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '묘'], ['병', '오'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('신', '유'), { hasChildren: 'unknown' });
    const hourGroup = groups.find(g => g.pillar === 'hour')!;
    expect(hourGroup.caution).toBeTruthy();
    expect(hourGroup.caution).toMatch(/자녀|후배|돌봄/);
  });

  it('relationshipStatus=married + hasChildren=true → 일주/시주 caution 없음', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '묘'], ['병', '오'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('신', '유'), { relationshipStatus: 'married', hasChildren: true });
    expect(groups.find(g => g.pillar === 'day')!.caution).toBeUndefined();
    expect(groups.find(g => g.pillar === 'hour')!.caution).toBeUndefined();
  });

  it('일주/시주 본문에 "아내/남편/배우자/자녀" 단정 없음 (unknown 케이스)', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '묘'], ['병', '오'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('신', '유'), { relationshipStatus: 'unknown', hasChildren: 'unknown' });
    for (const g of groups) {
      expect(g.lifeSceneHint).not.toMatch(/아내|남편|배우자(?!궁)|자녀/);
      expect(g.plainMeaning).not.toMatch(/아내|남편|배우자(?!궁)|자녀/);
    }
  });
});

describe('Y2d-5 안전 톤 — 불안 조장 단어 0건', () => {
  it('전체 group에서 plainMeaning/lifeSceneHint/adviceHint에 사고/사망/파산/이혼확정/질병 등 없음', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '묘'], ['병', '오'], ['정', '미']);
    const groups = computeNatalSewoonInteractions(fp, mkGanji('신', '유'));
    for (const g of groups) {
      const all = [g.plainMeaning, g.lifeSceneHint, g.adviceHint?.actionable, g.adviceHint?.avoidPattern, g.adviceHint?.activatePattern].filter(Boolean).join(' ');
      expect(all).not.toMatch(/사고|사망|파산|이혼확정|질병|발병|중병|위독|실패확정|무조건 깨/);
    }
  });
});

describe('Y2d-6 3-pillar advanced detect (Phase 2 자리)', () => {
  it('삼합 완성 — 세운 술 + 원국 인+오 → 인오술 화국', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '오'], ['병', '진'], ['정', '미']);
    const hints = detectNatalSewoonAdvancedHints(fp, mkGanji('계', '술'));
    const tri = hints.find(h => h.kind === '삼합완성');
    expect(tri).toBeDefined();
    expect(tri!.label).toContain('인오술');
    expect(tri!.intensity).toBe('strong');
  });

  it('방합 완성 — 세운 인 + 원국 묘+진 → 인묘진 동방 목국', () => {
    const fp = mkFourPillars(['갑', '묘'], ['을', '진'], ['병', '오'], ['정', '미']);
    const hints = detectNatalSewoonAdvancedHints(fp, mkGanji('갑', '인'));
    const dir = hints.find(h => h.kind === '방합완성');
    expect(dir).toBeDefined();
    expect(dir!.label).toContain('인묘진');
  });

  it('지세지형 완성 — 세운 신 + 원국 인+사 → 인사신', () => {
    const fp = mkFourPillars(['갑', '인'], ['을', '사'], ['병', '오'], ['정', '미']);
    const hints = detectNatalSewoonAdvancedHints(fp, mkGanji('경', '신'));
    const tri = hints.find(h => h.kind === '지세지형완성');
    expect(tri).toBeDefined();
  });
});

describe('Y2d-7 A/B/C fixture deterministic', () => {
  for (const fx of FIXTURES) {
    it(`${fx.name} — buildY2d 두 번 호출 동일 + 시주 포함 시 group 4개`, () => {
      const nb = normalizeBirthInput(fx.input, NOW_DATE);
      const pr = calculatePillars(nb);
      const sewoon = mkGanji('병', '오');
      const r1 = buildY2d({ pillars: pr.pillars, sewoonGanji: sewoon, options: { relationshipStatus: 'unknown', hasChildren: 'unknown' } });
      const r2 = buildY2d({ pillars: pr.pillars, sewoonGanji: sewoon, options: { relationshipStatus: 'unknown', hasChildren: 'unknown' } });

      expect(r1.natalSewoonInteractions.length).toBe(pr.pillars.hour ? 4 : 3);
      expect(r1.natalSewoonInteractions.length).toBe(r2.natalSewoonInteractions.length);
      for (let i = 0; i < r1.natalSewoonInteractions.length; i++) {
        expect(r1.natalSewoonInteractions[i].interactions.map(x => x.label))
          .toEqual(r2.natalSewoonInteractions[i].interactions.map(x => x.label));
      }

      for (const g of r1.natalSewoonInteractions) {
        for (const it of g.interactions) {
          expect(it.from).toBe('세운');
          expect(it.to).toBe(`원국-${g.pillarLabel}`);
        }
      }

      const dayG = r1.natalSewoonInteractions.find(g => g.pillar === 'day')!;
      const hourG = r1.natalSewoonInteractions.find(g => g.pillar === 'hour');
      expect(dayG.caution).toBeTruthy();
      if (hourG) expect(hourG.caution).toBeTruthy();
    });
  }
});

// ============================================================
// Y2e. 세운 오행 vs 용신/기신 + 신강/신약 부담/지원
// ============================================================

// synthetic UsefulGodAnalysis helper
function mkUsefulGod(args: {
  primaryUsefulElement?: 'wood' | 'fire' | 'earth' | 'metal' | 'water';
  favorable?: Array<'wood' | 'fire' | 'earth' | 'metal' | 'water'>;
  unfavorable?: Array<'wood' | 'fire' | 'earth' | 'metal' | 'water'>;
}): UsefulGodAnalysis {
  return {
    primaryUseful: args.primaryUsefulElement ? { type: 'element', value: args.primaryUsefulElement } : { type: 'element', value: 'wood' },
    favorable: args.favorable ?? [],
    unfavorable: args.unfavorable ?? [],
    methodScores: { climate: 0, strength: 0, bridge: 0, illnessMedicine: 0, structure: 0 },
    reasons: [],
    caution: [],
    confidence: 'high',
  };
}

function mkDms(level: DayMasterStrengthAnalysis['level']): DayMasterStrengthAnalysis {
  return {
    level, score: 0,
    supportFactors: [], drainingFactors: [], conflictFactors: [],
    conclusion: '', confidence: 'high',
  };
}

describe('Y2e-1 computeYearElementEffect — useful/favorable/unfavorable/neutral 분류', () => {
  it('useful — 세운 천간 element가 primaryUseful element와 일치', () => {
    // 2026 병오. 천간 병 → element=fire
    const ganji = computeYearGanji(2026);
    const ug = mkUsefulGod({ primaryUsefulElement: 'fire' });
    const r = computeYearElementEffect(ganji, '무', ug);
    expect(r.relationToUsefulGod).toBe('useful');
    expect(r.element).toBe('화');
    expect(r.intensity).toBe('strong');
    expect(r.label).toContain('용신');
    expect(r.plainMeaning).toContain('편하게 살려');
  });

  it('favorable — 세운 천간이 favorable 배열에 포함', () => {
    const ganji = computeYearGanji(2026);
    const ug = mkUsefulGod({ primaryUsefulElement: 'earth', favorable: ['fire'] });
    const r = computeYearElementEffect(ganji, '무', ug);
    expect(r.relationToUsefulGod).toBe('favorable');
    expect(r.intensity).toBe('medium');
    expect(r.label).toContain('희신');
  });

  it('unfavorable — 세운 천간이 unfavorable 배열에 포함 (기신이지만 "나쁨" 표현 X)', () => {
    const ganji = computeYearGanji(2026);
    const ug = mkUsefulGod({ primaryUsefulElement: 'water', unfavorable: ['fire'] });
    const r = computeYearElementEffect(ganji, '무', ug);
    expect(r.relationToUsefulGod).toBe('unfavorable');
    expect(r.intensity).toBe('strong');
    expect(r.label).toContain('기신');
    expect(r.label).toContain('과해지면 부담');
    // 안전 톤 검증
    expect(r.plainMeaning).not.toMatch(/나쁜 해|무조건|반드시 실패|확정/);
    expect(r.plainMeaning).toContain('과해지면');
    expect(r.adviceHint.actionable).toMatch(/조건|선택적|작게|정리/);
    expect(r.caution).toBeTruthy();
    expect(r.caution).toMatch(/기신=.*나쁜|과해지면/);
  });

  it('neutral — 세운 천간이 useful/favorable/unfavorable 어디에도 없음', () => {
    const ganji = computeYearGanji(2026);
    const ug = mkUsefulGod({ primaryUsefulElement: 'metal', favorable: ['water'], unfavorable: ['wood'] });
    const r = computeYearElementEffect(ganji, '무', ug);
    expect(r.relationToUsefulGod).toBe('neutral');
    expect(r.intensity).toBe('mild');
    expect(r.label).toContain('중립');
  });

  it('TenGod 형태의 favorable/unfavorable도 일간 기준 element로 정규화', () => {
    // 무 일간 기준: 식신=금(metal)
    // 2026 병오 → 세운 천간 fire. favorable에 '식신'(=금) 포함되어도 fire와 매칭 X → neutral
    const ganji = computeYearGanji(2026);
    const ug: UsefulGodAnalysis = {
      primaryUseful: { type: 'tenGod', value: '식신' }, // 무→식신=금
      favorable: ['편인'], // 무→편인=화 (PRODUCES[fire]=earth, invert 시 wood가 인성. 사실 fire를 생하는 게 wood, earth를 생하는 게 fire → 인성은 fire를 생하는 element = wood)
      unfavorable: [],
      methodScores: { climate: 0, strength: 0, bridge: 0, illnessMedicine: 0, structure: 0 },
      reasons: [], caution: [], confidence: 'high',
    };
    const r = computeYearElementEffect(ganji, '무', ug);
    // 무→식신=금, 편인=화 (fire를 생하는 wood가 무를 생하지 않음... 정확히는 무 일간을 생하는 element = fire, RESTRAINS 검사)
    // 정확 계산: 편인=일간을 생하는 element. STEM_ELEMENT[무]=earth. PRODUCES[fire]=earth → fire가 earth를 생. 따라서 인성 element = fire.
    // 그러므로 favorable에 '편인'은 fire로 정규화 → 세운 fire와 매칭 → 'favorable'
    expect(r.relationToUsefulGod).toBe('favorable');
  });
});

describe('Y2e-2 computeStrengthImpact — 신강/신약/중화 × yearlyEffect', () => {
  it('신강(strong) + 세운이 비겁/인성 element → burdensome', () => {
    // 일간 무(earth) — 세운 무토(2028) → element=earth, rel=비겁
    const ganji = computeYearGanji(2028); // 무신
    const r = computeStrengthImpact(ganji, '무', mkDms('strong'));
    expect(r.natalStrength).toBe('신강');
    expect(r.yearlyEffect).toBe('burdensome');
    expect(r.plainMeaning).toContain('신강');
    expect(r.plainMeaning).not.toMatch(/나쁜|실패/);
    expect(r.adviceHint.actionable).toBeTruthy();
    expect(r.adviceHint.avoidPattern).toBeTruthy();
    expect(r.caution).toBeTruthy();
  });

  it('신강(very-strong) + 세운이 식상/재성/관성 element → supportive (균형)', () => {
    // 일간 무(earth) — 세운 갑목(1984) → element=wood, rel=관성(wood가 earth 극)
    const ganji = computeYearGanji(1984); // 갑자
    const r = computeStrengthImpact(ganji, '무', mkDms('very-strong'));
    expect(r.natalStrength).toBe('신강');
    expect(r.yearlyEffect).toBe('supportive');
    expect(r.plainMeaning).toContain('균형');
  });

  it('신약(weak) + 세운이 비겁/인성 element → supportive (지원)', () => {
    // 일간 무 - 세운 무신(2028) → 비겁
    const ganji = computeYearGanji(2028);
    const r = computeStrengthImpact(ganji, '무', mkDms('weak'));
    expect(r.natalStrength).toBe('신약');
    expect(r.yearlyEffect).toBe('supportive');
    expect(r.plainMeaning).toContain('환경');
    expect(r.plainMeaning).not.toMatch(/약하/);
  });

  it('신약(very-weak) + 세운이 재성/관성 element → burdensome (소모) + 안전 톤', () => {
    // 일간 무 - 세운 갑자(1984) → wood=관성 (무를 극)
    const ganji = computeYearGanji(1984);
    const r = computeStrengthImpact(ganji, '무', mkDms('very-weak'));
    expect(r.natalStrength).toBe('신약');
    expect(r.yearlyEffect).toBe('burdensome');
    expect(r.plainMeaning).not.toMatch(/나쁜 해|실패|확정/);
    expect(r.plainMeaning).toContain('조건을 고르');
    expect(r.caution).toBeTruthy();
    expect(r.adviceHint.avoidPattern).toContain('거절');
  });

  it('중화(balanced) → neutral, 환경 의존 메시지', () => {
    const ganji = computeYearGanji(2026);
    const r = computeStrengthImpact(ganji, '무', mkDms('balanced'));
    expect(r.natalStrength).toBe('중화');
    expect(r.yearlyEffect).toBe('neutral');
    expect(r.plainMeaning).toContain('환경에 따라');
    expect(r.caution).toBeTruthy();
  });
});

describe('Y2e-3 안전 톤 — 금지 표현 검사', () => {
  it('어떤 케이스에도 plainMeaning/lifeSceneHint/adviceHint에 "나쁘다/무조건/반드시/사고/사망/파산/질병/실패확정/이혼" 없음', () => {
    const ganji = computeYearGanji(2026);
    const cases: Array<{ dms: DayMasterStrengthAnalysis['level']; ug: UsefulGodAnalysis }> = [
      { dms: 'very-strong', ug: mkUsefulGod({ primaryUsefulElement: 'water', unfavorable: ['fire'] }) }, // 신강+기신
      { dms: 'very-weak',   ug: mkUsefulGod({ primaryUsefulElement: 'wood', unfavorable: ['fire'] }) }, // 신약+기신
      { dms: 'strong',      ug: mkUsefulGod({ primaryUsefulElement: 'fire' }) }, // 신강+용신
      { dms: 'weak',        ug: mkUsefulGod({ primaryUsefulElement: 'fire' }) }, // 신약+용신
      { dms: 'balanced',    ug: mkUsefulGod({ primaryUsefulElement: 'earth' }) }, // 중화
    ];
    const banPattern = /나쁘다|무조건|반드시\s*(실패|결혼|이직|이혼|사고)|사고|사망|파산|질병|발병|중병|위독|실패\s*확정|이혼\s*확정/;
    for (const c of cases) {
      const ye = computeYearElementEffect(ganji, '무', c.ug);
      const si = computeStrengthImpact(ganji, '무', mkDms(c.dms));
      const allYe = [ye.plainMeaning, ye.lifeSceneHint, ye.adviceHint.actionable, ye.adviceHint.avoidPattern, ye.adviceHint.activatePattern, ye.caution].filter(Boolean).join(' ');
      const allSi = [si.plainMeaning, si.lifeSceneHint, si.adviceHint.actionable, si.adviceHint.avoidPattern, si.adviceHint.activatePattern, si.caution].filter(Boolean).join(' ');
      expect(allYe).not.toMatch(banPattern);
      expect(allSi).not.toMatch(banPattern);
    }
  });
});

describe('Y2e-4 buildY2e — A/B/C fixture 정합 (기존 coreAnalysis와 연결)', () => {
  for (const fx of FIXTURES) {
    it(`${fx.name} — 기존 dayMasterStrength/usefulGod 그대로 사용해 결정론적 결과`, () => {
      const nb = normalizeBirthInput(fx.input, NOW_DATE);
      const pr = calculatePillars(nb);
      const tenGods = analyzeTenGods(pr.pillars);
      const elements = analyzeElementStrength(pr.pillars);
      const dms = analyzeDayMasterStrength(pr.pillars, tenGods, elements);
      const structure = analyzeStructure(pr.pillars, tenGods, elements);
      const ug = analyzeUsefulGod({ pillars: pr.pillars, tenGods, elements, dayMasterStrength: dms, structure });
      const ganji = computeYearGanji(2026);

      const r1 = buildY2e({ yearGanji: ganji, dayMaster: pr.pillars.dayMaster, usefulGod: ug, dayMasterStrength: dms });
      const r2 = buildY2e({ yearGanji: ganji, dayMaster: pr.pillars.dayMaster, usefulGod: ug, dayMasterStrength: dms });

      // 결정론
      expect(r1.yearElementEffect.relationToUsefulGod).toBe(r2.yearElementEffect.relationToUsefulGod);
      expect(r1.strengthImpact.yearlyEffect).toBe(r2.strengthImpact.yearlyEffect);

      // 필수 필드 채워짐
      expect(r1.yearElementEffect.label).toBeTruthy();
      expect(r1.yearElementEffect.lifeSceneHint).toBeTruthy();
      expect(r1.yearElementEffect.adviceHint.actionable).toBeTruthy();
      expect(['mild','medium','strong']).toContain(r1.yearElementEffect.intensity);
      expect(r1.strengthImpact.plainMeaning).toBeTruthy();
      expect(r1.strengthImpact.lifeSceneHint).toBeTruthy();
      expect(r1.strengthImpact.adviceHint.actionable).toBeTruthy();

      // natalStrength 정합 (dms.level → 신강/신약/중화 매핑)
      const expectedKo = (dms.level === 'very-strong' || dms.level === 'strong') ? '신강'
                       : (dms.level === 'weak' || dms.level === 'very-weak') ? '신약'
                       : '중화';
      expect(r1.strengthImpact.natalStrength).toBe(expectedKo);
    });
  }
});

// ============================================================
// Y2f. 남은 월운 절기 기준 계산 + 월운 십성/합충/용신활성도
// ============================================================

describe('Y2f-1 findRemainingMonthSegments — 절기 기준 남은 월 계산', () => {
  it('currentDate=2026-05-25 (sajuYear=2026) → 5월(망종 전)부터 ~ 다음해 입춘 전까지 남은 9개월 반환', () => {
    const segs = findRemainingMonthSegments('2026-05-25', 2026);
    expect(segs.length).toBeGreaterThanOrEqual(8);
    expect(segs.length).toBeLessThanOrEqual(10);
    // 첫 segment는 truncated
    expect(segs[0].truncatedStart).toBe(true);
    expect(segs[0].effectiveStartIso).toBe('2026-05-25');
    // 마지막 segment의 endIso는 sajuYear+1 입춘 무렵
    const last = segs[segs.length - 1];
    expect(last.endIso.startsWith('2027-02')).toBe(true);
  });

  it('연말(currentDate=2026-12-20) → 남은 월운이 1~2개로 소수', () => {
    const segs = findRemainingMonthSegments('2026-12-20', 2026);
    expect(segs.length).toBeGreaterThanOrEqual(1);
    expect(segs.length).toBeLessThanOrEqual(2);
    // 첫 segment는 자월(monthIndex=11) 또는 축월(12)
    expect([11, 12]).toContain(segs[0].monthIndex);
  });

  it('이미 sajuYear+1 입춘 이후 호출 → 빈 배열 (graceful)', () => {
    // 2027 입춘은 양력 2027-02-04 무렵. 2027-03-15는 그 후.
    const segs = findRemainingMonthSegments('2027-03-15', 2026);
    expect(segs).toEqual([]);
  });

  it('잘못된 currentDate → throw', () => {
    expect(() => findRemainingMonthSegments('not-a-date', 2026)).toThrow();
  });
});

describe('Y2f-2 절기 경계 — 직전/당일/직후', () => {
  // 2026 망종 절기: 양력 2026-06-05 ~ 06-06 무렵
  it('망종 직전 (2026-06-04) → 사월(monthIndex=4)이 남아 있음', () => {
    const segs = findRemainingMonthSegments('2026-06-04', 2026);
    expect(segs[0].monthIndex).toBeLessThanOrEqual(5); // 사월 또는 오월(이미 시작했으면)
  });
  it('망종 직후 (2026-06-10) → 첫 segment는 오월 (monthIndex=5) 시작 후', () => {
    const segs = findRemainingMonthSegments('2026-06-10', 2026);
    // 첫 segment의 monthIndex는 5(오월) 또는 4(사월 끝부분에 걸친 경우)
    expect([4, 5]).toContain(segs[0].monthIndex);
  });
});

describe('Y2f-3 computeMonthlyFortuneAnalysis — 필수 필드 + 안전 톤', () => {
  const fx = FIXTURES[0]; // A
  function setup() {
    const nb = normalizeBirthInput(fx.input, NOW_DATE);
    const pr = calculatePillars(nb);
    const tenGods = analyzeTenGods(pr.pillars);
    const elements = analyzeElementStrength(pr.pillars);
    const dms = analyzeDayMasterStrength(pr.pillars, tenGods, elements);
    const structure = analyzeStructure(pr.pillars, tenGods, elements);
    const ug = analyzeUsefulGod({ pillars: pr.pillars, tenGods, elements, dayMasterStrength: dms, structure });
    return { pr, dms, ug };
  }

  it('한 segment에 대해 모든 필수 필드 채워짐', () => {
    const { pr, dms, ug } = setup();
    const segs = findRemainingMonthSegments('2026-05-25', 2026);
    const m = computeMonthlyFortuneAnalysis({
      segment: segs[0],
      yearStem: '병' as const,
      sewoonGanji: { stem: '병', branch: '오', display: '병오' },
      natalPillars: pr.pillars,
      dayMaster: pr.pillars.dayMaster,
      usefulGod: ug,
      dayMasterStrength: dms,
    });
    expect(m.monthLabel).toBeTruthy();
    expect(m.periodLabel).toMatch(/\d{4}-\d{2}-\d{2}/);
    expect(m.startDate).toBe('2026-05-25');
    expect(m.endDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(m.monthGanji.display).toMatch(/^.{2}$/);
    expect(m.keyword).toBeTruthy();
    expect(m.activatedTopics.length).toBeGreaterThan(0);
    expect(['helpful','burdensome','mixed','neutral']).toContain(m.usefulGodEffect);
    expect(m.plainMeaning).toBeTruthy();
    expect(m.lifeSceneHint).toBeTruthy();
    expect(m.goodChoice).toBeTruthy();
    expect(m.caution).toBeTruthy();
    expect(m.truncatedStart).toBe(true);
  });

  it('keyword는 너무 일반적이지 않음 (좋은 달/조심할 달/변화의 달 등 패턴 X)', () => {
    const { pr, dms, ug } = setup();
    const segs = findRemainingMonthSegments('2026-05-25', 2026);
    for (const seg of segs) {
      const m = computeMonthlyFortuneAnalysis({
        segment: seg,
        yearStem: '병' as const,
        sewoonGanji: { stem: '병', branch: '오', display: '병오' },
        natalPillars: pr.pillars,
        dayMaster: pr.pillars.dayMaster,
        usefulGod: ug,
        dayMasterStrength: dms,
      });
      expect(m.keyword).not.toMatch(/^좋은 달$|^조심할 달$|^변화의 달$|^평범한 달$/);
    }
  });

  it('단정 미래 예측 금지 — plainMeaning/lifeSceneHint/goodChoice/caution에 금지 단어 없음', () => {
    const { pr, dms, ug } = setup();
    const segs = findRemainingMonthSegments('2026-05-25', 2026);
    const ban = /이직한다|돈이 들어온다|연애가 시작된다|사고|사망|반드시\s*(깨|결혼|이직)|무조건\s*(좋|나쁘|성공|실패)/;
    for (const seg of segs) {
      const m = computeMonthlyFortuneAnalysis({
        segment: seg,
        yearStem: '병' as const,
        sewoonGanji: { stem: '병', branch: '오', display: '병오' },
        natalPillars: pr.pillars,
        dayMaster: pr.pillars.dayMaster,
        usefulGod: ug,
        dayMasterStrength: dms,
      });
      const all = [m.plainMeaning, m.lifeSceneHint, m.goodChoice, m.caution].join(' ');
      expect(all).not.toMatch(ban);
    }
  });

  it('financial-advice-risk 금지 단어 — 매수/매도/시세/투자 타이밍 등 없음', () => {
    const { pr, dms, ug } = setup();
    const segs = findRemainingMonthSegments('2026-05-25', 2026);
    const finBan = /매수|매도|시세|시장 타이밍|투자 타이밍|코인|주식|수익률|레버리지|큰돈을 굴|거래로\s*돈을\s*번/;
    for (const seg of segs) {
      const m = computeMonthlyFortuneAnalysis({
        segment: seg, yearStem: '병' as const,
        sewoonGanji: { stem: '병', branch: '오', display: '병오' },
        natalPillars: pr.pillars, dayMaster: pr.pillars.dayMaster,
        usefulGod: ug, dayMasterStrength: dms,
      });
      const all = [m.plainMeaning, m.lifeSceneHint, m.goodChoice, m.caution].join(' ');
      expect(all).not.toMatch(finBan);
    }
  });

  it('medical-advice-risk 금지 단어 — 질병/치료/약물/진단 없음', () => {
    const { pr, dms, ug } = setup();
    const segs = findRemainingMonthSegments('2026-05-25', 2026);
    const medBan = /질병|발병|중병|위독|치료|약물|진단/;
    for (const seg of segs) {
      const m = computeMonthlyFortuneAnalysis({
        segment: seg, yearStem: '병' as const,
        sewoonGanji: { stem: '병', branch: '오', display: '병오' },
        natalPillars: pr.pillars, dayMaster: pr.pillars.dayMaster,
        usefulGod: ug, dayMasterStrength: dms,
      });
      const all = [m.plainMeaning, m.lifeSceneHint, m.goodChoice, m.caution].join(' ');
      expect(all).not.toMatch(medBan);
    }
  });
});

describe('Y2f-4 buildY2f — A/B/C fixture deterministic', () => {
  for (const fx of FIXTURES) {
    it(`${fx.name} — 두 번 호출해도 월 개수, monthGanji, keyword, usefulGodEffect 동일`, () => {
      const nb = normalizeBirthInput(fx.input, NOW_DATE);
      const pr = calculatePillars(nb);
      const tenGods = analyzeTenGods(pr.pillars);
      const elements = analyzeElementStrength(pr.pillars);
      const dms = analyzeDayMasterStrength(pr.pillars, tenGods, elements);
      const structure = analyzeStructure(pr.pillars, tenGods, elements);
      const ug = analyzeUsefulGod({ pillars: pr.pillars, tenGods, elements, dayMasterStrength: dms, structure });
      const sewoon = computeYearGanji(2026);
      const args = {
        currentDate: '2026-05-25',
        sajuYear: 2026,
        yearStem: sewoon.stem as HeavenlyStem,
        sewoonGanji: sewoon,
        natalPillars: pr.pillars,
        dayMaster: pr.pillars.dayMaster,
        usefulGod: ug,
        dayMasterStrength: dms,
      } as const;
      const r1 = buildY2f(args);
      const r2 = buildY2f(args);
      expect(r1.length).toBe(r2.length);
      expect(r1.length).toBeGreaterThanOrEqual(8);
      for (let i = 0; i < r1.length; i++) {
        expect(r1[i].monthGanji.display).toBe(r2[i].monthGanji.display);
        expect(r1[i].keyword).toBe(r2[i].keyword);
        expect(r1[i].usefulGodEffect).toBe(r2[i].usefulGodEffect);
      }
      // 첫 segment는 truncated, 나머지는 not truncated
      expect(r1[0].truncatedStart).toBe(true);
      for (let i = 1; i < r1.length; i++) expect(r1[i].truncatedStart).toBe(false);
    });
  }
});

describe('Y2f-5 activatedTopics — 십성 카테고리 + interaction 기반 dedupe', () => {
  it('재성 카테고리는 돈/계약 토픽 포함', () => {
    const { pr, dms, ug } = (function() {
      const fx = FIXTURES[0];
      const nb = normalizeBirthInput(fx.input, NOW_DATE);
      const pr = calculatePillars(nb);
      const tenGods = analyzeTenGods(pr.pillars);
      const elements = analyzeElementStrength(pr.pillars);
      const dms = analyzeDayMasterStrength(pr.pillars, tenGods, elements);
      const structure = analyzeStructure(pr.pillars, tenGods, elements);
      const ug = analyzeUsefulGod({ pillars: pr.pillars, tenGods, elements, dayMasterStrength: dms, structure });
      return { pr, dms, ug };
    })();
    const segs = findRemainingMonthSegments('2026-05-25', 2026);
    for (const seg of segs) {
      const m = computeMonthlyFortuneAnalysis({
        segment: seg, yearStem: '병' as const,
        sewoonGanji: { stem: '병', branch: '오', display: '병오' },
        natalPillars: pr.pillars, dayMaster: pr.pillars.dayMaster,
        usefulGod: ug, dayMasterStrength: dms,
      });
      // 재성 케이스이면 활성 토픽에 돈 or 계약 포함
      if (m.monthStemTenGod === '편재' || m.monthStemTenGod === '정재') {
        const hasMoneyOrContract = m.activatedTopics.includes('돈') || m.activatedTopics.includes('계약');
        expect(hasMoneyOrContract).toBe(true);
      }
    }
  });
});

// ============================================================
// Y2g. 이후 2년 요약
// ============================================================

function setupY2gFixture(idx: number) {
  const fx = FIXTURES[idx];
  const nb = normalizeBirthInput(fx.input, NOW_DATE);
  const pr = calculatePillars(nb);
  const tenGods = analyzeTenGods(pr.pillars);
  const elements = analyzeElementStrength(pr.pillars);
  const dms = analyzeDayMasterStrength(pr.pillars, tenGods, elements);
  const structure = analyzeStructure(pr.pillars, tenGods, elements);
  const ug = analyzeUsefulGod({ pillars: pr.pillars, tenGods, elements, dayMasterStrength: dms, structure });
  const y2b = buildY2b({ normalizedBirth: nb, pillars: pr.pillars, currentDate: CURRENT_DATE });
  return { pr, dms, ug, daewoon: y2b.activeDaewoon };
}

describe('Y2g-1 buildY2g — targetYear+1/+2 두 개 요약 생성', () => {
  it('targetYear=2026 → year=2027, 2028 두 개 반환 (ganji=정미, 무신)', () => {
    const { pr, dms, ug, daewoon } = setupY2gFixture(0);
    const r = buildY2g({
      targetYear: 2026,
      dayMaster: pr.pillars.dayMaster,
      natalPillars: pr.pillars,
      daewoonPillar: daewoon,
      usefulGod: ug,
      dayMasterStrength: dms,
      options: { relationshipStatus: 'unknown', hasChildren: 'unknown' },
    });
    expect(r.length).toBe(2);
    expect(r[0].year).toBe(2027);
    expect(r[0].ganji.display).toBe('정미');
    expect(r[1].year).toBe(2028);
    expect(r[1].ganji.display).toBe('무신');
  });

  it('비정상 targetYear → 빈 배열 (graceful)', () => {
    const { pr, dms, ug, daewoon } = setupY2gFixture(0);
    const r1 = buildY2g({
      targetYear: NaN,
      dayMaster: pr.pillars.dayMaster, natalPillars: pr.pillars,
      daewoonPillar: daewoon, usefulGod: ug, dayMasterStrength: dms,
    });
    expect(r1).toEqual([]);
    const r2 = buildY2g({
      targetYear: 5000,
      dayMaster: pr.pillars.dayMaster, natalPillars: pr.pillars,
      daewoonPillar: daewoon, usefulGod: ug, dayMasterStrength: dms,
    });
    expect(r2).toEqual([]);
  });
});

describe('Y2g-2 필수 필드 + 안전 톤', () => {
  it('모든 필드 채워짐', () => {
    const { pr, dms, ug, daewoon } = setupY2gFixture(0);
    const r = buildY2g({
      targetYear: 2026,
      dayMaster: pr.pillars.dayMaster, natalPillars: pr.pillars,
      daewoonPillar: daewoon, usefulGod: ug, dayMasterStrength: dms,
    });
    for (const y of r) {
      expect(y.year).toBeGreaterThan(2026);
      expect(y.ganji.display).toMatch(/^.{2}$/);
      expect(y.keyword).toBeTruthy();
      expect(y.summary).toBeTruthy();
      expect(y.opportunity).toBeTruthy();
      expect(y.caution).toBeTruthy();
      expect(y.evidence.length).toBeGreaterThanOrEqual(3);
      expect(y.yearTenGod.stemTenGod).toBeTruthy();
      expect(['useful','favorable','unfavorable','neutral']).toContain(y.usefulGodRelation);
      expect(['supportive','burdensome','mixed','neutral']).toContain(y.strengthEffect);
      expect(Array.isArray(y.representativeInteractions)).toBe(true);
      expect(y.representativeInteractions.length).toBeLessThanOrEqual(3);
    }
  });

  it('keyword가 너무 일반적이지 않음', () => {
    const { pr, dms, ug, daewoon } = setupY2gFixture(0);
    const r = buildY2g({
      targetYear: 2026,
      dayMaster: pr.pillars.dayMaster, natalPillars: pr.pillars,
      daewoonPillar: daewoon, usefulGod: ug, dayMasterStrength: dms,
    });
    for (const y of r) {
      expect(y.keyword).not.toMatch(/^좋은 해$|^조심할 해$|^변화의 해$|^평범한 해$/);
    }
  });

  it('단정 미래 예측/금지 단어 없음 (summary/opportunity/caution 전체)', () => {
    const { pr, dms, ug, daewoon } = setupY2gFixture(0);
    const r = buildY2g({
      targetYear: 2026,
      dayMaster: pr.pillars.dayMaster, natalPillars: pr.pillars,
      daewoonPillar: daewoon, usefulGod: ug, dayMasterStrength: dms,
      options: { relationshipStatus: 'unknown', hasChildren: 'unknown' },
    });
    const ban = /반드시\s*(이직|결혼|돈|성공|실패|이혼|사고)|무조건\s*(좋|나쁘|성공|실패)|100%|틀림없이|아내|남편|배우자(?!궁)|자녀와/;
    const medBan = /질병|발병|중병|위독|치료|약물|진단/;
    const finBan = /매수|매도|시세|시장 타이밍|투자 타이밍|코인|주식|수익률|레버리지|큰돈을 굴/;
    for (const y of r) {
      const all = [y.summary, y.opportunity, y.caution, ...y.evidence].join(' ');
      expect(all).not.toMatch(ban);
      expect(all).not.toMatch(medBan);
      expect(all).not.toMatch(finBan);
    }
  });
});

describe('Y2g-3 representativeInteractions — top 3 + intensity 우선', () => {
  it('intensity가 strong > medium > mild 순으로 정렬', () => {
    const { pr, dms, ug, daewoon } = setupY2gFixture(0);
    const r = buildY2g({
      targetYear: 2026,
      dayMaster: pr.pillars.dayMaster, natalPillars: pr.pillars,
      daewoonPillar: daewoon, usefulGod: ug, dayMasterStrength: dms,
    });
    for (const y of r) {
      const order = ['strong','medium','mild'];
      for (let i = 0; i < y.representativeInteractions.length - 1; i++) {
        const a = order.indexOf(y.representativeInteractions[i].intensity);
        const b = order.indexOf(y.representativeInteractions[i + 1].intensity);
        expect(a).toBeLessThanOrEqual(b);
      }
    }
  });
});

describe('Y2g-4 A/B/C fixture deterministic', () => {
  for (let i = 0; i < FIXTURES.length; i++) {
    const fx = FIXTURES[i];
    it(`${fx.name} — 두 번 호출해도 year/ganji/keyword/usefulGodRelation/strengthEffect/representativeInteractions 동일`, () => {
      const { pr, dms, ug, daewoon } = setupY2gFixture(i);
      const args = {
        targetYear: 2026,
        dayMaster: pr.pillars.dayMaster, natalPillars: pr.pillars,
        daewoonPillar: daewoon, usefulGod: ug, dayMasterStrength: dms,
        options: { relationshipStatus: 'unknown' as const, hasChildren: 'unknown' as const },
      };
      const r1 = buildY2g(args);
      const r2 = buildY2g(args);
      expect(r1.length).toBe(r2.length);
      for (let j = 0; j < r1.length; j++) {
        expect(r1[j].year).toBe(r2[j].year);
        expect(r1[j].ganji.display).toBe(r2[j].ganji.display);
        expect(r1[j].keyword).toBe(r2[j].keyword);
        expect(r1[j].usefulGodRelation).toBe(r2[j].usefulGodRelation);
        expect(r1[j].strengthEffect).toBe(r2[j].strengthEffect);
        expect(r1[j].representativeInteractions.map(i2 => i2.label))
          .toEqual(r2[j].representativeInteractions.map(i2 => i2.label));
      }
    });
  }
});

describe('Y2g-5 targetYear override 정상 작동', () => {
  it('targetYear=2030 → 2031, 2032 두 개 생성', () => {
    const { pr, dms, ug, daewoon } = setupY2gFixture(0);
    const r = buildY2g({
      targetYear: 2030,
      dayMaster: pr.pillars.dayMaster, natalPillars: pr.pillars,
      daewoonPillar: daewoon, usefulGod: ug, dayMasterStrength: dms,
    });
    expect(r.length).toBe(2);
    expect(r[0].year).toBe(2031);
    expect(r[1].year).toBe(2032);
  });
});

// ============================================================
// Y3. EvidenceFormatter + PlanBuilder
// ============================================================

// A fixture로 YearlyFortuneAnalysis 합성 (Y2 결과 종합)
function buildAnalysisForFixture(idx: number): YearlyFortuneAnalysis {
  const fx = FIXTURES[idx];
  const nb = normalizeBirthInput(fx.input, NOW_DATE);
  const pr = calculatePillars(nb);
  const tenGods = analyzeTenGods(pr.pillars);
  const elements = analyzeElementStrength(pr.pillars);
  const dms = analyzeDayMasterStrength(pr.pillars, tenGods, elements);
  const structure = analyzeStructure(pr.pillars, tenGods, elements);
  const ug = analyzeUsefulGod({ pillars: pr.pillars, tenGods, elements, dayMasterStrength: dms, structure });

  const y2a = buildY2a({ currentDate: CURRENT_DATE, dayMaster: pr.pillars.dayMaster });
  const y2b = buildY2b({ normalizedBirth: nb, pillars: pr.pillars, currentDate: CURRENT_DATE });
  const y2c = buildY2c({ daewoonPillar: y2b.activeDaewoon, sewoonGanji: y2a.ganji });
  const y2d = buildY2d({ pillars: pr.pillars, sewoonGanji: y2a.ganji, options: { relationshipStatus: 'unknown', hasChildren: 'unknown' } });
  const y2e = buildY2e({ yearGanji: y2a.ganji, dayMaster: pr.pillars.dayMaster, usefulGod: ug, dayMasterStrength: dms });
  const y2f = buildY2f({ currentDate: CURRENT_DATE, sajuYear: y2a.sajuYear, yearStem: y2a.ganji.stem as HeavenlyStem,
    sewoonGanji: y2a.ganji, natalPillars: pr.pillars, dayMaster: pr.pillars.dayMaster, usefulGod: ug, dayMasterStrength: dms });
  const y2g = buildY2g({ targetYear: y2a.sajuYear, dayMaster: pr.pillars.dayMaster, natalPillars: pr.pillars,
    daewoonPillar: y2b.activeDaewoon, usefulGod: ug, dayMasterStrength: dms,
    options: { relationshipStatus: 'unknown', hasChildren: 'unknown' } });

  return {
    natalChart: pr.pillars,
    natalPillarsFull: [pr.pillars.year, pr.pillars.month, pr.pillars.day, ...(pr.pillars.hour ? [pr.pillars.hour] : [])],
    currentDaewoon: y2b.currentDaewoon,
    targetYear: y2a.sajuYear,
    targetYearGanji: y2a.ganji,
    yearTenGod: y2a.yearTenGod,
    yearElementEffect: y2e.yearElementEffect,
    strengthImpact: y2e.strengthImpact,
    daewoonSewoonInteraction: y2c,
    natalSewoonInteractions: y2d.natalSewoonInteractions,
    activatedTopics: [],
    specialStarsActivated: [],
    remainingMonthlyFortunes: y2f,
    nextTwoYears: y2g,
    carriedOver: {
      dayMasterStrength: dms,
      usefulGod: ug,
      specialStars: elements ? [] : [],
    },
  };
}

describe('Y3-1 formatYearlyEvidence — 모든 섹션에 fact 묶음 생성 + ownership 분리', () => {
  it('fixture A에서 7개 섹션 모두 fact가 채워지고 owner prefix가 일관됨', () => {
    const analysis = buildAnalysisForFixture(0);
    const ev = formatYearlyEvidence(analysis);
    expect(ev.yearFlowCard.length).toBeGreaterThan(0);
    expect(ev.yearlyMechanism.length).toBeGreaterThan(0);
    expect(ev.remainingMonths.length).toBeGreaterThan(0);
    expect(ev.topicFortunes.length).toBe(4); // 일/돈/관계/리듬
    expect(ev.actionGuide.length).toBeGreaterThan(0);
    expect(ev.nextTwoYears.length).toBe(2);
    expect(ev.evidenceView.length).toBeGreaterThan(0);

    // owner prefix가 각 섹션과 일치
    for (const f of ev.yearFlowCard)    expect(getOwnerSectionOf(f.id)).toBe('yearFlowCard');
    for (const f of ev.yearlyMechanism) expect(getOwnerSectionOf(f.id)).toBe('yearlyMechanism');
    for (const f of ev.remainingMonths) expect(getOwnerSectionOf(f.id)).toBe('remainingMonths');
    for (const f of ev.topicFortunes)   expect(getOwnerSectionOf(f.id)).toBe('topicFortunes');
    for (const f of ev.actionGuide)     expect(getOwnerSectionOf(f.id)).toBe('actionGuide');
    for (const f of ev.nextTwoYears)    expect(getOwnerSectionOf(f.id)).toBe('nextTwoYears');
    for (const f of ev.evidenceView)    expect(getOwnerSectionOf(f.id)).toBe('evidenceView');
  });

  it('fact id는 섹션 간 중복 없음 — 같은 id가 두 섹션에 동시에 나오지 않음', () => {
    const analysis = buildAnalysisForFixture(0);
    const ev = formatYearlyEvidence(analysis);
    const all: string[] = [];
    for (const sec of [ev.yearFlowCard, ev.yearlyMechanism, ev.remainingMonths, ev.topicFortunes, ev.actionGuide, ev.nextTwoYears, ev.evidenceView]) {
      for (const f of sec) all.push(f.id);
    }
    const unique = new Set(all);
    expect(unique.size).toBe(all.length); // 중복 0
  });
});

describe('Y3-2 buildYearlyPlans — 7개 sectionId 모두 생성 + 필수 필드', () => {
  it('plan 개수 7, sectionId 순서 정확', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    expect(plans.length).toBe(7);
    expect(plans.map(p => p.sectionId)).toEqual([
      'yearFlowCard', 'yearlyMechanism', 'remainingMonths',
      'topicFortunes', 'actionGuide', 'nextTwoYears', 'evidenceView',
    ] satisfies YearlyFortuneSectionId[]);
  });

  it('각 plan에 title/sectionGoal/mustUseFacts/requiredBeats/styleExamples/avoidPatterns/toneHints/maxTokens 존재', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    for (const p of plans) {
      expect(p.title).toBeTruthy();
      expect(p.sectionGoal).toBeTruthy();
      expect(p.requiredBeats.length).toBeGreaterThan(0);
      expect(Array.isArray(p.avoidPatterns)).toBe(true);
      expect(p.toneHints.length).toBeGreaterThan(0);
      expect(p.styleExamples.goodExample).toBeTruthy();
      expect(p.styleExamples.transformationRule).toBeTruthy();
      expect(typeof p.maxTokens).toBe('number');
    }
    // evidenceView를 제외한 모든 plan에 mustUseFacts 1개 이상
    for (const p of plans) {
      if (p.sectionId === 'evidenceView') continue;
      expect(p.mustUseFacts.length).toBeGreaterThan(0);
    }
  });

  it('title이 YEARLY_SECTION_TITLES와 정합', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    for (const p of plans) {
      expect(p.title).toBe(YEARLY_SECTION_TITLES[p.sectionId]);
    }
  });

  it('maxTokens가 YEARLY_SECTION_MAX_TOKENS와 정합', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    for (const p of plans) {
      expect(p.maxTokens).toBe(YEARLY_SECTION_MAX_TOKENS[p.sectionId]);
    }
    // evidenceView는 0 (LLM 호출 없음)
    expect(plans.find(p => p.sectionId === 'evidenceView')!.maxTokens).toBe(0);
  });

  it('YEARLY_LLM_SECTION_IDS는 evidenceView 제외 6개', () => {
    expect(YEARLY_LLM_SECTION_IDS.length).toBe(6);
    expect(YEARLY_LLM_SECTION_IDS).not.toContain('evidenceView');
  });
});

describe('Y3-3 섹션별 fact 배정 — 정보 ownership 명세 일치', () => {
  it('yearlyMechanism에 currentDaewoon/strengthImpact/yearElement/daewoonSewoon/natalSewoon 소스가 모두 들어감', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    const ym = plans.find(p => p.sectionId === 'yearlyMechanism')!;
    const sources = ym.mustUseFacts.map(f => f.source);
    expect(sources).toContain('currentDaewoon');
    expect(sources).toContain('strengthImpact');
    expect(sources).toContain('yearElement');
    expect(sources).toContain('daewoonSewoonInteraction');
    expect(sources).toContain('natalSewoonInteraction');
  });

  it('remainingMonths에 월운 fact가 들어감 (월 개수와 일치)', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    const rm = plans.find(p => p.sectionId === 'remainingMonths')!;
    expect(rm.mustUseFacts.length).toBe(analysis.remainingMonthlyFortunes.length);
    for (const f of rm.mustUseFacts) expect(f.source).toBe('monthlyFortune');
  });

  it('actionGuide에 용신/기신 + 신강/신약 기반 행동 조언 fact가 들어감', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    const ag = plans.find(p => p.sectionId === 'actionGuide')!;
    const sources = ag.mustUseFacts.map(f => f.source);
    expect(sources).toContain('yearElement');
    expect(sources).toContain('strengthImpact');
  });

  it('nextTwoYears에 정확히 2개 연도 summary fact가 들어감', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    const nty = plans.find(p => p.sectionId === 'nextTwoYears')!;
    expect(nty.mustUseFacts.length).toBe(2);
    for (const f of nty.mustUseFacts) expect(f.source).toBe('nextYear');
  });

  it('evidenceView는 LLM 호출 없이 deterministic 데이터만 (maxTokens=0)', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    const ev = plans.find(p => p.sectionId === 'evidenceView')!;
    expect(ev.maxTokens).toBe(0);
    expect(ev.mustUseFacts.length).toBeGreaterThan(0);
  });
});

describe('Y3-4 중복 방지 — 같은 fact id가 두 plan에 동시에 들어가지 않음', () => {
  it('모든 plan의 mustUseFacts id가 unique', () => {
    const analysis = buildAnalysisForFixture(0);
    const plans = buildYearlyPlans(analysis);
    const ids: string[] = [];
    for (const p of plans) for (const f of p.mustUseFacts) ids.push(f.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('Y3-5 A/B/C fixture deterministic', () => {
  for (let i = 0; i < FIXTURES.length; i++) {
    const fx = FIXTURES[i];
    it(`${fx.name} — buildYearlyPlans 두 번 호출 시 plan 구조 동일`, () => {
      const analysis1 = buildAnalysisForFixture(i);
      const analysis2 = buildAnalysisForFixture(i);
      const p1 = buildYearlyPlans(analysis1);
      const p2 = buildYearlyPlans(analysis2);
      expect(p1.length).toBe(p2.length);
      for (let j = 0; j < p1.length; j++) {
        expect(p1[j].sectionId).toBe(p2[j].sectionId);
        expect(p1[j].mustUseFacts.map(f => f.id)).toEqual(p2[j].mustUseFacts.map(f => f.id));
        expect(p1[j].maxTokens).toBe(p2[j].maxTokens);
      }
    });
  }
});

// ============================================================
// Y4. yearlyPromptBuilder
// ============================================================

const Y4_CTX: YearlyPromptContext = {
  relationshipStatus: 'unknown',
  targetYear: 2026,
};

function plansForA() {
  const analysis = buildAnalysisForFixture(0);
  return { analysis, plans: buildYearlyPlans(analysis) };
}

describe('Y4-1 buildYearlyPromptForSection — section별 prompt 생성', () => {
  it('evidenceView는 null 반환 (LLM 호출 대상 아님)', () => {
    const { plans } = plansForA();
    const ev = plans.find(p => p.sectionId === 'evidenceView')!;
    expect(buildYearlyPromptForSection(ev, Y4_CTX)).toBeNull();
  });

  it('LLM 6개 섹션 모두 prompt 생성됨 (yearFlowCard~nextTwoYears)', () => {
    const { plans } = plansForA();
    for (const sid of YEARLY_LLM_SECTION_IDS) {
      const p = plans.find(x => x.sectionId === sid)!;
      const built = buildYearlyPromptForSection(p, Y4_CTX);
      expect(built).not.toBeNull();
      expect(built!.sectionId).toBe(sid);
      expect(built!.system).toBeTruthy();
      expect(built!.user).toBeTruthy();
      expect(built!.maxTokens).toBe(p.maxTokens);
      expect(built!.outputJsonSchema).toBeTruthy();
    }
  });

  it('buildYearlyPromptsAll은 Map에 6개 prompt (evidenceView 제외)', () => {
    const { plans } = plansForA();
    const all = buildYearlyPromptsAll(plans, Y4_CTX);
    expect(all.size).toBe(6);
    expect(all.has('evidenceView')).toBe(false);
    for (const sid of YEARLY_LLM_SECTION_IDS) {
      expect(all.has(sid)).toBe(true);
    }
  });
});

describe('Y4-2 ABSOLUTE_RULES — 모든 LLM prompt에 포함', () => {
  it('모든 6 prompt의 user 본문에 ABSOLUTE_RULES 타이틀 + 핵심 조항이 포함됨', () => {
    const { plans } = plansForA();
    const all = buildYearlyPromptsAll(plans, Y4_CTX);
    for (const [, built] of all) {
      expect(built.user).toContain(YEARLY_PROMPT_INTERNAL.ABSOLUTE_RULES_TITLE);
      // 핵심 규칙 키워드들
      expect(built.user).toContain('computedEvidence');
      expect(built.user).toContain('반드시');
      expect(built.user).toContain('무조건');
      expect(built.user).toContain('100%');
      expect(built.user).toContain('결혼');
      expect(built.user).toContain('이직');
      expect(built.user).toContain('투자 조언');
      expect(built.user).toContain('의학');
      expect(built.user).toContain('wood / fire / earth / metal / water');
      expect(built.user).toContain('validator log');
    }
  });

  it('SYSTEM prompt에 단정 금지 + JSON 출력 규칙 포함', () => {
    const { plans } = plansForA();
    const yfc = plans.find(p => p.sectionId === 'yearFlowCard')!;
    const built = buildYearlyPromptForSection(yfc, Y4_CTX)!;
    expect(built.system).toContain('단정');
    expect(built.system).toContain('JSON');
    expect(built.system).toContain('computedEvidence');
  });
});

describe('Y4-3 YEARLY_TONE_RULES — 타이밍 사용설명서 톤', () => {
  it('모든 prompt에 좋은 톤/나쁜 톤 예시 포함', () => {
    const { plans } = plansForA();
    const all = buildYearlyPromptsAll(plans, Y4_CTX);
    for (const [, built] of all) {
      expect(built.user).toContain(YEARLY_PROMPT_INTERNAL.YEARLY_TONE_RULES_TITLE);
      expect(built.user).toContain('흐름이 강합니다');         // good
      expect(built.user).toContain('대박납니다');               // bad (예시 표기)
      expect(built.user).toContain('연애운이 폭발합니다');      // bad (예시 표기)
    }
  });
});

describe('Y4-4 EVIDENCE_TO_NARRATIVE 흐름 강제', () => {
  it('모든 prompt에 6단계 흐름 규칙 포함', () => {
    const { plans } = plansForA();
    const all = buildYearlyPromptsAll(plans, Y4_CTX);
    for (const [, built] of all) {
      expect(built.user).toContain(YEARLY_PROMPT_INTERNAL.EVIDENCE_TO_NARRATIVE_TITLE);
      expect(built.user).toContain('명리 근거');
      expect(built.user).toContain('쉬운 뜻');
      expect(built.user).toContain('현실');
      expect(built.user).toContain('좋게 쓰이는 방식');
      expect(built.user).toContain('꼬일 수 있는 방식');
      expect(built.user).toContain('선택 전략');
    }
  });
});

describe('Y4-5 금지어 도메인별 적용', () => {
  it('topicFortunes prompt에 financial 금지어가 명시됨 (매수/매도/시세/시장 타이밍)', () => {
    const { plans } = plansForA();
    const tf = plans.find(p => p.sectionId === 'topicFortunes')!;
    const built = buildYearlyPromptForSection(tf, Y4_CTX)!;
    expect(built.user).toContain('매수');
    expect(built.user).toContain('매도');
    expect(built.user).toContain('시세');
    expect(built.user).toContain('시장 타이밍');
    expect(built.user).toContain('레버리지');
  });

  it('remainingMonths prompt도 financial 금지어 포함 (월별 돈 영역)', () => {
    const { plans } = plansForA();
    const rm = plans.find(p => p.sectionId === 'remainingMonths')!;
    const built = buildYearlyPromptForSection(rm, Y4_CTX)!;
    expect(built.user).toContain('매수');
    expect(built.user).toContain('투자 타이밍');
  });

  it('topicFortunes prompt에 medical 금지어 명시 (질병/치료/약물/진단)', () => {
    const { plans } = plansForA();
    const tf = plans.find(p => p.sectionId === 'topicFortunes')!;
    const built = buildYearlyPromptForSection(tf, Y4_CTX)!;
    expect(built.user).toContain('질병');
    expect(built.user).toContain('치료');
    expect(built.user).toContain('약물');
    expect(built.user).toContain('진단');
  });

  it('topicFortunes prompt에 relationship 중립 규칙 포함 (unknown 컨텍스트)', () => {
    const { plans } = plansForA();
    const tf = plans.find(p => p.sectionId === 'topicFortunes')!;
    const built = buildYearlyPromptForSection(tf, Y4_CTX)!;
    expect(built.user).toContain('아내');
    expect(built.user).toContain('남편');
    expect(built.user).toContain('배우자');
    expect(built.user).toContain('자녀');
    expect(built.user).toContain('가까운 관계');
  });
});

describe('Y4-6 mustUseFacts 외 명리 요소 추가 금지 + styleExamples 하드코딩 금지', () => {
  it('mustUseFacts 외 추가 금지 규칙이 모든 prompt에 포함', () => {
    const { plans } = plansForA();
    const all = buildYearlyPromptsAll(plans, Y4_CTX);
    for (const [, built] of all) {
      expect(built.user).toContain('mustUseFacts');
      expect(built.user).toContain('computedEvidence');
    }
  });

  it('styleExamples 사용 규칙 (예시 복사 금지/사주 적용 금지) 모든 prompt에 포함', () => {
    const { plans } = plansForA();
    const all = buildYearlyPromptsAll(plans, Y4_CTX);
    for (const [, built] of all) {
      expect(built.user).toContain(YEARLY_PROMPT_INTERNAL.STYLE_EXAMPLE_DISCLAIMER_TITLE);
      expect(built.user).toContain('그대로 복사하지 말 것');
      expect(built.user).toContain('현재 사용자에게 그대로 적용하지 말 것');
    }
  });

  it('각 prompt에 plan.styleExamples의 badExample/goodExample/transformationRule이 노출됨', () => {
    const { plans } = plansForA();
    const all = buildYearlyPromptsAll(plans, Y4_CTX);
    for (const [, built] of all) {
      const plan = plans.find(p => p.sectionId === built.sectionId)!;
      expect(built.user).toContain(plan.styleExamples.transformationRule);
    }
  });
});

describe('Y4-7 mustUseFacts/requiredBeats/avoidPatterns/toneHints/repairHints 반영', () => {
  it('plan.mustUseFacts의 각 fact id/source/fact가 prompt에 포함됨', () => {
    const { plans } = plansForA();
    const ym = plans.find(p => p.sectionId === 'yearlyMechanism')!;
    const built = buildYearlyPromptForSection(ym, Y4_CTX)!;
    for (const f of ym.mustUseFacts) {
      expect(built.user).toContain(f.id);
      expect(built.user).toContain(f.source);
      expect(built.user).toContain(f.fact);
    }
  });

  it('requiredBeats가 번호 매겨져서 prompt에 모두 포함', () => {
    const { plans } = plansForA();
    const ag = plans.find(p => p.sectionId === 'actionGuide')!;
    const built = buildYearlyPromptForSection(ag, Y4_CTX)!;
    for (const beat of ag.requiredBeats) {
      expect(built.user).toContain(beat);
    }
  });

  it('repairHints가 prompt에 포함됨', () => {
    const { plans } = plansForA();
    const yfc = plans.find(p => p.sectionId === 'yearFlowCard')!;
    const built = buildYearlyPromptForSection(yfc, Y4_CTX)!;
    for (const h of yfc.repairHints ?? []) {
      expect(built.user).toContain(h);
    }
  });
});

describe('Y4-8 JSON 출력 schema 강제', () => {
  it('각 prompt에 sectionId별 JSON schema가 포함됨', () => {
    const { plans } = plansForA();
    const all = buildYearlyPromptsAll(plans, Y4_CTX);
    for (const [sid, built] of all) {
      expect(built.outputJsonSchema).toBe(YEARLY_PROMPT_INTERNAL.JSON_SCHEMAS[sid]);
      // schema의 첫 줄 (heading) 또는 핵심 키가 user prompt에 노출되어야 함
      expect(built.user).toContain(`"sectionId": "${sid}"`);
      expect(built.user).toContain('OUTPUT_JSON_SCHEMA');
    }
  });

  it('JSON 출력 규칙 (코드펜스 금지/한 덩어리) 명시', () => {
    const { plans } = plansForA();
    const built = buildYearlyPromptForSection(
      plans.find(p => p.sectionId === 'yearFlowCard')!,
      Y4_CTX,
    )!;
    expect(built.user).toContain('코드펜스');
    expect(built.user).toContain('JSON 한 덩어리');
  });
});

describe('Y4-9 buildYearlyRepairPrompt — issue 기반 재호출 prompt', () => {
  it('evidenceView는 repair도 null', () => {
    const { plans } = plansForA();
    const ev = plans.find(p => p.sectionId === 'evidenceView')!;
    const r = buildYearlyRepairPrompt(ev, Y4_CTX, {
      previousOutput: '{}',
      issues: [],
    });
    expect(r).toBeNull();
  });

  it('LLM 섹션은 repair prompt를 생성하고, 직전 출력 + issue + 확장 금지 룰 포함', () => {
    const { plans } = plansForA();
    const ym = plans.find(p => p.sectionId === 'yearlyMechanism')!;
    const prev = '{"sectionId":"yearlyMechanism","yearlyMechanism":{"body":"올해 무조건 이직합니다.","evidenceBlocks":[]}}';
    const r = buildYearlyRepairPrompt(ym, Y4_CTX, {
      previousOutput: prev,
      issues: [
        { type: 'deterministic-future-claim', sectionId: 'yearlyMechanism', sentence: '올해 무조건 이직합니다.', reason: '단정 미래 사건', severity: 'high', suggestion: '"이직 신호가 생길 수 있어요" 톤으로' },
        { type: 'missing-useful-god-link', sectionId: 'yearlyMechanism', reason: '용신/기신 연결 없음', severity: 'medium' },
      ],
    })!;
    expect(r).not.toBeNull();
    expect(r.user).toContain('REPAIR_MODE');
    expect(r.user).toContain('PREVIOUS_OUTPUT');
    expect(r.user).toContain('올해 무조건 이직합니다.');
    expect(r.user).toContain('deterministic-future-claim');
    expect(r.user).toContain('missing-useful-god-link');
    expect(r.user).toContain('다른 섹션 내용으로 확장 금지');
    // 절대규칙 유지
    expect(r.user).toContain(YEARLY_PROMPT_INTERNAL.ABSOLUTE_RULES_TITLE);
  });
});

describe('Y4-10 cross-section leak 방지 + A/B/C deterministic', () => {
  it('각 section prompt의 SECTION 헤더는 자기 sectionId만 가짐', () => {
    const { plans } = plansForA();
    const all = buildYearlyPromptsAll(plans, Y4_CTX);
    for (const [sid, built] of all) {
      expect(built.user).toContain(`[SECTION] ${sid}`);
      // 다른 sectionId 헤더가 [SECTION] 형태로 또 나오면 안 됨
      for (const other of YEARLY_LLM_SECTION_IDS) {
        if (other === sid) continue;
        expect(built.user).not.toContain(`[SECTION] ${other}`);
      }
    }
  });

  it('A/B/C 동일 입력 두 번 호출 시 동일 prompt 출력 (deterministic)', () => {
    for (let i = 0; i < FIXTURES.length; i++) {
      const analysis = buildAnalysisForFixture(i);
      const plans = buildYearlyPlans(analysis);
      const a = buildYearlyPromptsAll(plans, Y4_CTX);
      const b = buildYearlyPromptsAll(plans, Y4_CTX);
      expect(a.size).toBe(b.size);
      for (const sid of YEARLY_LLM_SECTION_IDS) {
        expect(a.get(sid)!.user).toBe(b.get(sid)!.user);
        expect(a.get(sid)!.system).toBe(b.get(sid)!.system);
        expect(a.get(sid)!.maxTokens).toBe(b.get(sid)!.maxTokens);
      }
    }
  });
});

// ============================================================
// Y5 — yearlySanitizer + yearlyReportValidator (LLM 호출 X)
// ============================================================

const Y5_ANALYSIS = buildAnalysisForFixture(0);
const Y5_PLANS = buildYearlyPlans(Y5_ANALYSIS);
const Y5_CTX_UNKNOWN: YearlyValidatorContext = { relationshipStatus: 'unknown', hasChildren: 'unknown' };
const Y5_CTX_MARRIED: YearlyValidatorContext = { relationshipStatus: 'married', hasChildren: true };

// 세운 십성 — valid mock 본문에 실제 값으로 끼워넣어 missing-year-ten-god 회피
const Y5_STEM = Y5_ANALYSIS.yearTenGod.stemTenGod;
const Y5_BRANCH = Y5_ANALYSIS.yearTenGod.branchMainTenGod;

function cloneReport(r: YearlyFortuneReport): YearlyFortuneReport {
  return JSON.parse(JSON.stringify(r)) as YearlyFortuneReport;
}

function hasIssue(res: ReturnType<typeof validateYearlyReport>, type: YearlyValidationIssueType): boolean {
  return res.issues.some(i => i.type === type);
}

// 같은 type이 여러 섹션에서 날 수 있는 issue(cross-section-leak 등)는 sectionId까지 고정해 확인
function hasIssueIn(
  res: ReturnType<typeof validateYearlyReport>,
  type: YearlyValidationIssueType,
  sectionId: string,
): boolean {
  return res.issues.some(i => i.type === type && i.sectionId === sectionId);
}

function validateMock(
  report: YearlyFortuneReport,
  ctx: YearlyValidatorContext = Y5_CTX_UNKNOWN,
  analysis = Y5_ANALYSIS,
) {
  return validateYearlyReport({ report, analysis, plans: Y5_PLANS, ctx });
}

// 검증 통과(합격선) mock — high 0 / medium <6 가 되도록 모든 필수 결을 한 번씩 포함
function buildValidMockReport(): YearlyFortuneReport {
  return {
    yearFlowCard: {
      title: '쌓아둔 것을 밖으로 꺼내는 해',
      subtitle: '확장보다 검증의 결',
      keywords: ['검증', '구조화', '연결'],
      summary: `올해는 ${Y5_STEM} 결이 흐르며 ${Y5_BRANCH} 결이 환경을 정리합니다. 회의나 문서 같은 장면에서 역할 정리가 중요해질 수 있어요. 그래서 무리한 확장 대신 작게 검증하는 편이 좋습니다.`,
    },
    yearlyOverview: {
      oneLine: '결과물로 검증받는 흐름의 한 해',
      body: '큰 한 방보다 작게 꺼내 반응을 보며 다듬는 흐름이 안정적입니다.',
    },
    yearlyMechanism: {
      body: `현재 대운은 큰 환경을 키워주고, 올해 세운은 ${Y5_STEM}/${Y5_BRANCH} 결로 월주를 건드립니다. 신강 구조에서는 부담보다 지원에 가깝습니다. 다만 용신 결이 들어올 때는 작게 검증하고, 기신 결이 들어올 때는 조건을 점검하는 편이 좋습니다. 회의나 문서 같은 장면에서 역할이 명확해질 수 있어요.`,
      evidenceBlocks: [{
        sectionId: 'yearlyMechanism',
        evidence: [{ label: `${Y5_STEM} 결`, plainMeaning: '책임/평가/공식 결', role: 'main' }],
        causalExplanation: `${Y5_STEM} 결이 환경에 들어와 책임이 명확해집니다.`,
        lifeScene: '회의에서 역할이 정리되는 순간',
        positiveUse: '작게 검증하고 문서로 남기기',
        shadowPattern: '책임만 떠안고 권한 없이 떠밀리는 패턴',
        practicalAdvice: '범위·권한·평가 기준을 먼저 정한다',
      }],
    },
    remainingMonths: [
      { monthLabel: '6월 흐름', periodLabel: '2026-06-05~2026-07-06', keyword: '정리하고 다시 기준 세우기', body: '회의나 문서에서 역할이 정리되는 흐름이 있어요. 그래서 작게 검증하는 편이 좋습니다.', work: '역할 범위 점검', money: '보상 기준 점검', relationship: '가까운 관계에서 기준 나누기', goodChoice: '문서로 기준 남기기', caution: '한 번에 다 바꾸지 않기' },
    ],
    topicFortunes: {
      career: '일운은 역할 정리 흐름. 범위·권한·평가 기준을 점검하는 편이 좋습니다.',
      money: '돈운은 보상 기준과 수익 구조 정리에서 살아납니다. 작업 범위와 정산 조건을 먼저 정해두는 편이 안정적입니다.',
      relationship: '가까운 관계에서 기준을 나누는 흐름이 강해질 수 있어요.',
      rhythm: '수면과 휴식 루틴을 점검하는 편이 좋습니다.',
    },
    actionGuide: {
      mustCatch: ['결과물로 남길 일', '조건이 명확한 협업', '능력 가격 기준 정리'],
      betterAvoid: ['책임만 받는 자리', '기준 없는 부탁'],
      bestStrategy: '감당할 조건을 정하고 그 안에서 움직일 때 운이 살아납니다.',
    },
    nextTwoYears: [
      { year: Y5_ANALYSIS.targetYear + 1, keyword: '연결과 확장', summary: '결과물이 사람으로 연결되는 흐름이 강해질 수 있어요.', opportunity: '소개·협업·외부 프로젝트', caution: '무리한 확장' },
      { year: Y5_ANALYSIS.targetYear + 2, keyword: '결산과 다음 판', summary: '쌓은 것을 정리해 다음 판으로 옮기는 흐름.', opportunity: '결산과 재정리', caution: '쉬는 시간 없이 다음 판으로 넘어가기' },
    ],
    evidenceView: {
      yearGanji: Y5_ANALYSIS.targetYearGanji,
      currentDaewoonPillar: Y5_ANALYSIS.currentDaewoon.pillar.pillarKo,
      yearStemTenGod: Y5_ANALYSIS.yearTenGod.stemTenGod,
      yearBranchTenGod: Y5_ANALYSIS.yearTenGod.branchMainTenGod,
      yearElement: Y5_ANALYSIS.yearElementEffect.element,
      usefulGodRelation: Y5_ANALYSIS.yearElementEffect.relationToUsefulGod,
      natalSewoonInteractions: [],
      daewoonSewoonInteractions: [],
      monthlySummary: [],
      activatedSpecialStars: [],
    },
  };
}

describe('Y5-1 sanitizer 단위 변환', () => {
  it('sanitizeDeterministicFuture — 단정 사건/부사어를 가능성 톤으로', () => {
    expect(sanitizeDeterministicFuture('반드시 이직합니다')).not.toContain('반드시');
    expect(sanitizeDeterministicFuture('반드시 이직합니다')).toContain('신호');
    expect(sanitizeDeterministicFuture('무조건 성공')).not.toContain('무조건');
    expect(sanitizeDeterministicFuture('100% 돈이 들어옵니다')).not.toContain('100%');
    expect(sanitizeDeterministicFuture('올해 망합니다')).not.toContain('망합니다');
    expect(sanitizeDeterministicFuture('틀림없이 결혼합니다')).not.toContain('틀림없이');
  });

  it('sanitizeMedicalAdvice — 질병/치료/약물을 생활 리듬 톤으로', () => {
    expect(sanitizeMedicalAdvice('위장병이 생깁니다')).not.toContain('위장병');
    expect(sanitizeMedicalAdvice('우울증이 옵니다')).not.toContain('우울증');
    expect(sanitizeMedicalAdvice('치료가 필요합니다')).not.toContain('치료');
    expect(sanitizeMedicalAdvice('약물 처방을 받으세요')).not.toMatch(/약물|처방/);
  });

  it('sanitizeFearBased — 공포 조장을 조정/주의 톤으로', () => {
    expect(sanitizeFearBased('사고가 납니다')).not.toContain('사고');
    expect(sanitizeFearBased('파산할 수 있습니다')).not.toContain('파산');
    expect(sanitizeFearBased('큰일 납니다')).not.toContain('큰일');
    expect(sanitizeFearBased('이혼 확정 단계입니다')).not.toContain('이혼 확정');
  });

  it('sanitizeYearlyFinancialAdviceRisk — 투자 조언 키워드 제거/치환', () => {
    const out = sanitizeYearlyFinancialAdviceRisk('매수와 매도, 시세와 수익률을 보고 레버리지로 단기 투자를 합니다. 코인과 주식 트레이딩.');
    expect(out).not.toMatch(/매수|매도|시세|수익률|레버리지|단기\s*투자|코인|주식|트레이딩/);
  });

  it('sanitizeYearlyUnsupportedUserContext — 미상 컨텍스트 차단, 배우자궁 보존', () => {
    const ctx = { relationshipStatus: 'unknown' as const, hasChildren: 'unknown' as const };
    expect(sanitizeYearlyUnsupportedUserContext('아내가 힘들어합니다', ctx)).not.toContain('아내');
    expect(sanitizeYearlyUnsupportedUserContext('자녀가 생깁니다', ctx)).not.toContain('자녀');
    // 명리 용어 "배우자궁"은 항상 보존
    expect(sanitizeYearlyUnsupportedUserContext('배우자궁이 흔들립니다', ctx)).toContain('배우자궁');
  });

  it('sanitizeEnglishElementKeys — 영문 오행 키 → 한글', () => {
    const out = sanitizeEnglishElementKeys('wood fire earth metal water');
    expect(out).toBe('목 화 토 금 수');
    expect(out).not.toMatch(/wood|fire|earth|metal|water/i);
  });

  it('sanitizeValidatorLogLeak — 내부 토큰/검증 용어 제거', () => {
    const out = sanitizeValidatorLogLeak('[yfc-ganji] mustUseFacts computedEvidence sectionId validation 노출');
    expect(out).not.toMatch(/yfc-ganji|mustUseFacts|computedEvidence|sectionId|validation/i);
  });
});

describe('Y5-2 applyYearlyFinalSanitizers 통합', () => {
  it('위험 표현이 모두 섞인 문단 → 전부 안전화, 배우자궁 보존', () => {
    const input = 'wood 기운이 들어오고 반드시 이직합니다. 아내가 떠나고 자녀가 아픕니다. 레버리지와 단기 투자를 합니다. 우울증이 옵니다. 파산할 수 있습니다. mustUseFacts 노출. 배우자궁이 흔들립니다.';
    const out = applyYearlyFinalSanitizers(input, { relationshipStatus: 'unknown', hasChildren: 'unknown' });
    expect(out).not.toMatch(/wood/i);
    expect(out).not.toContain('아내');
    expect(out).not.toContain('자녀');
    expect(out).not.toContain('레버리지');
    expect(out).not.toContain('단기 투자');
    expect(out).not.toContain('우울증');
    expect(out).not.toContain('파산');
    expect(out).not.toContain('반드시');
    expect(out).not.toContain('mustUseFacts');
    // 명리 용어는 살아남아야 함
    expect(out).toContain('배우자궁');
  });
});

describe('Y5-3 validator HIGH 10개 — 각 issue type 검출', () => {
  it('english-element-key-leak', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearFlowCard.summary += ' wood 기운이 강합니다.';
    const res = validateMock(r);
    expect(hasIssue(res, 'english-element-key-leak')).toBe(true);
    expect(res.highCount).toBeGreaterThanOrEqual(1);
  });

  it('deterministic-future-claim', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body += ' 반드시 합격합니다.';
    expect(hasIssue(validateMock(r), 'deterministic-future-claim')).toBe(true);
  });

  it('financial-advice-risk', () => {
    const r = cloneReport(buildValidMockReport());
    r.topicFortunes.money = '레버리지를 적극 활용하세요.';
    expect(hasIssue(validateMock(r), 'financial-advice-risk')).toBe(true);
  });

  it('medical-advice-risk', () => {
    const r = cloneReport(buildValidMockReport());
    r.topicFortunes.rhythm = '우울증이 옵니다.';
    expect(hasIssue(validateMock(r), 'medical-advice-risk')).toBe(true);
  });

  it('fear-based-claim', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearFlowCard.summary += ' 파산 위기가 옵니다.';
    expect(hasIssue(validateMock(r), 'fear-based-claim')).toBe(true);
  });

  it('unsupported-user-context (관계 미상에서 남편 단정)', () => {
    const r = cloneReport(buildValidMockReport());
    r.topicFortunes.relationship = '남편과 자주 다툽니다.';
    expect(hasIssue(validateMock(r, Y5_CTX_UNKNOWN), 'unsupported-user-context')).toBe(true);
    // married 컨텍스트면 같은 문장이라도 통과
    expect(hasIssue(validateMock(r, Y5_CTX_MARRIED), 'unsupported-user-context')).toBe(false);
  });

  it('invented-evidence (계산되지 않은 신살 언급)', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearFlowCard.summary += ' 천을귀인이 들어옵니다.';
    // invented-evidence는 validator가 전체 report 텍스트를 스캔해 'global' sectionId로 발행함
    // → hasIssue(type만 체크)가 올바른 형태; sentence까지 고정해 우연 통과 방지
    const res = validateMock(r);
    expect(hasIssue(res, 'invented-evidence')).toBe(true);
    expect(res.issues.some(i => i.type === 'invented-evidence' && i.sentence === '천을귀인')).toBe(true);
  });

  it('section-missing (yearFlowCard.title 누락)', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearFlowCard.title = '';
    // sectionId까지 고정 — yearFlowCard.title을 비웠으므로 yearFlowCard에서 검출돼야 함
    expect(hasIssueIn(validateMock(r), 'section-missing', 'yearFlowCard')).toBe(true);
  });

  it('cross-section-leak (yearFlowCard summary 600자+ 월별 풀이)', () => {
    const r = cloneReport(buildValidMockReport());
    let big = '6월에 흐름이 정리됩니다. ';
    while (big.length <= 620) big += '이 흐름은 계속 이어집니다. ';
    r.yearFlowCard.summary = big;
    expect(hasIssueIn(validateMock(r), 'cross-section-leak', 'yearFlowCard')).toBe(true);
  });

  it('validator-log-output (내부 토큰 노출)', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearFlowCard.summary += ' mustUseFacts 노출됨.';
    expect(hasIssue(validateMock(r), 'validator-log-output')).toBe(true);
  });
});

describe('Y5-4 validator MEDIUM 12개 — 각 issue type 검출', () => {
  it('missing-year-ten-god-interpretation', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearFlowCard.summary = '올해는 검증의 결이 흐릅니다. 회의나 문서 장면에서 역할이 정리될 수 있어요.';
    r.yearlyMechanism.body = '현재 대운은 환경을 키우고 신강 구조에서 용신 결이 월주를 건드립니다. 회의 장면. 그래서 좋습니다.';
    expect(hasIssue(validateMock(r), 'missing-year-ten-god-interpretation')).toBe(true);
  });

  it('missing-daewoon-sewoon-link', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body = `올해 세운은 ${Y5_STEM}/${Y5_BRANCH} 결로 월주를 건드립니다. 신강 구조 용신 결. 회의 장면. 그래서 좋습니다.`;
    expect(hasIssue(validateMock(r), 'missing-daewoon-sewoon-link')).toBe(true);
  });

  it('missing-useful-god-link', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body = `현재 대운 환경. 올해 ${Y5_STEM}/${Y5_BRANCH} 결 월주. 신강 구조. 회의 장면. 그래서 좋습니다.`;
    expect(hasIssue(validateMock(r), 'missing-useful-god-link')).toBe(true);
  });

  it('missing-monthly-guidance', () => {
    const r = cloneReport(buildValidMockReport());
    r.remainingMonths = [];
    expect(hasIssue(validateMock(r), 'missing-monthly-guidance')).toBe(true);
  });

  it('missing-action-guide (betterAvoid 비어있음 — high section-missing과 분리)', () => {
    const r = cloneReport(buildValidMockReport());
    r.actionGuide.betterAvoid = [];
    const res = validateMock(r);
    expect(hasIssue(res, 'missing-action-guide')).toBe(true);
    // betterAvoid만 비우면 HIGH section-missing은 나면 안 됨 (mustCatch/bestStrategy 유지)
    expect(res.highCount).toBe(0);
  });

  it('missing-next-two-years (정확히 2개가 아님)', () => {
    const r = cloneReport(buildValidMockReport());
    r.nextTwoYears = [r.nextTwoYears[0]];
    expect(hasIssue(validateMock(r), 'missing-next-two-years')).toBe(true);
  });

  it('generic-yearly-overview', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyOverview.oneLine = '좋은 해';
    expect(hasIssue(validateMock(r), 'generic-yearly-overview')).toBe(true);
  });

  it('weak-evidence-to-narrative (evidenceBlocks 비어있음)', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.evidenceBlocks = [];
    expect(hasIssue(validateMock(r), 'weak-evidence-to-narrative')).toBe(true);
  });

  it('special-star-too-shallow (신살 단어만 등장)', () => {
    const r = cloneReport(buildValidMockReport());
    // 신살 이름만 언급하고 그 의미 토큰(예술적/몰입)은 본문·요약 어디에도 없게 한다
    r.yearFlowCard.summary = '올해 흐름을 한 줄로 짚어봅니다.';
    r.yearlyMechanism.body = `올해는 화개 기운이 들어옵니다. 현재 대운은 ${Y5_STEM}/${Y5_BRANCH} 흐름을 키우고 신강 구조에서 용신 결이 월주를 건드립니다. 회의 장면. 그래서 좋습니다.`;
    const analysisWithStar = {
      ...Y5_ANALYSIS,
      specialStarsActivated: [{ name: '화개', source: 'natal' as const, plainMeaning: '예술적 고독', yearlyMeaning: '예술적 몰입' }],
    };
    const res = validateYearlyReport({ report: r, analysis: analysisWithStar, plans: Y5_PLANS, ctx: Y5_CTX_UNKNOWN });
    expect(hasIssue(res, 'special-star-too-shallow')).toBe(true);
    // 신살이 analysis에 선언되어 있으면 invented-evidence는 아님
    expect(hasIssue(res, 'invented-evidence')).toBe(false);
  });

  it('missing-life-scene', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body = `현재 대운 ${Y5_STEM}/${Y5_BRANCH} 용신 신강 월주. 그래서 좋습니다.`;
    expect(hasIssue(validateMock(r), 'missing-life-scene')).toBe(true);
  });

  it('missing-palace-impact', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body = `현재 대운 ${Y5_STEM}/${Y5_BRANCH} 용신 신강. 회의 장면. 그래서 좋습니다.`;
    expect(hasIssue(validateMock(r), 'missing-palace-impact')).toBe(true);
  });

  it('missing-strength-impact', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body = `현재 대운 ${Y5_STEM}/${Y5_BRANCH} 용신 결 월주. 회의 장면. 그래서 좋습니다.`;
    expect(hasIssue(validateMock(r), 'missing-strength-impact')).toBe(true);
  });

  it('degraded report (high + medium 다수) → isValid=false', () => {
    const r = cloneReport(buildValidMockReport());
    // 본문/섹션을 비워 medium 다수 + remainingMonths 누락으로 HIGH section-missing 동시 유발
    r.yearFlowCard.summary = '짧음';
    r.yearlyMechanism.body = '짧은 본문.';
    r.yearlyMechanism.evidenceBlocks = [];
    r.remainingMonths = [];            // → HIGH section-missing + MEDIUM missing-monthly-guidance
    r.actionGuide.betterAvoid = [];
    r.yearlyOverview.oneLine = '좋은 해';
    const res = validateMock(r);
    // 참고: medium #4(missing-monthly-guidance)는 remainingMonths 비움과 동시에
    // HIGH section-missing을 유발하므로 "highCount===0 && mediumCount>=12" 조합은 설계상 도달 불가.
    // 따라서 degraded report는 항상 highCount로 invalid가 된다.
    expect(res.highCount).toBeGreaterThanOrEqual(1);
    expect(res.mediumCount).toBeGreaterThanOrEqual(6);
    expect(res.isValid).toBe(false);
  });
});

describe('Y5-5 validator LOW 3개', () => {
  it('weak-transition (전환어 없음)', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body = `현재 대운 ${Y5_STEM}/${Y5_BRANCH} 용신 신강 월주 회의 장면. 좋습니다.`;
    expect(hasIssue(validateMock(r), 'weak-transition')).toBe(true);
  });

  it('minor-repetition (3-6자 토큰 4회+)', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body = '검증하기 검증하기 검증하기 검증하기 그리고 현재 대운 용신 신강 월주 회의 장면입니다 그래서 좋습니다 할 수 있어요 정리하는 흐름이 이어집니다.';
    const res = validateMock(r);
    expect(hasIssue(res, 'minor-repetition')).toBe(true);
    // 어떤 토큰이 반복으로 잡혔는지까지 고정 (다른 토큰이 우연히 트리거되지 않도록)
    expect(res.issues.some(i => i.type === 'minor-repetition' && i.sentence === '검증하기')).toBe(true);
  });

  it('tone-too-dry (소프트 톤 없음)', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body = `현재 대운 ${Y5_STEM}/${Y5_BRANCH} 용신 신강 월주 회의 장면 그래서 정리한다.`;
    expect(hasIssue(validateMock(r), 'tone-too-dry')).toBe(true);
  });
});

describe('Y5-6 cross-section-leak — 4가지 침범 패턴', () => {
  it('remainingMonths가 "이후 2년" 영역 침범', () => {
    const r = cloneReport(buildValidMockReport());
    r.remainingMonths[0].body = '이후 2년 동안 흐름이 이어집니다.';
    expect(hasIssueIn(validateMock(r), 'cross-section-leak', 'remainingMonths')).toBe(true);
  });

  it('nextTwoYears가 월별 흐름(N월)을 풀어씀', () => {
    const r = cloneReport(buildValidMockReport());
    r.nextTwoYears[0].summary = '3월에 큰 변화가 들어옵니다.';
    expect(hasIssueIn(validateMock(r), 'cross-section-leak', 'nextTwoYears')).toBe(true);
  });

  it('actionGuide.bestStrategy가 월별 단정', () => {
    const r = cloneReport(buildValidMockReport());
    r.actionGuide.bestStrategy = '6월에 꼭 움직이세요.';
    expect(hasIssueIn(validateMock(r), 'cross-section-leak', 'actionGuide')).toBe(true);
  });
});

describe('Y5-7 invented-evidence — 선언/미선언 신살 구분', () => {
  it('미선언 신살은 invented, 선언된 신살은 통과', () => {
    const r1 = cloneReport(buildValidMockReport());
    r1.yearlyMechanism.body += ' 도화 기운이 강합니다.';
    // invented-evidence는 'global' sectionId로 발행됨 → sentence까지 고정해 우연 통과 방지
    const res1 = validateMock(r1);
    expect(hasIssue(res1, 'invented-evidence')).toBe(true);
    expect(res1.issues.some(i => i.type === 'invented-evidence' && i.sentence === '도화')).toBe(true);

    const r2 = cloneReport(buildValidMockReport());
    r2.yearlyMechanism.body += ' 도화 기운이 강해 끌어당기는 매력이 살아납니다.';
    const analysisWithStar = {
      ...Y5_ANALYSIS,
      specialStarsActivated: [{ name: '도화', source: 'year' as const, plainMeaning: '매력 끌어당김', yearlyMeaning: '매력 살아남' }],
    };
    const res2 = validateYearlyReport({ report: r2, analysis: analysisWithStar, plans: Y5_PLANS, ctx: Y5_CTX_UNKNOWN });
    expect(hasIssue(res2, 'invented-evidence')).toBe(false);
  });
});

describe('Y5-8 validator-log-output — 다양한 내부 토큰', () => {
  it('mustUseFacts / yfc-ganji / JSON schema / validation 모두 검출', () => {
    for (const leak of ['mustUseFacts', 'yfc-ganji', 'JSON schema', 'validation 결과']) {
      const r = cloneReport(buildValidMockReport());
      r.yearFlowCard.summary += ` ${leak}`;
      expect(hasIssue(validateMock(r), 'validator-log-output')).toBe(true);
    }
  });
});

describe('Y5-9 repair trigger 기준', () => {
  it('global high(deterministic) → shouldRepair, repairTargets에 yearlyMechanism redirect', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body += ' 반드시 이직합니다.';
    const res = validateMock(r);
    expect(res.highCount).toBeGreaterThanOrEqual(1);
    expect(res.shouldRepair).toBe(true);
    expect(res.repairTargets).toContain('yearlyMechanism');
  });

  it('섹션 high(financial) → repairTargets에 해당 섹션', () => {
    const r = cloneReport(buildValidMockReport());
    r.topicFortunes.money = '레버리지로 매수하세요.';
    const res = validateMock(r);
    expect(res.shouldRepair).toBe(true);
    expect(res.repairTargets).toContain('topicFortunes');
  });

  it('같은 섹션 medium 2+ (high 0) → repairTargets에 섹션 포함', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearFlowCard.summary = '짧음';
    r.yearlyMechanism.body = '짧은 본문.';
    const res = validateMock(r);
    expect(res.highCount).toBe(0);
    expect(res.mediumCount).toBeGreaterThanOrEqual(2);
    expect(res.repairTargets).toContain('yearlyMechanism');
    expect(res.shouldRepair).toBe(true); // mediumCount>=6
  });

  it('low만 있으면 shouldRepair=false', () => {
    const r = cloneReport(buildValidMockReport());
    // 전환어만 제거 → weak-transition(low)만, medium/high 0 유지
    r.yearlyMechanism.body = `현재 대운은 큰 환경을 키워주고 올해 세운은 ${Y5_STEM}/${Y5_BRANCH} 결로 월주를 건드립니다. 신강 구조에서 용신 결이 들어옵니다. 회의나 문서 장면에서 역할이 명확해질 수 있어요.`;
    const res = validateMock(r);
    expect(res.highCount).toBe(0);
    expect(res.mediumCount).toBe(0);
    expect(res.lowCount).toBeGreaterThanOrEqual(1);
    expect(res.shouldRepair).toBe(false);
  });
});

describe('Y5-10 valid mock report — 합격선', () => {
  it('high 0 + medium <6 → isValid=true && shouldRepair=false', () => {
    const res = validateMock(buildValidMockReport());
    expect(res.highCount).toBe(0);
    expect(res.mediumCount).toBeLessThan(6);
    expect(res.isValid).toBe(true);
    expect(res.shouldRepair).toBe(false);
    // partitionIssues 정합
    const p = partitionIssues(res);
    expect(p.high.length).toBe(res.highCount);
    expect(p.medium.length).toBe(res.mediumCount);
    expect(p.low.length).toBe(res.lowCount);
  });
});

describe('Y5-11 배우자궁 보존 (validator)', () => {
  it('명리 표현 "배우자궁"은 unsupported-user-context로 잡히면 안 됨', () => {
    const r = cloneReport(buildValidMockReport());
    r.yearlyMechanism.body = `현재 대운은 환경을 키우고 올해 세운 ${Y5_STEM}/${Y5_BRANCH} 결이 배우자궁을 건드립니다. 신강 구조에서 용신 결, 회의 장면. 그래서 좋습니다.`;
    const res = validateMock(r, Y5_CTX_UNKNOWN);
    expect(hasIssue(res, 'unsupported-user-context')).toBe(false);
    // 궁 언급이 있으므로 palace-impact medium도 없어야 함
    expect(hasIssue(res, 'missing-palace-impact')).toBe(false);
  });
});
