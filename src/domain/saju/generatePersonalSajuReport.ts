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
import { analyzeTenGods } from './analysis/tenGodAnalyzer';
import { analyzeElementStrength } from './analysis/elementStrengthAnalyzer';
import { analyzeDayMasterStrength } from './analysis/dayMasterStrengthAnalyzer';
import { analyzeStructure } from './analysis/structureAnalyzer';
import { analyzeUsefulGod } from './analysis/usefulGodAnalyzer';
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
import { buildNarrativePersonalSajuPrompt, type BuiltNarrativePrompt } from './narrative/narrativePromptBuilder';
import { validateNarrativeReport, collectFailingSectionsFromIssues } from './narrative/narrativeReportValidator';
import { buildNarrativePlans } from './narrative/narrativePlanBuilder';
import type { NarrativeValidationResult, NarrativePlanSet } from './narrative/narrativeTypes';
import { DEFAULT_RULE_CONFIG } from './rules/ruleConfig';
import type { PersonalSajuGptInput, ReportValidationResult, SpecialPoint } from './report/sajuReportSchema';

/** 외부 LLM 호출 어댑터 — OpenAI/Claude 등 wire-up은 외부. */
export type GptCaller = (prompt: BuiltPrompt) => Promise<string>;

/** 서사형(narrative) LLM 호출 어댑터 — 같은 {system,user} 구조 사용. */
export type NarrativeGptCaller = (prompt: BuiltNarrativePrompt) => Promise<string>;

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
export function calculateAnalysisOnly(input: BirthInput, now: Date = new Date()): PersonalSajuGptInput {
  const normalized = normalizeBirthInput(input, now);
  const pillarsRes = calculatePillars(normalized);
  const tenGods    = analyzeTenGods(pillarsRes.pillars);
  const elements   = analyzeElementStrength(pillarsRes.pillars);
  const dm         = analyzeDayMasterStrength(pillarsRes.pillars, tenGods, elements);
  const structure  = analyzeStructure(pillarsRes.pillars, tenGods, elements);
  const usefulGod  = analyzeUsefulGod({ pillars: pillarsRes.pillars, tenGods, elements, dayMasterStrength: dm, structure });
  const specialStars   = analyzeSpecialStars(pillarsRes.pillars);
  const combConflicts  = analyzeCombinationsAndConflicts(pillarsRes.pillars);
  const cycles  = calculateFortuneCycles(normalized, pillarsRes.pillars, now.getFullYear());
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

  return buildPersonalSajuGptInput({
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
}

export async function generatePersonalSajuReport(
  input: BirthInput,
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const now = opts.now ?? new Date();
  const maxAttempts = opts.maxRepairAttempts ?? 1;

  // ── 결정론적 계산 파이프라인 ──
  const normalized = normalizeBirthInput(input, now);
  const pillarsRes = calculatePillars(normalized);
  const tenGods    = analyzeTenGods(pillarsRes.pillars);
  const elements   = analyzeElementStrength(pillarsRes.pillars);
  const dm         = analyzeDayMasterStrength(pillarsRes.pillars, tenGods, elements);
  const structure  = analyzeStructure(pillarsRes.pillars, tenGods, elements);
  const usefulGod  = analyzeUsefulGod({ pillars: pillarsRes.pillars, tenGods, elements, dayMasterStrength: dm, structure });
  const specialStars   = analyzeSpecialStars(pillarsRes.pillars);
  const combConflicts  = analyzeCombinationsAndConflicts(pillarsRes.pillars);
  const cycles  = calculateFortuneCycles(normalized, pillarsRes.pillars, now.getFullYear());
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
}

export interface NarrativeGenerateResult {
  gptInput: PersonalSajuGptInput;
  narrativePlans: NarrativePlanSet;
  prompt: BuiltNarrativePrompt;
  reportText: string;
  validation: NarrativeValidationResult;
  attempts: number;
  /** 섹션별 repair가 일어났다면 어떤 섹션들이 재작성됐는지 (디버깅용) */
  repairedSections: string[];
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
  const maxAttempts = opts.maxRepairAttempts ?? 1;

  // 기존 결정론 분석 그대로 재사용
  const gptInput = calculateAnalysisOnly(input, now);

  // 섹션별 이야기 계획 (결정론적 — gptInput만으로 plan 6개)
  const narrativePlans = buildNarrativePlans(gptInput);

  // contextGuard 입력에는 NormalizedBirth.context(ageYears 등) 필요 — 다시 normalize
  const normalized = normalizeBirthInput(input, now);
  const contextGuard = buildContextGuard(normalized.context, normalized.hourUnknown);
  const prompt = buildNarrativePersonalSajuPrompt({ input: gptInput, contextGuard, narrativePlans });

  let attempts = 0;
  const repairedSections = new Set<string>();
  let reportText = '';
  let validation: NarrativeValidationResult = { isValid: true, issues: [] };

  // 1) 초기 전체 호출
  attempts++;
  reportText = await opts.callGpt(prompt);
  validation = validateNarrativeReport({ reportText, gptInput, narrativePlans });

  // 2) 섹션별 repair loop
  for (let i = 0; !validation.isValid && i < maxAttempts; i++) {
    attempts++;
    const failingSections = collectFailingSectionsFromIssues(validation.issues);

    // 섹션 격리가 불가능한 (global only) 케이스 → 기존 whole-report repair fallback
    if (failingSections.size === 0) {
      const repaired: BuiltNarrativePrompt = {
        system: prompt.system,
        user: prompt.user
          + `\n\n[이전 응답이 다음 검증을 위반했다. 같은 7섹션 구조 유지하면서 위반 부분만 수정해 다시 작성하라.]\n`
          + validation.issues.slice(0, 12).map(iss => `- (${iss.type}, ${iss.severity}) "${iss.sentence}" — ${iss.reason} → 제안: ${iss.suggestion}`).join('\n'),
      };
      reportText = await opts.callGpt(repaired);
      validation = validateNarrativeReport({ reportText, gptInput, narrativePlans });
      continue;
    }

    // 섹션 격리 가능 → buildSectionRepairPrompt로 실패 섹션만 타겟 재작성
    for (const sid of failingSections) repairedSections.add(sid);
    const repairPrompt = buildSectionRepairPrompt({
      basePrompt: prompt,
      previousReport: reportText,
      failingSectionIds: Array.from(failingSections),
      issues: validation.issues,
      narrativePlans,
    });
    reportText = await opts.callGpt(repairPrompt);
    validation = validateNarrativeReport({ reportText, gptInput, narrativePlans });
  }

  return { gptInput, narrativePlans, prompt, reportText, validation, attempts, repairedSections: Array.from(repairedSections) };
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
