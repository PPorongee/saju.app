// 궁합 줄글(narrative) V4 — 타입/스키마 정의 (Phase 1)
//
// 목표: 궁합 결과의 "해설 본문"을 카드/체크리스트 → 몰입형 줄글로 전환.
//   - 올해운세 V4(sectionwise + evidence-to-narrative + sanitizer/validator)와 동일 아키텍처.
//   - 기존 결정적 계산(CompatibilityAnalysisBundle)은 그대로 evidence 원천으로 재사용.
//   - 카드/키워드/SNS 한마디/관계유형 배지/근거 접힘은 UI에서 유지. 본문만 줄글.
//
// Phase 1 범위: sectionId / Report 타입 / section별 JSON schema / relationshipType context /
//   feature flag 타입·상수. (prompt/generator/route/UI/validator 본체·LLM 호출은 이후 Phase.)
//
// 정합 규칙:
//   - sectionwise 전제 (single-call 금지).
//   - ownerSection 기반 중복 방지 (evidence는 한 섹션만 소유 — Phase 2에서 강제).
//   - computedEvidence(bundle) 외 명리 요소 생성 금지.
//   - 점수(score) 중심 구조로 회귀 금지.
//   - 상대 마음/이별/재회/결혼 단정 금지 (fatalism = high).

import type {
  RelationshipType,
  DayMasterRelationKind,
  BranchRelationKind,
} from '../compatibilityTypes';
import { RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_KO } from '../compatibilityTypes';
import type { Element } from '../../rules/elements';

// ============================================================
// 1) 섹션 ID — 8개 (LLM 6 + 결정적 2)
// ============================================================
//
// compatibilityCard / evidenceView 는 결정적(LLM 호출 X).
// 나머지 6개가 sectionwise LLM 생성 대상.
export type CompatNarrativeSectionId =
  | 'compatibilityCard'      // 결정적: 아키타입 한마디 + SNS + 키워드
  | 'relationshipOverview'   // LLM: 관계 핵심 분위기 + 끌림/부딪힘 첫인상 (유형별 톤)
  | 'relationshipMechanism'  // LLM: 명리 구조 원인 (E2N 핵심 장)
  | 'attractionAndFriction'  // LLM: 매력↔부담이 같은 뿌리
  | 'repeatedPattern'        // LLM: 현실 반복 장면 (유형별)
  | 'relationshipGuide'      // LLM: 행동 조언 (대화·거리·역할·타이밍)
  | 'finalAdvice'            // LLM: 관계유형별 결론
  | 'evidenceView';          // 결정적: 명리 근거 raw 접힘

export const COMPAT_NARRATIVE_SECTION_IDS: CompatNarrativeSectionId[] = [
  'compatibilityCard',
  'relationshipOverview',
  'relationshipMechanism',
  'attractionAndFriction',
  'repeatedPattern',
  'relationshipGuide',
  'finalAdvice',
  'evidenceView',
];

/** LLM 호출 대상 섹션 (결정적 2개 제외) */
export const COMPAT_NARRATIVE_LLM_SECTION_IDS: CompatNarrativeSectionId[] = [
  'relationshipOverview',
  'relationshipMechanism',
  'attractionAndFriction',
  'repeatedPattern',
  'relationshipGuide',
  'finalAdvice',
];

/** UI 표시 제목 (사용자 노출) */
export const COMPAT_NARRATIVE_SECTION_TITLES: Record<CompatNarrativeSectionId, string> = {
  compatibilityCard: '두 사람의 관계 카드',
  relationshipOverview: '두 사람의 관계를 한 문장으로 말하면',
  relationshipMechanism: '이 관계가 이렇게 느껴지는 이유',
  attractionAndFriction: '서로에게 끌리는 지점과 엇갈리는 지점',
  repeatedPattern: '현실에서 반복되기 쉬운 관계 패턴',
  relationshipGuide: '이 관계를 좋게 쓰는 방법',
  finalAdvice: '관계 유형별 마지막 조언',
  evidenceView: '명리 근거 보기',
};

/** sectionwise 호출 maxTokens. 결정적 섹션은 0 (LLM 호출 없음).
 *  relationshipMechanism이 가장 무거움(E2N + evidenceBlocks). truncation 방지용 여유. */
