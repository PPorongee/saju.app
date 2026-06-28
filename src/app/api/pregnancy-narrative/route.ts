// /api/pregnancy-narrative — 임산부 모드 V4 엔드포인트 (Phase 7)
//
// 미러 패턴: src/app/api/compat-narrative/route.ts
// runtime nodejs, maxDuration 90, JSON body, error envelope.
//
// 상태코드 표
//   200  정상 생성 (highCount === 0)
//   400  invalid_json  — body 파싱 실패
//   400  invalid_input — body 유효성 실패
//   403  forbidden     — verifySecret 불일치
//   413  payload_too_large — Content-Length > 32 KiB
//   422  unsafe_content — 안전 validator HIGH 1+ (의료/출산 민감 → 본문 노출 금지)
//   500  generation_failed — generatePregnancyNarrativeReport 예외
//   503  pregnancy_narrative_api_disabled — PREGNANCY_NARRATIVE_API_ENABLED !== 'true'

import 'server-only';
import { NextResponse } from 'next/server';
import type { BirthInput, BirthTimeConfidence } from '@/domain/saju/calendar/normalizeBirthInput';
import { generatePregnancyNarrativeReport } from '@/domain/saju/pregnancy/narrative/generatePregnancyNarrativeReport';
import { createOpenAiPregnancyNarrativeGptCaller } from '@/lib/pregnancy-narrative-gpt-caller';
import {
  normalizePregnancyNarrativeServerFlags,
  validatePregnancyNarrativeRequestBody,
  resolveLivePregnancyRepairAttempts,
} from '@/domain/saju/pregnancy/narrative/pregnancyNarrativeServerFlags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// 7개 섹션 병렬 wave1 + HIGH 발생 시 highOnlyRepair wave1회 여유 확보 (Vercel 기본 300s).
export const maxDuration = 150;

/** babyDueInput 방어적 정규화 — 예정시간 유무로 birthTimeConfidence 결정 (성별 unknown). */
function normalizeBabyDueInput(raw: Record<string, any>): BirthInput {
  const hasTime = typeof raw.birthTime === 'string' && /^\d{1,2}:\d{2}/.test(raw.birthTime);
  const confidence: BirthTimeConfidence =
    raw.birthTimeConfidence === 'exact' || raw.birthTimeConfidence === 'approximate' || raw.birthTimeConfidence === 'unknown'
      ? raw.birthTimeConfidence
      : (hasTime ? 'approximate' : 'unknown');
  return {
    name: typeof raw.name === 'string' ? raw.name : '아기',
    gender: 'unknown',
    calendarType: raw.calendarType === 'lunar' ? 'lunar' : 'solar',
    birthDate: String(raw.birthDate),
    birthTime: hasTime ? raw.birthTime : undefined,
    birthTimeConfidence: confidence,
    timezone: 'Asia/Seoul',
  };
}

/** momInput 방어적 정규화 — 출생시간 유무로 birthTimeConfidence 결정. */
function normalizeMomInput(raw: Record<string, any>): BirthInput {
  const hasTime = typeof raw.birthTime === 'string' && /^\d{1,2}:\d{2}/.test(raw.birthTime);
  const confidence: BirthTimeConfidence =
    raw.birthTimeConfidence === 'exact' || raw.birthTimeConfidence === 'approximate' || raw.birthTimeConfidence === 'unknown'
      ? raw.birthTimeConfidence
      : (hasTime ? 'exact' : 'unknown');
  return {
    name: typeof raw.name === 'string' ? raw.name : '엄마',
    gender: 'female',
    calendarType: raw.calendarType === 'lunar' ? 'lunar' : 'solar',
    isLeapMonth: raw.isLeapMonth === true ? true : undefined,
    birthDate: String(raw.birthDate),
    birthTime: hasTime ? raw.birthTime : undefined,
    birthTimeConfidence: confidence,
    timezone: 'Asia/Seoul',
  };
}

export async function POST(req: Request) {
  // 0) payload 크기 사전 차단 (32 KiB)
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

  // 2) API 활성 여부 (flag 기본 OFF → 503)
  const flags = normalizePregnancyNarrativeServerFlags(process.env);
  if (!flags.apiEnabled) {
    return NextResponse.json({ error: 'pregnancy_narrative_api_disabled' }, { status: 503 });
  }

  // 3) 비밀 헤더 검증
  if (flags.verifySecret !== undefined) {
    const provided = req.headers.get('x-pregnancy-verify-secret');
    if (provided !== flags.verifySecret) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  // 4) body 유효성
  const bodyValidation = validatePregnancyNarrativeRequestBody(body);
  if (!bodyValidation.ok) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  // 5) 입력 구성 (방어적 정규화)
  const b = body as Record<string, any>;
  const momInput = normalizeMomInput(b.momInput as Record<string, any>);
  const babyDueInput = normalizeBabyDueInput(b.babyDueInput as Record<string, any>);

  // 6) 생성
  try {
    const result = await generatePregnancyNarrativeReport(momInput, babyDueInput, {
      callGpt: createOpenAiPregnancyNarrativeGptCaller(),
      maxRepairAttempts: resolveLivePregnancyRepairAttempts(b.maxRepairAttempts),
      // 첫 검증에 HIGH가 있으면 1회만 재생성 — 422 차단(본문 노출 금지) 전 마지막 기회.
      highOnlyRepair: true,
    });

    // 6-1) 안전 게이트 — HIGH 1+ 이면 본문 노출 금지 (의료/출산 민감)
    if (result.validation.highCount > 0) {
      console.error('[/api/pregnancy-narrative] unsafe_content highCount=', result.validation.highCount);
      return NextResponse.json(
        {
          error: 'unsafe_content',
          validation: { isValid: false, highCount: result.validation.highCount, mediumCount: result.validation.mediumCount },
        },
        { status: 422 },
      );
    }

    // 7) 응답 — 직렬화 가능 부분만 (issues[] 미노출)
    // 카운트 diagnostics도 prod에선 숨기고 isValid만(클라 미사용). dev/디버그에선 카운트 유지.
    return NextResponse.json({
      report: result.report,
      validation: (process.env.NODE_ENV !== 'production' || process.env.SAJU_EXPOSE_VALIDATION_DIAGNOSTICS === 'true')
        ? { isValid: result.validation.isValid, highCount: result.validation.highCount, mediumCount: result.validation.mediumCount }
        : { isValid: result.validation.isValid },
      attempts: result.attempts,
      repairedSections: result.repairedSections,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/pregnancy-narrative] error:', err);
    return NextResponse.json({ error: 'generation_failed', detail: message }, { status: 500 });
  }
}
