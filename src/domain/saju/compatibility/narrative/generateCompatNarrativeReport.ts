// 궁합 narrative V4 — Generator (Phase 5)
//
// 역할 (올해운세 generateYearlyFortuneReport.ts mirror):
//   - (inputA, inputB, relationshipType) → 결정적 분석(composeCompatibilityAnalysis 재사용)
//     → ctx → 섹션별 plan → prompt → sectionwise LLM 호출(주입된 callGpt) → JSON 파싱
//     → sanitize → assemble(결정적 카드/근거 포함) → validate → bounded repair → 최종 리포트.
//   - compatibilityCard / evidenceView 는 LLM 호출 없이 bundle에서 deterministic 구성.
//
// 정책 (절대 규칙):
//   - 실제 LLM/network 호출은 이 파일 안에 없다. opts.callGpt(주입형)로만 호출.
//   - single-call 금지 → sectionwise Promise.all.
//   - live repair 기본 0 (maxRepairAttempts ?? 0).
//   - parse 실패 시 throw 금지 (빈 섹션 → validator가 section-missing). finish=length는 HIGH.
//   - 전체 재생성 금지 — repair는 target 섹션만 재호출.
//   - 기존 궁합 계산(composeCompatibilityAnalysis 등)은 import만, 수정 금지.

import type { BirthInput } from '../../calendar/normalizeBirthInput';
import { calculateAnalysisOnly } from '../../generatePersonalSajuReport';
import { isCompatYongsinDiagnosticEnabled } from '../../report/yongsinDiagnosticFlag';
import { renderYongsinDiagnosticGuidance } from '../../report/yongsinDiagnosticGuidance';
import { isCompatFortuneVerdictEnabled } from '../../fortuneVerdict/fortuneVerdictFlag';
import { buildCompatFortuneVerdictEvidence } from '../../fortuneVerdict/fortuneVerdictEvidence';
import { generateFortuneVerdict } from '../../fortuneVerdict/generateFortuneVerdict';
import { composeCompatibilityAnalysis } from '../compatibilityAnalyzer';
import type { CompatibilityAnalysisBundle, RelationshipType } from '../compatibilityTypes';

import {
  buildCompatNarrativeContext,
  COMPAT_NARRATIVE_LLM_SECTION_IDS,
  type CompatNarrativeContext,
  type CompatNarrativeSectionId,
  type CompatibilityNarrativeReport,
  type CompatNarrativeValidationResult,
  type CompatNarrativePlanSet,
  type CompatibilityCardSection,
  type RelationshipOverviewSection,
  type RelationshipMechanismSection,
  type AttractionAndFrictionSection,
  type RepeatedPatternSection,
  type RelationshipGuideSection,
  type FinalAdviceSection,
  type CompatEvidenceView,
} from './compatNarrativeTypes';
import { buildCompatNarrativePlans } from './compatPlanBuilder';
import {
  buildCompatPromptsAll,
  buildCompatRepairPrompt,
  type BuiltCompatPrompt,
  type CompatRepairIssueRef,
} from './compatPromptBuilder';
import { applyCompatFinalSanitizers, type CompatSanitizeContext } from './compatSanitizer';
import { validateCompatNarrativeReport } from './compatNarrativeValidator';
import {
  normalizeCompatibilityKeywords,
  normalizeCompatFutureFlow,
} from './compatCardFormatter';
import type { RelationshipYearFlow } from '../compatibilityTypes';

// ============================================================
// Public API
// ============================================================
export type CompatNarrativeGptCaller = (
  prompt: BuiltCompatPrompt,
  opts?: { maxTokens?: number },
) => Promise<{ text: string; finishReason?: string }>;

export interface GenerateCompatNarrativeOptions {
  callGpt: CompatNarrativeGptCaller;
  /** 섹션별 repair 최대 시도 횟수 (LIVE 기본 0 — single wave). */
  maxRepairAttempts?: number;
  /** 기준 시각 (normalize/대운 기준). 미지정 시 new Date(). */
  now?: Date;
}

