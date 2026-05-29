// Yearly Fortune (올해운세) V4 — 타입 정의 (Y1)
//
// 핵심 원칙:
//   - 올해운세는 예언이 아니라 "올해의 타이밍 + 선택 가이드"
//   - 계산은 코드(deterministic), LLM은 문장화만
//   - 개인사주 pipeline과 격리 — 자체 sectionId / validator / sanitizer
//
// Phase 1 필수 계산 (Y2a~Y2g)이 채우는 항목 vs Phase 2(advanced)는 optional 분리.

import type { BirthInput } from '../calendar/normalizeBirthInput';
import type { FourPillars, Pillar } from '../calendar/pillarCalculator';
import type { DaewoonPillar } from '../calendar/fortuneCycleCalculator';
import type {
  TenGod,
  DayMasterStrengthAnalysis,
  UsefulGodAnalysis,
  SpecialStarInfo,
} from '../report/sajuReportSchema';
import type { Element } from '../rules/elements';
// All-mode Action Guide V1 출력 타입 (yearly의 기존 ActionGuide와 이름 충돌 방지 위해 alias).
import type { ActionGuide as ActionGuideOutput } from '../actionGuide/actionGuideTypes';

// ============================================================
// Feature flags — 4개 (server 3 + NEXT_PUBLIC UI 1)
// ============================================================
//
// 1) YEARLY_FORTUNE_API_ENABLED          (server-only)   — endpoint 활성 (false면 503)
// 2) YEARLY_FORTUNE_VERIFY_SECRET        (server-only)   — UI 비활성 시 외부 차단용 헤더 비교 값
// 3) NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED (client-readable) — SajuApp.tsx에서 UI 노출 제어
// 4) SAJU_YEARLY_DEPTH                   (server-only)   — depth fact env default ('on'|'off')
//
// 이 interface는 endpoint/route.ts에서 env를 읽어 normalize할 때 사용.
export interface YearlyFortuneServerFlags {
  apiEnabled: boolean;                 // YEARLY_FORTUNE_API_ENABLED === 'true'
  verifySecret: string | undefined;    // YEARLY_FORTUNE_VERIFY_SECRET (정의되면 헤더 강제)
  depthEnvDefault: boolean;            // SAJU_YEARLY_DEPTH === 'on'
}

// ============================================================
// 입력
// ============================================================
export type YearlyRelationshipStatus = 'unknown' | 'single' | 'dating' | 'married' | 'divorced';

export interface YearlyFortuneInput {
  birth: BirthInput;
  /** YYYY-MM-DD (생성 기준일). 남은 월운/대운 식별 기준. */
  currentDate: string;
  /** 미지정 시 currentDate의 입춘 기준 연도. */
  targetYear?: number;
  relationshipStatus?: YearlyRelationshipStatus;
  /** 자녀 여부 직접 입력 (boolean). 미지정 시 userContext.hasChildren 폴백 → 없으면 'unknown'. */
  hasChildren?: boolean;
  /** 사용자 직업·관심사 등 추가 컨텍스트 (LLM hint, 단정 X) */
  userContext?: Record<string, unknown>;
}

// ============================================================
// Depth options — body.depthOptions로 토글
// ============================================================
export interface YearlyDepthOptions {
  /** Evidence-to-Narrative (원인→결과→장면→조언) fact 깊이 적용 */
  useEvidenceNarrative: boolean;
  /** remainingMonths 섹션 활성화 */
  useMonthlyFlow: boolean;
  /** nextTwoYears 섹션 활성화 */
  useNextTwoYears: boolean;
}

export const DEFAULT_YEARLY_DEPTH_OPTIONS: YearlyDepthOptions = {
  useEvidenceNarrative: false,
  useMonthlyFlow: false,
  useNextTwoYears: false,
};

// ============================================================
// 공통 — 간지 / interaction
// ============================================================
export interface Ganji {
  stem: string;     // 천간 한글 1자 (갑·을·...)
  branch: string;   // 지지 한글 1자 (자·축·...)
  display: string;  // "병오" 같이 합쳐진 표시
}

export type InteractionKind = '합' | '충' | '형' | '파' | '해' | 'none';
export type InteractionTarget = 'stem' | 'branch';
export type InteractionIntensity = 'mild' | 'medium' | 'strong';

