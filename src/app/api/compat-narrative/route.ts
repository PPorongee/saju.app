// /api/compat-narrative — 궁합 줄글(narrative) V4 엔드포인트 (Phase 6)
//
// 미러 패턴: src/app/api/yearly-fortune/route.ts
// runtime nodejs, maxDuration 90, JSON body, error envelope.
//
// 상태코드 표
//   200  정상 생성
//   400  invalid_json  — body 파싱 실패
//   400  invalid_input — body 유효성 실패
//   403  forbidden     — verifySecret 불일치
//   413  payload_too_large — Content-Length > 32 KiB
//   500  generation_failed — generateCompatNarrativeReport 예외
//   503  compat_narrative_api_disabled — COMPAT_NARRATIVE_API_ENABLED !== 'true'

import 'server-only';
import { NextResponse } from 'next/server';
import type { BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';
import type { RelationshipType } from '@/domain/saju/compatibility/compatibilityTypes';
import { generateCompatNarrativeReport } from '@/domain/saju/compatibility/narrative/generateCompatNarrativeReport';
import { createOpenAiCompatNarrativeGptCaller } from '@/lib/compat-narrative-gpt-caller';
import { buildSharedActivities, buildRelationGauges, buildPersonTrait } from '@/domain/saju/compatibility/compatExtras';
import { calculateAnalysisOnly } from '@/domain/saju/generatePersonalSajuReport';
import {
  normalizeCompatNarrativeServerFlags,
  validateCompatNarrativeRequestBody,
  resolveLiveCompatRepairAttempts,
} from '@/domain/saju/compatibility/narrative/compatNarrativeServerFlags';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 90;

export async function POST(req: Request) {
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

  // 2) API 활성 여부 확인 (flag 기본 OFF → 503)
  const flags = normalizeCompatNarrativeServerFlags(process.env);
  if (!flags.apiEnabled) {
    return NextResponse.json({ error: 'compat_narrative_api_disabled' }, { status: 503 });
  }

  // 3) 비밀 헤더 검증 (verifySecret이 설정된 경우)
  //    UI에서 비활성 시 외부 호출 차단용.
  //    COMPAT_NARRATIVE_VERIFY_SECRET을 설정하지 않으면 이 검사를 건너뜀.
  if (flags.verifySecret !== undefined) {
    const provided = req.headers.get('x-compat-verify-secret');
    if (provided !== flags.verifySecret) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    }
  }

  // 4) body 유효성 검증
  const bodyValidation = validateCompatNarrativeRequestBody(body);
  if (!bodyValidation.ok) {
    return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  }

  // 5) 입력 구성
  const b = body as Record<string, any>;
  const inputA = b.inputA as BirthInput;
  const inputB = b.inputB as BirthInput;
  const relationshipType = b.relationshipType as RelationshipType;

  // 6) 생성
  try {
    const result = await generateCompatNarrativeReport(inputA, inputB, relationshipType, {
      callGpt: createOpenAiCompatNarrativeGptCaller(),
      // live 기본 0 (repair 없음 → 90s 예산 보호). body에서 명시적으로 1을 주면 repair 수행.
      maxRepairAttempts: resolveLiveCompatRepairAttempts(b.maxRepairAttempts),
    });

    // 7) 부가 콘텐츠 — bundle에서 평문 필드만 추려 노출(내부 evidence 토큰 제외).
    const bd = result.bundle;
    // 두 사람 일간(기질 카드용) — 결정론. dayMaster만 필요하므로 가볍게 추출.
    const aDayMaster = calculateAnalysisOnly(inputA).birthChart.dayMaster;
    const bDayMaster = calculateAnalysisOnly(inputB).birthChart.dayMaster;
    const extras = {
      persons: [
        buildPersonTrait(inputA.name?.trim() || '첫 사람', aDayMaster),
        buildPersonTrait(inputB.name?.trim() || '두 사람', bDayMaster),
      ],
      scores: buildRelationGauges(bd),
      sharedActivities: buildSharedActivities(bd),
      conflict: {
        mainConflictTriggers: bd.conflictAnalysis?.mainConflictTriggers ?? [],
        repeatedPattern: bd.conflictAnalysis?.repeatedPattern ?? '',
        emotionalMismatch: bd.conflictAnalysis?.emotionalMismatch ?? '',
        recoveryStyleMismatch: bd.conflictAnalysis?.recoveryStyleMismatch ?? '',
      },
      recovery: {
        likelyRecoveryPattern: bd.recoveryAnalysis?.likelyRecoveryPattern ?? '',
        whatAUsuallyNeeds: bd.recoveryAnalysis?.whatAUsuallyNeeds ?? '',
        whatBUsuallyNeeds: bd.recoveryAnalysis?.whatBUsuallyNeeds ?? '',
        bestRecoveryRule: bd.recoveryAnalysis?.bestRecoveryRule ?? '',
      },
      stability: {
        dailyCompatibility: bd.stabilityAnalysis?.dailyCompatibility ?? '',
        longTermRisk: bd.stabilityAnalysis?.longTermRisk ?? '',
        relationshipTypeSpecificStability: bd.stabilityAnalysis?.relationshipTypeSpecificStability ?? '',
      },
      elementComplement: {
        aNeedsFromB: bd.elementComplement?.aNeedsFromB ?? [],
        bNeedsFromA: bd.elementComplement?.bNeedsFromA ?? [],
        mutualComplement: bd.elementComplement?.mutualComplement ?? 'moderate',
        oneSidednessRisk: bd.elementComplement?.oneSidednessRisk ?? [],
      },
    };

    // 8) 응답 — 직렬화 가능한 부분만 포함
    return NextResponse.json({
      report: result.report,
      // 3년 흐름(deterministic) — UI 카드용. 연속 중복 연도 변주 정규화 적용.
      futureFlow: result.futureFlow,
      extras,
      // validation: issues[] 는 사용자 문장 + 내부 타입 토큰 포함 → 클라이언트에 노출 금지.
      // isValid/highCount/mediumCount 만 전달.
      validation: {
        isValid: result.validation.isValid,
        highCount: result.validation.highCount,
        mediumCount: result.validation.mediumCount,
      },
      attempts: result.attempts,
      repairedSections: result.repairedSections,
    });
  } catch (err: unknown) {
    // 스택/시크릿 노출 금지 — message만 반환
    const message = err instanceof Error ? err.message : 'unknown_error';
    console.error('[/api/compat-narrative] error:', err);
    return NextResponse.json(
      { error: 'generation_failed', detail: message },
      { status: 500 },
    );
  }
}
