// Paid Report Productization V1 — 유료 사주 리포트 구조화 스키마.
//
// 설계 원칙(사용자 spec):
//   1. GPT가 전체 리포트를 창작하지 않는다. 코드가 coreAnalysis에서 module object를 먼저 만든다.
//   2. 사용자에게 보이는 모든 verdict는 evidenceIds로 명리 근거에 연결된다 (근거 없는 verdict 금지).
//   3. GPT는 이미 결정된 verdict를 2~4문장 microcopy로 다듬는 역할만 한다 (별도 단계).
//   4. 첫 화면은 판정형/카드형 모듈, 기존 긴 줄글은 detailedNarrative(accordion)로 강등.
//
// 이 파일은 deriver / validator / renderer / route / UI가 공유하는 단일 타입 출처다.

import type { Element } from '../rules/elements';

// ============================================================
// 공통 타입
// ============================================================

export type PaidConfidence = 'high' | 'medium' | 'low';
export type PaidRiskLevel = 'none' | 'low' | 'medium' | 'high';

/** evidenceMap의 항목 — 사용자에게 보이는 verdict가 가리키는 명리 근거. */
export type PaidEvidenceSource =
  | 'dayMaster'
  | 'dayMasterStrength'
  | 'tenGod'
  | 'element'
  | 'specialStar'
  | 'usefulGod'
  | 'combination'
  | 'conflict'
  | 'daewoon'
  | 'sewoon'
  | 'specialPoint'
  | 'careerAnalysis'
  | 'futureTiming';

export interface PaidEvidenceRef {
  /** evidenceMap key. 컨벤션: `<source>:<slug>` (예: 'tenGod:상관', 'usefulGod:primary', 'specialStar:천을귀인'). */
  id: string;
  source: PaidEvidenceSource;
  /** 사용자에게 보여줄 짧은 근거 라벨 (예: '천을귀인', '재성 약함', '임수 매우신약'). */
  label: string;
  /** 내부 설명 (디버그/품질검사용, 카드 본문에 직접 노출하지 않을 수 있음). */
  detail: string;
}

export type PaidEvidenceMap = Record<string, PaidEvidenceRef>;

/** 모든 유료 모듈의 공통 베이스. */
export interface PaidModuleBase {
  id: string;
  title: string;
  subtitle?: string;
  /** 판정형 한 줄 (deterministic seed — GPT microcopy 전의 결정론 문장). */
  verdict: string;
  /** ⚠️ 비어 있으면 invalid. evidence 없는 verdict는 생성 금지. */
  evidenceIds: string[];
  confidence: PaidConfidence;
  /** 카드 정렬 우선순위 (낮을수록 먼저). */
  displayPriority: number;
  riskLevel: PaidRiskLevel;
  /** 이 모듈에서 절대 말하면 안 되는 주장 (validator/renderer가 강제). */
  forbiddenClaims: string[];
}

/** evidenceIds를 갖는 작은 판정 항목 (모듈 내부 리스트 요소). */
export interface PaidVerdictItem {
  /** 판정형 한 줄. */
  text: string;
  /** 부연 (왜 — 명리 근거의 사람 친화적 한 줄). */
  why: string;
  evidenceIds: string[];
}

// ============================================================
// 모듈별 타입
// ============================================================

/** 1. 아키타입 카드 — 별명/캐릭터 (star/starKeywordCard 재사용 + 강화). */
export interface PaidArchetypeCard extends PaidModuleBase {
  /** "~~~한 별" 형태의 별명. */
  nickname: string;
  oneLiner: string;
  /** 핵심 키워드 (3~5개). */
  keywords: string[];
  brightSide: string;
  shadowSide: string;
}

/** 2. 핵심 요약 — 키워드 5개 + 한 줄. */
export interface PaidCoreSummary {
  keywords: string[];
  oneLiner: string;
  evidenceIds: string[];
}

/** 3. 무기 (강점). lifeWeapons 기반. */
export interface PaidWeaponItem extends PaidModuleBase {
  scene: string;     // 실제 삶의 장면
  howToUse: string;  // 활용법
}

/** 4. 함정 (약점/주의). lifeTraps 기반. */
export interface PaidTrapItem extends PaidModuleBase {
  pattern: string;   // 반복 패턴
  escape: string;    // 빠져나오는 법
}

/** 5. 사람 가이드. usefulGod/tenGod/specialStar 기반 신규 deriver. */
export interface PaidPeopleGuide extends PaidModuleBase {
  closer: PaidVerdictItem[];        // 가까이하면 좋은 사람
  avoid: PaidVerdictItem[];         // 멀리해야 할 사람
  goodCollaborator: PaidVerdictItem[]; // 같이 일하면 좋은 사람
  avoidPattern: PaidVerdictItem[];  // 피해야 할 관계 패턴
}

/** 6. 돈 가이드. careerAnalysis.moneyMakingStyle + fortuneTriggers + 재성구조 기반. */
export interface PaidMoneyGuide extends PaidModuleBase {
  earnRoutes: PaidVerdictItem[];     // 돈이 붙는 루트
  leakRoutes: PaidVerdictItem[];     // 돈이 새는 루트
  fitMonetization: PaidVerdictItem[]; // 맞는 수익화 방식
  avoidMoneyStyle: PaidVerdictItem[]; // 피해야 할 돈 방식
}

