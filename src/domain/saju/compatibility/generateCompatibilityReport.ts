// 궁합 v4 메인 함수 — 두 사람의 BirthInput + 관계 유형 → 궁합 리포트.
//
// 흐름:
//   personA = calculateAnalysisOnly(inputA)
//   personB = calculateAnalysisOnly(inputB)
//   compatAnalysis = composeCompatibilityAnalysis(A, B, type)
//   gptInput = build...
//   prompt = build...
//   reportText = await callGpt(prompt)
//   validation = validate...
//   if invalid: repair 1회

import type { BirthInput } from '../calendar/normalizeBirthInput';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { composeCompatibilityAnalysis } from './compatibilityAnalyzer';
import { buildRelationshipQuestions } from './questions/relationshipQuestionBuilder';
import { buildCompatibilityContentLedger } from './report/compatibilityContentLedger';
import { buildCompatibilityGptInput } from './report/compatibilityGptInputBuilder';
import { buildCompatibilityPrompt, type BuiltCompatibilityPrompt } from './report/compatibilityPromptBuilder';
import { validateCompatibilityReport } from './report/compatibilityReportValidator';
import { buildCompatibilityRepairPrompt } from './report/compatibilityRepairPromptBuilder';
import type {
  RelationshipType, CompatibilityGptInput, CompatibilityReportResult,
} from './compatibilityTypes';

export type CompatibilityGptCaller = (prompt: BuiltCompatibilityPrompt) => Promise<string>;

export interface GenerateCompatibilityOptions {
  callGpt: CompatibilityGptCaller;
  maxRepairAttempts?: number;
  now?: Date;
}

/**
 * 결정론 분석만 — GPT 호출 X. preview endpoint에서 즉시 응답용.
 */
export function calculateCompatibilityAnalysisOnly(
  inputA: BirthInput,
  inputB: BirthInput,
  relationshipType: RelationshipType,
  now: Date = new Date(),
): CompatibilityGptInput {
  const personA = calculateAnalysisOnly(inputA, now);
  const personB = calculateAnalysisOnly(inputB, now);
  const compatibilityAnalysis = composeCompatibilityAnalysis(personA, personB, relationshipType);
  const relationshipQuestions = buildRelationshipQuestions(relationshipType);
  const contentLedger = buildCompatibilityContentLedger();
  return buildCompatibilityGptInput({
    relationshipType, personA, personB,
    compatibilityAnalysis, relationshipQuestions, contentLedger,
  });
}

export async function generateCompatibilityReport(
  inputA: BirthInput,
  inputB: BirthInput,
  relationshipType: RelationshipType,
  opts: GenerateCompatibilityOptions,
): Promise<CompatibilityReportResult> {
  const now = opts.now ?? new Date();
  const maxAttempts = opts.maxRepairAttempts ?? 1;

  const gptInput = calculateCompatibilityAnalysisOnly(inputA, inputB, relationshipType, now);
  const prompt = buildCompatibilityPrompt(gptInput);

  let attempts = 0;
  let reportText = '';
  let validation = { isValid: true, issues: [] } as ReturnType<typeof validateCompatibilityReport>;
  let currentPrompt = prompt;

  for (let i = 0; i <= maxAttempts; i++) {
    attempts++;
    reportText = await opts.callGpt(currentPrompt);
    validation = validateCompatibilityReport({ reportText, gptInput });
    if (validation.isValid) break;
    // repair
    currentPrompt = buildCompatibilityRepairPrompt({
      previousReport: reportText,
      issues: validation.issues,
      gptInput,
      originalPrompt: prompt,
    });
  }

  return { gptInput, reportText, validation, attempts };
}
