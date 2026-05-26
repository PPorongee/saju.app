// Yearly Fortune V4 — Generator (Y6)
//
// 역할:
//   - YearlyFortuneInput → deterministic 분석(buildYearlyAnalysis) → 섹션별 plan → prompt
//     → sectionwise LLM 호출(주입된 GptCaller) → JSON 파싱 → sanitize → assemble → validate
//     → 실패 섹션 repair (bounded) → 최종 YearlyFortuneReport.
//   - evidenceView는 LLM 호출 없이 analysis에서 deterministic 구성.
//   - 개인사주 generateNarrativePersonalSajuReport (generatePersonalSajuReport.ts:332) 패턴 미러.
//
// 정책:
//   - 실제 LLM/network 호출은 이 파일 안에 없다. opts.callGpt(주입형)로만 호출.
//   - sanitize → validate 순서. parse 실패 시 throw 금지 (빈 섹션 처리 → validator가 section-missing).

import {
  normalizeBirthInput,
} from '../calendar/normalizeBirthInput';
import { calculatePillars } from '../calendar/pillarCalculator';
import { analyzeTenGods } from '../analysis/tenGodAnalyzer';
import { analyzeElementStrength } from '../analysis/elementStrengthAnalyzer';
import { analyzeDayMasterStrength } from '../analysis/dayMasterStrengthAnalyzer';
import { analyzeStructure } from '../analysis/structureAnalyzer';
import { analyzeUsefulGod } from '../analysis/usefulGodAnalyzer';
import type { HeavenlyStem } from '../rules/heavenlyStems';

import {
  buildY2a, buildY2b, buildY2c, buildY2d, buildY2e, buildY2f, buildY2g,
} from './yearlyAnalysisBuilder';
import { buildYearlyPlans, YEARLY_LLM_SECTION_IDS } from './yearlyPlanBuilder';
import {
  buildYearlyPromptsAll,
  buildYearlyRepairPrompt,
  type BuiltYearlyPrompt,
  type YearlyPromptContext,
  type YearlyRepairIssueRef,
} from './yearlyPromptBuilder';
import { applyYearlyFinalSanitizers } from './yearlySanitizer';
import {
  validateYearlyReport,
  type YearlyValidatorContext,
} from './yearlyReportValidator';
import type {
  YearlyFortuneInput,
  YearlyFortuneAnalysis,
  YearlyFortuneReport,
  YearlyFortuneSectionId,
  YearlyValidationResult,
  YearlyPlanSet,
  YearlyDepthOptions,
  YearlyRelationshipStatus,
  YearFlowCard,
  YearlyOverview,
  YearlyMechanismSection,
  RemainingMonthSection,
  TopicFortunes,
  ActionGuide,
  NextTwoYearSection,
  YearlyFortuneEvidenceView,
} from './yearlyTypes';

// ============================================================
// Public API
// ============================================================
export type YearlyGptCaller = (
  prompt: BuiltYearlyPrompt,
  opts?: { maxTokens?: number },
) => Promise<string>;

export interface GenerateYearlyOptions {
  callGpt: YearlyGptCaller;
  /** 섹션별 repair 최대 시도 횟수 (기본 1). */
  maxRepairAttempts?: number;
  /** 기준 시각 (대운/normalize 기준). 미지정 시 new Date(). */
  now?: Date;
  depthOptions?: Partial<YearlyDepthOptions>;
}

export interface GenerateYearlyResult {
  analysis: YearlyFortuneAnalysis;
  plans: YearlyPlanSet;
  report: YearlyFortuneReport;
  validation: YearlyValidationResult;
  attempts: number;
  repairedSections: YearlyFortuneSectionId[];
}

