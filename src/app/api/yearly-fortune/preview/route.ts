// /api/yearly-fortune/preview — 올해운세 결정론 분석만 (GPT 호출 X). 즉시 응답.
// 결제 전 미리보기(teaser)용. buildYearlyAnalysis의 직렬화 가능한 핵심 필드만 노출.

import 'server-only';
import { NextResponse } from 'next/server';
import { buildYearlyAnalysis } from '@/domain/saju/yearly/generateYearlyFortuneReport';
import type { YearlyFortuneInput } from '@/domain/saju/yearly/yearlyTypes';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  let body: Record<string, any>;
  try { body = (await req.json()) as Record<string, any>; }
  catch { return NextResponse.json({ error: 'invalid_json' }, { status: 400 }); }

  const inputRaw = (body?.input ?? {}) as Record<string, any>;
  const currentDate: string = body?.currentDate || inputRaw?.currentDate;
  if (!inputRaw?.birth?.birthDate || !inputRaw?.birth?.timezone || !currentDate) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  try {
    const input: YearlyFortuneInput = { birth: inputRaw.birth, currentDate };
    const a = buildYearlyAnalysis(input);
    return NextResponse.json({
      targetYear: a.targetYear,
      targetYearGanji: a.targetYearGanji,
      yearTenGod: { stemTenGod: a.yearTenGod?.stemTenGod, plainMeaning: a.yearTenGod?.plainMeaning },
      yearElementEffect: {
        element: a.yearElementEffect?.element,
        relationToUsefulGod: a.yearElementEffect?.relationToUsefulGod,
        label: a.yearElementEffect?.label,
        plainMeaning: a.yearElementEffect?.plainMeaning,
        lifeSceneHint: a.yearElementEffect?.lifeSceneHint,
      },
      strengthImpact: {
        natalStrength: a.strengthImpact?.natalStrength,
        yearlyEffect: a.strengthImpact?.yearlyEffect,
        plainMeaning: a.strengthImpact?.plainMeaning,
      },
      currentDaewoonPillar: a.currentDaewoon?.pillar?.pillarKo ?? '',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/yearly-fortune/preview] error:', err);
    return NextResponse.json({ error: 'analysis_failed', detail: message }, { status: 500 });
  }
}