/**
 * 두 pillar 사이의 작용을 metadata-rich하게 표현.
 * Y2c (대운-세운), Y2d (세운-원국), Y2f (월운-세운/원국) 모두 동일 타입 사용.
 *
 * planBuilder에서 바로 evidence·lifeSceneHint·adviceHint로 활용 가능하도록
 * label / plainMeaning / lifeSceneHint / adviceHint / intensity를 코드가 미리 채운다.
 *
 * 해석 원칙 (Y2c 명세 §8~§11):
 *   - 합 = 연결·묶임·협력·방향성 형성 (좋다 단정 X)
 *   - 충 = 변화·흔들림·방향 전환·조정 필요 (나쁘다 단정 X)
 *   - 형 = 마찰·기준 어긋남·조정 필요
 *   - 파 = 누수·일관성 깨짐
 *   - 해 = 소소한 어긋남·신경 쓸 결
 *   - 불안 조장(사고/사망/파산) 절대 금지
 */
export interface Interaction {
  kind: InteractionKind;
  target: InteractionTarget;
  /** 어디서 (대운/세운/월운/원국-년주 등) */
  from: string;
  /** 어디로 */
  to: string;
  /** 명리 라벨 (예: '갑기합화토', '인-신 충', '축술 형') */
  label: string;
  /** 사람용 한글 표현 (예: '대운 갑 + 세운 기 → 합화토') — UI 표시용 */
  between: string;
  /** 코드용 영문 scope tag (예: 'daewoon-sewoon-stem-combo') */
  scopeTag: string;
  /** 일상어 풀이 (한 줄) */
  plainMeaning: string;
  /** 현실 장면 시드 — planBuilder에서 lifeSceneHint로 사용 */
  lifeSceneHint?: string;
  /** 행동 조언 시드 */
  adviceHint?: {
    actionable: string;
    avoidPattern?: string;
    activatePattern?: string;
  };
  /** 강도 — UI 강조/정렬용 */
  intensity: InteractionIntensity;
}

// ============================================================
// Y2 계산 결과 sub-types
// ============================================================

// Y2a — 세운 간지 + 십성
export interface YearTenGodAnalysis {
  /** 세운 천간 → 일간 기준 십성 */
  stemTenGod: TenGod;
  /** 세운 지지 본기 → 일간 기준 십성 */
  branchMainTenGod: TenGod;
  /** 세운 지지 지장간 → 일간 기준 십성 (중기·여기 포함, 최대 2개) */
  hiddenStemTenGods: TenGod[];
  /** 일상어 풀이 시드 */
  plainMeaning: string;
}

// Y2b — 현재 대운
export interface CurrentDaewoon {
  pillar: DaewoonPillar;
  /** 일간 기준 대운 천간 십성 */
  stemTenGod: TenGod;
  /** 일간 기준 대운 지지 본기 십성 */
  branchTenGod: TenGod;
  /** 일간 기준 대운 지지 지장간(본기 제외) 십성. 본기뿐인 지지(자/묘/유)는 빈 배열. */
  hiddenStemTenGods: TenGod[];
  /** 일상어 풀이 시드 */
  plainMeaning: string;
}

// Y2c — 대운-세운 작용
export interface DaewoonSewoonInteraction {
  /** 전체 요약 한 줄 */
  summary: string;
  interactions: Interaction[];
  plainMeaning: string;
}

// Y2d — 세운-원국 4주 작용 + 궁 영향
export type PalaceTopic = '배경' | '사회/일' | '나/관계' | '미래/결과물';

/**
 * 세운 ↔ 원국 N주(year/month/day/hour) 한 쌍에서 발생한 합·충·형·파·해 묶음 + 궁 영향 매핑.
 * 한 pillar에 천간/지지 두 작용이 동시에 있을 수 있으므로 interactions[]를 보존.
 * planBuilder에서 evidence·lifeSceneHint·adviceHint로 바로 사용.
 */
export interface NatalSewoonInteraction {
  pillar: 'year' | 'month' | 'day' | 'hour';
  pillarLabel: '년주' | '월주' | '일주' | '시주';
  palaceTopic: PalaceTopic;
  /** 이 pillar에서 발견된 작용들 (천간+지지). 빈 배열도 가능 (작용 없음). */
  interactions: Interaction[];
  /** 한 줄 요약 */
  summary: string;
  /** 일상어 풀이 */
  plainMeaning: string;
  /** 궁 기반 현실 장면 시드 (interactions 종류에 맞춰 선택) */
  lifeSceneHint: string;
  /** 행동 조언 (없을 수도 있음 — 작용 없는 pillar에서는 생략) */
  adviceHint?: {
    actionable: string;
    avoidPattern?: string;
    activatePattern?: string;
  };
  /** 주의 메모 (예: 일주/시주에서 relationshipStatus/hasChildren 미상 케이스 안내) */
  caution?: string;
}