// ============================================================
// buildYearlyAnalysis — Y2a~Y2g 종합 (deterministic)
// 테스트 helper buildAnalysisForFixture (yearlyFortunePipeline.test.ts:1414)와 동일한 조립.
// 다만 fixture는 고정 CURRENT_DATE/NOW를 쓰고, 여기서는 input에서 구동한다.
//   - normalize/대운 기준 시각: now (opts.now ?? new Date())
//   - 절기·세운·월운 기준일: input.currentDate
// ============================================================
export function buildYearlyAnalysis(
  input: YearlyFortuneInput,
  now?: Date,
): YearlyFortuneAnalysis {
  const baseNow = now ?? new Date();
  const currentDate = input.currentDate;

  const nb = normalizeBirthInput(input.birth, baseNow);
  const pr = calculatePillars(nb);
  const tenGods = analyzeTenGods(pr.pillars);
  const elements = analyzeElementStrength(pr.pillars);
  const dms = analyzeDayMasterStrength(pr.pillars, tenGods, elements);
  const structure = analyzeStructure(pr.pillars, tenGods, elements);
  const ug = analyzeUsefulGod({ pillars: pr.pillars, tenGods, elements, dayMasterStrength: dms, structure });

  const options = {
    relationshipStatus: input.relationshipStatus ?? 'unknown',
    hasChildren: deriveHasChildren(input),
  };

  const y2a = buildY2a({ currentDate, targetYear: input.targetYear, dayMaster: pr.pillars.dayMaster as HeavenlyStem });
  const y2b = buildY2b({ normalizedBirth: nb, pillars: pr.pillars, currentDate });
  const y2c = buildY2c({ daewoonPillar: y2b.activeDaewoon, sewoonGanji: y2a.ganji });
  const y2d = buildY2d({ pillars: pr.pillars, sewoonGanji: y2a.ganji, options });
  const y2e = buildY2e({ yearGanji: y2a.ganji, dayMaster: pr.pillars.dayMaster as HeavenlyStem, usefulGod: ug, dayMasterStrength: dms });
  const y2f = buildY2f({
    currentDate, sajuYear: y2a.sajuYear, yearStem: y2a.ganji.stem as HeavenlyStem,
    sewoonGanji: y2a.ganji, natalPillars: pr.pillars, dayMaster: pr.pillars.dayMaster as HeavenlyStem,
    usefulGod: ug, dayMasterStrength: dms,
  });
  const y2g = buildY2g({
    targetYear: y2a.sajuYear, dayMaster: pr.pillars.dayMaster as HeavenlyStem, natalPillars: pr.pillars,
    daewoonPillar: y2b.activeDaewoon, usefulGod: ug, dayMasterStrength: dms, options,
  });

  return {
    natalChart: pr.pillars,
    natalPillarsFull: [pr.pillars.year, pr.pillars.month, pr.pillars.day, ...(pr.pillars.hour ? [pr.pillars.hour] : [])],
    currentDaewoon: y2b.currentDaewoon,
    targetYear: y2a.sajuYear,
    targetYearGanji: y2a.ganji,
    yearTenGod: y2a.yearTenGod,
    yearElementEffect: y2e.yearElementEffect,
    strengthImpact: y2e.strengthImpact,
    daewoonSewoonInteraction: y2c,
    natalSewoonInteractions: y2d.natalSewoonInteractions,
    activatedTopics: [],
    specialStarsActivated: [],
    remainingMonthlyFortunes: y2f,
    nextTwoYears: y2g,
    carriedOver: {
      dayMasterStrength: dms,
      usefulGod: ug,
      specialStars: [],
    },
  };
}

