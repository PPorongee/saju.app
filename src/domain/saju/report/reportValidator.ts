// 리포트 검증 (spec §15)
// genericSentenceFilter + 추가 정합성 검사.
// isValid=false이면 repair 단계가 호출된다.

import type { ReportValidationResult, SpecialPoint } from './sajuReportSchema';
import { filterGenericSentences } from './genericSentenceFilter';
import type { UserContext } from '../calendar/normalizeBirthInput';

export interface ValidateReportArgs {
  reportText: string;
  userContext: UserContext;
  specialPoints: SpecialPoint[];
}

export function validateReport(args: ValidateReportArgs): ReportValidationResult {
  const issues = filterGenericSentences({
    reportText: args.reportText,
    userContext: args.userContext,
    specialPoints: args.specialPoints,
  });
  const hasHigh = issues.some(i => i.severity === 'high');
  return {
    isValid: !hasHigh,
    issues,
  };
}