/**
 * Phase 2 확장 자리 — 3-pillar interaction (삼합/방합/지세지형/무은지형/기존 합을 충이 깨는지 등).
 * Y2d에서는 detect만 하고 안정화는 Phase 2로 미룬다.
 */
export interface NatalSewoonAdvancedHint {
  kind: '삼합완성' | '방합완성' | '기존합깨짐' | '지세지형완성' | '무은지형완성' | 'note';
  involves: string[];   // 예: ['세운 지지 오', '원국 일지 인', '원국 월지 술']
  label: string;        // 예: '인오술 화국 (세운+일지+월지)'
  plainMeaning: string;
  intensity: InteractionIntensity;
}

// Y2e — 세운 오행 vs 용신/기신
export type UsefulGodRelation = 'useful' | 'favorable' | 'unfavorable' | 'neutral';

export interface YearElementEffect {
  element: '목' | '화' | '토' | '금' | '수';
  relationToUsefulGod: UsefulGodRelation;
  /** UI 라벨 (예: "토 기운 — 용신 결", "금 기운 — 기신 결 (과해지면 부담)") */
  label: string;
  plainMeaning: string;
  /** 현실 장면 시드 */
  lifeSceneHint: string;
  /** 행동 조언 시드 — planBuilder에서 그대로 활용 */
  adviceHint: {
    actionable: string;
    avoidPattern?: string;
    activatePattern?: string;
  };
  /** "기신=나쁨" 단정 방지 안내 등 */
  caution?: string;
  /** 강도 — UI 강조/정렬용 */
  intensity: InteractionIntensity;
}

// Y2e — 신강/신약 부담/지원
export type YearlyStrengthEffect = 'supportive' | 'burdensome' | 'mixed' | 'neutral';

export interface StrengthImpact {
  natalStrength: '신강' | '신약' | '중화';
  yearlyEffect: YearlyStrengthEffect;
  plainMeaning: string;
  /** 현실 장면 시드 */
  lifeSceneHint: string;
  /** 행동 조언 시드 */
  adviceHint: {
    actionable: string;
    avoidPattern?: string;
    activatePattern?: string;
  };
  /** "신강=좋다 / 신약=나쁘다" 단정 방지 안내 */
  caution?: string;
}

// 활성화 주제 (Y2 종합)
export type YearlyTopicKey = '일' | '돈' | '관계' | '연애' | '건강리듬' | '공부' | '이동' | '계약' | '가족' | '결과물';

export interface ActivatedTopic {
  topic: YearlyTopicKey;
  evidence: string[];
  plainMeaning: string;
  lifeSceneHint: string;
  adviceHint: string;
}

// 활성 신살
export interface ActivatedSpecialStar {
  name: string;
  source: 'natal' | 'year' | 'month';
  plainMeaning: string;
  yearlyMeaning: string;
  caution?: string;
}

// Y2f — 남은 월운
export interface MonthlyFortuneAnalysis {
  /** UI 표시용 (예: "6월 흐름" / "5월 흐름 (남은 기간)") */
  monthLabel: string;
  /** 절기 기준 기간 라벨 (예: "2026-06-05 ~ 2026-07-06 (망종~소서 전)") */
  periodLabel: string;
  /** 월 시작 ISO YYYY-MM-DD (실제 시작; currentDate 중간이면 currentDate) */
  startDate: string;
  /** 월 종료 ISO YYYY-MM-DD (다음 절기 직전) */
  endDate: string;
  monthGanji: Ganji;
  /** 월간 → 일간 십성 */
  monthStemTenGod: TenGod;
  /** 월지 본기 → 일간 십성 */
  monthBranchTenGod: TenGod;
  /** 월지 지장간 (본기 제외) 십성 */
  hiddenStemTenGods: TenGod[];
  /** 월운 핵심 키워드 1줄 */
  keyword: string;
  /** 이 달에 강해지는 topic 키 */
  activatedTopics: YearlyTopicKey[];
  /** 용신/기신 활성도 */
  usefulGodEffect: 'helpful' | 'burdensome' | 'mixed' | 'neutral';
  /** 월운–세운/원국 합충 (top 1~3 추림) */
  interactions: Interaction[];
  plainMeaning: string;
  /** 현실 장면 시드 */
  lifeSceneHint: string;
  /** 좋은 선택 (행동 중심) */
  goodChoice: string;
  /** 주의할 선택 (행동 중심) */
  caution: string;
  /** "남은 기간 기준" 처리된 첫 월 여부 */
  truncatedStart: boolean;
}