/** 7. 타이밍 가이드. futureTimingAnalysis + fortune.nextThreeYears 기반. */
export interface PaidTimingYear {
  year: number;
  age?: number;
  /** 사용자 노출 라벨 — 순화됨 ("운이 강하게 열리는 해"). 내부 label은 강해도 노출은 순화. */
  label: string;
  why: string;
  evidenceIds: string[];
  confidence: PaidConfidence;
}
export interface PaidTimingGuide extends PaidModuleBase {
  openingYears: PaidTimingYear[];   // 운이 강하게 열리는 해
  cautionYears: PaidTimingYear[];   // 조심해야 할 해
}

/** 8. 행운 가이드. usefulGod 오행 → 오행-상징 lookup. */
export interface PaidLuckGuide extends PaidModuleBase {
  items: string[];
  colors: string[];
  places: string[];
  routines: string[];
  blockingEnvironments: string[];   // 운을 막는 환경 (기신 오행 기반)
}

/** 9. 직업 가이드. careerSpecificAnalysis 기반. */
export interface PaidCareerFit {
  industry: string;
  roles: string[];
  why: string;
  evidenceIds: string[];
  fitScore: number;
}
export interface PaidCareerGuide extends PaidModuleBase {
  topFits: PaidCareerFit[];
  conditionalFits: PaidCareerFit[];
  avoidEnvironments: PaidVerdictItem[];
  bestWorkStyle: PaidVerdictItem[];
}

/** 10. 관계 가이드. specialPoints(relationship) + 십성(관성/재성) + 신살(도화/홍염). */
export interface PaidRelationshipGuide extends PaidModuleBase {
  attractionStyle: PaidVerdictItem[];   // 매력/끌림의 결
  relationshipPattern: PaidVerdictItem[]; // 반복되는 관계 패턴
  whatHelps: PaidVerdictItem[];         // 관계가 좋아지는 조건
  whatHurts: PaidVerdictItem[];         // 관계를 해치는 패턴
}

/** 기존 긴 줄글 — 강등된 상세 해설(accordion). 삭제하지 않음. */
export interface PaidDetailedNarrativeSection {
  id: string;
  title: string;
  body: string;
}
export interface PaidDetailedNarrative {
  /** 기존 narrative reportText(또는 섹션 분해)를 그대로 담는다. */
  sections: PaidDetailedNarrativeSection[];
}

/**
 * 줄글(prose) 렌더링용 — 결정론 모듈을 카드가 아닌 "연결된 문단"으로 푼 것.
 * 메인 narrative 아래 "실전 가이드"로 붙어, narrative에 없던 새 콘텐츠(사람·돈루트·타이밍·행운)를
 * 같은 줄글 톤으로 읽히게 한다. body는 이미 검증된 결정론 문구를 이어붙인 것.
 */
export interface PaidProseSection {
  id: string;
  /** 섹션 제목 (예: '가까이할 사람, 거리 둘 사람'). */
  title: string;
  /** 한 단락 이상의 줄글 본문. */
  body: string;
  /** 이 섹션이 쓴 근거 evidenceIds (선택적 '근거 보기'용). */
  evidenceIds: string[];
}

// ============================================================
// Validation
// ============================================================

export type PaidValidationIssueType =
  | 'missing-evidence'         // visible verdict에 evidenceIds 없음
  | 'forbidden-generic-phrase' // 범용 코칭 클리셰
  | 'accuracy-conflict'        // coreAnalysis와 모듈이 충돌 (예: 신약인데 '혼자 버티는 힘')
  | 'guarantee-claim'          // 보장/단정 표현
  | 'unsafe-claim'             // 의료/투자/결혼/임신/건강 확정
  | 'duplicate-across-modules' // 모듈 간 동일 문구 수렴
  | 'evidence-id-dangling';    // evidenceIds가 evidenceMap에 없음

export interface PaidValidationIssue {
  type: PaidValidationIssueType;
  moduleId: string;
  text: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
}

export interface PaidReportValidation {
  isValid: boolean;            // high 이슈 0개면 true
  issues: PaidValidationIssue[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
}

// ============================================================
// 최상위 리포트
// ============================================================

export interface PaidReportMeta {
  version: 'paid-v1';
  dayMaster: string;            // 예: '임'
  dayMasterElement: Element;
  strength: string;             // dayMasterStrength.level
  /** 결정론 생성 표식 — GPT 없이 만들어졌음. microcopy 적용 후에도 verdict 근거는 불변. */
  generatedDeterministically: boolean;
  /** GPT microcopy가 적용되었는지 (deterministic-only면 false). */
  microcopyApplied: boolean;
}

export interface PaidSajuReportV1 {
  meta: PaidReportMeta;
  archetypeCard: PaidArchetypeCard;
  coreSummary: PaidCoreSummary;
  weapons: PaidWeaponItem[];           // 최대 3
  traps: PaidTrapItem[];               // 최대 3
  peopleGuide: PaidPeopleGuide;
  moneyGuide: PaidMoneyGuide;
  timingGuide: PaidTimingGuide;
  luckGuide: PaidLuckGuide;
  careerGuide: PaidCareerGuide;
  relationshipGuide: PaidRelationshipGuide;
  /** 줄글 "실전 가이드" — 메인 narrative 아래에 붙는 prose 섹션들(사람·돈·타이밍·행운). */
  prose: PaidProseSection[];
  detailedNarrative: PaidDetailedNarrative;
  evidenceMap: PaidEvidenceMap;
  validation: PaidReportValidation;
}
