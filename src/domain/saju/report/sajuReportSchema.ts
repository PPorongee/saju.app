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
// 직업·환경·돈 (Career/Environment/Money) — spec §13
// ============================================================

export type CareerEvidenceSource =
  | 'tenGod' | 'element' | 'usefulGod' | 'unfavorableGod'
  | 'dayMasterStrength' | 'specialPoint' | 'conflict' | 'combination';

export interface CareerMatch {
  rank: number;
  industry: string;          // 예: '스타트업 / IT 플랫폼'
  roles: string[];           // 예: ['서비스 기획', 'PM/PO', '운영 개선']
  fitScore: number;          // 0~100
  whyFits: string[];         // 명리 근거 (사람 친화적 한 줄)
  howItShowsInLife: string;  // 실제 장면
  caution: string;           // 그림자
}

export interface ConditionalCareerMatch {
  industry: string;
  roles: string[];
  condition: string;         // 예: '책임과 권한이 같이 주어지는 자리에서'
  whyFits: string[];
  caution: string;
}

export interface CareerAvoidEnvironment {
  environment: string;       // 예: '책임은 많은데 권한은 없는 조직'
  reason: string;
  relatedTo: 'tenGod' | 'element' | 'usefulGod' | 'unfavorableGod' | 'conflict';
}

export interface WorkStyleItem {
  title: string;             // 예: '문제를 구조화해야 하는 역할'
  description: string;
  evidence: string[];
}

export type MoneyMakingStyleKind =
  | 'salary' | 'performance' | 'content' | 'transaction'
  | 'expertise' | 'asset' | 'network' | 'personal-brand'
  | 'project' | 'recurring-sales';

export interface MoneyMakingStyleItem {
  kind: MoneyMakingStyleKind;
  title: string;             // 예: '내가 만든 결과물이 시장 반응을 얻을 때'
  description: string;
  evidence: string[];
}

export interface CareerSpecificAnalysis {
  topCareerMatches: CareerMatch[];                 // 상위 3개
  conditionalCareerMatches: ConditionalCareerMatch[]; // 조건부 1~3개
  avoidCareerEnvironments: CareerAvoidEnvironment[];
  bestWorkStyle: WorkStyleItem[];
  moneyMakingStyle: MoneyMakingStyleItem[];
}

// ============================================================
// 타이밍 앵커 (과거 회고 — 가볍게)
// ============================================================

export type TimingEventType =
  | 'move' | 'career-change' | 'relationship-change' | 'family-issue'
  | 'study-exam' | 'money-change' | 'identity-shift'
  | 'social-expansion' | 'isolation' | 'achievement' | 'conflict';

export interface TimingAnchor {
  year?: number;
  age?: number;
  title: string;             // 예: '자리가 흔들렸을 수 있는 시기'
  eventTypes: TimingEventType[];
  possibleManifestations: string[]; // "이사일 수도, 이직일 수도, 부서이동일 수도..."
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];        // 짧은 명리 근거
  tone: 'light-touch';       // 단정 금지를 의미하는 식별자
}

// ============================================================
// 미래 시기 분석 (앞으로 3년)
// ============================================================

export type FutureTimingTheme =
  | 'career' | 'money' | 'relationship' | 'move' | 'study'
  | 'family' | 'self-branding' | 'business' | 'rest' | 'responsibility';

export interface FutureTimingYearInfo {
  year: number;
  age: number;
  pillar: string;
  headline: string;                  // 예: '자리가 바뀌는 흐름'
  strongestThemes: FutureTimingTheme[];
  possibleEvents: string[];
  bestActions: string[];
  avoidActions: string[];
  careerAdvice?: string;
  moneyAdvice?: string;
  relationshipAdvice?: string;
  confidence: 'high' | 'medium' | 'low';
  evidence: string[];
}

export interface FutureTimingAnalysis {
  years: FutureTimingYearInfo[];
}

// ============================================================
// Content Ledger — 섹션별 역할/중복 방지
// ============================================================

export type LedgerSectionId =
  | 'summary' | 'keywords' | 'specialPoints' | 'lifeWeapons'
  | 'lifeTraps' | 'fortuneChoices' | 'questions'
  | 'futureThreeYears' | 'practicalGuide'
  // narrative 모드 섹션 id (카드형 ID와 분리)
  | 'birthChartCard' | 'openingDefinition' | 'lifeStructureNarrative'
  | 'repeatedPatternNarrative'
  // 2026-05 — 일/돈/관계 분리
  | 'careerTalentNarrative' | 'moneyMonetizationNarrative' | 'relationshipLoveNarrative'
  | 'futureFlowNarrative' | 'finalStrategyNarrative' | 'evidenceView';

export interface ContentLedgerEntry {
  sectionId: LedgerSectionId;
  primaryPurpose: string;
  allowedTopics: string[];
  forbiddenTopics: string[];
  mustNotRepeatFromPreviousSections: string[]; // 표현/조언 키
  keyMessage: string;
}

export type ContentLedger = ContentLedgerEntry[];

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
  careerSpecificAnalysis: CareerSpecificAnalysis;
  timingAnchors: TimingAnchor[];
  futureTimingAnalysis: FutureTimingAnalysis;
  contentLedger: ContentLedger;
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
    | 'medical-legal-financial-risk'
    | 'repetition'
    | 'lacks-specificity'
    | 'banned-vague-standalone';
  sentence: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  /** repetition·lacks-specificity·banned 검사용 — 어느 섹션에서 발생했는지 */
  sectionId?: string;
}

export interface RepetitionIssue {
  repeatedPhrase: string;
  sections: string[];
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface SectionQualityCheck {
  sectionId: string;
  hasSpecificCareerOrIndustry?: boolean;
  hasSpecificAction?: boolean;
  hasSpecificTiming?: boolean;
  hasSpecificRisk?: boolean;
  hasConcreteLifeScene?: boolean;
  hasSajuEvidence: boolean;
  hasBannedVaguePhrase: boolean;
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
