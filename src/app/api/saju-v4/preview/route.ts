// v4 preview API — 결정론 분석만 (GPT 호출 X). 즉시 응답.
// 사주원국·오행분포·용신·격국·신강신약·신살·합충 + 차별화 4섹션 데이터 반환.

import 'server-only';
import { NextResponse } from 'next/server';
import { calculateAnalysisOnly } from '@/domain/saju/generatePersonalSajuReport';
import type { BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';

export const runtime = 'nodejs';

interface RequestBody { input: BirthInput }

export async function POST(req: Request) {
  let body: RequestBody;
  try { body = (await req.json()) as RequestBody; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }
  if (!body?.input?.birthDate || !body.input.timezone) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }
  try {
    const result = calculateAnalysisOnly(body.input);
    return NextResponse.json({
      ruleVersion: result.ruleConfig.version,
      birthChart: result.birthChart,
      coreAnalysis: result.coreAnalysis,
      specialPoints: result.specialPoints,
      identityKeywords: result.identityKeywords,
      lifeWeapons: result.lifeWeapons,
      lifeTraps: result.lifeTraps,
      fortuneTriggers: result.fortuneTriggers,
      fortune: result.fortune,
      careerSpecificAnalysis: result.careerSpecificAnalysis,
      timingAnchors: result.timingAnchors,
      futureTimingAnalysis: result.futureTimingAnalysis,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/saju-v4/preview] error:', err);
    return NextResponse.json({ error: 'analysis_failed', detail: message }, { status: 500 });
  }
}
