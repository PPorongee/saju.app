// 궁합 v4 메인 — GPT 호출 포함. 30~60초 소요 가능.

import 'server-only';
import { NextResponse } from 'next/server';
import { generateCompatibilityReport } from '@/domain/saju/compatibility/generateCompatibilityReport';
import { createOpenAiCompatGptCaller } from '@/lib/compat-v4-gpt-caller';
import { translateMarkdownToEnglish } from '@/domain/saju/i18n/translateReport';
import { createOpenAiGptCaller } from '@/lib/saju-v4-gpt-caller';
import type { BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';
import type { RelationshipType } from '@/domain/saju/compatibility/compatibilityTypes';

export const runtime = 'nodejs';
export const maxDuration = 180;

interface RequestBody {
  inputA: BirthInput;
  inputB: BirthInput;
  relationshipType: RelationshipType;
  lang?: 'ko' | 'en';
}

export async function POST(req: Request) {
  let body: RequestBody;
  try { body = (await req.json()) as RequestBody; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!body?.inputA?.birthDate || !body?.inputB?.birthDate || !body.relationshipType) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  try {
    const result = await generateCompatibilityReport(
      body.inputA, body.inputB, body.relationshipType,
      { callGpt: createOpenAiCompatGptCaller() },
    );
    let reportText = result.reportText;
    if (body.lang === 'en') {
      reportText = await translateMarkdownToEnglish(
        reportText,
        createOpenAiGptCaller({ maxOutputTokens: 12000, temperature: 0.3 }),
      );
    }
    return NextResponse.json({
      relationshipType: result.gptInput.relationshipType,
      personA: result.gptInput.personA,
      personB: result.gptInput.personB,
      compatibilityAnalysis: result.gptInput.compatibilityAnalysis,
      relationshipQuestions: result.gptInput.relationshipQuestions,
      reportText,
      validation: result.validation,
      attempts: result.attempts,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/compat-v4] error:', err);
    return NextResponse.json({ error: 'report_failed', detail: message }, { status: 500 });
  }
}
