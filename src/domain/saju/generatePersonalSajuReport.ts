// generatePersonalSajuReport — 메인 함수 (spec §20).
//
// 흐름:
//   normalize → pillars → tenGods → elements → dayMaster → structure
//   → usefulGod → specialStars → combinationsAndConflicts → fortuneCycles → fortuneFlow
//   → specialPoints → gptInput → prompt → callGpt → validate → (필요 시) repair
//
// GPT 호출은 외부 의존이라 인터페이스(`gptCaller`)로 분리.
// 실제 OpenAI 호출은 src/lib (또는 app/api)에서 wire-up.

import { normalizeBirthInput, type BirthInput } from './calendar/normalizeBirthInput';
import { calculatePillars } from './calendar/pillarCalculator';
import { calculateFortuneCycles } from './calendar/fortuneCycleCalculator';
import { buildPrecisionContext } from './calendar/precisionContext';
import { analyzeTenGods } from './analysis/tenGodAnalyzer';
import { analyzeElementStrength } from './analysis/elementStrengthAnalyzer';
import { analyzeDayMasterStrength } from './analysis/dayMasterStrengthAnalyzer';
import { analyzeStructure } from './analysis/structureAnalyzer';
import { analyzeUsefulGod } from './analysis/usefulGodAnalyzer';
import { analyzeYongsinDiagnostic } from './analysis/yongsinDiagnostic';
import { isYongsinDiagnosticEnabled } from './report/yongsinDiagnosticFlag';
import { isPersonalActionGuideEnabled } from './actionGuide/actionGuideFlag';
import { buildPersonalActionGuideEvidence } from './actionGuide/actionGuideEvidence';
import { generateActionGuide } from './actionGuide/generateActionGuide';
import type { ActionGuide } from './actionGuide/actionGuideTypes';
import { analyzeSpecialStars } from './analysis/specialStarAnalyzer';
import { analyzeCombinationsAndConflicts } from './analysis/combinationConflictAnalyzer';
import { analyzeFortuneFlow } from './analysis/fortuneFlowAnalyzer';
import { detectSpecialPoints } from './specialPoints/specialPointDetector';
import { generateIdentityKeywords } from './analysis/identityKeywordsGenerator';
import { detectLifeWeapons } from './analysis/lifeWeaponsDetector';
import { detectLifeTraps } from './analysis/lifeTrapsDetector';
import { analyzeFortuneTriggers } from './analysis/fortuneTriggersAnalyzer';
import { analyzeCareerSpecifics } from './analysis/careerSpecificsAnalyzer';
import { generateTimingAnchors } from './analysis/timingAnchorsGenerator';
import { analyzeFutureTiming } from './analysis/futureTimingAnalyzer';
import { buildPersonalSajuGptInput } from './report/gptInputBuilder';
import { buildPersonalSajuPrompt, type BuiltPrompt } from './report/personalSajuPromptBuilder';
import { buildContextGuard } from './report/contextGuard';
import { buildContentLedger } from './report/contentLedgerBuilder';
import { validateReport } from './report/reportValidator';
import {
  buildNarrativePersonalSajuPrompt, type BuiltNarrativePrompt,
  buildSectionPrompt, SECTION_MAX_TOKENS,
} from './narrative/narrativePromptBuilder';
import { sanitizeNarrativeText, sanitizeUnsupportedUserContext, sanitizeFinancialAdviceRisk, applyFinalSanitizers } from './narrative/narrativeSanitizer';
import { validateNarrativeReport, collectFailingSectionsFromIssues } from './narrative/narrativeReportValidator';
import { buildNarrativePlans } from './narrative/narrativePlanBuilder';
import { buildLifeSceneHints } from './narrative/lifeSceneHintBuilder';
import { buildTopicCoverageMap } from './narrative/topicCoverageBuilder';
import { buildStarKeywordCard } from './star/starKeywordCardBuilder';
import type { NarrativeValidationResult, NarrativePlanSet, NarrativeDepthOptions } from './narrative/narrativeTypes';
import { DEFAULT_NARRATIVE_DEPTH_OPTIONS } from './narrative/narrativeTypes';
import type { TopicCoverageMap } from './narrative/topicCoverageTypes';
import type { StarKeywordCardData } from './star/starArchetypeTypes';
import { DEFAULT_RULE_CONFIG } from './rules/ruleConfig';
import type { PersonalSajuGptInput, ReportValidationResult, SpecialPoint } from './report/sajuReportSchema';

