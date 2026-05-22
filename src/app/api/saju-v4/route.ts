// v4 API route — 결정론적 계산 + GPT 해석.
// v3 /api/saju 는 그대로 유지. v4는 새 endpoint.

import 'server-only';
import { NextResponse } from 'next/server';
import { generatePersonalSajuReport } from '@/domain/saju/generatePersonalSajuReport';
import type { BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';
import { createOpenAiGptCaller } from '@/lib/saju-v4-gpt-caller';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RequestBody {
  input: BirthInput;
  /** repair 재시도 최대 회수 (default 1) */
  maxRepairAttempts?: number;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try {
    body = (await req.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  if (!body?.input || !body.input.birthDate || !body.input.timezone) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  try {
    const result = await generatePersonalSajuReport(body.input, {
      callGpt: createOpenAiGptCaller(),
      maxRepairAttempts: body.maxRepairAttempts ?? 1,
    });

    return NextResponse.json({
      ruleVersion: result.gptInput.ruleConfig.version,
      birthChart: result.gptInput.birthChart,
      coreAnalysis: result.gptInput.coreAnalysis,
      specialPoints: result.gptInput.specialPoints,
      fortune: result.gptInput.fortune,
      reportText: result.reportText,
      validation: result.validation,
      attempts: result.attempts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/saju-v4] error:', err);
    return NextResponse.json({ error: 'generation_failed', detail: message }, { status: 500 });
  }
}
