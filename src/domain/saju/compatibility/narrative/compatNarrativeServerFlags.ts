// 궁합 narrative V4 — Server flag normalization & request validation (Phase 6)
//
// 순수(pure) 모듈 — server-only 없음, network 호출 없음.
// route.ts / 테스트 모두 여기서 import.
//
// 미러: src/domain/saju/yearly/yearlyServerFlags.ts

import type { CompatNarrativeServerFlags } from './compatNarrativeTypes';
import { RELATIONSHIP_TYPES } from '../compatibilityTypes';
import type { RelationshipType } from '../compatibilityTypes';

// ============================================================
// 0) 순수 helpers
// ============================================================

/**
 * maxRepairAttempts 입력값을 [0, 2] 범위로 정규화.
 * 비숫자/NaN/비정수 → 기본 1. 음수 → 0. 2 초과 → 2.
 */
export function clampCompatRepairAttempts(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : 1;
  return Math.max(0, Math.min(2, v));
}

/**
 * live(라우트) 경로의 maxRepairAttempts 결정.
 * - 미지정(undefined/null) → 0 (repair 없음: wave2가 maxDuration 예산을 잠식하는 것을 방지).
 * - 명시값 → clampCompatRepairAttempts로 [0, 2] 정규화.
 * sanitizer는 generator에서 항상 모든 섹션에 적용되므로, repair 0이어도 안전성은 유지된다.
 */
export function resolveLiveCompatRepairAttempts(n: unknown): number {
  if (n === undefined || n === null) return 0;
  return clampCompatRepairAttempts(n);
}

// ============================================================
// 1) 환경변수 → CompatNarrativeServerFlags 정규화
// ============================================================

/**
 * process.env (또는 임의 Record)를 받아 flag 객체로 변환.
 * apiEnabled  : COMPAT_NARRATIVE_API_ENABLED === 'true'
 * verifySecret: COMPAT_NARRATIVE_VERIFY_SECRET (있으면 string, 없으면 undefined)
 */
export function normalizeCompatNarrativeServerFlags(
  env: Record<string, string | undefined>,
): CompatNarrativeServerFlags {
  return {
    apiEnabled: env.COMPAT_NARRATIVE_API_ENABLED === 'true',
    verifySecret: env.COMPAT_NARRATIVE_VERIFY_SECRET || undefined,
  };
}

// ============================================================
// 2) 요청 body 유효성 검증
// ============================================================

export interface CompatNarrativeRequestValidation {
  ok: boolean;
  error?: string;
}

const RELATIONSHIP_TYPE_SET = new Set<string>(RELATIONSHIP_TYPES as readonly string[]);

function isValidBirthShape(value: unknown): boolean {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const b = value as Record<string, unknown>;
  if (typeof b.birthDate !== 'string' || !b.birthDate) return false;
  if (typeof b.timezone !== 'string' || !b.timezone) return false;
  return true;
}

/**
 * 요청 body shape만 검증 (실제 명리 계산 없음).
 *
 * 필수:
 *   body.inputA.birthDate (non-empty string) + body.inputA.timezone (non-empty string)
 *   body.inputB.birthDate (non-empty string) + body.inputB.timezone (non-empty string)
 *   body.relationshipType ∈ RELATIONSHIP_TYPES
 */
export function validateCompatNarrativeRequestBody(
  body: unknown,
): CompatNarrativeRequestValidation {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'body must be an object' };
  }
  const b = body as Record<string, unknown>;

  if (!isValidBirthShape(b.inputA)) {
    return { ok: false, error: 'inputA.birthDate and inputA.timezone are required' };
  }
  if (!isValidBirthShape(b.inputB)) {
    return { ok: false, error: 'inputB.birthDate and inputB.timezone are required' };
  }
  if (typeof b.relationshipType !== 'string' || !RELATIONSHIP_TYPE_SET.has(b.relationshipType)) {
    return { ok: false, error: 'relationshipType must be a valid relationship type' };
  }

  return { ok: true };
}

export type { RelationshipType };
