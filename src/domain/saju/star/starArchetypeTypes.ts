// 별빛 사주 — Star Archetype 타입 (2026-05).
// "~~~한 별" 형태의 brand archetype. LLM 자유 생성이 아니라 코드 카탈로그에서 선택.

export type StarArchetypeEvidenceSource =
  | 'dayMaster'
  | 'elementStrength'
  | 'tenGods'
  | 'specialStars'
  | 'lifeWeapons'
  | 'lifeTraps'
  | 'relationshipPattern'
  | 'moneyMakingStyle';

export interface StarArchetypeEvidence {
  source: StarArchetypeEvidenceSource;
  description: string;
}

export interface StarArchetype {
  id: string;
  /** 반드시 "~~~한 별" 형태로 끝남 */
  title: string;
  subtitle: string;
  keywords: string[];
  shortDescription: string;
  brightSide: string;
  shadowSide: string;
  growthDirection: string;
  /** 이 아키타입을 선택하게 만들 시그널 (selector가 matchTokens로 검사) */
  triggerSignals: string[];
  /** 이 아키타입을 쓰면 안 되는 조건 */
  avoidSignals?: string[];
  /** 사후 evidence — selector가 채움 */
  evidence: StarArchetypeEvidence[];
}

// ============================================================
// Selector scoring 결과 (디버깅·정렬용. 사용자에게 노출 X)
// ============================================================
export interface StarArchetypeScore {
  archetypeId: string;
  score: number;
  matchedSignals: string[];
  blockedBy?: string[];
}

// ============================================================
// 사용자에게 보여지는 카드 데이터 (API 응답·렌더링용)
// ============================================================
export interface StarKeywordCardData {
  serviceName: '별빛 사주';
  label: '별빛 키워드';
  titleLead: '당신은';
  archetype: StarArchetype;
  displayTitle: string;
  shortDescription: string;
  brightSide: string;
  shadowSide: string;
  keywords: string[];
  hashtag: '#별빛사주';
  /** 개인 변주 — 일간 비유 기반 리드 문구. 같은 아키타입이어도 사람마다 다르게 보이게 함.
   *  예: "큰 나무 같은 당신은". 카드 상단 titleLead 자리를 대체(없으면 기본 "당신은"). */
  personalLead?: string;
}

// ============================================================
// Validator 결과
// ============================================================
export type StarValidationIssueType =
  | 'title-format-violation'      // "~~~한 별" 형태 위반
  | 'banned-phrase'               // 금지 표현 (과장/희소성/낙인)
  | 'description-too-long'        // 설명 과도하게 김
  | 'description-too-short'       // 너무 짧아 카드 못 채움
  | 'keyword-count-out-of-range'  // 키워드 수가 3~5 범위 밖
  | 'shadow-too-negative';        // 그림자가 지나치게 부정적

export interface StarValidationIssue {
  type: StarValidationIssueType;
  field: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface StarValidationResult {
  isValid: boolean;
  issues: StarValidationIssue[];
}