/** 외부 LLM 호출 어댑터 — OpenAI/Claude 등 wire-up은 외부. */
export type GptCaller = (prompt: BuiltPrompt) => Promise<string>;

/** 서사형(narrative) LLM 호출 어댑터 — 같은 {system,user} 구조 + 호출당 maxTokens override. */
export interface NarrativeGptCallOptions {
  /** 이 호출 한정 maxTokens (섹션별 호출에 사용) */
  maxTokens?: number;
}
export type NarrativeGptCaller = (
  prompt: BuiltNarrativePrompt,
  callOpts?: NarrativeGptCallOptions,
) => Promise<string>;

export interface GenerateOptions {
  callGpt: GptCaller;
  /** 검증 실패 시 repair 호출 최대 횟수 */
  maxRepairAttempts?: number;
  /** "지금" — 나이·세운 계산 기준. 테스트 안정성용. */
  now?: Date;
}

export interface GenerateResult {
  gptInput: PersonalSajuGptInput;
  prompt: BuiltPrompt;
  reportText: string;
  validation: ReportValidationResult;
  attempts: number;
}

/**
 * 결정론 분석만 — GPT 호출 X. preview endpoint에서 즉시 응답용.
 * 출력: PersonalSajuGptInput과 동일 구조 (단 reportText 없음).
 */