export interface GenerateCompatNarrativeResult {
  bundle: CompatibilityAnalysisBundle;
  ctx: CompatNarrativeContext;
  plans: CompatNarrativePlanSet;
  report: CompatibilityNarrativeReport;
  validation: CompatNarrativeValidationResult;
  attempts: number;
  repairedSections: CompatNarrativeSectionId[];
  /** 3년 흐름 — 연속 중복 연도를 deterministic하게 변주한 정규화 결과 (route/UI용). */
  futureFlow: RelationshipYearFlow[];
}

// ============================================================
// JSON 파서 (robust) — 코드펜스 제거 + 첫 { ~ 마지막 } 추출.
// 실패 시 null 반환 (throw 금지 → validator가 section-missing 처리).
// ============================================================
function parseSectionJson(raw: string): any | null {
  if (!raw) return null;
  let s = raw.trim();
  // ```json ... ``` / ``` ... ``` 코드펜스 제거
  s = s.replace(/```(?:json)?/gi, '').trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  const candidate = s.slice(first, last + 1);
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

// ============================================================
// sanitize helper — LLM 텍스트 string 필드에만 적용.
// ============================================================
function san(text: any, ctx: CompatSanitizeContext): string {
  if (typeof text !== 'string') return '';
  return applyCompatFinalSanitizers(text, ctx);
}

// ============================================================
// compatibilityCard — 결정적 (bundle.relationshipArchetype에서).
//   title/keywords는 archetype, snsPhrase는 shortLabel/summary 폴백 체인.
// ============================================================
function buildCompatibilityCard(
  bundle: CompatibilityAnalysisBundle,
  ctx: CompatNarrativeContext,
): CompatibilityCardSection {
  const arch = bundle.relationshipArchetype;
  const snsPhrase = firstNonEmpty([arch?.shortLabel, arch?.summary, arch?.title], '');
  return {
    title: arch?.title ?? '',
    snsPhrase,
    // 사실 문장이 칩으로 새지 않도록 정규화 (길이/문장끝/raw-fact 필터 + compact + 3~5개).
    keywords: normalizeCompatibilityKeywords(arch?.keywords ?? [], ctx?.focus),
  };
}

function firstNonEmpty(items: (string | undefined | null)[], fallback: string): string {
  for (const it of items) {
    if (it && it.trim().length > 0) return it;
  }
  return fallback;
}

// ============================================================
// evidenceView — 결정적 (LLM 호출 X). bundle에서 직접 구성.
//   CompatEvidenceView 형태 (compatNarrativeTypes) 그대로.
// ============================================================
function buildEvidenceView(
  bundle: CompatibilityAnalysisBundle,
  ctx: CompatNarrativeContext,
): CompatEvidenceView {
  const dmr = bundle.dayMasterRelation;
  const spr = bundle.spousePalaceRelation;
  const ec = bundle.elementComplement;
  const tg = bundle.tenGodInteraction;
  const ug = bundle.usefulGodInteraction;
  const cc = bundle.combinationConflicts;
  return {
    relationshipType: ctx.relationshipType,
    relationshipTypeKo: ctx.relationshipTypeKo,
    archetypeTitle: bundle.relationshipArchetype?.title ?? '',
    dayMasterRelation: {
      relation: dmr.relation,
      balance: dmr.balance,
      plain: dmr.description ?? '',
    },
    spousePalaceRelation: {
      kinds: spr.relationTypes ?? [],
      intensity: spr.intensity,
      plain: firstNonEmpty([spr.attractionEffect, spr.conflictEffect], ''),
    },
    elementComplement: {
      aNeedsFromB: ec.aNeedsFromB ?? [],
      bNeedsFromA: ec.bNeedsFromA ?? [],
      mutual: ec.mutualComplement,
    },
    tenGodInteraction: {
      aFeelsBAs: (tg.aFeelsBAs ?? []).map(String),
      bFeelsAAs: (tg.bFeelsAAs ?? []).map(String),
    },
    usefulGodInteraction: {
      plain: ug.interpretation ?? '',
    },
    combinationConflicts: {
      combinations: cc.combinations ?? [],
      conflicts: cc.conflicts ?? [],
      punishments: cc.punishments ?? [],
      destructions: cc.destructions ?? [],
      harms: cc.harms ?? [],
    },
  };
}

// ============================================================
// 빈 report scaffold — 결정적 2개(카드/근거)는 채우고, LLM 6개는 빈 필드 유지.
//   parse 실패 시 validator가 section-missing 잡도록.
// ============================================================
function emptyReportScaffold(
  bundle: CompatibilityAnalysisBundle,
  ctx: CompatNarrativeContext,
): CompatibilityNarrativeReport {
  return {
    compatibilityCard: buildCompatibilityCard(bundle, ctx),
    relationshipOverview: { oneLine: '', body: '' },
    relationshipMechanism: { body: '', evidenceBlocks: [] },
    attractionAndFriction: { body: '' },
    repeatedPattern: { body: '' },
    relationshipGuide: { body: '' },
    finalAdvice: { body: '' },
    evidenceView: buildEvidenceView(bundle, ctx),
  };
}

// ============================================================
// 섹션 parsed JSON → report 필드 sanitize+매핑.
//   parsed가 null이면 해당 필드 미변경(빈 상태 유지 → section-missing).
// ============================================================
function applySectionToReport(
  report: CompatibilityNarrativeReport,
  sectionId: CompatNarrativeSectionId,
  parsed: any,
  sc: CompatSanitizeContext,
): void {
  if (!parsed) return;

  switch (sectionId) {
    case 'relationshipOverview': {
      const ov = parsed.relationshipOverview ?? {};
      const section: RelationshipOverviewSection = {
        oneLine: san(ov.oneLine, sc),
        body: san(ov.body, sc),
      };
      report.relationshipOverview = section;
      break;
    }
    case 'relationshipMechanism': {
      const rm = parsed.relationshipMechanism ?? {};
      const section: RelationshipMechanismSection = {
        body: san(rm.body, sc),
        // evidenceBlocks: string 필드만 sanitize, 구조 보존
        evidenceBlocks: Array.isArray(rm.evidenceBlocks)
          ? rm.evidenceBlocks.map((b: any) => ({
              sectionId: 'relationshipMechanism' as const,
              evidence: Array.isArray(b?.evidence)
                ? b.evidence.map((e: any) => ({
                    label: san(e?.label, sc),
                    plainMeaning: san(e?.plainMeaning, sc),
                    role: e?.role ?? 'main',
                  }))
                : [],
              causalExplanation: san(b?.causalExplanation, sc),
              betweenScene: san(b?.betweenScene, sc),
              positiveUse: san(b?.positiveUse, sc),
              shadowPattern: san(b?.shadowPattern, sc),
              practicalAdvice: san(b?.practicalAdvice, sc),
            }))
          : [],
      };
      report.relationshipMechanism = section;
      break;
    }
    case 'attractionAndFriction': {
      const af = parsed.attractionAndFriction ?? {};
      const section: AttractionAndFrictionSection = { body: san(af.body, sc) };
      report.attractionAndFriction = section;
      break;
    }
    case 'repeatedPattern': {
      const rp = parsed.repeatedPattern ?? {};
      const section: RepeatedPatternSection = { body: san(rp.body, sc) };
      report.repeatedPattern = section;
      break;
    }
    case 'relationshipGuide': {
      const rg = parsed.relationshipGuide ?? {};
      const section: RelationshipGuideSection = { body: san(rg.body, sc) };
      report.relationshipGuide = section;
      break;
    }
    case 'finalAdvice': {
      const fa = parsed.finalAdvice ?? {};
      const section: FinalAdviceSection = { body: san(fa.body, sc) };
      report.finalAdvice = section;
      break;
    }
    case 'compatibilityCard':
    case 'evidenceView':
      // 결정적 — LLM 산출 매핑 대상 아님
      break;
  }
}

// ============================================================
// generateCompatNarrativeReport — 메인 흐름
// ============================================================
export async function generateCompatNarrativeReport(
  inputA: BirthInput,
  inputB: BirthInput,
  relationshipType: RelationshipType,
  opts: GenerateCompatNarrativeOptions,
): Promise<GenerateCompatNarrativeResult> {
  const now = opts.now ?? new Date();
  const maxAttempts = opts.maxRepairAttempts ?? 0; // LIVE 기본 0

  // 1) 결정적 분석 (기존 궁합 계산 재사용) + context + plan + prompt
  // P6: compat diagnostic (별도 flag, 기본 OFF). flag ON일 때만 A/B 진단 force-attach.
  const compatDiagOn = isCompatYongsinDiagnosticEnabled();
  const personA = calculateAnalysisOnly(inputA, now, compatDiagOn ? { forceAttachDiagnostic: true } : undefined);
  const personB = calculateAnalysisOnly(inputB, now, compatDiagOn ? { forceAttachDiagnostic: true } : undefined);
  const bundle = composeCompatibilityAnalysis(personA, personB, relationshipType);
  const ctx = buildCompatNarrativeContext(relationshipType);
  const plans = buildCompatNarrativePlans(bundle, ctx);
  const prompts = buildCompatPromptsAll(plans, ctx);

  // compat diagnostic 지침: A/B 분리 + 각 섹션 prompt.system에 curated append (gpt-input/빌더 무수정, raw 미노출).
  // flag OFF면 compatGuidance=null → prompts 무변경 → byte-identical.
  let compatGuidance: string | null = null;
  if (compatDiagOn) {
    const blocks: string[] = [];
    if (personA.yongsinDiagnostic) blocks.push(renderYongsinDiagnosticGuidance(personA.yongsinDiagnostic, { mode: 'compat', personLabel: 'A(첫 번째 사람)' }));
    if (personB.yongsinDiagnostic) blocks.push(renderYongsinDiagnosticGuidance(personB.yongsinDiagnostic, { mode: 'compat', personLabel: 'B(두 번째 사람)' }));
    if (blocks.length > 0) {
      compatGuidance = blocks.join('\n\n');
      for (const built of prompts.values()) built.system = `${built.system}\n\n${compatGuidance}`;
    }
  }

  // sanitize context — relationshipStatus는 married만 배우자 허용.
  const sanitizeCtx: CompatSanitizeContext = {
    relationshipType,
    relationshipStatus: relationshipType === 'married' ? 'married' : 'unknown',
    hasChildren: 'unknown',
  };

  // 2) sectionwise LLM 호출 + parse + sanitize → report 조립
  const report = emptyReportScaffold(bundle, ctx);
  const parsedBySection = new Map<CompatNarrativeSectionId, any>();
  const jsonParseFailedSet = new Set<CompatNarrativeSectionId>();
  const finishLengthSet = new Set<CompatNarrativeSectionId>();

  await Promise.all(
    COMPAT_NARRATIVE_LLM_SECTION_IDS.map(async sectionId => {
      const built = prompts.get(sectionId);
      if (!built) return;
      let parsed: any = null;
      try {
        const { text, finishReason } = await opts.callGpt(built, { maxTokens: built.maxTokens });
        if (finishReason === 'length') finishLengthSet.add(sectionId);
        parsed = parseSectionJson(text);
      } catch {
        // 호출/파싱 실패 → 빈 섹션 (validator가 section-missing/parse-failed 처리)
        parsed = null;
      }
      if (parsed === null) jsonParseFailedSet.add(sectionId);
      parsedBySection.set(sectionId, parsed);
    }),
  );

  for (const sectionId of COMPAT_NARRATIVE_LLM_SECTION_IDS) {
    applySectionToReport(report, sectionId, parsedBySection.get(sectionId), sanitizeCtx);
  }

  // 3) validate (generatorFlags로 parse 실패/length 잘림 전달)
  let validation = validateCompatNarrativeReport({
    report,
    bundle,
    plans,
    ctx,
    generatorFlags: {
      jsonParseFailedSections: [...jsonParseFailedSet],
      finishLengthSections: [...finishLengthSet],
    },
  });

  // 4) repair loop (bounded, target 섹션만 재호출 + 수렴 조기 종료)
  const repairedSections = new Set<CompatNarrativeSectionId>();
  let attempts = 1;
  let prevRepairSignature = '';

  for (let i = 0; i < maxAttempts && validation.shouldRepair; i++) {
    // 이 라운드에서 다시 호출할 LLM 섹션만 추림 (결정적 섹션 제외)
    const targets = validation.repairTargets.filter(t => COMPAT_NARRATIVE_LLM_SECTION_IDS.includes(t));
    if (targets.length === 0) break;

    // 조기 종료: repairTargets의 issue 시그니처가 직전 라운드와 동일하면 수렴 불가 → 중단.
    const currentSignature = validation.issues
      .filter(iss => targets.includes(iss.sectionId as CompatNarrativeSectionId))
      .map(iss => `${iss.type}|${iss.sectionId}|${iss.sentence}`)
      .sort()
      .join('\n');
    if (i > 0 && currentSignature === prevRepairSignature) break;
    prevRepairSignature = currentSignature;

    attempts++;

    // repair 라운드는 매번 parse 실패/length 집합 재계산 (target만)
    await Promise.all(
      targets.map(async sectionId => {
        const plan = plans.find(p => p.sectionId === sectionId);
        if (!plan) return;
        // 이 섹션과 관련된 issue + global high issue를 함께 전달 (global은 mechanism로 redirect됨)
        const thisSectionIssues: CompatRepairIssueRef[] = validation.issues
          .filter(iss => iss.sectionId === sectionId || iss.sectionId === 'global')
          .map(iss => ({
            type: iss.type,
            sectionId: String(iss.sectionId),
            sentence: iss.sentence,
            reason: iss.reason,
            severity: iss.severity,
            suggestion: iss.suggestion,
          }));
        const previousOutput = JSON.stringify(parsedBySection.get(sectionId) ?? {});
        const repairPrompt = buildCompatRepairPrompt(plan, ctx, {
          previousOutput,
          issues: thisSectionIssues,
        });
        if (!repairPrompt) return;
        if (compatGuidance) repairPrompt.system = `${repairPrompt.system}\n\n${compatGuidance}`;
        let parsed: any = null;
        let lengthTrunc = false;
        try {
          const { text, finishReason } = await opts.callGpt(repairPrompt, { maxTokens: repairPrompt.maxTokens });
          if (finishReason === 'length') lengthTrunc = true;
          parsed = parseSectionJson(text);
        } catch {
          parsed = null;
        }
        // 재호출 결과로 flag 갱신 (target 섹션만)
        if (lengthTrunc) finishLengthSet.add(sectionId);
        else finishLengthSet.delete(sectionId);
        // parse 실패 시 기존 섹션 유지 (재작성 못 함)
        if (parsed) {
          jsonParseFailedSet.delete(sectionId);
          parsedBySection.set(sectionId, parsed);
          repairedSections.add(sectionId);
        }
      }),
    );

    // 재조립 (target 섹션은 갱신, 나머지는 직전 parsed 그대로 재적용)
    for (const sectionId of COMPAT_NARRATIVE_LLM_SECTION_IDS) {
      applySectionToReport(report, sectionId, parsedBySection.get(sectionId), sanitizeCtx);
    }
    // 결정적 섹션 재확정 (불변이지만 명시적으로 유지)
    report.compatibilityCard = buildCompatibilityCard(bundle, ctx);
    report.evidenceView = buildEvidenceView(bundle, ctx);

    validation = validateCompatNarrativeReport({
      report,
      bundle,
      plans,
      ctx,
      generatorFlags: {
        jsonParseFailedSections: [...jsonParseFailedSet],
        finishLengthSections: [...finishLengthSet],
      },
    });
  }

  // ── Fortune Questions Verdict V1 (flag ON일 때만 1회 추가 호출, A/B 구분 + 상대 낙인 금지) ──
  if (isCompatFortuneVerdictEnabled()) {
    const ev = buildCompatFortuneVerdictEvidence(bundle, personA, personB, relationshipType);
    const verdict = await generateFortuneVerdict(
      ev,
      (sys, usr, mt) => opts.callGpt({ sectionId: 'finalAdvice', system: sys, user: usr, maxTokens: mt, outputJsonSchema: '' }, { maxTokens: mt }).then(r => r.text),
      { sanitize: (t: string) => applyCompatFinalSanitizers(t, sanitizeCtx) },
    );
    if (verdict) report.fortuneVerdict = verdict;
  }

  return {
    bundle,
    ctx,
    plans,
    report,
    validation,
    attempts,
    repairedSections: [...repairedSections],
    // 3년 흐름 정규화 (연속 중복 연도 변주). 원본 bundle.futureFlow는 불변.
    futureFlow: normalizeCompatFutureFlow(bundle.futureFlow ?? [], ctx),
  };
}