// Y2g — 이후 2년 (요약 — 올해보다 짧게)
export interface NextYearSummary {
  year: number;
  ganji: Ganji;
  /** 핵심 키워드 (구체적 — 일반 단어 X) */
  keyword: string;
  /** 흐름 요약 — 단정 X, 흐름·선택 전략 톤 */
  summary: string;
  /** 잡으면 좋은 결 (행동) */
  opportunity: string;
  /** 주의할 결 (행동) */
  caution: string;
  /** 계산 근거 (짧은 한 줄들) */
  evidence: string[];
  /** Y2a yearTenGod (세운 천간/지지/지장간 십성) */
  yearTenGod: YearTenGodAnalysis;
  /** Y2e relationToUsefulGod */
  usefulGodRelation: UsefulGodRelation;
  /** Y2e yearlyEffect (신강/신약 기준 부담/지원) */
  strengthEffect: YearlyStrengthEffect;
  /** 대표 합·충·형·파·해 (대운-세운 + 세운-원국 통합, top 1~3, intensity 우선) */
  representativeInteractions: Interaction[];
}

// Phase 2 advanced (정의만 — 본 plan에서는 채우지 않음)
export interface YearlyAdvancedAnalysis {
  hiddenStemEmergence?: unknown;     // 지장간 투출
  rootedness?: unknown;              // 통근
  structurePatternChange?: unknown;  // 격국 변동
  combinationFormation?: unknown;    // 합화 성립
  conflictBreaksCombination?: unknown;
  combinationSoftensConflict?: unknown;
  lifeStages?: unknown;              // 십이운성
  emptyDeath?: unknown;              // 공망
  daewoonTransitionPeriod?: unknown; // 교운기
  yearlySpecialStars?: unknown;
  monthlySpecialStars?: unknown;
}

// ============================================================
// YearlyFortuneAnalysis — Y2 종합 (deterministic)
// ============================================================
export interface YearlyFortuneAnalysis {
  natalChart: FourPillars;
  natalPillarsFull: Pillar[]; // [year, month, day, hour]
  currentDaewoon: CurrentDaewoon;
  targetYear: number;
  targetYearGanji: Ganji;

  yearTenGod: YearTenGodAnalysis;
  yearElementEffect: YearElementEffect;
  strengthImpact: StrengthImpact;

  daewoonSewoonInteraction: DaewoonSewoonInteraction;
  natalSewoonInteractions: NatalSewoonInteraction[];

  activatedTopics: ActivatedTopic[];
  specialStarsActivated: ActivatedSpecialStar[];

  remainingMonthlyFortunes: MonthlyFortuneAnalysis[];
  nextTwoYears: NextYearSummary[];

  /** 기존 분석 결과를 참조용으로 보존 (개인사주에서 재사용한 값) */
  carriedOver: {
    dayMasterStrength: DayMasterStrengthAnalysis;
    usefulGod: UsefulGodAnalysis;
    specialStars: SpecialStarInfo[];
  };

  /** Phase 2 확장 자리 — 본 plan에서는 미사용 */
  advanced?: YearlyAdvancedAnalysis;
}

// ============================================================
// Evidence-to-Narrative block (Y3)
// ============================================================
export type EvidenceRole = 'main' | 'support' | 'tension' | 'caution';

export interface EvidenceNarrativeBlock {
  sectionId: YearlyFortuneSectionId;
  evidence: Array<{
    label: string;
    plainMeaning: string;
    role: EvidenceRole;
  }>;
  causalExplanation: string;
  lifeScene: string;
  positiveUse: string;
  shadowPattern: string;
  practicalAdvice: string;
}

// ============================================================
// 섹션 ID — 개인사주와 겹치지 않게 별도 namespace
// ============================================================
export type YearlyFortuneSectionId =
  | 'yearFlowCard'         // 카드 + 한 줄 요약 (yearlyOverview 포함)
  | 'yearlyMechanism'      // 올해 운이 움직이는 방식
  | 'remainingMonths'      // 남은 월별 흐름
  | 'topicFortunes'        // 일/돈/관계/리듬
  | 'actionGuide'          // 선택 가이드
  | 'nextTwoYears'         // 이후 2년
  | 'evidenceView';        // 명리 근거 보기 (deterministic 렌더, LLM X)