export function calculateAnalysisOnly(
  input: BirthInput,
  now: Date = new Date(),
  opts?: { forceAttachDiagnostic?: boolean },
): PersonalSajuGptInput {
  const normalized = normalizeBirthInput(input, now);
  // precision 컨텍스트 (legacy면 모든 옵션 undefined → 아래 호출 byte-identical)
  const pctx = buildPrecisionContext(normalized, input);
  const pillarsRes = calculatePillars(normalized, DEFAULT_RULE_CONFIG, pctx.pillarOptions);
  const tenGods    = analyzeTenGods(pillarsRes.pillars);
  const elements   = analyzeElementStrength(pillarsRes.pillars);
  const dm         = analyzeDayMasterStrength(pillarsRes.pillars, tenGods, elements);
  const structure  = analyzeStructure(pillarsRes.pillars, tenGods, elements);
  const usefulGod  = analyzeUsefulGod({ pillars: pillarsRes.pillars, tenGods, elements, dayMasterStrength: dm, structure });
  const specialStars   = analyzeSpecialStars(pillarsRes.pillars);
  const combConflicts  = analyzeCombinationsAndConflicts(pillarsRes.pillars);
  const cycles  = calculateFortuneCycles(normalized, pillarsRes.pillars, now.getFullYear(), pctx.fortuneClock);
  const fortune = analyzeFortuneFlow({ pillars: pillarsRes.pillars, cycles, usefulGod, tenGods });

  const specialPoints: SpecialPoint[] = detectSpecialPoints({
    pillars: pillarsRes.pillars,
    tenGods, elements,
    dayMasterStrength: dm, structure, usefulGod,
    specialStars, fortune,
    hourUnknown: normalized.hourUnknown,
  });

  const identityKeywords = generateIdentityKeywords({
    pillars: pillarsRes.pillars, tenGods, elements,
    dayMasterStrength: dm, structure, usefulGod, specialPoints,
  });
  const lifeWeapons = detectLifeWeapons({
    pillars: pillarsRes.pillars, tenGods, elements,
    dayMasterStrength: dm, usefulGod, specialPoints, fortune,
  });
  const lifeTraps = detectLifeTraps({
    pillars: pillarsRes.pillars, tenGods, elements,
    dayMasterStrength: dm, usefulGod, specialPoints, fortune,
    userContext: normalized.context,
  });
  const fortuneTriggers = analyzeFortuneTriggers({
    pillars: pillarsRes.pillars, tenGods, elements,
    usefulGod, specialPoints, lifeWeapons, lifeTraps, fortune,
  });

  const careerSpecificAnalysis = analyzeCareerSpecifics({
    pillars: pillarsRes.pillars, tenGods, elements,
    dayMasterStrength: dm, usefulGod, specialPoints, fortune,
    userContext: normalized.context,
  });
  const timingAnchors = generateTimingAnchors({
    pillars: pillarsRes.pillars, cycles, tenGods, usefulGod, specialPoints,
    userContext: normalized.context,
    currentYear: now.getFullYear(),
    birthYear: normalized.year,
  });
  const futureTimingAnalysis = analyzeFutureTiming({
    pillars: pillarsRes.pillars, cycles, tenGods, usefulGod, specialPoints,
    birthYear: normalized.year,
  });
  const contentLedger = buildContentLedger({
    identityKeywords, specialPoints, lifeWeapons, lifeTraps,
    fortuneTriggers, careerSpecificAnalysis, futureTimingAnalysis,
  });

  const gptInput = buildPersonalSajuGptInput({
    userContext: normalized.context,
    birthTimeConfidence: input.birthTimeConfidence,
    ruleConfig: DEFAULT_RULE_CONFIG,
    pillars: pillarsRes.pillars,
    tenGods, elements,
    dayMasterStrength: dm,
    usefulGod,
    combinationsAndConflicts: combConflicts,
    specialStars,
    specialPoints,
    identityKeywords,
    lifeWeapons,
    lifeTraps,
    fortuneTriggers,
    fortune,
    careerSpecificAnalysis,
    timingAnchors,
    futureTimingAnalysis,
    contentLedger,
  });
  // precision-v1일 때만 calculationMeta 부착. legacy면 undefined → 키 미추가(byte-identical).
  if (pctx.calculationMeta) gptInput.calculationMeta = pctx.calculationMeta;
  // P4: flag ON일 때만 yongsin diagnostic 부착(서버 전용, off면 키 미추가 → byte-identical).
  //     analyzeUsefulGod 결과는 read-only로 미러만 함 — 최종 용신 미변경. 프롬프트/UI/API 미배선.
  if (isYongsinDiagnosticEnabled() || opts?.forceAttachDiagnostic) {
    gptInput.yongsinDiagnostic = analyzeYongsinDiagnostic({
      usefulGod,
      tenGods,
      elements,
      dayMasterStrength: dm,
      structure,
      pillars: pillarsRes.pillars,
      calculationMeta: pctx.calculationMeta,
    });
  }
  return gptInput;
}

