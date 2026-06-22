// v4 API route — 결정론적 계산 + GPT 서사형(narrative) 해석.
// 기존 카드형 generatePersonalSajuReport는 코드에 남아 있으나 호출하지 않음.
// 출력은 책처럼 읽히는 7섹션 줄글 (사주원국 카드 + 명리 근거 보기는 UI에서 별도 렌더).

import 'server-only';
import { NextResponse } from 'next/server';
import { generateNarrativePersonalSajuReport } from '@/domain/saju/generatePersonalSajuReport';
import type { BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';
import { createOpenAiNarrativeGptCaller, createOpenAiGptCaller } from '@/lib/saju-v4-gpt-caller';
import type { NarrativeDepthOptions, NarrativeValidationResult } from '@/domain/saju/narrative/narrativeTypes';
import { buildPaidReportV1 } from '@/domain/saju/paidReport/buildPaidReportV1';
import { renderPaidProse } from '@/domain/saju/paidReport/renderPaidProse';
import { isPaidReportV1Enabled } from '@/domain/saju/paidReport/paidReportFlag';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

interface RequestBody {
  input: BirthInput;
  /** repair 재시도 최대 회수 (default 1) */
  maxRepairAttempts?: number;
  /**
   * 2026-05 Narrative Depth v1 — 요청 단위 토글 (verify script가 사용).
   * 미지정 시 서버 default (env SAJU_NARRATIVE_DEPTH=on이면 모두 true, 그 외엔 모두 false).
   */
  depthOptions?: Partial<NarrativeDepthOptions>;
}

/** 서버 default depth options — env SAJU_NARRATIVE_DEPTH=on이면 모두 true. */
function getServerDefaultDepth(): NarrativeDepthOptions {
  const on = process.env.SAJU_NARRATIVE_DEPTH === 'on';
  return {
    useEvidenceNarrativeBlocks: on,
    useSajuOpeningLuckCondition: on,
    useFinalGaewoonDirection: on,
  };
}

/**
 * 응답에 실을 validation — production에서는 내부 diagnostics
 * (exposureSafe/highCount/mediumCount/lowCount/qualityWarnings)를 제거하고
 * UI/안전 판정이 쓰는 isValid + issues만 노출한다.
 * dev/test 또는 SAJU_EXPOSE_VALIDATION_DIAGNOSTICS=true 면 전체 유지(디버그용).
 */
function toPublicValidation(v: NarrativeValidationResult): NarrativeValidationResult | Pick<NarrativeValidationResult, 'isValid' | 'issues'> {
  const exposeDiagnostics =
    process.env.NODE_ENV !== 'production' ||
    process.env.SAJU_EXPOSE_VALIDATION_DIAGNOSTICS === 'true';
  if (exposeDiagnostics) return v;
  return { isValid: v.isValid, issues: v.issues };
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

  // depthOptions: body 명시 > 서버 default(env) > 코드 default(false)
  const serverDefault = getServerDefaultDepth();
  const depthOptions = { ...serverDefault, ...(body.depthOptions ?? {}) };

  try {
    const result = await generateNarrativePersonalSajuReport(body.input, {
      callGpt: createOpenAiNarrativeGptCaller(),
      // 2026-05 sectionwise: 섹션별 병렬 호출(~12s) + repair는 실패 섹션만 단일 호출.
      // 90s 안에 1회 repair 안전. 기본 1 복원.
      maxRepairAttempts: body.maxRepairAttempts ?? 1,
      depthOptions,
    });

    // Paid Report Productization V1 — flag OFF(=production 기본)면 undefined → 키 누락(byte-identical).
    // 결정론 빌드(GPT 호출 없음) 후, 줄글 "실전 가이드"(prose)를 GPT로 매끄럽게 다듬는다
    // (renderPaidProse는 실패/위반 시 결정론 원문을 그대로 반환 — never throws).
    let paidReport = isPaidReportV1Enabled()
      ? buildPaidReportV1(result.gptInput, {
          starKeywordCard: result.starKeywordCard,
          detailedNarrativeText: result.reportText,
        })
      : undefined;
    if (paidReport && process.env.SAJU_PAID_REPORT_MICROCOPY !== 'false') {
      paidReport = await renderPaidProse(paidReport, createOpenAiGptCaller());
    }

    return NextResponse.json({
      ruleVersion: result.gptInput.ruleConfig.version,
      birthChart: result.gptInput.birthChart,
      coreAnalysis: result.gptInput.coreAnalysis,
      specialPoints: result.gptInput.specialPoints,
      identityKeywords: result.gptInput.identityKeywords,
      lifeWeapons: result.gptInput.lifeWeapons,
      lifeTraps: result.gptInput.lifeTraps,
      fortuneTriggers: result.gptInput.fortuneTriggers,
      careerSpecificAnalysis: result.gptInput.careerSpecificAnalysis,
      timingAnchors: result.gptInput.timingAnchors,
      futureTimingAnalysis: result.gptInput.futureTimingAnalysis,
      fortune: result.gptInput.fortune,
      reportText: result.reportText, // 7섹션 markdown
      validation: toPublicValidation(result.validation),
      attempts: result.attempts,
      // 별빛 키워드 카드 (개인사주 최상단 + SNS 공유용)
      starKeywordCard: result.starKeywordCard,
      // Fortune Questions Verdict V1 — flag OFF면 undefined → JSON 직렬화에서 키 누락(byte-identical).
      fortuneVerdict: result.fortuneVerdict,
      // Paid Report Productization V1 — flag OFF(=production)면 undefined → 키 누락(byte-identical).
      paidReport,
      narrative: true,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/saju-v4] error:', err);
    return NextResponse.json({ error: 'generation_failed', detail: message }, { status: 500 });
  }
}
