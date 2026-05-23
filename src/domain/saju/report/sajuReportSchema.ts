// 개인사주 리포트 — 전체 도메인 타입 (spec 통합).
// 모든 분석/리포트/검증 모듈은 이 파일의 타입을 in/out으로 사용한다.

import type { HeavenlyStem } from '../rules/heavenlyStems';
import type { EarthlyBranch } from '../rules/earthlyBranches';
import type { Element } from '../rules/elements';
import type { FourPillars } from '../calendar/pillarCalculator';
import type {
  UserContext,
  Gender,
  RelationshipStatus,
  BirthTimeConfidence,
} from '../calendar/normalizeBirthInput';
import type { RuleConfig } from '../rules/ruleConfig';

// ============================================================
// 십성
// ============================================================

export type TenGod =
  | '비견' | '겁재'
  | '식신' | '상관'
  | '편재' | '정재'
  | '편관' | '정관'
  | '편인' | '정인';

export type StemPosition  = 'yearStem'  | 'monthStem'  | 'dayStem'  | 'hourStem';
export type BranchPosition = 'yearBranch' | 'monthBranch' | 'dayBranch' | 'hourBranch';

export interface TenGodAnalysis {
  visible: Array<{
    position: StemPosition;
    tenGod: TenGod;
    source: HeavenlyStem;
  }>;
  hidden: Array<{
    position: BranchPosition;
    tenGod: TenGod;
    source: HeavenlyStem;
    weight: number;
  }>;
  totals: Record<TenGod, number>;
  strongest: TenGod[];
  weakest: TenGod[];
  excessive: TenGod[];
  deficient: TenGod[];
}

// ============================================================
// 오행 강약
// ============================================================

export interface ElementStrengthAnalysis {
  scores: Record<Element, number>;
  strongest: Element[];
  weakest: Element[];
  excessive: Element[];
  deficient: Element[];
  isolated: Element[];
  climate: {
    coldHot: 'too-cold' | 'cold' | 'balanced' | 'hot' | 'too-hot';
    dryWet: 'too-dry' | 'dry' | 'balanced' | 'wet' | 'too-wet';
    comment: string;
  };
  reasons: string[];
}

// ============================================================
// 신강·신약
// ============================================================

export type DayMasterStrengthLevel = 'very-strong' | 'strong' | 'balanced' | 'weak' | 'very-weak';

export interface DayMasterStrengthAnalysis {
  level: DayMasterStrengthLevel;
  score: number;
  supportFactors: string[];
  drainingFactors: string[];
  conflictFactors: string[];
  conclusion: string;
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================
// 용신 (5관점)
// ============================================================

export interface UsefulGodAnalysis {
  primaryUseful: {
    type: 'element' | 'tenGod';
    value: Element | TenGod;
  };
  secondaryUseful?: {
    type: 'element' | 'tenGod';
    value: Element | TenGod;
  };
  favorable: Array<Element | TenGod>;
  unfavorable: Array<Element | TenGod>;
  methodScores: {
    climate: number;
    strength: number;
    bridge: number;
    illnessMedicine: number;
    structure: number;
  };
  reasons: string[];
  caution: string[];
  confidence: 'high' | 'medium' | 'low';
}

// ============================================================
// 합·충·형·파·해
// ============================================================

export interface CombinationsAndConflicts {
  combinations: string[];   // 삼합·육합·반합 등
  conflicts: string[];      // 충
  punishments: string[];    // 형
  harms: string[];          // 해
  destructions: string[];   // 파
}

// ============================================================
// 신살
// ============================================================

export interface SpecialStarInfo {
  name: string;
  positions: string[];
  strengthScore: number;
  interpretationHint: string;
}

// ============================================================
// 대운·세운
// ============================================================

export interface DaewoonInfo {
  pillar: string;            // 예: '갑신'
  ageRange: string;          // 예: '32~41'
  theme: string;             // 예: '편관 대운 — 책임과 시험'
  relationToChart: string[]; // 원국과의 합/충 등
}

export interface SewoonYearInfo {
  year: number;
  pillar: string;
  theme: string;
  activatedElements: Element[];
  activatedTenGods: TenGod[];
  risks: string[];
  opportunities: string[];
  relationToOriginalChart: string[];
}

export interface FortuneCycleInfo {
  currentDaewoon: DaewoonInfo;
  nextThreeYears: SewoonYearInfo[];
}

// ============================================================
// 특별 포인트 (이 서비스의 핵심 차별화 — spec §9)
// ============================================================

export type SpecialPointCategory =
  | 'noble-help'
  | 'money-talent'
  | 'career-authority'
  | 'attraction-popularity'
  | 'inner-depth'
  | 'movement-change'
  | 'mental-strength'
  | 'relationship-pattern'
  | 'rare-structure'
  | 'fortune-timing'
  | 'life-weapon';

export type SpecialPointRarityLevel =
  | 'common' | 'noticeable' | 'uncommon' | 'rare' | 'very-rare';

export interface SpecialPoint {
  id: string;
  name: string;            // 예: '천을귀인', '식상생재'
  category: SpecialPointCategory;
  title: string;           // 사용자에게 보여줄 매력적 제목
  shortLabel: string;      // 카드 짧은 문구
  strengthScore: number;   // 0~100