export const COMPAT_NARRATIVE_SECTION_MAX_TOKENS: Record<CompatNarrativeSectionId, number> = {
  compatibilityCard: 0,
  relationshipOverview: 1100,
  relationshipMechanism: 2000,
  attractionAndFriction: 1500,
  repeatedPattern: 1700,
  relationshipGuide: 1500,
  finalAdvice: 1200,
  evidenceView: 0,
};

// ============================================================
// 2) Evidence-to-Narrative 블록 (명세 §7 6단계)
//    명리 근거 → 쉬운 뜻 → 두 사람 사이 방식 → 좋게 → 꼬일 때 → 사용법
// ============================================================
export type CompatEvidenceRole = 'main' | 'support' | 'tension' | 'caution';

export interface CompatEvidenceBlock {
  /** 이 블록이 속한 섹션 (ownerSection 정합 확인용) */
  sectionId: CompatNarrativeSectionId;
  evidence: Array<{
    label: string;        // 명리 근거 라벨 (예: "일지 충")
    plainMeaning: string; // 쉬운 뜻
    role: CompatEvidenceRole;
  }>;
  causalExplanation: string;  // 근거가 관계에 작용하는 원인
  betweenScene: string;       // 두 사람 사이에서 나타나는 방식 (관계 장면)
  positiveUse: string;        // 좋게 작동할 때
  shadowPattern: string;      // 꼬일 때
  practicalAdvice: string;    // 관계를 좋게 쓰는 방법
}

// ============================================================
// 3) 섹션별 출력 shape
// ============================================================

/** 결정적 — 아키타입/strategy layer에서 코드가 채움 (LLM X) */
export interface CompatibilityCardSection {
  title: string;        // 관계 한마디 (아키타입)
  snsPhrase: string;    // SNS 공유용 문구
  keywords: string[];   // 관계 키워드 3~5
}

export interface RelationshipOverviewSection {
  oneLine: string;  // 관계 핵심 한 문장
  body: string;     // 핵심 분위기 + 끌림/부딪힘 첫인상 (너무 길지 않게)
}

export interface RelationshipMechanismSection {
  body: string;                          // 명리 구조 원인 줄글 (용어 즉시 풀이)
  evidenceBlocks: CompatEvidenceBlock[];  // E2N 블록 (1~3)
}

export interface AttractionAndFrictionSection {
  body: string;  // 매력과 부담이 같은 뿌리에서 나오는 구조 (줄글)
}

export interface RepeatedPatternSection {
  body: string;  // 현실 반복 장면 (관계유형별 관심사 흡수)
}

export interface RelationshipGuideSection {
  body: string;  // 행동 조언 (대화/거리/역할/타이밍) — 추상 조언 금지
}

export interface FinalAdviceSection {
  body: string;  // 관계유형별 결론 (앞 섹션 재요약 금지, 선택기준으로). 3년 흐름은 아주 짧게만 연결.
}

/** 결정적 — bundle에서 코드가 구성 (LLM X). 근거 접힘 렌더용. */
export interface CompatEvidenceView {
  relationshipType: RelationshipType;
  relationshipTypeKo: string;
  archetypeTitle: string;
  dayMasterRelation: { relation: DayMasterRelationKind; balance: string; plain: string };
  spousePalaceRelation: { kinds: BranchRelationKind[]; intensity: string; plain: string };
  elementComplement: { aNeedsFromB: Element[]; bNeedsFromA: Element[]; mutual: string };
  tenGodInteraction: { aFeelsBAs: string[]; bFeelsAAs: string[] };
  usefulGodInteraction: { plain: string };
  combinationConflicts: {
    combinations: string[];
    conflicts: string[];
    punishments: string[];
    destructions: string[];
    harms: string[];
  };
  /** 접힘 영역에서만 노출되는 raw (선택) */
  raw?: unknown;
}

// ============================================================
// 4) 최종 리포트
// ============================================================
export interface CompatibilityNarrativeReport {
  compatibilityCard: CompatibilityCardSection;       // 결정적
  relationshipOverview: RelationshipOverviewSection;  // LLM
  relationshipMechanism: RelationshipMechanismSection;// LLM
  attractionAndFriction: AttractionAndFrictionSection;// LLM
  repeatedPattern: RepeatedPatternSection;            // LLM
  relationshipGuide: RelationshipGuideSection;        // LLM
  finalAdvice: FinalAdviceSection;                    // LLM
  evidenceView: CompatEvidenceView;                   // 결정적
}

