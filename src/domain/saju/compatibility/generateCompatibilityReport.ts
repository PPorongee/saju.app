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
import { isCompatYongsinDiagnosticEnabled } from '../report/yongsinDiagnosticFlag';
import { renderYongsinDiagnosticGuidance } from '../report/yongsinDiagnosticGuidance';
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

  // P6: 궁합 diagnostic (별도 flag, 기본 OFF). flag OFF면 prompt 무변경.
  // A/B 각각의 개인 진단을 분리해 prompt.system에 curated 지침만 append (gpt-input/빌더·raw 미노출).
  let compatGuidance: string | null = null;
  if (isCompatYongsinDiagnosticEnabled()) {
    const diagA = calculateAnalysisOnly(inputA, now, { forceAttachDiagnostic: true }).yongsinDiagnostic;
    const diagB = calculateAnalysisOnly(inputB, now, { forceAttachDiagnostic: true }).yongsinDiagnostic;
    const blocks: string[] = [];
    if (diagA) blocks.push(renderYongsinDiagnosticGuidance(diagA, { mode: 'compat', personLabel: 'A(첫 번째 사람)' }));
    if (diagB) blocks.push(renderYongsinDiagnosticGuidance(diagB, { mode: 'compat', personLabel: 'B(두 번째 사람)' }));
    if (blocks.length > 0) {
      compatGuidance = blocks.join('\n\n');
      prompt.system = `${prompt.system}\n\n${compatGuidance}`;
    }
  }

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
    if (compatGuidance) currentPrompt.system = `${currentPrompt.system}\n\n${compatGuidance}`;
  }

  return { gptInput, reportText, validation, attempts };
}
