// 임산부 모드 V4 — Server flag normalization & request validation (Phase 7)
//
// 순수(pure) 모듈 — server-only 없음, network 호출 없음.
// route.ts / 테스트 모두 여기서 import.

import type { PregnancyNarrativeServerFlags } from './pregnancyNarrativeTypes';

/** maxRepairAttempts 입력값을 [0, 2] 범위로 정규화. 비숫자 → 기본 1. */
export function clampPregnancyRepairAttempts(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : 1;
  return Math.max(0, Math.min(2, v));
}

/** live(라우트) 경로 maxRepairAttempts: 미지정 → 0. */
export function resolveLivePregnancyRepairAttempts(n: unknown): number {
  if (n === undefined || n === null) return 0;
  return clampPregnancyRepairAttempts(n);
}

/**
 * process.env → PregnancyNarrativeServerFlags 정규화.
 * apiEnabled  : PREGNANCY_NARRATIVE_API_ENABLED === 'true'
 * verifySecret: PREGNANCY_NARRATIVE_VERIFY_SECRET (있으면 string)
 */
export function normalizePregnancyNarrativeServerFlags(
  env: Record<string, string | undefined>,
): PregnancyNarrativeServerFlags {
  return {
    apiEnabled: env.PREGNANCY_NARRATIVE_API_ENABLED === 'true',
    verifySecret: env.PREGNANCY_NARRATIVE_VERIFY_SECRET || undefined,
  };
}

export interface PregnancyNarrativeRequestValidation {
  ok: boolean;
  error?: string;
}

function isValidBirthShape(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const b = value as Record<string, unknown>;
  if (typeof b.birthDate !== 'string' || !b.birthDate) return false;
  if (typeof b.timezone !== 'string' || !b.timezone) return false;
  return true;
}

/**
 * 요청 body shape 검증 (명리 계산 없음).
 * 필수: body.momInput.{birthDate,timezone}, body.babyDueInput.{birthDate,timezone}
 */
export function validatePregnancyNarrativeRequestBody(
  body: unknown,
): PregnancyNarrativeRequestValidation {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'body must be an object' };
  }
  const b = body as Record<string, unknown>;
  if (!isValidBirthShape(b.momInput)) {
    return { ok: false, error: 'momInput.birthDate and momInput.timezone are required' };
  }
  if (!isValidBirthShape(b.babyDueInput)) {
    return { ok: false, error: 'babyDueInput.birthDate and babyDueInput.timezone are required' };
  }
  return { ok: true };
}
