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
import { validateNarrativeReport } from './narrative/narrativeReportValidator';
import type { NarrativeValidationResult } from './narrative/narrativeTypes';
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
  prompt: BuiltNarrativePrompt;
  reportText: string;
  validation: NarrativeValidationResult;
  attempts: number;
}

/**
 * 서사형 개인사주 리포트 생성.
 * 분석 데이터(계산 + careerSpecificAnalysis + timingAnchors + futureTimingAnalysis 등)는
 * calculateAnalysisOnly가 만든 PersonalSajuGptInput을 그대로 재사용한다.
 * 다른 점은 prompt(narrative)와 validator(narrative)뿐.
 */
export async function generateNarrativePersonalSajuReport(
  input: BirthInput,
  opts: NarrativeGenerateOptions,
): Promise<NarrativeGenerateResult> {
  const now = opts.now ?? new Date();
  const maxAttempts = opts.maxRepairAttempts ?? 1;

  // 기존 결정론 분석 그대로 재사용
  const gptInput = calculateAnalysisOnly(input, now);

  // contextGuard 입력에는 NormalizedBirth.context(ageYears 등) 필요 — 다시 normalize
  const normalized = normalizeBirthInput(input, now);
  const contextGuard = buildContextGuard(normalized.context, normalized.hourUnknown);
  const prompt = buildNarrativePersonalSajuPrompt({ input: gptInput, contextGuard });

  let attempts = 0;
  let reportText = '';
  let validation: NarrativeValidationResult = { isValid: true, issues: [] };
  let currentPrompt = prompt;

  for (let i = 0; i <= maxAttempts; i++) {
    attempts++;
    reportText = await opts.callGpt(currentPrompt);
    validation = validateNarrativeReport({ reportText, gptInput });
    if (validation.isValid) break;
    // repair: 같은 system 유지, user에 위반 issue 추가하여 재호출
    currentPrompt = {
      system: prompt.system,
      user: prompt.user
        + `\n\n[이전 응답이 다음 narrative 검증을 위반했다. 같은 7섹션 구조 유지하면서 위반 부분만 수정해 다시 작성하라. 카드/리스트로 회귀 금지, 항목형 표현 줄이기, 같은 조언 반복 금지.]\n`
        + validation.issues.slice(0, 12).map(iss => `- (${iss.type}, ${iss.severity}) "${iss.sentence}" — ${iss.reason} → 제안: ${iss.suggestion}`).join('\n'),
    };
  }

  return { gptInput, prompt, reportText, validation, attempts };
}