  rarity: {
    level: SpecialPointRarityLevel;
    /** 통계값 없으면 null. null이면 "만 명 중 n명" 표현 절대 금지. */
    estimatedPer10000?: number | null;
    basis?: string | null;
    caution: string;
  };

  evidence: Array<{
    source:
      | 'pillar' | 'tenGod' | 'element'
      | 'specialStar' | 'combination' | 'conflict'
      | 'usefulGod' | 'daewoon' | 'sewoon';
    description: string;
  }>;

  activatedBy: string[];   // 강해지는 조건
  weakenedBy: string[];    // 약해지는 조건

  narrative: {
    coreMeaning: string;
    whySpecial: string;
    lifeScene: string;
    goodUse: string;
    shadowSide: string;
  };

  displayPriority: number;
}

// ============================================================
// 컨텍스트 가드 (나이/혼인/자녀/시간미상 필터)
// ============================================================

export interface ContextGuardResult {
  allowedTopics: string[];
  restrictedTopics: string[];
  warnings: string[];
}

// ============================================================
// 차별화 4섹션 (사용자 spec §3-1~3-4)
// ============================================================

export type IdentityEvidenceSource =
  | 'dayMaster' | 'monthBranch' | 'tenGod' | 'elementStrength'
  | 'usefulGod' | 'specialPoint' | 'combination' | 'conflict';

export interface IdentityKeyword {
  keyword: string;            // 예: "기준이 분명한 사람"
  shortDescription: string;
  evidence: Array<{ source: IdentityEvidenceSource; description: string }>;
  narrativeHint: string;
  displayPriority: number;
}

export type LifeWeaponCategory =
  | 'judgment' | 'expression' | 'money' | 'relationship'
  | 'career' | 'persistence' | 'learning' | 'creativity' | 'leadership';

export type LifeWeaponEvidenceSource =
  | 'tenGod' | 'element' | 'dayMasterStrength' | 'usefulGod'
  | 'specialPoint' | 'daewoon' | 'sewoon';

export interface LifeWeapon {
  name: string;
  category: LifeWeaponCategory;
  evidence: Array<{ source: LifeWeaponEvidenceSource; description: string }>;
  realLifeScene: string;
  howToUse: string;
  caution: string;
  strengthScore: number;       // 0~100
  displayPriority: number;
}

export type LifeTrapCategory =
  | 'overthinking' | 'relationship' | 'money' | 'career'
  | 'emotion' | 'persistence' | 'perfectionism' | 'avoidance' | 'over-responsibility';

export type LifeTrapEvidenceSource =
  | 'tenGod' | 'elementExcess' | 'elementDeficiency' | 'conflict'
  | 'usefulGod' | 'unfavorableGod' | 'specialPoint';

export interface LifeTrap {
  name: string;
  category: LifeTrapCategory;
  evidence: Array<{ source: LifeTrapEvidenceSource; description: string }>;
  patternDescription: string;
  realLifeScene: string;
  escapeStrategy: string;
  riskScore: number;           // 0~100
  displayPriority: number;
}

export interface FortuneTriggerAnalysis {
  fortuneActivatingChoices: Array<{
    title: string;
    reason: string;
    practicalAction: string;
    relatedTo: 'usefulGod' | 'tenGod' | 'specialPoint' | 'daewoon' | 'sewoon' | 'elementBalance';
  }>;
  fortuneBlockingChoices: Array<{
    title: string;
    reason: string;
    practicalRisk: string;
    correction: string;
    relatedTo: 'unfavorableGod' | 'tenGodExcess' | 'elementImbalance' | 'conflict' | 'lifeTrap';
  }>;
}

// ============================================================
// GPT 입력 JSON (Module 13)
// ============================================================

export interface PersonalSajuGptInput {
  userContext: {
    age: number;
    gender: Gender;
    relationshipStatus: RelationshipStatus;
    hasChildren: boolean | 'unknown';
    occupation?: string;
    currentConcerns: string[];
    birthTimeConfidence: BirthTimeConfidence;
  };
  ruleConfig: RuleConfig;
  birthChart: {
    year: string;
    month: string;
    day: string;
    hour?: string;
    dayMaster: string;
    isHourEstimated: boolean;
  };
  coreAnalysis: {
    elementStrength: ElementStrengthAnalysis;
    tenGods: TenGodAnalysis;
    dayMasterStrength: DayMasterStrengthAnalysis;
    usefulGod: UsefulGodAnalysis;
    combinationsAndConflicts: CombinationsAndConflicts;
    specialStars: SpecialStarInfo[];
  };
  specialPoints: SpecialPoint[];
  identityKeywords: IdentityKeyword[];
  lifeWeapons: LifeWeapon[];
  lifeTraps: LifeTrap[];
  fortuneTriggers: FortuneTriggerAnalysis;
  fortune: FortuneCycleInfo;
  constraints: {
    doNotInvent: true;
    avoidGenericAdvice: true;
    avoidFearMarketing: true;
    avoidMedicalLegalFinancialCertainty: true;
    mustRespectUserContext: true;
    mustExplainTermsSimply: true;
  };
}

// ============================================================
// 리포트 검증 (Module 15)
// ============================================================

export interface ValidationIssue {
  type:
    | 'generic'
    | 'context-conflict'
    | 'unsupported-claim'
    | 'fear-marketing'
    | 'fake-rarity'
    | 'medical-legal-financial-risk';
  sentence: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface ReportValidationResult {
  isValid: boolean;
  issues: ValidationIssue[];
}

// ============================================================
// 최종 리포트
// ============================================================

export interface PersonalSajuReport {
  summary: string;
  identityKeywords: Array<{
    keyword: string;
    body: string;
    evidenceSummary: string[];
  }>;
  specialSection: {
    title: '이 사주가 평범하지 않은 이유';
    points: Array<{
      title: string;
      shortLabel: string;
      body: string;
      evidenceSummary: string[];
      strengthScore: number;
    }>;
  };
  lifeWeapons: Array<{
    name: string;
    body: string;
    realLifeScene: string;
    howToUse: string;
    caution: string;
    evidenceSummary: string[];
  }>;
  lifeTraps: Array<{
    name: string;
    body: string;
    realLifeScene: string;
    escapeStrategy: string;
    evidenceSummary: string[];
  }>;
  fortuneTriggers: {
    activatingChoices: Array<{
      title: string;
      body: string;
      practicalAction: string;
      evidenceSummary: string[];
    }>;
    blockingChoices: Array<{
      title: string;
      body: string;
      correction: string;
      evidenceSummary: string[];
    }>;
  };
  questions: Array<{
    questionNumber: number;
    question: string;
    answer: string;
    evidenceSummary: string[];
  }>;
  nextThreeYears: Array<{
    year: number;
    title: string;
    body: string;
    opportunities: string[];
    cautions: string[];
  }>;
  practicalGuide: {
    career: string;
    money: string;
    relationship: string;
    decisionMaking: string;
    lifestyle: string;
  };
  finalMessage: string;
  validation: ReportValidationResult;
}

// ============================================================
// 분석 번들 (analysis 모듈 결과 누적용)
// ============================================================

export interface SajuAnalysisBundle {
  ruleVersion: string;
  context: UserContext;
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elementStrength: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  usefulGod: UsefulGodAnalysis;
  combinationsAndConflicts: CombinationsAndConflicts;
  specialStars: SpecialStarInfo[];
  specialPoints: SpecialPoint[];
  fortune: FortuneCycleInfo;
}
