// 궁합 v4 preview — 결정론 분석만 (GPT 호출 X). 즉시 응답.

import 'server-only';
import { NextResponse } from 'next/server';
import { calculateCompatibilityAnalysisOnly } from '@/domain/saju/compatibility/generateCompatibilityReport';
import type { BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';
import type { RelationshipType } from '@/domain/saju/compatibility/compatibilityTypes';

export const runtime = 'nodejs';

interface RequestBody {
  inputA: BirthInput;
  inputB: BirthInput;
  relationshipType: RelationshipType;
}

export async function POST(req: Request) {
  let body: RequestBody;
  try { body = (await req.json()) as RequestBody; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!body?.inputA?.birthDate || !body?.inputB?.birthDate || !body.relationshipType) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  try {
    const result = calculateCompatibilityAnalysisOnly(body.inputA, body.inputB, body.relationshipType);
    return NextResponse.json({
      relationshipType: result.relationshipType,
      personA: result.personA,
      personB: result.personB,
      compatibilityAnalysis: result.compatibilityAnalysis,
      relationshipQuestions: result.relationshipQuestions,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/compat-v4/preview] error:', err);
    return NextResponse.json({ error: 'analysis_failed', detail: message }, { status: 500 });
  }
}
