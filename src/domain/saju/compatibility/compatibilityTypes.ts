// 궁합 v4 — 도메인 타입 (전체 인터페이스 단일 파일).
// 두 사람 사이의 상호작용, 레이어, 아키타입, 질문, GPT 입력, 검증까지.

import type { PersonalSajuGptInput, ContentLedgerEntry } from '../report/sajuReportSchema';
import type { Element } from '../rules/elements';

// ============================================================
// 관계 유형
// ============================================================

export type RelationshipType =
  | 'dating'              // 연애중
  | 'married'             // 혼인관계
  | 'friendship'          // 우정관계
  | 'coworker'            // 동료사이
  | 'reunion_or_breakup'  // 재회/이별
  | 'crush_or_something'; // 짝사랑/썸

export const RELATIONSHIP_TYPES: readonly RelationshipType[] = [
  'dating', 'married', 'friendship', 'coworker', 'reunion_or_breakup', 'crush_or_something',
] as const;

export const RELATIONSHIP_TYPE_KO: Record<RelationshipType, string> = {
  dating: '연애중',
  married: '혼인관계',
  friendship: '우정관계',
  coworker: '동료사이',
  reunion_or_breakup: '재회/이별',
  crush_or_something: '짝사랑/썸',
};

// ============================================================
// 관계 유형 가중치
// ============================================================

export interface RelationshipPriorityWeights {
  attraction: number;
  emotionalExpression: number;
  dailyCompatibility: number;
  moneyAndResponsibility: number;
  communicationStyle: number;
  conflictRecovery: number;
  timing: number;
  longTermStability: number;
  roleDivision: number;
  distanceControl: number;
  repeatedPattern: number;
}

export interface RelationshipTypeWeight {
  relationshipType: RelationshipType;
  priority: RelationshipPriorityWeights;
  /** 사용자 친화 표현 */
  label: string;
  /** 짧은 설명 */
  description: string;
}

// ============================================================
// 일간 관계
// ============================================================

export type DayMasterRelationKind =
  | 'a-generates-b' | 'b-generates-a'
  | 'a-controls-b'  | 'b-controls-a'
  | 'same-element'  | 'neutral';

export interface DayMasterRelationAnalysis {
  relation: DayMasterRelationKind;
  balance: 'A-gives-more' | 'B-gives-more' | 'mutual' | 'tense' | 'neutral';
  description: string;
  evidence: string[];
}

// ============================================================
// 일지(배우자궁) 관계
// ============================================================

export type BranchRelationKind =
  | 'six-harmony'        // 육합
  | 'three-harmony'      // 삼합 일부
  | 'conflict'           // 충
  | 'punishment'         // 형
  | 'destruction'        // 파
  | 'harm'               // 해
  | 'wonjin'             // 원진 (옵션)
  | 'none';

export interface SpousePalaceRelationAnalysis {
  relationTypes: BranchRelationKind[];
  intensity: 'low' | 'medium' | 'high';
  attractionEffect: string;
  conflictEffect: string;
  evidence: string[];
}

// ============================================================
// 오행 보완
// ============================================================

export interface ElementComplementAnalysis {
  aNeedsFromB: Element[];
  bNeedsFromA: Element[];
  mutualComplement: 'strong' | 'moderate' | 'weak' | 'one-sided';
  oneSidednessRisk: string[];
  evidence: string[];
}

// ============================================================
// 십성 상호작용 — 상대가 나에게 어떤 십성으로 작용하는지
// ============================================================

export type TenGodFeelKind =
  | 'authority-pressure'   // 관성처럼: 책임·기준·평가
  | 'expression-spark'     // 식상처럼: 즐거움·표현·잔소리
  | 'wealth-realism'       // 재성처럼: 현실·소유·돈
  | 'support-shelter'      // 인성처럼: 위로·보호·의존
  | 'peer-mirror';         // 비겁처럼: 친구·경쟁·닮음