// ============================================================
// 5) 관계 유형 context — 같은 계산 결과라도 유형별로 강조점이 달라짐 (명세 §5/§12)
//    여기서는 "관심사 키"만 정의 (prose 예시·하드코딩 금지 — prompt는 이후 Phase).
// ============================================================
export interface RelationshipTypeFocus {
  /** repeatedPattern/relationshipGuide/finalAdvice에서 강조할 관심사 키 */
  primaryConcerns: string[];
  /** 문체/접근 톤 힌트 */
  toneHint: string;
}

export const RELATIONSHIP_TYPE_FOCUS: Record<RelationshipType, RelationshipTypeFocus> = {
  dating: {
    primaryConcerns: ['끌리는 이유', '싸우는 이유', '연락·표현 방식 차이', '감정 온도 차이', '오래 가려면 맞출 것', '관계 안정 방식'],
    toneHint: '설레는 동시에 현실적인 균형',
  },
  married: {
    primaryConcerns: ['생활 리듬', '돈·역할·책임 분담', '가족·현실 문제', '감정 표현보다 생활 구조', '갈등 장기화 방지', '안전지대와 피로 지점'],
    toneHint: '생활 동반자 관점, 차분하게',
  },
  friendship: {
    primaryConcerns: ['편한 지점', '서운함이 생기는 지점', '오래 가는 거리감', '서로에게 어떤 친구인지', '조언 방식', '기대치 조절'],
    toneHint: '가볍지만 깊이 있는 우정 톤',
  },
  coworker: {
    primaryConcerns: ['업무 스타일', '의사결정 방식', '속도 차이', '책임감·실행력·기획력 조합', '시너지와 충돌', '역할 분담 기준'],
    toneHint: '협업·실무 관점, 감정보다 구조',
  },
  reunion_or_breakup: {
    primaryConcerns: ['다시 끌리는 이유', '같은 문제 반복 가능성', '재회 전 바뀌어야 할 조건', '정리하는 게 나은 신호', '감정과 현실 분리'],
    toneHint: '단정 금지, 선택 기준 제공',
  },
  crush_or_something: {
    primaryConcerns: ['편하게 느끼는 접근 속도', '부담을 느끼는 방식', '신호를 오해하기 쉬운 부분', '자연스럽게 가까워지는 법', '확신·압박 금지'],
    toneHint: '조심스럽고 다정하게',
  },
};

/** generator/prompt가 받는 narrative 컨텍스트 */
export interface CompatNarrativeContext {
  relationshipType: RelationshipType;
  /** 관계 유형 한글 라벨 (RELATIONSHIP_TYPE_KO) */
  relationshipTypeKo: string;
  /** 유형별 관심사/톤 (RELATIONSHIP_TYPE_FOCUS) */
  focus: RelationshipTypeFocus;
}

/** RelationshipType → CompatNarrativeContext 헬퍼 (순수, 데이터 조립만) */
export function buildCompatNarrativeContext(relationshipType: RelationshipType): CompatNarrativeContext {
  return {
    relationshipType,
    relationshipTypeKo: RELATIONSHIP_TYPE_KO[relationshipType],
    focus: RELATIONSHIP_TYPE_FOCUS[relationshipType],
  };
}

// ============================================================
// 6) Feature flags — 기본 OFF (flag off면 기존 궁합 경로 그대로)
// ============================================================
//   - COMPAT_NARRATIVE_API_ENABLED            (server) — 새 narrative 라우트 활성
//   - COMPAT_NARRATIVE_VERIFY_SECRET          (server) — UI off 상태로 제한 검증할 때 헤더 강제
//   - NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED (client) — UI에서 줄글 본문 렌더
export interface CompatNarrativeServerFlags {
  apiEnabled: boolean;               // COMPAT_NARRATIVE_API_ENABLED === 'true'
  verifySecret: string | undefined;  // COMPAT_NARRATIVE_VERIFY_SECRET (정의되면 헤더 강제)
}

export const COMPAT_NARRATIVE_FLAG_ENV = {
  apiEnabled: 'COMPAT_NARRATIVE_API_ENABLED',
  verifySecret: 'COMPAT_NARRATIVE_VERIFY_SECRET',
  uiEnabled: 'NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED',
} as const;

/** 기본값 — 모두 비활성. flag off면 기존 카드형 궁합/route가 그대로 동작. */
export const COMPAT_NARRATIVE_DEFAULTS = {
  apiEnabled: false,
  uiEnabled: false,
} as const;