export async function generatePersonalSajuReport(
  input: BirthInput,
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const now = opts.now ?? new Date();
  const maxAttempts = opts.maxRepairAttempts ?? 1;

  // ── 결정론적 계산 파이프라인 ──
  const normalized = normalizeBirthInput(input, now);
  const pctx = buildPrecisionContext(normalized, input);   // legacy면 옵션 undefined → byte-identical
  const pillarsRes = calculatePillars(normalized, DEFAULT_RULE_CONFIG, pctx.pillarOptions);
  const tenGods    = analyzeTenGods(pillarsRes.pillars);
  const elements   = analyzeElementStrength(pillarsRes.pillars);
  const dm         = analyzeDayMasterStrength(pillarsRes.pillars, tenGods, elements);
  const structure  = analyzeStructure(pillarsRes.pillars, tenGods, elements);
  const usefulGod  = analyzeUsefulGod({ pillars: pillarsRes.pillars, tenGods, elements, dayMasterStrength: dm, structure });
  const specialStars   = analyzeSpecialStars(pillarsRes.pillars);
  const combConflicts  = analyzeCombinationsAndConflicts(pillarsRes.pillars);
  const cycles  = calculateFortuneCycles(normalized, pillarsRes.pillars, now.getFullYear(), pctx.fortuneClock);
  const fortune = analyzeFortuneFlow({ pillars: pillarsRes.pillars, cycles, usefulGod, tenGods });

  const specialPoints: SpecialPoint[] = detectSpecialPoints({
    pillars: pillarsRes.pillars,
    tenGods, elements,
    dayMasterStrength: dm, structure, usefulGod,
    specialStars, fortune,
    hourUnknown: normalized.hourUnknown,
  });

  // ── 차별화 4섹션 (코드 결정론 — GPT는 풀어쓰기만) ──
  const identityKeywords = generateIdentityKeywords({
    pillars: pillarsRes.pillars,
    tenGods, elements,
    dayMasterStrength: dm, structure, usefulGod, specialPoints,
  });
  const lifeWeapons = detectLifeWeapons({
    pillars: pillarsRes.pillars,
    tenGods, elements,
    dayMasterStrength: dm, usefulGod, specialPoints, fortune,
  });
  const lifeTraps = detectLifeTraps({
    pillars: pillarsRes.pillars,
    tenGods, elements,
    dayMasterStrength: dm, usefulGod, specialPoints, fortune,
    userContext: normalized.context,
  });
  const fortuneTriggers = analyzeFortuneTriggers({
    pillars: pillarsRes.pillars,
    tenGods, elements,
    usefulGod, specialPoints,
    lifeWeapons, lifeTraps, fortune,
  });

  // ── 직업·환경·돈 / 타이밍 / 미래 시기 / Content Ledger ──
  const careerSpecificAnalysis = analyzeCareerSpecifics({
    pillars: pillarsRes.pillars, tenGods, elements,
    dayMasterStrength: dm, usefulGod, specialPoints, fortune,
    userContext: normalized.context,
  });
  const timingAnchors = generateTimingAnchors({
    pillars: pillarsRes.pillars, cycles, tenGods, usefulGod, specialPoints,
    userContext: normalized.context,
    currentYear: now.getFullYear(),
    birthYear: normalized.year,
  });
  const futureTimingAnalysis = analyzeFutureTiming({
    pillars: pillarsRes.pillars, cycles, tenGods, usefulGod, specialPoints,
    birthYear: normalized.year,
  });
  const contentLedger = buildContentLedger({
    identityKeywords, specialPoints, lifeWeapons, lifeTraps,
    fortuneTriggers, careerSpecificAnalysis, futureTimingAnalysis,
  });

  // ── GPT 입력·프롬프트 ──
  const gptInput = buildPersonalSajuGptInput({
    userContext: normalized.context,
    birthTimeConfidence: input.birthTimeConfidence,
    ruleConfig: DEFAULT_RULE_CONFIG,
    pillars: pillarsRes.pillars,
    tenGods, elements,
    dayMasterStrength: dm,
    usefulGod,
    combinationsAndConflicts: combConflicts,
    specialStars,
    specialPoints,
    identityKeywords,
    lifeWeapons,
    lifeTraps,
    fortuneTriggers,
    fortune,
    careerSpecificAnalysis,
    timingAnchors,
    futureTimingAnalysis,
    contentLedger,
  });

  const contextGuard = buildContextGuard(normalized.context, normalized.hourUnknown);
  if (pctx.calculationMeta) gptInput.calculationMeta = pctx.calculationMeta;
  const prompt = buildPersonalSajuPrompt({ input: gptInput, contextGuard });

  // ── GPT 호출 + 검증·repair 루프 ──
  let attempts = 0;
  let reportText = '';
  let validation: ReportValidationResult = { isValid: true, issues: [] };

  for (let i = 0; i <= maxAttempts; i++) {
    attempts++;
    reportText = await opts.callGpt(prompt);
    validation = validateReport({
      reportText,
      userContext: normalized.context,
      specialPoints,
      careerSpecificAnalysis,
    });
    if (validation.isValid) break;
    // repair: 같은 prompt에 검증 실패 issue를 알려주고 다시 호출
    const repairPrompt: BuiltPrompt = {
      system: prompt.system,
      user: prompt.user + `\n\n[이전 응답이 다음 규칙을 위반했다. 같은 구조로 다시 작성하되 위반 문장은 제거하라.]\n` +
        validation.issues.map(iss => `- (${iss.type}) "${iss.sentence}" — ${iss.reason}`).join('\n'),
    };
    // 다음 루프에서 repairPrompt 사용
    Object.assign(prompt, repairPrompt);
  }

  return { gptInput, prompt, reportText, validation, attempts };
}

