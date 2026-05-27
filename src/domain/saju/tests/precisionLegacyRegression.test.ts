// Precision V1 — Phase 6: legacy byte-identical 회귀 강화 (4기능 deterministic 코어).
// "mode 미지정(default)" == "mode='legacy' 명시" 를 deep-equal로 보장 + calculationMeta 미부착.
import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { composeCompatibilityAnalysis } from '../compatibility/compatibilityAnalyzer';
import { composePregnancyAnalysis } from '../pregnancy/narrative/pregnancyMomBabyAnalyzer';
import { buildYearlyAnalysis } from '../yearly/generateYearlyFortuneReport';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const NOW = new Date('2026-05-27T00:00:00Z');

const SAMPLES: BirthInput[] = [
  { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  { gender: 'male', calendarType: 'solar', birthDate: '1988-03-15', birthTime: '23:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  { gender: 'female', calendarType: 'lunar', isLeapMonth: false, birthDate: '1979-09-09', birthTime: '03:20', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  { gender: 'male', calendarType: 'solar', birthDate: '2001-04-10', birthTimeConfidence: 'unknown', timezone: 'Asia/Seoul' },
];
const asLegacy = (i: BirthInput): BirthInput => ({ ...i, calculationMode: 'legacy' });

describe('P6 개인사주 calculateAnalysisOnly — default == legacy, meta 미부착', () => {
  it.each(SAMPLES.map((s, i) => [i, s] as const))('sample %i', (_i, s) => {
    const def = calculateAnalysisOnly(s, NOW);
    const leg = calculateAnalysisOnly(asLegacy(s), NOW);
    expect(leg).toEqual(def);
    expect('calculationMeta' in def).toBe(false);
    expect(def.calculationMeta).toBeUndefined();
  });
});

describe('P6 궁합 composeCompatibilityAnalysis — default == legacy', () => {
  it('dating 번들 deep-equal', () => {
    const a = SAMPLES[0], b = SAMPLES[1];
    const def = composeCompatibilityAnalysis(calculateAnalysisOnly(a, NOW), calculateAnalysisOnly(b, NOW), 'dating');
    const leg = composeCompatibilityAnalysis(calculateAnalysisOnly(asLegacy(a), NOW), calculateAnalysisOnly(asLegacy(b), NOW), 'dating');
    expect(leg).toEqual(def);
  });
});

describe('P6 임산부 composePregnancyAnalysis — default == legacy', () => {
  it('mom-baby 번들 deep-equal', () => {
    const mom = SAMPLES[0];
    const baby: BirthInput = { gender: 'unknown', calendarType: 'solar', birthDate: '2026-09-15', birthTimeConfidence: 'unknown', timezone: 'Asia/Seoul' };
    const def = composePregnancyAnalysis(calculateAnalysisOnly(mom, NOW), calculateAnalysisOnly(baby, NOW));
    const leg = composePregnancyAnalysis(calculateAnalysisOnly(asLegacy(mom), NOW), calculateAnalysisOnly(asLegacy(baby), NOW));
    // bundle.mother/baby는 PersonalSajuGptInput — legacy면 calculationMeta 없어야 deep-equal 성립
    expect(leg).toEqual(def);
    expect('calculationMeta' in def.mother).toBe(false);
  });
});

describe('P6 올해운세 buildYearlyAnalysis — default == legacy', () => {
  it('yearly 분석 deep-equal', () => {
    const birth = SAMPLES[0];
    const input = { birth, currentDate: '2026-05-27', targetYear: 2026 } as never;
    const inputLeg = { birth: asLegacy(birth), currentDate: '2026-05-27', targetYear: 2026 } as never;
    const def = buildYearlyAnalysis(input, NOW);
    const leg = buildYearlyAnalysis(inputLeg, NOW);
    expect(leg).toEqual(def);
  });
});

describe('P6 env 미설정 시 기본 legacy', () => {
  it('SAJU_CALC_MODE 없으면 calculationMeta 미부착', () => {
    const prev = process.env.SAJU_CALC_MODE;
    try {
      delete process.env.SAJU_CALC_MODE;
      const r = calculateAnalysisOnly(SAMPLES[0], NOW);
      expect(r.calculationMeta).toBeUndefined();
    } finally {
      if (prev !== undefined) process.env.SAJU_CALC_MODE = prev;
    }
  });
});
