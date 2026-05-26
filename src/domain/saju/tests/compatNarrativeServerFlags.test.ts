// 궁합 narrative V4 — Server flag normalization & request validation 테스트 (Phase 6)
//
// 정책:
//   - 순수 helper 함수만 테스트. route.ts import 없음. network 호출 없음.
//   - normalizeCompatNarrativeServerFlags / resolveLiveCompatRepairAttempts /
//     validateCompatNarrativeRequestBody 커버.

import { describe, it, expect } from 'vitest';
import {
  normalizeCompatNarrativeServerFlags,
  resolveLiveCompatRepairAttempts,
  clampCompatRepairAttempts,
  validateCompatNarrativeRequestBody,
} from '../compatibility/narrative/compatNarrativeServerFlags';
import type { CompatNarrativeServerFlags } from '../compatibility/narrative/compatNarrativeTypes';

// ============================================================
// normalizeCompatNarrativeServerFlags
// ============================================================
describe('normalizeCompatNarrativeServerFlags', () => {
  it('COMPAT_NARRATIVE_API_ENABLED=true → apiEnabled=true', () => {
    const flags = normalizeCompatNarrativeServerFlags({
      COMPAT_NARRATIVE_API_ENABLED: 'true',
    });
    expect(flags.apiEnabled).toBe(true);
  });

  it('COMPAT_NARRATIVE_API_ENABLED 미설정 → apiEnabled=false (기본 OFF)', () => {
    const flags = normalizeCompatNarrativeServerFlags({});
    expect(flags.apiEnabled).toBe(false);
  });

  it('COMPAT_NARRATIVE_API_ENABLED=false → apiEnabled=false', () => {
    const flags = normalizeCompatNarrativeServerFlags({
      COMPAT_NARRATIVE_API_ENABLED: 'false',
    });
    expect(flags.apiEnabled).toBe(false);
  });

  it('COMPAT_NARRATIVE_VERIFY_SECRET 설정 → verifySecret=해당 문자열', () => {
    const flags = normalizeCompatNarrativeServerFlags({
      COMPAT_NARRATIVE_API_ENABLED: 'true',
      COMPAT_NARRATIVE_VERIFY_SECRET: 'my-secret-token',
    });
    expect(flags.verifySecret).toBe('my-secret-token');
  });

  it('COMPAT_NARRATIVE_VERIFY_SECRET 미설정 → verifySecret=undefined', () => {
    const flags = normalizeCompatNarrativeServerFlags({
      COMPAT_NARRATIVE_API_ENABLED: 'true',
    });
    expect(flags.verifySecret).toBeUndefined();
  });

  it('COMPAT_NARRATIVE_VERIFY_SECRET 빈 문자열 → verifySecret=undefined', () => {
    const flags = normalizeCompatNarrativeServerFlags({
      COMPAT_NARRATIVE_API_ENABLED: 'true',
      COMPAT_NARRATIVE_VERIFY_SECRET: '',
    });
    expect(flags.verifySecret).toBeUndefined();
  });

  it('모든 env 동시 설정 — 전체 필드 정확', () => {
    const flags = normalizeCompatNarrativeServerFlags({
      COMPAT_NARRATIVE_API_ENABLED: 'true',
      COMPAT_NARRATIVE_VERIFY_SECRET: 'tok',
    });
    expect(flags).toEqual<CompatNarrativeServerFlags>({
      apiEnabled: true,
      verifySecret: 'tok',
    });
  });
});

// ============================================================
// resolveLiveCompatRepairAttempts (live 기본 0)
// ============================================================
describe('resolveLiveCompatRepairAttempts', () => {
  it('undefined → 0 (live 기본: repair 없음)', () => {
    expect(resolveLiveCompatRepairAttempts(undefined)).toBe(0);
  });
  it('null → 0', () => {
    expect(resolveLiveCompatRepairAttempts(null)).toBe(0);
  });
  it('0 → 0 (명시 0)', () => {
    expect(resolveLiveCompatRepairAttempts(0)).toBe(0);
  });
  it('1 → 1 (명시 1이면 repair 허용)', () => {
    expect(resolveLiveCompatRepairAttempts(1)).toBe(1);
  });
  it('2 → 2', () => {
    expect(resolveLiveCompatRepairAttempts(2)).toBe(2);
  });
  it('5 → 2 (상한 clamp)', () => {
    expect(resolveLiveCompatRepairAttempts(5)).toBe(2);
  });
  it('-3 → 0 (하한 clamp)', () => {
    expect(resolveLiveCompatRepairAttempts(-3)).toBe(0);
  });
});