export const YEARLY_SECTION_IDS: YearlyFortuneSectionId[] = [
  'yearFlowCard',
  'yearlyMechanism',
  'remainingMonths',
  'topicFortunes',
  'actionGuide',
  'nextTwoYears',
  'evidenceView',
];

// ============================================================
// Plan — 섹션별 mustUseFact (개인사주 NarrativePlan과 동일 패턴)
// ============================================================
export type YearlyFactSource =
  | 'yearGanji'
  | 'yearTenGod'
  | 'yearElement'
  | 'strengthImpact'
  | 'currentDaewoon'
  | 'daewoonSewoonInteraction'
  | 'natalSewoonInteraction'
  | 'usefulGodInteraction'
  | 'activatedTopic'
  | 'activatedSpecialStar'
  | 'monthlyFortune'
  | 'nextYear'
  | 'userContext';

export interface YearlyMustUseFact {
  id: string;
  source: YearlyFactSource;
  fact: string;
  plainMeaning: string;
  narrativeHint: string;
  matchTokens: string[];
  lifeSceneHint?: {
    situation: string;
    likelyBehavior: string;
    innerReaction: string;
    externalMisunderstanding?: string;
    betterUse?: string;
  };
  adviceHint?: {
    actionable: string;
    avoidPattern?: string;
    activatePattern?: string;
  };
}

export interface YearlyPlanStyleExamples {
  badExample: string;
  goodExample: string;
  transformationRule: string;
}

export interface YearlyPlan {
  sectionId: YearlyFortuneSectionId;
  /** UI 표시 제목 */
  title: string;
  sectionGoal: string;
  mustUseFacts: YearlyMustUseFact[];
  requiredBeats: string[];
  /** 그대로 반복하면 안 되는 phrase (앞 섹션 표현 등) */
  avoidRepeating: string[];
  /** 사용 금지 패턴 — sanitize/validator와 align (단정 미래 예측, 투자 권유 등) */
  avoidPatterns: string[];
  /** 톤 가이드 (친근 존댓말, 흐름 신호 톤 등) */
  toneHints: string[];
  styleExamples: YearlyPlanStyleExamples;
  /** 이 섹션이 다뤄야 할 topic 키 */
  topicTargets?: YearlyTopicKey[];
  /** 구체 제안/조언 */
  suggestionTargets?: string[];
  /** Y4 sectionwise GPT 호출 시 사용할 maxTokens */
  maxTokens?: number;
  /** repair 시 prompt 최상단에 다시 강조할 항목 */
  repairHints?: string[];
}

export type YearlyPlanSet = YearlyPlan[];

/** Y4 sectionwise 호출용 maxTokens (명세 §25) */
export const YEARLY_SECTION_MAX_TOKENS: Record<YearlyFortuneSectionId, number> = {
  yearFlowCard: 1200,
  yearlyMechanism: 1600,
  remainingMonths: 3800,  // 남은 세운 월운(~8개월 × 9필드)은 가장 무거운 섹션 — 2200은 JSON truncation(finish=length) 유발. 완성 보장용 상향.
  topicFortunes: 1800,
  actionGuide: 1200,
  nextTwoYears: 1200,
  evidenceView: 0,   // LLM 호출 없음 (deterministic 렌더)
};

/** 섹션 UI 제목 (사용자 노출) */
export const YEARLY_SECTION_TITLES: Record<YearlyFortuneSectionId, string> = {
  yearFlowCard: '올해의 별빛 흐름',
  yearlyMechanism: '올해 운이 움직이는 방식',
  remainingMonths: '남은 올해 월별 흐름',
  topicFortunes: '일·돈·관계·리듬에서 들어오는 변화',
  actionGuide: '올해의 선택 가이드',
  nextTwoYears: '이후 2년 큰 흐름',
  evidenceView: '명리 근거 보기',
};

// ============================================================
// 출력 리포트 (YearlyFortuneReport)
// ============================================================
export interface YearFlowCard {
  title: string;
  subtitle: string;
  keywords: string[];
  summary: string;
}

export interface YearlyOverview {
  oneLine: string;
  body: string;
}

export interface YearlyMechanismSection {
  body: string;
  evidenceBlocks: EvidenceNarrativeBlock[];
}

export interface RemainingMonthSection {
  monthLabel: string;
  periodLabel: string;
  keyword: string;
  body: string;
  work: string;
  money: string;
  relationship: string;
  goodChoice: string;
  caution: string;
}

export interface TopicFortunes {
  career: string;
  money: string;
  relationship: string;
  rhythm: string;
}

