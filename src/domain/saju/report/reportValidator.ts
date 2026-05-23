// 리포트 검증 (spec §15 + v2)
// genericSentenceFilter + repetitionQualityChecker.
// isValid=false이면 repair 단계가 호출된다.

import type {
  ReportValidationResult, SpecialPoint, CareerSpecificAnalysis,
} from './sajuReportSchema';
import { filterGenericSentences } from './genericSentenceFilter';
import { checkRepetitionAndQuality } from './repetitionQualityChecker';
import type { UserContext } from '../calendar/normalizeBirthInput';

export interface ValidateReportArgs {
  reportText: string;
  userContext: UserContext;
  specialPoints: SpecialPoint[];
  careerSpecificAnalysis: CareerSpecificAnalysis;
}

export function validateReport(args: ValidateReportArgs): ReportValidationResult {
  const generic = filterGenericSentences({
    reportText: args.reportText,
    userContext: args.userContext,
    specialPoints: args.specialPoints,
  });
  const repAndQuality = checkRepetitionAndQuality({
    reportText: args.reportText,
    careerSpecificAnalysis: args.careerSpecificAnalysis,
  });
  const issues = [...generic, ...repAndQuality];
  // high severity 1개 이상 또는 medium severity 5개 이상이면 invalid
  const highCount   = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  return {
    isValid: highCount === 0 && mediumCount < 5,
    issues,
  };
}
