// 서사형(narrative) 개인사주 리포트 타입.
// 기존 카드형 PersonalSajuReport와 별개. 8섹션 구조 (사주원국 + 6 narrative + 명리근거).

import type { ReportValidationResult } from '../report/sajuReportSchema';

export type NarrativeSectionId =
  | 'birthChartCard' | 'openingDefinition' | 'lifeStructureNarrative'
  | 'repeatedPatternNarrative'
  // 2026-05: 일/돈/관계 분리 (기존 realityActivationNarrative → 3장)
  | 'careerTalentNarrative' | 'moneyMonetizationNarrative' | 'relationshipLoveNarrative'
  // 옵션
  | 'futureFlowNarrative'
  | 'finalStrategyNarrative' | 'evidenceView';

export interface NarrativeBirthChartCard {
  pillars: string;             // "을해년 임오월 무술일 무오시"
  dayMaster: string;           // "무토"
  currentDaewoon: string;      // "병술"
  coreKeywords: string[];      // 3~5 짧은 단어
  usefulGodSummary?: string;   // "용신 수 (조후) / 기신 토"
}

export interface NarrativeSection {
  title: string;
  body: string;
  absorbedFrom: string[];      // 어떤 기존 데이터 소스를 흡수했는지 (감사용)
}

export interface NarrativeFutureSection extends NarrativeSection {
  yearlyFlow: Array<{ year: number; body: string }>;
}

export interface NarrativePersonalSajuReport {
  birthChartCard: NarrativeBirthChartCard;
  openingDefinition: NarrativeSection;          // "이 사주를 한 문장으로 말하면"
  lifeStructureNarrative: NarrativeSection;    // "당신이 이런 방식으로 살아온 이유"
  repeatedPatternNarrative: NarrativeSection;  // "반복해서 찾아오는 삶의 패턴"
  realityActivationNarrative: NarrativeSection;// "일·돈·관계에서 운이 살아나는 방식"
  futureFlowNarrative: NarrativeFutureSection; // "앞으로 3년, 어떤 판이 열릴까"
  finalStrategyNarrative: NarrativeSection;    // "결국 이 사주는 이렇게 써야 해요"
  evidenceView: {                              // "명리 근거 보기"
    title: string;
    data: unknown;                             // 원국·십성·오행 등 raw
  };
  validation: ReportValidationResult;
}

// Validator 결과
export type NarrativeValidationIssueType =
  | 'checklist-overuse'              // 항목형 표현 남발
  | 'repeated-theme-no-development'  // 같은 주제 반복만, 발전 없음
  | 'narrative-flow-break'           // 갑자기 카드/리스트로 튐
  | 'hidden-question-uncovered'      // 10가지 질문 중 누락된 답
  | 'concreteness-misplaced'         // 구체성이 잘못된 섹션에
  | 'generic'                        // 일반론
  | 'context-conflict'               // 사용자 상태 충돌
  | 'invented-claim'                 // JSON에 없는 명리 정보
  | 'fake-rarity'                    // 허위 희소성
  | 'tone-broken'                    // 친근 존댓말 위반
  // 2026-05 추가 — V4 정보량·구체성·명리 풀이 복원용
  | 'underdeveloped-section'         // 섹션이 너무 요약처럼 끝남
  | 'missing-required-data-source'   // requiredDataSources 누락
  | 'unexplained-technical-term'     // 명리 용어 등장 + 쉬운 풀이 없음
  | 'generic-opening'                // 1장 첫 문장이 일반론
  | 'weak-final-message'             // 7장 마지막 한 문장이 일반론
  | 'yearly-flow-too-similar'        // 2026/2027/2028 차이 없음
  | 'career-recommendation-too-narrow' // 직업군이 너무 좁거나 이유 부족
  | 'financial-advice-risk'          // 투자/거래 권유 톤
  | 'missing-narrative-fact'         // NarrativePlan.mustUseFacts가 본문에 흡수되지 않음
  | 'required-beat-missing'          // requiredBeats 중 검사 가능한 비트가 누락
  // 2026-05 (밀도/주제 커버리지 강화)
  | 'missing-topic-coverage'         // TopicCoverageMap의 필수 주제가 본문에 없음
  | 'missing-life-scene'             // 해석은 있는데 실제 장면이 부족
  | 'relationship-topic-missing'     // 관계/연애/장기 관계 스타일이 전혀 없음
  | 'family-early-topic-missing'     // 가족/초년 흐름이 전혀 없음
  | 'unsupported-user-context'       // userContext에 없는 혼인/자녀/직업/건강을 단정
  // 2026-05 (일/돈/관계 분리)
  | 'career-section-too-thin'        // 4장 직업·재능이 너무 얕음
  | 'money-section-too-thin'         // 5장 돈·수익화가 너무 얕음
  | 'relationship-section-too-thin'  // 6장 관계·연애가 너무 얕음
  | 'suggestion-coverage-missing'    // 구체 제안/조언이 부족 (설명만 있고 적용 가이드 없음)
  // 2026-05 stabilization
  | 'future-leak'                    // 미래 콘텐츠(2026/앞으로 3년)가 plan에 없는데 본문 등장
  | 'cross-section-leak'             // 한 섹션 본문에 다른 섹션 전용 결론조/주제 침범
  | 'final-section-missing'          // 결론 섹션이 비어있거나 너무 짧음
  | 'english-element-key-leak'       // 본문에 wood/fire/earth/metal/water 영문 노출
  // 2026-05 Narrative Depth v1 (모두 medium — high 기준은 기존 안정화 항목에만)
  | 'missing-strength-interpretation' // lifeStructureNarrative에 신강/신약/중화 해석 없음
  | 'missing-useful-god-advice'      // finalStrategyNarrative에 용신/기신이 행동 조언으로 연결 안 됨
  | 'special-star-too-shallow'       // 대표 신살이 단어만 언급되고 현실 장면·조언으로 풀리지 않음
  | 'gaewoon-direction-missing';     // finalStrategyNarrative에 운을 편하게 쓰는 방법/개운 방향 없음

