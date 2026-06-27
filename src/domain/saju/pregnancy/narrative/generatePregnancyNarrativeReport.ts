// 임산부 모드 V4 — Generator (Phase 6)
//
// 역할 (compat generateCompatNarrativeReport mirror):
//   - (momInput, babyDueInput) → 결정적 분석(calculateAnalysisOnly ×2 + composePregnancyAnalysis)
//     → ctx → 태교/태명 → 섹션별 plan → prompt → sectionwise LLM(주입 callGpt) → JSON 파싱
//     → sanitize → assemble(결정적 카드/태명/근거) → validate → bounded repair → 최종 리포트.
//   - motherBabyCard / babyNames / evidenceView 는 LLM 호출 없이 deterministic.
//
// 정책 (절대 규칙):
//   - 실제 LLM/network 호출은 이 파일 안에 없다. opts.callGpt(주입형)로만.
//   - single-call 금지 → sectionwise Promise.all.
//   - live repair 기본 0 (maxRepairAttempts ?? 0).
//   - parse 실패 시 throw 금지 (빈 섹션 → validator가 section-missing). finish=length는 HIGH.
//   - 전체 재생성 금지 — repair는 target 섹션만 재호출.
//   - 기존 개인사주/궁합 계산은 import만, 수정 금지.
//   - 고정 안내문(disclaimer)은 항상 deterministic하게 설정.

import type { BirthInput } from '../../calendar/normalizeBirthInput';
import { calculateAnalysisOnly } from '../../generatePersonalSajuReport';
import { isPregnancyYongsinDiagnosticEnabled } from '../../report/yongsinDiagnosticFlag';
import { renderYongsinDiagnosticGuidance } from '../../report/yongsinDiagnosticGuidance';
import { isPregnancyFortuneVerdictEnabled } from '../../fortuneVerdict/fortuneVerdictFlag';
import { buildPregnancyFortuneVerdictEvidence } from '../../fortuneVerdict/fortuneVerdictEvidence';
import { generateFortuneVerdict } from '../../fortuneVerdict/generateFortuneVerdict';
import { PREGNANCY_DISCLAIMER } from './pregnancyNarrativeTypes';
import { composePregnancyAnalysis, type PregnancyAnalysisBundle } from './pregnancyMomBabyAnalyzer';
import { buildTaegyoPlan, type TaegyoPlan } from './pregnancyTaegyoMapper';
import { selectBabyNames } from './pregnancyBabyNamePool';
import {
  buildPregnancyNarrativeContext, formatDueDateLabel,
  PREGNANCY_NARRATIVE_LLM_SECTION_IDS, ELEMENT_KO,
  type PregnancyNarrativeContext, type PregnancyNarrativeSectionId,
  type PregnancyNarrativeReport, type PregnancyNarrativePlanSet,
  type PregnancyNarrativeValidationResult, type Element,
  type OpeningConnectionSection, type MotherChildMechanismSection,
  type MotherComfortRhythmSection, type BabyEnergyAndFitSection,
  type TaegyoGuideSection, type MotherFortuneRoutineSection,
  type FamilySupportAndFinalMessageSection,
} from './pregnancyNarrativeTypes';
import { buildPregnancyNarrativePlans } from './pregnancyPlanBuilder';
import {
  buildPregnancyPromptsAll, buildPregnancyRepairPrompt,
  type BuiltPregnancyPrompt, type PregnancyRepairIssueRef,
} from './pregnancyPromptBuilder';
import { applyPregnancyFinalSanitizers, ensurePregnancyDisclaimer } from './pregnancySanitizer';
import { validatePregnancyNarrativeReport } from './pregnancyNarrativeValidator';
import { buildMotherBabyCard, buildPregnancyEvidenceView } from './pregnancyCardFormatter';

export type PregnancyNarrativeGptCaller = (
  prompt: BuiltPregnancyPrompt,
  opts?: { maxTokens?: number },
) => Promise<{ text: string; finishReason?: string }>;

export interface GeneratePregnancyNarrativeOptions {
  callGpt: PregnancyNarrativeGptCaller;
  /** 섹션별 repair 최대 시도 횟수 (LIVE 기본 0). */
  maxRepairAttempts?: number;
  /**
   * 라이브 안전망: maxRepairAttempts가 0이어도 첫 검증에 HIGH가 있으면 1회만 재생성해 걸러낸다.
   * HIGH 없으면 0 유지 → 지연 영향 없음.
   * 임산부는 HIGH 1+면 라우트가 422로 본문을 통째로 막으므로(유료 사용자가 콘텐츠를 못 받음),
   * 차단 전에 한 번 재생성해 콘텐츠를 받을 확률을 높인다.
   */
  highOnlyRepair?: boolean;
  now?: Date;
}

