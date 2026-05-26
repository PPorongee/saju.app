// Yearly Fortune V4 — Server flag normalization & request validation 테스트 (Y7)
//
// 정책:
//   - 순수 helper 함수만 테스트. route.ts import 없음. network 호출 없음.
//   - normalizeYearlyServerFlags / resolveYearlyDepthOptions / validateYearlyRequestBody 커버.

import { describe, it, expect } from 'vitest';
import {
  normalizeYearlyServerFlags,
  resolveYearlyDepthOptions,
  validateYearlyRequestBody,
  clampYearlyRepairAttempts,
} from '../yearly/yearlyServerFlags';
import type { YearlyFortuneServerFlags, YearlyDepthOptions } from '../yearly/yearlyTypes';

// ============================================================
// normalizeYearlyServerFlags
// ============================================================
describe('normalizeYearlyServerFlags', () => {
  it('YEARLY_FORTUNE_API_ENABLED=true → apiEnabled=true', () => {
    const flags = normalizeYearlyServerFlags({
      YEARLY_FORTUNE_API_ENABLED: 'true',
    });
    expect(flags.apiEnabled).toBe(true);
  });

  it('YEARLY_FORTUNE_API_ENABLED 미설정 → apiEnabled=false', () => {
    const flags = normalizeYearlyServerFlags({});
    expect(flags.apiEnabled).toBe(false);
  });

  it('YEARLY_FORTUNE_API_ENABLED=false → apiEnabled=false', () => {
    const flags = normalizeYearlyServerFlags({
      YEARLY_FORTUNE_API_ENABLED: 'false',
    });
    expect(flags.apiEnabled).toBe(false);
  });

  it('YEARLY_FORTUNE_VERIFY_SECRET 설정 → verifySecret=해당 문자열', () => {
    const flags = normalizeYearlyServerFlags({
      YEARLY_FORTUNE_API_ENABLED: 'true',
      YEARLY_FORTUNE_VERIFY_SECRET: 'my-secret-token',
    });
    expect(flags.verifySecret).toBe('my-secret-token');
  });

  it('YEARLY_FORTUNE_VERIFY_SECRET 미설정 → verifySecret=undefined', () => {
    const flags = normalizeYearlyServerFlags({
      YEARLY_FORTUNE_API_ENABLED: 'true',
    });
    expect(flags.verifySecret).toBeUndefined();
  });

  it('YEARLY_FORTUNE_VERIFY_SECRET 빈 문자열 → verifySecret=undefined', () => {
    const flags = normalizeYearlyServerFlags({
      YEARLY_FORTUNE_API_ENABLED: 'true',
      YEARLY_FORTUNE_VERIFY_SECRET: '',
    });
    expect(flags.verifySecret).toBeUndefined();
  });

  it('SAJU_YEARLY_DEPTH=on → depthEnvDefault=true', () => {
    const flags = normalizeYearlyServerFlags({
      SAJU_YEARLY_DEPTH: 'on',
    });
    expect(flags.depthEnvDefault).toBe(true);
  });

  it('SAJU_YEARLY_DEPTH=off → depthEnvDefault=false', () => {
    const flags = normalizeYearlyServerFlags({
      SAJU_YEARLY_DEPTH: 'off',
    });
    expect(flags.depthEnvDefault).toBe(false);
  });

  it('SAJU_YEARLY_DEPTH 미설정 → depthEnvDefault=false', () => {
    const flags = normalizeYearlyServerFlags({});
    expect(flags.depthEnvDefault).toBe(false);
  });

  it('모든 env 동시 설정 — 전체 필드 정확', () => {
    const flags = normalizeYearlyServerFlags({
      YEARLY_FORTUNE_API_ENABLED: 'true',
      YEARLY_FORTUNE_VERIFY_SECRET: 'tok',
      SAJU_YEARLY_DEPTH: 'on',
    });
    expect(flags).toEqual<YearlyFortuneServerFlags>({
      apiEnabled: true,
      verifySecret: 'tok',
      depthEnvDefault: true,
    });
  });
});

// ============================================================
// resolveYearlyDepthOptions
// ============================================================
describe('resolveYearlyDepthOptions', () => {
  const flagsOff: YearlyFortuneServerFlags = {
    apiEnabled: true,
    verifySecret: undefined,
    depthEnvDefault: false,
  };
  const flagsOn: YearlyFortuneServerFlags = {
    apiEnabled: true,
    verifySecret: undefined,
    depthEnvDefault: true,
  };

  it('body 없음 + env off → 모두 false (default)', () => {
    const result = resolveYearlyDepthOptions(flagsOff, undefined);
    expect(result).toEqual<YearlyDepthOptions>({
      useEvidenceNarrative: false,
      useMonthlyFlow: false,
      useNextTwoYears: false,
    });
  });

  it('body 없음 + env on → 모두 true', () => {
    const result = resolveYearlyDepthOptions(flagsOn, undefined);
    expect(result).toEqual<YearlyDepthOptions>({
      useEvidenceNarrative: true,
      useMonthlyFlow: true,
      useNextTwoYears: true,
    });
  });

  it('body 명시 필드가 env default를 override (env on, body false)', () => {
    const result = resolveYearlyDepthOptions(flagsOn, {
      useEvidenceNarrative: false,
    });
    expect(result.useEvidenceNarrative).toBe(false);
    // 나머지는 env on
    expect(result.useMonthlyFlow).toBe(true);
    expect(result.useNextTwoYears).toBe(true);
  });

  it('body 명시 필드가 env default를 override (env off, body true)', () => {
    const result = resolveYearlyDepthOptions(flagsOff, {
      useNextTwoYears: true,
    });
    expect(result.useNextTwoYears).toBe(true);
    // 나머지는 env off
    expect(result.useEvidenceNarrative).toBe(false);
    expect(result.useMonthlyFlow).toBe(false);
  });

  it('body가 모든 필드 명시 → body 값 전체 우선', () => {
    const result = resolveYearlyDepthOptions(flagsOn, {
      useEvidenceNarrative: false,
      useMonthlyFlow: false,
      useNextTwoYears: false,
    });
    expect(result).toEqual<YearlyDepthOptions>({
      useEvidenceNarrative: false,
      useMonthlyFlow: false,
      useNextTwoYears: false,
    });
  });

  it('빈 body({}) → env default 그대로', () => {
    const result = resolveYearlyDepthOptions(flagsOn, {});
    expect(result).toEqual<YearlyDepthOptions>({
      useEvidenceNarrative: true,
      useMonthlyFlow: true,
      useNextTwoYears: true,
    });
  });
});