export interface ActionGuide {
  mustCatch: string[];
  betterAvoid: string[];
  bestStrategy: string;
}

export interface NextTwoYearSection {
  year: number;
  keyword: string;
  summary: string;
  opportunity: string;
  caution: string;
}

export interface YearlyFortuneEvidenceView {
  yearGanji: Ganji;
  currentDaewoonPillar: string;          // 예: "병술"
  yearStemTenGod: TenGod;
  yearBranchTenGod: TenGod;
  yearElement: '목' | '화' | '토' | '금' | '수';
  usefulGodRelation: UsefulGodRelation;
  natalSewoonInteractions: Array<{ pillar: string; kind: InteractionKind; plain: string }>;
  daewoonSewoonInteractions: Array<{ kind: InteractionKind; plain: string }>;
  monthlySummary: Array<{ monthLabel: string; ganji: string; keyword: string }>;
  activatedSpecialStars: Array<{ name: string; source: string; plain: string }>;
  /** raw — 접힘 영역에서만 노출 */
  raw?: unknown;
}

export interface YearlyFortuneReport {
  yearFlowCard: YearFlowCard;
  yearlyOverview: YearlyOverview;
  yearlyMechanism: YearlyMechanismSection;
  remainingMonths: RemainingMonthSection[];
  topicFortunes: TopicFortunes;
  actionGuide: ActionGuide;
  nextTwoYears: NextTwoYearSection[];
  evidenceView: YearlyFortuneEvidenceView;
  /**
   * All-mode Action Guide V1 (개운법+흐름+결정 시기). flag(SAJU_ACTION_GUIDE_ENABLED 등) ON일 때만 부착.
   * 기존 actionGuide(mustCatch/betterAvoid/bestStrategy)와 별개의 추가 섹션. OFF면 키 미부착 → byte-identical.
   */
  actionGuideV1?: ActionGuideOutput;
}

// ============================================================
// Validator issue types — 9 high + 12 medium + 3 low
// ============================================================
export type YearlyValidationIssueType =
  // ── high (사용자 노출 blocking) ──
  | 'english-element-key-leak'         // wood/fire/... 영문 키 노출
  | 'unsupported-user-context'         // 아내/남편/자녀 등 단정
  | 'financial-advice-risk'            // 투자/거래/시세 등
  | 'medical-advice-risk'              // 질병/치료/약물 단정
  | 'deterministic-future-claim'       // 반드시/무조건/100% 등
  | 'fear-based-claim'                 // 사고/사망/파산 등 불안 조장
  | 'invented-evidence'                // 계산되지 않은 명리 요소
  | 'section-missing'                  // 필수 섹션 누락
  | 'cross-section-leak'               // 다른 섹션 전용 결론조 침범
  | 'validator-log-output'             // raw validator log 노출
  // ── medium (품질 — 사용자 노출 OK) ──
  | 'missing-year-ten-god-interpretation'  // 세운 십성 해석 없음
  | 'missing-daewoon-sewoon-link'          // 대운-세운 연결 없음
  | 'missing-useful-god-link'              // 용신/기신 연결 없음
  | 'missing-monthly-guidance'             // 월별 가이드 없음
  | 'missing-action-guide'                 // 선택 가이드 없음
  | 'missing-next-two-years'               // 이후 2년 없음
  | 'generic-yearly-overview'              // 1줄 요약 일반론
  | 'weak-evidence-to-narrative'           // 원인→결과→장면→조언 흐름 약함
  | 'special-star-too-shallow'             // 신살 단어만 등장
  | 'missing-life-scene'                   // 실제 장면 부족
  | 'missing-palace-impact'                // 세운이 어느 궁을 건드리는지 없음
  | 'missing-strength-impact'              // 신강/신약 부담/지원 없음
  // ── low (스타일) ──
  | 'weak-transition'
  | 'minor-repetition'
  | 'tone-too-dry';

export interface YearlyValidationIssue {
  type: YearlyValidationIssueType;
  sectionId: YearlyFortuneSectionId | 'global';
  sentence: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface YearlyValidationResult {
  isValid: boolean;
  issues: YearlyValidationIssue[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  /** sectionId(또는 'global') → 해당 섹션 issue 목록 */
  sectionIssues: Record<string, YearlyValidationIssue[]>;
  /** repair 대상 sectionId 목록 (high 1+ 또는 medium 누적 기준 위반 섹션) */
  repairTargets: YearlyFortuneSectionId[];
  shouldRepair: boolean;
}