// ============================================================
// 서사형(narrative) 리포트 — 카드형 대신 책처럼 읽히는 7섹션 줄글
// ============================================================

export interface NarrativeGenerateOptions {
  callGpt: NarrativeGptCaller;
  maxRepairAttempts?: number;
  now?: Date;
  /** 앞으로 3년 장 포함 여부 (기본 false — 별도 기능으로 분리될 수 있음) */
  includeFutureFlow?: boolean;
  /**
   * 2026-05 Narrative Depth v1 — 명리 구조 깊이 (신강/신약·신살·용신·개운).
   * 미지정 시 모두 false → 안정화 v0 결과와 동일 (rollback 안전망).
   */
  depthOptions?: NarrativeDepthOptions;
}

export interface NarrativeGenerateResult {
  gptInput: PersonalSajuGptInput;
  narrativePlans: NarrativePlanSet;
  topicCoverageMap: TopicCoverageMap;
  /** 2026-05: 별빛 키워드 카드 (개인사주 최상단 + SNS 공유) */
  starKeywordCard: StarKeywordCardData;
  prompt: BuiltNarrativePrompt;
  reportText: string;
  validation: NarrativeValidationResult;
  attempts: number;
  repairedSections: string[];
  /** All-mode Action Guide V1 — flag ON일 때만 채워짐. OFF면 undefined → 응답에서 키 누락(byte-identical). */
  actionGuideV1?: ActionGuide;
}

/**
 * 서사형 개인사주 리포트 생성.
 * 흐름: 분석 데이터 → 섹션별 NarrativePlan → 본문 생성 → coverage 검증 → 섹션별 repair.
 *
 * NarrativePlan은 결정론적으로 생성된다 (코드 단). GPT는 plan을 따라 본문을 작성하고,
 * validator는 plan.mustUseFacts.matchTokens가 본문에 흡수됐는지 검사.
 * 흡수되지 않은 fact가 있으면 그 섹션만 타겟팅해서 재작성.
 */