// ============================================================
// 7) section별 JSON schema (LLM 출력 강제용 — 예시 skeleton, 유효 JSON)
//    결정적 섹션(compatibilityCard/evidenceView)은 LLM 호출 없음 → schema 없음.
//    값은 placeholder. 특정 일간/오행/사주값 hardcode 금지 (구조만).
// ============================================================
const SCHEMA_relationshipOverview = JSON.stringify({
  relationshipOverview: { oneLine: '', body: '' },
});

const SCHEMA_relationshipMechanism = JSON.stringify({
  relationshipMechanism: {
    body: '',
    evidenceBlocks: [
      {
        evidence: [{ label: '', plainMeaning: '', role: 'main' }],
        causalExplanation: '',
        betweenScene: '',
        positiveUse: '',
        shadowPattern: '',
        practicalAdvice: '',
      },
    ],
  },
});

const SCHEMA_attractionAndFriction = JSON.stringify({
  attractionAndFriction: { body: '' },
});

const SCHEMA_repeatedPattern = JSON.stringify({
  repeatedPattern: { body: '' },
});

const SCHEMA_relationshipGuide = JSON.stringify({
  relationshipGuide: { body: '' },
});

const SCHEMA_finalAdvice = JSON.stringify({
  finalAdvice: { body: '' },
});

/** LLM 섹션 → 출력 JSON schema (string). 키 집합 == COMPAT_NARRATIVE_LLM_SECTION_IDS. */
export const COMPAT_NARRATIVE_JSON_SCHEMAS: Record<
  Exclude<CompatNarrativeSectionId, 'compatibilityCard' | 'evidenceView'>,
  string
> = {
  relationshipOverview: SCHEMA_relationshipOverview,
  relationshipMechanism: SCHEMA_relationshipMechanism,
  attractionAndFriction: SCHEMA_attractionAndFriction,
  repeatedPattern: SCHEMA_repeatedPattern,
  relationshipGuide: SCHEMA_relationshipGuide,
  finalAdvice: SCHEMA_finalAdvice,
};

// ============================================================
// 8) Evidence Fact / Plan 타입 (Phase 2 — yearly V4 mirror)
//    - formatCompatEvidence: bundle → CompatMustUseFact[] (각 fact는 EXACTLY ONE ownerSection)
//    - buildCompatNarrativePlans: facts → 섹션별 CompatNarrativePlan (LLM 6개 섹션)
//    - computedEvidence(bundle) 외 명리 요소 생성 금지. style example에 특정 사주값 hardcode 금지.
// ============================================================

/** fact의 출처(원천) — CompatibilityAnalysisBundle 필드 단위 */
export type CompatFactSource =
  | 'dayMasterRelation'
  | 'spousePalaceRelation'
  | 'elementComplement'
  | 'tenGodInteraction'
  | 'usefulGodInteraction'
  | 'combinationConflicts'
  | 'attraction'
  | 'conflict'
  | 'recovery'
  | 'stability'
  | 'archetype'
  | 'keywords'
  | 'choices'
  | 'strengths'
  | 'risks'
  | 'futureFlow'
  | 'relationshipType';

/** 하나의 근거 단위. yearly의 YearlyMustUseFact와 동일 형태. */
export interface CompatMustUseFact {
  /** prefix로 ownerSection을 식별 (getOwnerSectionOf와 정합) */
  id: string;
  source: CompatFactSource;
  /** 이 fact를 소유하는 단 하나의 섹션 (중복 배정 금지) */
  ownerSection: CompatNarrativeSectionId;
  /** 명리 근거 그 자체 (사람용으로 압축된 한 줄) */
  fact: string;
  /** 쉬운 뜻 (용어 즉시 풀이) */
  plainMeaning: string;
  /** 줄글로 어떻게 녹여야 하는지 힌트 */
  narrativeHint: string;
  /** validator가 흡수 여부를 확인할 짧은 한국어 토큰 */
  matchTokens: string[];
  /** E2N 블록에서의 역할 (선택) */
  role?: CompatEvidenceRole;
  /** 현실 장면 시드 (선택) */
  lifeSceneHint?: {
    situation: string;
    likelyBehavior: string;
    innerReaction: string;
    externalMisunderstanding?: string;
    betterUse?: string;
  };
  /** 조언 시드 (선택) */
  adviceHint?: {
    actionable: string;
    avoidPattern?: string;
    activatePattern?: string;
  };
}

export interface CompatNarrativePlanStyleExamples {
  badExample: string;
  goodExample: string;
  transformationRule: string;
}

