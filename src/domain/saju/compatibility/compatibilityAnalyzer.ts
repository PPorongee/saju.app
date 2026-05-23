// 궁합 분석 합성기 — 두 사람 PersonalSajuGptInput을 받아 CompatibilityAnalysisBundle 생성.

import type {
  CompatibilityAnalysisBundle, RelationshipType,
} from './compatibilityTypes';
import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import { analyzeDayMasterRelation } from './interaction/dayMasterRelationAnalyzer';
import { analyzeSpousePalaceRelation } from './interaction/spousePalaceRelationAnalyzer';
import { analyzeElementComplement } from './interaction/elementComplementAnalyzer';
import { analyzeTenGodInteraction } from './interaction/tenGodInteractionAnalyzer';
import { analyzeUsefulGodInteraction } from './interaction/usefulGodInteractionAnalyzer';
import { analyzeCompatibilityCombinationConflict } from './interaction/combinationConflictAnalyzer';
import { analyzeAttraction } from './layers/attractionLayer';
import { analyzeConflict } from './layers/conflictLayer';
import { analyzeRecovery } from './layers/recoveryLayer';
import { analyzeStability } from './layers/stabilityLayer';
import { analyzeRelationshipTiming } from './layers/timingLayer';
import {
  buildRelationshipKeywords, buildRelationshipStrengths,
  buildRelationshipRisks, buildRelationshipChoices,
} from './layers/strategyLayer';
import { selectRelationshipArchetype } from './archetype/relationshipArchetypeSelector';

export function composeCompatibilityAnalysis(
  personA: PersonalSajuGptInput,
  personB: PersonalSajuGptInput,
  relationshipType: RelationshipType,
): CompatibilityAnalysisBundle {
  const dayMasterRelation     = analyzeDayMasterRelation({ personA, personB });
  const spousePalaceRelation  = analyzeSpousePalaceRelation({ personA, personB });
  const elementComplement     = analyzeElementComplement({ personA, personB });
  const tenGodInteraction     = analyzeTenGodInteraction({ personA, personB });
  const usefulGodInteraction  = analyzeUsefulGodInteraction({ personA, personB });
  const combinationConflicts  = analyzeCompatibilityCombinationConflict({ personA, personB });

  const attractionAnalysis = analyzeAttraction({
    personA, personB, dayMasterRelation, spousePalaceRelation,
    elementComplement, tenGodInteraction, usefulGodInteraction, relationshipType,
  });
  const conflictAnalysis = analyzeConflict({
    personA, personB, spousePalaceRelation, tenGodInteraction,
    usefulGodInteraction, relationshipType,
  });
  const recoveryAnalysis = analyzeRecovery({
    personA, personB, tenGodInteraction, conflictAnalysis, relationshipType,
  });
  const stabilityAnalysis = analyzeStability({
    personA, personB, elementComplement, spousePalaceRelation,
    conflictAnalysis, recoveryAnalysis, relationshipType,
  });
  const futureFlow = analyzeRelationshipTiming({ personA, personB, relationshipType });

  const relationshipArchetype = selectRelationshipArchetype({
    attractionAnalysis, conflictAnalysis, recoveryAnalysis, stabilityAnalysis,
    spousePalaceRelation, elementComplement, tenGodInteraction,
    usefulGodInteraction, relationshipType,
  });

  const relationshipKeywords  = buildRelationshipKeywords({
    attractionAnalysis, conflictAnalysis, recoveryAnalysis, stabilityAnalysis,
    archetype: relationshipArchetype, relationshipType,
  });
  const relationshipStrengths = buildRelationshipStrengths({
    elementComplement, spousePalaceRelation, tenGodInteraction, usefulGodInteraction,
    stabilityAnalysis, conflictAnalysis, recoveryAnalysis, relationshipType,
  });
  const relationshipRisks     = buildRelationshipRisks({
    elementComplement, spousePalaceRelation, tenGodInteraction, usefulGodInteraction,
    stabilityAnalysis, conflictAnalysis, recoveryAnalysis, relationshipType,
  });
  const relationshipChoices   = buildRelationshipChoices({
    archetype: relationshipArchetype, conflictAnalysis,
    recoveryAnalysis, stabilityAnalysis, relationshipType,
  });

  return {
    dayMasterRelation, spousePalaceRelation, elementComplement,
    tenGodInteraction, usefulGodInteraction, combinationConflicts,
    attractionAnalysis, conflictAnalysis, recoveryAnalysis, stabilityAnalysis,
    relationshipArchetype, relationshipKeywords,
    relationshipStrengths, relationshipRisks, relationshipChoices,
    futureFlow,
  };
}