// ============================================================
// validateYearlyRequestBody
// ============================================================
describe('validateYearlyRequestBody', () => {
  // 유효한 최소 body 헬퍼
  function validBody(overrides: Record<string, unknown> = {}) {
    return {
      input: {
        birth: {
          birthDate: '1995-07-06',
          timezone: 'Asia/Seoul',
        },
      },
      currentDate: '2026-05-25',
      ...overrides,
    };
  }

  it('유효한 최소 body → ok=true', () => {
    expect(validateYearlyRequestBody(validBody())).toEqual({ ok: true });
  });

  it('currentDate가 input.currentDate에 있어도 ok=true', () => {
    const body = {
      input: {
        birth: { birthDate: '1995-07-06', timezone: 'Asia/Seoul' },
        currentDate: '2026-05-25',
      },
    };
    expect(validateYearlyRequestBody(body)).toEqual({ ok: true });
  });

  it('non-object → ok=false', () => {
    expect(validateYearlyRequestBody(null)).toMatchObject({ ok: false });
    expect(validateYearlyRequestBody('string')).toMatchObject({ ok: false });
    expect(validateYearlyRequestBody(42)).toMatchObject({ ok: false });
    expect(validateYearlyRequestBody([])).toMatchObject({ ok: false });
  });

  it('birthDate 누락 → ok=false', () => {
    const body = {
      input: {
        birth: { timezone: 'Asia/Seoul' },
      },
      currentDate: '2026-05-25',
    };
    expect(validateYearlyRequestBody(body)).toMatchObject({ ok: false });
  });

  it('birthDate 빈 문자열 → ok=false', () => {
    const body = {
      input: {
        birth: { birthDate: '', timezone: 'Asia/Seoul' },
      },
      currentDate: '2026-05-25',
    };
    expect(validateYearlyRequestBody(body)).toMatchObject({ ok: false });
  });

  it('timezone 누락 → ok=false', () => {
    const body = {
      input: {
        birth: { birthDate: '1995-07-06' },
      },
      currentDate: '2026-05-25',
    };
    expect(validateYearlyRequestBody(body)).toMatchObject({ ok: false });
  });

  it('timezone 빈 문자열 → ok=false', () => {
    const body = {
      input: {
        birth: { birthDate: '1995-07-06', timezone: '' },
      },
      currentDate: '2026-05-25',
    };
    expect(validateYearlyRequestBody(body)).toMatchObject({ ok: false });
  });

  it('currentDate 없음 (body에도 input에도 없음) → ok=false', () => {
    const body = {
      input: {
        birth: { birthDate: '1995-07-06', timezone: 'Asia/Seoul' },
      },
    };
    expect(validateYearlyRequestBody(body)).toMatchObject({ ok: false });
  });

  it('currentDate 빈 문자열 + input.currentDate도 없음 → ok=false', () => {
    const body = {
      input: {
        birth: { birthDate: '1995-07-06', timezone: 'Asia/Seoul' },
      },
      currentDate: '',
    };
    expect(validateYearlyRequestBody(body)).toMatchObject({ ok: false });
  });

  it('input 자체가 없으면 → ok=false', () => {
    expect(validateYearlyRequestBody({ currentDate: '2026-05-25' })).toMatchObject({ ok: false });
  });

  it('input.birth가 없으면 → ok=false', () => {
    expect(
      validateYearlyRequestBody({ input: {}, currentDate: '2026-05-25' }),
    ).toMatchObject({ ok: false });
  });
});

// ============================================================
// clampYearlyRepairAttempts
// ============================================================
describe('clampYearlyRepairAttempts', () => {
  it('undefined → 1 (기본값)', () => {
    expect(clampYearlyRepairAttempts(undefined)).toBe(1);
  });

  it('0 → 0 (최소 경계)', () => {
    expect(clampYearlyRepairAttempts(0)).toBe(0);
  });

  it('1 → 1', () => {
    expect(clampYearlyRepairAttempts(1)).toBe(1);
  });

  it('2 → 2 (최대 경계)', () => {
    expect(clampYearlyRepairAttempts(2)).toBe(2);
  });

  it('5 → 2 (최대값 클램프)', () => {
    expect(clampYearlyRepairAttempts(5)).toBe(2);
  });

  it('-3 → 0 (최소값 클램프)', () => {
    expect(clampYearlyRepairAttempts(-3)).toBe(0);
  });

  it('1.9 → 1 (소수점 버림)', () => {
    expect(clampYearlyRepairAttempts(1.9)).toBe(1);
  });

  it('NaN → 1 (기본값)', () => {
    expect(clampYearlyRepairAttempts(NaN)).toBe(1);
  });

  it("'3' (string) → 1 (비숫자 타입)", () => {
    expect(clampYearlyRepairAttempts('3')).toBe(1);
  });
});