export async function generateNarrativePersonalSajuReport(
  input: BirthInput,
  opts: NarrativeGenerateOptions,
): Promise<NarrativeGenerateResult> {
  const now = opts.now ?? new Date();
  // 2026-05 sectionwise: 단일 호출 → 7섹션 병렬 호출로 전환.
  // 각 섹션 ~1.2k~1.8k tokens (8~12s) → Promise.all로 ~12s 내 완료.
  // 90s maxDuration 안에 repair 1회 추가해도 여유.
  const maxAttempts = opts.maxRepairAttempts ?? 1;

  // 기존 결정론 분석 그대로 재사용
  const gptInput = calculateAnalysisOnly(input, now);

  // TopicCoverageMap + LifeSceneHint → NarrativePlan
  const topicCoverageMap = buildTopicCoverageMap(gptInput);
  const lifeSceneHints = buildLifeSceneHints(gptInput);
  const narrativePlans = buildNarrativePlans(gptInput, lifeSceneHints, {
    includeFutureFlow: opts.includeFutureFlow ?? false,
    depthOptions: opts.depthOptions ?? DEFAULT_NARRATIVE_DEPTH_OPTIONS,
  });
  const starKeywordCard = buildStarKeywordCard(gptInput);

  const normalized = normalizeBirthInput(input, now);
  const contextGuard = buildContextGuard(normalized.context, normalized.hourUnknown);

  // 디버깅·호환용 — 기존 전체 prompt 한 번 빌드(섹션별 호출에 직접 사용하지 않음)
  const prompt = buildNarrativePersonalSajuPrompt({ input: gptInput, contextGuard, narrativePlans, topicCoverageMap });

  const repairedSections = new Set<string>();
  let attempts = 0;

  // ── 1) 섹션별 병렬 호출 ──
  attempts++;
  const sectionPrompts = narrativePlans.map((plan, i) => ({
    plan, headerIndex: i + 1,
    prompt: buildSectionPrompt({
      plan, headerIndex: i + 1,
      input: gptInput, contextGuard,
      allPlans: narrativePlans, topicCoverageMap,
    }),
    maxTokens: SECTION_MAX_TOKENS[plan.sectionId] ?? 1500,
  }));

  const uctx = {
    relationshipStatus: gptInput.userContext.relationshipStatus as string,
    hasChildren: gptInput.userContext.hasChildren,
  };
  let sectionTexts = await Promise.all(
    sectionPrompts.map(async sp => {
      const raw = await opts.callGpt(sp.prompt, { maxTokens: sp.maxTokens });
      // 응답 직후 sanitize 체인 (validator 실행 전)
      // 1) 영문 오행 키 → 한글
      // 2) unsupported user-context 단정 표현 → 중립
      // 3) (money 섹션 한정) financial-advice-risk 표현 → 안전한 수익화 표현
      let out = sanitizeNarrativeText(raw);
      out = sanitizeUnsupportedUserContext(out, uctx);
      if (sp.plan.sectionId === 'moneyMonetizationNarrative') {
        out = sanitizeFinancialAdviceRisk(out);
      }
      return out;
    })
  );

  let reportText = assembleSectionwiseReport(narrativePlans, sectionTexts);
  let validation = validateNarrativeReport({ reportText, gptInput, narrativePlans, topicCoverageMap });

  // ── 2) 섹션별 repair (실패 섹션만 재호출) ──
  for (let i = 0; !validation.isValid && i < maxAttempts; i++) {
    attempts++;
    const failingSections = collectFailingSectionsFromIssues(validation.issues);
    if (failingSections.size === 0) break; // global-only 이슈 → repair 불가능, 결과 그대로 반환

    // 실패 섹션을 plan index와 매칭하여 그 섹션만 단일 호출 재실행
    const newSectionTexts = [...sectionTexts];
    await Promise.all(
      narrativePlans.map(async (plan, idx) => {
        if (!failingSections.has(plan.sectionId)) return;
        repairedSections.add(plan.sectionId);
        const sp = sectionPrompts[idx];
        // repair prompt — 동일 prompt에 이전 응답 + 이슈 안내 추가
        const sectionIssues = validation.issues.filter(it =>
          String(it.sectionId).split(',').map(s => s.trim()).includes(plan.sectionId) ||
          String(it.sectionId) === 'global'
        );
        // violation-specific 절대 규칙 헤더 (영문 오행 / 미래 단어 / 금융 조언 등)
        const hasEnglishLeak = sectionIssues.some(i => i.type === 'english-element-key-leak');
        const hasFutureLeak = sectionIssues.some(i => i.type === 'future-leak');
        const hasFinancialRisk = sectionIssues.some(i => i.type === 'financial-advice-risk');
        const violationRules: string[] = ['[절대 규칙 — 이번 repair에서 반드시 준수]'];
        if (hasEnglishLeak) violationRules.push(
          '- 이 섹션에서 wood/fire/earth/metal/water 절대 출력 금지. 반드시 목/화/토/금/수만.'
        );
        if (hasFutureLeak) violationRules.push(
          '- 2026년/2027년/2028년/앞으로 3년/향후 3년/다음 3년/세운/미래 흐름 절대 사용 금지.'
        );
        // money 섹션은 financial-advice-risk 발생 여부와 무관하게 항상 절대규칙 prepend
        if (hasFinancialRisk || plan.sectionId === 'moneyMonetizationNarrative') {
          violationRules.push(
            '- 투자/거래/매수/매도/시세/수익률/시장 타이밍/가격 흐름/큰돈을 굴린다/트레이딩/단기 투자/주식/코인/베팅/레버리지처럼 금융 조언으로 읽히는 표현 절대 금지.',
            '- 돈 파트는 투자 조언이 아니라 수익화 구조·가격 정책·계약 조건·작업 범위·정산 기준 중심으로 작성할 것.',
            '- 사용자의 자산 운용 결정을 유도하지 말 것.',
          );
        }
        const repairPrompt: BuiltNarrativePrompt = {
          system: sp.prompt.system,
          user: violationRules.join('\n') + '\n\n' + sp.prompt.user
            + `\n\n[이전 응답이 다음 검증을 위반함. 동일 섹션을 위반 부분만 수정해 다시 작성.]\n`
            + sectionIssues.slice(0, 6).map(iss => `- (${iss.type}/${iss.severity}) "${iss.sentence}" — ${iss.reason} → 제안: ${iss.suggestion}`).join('\n'),
        };
        const raw = await opts.callGpt(repairPrompt, { maxTokens: sp.maxTokens });
        let out = sanitizeNarrativeText(raw);
        out = sanitizeUnsupportedUserContext(out, uctx);
        if (plan.sectionId === 'moneyMonetizationNarrative') {
          out = sanitizeFinancialAdviceRisk(out);
        }
        newSectionTexts[idx] = out;
      })
    );
    sectionTexts = newSectionTexts;
    reportText = assembleSectionwiseReport(narrativePlans, sectionTexts);
    validation = validateNarrativeReport({ reportText, gptInput, narrativePlans, topicCoverageMap });
  }

  // ── 3) Final deterministic fallback ──
  // repair 이후에도 high가 남으면 마지막 안전망: sanitizer 한 번 더 + 미래 단어 제거 + 재검증
  if (!validation.isValid && validation.issues.some(i => i.severity === 'high')) {
    const stripFuture = !narrativePlans.some(p => p.sectionId === 'futureFlowNarrative');
    // 2026-05 audit: user-context sanitize + financial-advice-risk sanitize도 final fallback에 포함
    reportText = applyFinalSanitizers(reportText, { stripFuture, userContext: uctx, sanitizeFinancial: true });
    validation = validateNarrativeReport({ reportText, gptInput, narrativePlans, topicCoverageMap });
  }

  // ── All-mode Action Guide V1 (flag ON일 때만 1회 추가 호출) ──
  // 메인 리포트와 독립. 실패해도 null → 미부착(기존 결과 무영향).
  let actionGuideV1: ActionGuide | undefined;
  if (isPersonalActionGuideEnabled()) {
    const ev = buildPersonalActionGuideEvidence(gptInput);
    const personalSanitize = (t: string) => {
      let out = sanitizeNarrativeText(t);
      out = sanitizeUnsupportedUserContext(out, uctx);
      out = sanitizeFinancialAdviceRisk(out);
      return out;
    };
    actionGuideV1 = (await generateActionGuide(
      ev,
      (sys, usr, mt) => opts.callGpt({ system: sys, user: usr }, { maxTokens: mt }),
      { sanitize: personalSanitize },
    )) ?? undefined;
  }

  return { gptInput, narrativePlans, topicCoverageMap, starKeywordCard, prompt, reportText, validation, attempts, repairedSections: Array.from(repairedSections), actionGuideV1 };
}

