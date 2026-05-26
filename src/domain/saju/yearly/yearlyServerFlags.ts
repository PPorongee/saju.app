// Yearly Fortune V4 — Server flag normalization & request validation (Y7)
//
// 순수(pure) 모듈 — server-only 없음, network 호출 없음.
// route.ts / 테스트 모두 여기서 import.

import type {
  YearlyFortuneServerFlags,
  YearlyDepthOptions,
} from './yearlyTypes';

// ============================================================
// 0) 순수 helpers
// ============================================================

/**
 * maxRepairAttempts 입력값을 [0, 2] 범위로 정규화.
 * 비숫자/NaN/비정수 → 기본 1. 음수 → 0. 2 초과 → 2.
 */
export function clampYearlyRepairAttempts(n: unknown): number {
  const v = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : 1;
  return Math.max(0, Math.min(2, v));
}

// ============================================================
// 1) 환경변수 → YearlyFortuneServerFlags 정규화
// ============================================================

/**
 * process.env (또는 임의 Record)를 받아 flag 객체로 변환.
 * apiEnabled  : YEARLY_FORTUNE_API_ENABLED === 'true'
 * verifySecret: YEARLY_FORTUNE_VERIFY_SECRET (있으면 string, 없으면 undefined)
 * depthEnvDefault: SAJU_YEARLY_DEPTH === 'on'
 */
export function normalizeYearlyServerFlags(
  env: Record<string, string | undefined>,
): YearlyFortuneServerFlags {
  return {
    apiEnabled: env.YEARLY_FORTUNE_API_ENABLED === 'true',
    verifySecret: env.YEARLY_FORTUNE_VERIFY_SECRET || undefined,
    depthEnvDefault: env.SAJU_YEARLY_DEPTH === 'on',
  };
}

// ============================================================
// 2) Depth options 우선순위 해석
//    body (명시 값) > env default (depthEnvDefault) > false
// ============================================================

/**
 * 요청 body에서 내려온 depthOptions(부분 override)와
 * 서버 flag(env default)를 합성해 최종 YearlyDepthOptions 반환.
 *
 * 우선순위: body 명시 필드 > env default(depthEnvDefault가 on이면 모두 true) > false
 */
export function resolveYearlyDepthOptions(
  flags: YearlyFortuneServerFlags,
  bodyDepth?: Partial<YearlyDepthOptions>,
): YearlyDepthOptions {
  // env default 기반 서버 defaults
  const envDefault: YearlyDepthOptions = {
    useEvidenceNarrative: flags.depthEnvDefault,
    useMonthlyFlow: flags.depthEnvDefault,
    useNextTwoYears: flags.depthEnvDefault,
  };
  // body 명시 필드가 있으면 override
  return {
    useEvidenceNarrative: bodyDepth?.useEvidenceNarrative ?? envDefault.useEvidenceNarrative,
    useMonthlyFlow: bodyDepth?.useMonthlyFlow ?? envDefault.useMonthlyFlow,
    useNextTwoYears: bodyDepth?.useNextTwoYears ?? envDefault.useNextTwoYears,
  };
}

// ============================================================
// 3) 요청 body 유효성 검증
// ============================================================

export interface YearlyRequestValidation {
  ok: boolean;
  error?: string;
}

/**
 * 요청 body shape만 검증 (실제 명리 계산 없음).
 *
 * 필수:
 *   body.input.birth.birthDate  (non-empty string)
 *   body.input.birth.timezone   (non-empty string)
 *   body.currentDate 또는 body.input.currentDate  (non-empty string)
 */
export function validateYearlyRequestBody(body: unknown): YearlyRequestValidation {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, error: 'body must be an object' };
  }
  const b = body as Record<string, unknown>;

  // input.birth
  if (b.input === null || typeof b.input !== 'object' || Array.isArray(b.input)) {
    return { ok: false, error: 'input must be an object' };
  }
  const input = b.input as Record<string, unknown>;

  // input.birth
  if (input.birth === null || typeof input.birth !== 'object' || Array.isArray(input.birth)) {
    return { ok: false, error: 'input.birth must be an object' };
  }
  const birth = input.birth as Record<string, unknown>;

  // birthDate
  if (typeof birth.birthDate !== 'string' || !birth.birthDate) {
    return { ok: false, error: 'input.birth.birthDate is required' };
  }

  // timezone
  if (typeof birth.timezone !== 'string' || !birth.timezone) {
    return { ok: false, error: 'input.birth.timezone is required' };
  }

  // currentDate: body.currentDate 우선, 없으면 input.currentDate
  const currentDate =
    typeof b.currentDate === 'string' && b.currentDate
      ? b.currentDate
      : typeof input.currentDate === 'string' && input.currentDate
        ? input.currentDate
        : null;

  if (!currentDate) {
    return { ok: false, error: 'currentDate is required (body.currentDate or input.currentDate)' };
  }

  return { ok: true };
}
