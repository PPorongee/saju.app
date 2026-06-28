// /api/yearly-fortune — 올해운세 V4 엔드포인트 (Y7)
//
// 미러 패턴: src/app/api/saju-v4/route.ts
// runtime nodejs, maxDuration 90, JSON body, error envelope.
//
// 상태코드 표
//   200  정상 생성
//   400  invalid_json  — body 파싱 실패
//   400  invalid_input — body 유효성 실패
//   403  forbidden     — verifySecret 불일치
//   500  generation_failed — generateYearlyFortuneReport 예외
//   503  yearly_api_disabled — YEARLY_FORTUNE_API_ENABLED !== 'true'

import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import type { YearlyDepthOptions, YearlyFortuneInput } from '@/domain/saju/yearly/yearlyTypes';
import { generateYearlyFortuneReport } from '@/domain/saju/yearly/generateYearlyFortuneReport';
import { buildYearlyTimingHints } from '@/domain/saju/yearly/yearlyLifeTiming';
import { createOpenAiYearlyGptCaller } from '@/lib/saju-v4-yearly-gpt-caller';
import {
  normalizeYearlyServerFlags,
  resolveYearlyDepthOptions,
  validateYearlyRequestBody,
  resolveLiveRepairAttempts,
} from '@/domain/saju/yearly/yearlyServerFlags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 가장 무거운 remainingMonths(월별 풀이)는 실측 ~83s 생성 → 90s로는 빠듯해 드롭됨.
// saju-v4/compat-v4와 동일하게 180s로 상향(섹션 병렬이라 전체≈가장 느린 섹션).
export const maxDuration = 180;

export async function POST(req: NextRequest) {
  // Rate limiting — 공개·비인증·유료 OpenAI 호출 보호 (IP당 시간당 20회).
  const rateLimited = await checkRateLimit(req, RATE_LIMITS.yearlyFortune);
  if (rateLimited) return rateLimited;

  // 0) payload 크기 사전 차단 (Content-Length 기준; 32 KiB 초과 → 413)
  const len = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(len) && len > 32768) {
    return NextResponse.json({ error: 'payload_too_large' }, { status: 413 });
  }

  // 1) JSON 파싱
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  // 2) API 활성 여부 확인
  const flags = normalizeYearlyServerFlags(process.env);
  if (!flags.apiEnabled) {
    return NextResponse.json({ error: 'yearly_api_disabled' }, { status: 503 });
  }

  // 3) 비밀 헤더 검증 (verifySecret이 설정된 경우)
  //    UI에서 비활성 시 외부 호출 차단용.
  //    YEARLY_FORTUNE_VERIFY_SECRET을 설정하지 않으면 이 검사를 건너뜀.
  if (flags.verifySecret !== undefined) {
    const provided = req.headers.get('x-yearly-verify-secret');
    if (provided !== flags.verifySecret) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  // 4) body 유효성 검증
  const bodyValidation = validateYearlyRequestBody(body);
  if (!bodyValidation.ok) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  // 5) YearlyFortuneInput 구성
  const b = body as Record<string, any>;
  const inputRaw = b.input as Record<string, any>;

  // currentDate: body.currentDate 우선, 없으면 input.currentDate
  const currentDate: string =
    typeof b.currentDate === 'string' && b.currentDate
      ? b.currentDate
      : (inputRaw.currentDate as string);

  // relationshipStatus/userContext는 body 최상위 또는 input 내부 어느 쪽에 와도 수용.
  const relationshipStatus = b.relationshipStatus ?? inputRaw.relationshipStatus;
  const userContext = b.userContext ?? inputRaw.userContext;
  const input: YearlyFortuneInput = {
    birth: inputRaw.birth,
    currentDate,
    // targetYear override intentionally not exposed — desyncs 세운/월운 from currentDate (see ledger HIGH-2); re-wire in Phase 2.
    ...(relationshipStatus !== undefined ? { relationshipStatus } : {}),
    ...(userContext !== undefined ? { userContext } : {}),
  };

  const depthOptions = resolveYearlyDepthOptions(
    flags,
    b.depthOptions as Partial<YearlyDepthOptions> | undefined,
  );

  // 6) 생성
  try {
    const result = await generateYearlyFortuneReport(input, {
      callGpt: createOpenAiYearlyGptCaller(),
      // live 기본 0 (medium 누적엔 repair 안 함). body로 명시 시 그 횟수.
      maxRepairAttempts: resolveLiveRepairAttempts(b.maxRepairAttempts),
      // 안전망: HIGH(환각/안전 위반)가 있으면 1회는 재생성해 출고 전 걸러냄(없으면 영향 0).
      highOnlyRepair: true,
      depthOptions,
    });

    // 7) 응답 — analysis의 직렬화 가능한 부분만 포함
    const { analysis } = result;
    // 시기 포인트(결정론) — 결혼·인연·시험을 월/연으로. fatalism 금지 톤.
    const uc = (input.userContext ?? {}) as Record<string, any>;
    const timingHints = buildYearlyTimingHints(analysis, {
      gender: input.birth?.gender,
      relationshipStatus: input.relationshipStatus,
      age: typeof uc.age === 'number' ? uc.age : undefined,
      studyConcern: Array.isArray(uc.currentConcerns) && uc.currentConcerns.includes('study'),
    });
    return NextResponse.json({
      timingHints,
      analysisCore: {
        targetYear: analysis.targetYear,
        targetYearGanji: analysis.targetYearGanji,
        currentDaewoonPillar: analysis.currentDaewoon.pillar.pillarKo,
        yearTenGod: analysis.yearTenGod,
        yearElementEffect: analysis.yearElementEffect,
        strengthImpact: analysis.strengthImpact,
      },
      report: result.report,
      // validation: issues[] 는 사용자 문장 + 내부 타입 토큰 포함 → 항상 미노출.
      // 카운트 diagnostics도 prod에선 숨기고 isValid만(클라 미사용). dev/디버그에선 카운트 유지.
      validation: (process.env.NODE_ENV !== 'production' || process.env.SAJU_EXPOSE_VALIDATION_DIAGNOSTICS === 'true')
        ? { isValid: result.validation.isValid, highCount: result.validation.highCount, mediumCount: result.validation.mediumCount }
        : { isValid: result.validation.isValid },
      attempts: result.attempts,
      repairedSections: result.repairedSections,
    });
  } catch (err: unknown) {
    // 스택/시크릿 노출 금지 — message만 반환
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/yearly-fortune] error:', err);
    return NextResponse.json(
      { error: 'generation_failed', detail: message },
      { status: 500 },
    );
  }
}