// ============================================================
// clampCompatRepairAttempts (보조 — 명시값 정규화)
// ============================================================
describe('clampCompatRepairAttempts', () => {
  it('undefined → 1 (기본값)', () => {
    expect(clampCompatRepairAttempts(undefined)).toBe(1);
  });
  it('NaN → 1 (기본값)', () => {
    expect(clampCompatRepairAttempts(NaN)).toBe(1);
  });
  it("'3' (string) → 1 (비숫자 타입)", () => {
    expect(clampCompatRepairAttempts('3')).toBe(1);
  });
  it('1.9 → 1 (소수점 버림)', () => {
    expect(clampCompatRepairAttempts(1.9)).toBe(1);
  });
});

// ============================================================
// validateCompatNarrativeRequestBody
// ============================================================
describe('validateCompatNarrativeRequestBody', () => {
  function validBody(overrides: Record<string, unknown> = {}) {
    return {
      inputA: { birthDate: '1995-07-06', timezone: 'Asia/Seoul' },
      inputB: { birthDate: '1992-03-14', timezone: 'Asia/Seoul' },
      relationshipType: 'dating',
      ...overrides,
    };
  }

  it('유효한 최소 body → ok=true', () => {
    expect(validateCompatNarrativeRequestBody(validBody())).toEqual({ ok: true });
  });

  it('모든 relationshipType enum 값 허용', () => {
    for (const rt of ['dating', 'married', 'friendship', 'coworker', 'reunion_or_breakup', 'crush_or_something']) {
      expect(validateCompatNarrativeRequestBody(validBody({ relationshipType: rt }))).toEqual({ ok: true });
    }
  });

  it('non-object → ok=false', () => {
    expect(validateCompatNarrativeRequestBody(null)).toMatchObject({ ok: false });
    expect(validateCompatNarrativeRequestBody('string')).toMatchObject({ ok: false });
    expect(validateCompatNarrativeRequestBody(42)).toMatchObject({ ok: false });
    expect(validateCompatNarrativeRequestBody([])).toMatchObject({ ok: false });
  });

  it('inputA 누락 → ok=false', () => {
    expect(validateCompatNarrativeRequestBody({ inputB: { birthDate: '1992-03-14', timezone: 'Asia/Seoul' }, relationshipType: 'dating' })).toMatchObject({ ok: false });
  });

  it('inputA.birthDate 누락 → ok=false', () => {
    expect(validateCompatNarrativeRequestBody(validBody({ inputA: { timezone: 'Asia/Seoul' } }))).toMatchObject({ ok: false });
  });

  it('inputA.birthDate 빈 문자열 → ok=false', () => {
    expect(validateCompatNarrativeRequestBody(validBody({ inputA: { birthDate: '', timezone: 'Asia/Seoul' } }))).toMatchObject({ ok: false });
  });

  it('inputA.timezone 누락 → ok=false', () => {
    expect(validateCompatNarrativeRequestBody(validBody({ inputA: { birthDate: '1995-07-06' } }))).toMatchObject({ ok: false });
  });

  it('inputB.birthDate 누락 → ok=false', () => {
    expect(validateCompatNarrativeRequestBody(validBody({ inputB: { timezone: 'Asia/Seoul' } }))).toMatchObject({ ok: false });
  });

  it('inputB.timezone 빈 문자열 → ok=false', () => {
    expect(validateCompatNarrativeRequestBody(validBody({ inputB: { birthDate: '1992-03-14', timezone: '' } }))).toMatchObject({ ok: false });
  });

  it('relationshipType 누락 → ok=false', () => {
    const { relationshipType, ...rest } = validBody();
    void relationshipType;
    expect(validateCompatNarrativeRequestBody(rest)).toMatchObject({ ok: false });
  });

  it('relationshipType 잘못된 값 → ok=false', () => {
    expect(validateCompatNarrativeRequestBody(validBody({ relationshipType: 'enemies' }))).toMatchObject({ ok: false });
  });

  it('relationshipType 비문자열 → ok=false', () => {
    expect(validateCompatNarrativeRequestBody(validBody({ relationshipType: 123 }))).toMatchObject({ ok: false });
  });
});