export interface CompatNarrativePlan {
  sectionId: CompatNarrativeSectionId;
  /** UI 표시 제목 (COMPAT_NARRATIVE_SECTION_TITLES) */
  title: string;
  sectionGoal: string;
  /** ownerSection === sectionId인 fact만 (중복 0) */
  mustUseFacts: CompatMustUseFact[];
  /** 반드시 다뤄야 할 beat — 관계유형별로 달라짐 */
  requiredBeats: string[];
  /** 앞 섹션 표현 등 그대로 반복 금지 */
  avoidRepeating: string[];
  /** 사용 금지 패턴 — sanitizer/validator와 align (점수·운명단정·상대마음단정·일반론) */
  avoidPatterns: string[];
  /** 톤 가이드 — 관계유형별로 달라짐 */
  toneHints: string[];
  styleExamples: CompatNarrativePlanStyleExamples;
  /** 이 섹션이 다뤄야 할 관심사 키 (관계유형 focus) */
  topicTargets?: string[];
  /** sectionwise LLM 호출 maxTokens */
  maxTokens?: number;
  /** repair 시 prompt 최상단에 다시 강조할 항목 */
  repairHints?: string[];
}

export type CompatNarrativePlanSet = CompatNarrativePlan[];

// ============================================================
// 9) Validation 타입 (Phase 4 — yearly YearlyValidationResult mirror)
//    severity 정책 (핵심 lesson):
//      - 사용자 노출 위험 = high (fatalism/단정/노출/invented/score-leak/log-leak/parse/length)
//      - 품질·분량·일반론 = medium
//      - relationship-fatalism = high
// ============================================================
export type CompatNarrativeIssueType =
  // ── high (사용자 노출 blocking) ──
  | 'section-missing'              // 필수 섹션 누락
  | 'cross-section-leak'           // 다른 섹션 전용 결론조 침범
  | 'unsupported-user-context'     // 배우자/자녀 등 단정 (관계 상태 미상)
  | 'deterministic-future-claim'   // 결혼/이혼/재회/이별 단정
  | 'fear-based-claim'             // 불안 조장 (헤어진다/끝장 등)
  | 'relationship-fatalism'        // 운명/반드시 헤어진다/상대 마음 단정 (mind-reading 포함)
  | 'invented-evidence'            // 계산되지 않은 합·충·형·파·해/신살
  | 'validator-log-output'         // fact id/sectionId/내부 schema 토큰 노출
  | 'score-leak'                   // N점 / 상위 N% / 궁합 N 점수 노출
  | 'json-parse-failed'            // generatorFlags: 섹션 JSON 파싱 실패
  | 'finish-length'                // generatorFlags: 길이 초과로 truncated
  // ── medium (품질 — 사용자 노출 OK) ──
  | 'relationship-type-focus-missing'   // 유형 관심사 토큰이 type-aware 섹션에 미흡수
  | 'weak-evidence-to-narrative'        // evidenceBlocks 비거나 6단계 일부 누락
  | 'generic-advice'                    // "서로 배려/소통 중요" 등 일반론
  | 'repeated-content'                  // 섹션 간 동일 문장/조언 반복
  | 'missing-life-scene'                // 관계 장면 부족
  | 'weak-final-advice'                 // finalAdvice가 앞 섹션 재요약
  | 'mechanism-too-shallow'             // 명리 근거 토큰 미언급
  | 'attraction-friction-too-separated' // 끌림/엇갈림이 한 뿌리로 안 엮임
  | 'qna-interest-not-absorbed';        // 유형 관심사 미반영

export interface CompatNarrativeValidationIssue {
  type: CompatNarrativeIssueType;
  sectionId: CompatNarrativeSectionId | 'global';
  sentence: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface CompatNarrativeValidationResult {
  isValid: boolean;
  issues: CompatNarrativeValidationIssue[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  /** sectionId(또는 'global') → 해당 섹션 issue 목록 */
  sectionIssues: Record<string, CompatNarrativeValidationIssue[]>;
  /** repair 대상 sectionId 목록 (high 1+ 또는 medium 누적 기준 위반 섹션) */
  repairTargets: CompatNarrativeSectionId[];
  shouldRepair: boolean;
}

// 재노출 (다른 모듈 편의)
export { RELATIONSHIP_TYPES, RELATIONSHIP_TYPE_KO };
export type { RelationshipType };