export interface NarrativeValidationIssue {
  type: NarrativeValidationIssueType;
  sectionId: string;
  sentence: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface NarrativeValidationResult {
  isValid: boolean;
  issues: NarrativeValidationIssue[];
}

// ============================================================
// Coverage Rule — "몇 자 이상"이 아니라 "무엇이 빠지면 안 되는지"
// ============================================================
export type NarrativeCoverageSectionId =
  | 'openingDefinition'
  | 'lifeStructureNarrative'
  | 'repeatedPatternNarrative'
  | 'careerTalentNarrative'
  | 'moneyMonetizationNarrative'
  | 'relationshipLoveNarrative'
  | 'futureFlowNarrative'
  | 'finalStrategyNarrative';

export interface NarrativeCoverageRequirement {
  sectionId: NarrativeCoverageSectionId;
  /** 본문에 반드시 흡수되어야 할 V4 분석 데이터 키들 */
  requiredDataSources: string[];
  /** 본문이 다뤄야 할 서사 요소 (예: 겉모습과 내면의 차이, 패턴의 일/관계 양면) */
  requiredNarrativeElements: string[];
  /** 가능하면 다루는 게 좋은 요소 (있으면 가산점, 없어도 통과) */
  optionalNarrativeElements: string[];
  /** 사용하면 안 되는 손쉬운 표현들 (체크리스트화 회귀 방지) */
  forbiddenShortcuts: string[];
}

// ============================================================
// NarrativePlan — "섹션별 이야기 계획" (2026-05 추가)
// 분석 데이터 → 섹션별 plan → 본문 생성 → coverage 검증 → 섹션별 repair 흐름.
// GPT가 본문을 작성하기 전, 어떤 fact가 어떤 plainMeaning으로 어떻게 들어가야 하는지를
// 코드가 결정론적으로 미리 정해둔다.
// ============================================================
export type NarrativeFactSource =
  | 'identityKeyword'
  | 'specialPoint'
  | 'lifeWeapon'
  | 'lifeTrap'
  | 'careerSpecificAnalysis'
  | 'bestWorkStyle'
  | 'avoidCareerEnvironment'
  | 'moneyMakingStyle'
  | 'relationshipPattern'
  | 'familyEarlyPattern'
  | 'timingAnchor'
  | 'futureTimingAnalysis'
  | 'fortuneTrigger'
  | 'userContext'
  | 'dayMaster'
  | 'elementStrength'
  | 'tenGod'
  | 'specialStar'
  // 2026-05 Narrative Depth v1
  | 'dayMasterStrength'    // 신강/신약/중화
  | 'usefulGod'            // 용신/희신/기신
  | 'gaewoonDirection'     // 개운 방향 (synthetic — 용신/기신·신강신약 종합)
  | 'luckOpeningCondition'; // 운이 열리는 방식 (synthetic — opening 짧은 시드)

/**
 * 한 섹션에 반드시 흡수되어야 하는 단일 데이터 조각.
 * matchTokens로 validator가 본문 흡수 여부를 검사.
 */
export interface NarrativeMustUseFact {
  /** plan 내 고유 id (예: "identity-0", "specialPoint-1", "year-2026") */
  id: string;
  source: NarrativeFactSource;
  /** raw fact — GPT에 그대로 전달되는 원본 데이터 */
  fact: string;
  /** 일상어 풀이 — GPT가 본문에 풀어쓸 때의 시드 (이미 코드가 풀어둔 형태) */
  plainMeaning: string;
  /** 이 fact를 본문에 녹일 때의 위치/방법 힌트 */
  narrativeHint: string;
  /** validator가 본문에서 흡수 여부를 검사할 토큰들. 하나라도 부분 매칭되면 OK */
  matchTokens: string[];
  /** 이 fact에 묶인 실제 장면 힌트 (있으면 GPT가 줄글로 풀어서 흡수) */
  lifeSceneHint?: {
    situation: string;
    likelyBehavior: string;
    innerReaction: string;
    externalMisunderstanding?: string;
    betterUse?: string;
  };
  /**
   * 2026-05 Narrative Depth v1 — 명리 구조 fact를 "원인 → 결과 → 현실 장면 → 조언"으로 풀 때
   * GPT가 어떤 행동 가이드/개운 방향 톤으로 마무리해야 하는지 시드.
   * 미신적 물건/색상/방향 금지. 행동·선택·구조화 중심.
   */
  adviceHint?: {
    /** 이 fact의 핵심을 어떤 결의 행동 조언으로 연결할지 */
    actionable: string;
    /** 운이 막히는 선택 (피해야 할 패턴) */
    avoidPattern?: string;
    /** 운이 살아나는 선택 (강화 패턴) */
    activatePattern?: string;
  };
}

export interface NarrativePlanStyleExamples {
  badExample: string;
  goodExample: string;
  transformationRule: string;
}

export interface NarrativePlan {
  sectionId: NarrativeCoverageSectionId;
  /** 이 섹션이 무엇을 달성해야 하는지 한 줄 */
  sectionGoal: string;
  /** 반드시 본문에 흡수되어야 할 사실들 (validator 검사 대상) */
  mustUseFacts: NarrativeMustUseFact[];
  /** 본문이 따라야 할 전개 순서 (1, 2, 3, ... 단계) */
  requiredBeats: string[];
  /** 이 섹션에서 피해야 할 표현 (앞 섹션 표현 반복 회피) */
  avoidRepeating: string[];
  /** 좋은 예/나쁜 예/변환 규칙 — GPT가 스타일 모방용으로 참고 */
  styleExamples: NarrativePlanStyleExamples;
  /** 이 섹션이 흡수해야 할 TopicCoverageMap 키들 (validator의 missing-topic-coverage 시드) */
  topicCoverageTargets?: string[];
  /** 이 섹션에서 GPT가 제안/조언으로 풀어야 할 항목들 (suggestion-coverage-missing 시드) */
  suggestionTargets?: string[];
}

export type NarrativePlanSet = NarrativePlan[];

// ============================================================
// 2026-05 Narrative Depth v1 — feature flag로 명리 구조 깊이 제어
// 모두 false면 안정화된 v0 plan 그대로 생성 (rollback 안전망).
// 검증 통과 후 product default를 true로 전환.
// ============================================================
export interface NarrativeDepthOptions {
  /** lifeStructure + final에 Evidence-to-Narrative 블록 (신강/신약·신살·용신 fact) 추가 */
  useEvidenceNarrativeBlocks: boolean;
  /** opening 끝에 "운이 열리는 방식" 2~3문장 fact 추가 */
  useSajuOpeningLuckCondition: boolean;
  /** finalStrategy에 "개운 방향" 블록 (용신/기신·행동 중심) 추가 */
  useFinalGaewoonDirection: boolean;
}

export const DEFAULT_NARRATIVE_DEPTH_OPTIONS: NarrativeDepthOptions = {
  useEvidenceNarrativeBlocks: false,
  useSajuOpeningLuckCondition: false,
  useFinalGaewoonDirection: false,
};