// hasChildren: input.hasChildren(typed boolean) 우선, 없으면 input.userContext?.hasChildren 폴백, 미상 'unknown'.
function deriveHasChildren(input: YearlyFortuneInput): boolean | 'unknown' {
  if (typeof input.hasChildren === 'boolean') return input.hasChildren;
  const v = input.userContext?.hasChildren;
  if (v === true || v === false) return v;
  return 'unknown';
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
// 빈/기본 report scaffold — parse 실패 시 validator가 section-missing 잡도록 빈 필드 유지.
// ============================================================
function emptyReportScaffold(analysis: YearlyFortuneAnalysis): YearlyFortuneReport {
  return {
    yearFlowCard: { title: '', subtitle: '', keywords: [], summary: '' },
    yearlyOverview: { oneLine: '', body: '' },
    yearlyMechanism: { body: '', evidenceBlocks: [] },
    remainingMonths: [],
    topicFortunes: { career: '', money: '', relationship: '', rhythm: '' },
    actionGuide: { mustCatch: [], betterAvoid: [], bestStrategy: '' },
    nextTwoYears: [],
    evidenceView: buildEvidenceView(analysis),
  };
}

// ============================================================
// evidenceView — deterministic (LLM 호출 X). analysis에서 직접 구성.
// (buildValidMockReport.evidenceView 형태와 동일)
// ============================================================
function buildEvidenceView(analysis: YearlyFortuneAnalysis): YearlyFortuneEvidenceView {
  return {
    yearGanji: analysis.targetYearGanji,
    currentDaewoonPillar: analysis.currentDaewoon.pillar.pillarKo,
    yearStemTenGod: analysis.yearTenGod.stemTenGod,
    yearBranchTenGod: analysis.yearTenGod.branchMainTenGod,
    yearElement: analysis.yearElementEffect.element,
    usefulGodRelation: analysis.yearElementEffect.relationToUsefulGod,
    natalSewoonInteractions: analysis.natalSewoonInteractions.flatMap(ns =>
      ns.interactions.map(it => ({ pillar: ns.pillarLabel, kind: it.kind, plain: it.plainMeaning })),
    ),
    daewoonSewoonInteractions: analysis.daewoonSewoonInteraction.interactions.map(it => ({
      kind: it.kind, plain: it.plainMeaning,
    })),
    monthlySummary: analysis.remainingMonthlyFortunes.map(m => ({
      monthLabel: m.monthLabel, ganji: m.monthGanji.display, keyword: m.keyword,
    })),
    activatedSpecialStars: analysis.specialStarsActivated.map(s => ({
      name: s.name, source: s.source, plain: s.plainMeaning,
    })),
  };
}

// ============================================================
// 섹션 JSON → report 필드 sanitize+매핑.
// sanitize는 LLM 텍스트 string 필드에만 적용. (숫자/배열 구조는 그대로)
// ============================================================
interface SanitizeCtx {
  relationshipStatus: YearlyRelationshipStatus;
  hasChildren: boolean | 'unknown';
}

function san(text: any, ctx: SanitizeCtx): string {
  if (typeof text !== 'string') return '';
  return applyYearlyFinalSanitizers(text, ctx);
}

interface ApplyCtx {
  sanitize: SanitizeCtx;
  /** nextTwoYears year 폴백용 — analysis.nextTwoYears */
  nextTwoYearsAnalysis: YearlyFortuneAnalysis['nextTwoYears'];
  /** nextTwoYears year 폴백용 — analysis.targetYear */
  nextTwoYearsTargetYear: number;
}

// 섹션별 parsed JSON을 report에 반영. parsed가 null이면 해당 필드 미변경(빈 상태 유지).
function applySectionToReport(
  report: YearlyFortuneReport,
  sectionId: YearlyFortuneSectionId,
  parsed: any,
  ctx: ApplyCtx,
): void {
  if (!parsed) return;

  const sc = ctx.sanitize;
  switch (sectionId) {
    case 'yearFlowCard': {
      const fc = parsed.yearFlowCard ?? {};
      const ov = parsed.yearlyOverview ?? {};
      const card: YearFlowCard = {
        title: san(fc.title, sc),
        subtitle: san(fc.subtitle, sc),
        keywords: Array.isArray(fc.keywords) ? fc.keywords.map((k: any) => san(k, sc)).filter(Boolean) : [],
        summary: san(fc.summary, sc),
      };
      const overview: YearlyOverview = {
        oneLine: san(ov.oneLine, sc),
        body: san(ov.body, sc),
      };
      report.yearFlowCard = card;
      report.yearlyOverview = overview;
      break;
    }
    case 'yearlyMechanism': {
      const ym = parsed.yearlyMechanism ?? {};
      const section: YearlyMechanismSection = {
        body: san(ym.body, sc),
        // evidenceBlocks: string 필드만 sanitize, 구조 보존
        evidenceBlocks: Array.isArray(ym.evidenceBlocks)
          ? ym.evidenceBlocks.map((b: any) => ({
              sectionId: 'yearlyMechanism' as const,
              evidence: Array.isArray(b?.evidence)
                ? b.evidence.map((e: any) => ({
                    label: san(e?.label, sc),
                    plainMeaning: san(e?.plainMeaning, sc),
                    role: e?.role ?? 'main',
                  }))
                : [],
              causalExplanation: san(b?.causalExplanation, sc),
              lifeScene: san(b?.lifeScene, sc),
              positiveUse: san(b?.positiveUse, sc),
              shadowPattern: san(b?.shadowPattern, sc),
              practicalAdvice: san(b?.practicalAdvice, sc),
            }))
          : [],
      };
      report.yearlyMechanism = section;
      break;
    }
    case 'remainingMonths': {
      const arr = Array.isArray(parsed.remainingMonths) ? parsed.remainingMonths : [];
      const months: RemainingMonthSection[] = arr.map((m: any) => ({
        monthLabel: san(m?.monthLabel, sc),
        periodLabel: san(m?.periodLabel, sc),
        keyword: san(m?.keyword, sc),
        body: san(m?.body, sc),
        work: san(m?.work, sc),
        money: san(m?.money, sc),
        relationship: san(m?.relationship, sc),
        goodChoice: san(m?.goodChoice, sc),
        caution: san(m?.caution, sc),
      }));
      report.remainingMonths = months;
      break;
    }
    case 'topicFortunes': {
      const tf = parsed.topicFortunes ?? {};
      const topics: TopicFortunes = {
        career: san(tf.career, sc),
        money: san(tf.money, sc),
        relationship: san(tf.relationship, sc),
        rhythm: san(tf.rhythm, sc),
      };
      report.topicFortunes = topics;
      break;
    }
    case 'actionGuide': {
      const ag = parsed.actionGuide ?? {};
      const guide: ActionGuide = {
        mustCatch: Array.isArray(ag.mustCatch) ? ag.mustCatch.map((s: any) => san(s, sc)).filter(Boolean) : [],
        betterAvoid: Array.isArray(ag.betterAvoid) ? ag.betterAvoid.map((s: any) => san(s, sc)).filter(Boolean) : [],
        bestStrategy: san(ag.bestStrategy, sc),
      };
      report.actionGuide = guide;
      break;
    }
    case 'nextTwoYears': {
      const arr = Array.isArray(parsed.nextTwoYears) ? parsed.nextTwoYears : [];
      const years: NextTwoYearSection[] = arr.map((y: any, index: number) => ({
        // year: LLM 산출 값 우선. 누락/비숫자면 analysis.nextTwoYears[i].year ?? targetYear+i+1 로 결정론적 폴백.
        year: (typeof y?.year === 'number' && Number.isFinite(y.year))
          ? y.year
          : (ctx.nextTwoYearsAnalysis[index]?.year ?? (ctx.nextTwoYearsTargetYear + index + 1)),
        keyword: san(y?.keyword, sc),
        summary: san(y?.summary, sc),
        opportunity: san(y?.opportunity, sc),
        caution: san(y?.caution, sc),
      }));
      report.nextTwoYears = years;
      break;
    }
    case 'evidenceView':
      // deterministic — LLM 산출 매핑 대상 아님
      break;
  }
}

// ============================================================
// generateYearlyFortuneReport — 메인 흐름
//
// depthOptions (useMonthlyFlow/useNextTwoYears/useEvidenceNarrative)는 route에서 전달받아
// opts.depthOptions에 저장되지만 Phase 1에서는 소비하지 않는다 — 모든 섹션을 항상 생성.
// Phase 2에서 섹션 게이팅을 구현할 때 validateYearlyReport도 depth-aware로 만들어야 한다.
// 그 전까지 depthOptions는 forward-compat용으로만 accept. (see ledger HIGH-1)
// ============================================================
export async function generateYearlyFortuneReport(
  input: YearlyFortuneInput,
  opts: GenerateYearlyOptions,
): Promise<GenerateYearlyResult> {
  const now = opts.now ?? new Date();
  const maxAttempts = opts.maxRepairAttempts ?? 1;

  // 1) 분석 + plan
  const analysis = buildYearlyAnalysis(input, now);
  const plans = buildYearlyPlans(analysis);

  // 2) prompt context
  const relationshipStatus: YearlyRelationshipStatus = input.relationshipStatus ?? 'unknown';
  const hasChildren = deriveHasChildren(input);
  const promptCtx: YearlyPromptContext = {
    relationshipStatus,
    targetYear: analysis.targetYear,
  };
  const sanitizeCtx: SanitizeCtx = { relationshipStatus, hasChildren };
  const applyCtx: ApplyCtx = {
    sanitize: sanitizeCtx,
    nextTwoYearsAnalysis: analysis.nextTwoYears,
    nextTwoYearsTargetYear: analysis.targetYear,
  };
  const validatorCtx: YearlyValidatorContext = { relationshipStatus, hasChildren };

  // 3) section별 prompt (evidenceView 제외 — buildYearlyPromptsAll이 이미 제외)
  const prompts = buildYearlyPromptsAll(plans, promptCtx);

  // 4) LLM 호출 + parse + sanitize → report 조립
  const report = emptyReportScaffold(analysis);
  const parsedBySection = new Map<YearlyFortuneSectionId, any>();

  // 개인사주 generator와 동일한 병렬(Promise.all) 스타일
  await Promise.all(
    YEARLY_LLM_SECTION_IDS.map(async sectionId => {
      const built = prompts.get(sectionId);
      if (!built) return;
      let parsed: any = null;
      try {
        const raw = await opts.callGpt(built, { maxTokens: built.maxTokens });
        parsed = parseSectionJson(raw);
      } catch {
        // 호출/파싱 실패 → 빈 섹션 (validator가 section-missing)
        parsed = null;
      }
      parsedBySection.set(sectionId, parsed);
    }),
  );

  for (const sectionId of YEARLY_LLM_SECTION_IDS) {
    applySectionToReport(report, sectionId, parsedBySection.get(sectionId), applyCtx);
  }

  // 5) validate
  let validation = validateYearlyReport({ report, analysis, plans, ctx: validatorCtx });

  // 6) repair loop (bounded)
  const repairedSections = new Set<YearlyFortuneSectionId>();
  let attempts = 1;
  // 수렴 조기 종료용: 직전 라운드의 repairTargets issue 시그니처
  let prevRepairSignature = '';

  for (let i = 0; i < maxAttempts && validation.shouldRepair; i++) {
    // 이 라운드에서 다시 호출할 LLM 섹션만 추림
    const targets = validation.repairTargets.filter(t => YEARLY_LLM_SECTION_IDS.includes(t));
    if (targets.length === 0) break;

    // 조기 종료: repairTargets의 issue 시그니처가 직전 라운드와 동일하면 수렴 불가 → 중단.
    const currentSignature = validation.issues
      .filter(iss => targets.includes(iss.sectionId as YearlyFortuneSectionId))
      .map(iss => `${iss.type}|${iss.sectionId}|${iss.sentence}`)
      .sort()
      .join('\n');
    if (i > 0 && currentSignature === prevRepairSignature) break;
    prevRepairSignature = currentSignature;

    attempts++;

    await Promise.all(
      targets.map(async sectionId => {
        const plan = plans.find(p => p.sectionId === sectionId);
        if (!plan) return;
        const thisSectionIssues: YearlyRepairIssueRef[] = validation.issues
          .filter(iss => iss.sectionId === sectionId)
          .map(iss => ({
            type: iss.type,
            sectionId: String(iss.sectionId),
            sentence: iss.sentence,
            reason: iss.reason,
            severity: iss.severity,
            suggestion: iss.suggestion,
          }));
        const previousOutput = JSON.stringify(parsedBySection.get(sectionId) ?? {});
        const repairPrompt = buildYearlyRepairPrompt(plan, promptCtx, {
          previousOutput,
          issues: thisSectionIssues,
        });
        if (!repairPrompt) return;
        let parsed: any = null;
        try {
          const raw = await opts.callGpt(repairPrompt, { maxTokens: repairPrompt.maxTokens });
          parsed = parseSectionJson(raw);
        } catch {
          parsed = null;
        }
        // parse 실패 시 기존 섹션 유지 (재작성 못 함)
        if (parsed) {
          parsedBySection.set(sectionId, parsed);
          repairedSections.add(sectionId);
        }
      }),
    );

    // 재조립 (repair된 섹션만 갱신, 나머지는 직전 parsed 그대로 재적용)
    for (const sectionId of YEARLY_LLM_SECTION_IDS) {
      applySectionToReport(report, sectionId, parsedBySection.get(sectionId), applyCtx);
    }
    report.evidenceView = buildEvidenceView(analysis);

    validation = validateYearlyReport({ report, analysis, plans, ctx: validatorCtx });
  }

  return {
    analysis,
    plans,
    report,
    validation,
    attempts,
    repairedSections: Array.from(repairedSections),
  };
}
