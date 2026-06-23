// /api/saju-v4/daily-fortune — 오늘의 별빛 (Daily Fortune V1) 엔드포인트.
//
// 미러 패턴: src/app/api/yearly-fortune/route.ts
// GPT 호출 없음 (deterministic) → maxDuration 짧게.
//
// 상태코드
//   200  정상 생성
//   400  invalid_json        — body 파싱 실패
//   400  invalid_input       — 필수 필드 누락/형식 오류
//   413  payload_too_large   — 8 KiB 초과
//   500  generation_failed   — 빌더 예외
//   503  daily_fortune_disabled — SAJU_DAILY_FORTUNE_ENABLED !== 'true'

import 'server-only';
import { NextResponse } from 'next/server';
import type { BirthInput, CalendarType, Gender, BirthTimeConfidence } from '@/domain/saju/calendar/normalizeBirthInput';
import { buildDailyFortune } from '@/domain/saju/daily/buildDailyFortune';
import type { DailyFortuneInput } from '@/domain/saju/daily/dailyFortuneTypes';
import { isDailyFortuneEnabled } from '@/domain/saju/daily/dailyFortuneFlag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CALENDAR_TYPES: CalendarType[] = ['solar', 'lunar'];
const CONFIDENCES: BirthTimeConfidence[] = ['exact', 'approximate', 'unknown'];
const GENDERS: Gender[] = ['male', 'female', 'unknown'];

export async function POST(req: Request) {
  // 0) payload 크기 사전 차단
  const len = Number(req.headers.get('content-length') ?? '0');
  if (Number.isFinite(len) && len > 8192) {
    return NextResponse.json({ ok: false, error: 'payload_too_large' }, { status: 413 });
  }

  // 1) JSON 파싱
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  // 2) flag 확인 (production 기본 OFF)
  if (!isDailyFortuneEnabled(process.env)) {
    return NextResponse.json({ ok: false, error: 'daily_fortune_disabled' }, { status: 503 });
  }

  // 3) 필수/형식 검증
  if (typeof body.birthDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(body.birthDate)) {
    return NextResponse.json({ ok: false, error: 'invalid_input', detail: 'birthDate (YYYY-MM-DD) required' }, { status: 400 });
  }
  const calendarType: CalendarType = CALENDAR_TYPES.includes(body.calendarType as CalendarType)
    ? (body.calendarType as CalendarType) : 'solar';
  const gender: Gender = GENDERS.includes(body.gender as Gender) ? (body.gender as Gender) : 'unknown';
  const birthTime = typeof body.birthTime === 'string' && /^\d{2}:\d{2}$/.test(body.birthTime) ? body.birthTime : undefined;
  const birthTimeConfidence: BirthTimeConfidence = CONFIDENCES.includes(body.birthTimeConfidence as BirthTimeConfidence)
    ? (body.birthTimeConfidence as BirthTimeConfidence) : (birthTime ? 'exact' : 'unknown');
  const targetDate = typeof body.targetDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(body.targetDate) ? body.targetDate : undefined;
  const lang: 'ko' | 'en' = body.lang === 'en' ? 'en' : 'ko';
  const birthPlaceId = typeof body.birthPlaceId === 'string' && body.birthPlaceId.trim() ? body.birthPlaceId.trim() : undefined;

  const birth: BirthInput = {
    gender,
    calendarType,
    birthDate: body.birthDate,
    birthTimeConfidence,
    timezone: 'Asia/Seoul',
    ...(birthTime ? { birthTime } : {}),
    ...(typeof body.birthPlace === 'string' ? { birthPlace: body.birthPlace } : {}),
    ...(birthPlaceId ? { birthPlaceId } : {}),
    ...(typeof body.isLeapMonth === 'boolean' ? { isLeapMonth: body.isLeapMonth } : {}),
  };

  const input: DailyFortuneInput = { birth, lang, ...(targetDate ? { targetDate } : {}) };

  // 4) 생성 (deterministic, GPT 없음)
  try {
    const dailyFortune = buildDailyFortune(input);
    return NextResponse.json({ ok: true, dailyFortune });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/saju-v4/daily-fortune] error:', err);
    return NextResponse.json({ ok: false, error: 'generation_failed', detail: message }, { status: 500 });
  }
}