export interface TenGodInteractionAnalysis {
  aFeelsBAs: TenGodFeelKind[];
  bFeelsAAs: TenGodFeelKind[];
  attractionPoints: string[];
  pressurePoints: string[];
  evidence: string[];
}

// ============================================================
// 용신/기신 상호 자극
// ============================================================

export interface UsefulGodInteractionAnalysis {
  aUsefulTouchedByB: Element[];
  bUsefulTouchedByA: Element[];
  aUnfavorableTriggeredByB: Element[];
  bUnfavorableTriggeredByA: Element[];
  interpretation: string;
  evidence: string[];
}

// ============================================================
// 합·충·형·파·해 (원국 전체 차원에서의 상호 작용)
// ============================================================

export interface CompatibilityCombinationConflictAnalysis {
  combinations: string[];
  conflicts: string[];
  punishments: string[];
  destructions: string[];
  harms: string[];
}

// ============================================================
// 끌림 / 충돌 / 회복 / 안정 / 타이밍 레이어
// ============================================================

export interface AttractionAnalysis {
  mainAttraction: string[];
  whyTheyNoticeEachOther: string;
  initialChemistry: 'soft' | 'strong' | 'slow-burn' | 'unstable' | 'practical';
  evidence: string[];
}

export interface ConflictAnalysis {
  mainConflictTriggers: string[];
  repeatedPattern: string;
  emotionalMismatch: string;
  recoveryStyleMismatch: string;
  evidence: string[];
}

export interface RecoveryAnalysis {
  likelyRecoveryPattern: string;
  whatAUsuallyNeeds: string;
  whatBUsuallyNeeds: string;
  bestRecoveryRule: string;
  evidence: string[];
}

export interface StabilityAnalysis {
  dailyCompatibility: string;
  longTermRisk: string;
  relationshipTypeSpecificStability: string;
  evidence: string[];
}

export type RelationshipEventType =
  | 'closer' | 'distance' | 'turning-point' | 'decision-needed'
  | 'cooling' | 'reconnect-possible' | 'role-change' | 'move-or-life-change';

export interface RelationshipYearFlow {
  year: number;
  theme: string;
  relationshipEventTypes: RelationshipEventType[];
  opportunity: string;
  caution: string;
  advice: string;
  evidence: string[];
}

// ============================================================
// 관계 아키타입
// ============================================================

export type ArchetypeTone =
  | 'sns-shareable' | 'sns-shareable-but-not-cheap'
  | 'warm' | 'playful' | 'realistic' | 'practical'
  | 'careful' | 'premium' | 'light';

export type ArchetypeEvidenceSource =
  | 'dayMasterRelation' | 'spousePalaceRelation' | 'elementComplement'
  | 'tenGodInteraction' | 'combination' | 'conflict'
  | 'usefulGodInteraction' | 'relationshipTiming';

export interface RelationshipArchetype {
  id: string;
  title: string;
  shortLabel: string;
  keywords: string[];
  summary: string;
  brightSide: string;
  shadowSide: string;
  keyAdvice: string;
  evidence: Array<{
    source: ArchetypeEvidenceSource;
    description: string;
  }>;
  relationshipTypeFit: RelationshipType[];
  tone: ArchetypeTone;
}

// 카탈로그 entry — 코드가 매칭에 쓰는 baseline (GPT는 title만 약간 다듬을 수 있음)
export interface ArchetypeCatalogEntry {
  id: string;
  title: string;
  shortLabel: string;
  triggerKeywords: string[];
  defaultBrightSide: string;
  defaultShadowSide: string;
  defaultKeyAdvice: string;
  fitTypes: RelationshipType[];
  tone: ArchetypeTone;
}

// ============================================================
// 관계 키워드 / 강점 / 위험 / 선택
// ============================================================

export interface RelationshipKeyword {
  keyword: string;
  description: string;
  evidence: string[];
}

export interface RelationshipStrengthItem {
  title: string;
  evidence: string[];
  lifeScene: string;
}

