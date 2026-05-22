// PersonalSajuGptInput JSON 빌더 (spec §11).
// 모든 분석 결과를 GPT에 전달할 형태로 직렬화.

import type { PersonalSajuGptInput } from './sajuReportSchema';
import type { FourPillars } from '../calendar/pillarCalculator';
import type { UserContext } from '../calendar/normalizeBirthInput';
import type {
  TenGodAnalysis, ElementStrengthAnalysis, DayMasterStrengthAnalysis,
  UsefulGodAnalysis, CombinationsAndConflicts, SpecialStarInfo,
  SpecialPoint, FortuneCycleInfo,
} from './sajuReportSchema';
import type { RuleConfig } from '../rules/ruleConfig';

export function buildPersonalSajuGptInput(args: {
  userContext: UserContext;
  birthTimeConfidence: 'exact' | 'approximate' | 'unknown';
  ruleConfig: RuleConfig;
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  usefulGod: UsefulGodAnalysis;
  combinationsAndConflicts: CombinationsAndConflicts;
  specialStars: SpecialStarInfo[];
  specialPoints: SpecialPoint[];
  fortune: FortuneCycleInfo;
}): PersonalSajuGptInput {
  const { userContext, pillars } = args;
  return {
    userContext: {
      age: userContext.ageYears,
      gender: userContext.gender,
      relationshipStatus: userContext.relationshipStatus,
      hasChildren: userContext.hasChildren,
      occupation: userContext.occupation,
      currentConcerns: userContext.currentConcerns,
      birthTimeConfidence: args.birthTimeConfidence,
    },
    ruleConfig: args.ruleConfig,
    birthChart: {
      year:  pillars.year.stem  + pillars.year.branch,
      month: pillars.month.stem + pillars.month.branch,
      day:   pillars.day.stem   + pillars.day.branch,
      hour:  pillars.hour ? pillars.hour.stem + pillars.hour.branch : undefined,
      dayMaster: pillars.dayMaster,
      isHourEstimated: pillars.isHourEstimated,
    },
    coreAnalysis: {
      elementStrength: args.elements,
      tenGods: args.tenGods,
      dayMasterStrength: args.dayMasterStrength,
      usefulGod: args.usefulGod,
      combinationsAndConflicts: args.combinationsAndConflicts,
      specialStars: args.specialStars,
    },
    specialPoints: args.specialPoints,
    fortune: args.fortune,
    constraints: {
      doNotInvent: true,
      avoidGenericAdvice: true,
      avoidFearMarketing: true,
      avoidMedicalLegalFinancialCertainty: true,
      mustRespectUserContext: true,
      mustExplainTermsSimply: true,
    },
  };
}
