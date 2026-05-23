// 궁합 GPT 입력 JSON 빌더.
// PersonalSajuGptInput에서 GPT가 필요한 핵심 필드만 추려 사이즈를 줄임.

import type {
  CompatibilityGptInput, CompatibilityAnalysisBundle,
  RelationshipType, PersonForCompat, RelationshipQuestion,
} from '../compatibilityTypes';
import type { PersonalSajuGptInput, ContentLedgerEntry } from '../../report/sajuReportSchema';

interface Args {
  relationshipType: RelationshipType;
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
  compatibilityAnalysis: CompatibilityAnalysisBundle;
  relationshipQuestions: RelationshipQuestion[];
  contentLedger: ContentLedgerEntry[];
}

function trimPerson(p: PersonalSajuGptInput, label: 'A' | 'B'): PersonForCompat {
  return {
    label,
    userContext: p.userContext,
    birthChart: p.birthChart,
    coreAnalysis: p.coreAnalysis,
    currentDaewoon: p.fortune.currentDaewoon,
    nextThreeYears: p.fortune.nextThreeYears,
  };
}

export function buildCompatibilityGptInput(args: Args): CompatibilityGptInput {
  return {
    relationshipType: args.relationshipType,
    personA: trimPerson(args.personA, 'A'),
    personB: trimPerson(args.personB, 'B'),
    compatibilityAnalysis: args.compatibilityAnalysis,
    relationshipQuestions: args.relationshipQuestions,
    contentLedger: args.contentLedger,
    constraints: {
      noScores: true,
      doNotInvent: true,
      avoidGenericAdvice: true,
      avoidFearMarketing: true,
      avoidDeterministicRelationshipClaims: true,
      doNotAssertOtherPersonFeelings: true,
      avoidManipulativeAdvice: true,
      mustRespectRelationshipType: true,
      mustExplainTermsSimply: true,
    },
  };
}