export interface RelationshipRiskItem {
  title: string;
  evidence: string[];
  likelyScene: string;
  prevention: string;
}

export interface RelationshipChoices {
  helpfulChoices: Array<{
    title: string;
    reason: string;
    practicalAction: string;
  }>;
  harmfulChoices: Array<{
    title: string;
    reason: string;
    correction: string;
  }>;
}

// ============================================================
// 관계 유형별 질문
// ============================================================

export interface RelationshipQuestion {
  questionNumber: number;
  question: string;
  /** GPT에게 어떤 식으로 답할지 안내 (코드 결정) */
  answerGuide: string;
}

// ============================================================
// 궁합 전체 분석 묶음
// ============================================================

export interface CompatibilityAnalysisBundle {
  dayMasterRelation: DayMasterRelationAnalysis;
  spousePalaceRelation: SpousePalaceRelationAnalysis;
  elementComplement: ElementComplementAnalysis;
  tenGodInteraction: TenGodInteractionAnalysis;
  usefulGodInteraction: UsefulGodInteractionAnalysis;
  combinationConflicts: CompatibilityCombinationConflictAnalysis;
  attractionAnalysis: AttractionAnalysis;
  conflictAnalysis: ConflictAnalysis;
  recoveryAnalysis: RecoveryAnalysis;
  stabilityAnalysis: StabilityAnalysis;
  relationshipArchetype: RelationshipArchetype;
  relationshipKeywords: RelationshipKeyword[];
  relationshipStrengths: RelationshipStrengthItem[];
  relationshipRisks: RelationshipRiskItem[];
  relationshipChoices: RelationshipChoices;
  futureFlow: RelationshipYearFlow[];
}

// ============================================================
// GPT 입력 JSON
// ============================================================

/** PersonalSajuGptInput에서 필요한 필드만 추려 GPT 입력 사이즈 축소 */
export interface PersonForCompat {
  label: 'A' | 'B';
  userContext: PersonalSajuGptInput['userContext'];
  birthChart: PersonalSajuGptInput['birthChart'];
  coreAnalysis: PersonalSajuGptInput['coreAnalysis'];
  currentDaewoon: PersonalSajuGptInput['fortune']['currentDaewoon'];
  nextThreeYears: PersonalSajuGptInput['fortune']['nextThreeYears'];
}

export interface CompatibilityGptInput {
  relationshipType: RelationshipType;
  personA: PersonForCompat;
  personB: PersonForCompat;
  compatibilityAnalysis: CompatibilityAnalysisBundle;
  relationshipQuestions: RelationshipQuestion[];
  contentLedger: ContentLedgerEntry[];
  constraints: {
    noScores: true;
    doNotInvent: true;
    avoidGenericAdvice: true;
    avoidFearMarketing: true;
    avoidDeterministicRelationshipClaims: true;
    doNotAssertOtherPersonFeelings: true;
    avoidManipulativeAdvice: true;
    mustRespectRelationshipType: true;
    mustExplainTermsSimply: true;
  };
}

// ============================================================
// 검증
// ============================================================

export type CompatibilityIssueType =
  | 'score-used'
  | 'invented-claim'
  | 'archetype-mismatch'
  | 'mind-reading'
  | 'false-hope'
  | 'manipulative-advice'
  | 'relationship-type-mismatch'
  | 'vague-expression'
  | 'repetition'
  | 'deterministic-future'
  | 'fake-rarity'
  | 'fear-marketing';

export interface CompatibilityValidationIssue {
  type: CompatibilityIssueType;
  sectionId: string;
  sentence: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface CompatibilityValidationResult {
  isValid: boolean;
  issues: CompatibilityValidationIssue[];
}

// ============================================================
// 최종 리포트 응답
// ============================================================

export interface CompatibilityReportResult {
  gptInput: CompatibilityGptInput;
  reportText: string;
  validation: CompatibilityValidationResult;
  attempts: number;
}