export interface GeneratePregnancyNarrativeResult {
  bundle: PregnancyAnalysisBundle;
  ctx: PregnancyNarrativeContext;
  taegyoPlan: TaegyoPlan;
  plans: PregnancyNarrativePlanSet;
  report: PregnancyNarrativeReport;
  validation: PregnancyNarrativeValidationResult;
  attempts: number;
  repairedSections: PregnancyNarrativeSectionId[];
}

// ── JSON 파서 (robust) ──
function parseSectionJson(raw: string): any | null {
  if (!raw) return null;
  let s = raw.trim().replace(/```(?:json)?/gi, '').trim();
  const first = s.indexOf('{');
  const last = s.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try { return JSON.parse(s.slice(first, last + 1)); } catch { return null; }
}

function san(text: any): string {
  if (typeof text !== 'string') return '';
  return applyPregnancyFinalSanitizers(text);
}

// ── 빈 report scaffold (결정적 3 채움, LLM 7 빈 필드) ──
function emptyReportScaffold(
  bundle: PregnancyAnalysisBundle,
  taegyoPlan: TaegyoPlan,
  ctx: PregnancyNarrativeContext,
): PregnancyNarrativeReport {
  const names = selectBabyNames(bundle);
  const babyNameElementsKo = names.prioritizedElements.map(e => ELEMENT_KO[e]);
  return {
    motherBabyCard: buildMotherBabyCard(bundle, taegyoPlan),
    openingConnection: { oneLine: '', body: '' },
    motherChildMechanism: { body: '', evidenceBlocks: [] },
    motherComfortRhythm: { body: '' },
    babyEnergyAndFit: { body: '' },
    taegyoGuide: { body: '' },
    motherFortuneRoutine: { body: '' },
    familySupportAndFinalMessage: { body: '', finalMessage: '' },
    babyNames: { candidates: names.candidates, prioritizedElements: names.prioritizedElements },
    evidenceView: buildPregnancyEvidenceView(bundle, taegyoPlan, ctx, babyNameElementsKo),
    disclaimer: ensurePregnancyDisclaimer(),
  };
}

// ── parsed JSON → report 필드 sanitize + 매핑 ──
function applySectionToReport(
  report: PregnancyNarrativeReport,
  sectionId: PregnancyNarrativeSectionId,
  parsed: any,
): void {
  if (!parsed) return;
  switch (sectionId) {
    case 'openingConnection': {
      const o = parsed.openingConnection ?? {};
      const section: OpeningConnectionSection = { oneLine: san(o.oneLine), body: san(o.body) };
      report.openingConnection = section;
      break;
    }
    case 'motherChildMechanism': {
      const rm = parsed.motherChildMechanism ?? {};
      const section: MotherChildMechanismSection = {
        body: san(rm.body),
        evidenceBlocks: Array.isArray(rm.evidenceBlocks)
          ? rm.evidenceBlocks.map((b: any) => ({
              sectionId: 'motherChildMechanism' as const,
              evidence: Array.isArray(b?.evidence)
                ? b.evidence.map((e: any) => ({
                    label: san(e?.label), plainMeaning: san(e?.plainMeaning), role: e?.role ?? 'main',
                  }))
                : [],
              causalExplanation: san(b?.causalExplanation),
              betweenScene: san(b?.betweenScene),
              positiveUse: san(b?.positiveUse),
              shadowPattern: san(b?.shadowPattern),
              taegyoAdvice: san(b?.taegyoAdvice),
            }))
          : [],
      };
      report.motherChildMechanism = section;
      break;
    }
    case 'motherComfortRhythm': {
      const s = parsed.motherComfortRhythm ?? {};
      const section: MotherComfortRhythmSection = { body: san(s.body) };
      report.motherComfortRhythm = section;
      break;
    }
    case 'babyEnergyAndFit': {
      const s = parsed.babyEnergyAndFit ?? {};
      const section: BabyEnergyAndFitSection = { body: san(s.body) };
      report.babyEnergyAndFit = section;
      break;
    }
    case 'taegyoGuide': {
      const s = parsed.taegyoGuide ?? {};
      const section: TaegyoGuideSection = { body: san(s.body) };
      report.taegyoGuide = section;
      break;
    }
    case 'motherFortuneRoutine': {
      const s = parsed.motherFortuneRoutine ?? {};
      const section: MotherFortuneRoutineSection = { body: san(s.body) };
      report.motherFortuneRoutine = section;
      break;
    }
    case 'familySupportAndFinalMessage': {
      const s = parsed.familySupportAndFinalMessage ?? {};
      const section: FamilySupportAndFinalMessageSection = {
        body: san(s.body), finalMessage: san(s.finalMessage),
      };
      report.familySupportAndFinalMessage = section;
      break;
    }
    default:
      break; // 결정적 섹션은 매핑 대상 아님
  }
}

export async function generatePregnancyNarrativeReport(
  momInput: BirthInput,
  babyDueInput: BirthInput,
  opts: GeneratePregnancyNarrativeOptions,
): Promise<GeneratePregnancyNarrativeResult> {
  const now = opts.now ?? new Date();
  const baseMaxAttempts = opts.maxRepairAttempts ?? 0;

  // 1) 결정적 분석
  // P6: 임산부 diagnostic은 엄마(母) 사주에만. 아기 예정 사주에는 미적용. flag OFF면 기존 동작 동일.
  const mother = calculateAnalysisOnly(momInput, now, isPregnancyYongsinDiagnosticEnabled() ? { forceAttachDiagnostic: true } : undefined);
  const baby = calculateAnalysisOnly(babyDueInput, now);
  const bundle = composePregnancyAnalysis(mother, baby);
  const taegyoPlan = buildTaegyoPlan(bundle);

  const ctx = buildPregnancyNarrativeContext({
    dueDateLabel: formatDueDateLabel(babyDueInput.birthDate),
    babyTimeConfidence: babyDueInput.birthTimeConfidence,
    motherTimeConfidence: momInput.birthTimeConfidence,
    motherName: momInput.name,
  });

  const plans = buildPregnancyNarrativePlans(bundle, taegyoPlan, ctx);
  const prompts = buildPregnancyPromptsAll(plans, ctx);

  // P6: 엄마 사주 diagnostic 지침 (별도 flag, 기본 OFF). 아기에는 미적용.
  // gpt-input/빌더 무수정, 각 섹션 prompt.system에 curated 지침만 append → raw 미노출.
  let momYongsinGuidance: string | null = null;
  if (isPregnancyYongsinDiagnosticEnabled() && mother.yongsinDiagnostic) {
    momYongsinGuidance = renderYongsinDiagnosticGuidance(mother.yongsinDiagnostic, { mode: 'pregnancy', personLabel: '엄마(母)' });
    for (const built of prompts.values()) built.system = `${built.system}\n\n${momYongsinGuidance}`;
  }

  // 2) sectionwise LLM
  const report = emptyReportScaffold(bundle, taegyoPlan, ctx);
  const parsedBySection = new Map<PregnancyNarrativeSectionId, any>();
  const jsonParseFailedSet = new Set<PregnancyNarrativeSectionId>();
  const finishLengthSet = new Set<PregnancyNarrativeSectionId>();

  await Promise.all(
    PREGNANCY_NARRATIVE_LLM_SECTION_IDS.map(async sectionId => {
      const built = prompts.get(sectionId);
      if (!built) return;
      let parsed: any = null;
      try {
        const { text, finishReason } = await opts.callGpt(built, { maxTokens: built.maxTokens });
        if (finishReason === 'length') finishLengthSet.add(sectionId);
        parsed = parseSectionJson(text);
      } catch {
        parsed = null;
      }
      if (parsed === null) {
        jsonParseFailedSet.add(sectionId);
        // (A) 드롭 감지 — 섹션이 비면 함수 로그에 남겨 조용한 회귀를 잡는다.
        console.warn(`[pregnancy] 섹션 "${sectionId}" 생성/파싱 실패 → 빈 섹션 처리`);
      }
      parsedBySection.set(sectionId, parsed);
    }),
  );

  for (const sectionId of PREGNANCY_NARRATIVE_LLM_SECTION_IDS) {
    applySectionToReport(report, sectionId, parsedBySection.get(sectionId));
  }

  // 3) validate
  let validation = validatePregnancyNarrativeReport({
    report, bundle, plans, ctx,
    generatorFlags: {
      jsonParseFailedSections: [...jsonParseFailedSet],
      finishLengthSections: [...finishLengthSet],
    },
  });

  // 라이브 기본 repair 0이라도 첫 검증에 HIGH가 있으면 1회는 재생성해 걸러낸다(차단 전 마지막 기회).
  // HIGH 없으면(대부분) 0 유지 → 지연 영향 없음.
  const maxAttempts = Math.max(
    baseMaxAttempts,
    opts.highOnlyRepair && validation.highCount > 0 ? 1 : 0,
  );

  // 4) bounded repair loop
  const repairedSections = new Set<PregnancyNarrativeSectionId>();
  let attempts = 1;
  let prevSignature = '';

  for (let i = 0; i < maxAttempts && validation.shouldRepair; i++) {
    const targets = validation.repairTargets.filter(t => PREGNANCY_NARRATIVE_LLM_SECTION_IDS.includes(t));
    if (targets.length === 0) break;

    const currentSignature = validation.issues
      .filter(iss => targets.includes(iss.sectionId as PregnancyNarrativeSectionId))
      .map(iss => `${iss.type}|${iss.sectionId}|${iss.sentence}`)
      .sort().join('\n');
    if (i > 0 && currentSignature === prevSignature) break;
    prevSignature = currentSignature;

    attempts++;

    await Promise.all(
      targets.map(async sectionId => {
        const plan = plans.find(p => p.sectionId === sectionId);
        if (!plan) return;
        const thisSectionIssues: PregnancyRepairIssueRef[] = validation.issues
          .filter(iss => iss.sectionId === sectionId || iss.sectionId === 'global')
          .map(iss => ({
            type: iss.type, sectionId: String(iss.sectionId), sentence: iss.sentence,
            reason: iss.reason, severity: iss.severity, suggestion: iss.suggestion,
          }));
        const previousOutput = JSON.stringify(parsedBySection.get(sectionId) ?? {});
        const repairPrompt = buildPregnancyRepairPrompt(plan, ctx, { previousOutput, issues: thisSectionIssues });
        if (!repairPrompt) return;
        if (momYongsinGuidance) repairPrompt.system = `${repairPrompt.system}\n\n${momYongsinGuidance}`;
        let parsed: any = null;
        let lengthTrunc = false;
        try {
          const { text, finishReason } = await opts.callGpt(repairPrompt, { maxTokens: repairPrompt.maxTokens });
          if (finishReason === 'length') lengthTrunc = true;
          parsed = parseSectionJson(text);
        } catch {
          parsed = null;
        }
        if (lengthTrunc) finishLengthSet.add(sectionId);
        else finishLengthSet.delete(sectionId);
        if (parsed) {
          jsonParseFailedSet.delete(sectionId);
          parsedBySection.set(sectionId, parsed);
          repairedSections.add(sectionId);
        }
      }),
    );

    for (const sectionId of PREGNANCY_NARRATIVE_LLM_SECTION_IDS) {
      applySectionToReport(report, sectionId, parsedBySection.get(sectionId));
    }
    // 결정적 섹션/안내문 재확정
    report.motherBabyCard = buildMotherBabyCard(bundle, taegyoPlan);
    report.disclaimer = ensurePregnancyDisclaimer(report.disclaimer);

    validation = validatePregnancyNarrativeReport({
      report, bundle, plans, ctx,
      generatorFlags: {
        jsonParseFailedSections: [...jsonParseFailedSet],
        finishLengthSections: [...finishLengthSet],
      },
    });
  }

  // 안내문 최종 보장
  report.disclaimer = ensurePregnancyDisclaimer(report.disclaimer);

  // ── Fortune Questions Verdict V1 (flag ON + 안전 게이트 통과 시에만; 자녀·가족운, 의료/출산 예측 금지) ──
  // highCount>0이면 라우트가 422로 본문을 막으므로 생성하지 않는다(불필요한 호출 방지).
  if (isPregnancyFortuneVerdictEnabled() && validation.highCount === 0) {
    const ev = buildPregnancyFortuneVerdictEvidence(bundle);
    const verdict = await generateFortuneVerdict(
      ev,
      (sys, usr, mt) => opts.callGpt({ sectionId: 'familySupportAndFinalMessage', system: sys, user: usr, maxTokens: mt, outputJsonSchema: '' }, { maxTokens: mt }).then(r => r.text),
      { sanitize: (t: string) => applyPregnancyFinalSanitizers(t), disclaimer: PREGNANCY_DISCLAIMER },
    );
    if (verdict) report.fortuneVerdict = verdict;
  }

  return {
    bundle, ctx, taegyoPlan, plans, report, validation,
    attempts, repairedSections: [...repairedSections],
  };
}

// 미사용 import 방지용 (Element 타입은 타입 참조로만 사용)
export type { Element };