// ============================================================
// 섹션별 응답을 reportText로 조립
// GPT가 응답 시작에 # N. 헤더를 출력하도록 prompt에 지시했지만,
// 누락 시 자동 prepend로 정합성 보장.
// ============================================================
function assembleSectionwiseReport(plans: NarrativePlanSet, texts: string[]): string {
  const SECTION_TITLES_LOCAL: Record<string, string> = {
    openingDefinition: '이 사주를 한 문장으로 말하면',
    lifeStructureNarrative: '당신이 이런 방식으로 살아온 이유',
    repeatedPatternNarrative: '반복해서 찾아오는 삶의 패턴',
    careerTalentNarrative: '일과 재능: 어떤 역할에서 실력이 살아나는가',
    moneyMonetizationNarrative: '돈과 수익화: 어떤 방식으로 돈이 붙는가',
    relationshipLoveNarrative: '관계와 연애: 어떤 사람에게 마음이 열리고 닫히는가',
    futureFlowNarrative: '앞으로 3년, 어떤 판이 열릴까',
    finalStrategyNarrative: '결국 이 사주는 이렇게 써야 해요',
  };
  return plans.map((p, i) => {
    const body = (texts[i] ?? '').trim();
    if (!body) {
      // 빈 응답이면 placeholder 헤더만 두어 parser가 정렬 유지
      return `# ${i + 1}. ${SECTION_TITLES_LOCAL[p.sectionId] ?? p.sectionId}\n\n`;
    }
    if (/^#\s*\d/.test(body)) return body;
    return `# ${i + 1}. ${SECTION_TITLES_LOCAL[p.sectionId] ?? p.sectionId}\n\n${body}`;
  }).join('\n\n');
}

/**
 * 섹션별 repair 프롬프트 빌더 — 실패 섹션만 다시 쓰고 나머지는 verbatim 유지.
 * 같은 7-섹션 구조를 그대로 출력하되 failing 섹션은 mustUseFacts를 다시 흡수하도록 강제.
 */
function buildSectionRepairPrompt(args: {
  basePrompt: BuiltNarrativePrompt;
  previousReport: string;
  failingSectionIds: string[];
  issues: NarrativeValidationResult['issues'];
  narrativePlans: NarrativePlanSet;
}): BuiltNarrativePrompt {
  const { basePrompt, previousReport, failingSectionIds, issues } = args;

  // 섹션별로 이슈 그룹핑
  const issuesBySection = new Map<string, typeof issues>();
  for (const iss of issues) {
    for (const sid of String(iss.sectionId).split(',').map(s => s.trim())) {
      if (!sid) continue;
      const arr = issuesBySection.get(sid) ?? [];
      arr.push(iss);
      issuesBySection.set(sid, arr);
    }
  }

  const sectionIssueBlocks = failingSectionIds.map(sid => {
    const list = issuesBySection.get(sid) ?? [];
    if (list.length === 0) return `### ${sid}\n(이슈 없음 — coverage 강화)`;
    const lines = list.slice(0, 10).map(iss =>
      `  - (${iss.type}/${iss.severity}) "${iss.sentence}" — ${iss.reason}\n      제안: ${iss.suggestion}`
    ).join('\n');
    return `### ${sid}\n${lines}`;
  }).join('\n\n');

  const repairUser =
    `[섹션별 repair — 이전 응답을 다시 작성한다]\n\n` +
    `규칙:\n` +
    `1) 7개 섹션 헤더(# 1. ~ # 7.) 구조를 정확히 같게 유지.\n` +
    `2) 아래 "다시 써야 할 섹션" 목록의 섹션만 본문을 다시 작성. 그 섹션은 NarrativePlan.mustUseFacts를 빠짐없이 흡수하고 requiredBeats 순서대로 풀어쓸 것.\n` +
    `3) 그 외 섹션의 본문은 이전 응답에서 그대로 가져와 출력 (글자 한 자라도 바꾸지 말 것).\n` +
    `4) 카드/리스트로 회귀 금지. 항목형 표현("실제 장면:", "추천 직업군:" 등) 금지.\n` +
    `5) 새 사주/십성/신살을 만들어내지 말 것. NarrativePlan의 fact만 사용.\n\n` +
    `다시 써야 할 섹션:\n` +
    sectionIssueBlocks + `\n\n` +
    `[이전 응답 전체 — 위 섹션만 다시 작성하고 나머지는 그대로]\n` +
    '```\n' + previousReport + '\n```';

  return {
    system: basePrompt.system,
    user: basePrompt.user + '\n\n' + repairUser,
  };
}
