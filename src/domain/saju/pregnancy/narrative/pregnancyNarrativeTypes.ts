// 임산부 모드 V4 — Pregnancy Narrative — 타입/스키마 정의 (Phase 1)
//
// 목표: 임산부 결과의 "해설 본문"을 구형 점수카드/13섹션 단일 프롬프트 → 몰입형 줄글로 전환.
//   - 개인사주/올해운세/궁합 narrative V4와 동일 아키텍처(sectionwise + evidence-to-narrative
//     + sanitizer/validator + repair 기본 0 + finish=length 감지).
//   - 엄마/아기 예정일 사주는 calculateAnalysisOnly(BirthInput)로 결정적 계산, evidence 원천 재사용.
//   - 엄마-아이 관계는 궁합 interaction 분석기만 선별 재사용 (연애 layers/archetype 미사용).
//
// 핵심 안전 원칙 (의료/출산 민감):
//   - 의료/분만/건강/태아건강/조산/유산/성별 예측 절대 금지.
//   - 출산일 결정/추천/특정 날짜 출산 유도 금지.
//   - 아이 성격/운명 단정 금지 → "출생예정일 기준으로 보면" 톤 강제.
//   - 엄마 탓 표현 금지.
//   - computedEvidence(분석 결과) 외 명리 요소 생성 금지.
//   - 태명은 결정적 풀에서만 — LLM이 새 이름 창작 금지.
//   - 고정 안내문 강제 삽입 (sanitizer가 보장).

import type { BirthInput, BirthTimeConfidence } from '../../calendar/normalizeBirthInput';
import { ELEMENT_KO, type Element } from '../../rules/elements';
import type { EventForecast } from '../../eventForecast/eventForecastTypes';
import type {
  DayMasterRelationKind,
  BranchRelationKind,
} from '../../compatibility/compatibilityTypes';

// ============================================================
// 0) 고정 안내문 (sanitizer가 리포트에 강제 삽입)
// ============================================================
export const PREGNANCY_DISCLAIMER =
  '이 리포트는 출생예정일 기준의 사주적 해석이며, 실제 출생일과 시간에 따라 달라질 수 있습니다. ' +
  '건강·분만·의학적 판단은 반드시 담당 의료진의 안내를 따르세요.';

/** 후보일 비교(고급 기능, P10+) 전용 안내문 — base V4에서는 CTA만 노출 */
export const PREGNANCY_CANDIDATE_DISCLAIMER =
  '이 기능은 출산일을 정해주는 기능이 아닙니다. 출산일과 분만 방식은 반드시 담당 의료진의 판단을 우선해야 합니다. ' +
  '아래 해석은 의료진이 이미 허용한 날짜 범위 안에서 사주적 분위기를 참고하는 보조 정보입니다.';

// ============================================================
// 1) 섹션 ID — 10개 (결정적 3 + LLM 7)
// ============================================================
export type PregnancyNarrativeSectionId =
  | 'motherBabyCard'                // 결정적: 별빛 카드 + 한마디 + 키워드 + 태교 방향 한 줄
  | 'openingConnection'             // LLM: 이 아이는 엄마에게 어떤 별처럼 오는가 (첫인상)
  | 'motherChildMechanism'          // LLM: 엄마와 아이의 기운이 만나는 방식 (E2N 핵심 장)
  | 'motherComfortRhythm'           // LLM: 엄마가 임신 기간에 편안해지는 방식
  | 'babyEnergyAndFit'              // LLM: 아이 예정일 기준 기운 + 닮은점/다른점 + 잘 맞는 지점
  | 'taegyoGuide'                   // LLM: 조심할 태교 패턴 + 맞는 태교 3가지
  | 'motherFortuneRoutine'          // LLM: 엄마를 위한 개운 루틴 (행동 중심)
  | 'familySupportAndFinalMessage'  // LLM: 가족 부탁 + 아이에게 전하는 마지막 한 문장
  | 'babyNames'                     // 결정적: 태명 후보 (오행 풀 기반)
  | 'evidenceView';                 // 결정적: 명리 근거 raw 접힘

export const PREGNANCY_NARRATIVE_SECTION_IDS: PregnancyNarrativeSectionId[] = [
  'motherBabyCard',
  'openingConnection',
  'motherChildMechanism',
  'motherComfortRhythm',
  'babyEnergyAndFit',
  'taegyoGuide',
  'motherFortuneRoutine',
  'familySupportAndFinalMessage',
  'babyNames',
  'evidenceView',
];

/** LLM 호출 대상 섹션 (결정적 3개 제외) */
export const PREGNANCY_NARRATIVE_LLM_SECTION_IDS: PregnancyNarrativeSectionId[] = [
  'openingConnection',
  'motherChildMechanism',
  'motherComfortRhythm',
  'babyEnergyAndFit',
  'taegyoGuide',
  'motherFortuneRoutine',
  'familySupportAndFinalMessage',
];

/** 결정적(LLM 호출 없음) 섹션 */
export const PREGNANCY_NARRATIVE_DETERMINISTIC_SECTION_IDS: PregnancyNarrativeSectionId[] = [
  'motherBabyCard',
  'babyNames',
  'evidenceView',
];

/** UI 표시 제목 (사용자 노출) */
export const PREGNANCY_NARRATIVE_SECTION_TITLES: Record<PregnancyNarrativeSectionId, string> = {
  motherBabyCard: '엄마와 아이의 별빛 카드',
  openingConnection: '이 아이는 엄마에게 어떤 별처럼 오는가',
  motherChildMechanism: '엄마와 아이의 기운이 만나는 방식',
  motherComfortRhythm: '엄마가 임신 기간에 편안해지는 방식',
  babyEnergyAndFit: '아이 예정일 기준으로 보이는 기운과 잘 맞는 지점',
  taegyoGuide: '이 조합에 맞는 태교 방향',
  motherFortuneRoutine: '엄마를 위한 개운 루틴',
  familySupportAndFinalMessage: '가족과 함께 읽는 마지막 이야기',
  babyNames: '태명 후보',
  evidenceView: '명리 근거 보기',
};

/** sectionwise 호출 maxTokens. 결정적 섹션은 0. mechanism/taegyo가 가장 무거움(truncation 방지 여유). */
export const PREGNANCY_NARRATIVE_SECTION_MAX_TOKENS: Record<PregnancyNarrativeSectionId, number> = {
  motherBabyCard: 0,
  openingConnection: 1200,
  motherChildMechanism: 2000,
  motherComfortRhythm: 1500,
  babyEnergyAndFit: 1600,
  taegyoGuide: 2000,
  motherFortuneRoutine: 1500,
  familySupportAndFinalMessage: 1600,
  babyNames: 0,
  evidenceView: 0,
};

// ============================================================
// 2) Evidence-to-Narrative 블록 (명리 근거 → 쉬운 뜻 → 두 사람 사이 방식 → 좋게 → 꼬일 때 → 사용법)
// ============================================================
export type PregnancyEvidenceRole = 'main' | 'support' | 'tension' | 'caution';

export interface PregnancyEvidenceBlock {
  sectionId: PregnancyNarrativeSectionId;
  evidence: Array<{
    label: string;        // 명리 근거 라벨 (예: "엄마 용신 수")
    plainMeaning: string; // 쉬운 뜻
    role: PregnancyEvidenceRole;
  }>;
  causalExplanation: string;  // 근거가 작용하는 원인
  betweenScene: string;       // 엄마-아이 사이에서 나타나는 방식 (관계 장면)
  positiveUse: string;        // 좋게 작동할 때
  shadowPattern: string;      // 조심할 때 (의료 표현 금지 — 정서/리듬 차원)
  taegyoAdvice: string;       // 태교/생활 리듬 차원의 조언
}

// ============================================================
// 3) 섹션별 출력 shape
// ============================================================

/** 결정적 — 카드. LLM 호출 없음. */
export interface MotherBabyCardSection {
  title: string;            // 엄마-아이 관계 한마디 (감성 카드)
  snsPhrase: string;        // SNS 공유용 짧은 문구
  keywords: string[];       // 관계 키워드 3~5
  taegyoDirection: string;  // 태교 방향 한 줄
}

export interface OpeningConnectionSection {
  oneLine: string;  // 한 문장 ("출생예정일 기준" 톤)
  body: string;     // 첫인상 + 아이가 상징적으로 가져오는 의미
}

export interface MotherChildMechanismSection {
  body: string;                              // 기운이 만나는 방식 줄글 (용어 즉시 풀이)
  evidenceBlocks: PregnancyEvidenceBlock[];  // E2N 블록 (1~3)
}

export interface MotherComfortRhythmSection {
  body: string;  // 엄마가 편안해지는 방식 (신강신약/용신/감정 리듬/도움 요청, 의료 금지)
}

export interface BabyEnergyAndFitSection {
  body: string;  // 아이 예정일 기운 + 닮은점/다른점 + 잘 맞는 지점 (성격 단정 금지)
}

export interface TaegyoGuideSection {
  body: string;  // 조심할 태교 패턴 + 맞는 태교 3가지 (3축: 엄마 용신 / 아이 기운 / 보완)
}

export interface MotherFortuneRoutineSection {
  body: string;  // 개운 루틴 (색/공간/소리/기록/정리/도움, 물건구매식 금지, 행동 중심)
}

export interface FamilySupportAndFinalMessageSection {
  body: string;          // 가족·배우자에게 부탁하면 좋은 것 (피해야 할 말 / 도움되는 말)
  finalMessage: string;  // 아이에게 전하는 마지막 한 문장 (감성 마무리)
}

// ============================================================
// 4) 태명 후보 (결정적 — 오행 풀 기반, LLM 창작 금지)
// ============================================================
export interface BabyNameCandidate {
  name: string;             // 태명 (예: "이슬")
  element: Element;         // 연결 오행
  elementKo: string;        // 오행 한글 (수/목/화/토/금)
  image: string;            // 짧은 이미지 (예: "맑게 흐르는 물")
  reason: string;           // 추천 이유 한 줄 (결정적 템플릿 — 오행 보완 근거)
}

export interface BabyNamesSection {
  candidates: BabyNameCandidate[];  // 3~5개
  /** 어떤 오행을 우선했는지 (UI 보조 표시) */
  prioritizedElements: Element[];
}

// ============================================================
// 5) 명리 근거 보기 (결정적 — 접힘 렌더용)
// ============================================================
export interface PregnancyEvidenceView {
  /** 엄마 사주 요약 */
  mother: {
    dayMaster: string;          // 일간 (한글 천간 1자, 예: "갑")
    dayMasterElementKo: string; // 일간 오행 한글
    strengthLevel: string;      // 신강/신약 라벨 (한글)
    usefulGodKo: string;        // 용신 (한글 오행/십성)
    favorableKo: string[];      // 희신
    unfavorableKo: string[];    // 기신
    elementDistributionKo: Record<string, number>; // 오행 분포 (한글 키)
  };
  /** 아이 출생예정일 기준 기운 (확정 아님 명시) */
  baby: {
    dueDateLabel: string;        // 예: "2026년 7월 6일 예정"
    hourKnown: boolean;          // 예정시간 입력 여부
    dayMaster: string;
    dayMasterElementKo: string;
    elementDistributionKo: Record<string, number>;
    /** 예정시간 미입력 시 true → "3주 기반 참고" 표시 */
    threeWeekBasis: boolean;
  };
  /** 엄마-아이 연결 */
  connection: {
    dayMasterRelation: { relation: DayMasterRelationKind; balance: string; plain: string };
    elementComplement: { motherNeedsFromBaby: string[]; babyNeedsFromMother: string[]; mutual: string };
    usefulGodInteraction: { plain: string };
    combinationConflicts: {
      combinations: string[];
      conflicts: string[];
      punishments: string[];
      destructions: string[];
      harms: string[];
    };
  };
  /** 태교/태명 추천 근거 요약 */
  recommendationBasis: {
    taegyoElements: string[];   // 태교 3축이 참고한 오행 (한글)
    babyNameElements: string[]; // 태명이 우선한 오행 (한글)
  };
  raw?: unknown;
}

// ============================================================
// 6) 최종 리포트
// ============================================================
export interface PregnancyNarrativeReport {
  motherBabyCard: MotherBabyCardSection;                                // 결정적
  openingConnection: OpeningConnectionSection;                          // LLM
  motherChildMechanism: MotherChildMechanismSection;                    // LLM
  motherComfortRhythm: MotherComfortRhythmSection;                      // LLM
  babyEnergyAndFit: BabyEnergyAndFitSection;                            // LLM
  taegyoGuide: TaegyoGuideSection;                                      // LLM
  motherFortuneRoutine: MotherFortuneRoutineSection;                    // LLM
  familySupportAndFinalMessage: FamilySupportAndFinalMessageSection;    // LLM
  babyNames: BabyNamesSection;                                         // 결정적
  evidenceView: PregnancyEvidenceView;                                 // 결정적
  /** 고정 안내문 (sanitizer가 보장). UI 배너 렌더용. */
  disclaimer: string;
  /** Event Forecast V1 (엄마를 편하게 하는 흐름, 시기 없음). flag ON일 때만 부착. OFF면 키 미부착 → byte-identical. */
  eventForecast?: EventForecast;
}

// ============================================================
// 7) 후보일 비교 — 타입 stub만 (base V4 미구현, P10+ 별도)
//    "출산 후보일 분위기 비교" — 점수/순위/택일/추천출산일 금지. 라벨 중심.
// ============================================================
export type CandidateMoodLabel =
  | 'mother-stability'    // 엄마 안정형
  | 'baby-balance'        // 아이 균형 보완형
  | 'family-rhythm'       // 가족 리듬 조화형
  | 'taegyo-routine'      // 태교 루틴 강화형
  | 'change-adaptation';  // 변화 적응형

export const CANDIDATE_MOOD_LABEL_KO: Record<CandidateMoodLabel, string> = {
  'mother-stability': '엄마 안정형',
  'baby-balance': '아이 균형 보완형',
  'family-rhythm': '가족 리듬 조화형',
  'taegyo-routine': '태교 루틴 강화형',
  'change-adaptation': '변화 적응형',
};

/** 사용자가 의료진과 상의 가능한 후보일/시간을 직접 입력한 경우에만 사용 (stub) */
export interface PregnancyCandidateDate {
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm (선택) */
  time?: string;
}

/** 후보일 비교 결과 stub (P10+에서 구현) */
export interface PregnancyCandidateComparisonStub {
  enabled: false;  // base V4에서는 항상 false
  ctaText: string; // 하단 CTA 안내 텍스트
}

export const PREGNANCY_CANDIDATE_CTA_TEXT =
  '의료진과 상의 가능한 후보일이 있다면, 후보일의 사주적 분위기도 비교해볼 수 있어요.';

// ============================================================
// 8) 입력 / 컨텍스트
// ============================================================
//
// 엄마: 일반 BirthInput (출생시간 선택 — exact/approximate/unknown).
// 아기: 출생예정일 BirthInput (gender unknown, 예정시간 선택).
//   - 예정시간 있음 → birthTimeConfidence 'exact'/'approximate' → 시주까지 (4주 참고)
//   - 예정시간 없음 → birthTimeConfidence 'unknown' → hourUnknown (3주 기반)
//   - 예정시간이 있어도 "출생예정일/예정시간 기준 참고"로만 해석, 확정 표현 금지.

export interface PregnancyNarrativeContext {
  /** 아이 예정일 라벨 (예: "2026년 7월 6일") */
  dueDateLabel: string;
  /** 아이 예정시간 입력 여부 */
  babyHourKnown: boolean;
  /** 엄마 출생시간 입력 여부 */
  motherHourKnown: boolean;
  /** 엄마 이름 (선택, 없으면 '엄마') */
  motherName: string;
}

export interface BuildPregnancyContextArgs {
  dueDateLabel: string;
  babyTimeConfidence: BirthTimeConfidence;
  motherTimeConfidence: BirthTimeConfidence;
  motherName?: string;
}

/** 순수 — 입력 메타 → narrative 컨텍스트 */
export function buildPregnancyNarrativeContext(args: BuildPregnancyContextArgs): PregnancyNarrativeContext {
  return {
    dueDateLabel: args.dueDateLabel,
    babyHourKnown: args.babyTimeConfidence !== 'unknown',
    motherHourKnown: args.motherTimeConfidence !== 'unknown',
    motherName: (args.motherName ?? '').trim() || '엄마',
  };
}

/** YYYY-MM-DD → "YYYY년 M월 D일" (라벨 헬퍼) */
export function formatDueDateLabel(birthDate: string): string {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(birthDate);
  if (!m) return birthDate;
  return `${Number(m[1])}년 ${Number(m[2])}월 ${Number(m[3])}일`;
}

// ============================================================
// 9) Feature flags — 기본 OFF (flag off면 기존 임산부 모드 그대로)
// ============================================================
export interface PregnancyNarrativeServerFlags {
  apiEnabled: boolean;               // PREGNANCY_NARRATIVE_API_ENABLED === 'true'
  verifySecret: string | undefined;  // PREGNANCY_NARRATIVE_VERIFY_SECRET (정의되면 헤더 강제)
}

export const PREGNANCY_NARRATIVE_FLAG_ENV = {
  apiEnabled: 'PREGNANCY_NARRATIVE_API_ENABLED',
  verifySecret: 'PREGNANCY_NARRATIVE_VERIFY_SECRET',
  uiEnabled: 'NEXT_PUBLIC_PREGNANCY_NARRATIVE_UI_ENABLED',
} as const;

export const PREGNANCY_NARRATIVE_DEFAULTS = {
  apiEnabled: false,
  uiEnabled: false,
} as const;

// ============================================================
// 10) section별 JSON schema (LLM 출력 강제용 — 유효 JSON skeleton)
//     결정적 섹션은 LLM 호출 없음 → schema 없음.
//     값은 placeholder. 특정 일간/오행/사주값 hardcode 금지 (구조만).
// ============================================================
const SCHEMA_openingConnection = JSON.stringify({
  openingConnection: { oneLine: '', body: '' },
});

const SCHEMA_motherChildMechanism = JSON.stringify({
  motherChildMechanism: {
    body: '',
    evidenceBlocks: [
      {
        evidence: [{ label: '', plainMeaning: '', role: 'main' }],
        causalExplanation: '',
        betweenScene: '',
        positiveUse: '',
        shadowPattern: '',
        taegyoAdvice: '',
      },
    ],
  },
});

const SCHEMA_motherComfortRhythm = JSON.stringify({ motherComfortRhythm: { body: '' } });
const SCHEMA_babyEnergyAndFit = JSON.stringify({ babyEnergyAndFit: { body: '' } });
const SCHEMA_taegyoGuide = JSON.stringify({ taegyoGuide: { body: '' } });
const SCHEMA_motherFortuneRoutine = JSON.stringify({ motherFortuneRoutine: { body: '' } });
const SCHEMA_familySupportAndFinalMessage = JSON.stringify({
  familySupportAndFinalMessage: { body: '', finalMessage: '' },
});

export const PREGNANCY_NARRATIVE_JSON_SCHEMAS: Record<
  Exclude<PregnancyNarrativeSectionId, 'motherBabyCard' | 'babyNames' | 'evidenceView'>,
  string
> = {
  openingConnection: SCHEMA_openingConnection,
  motherChildMechanism: SCHEMA_motherChildMechanism,
  motherComfortRhythm: SCHEMA_motherComfortRhythm,
  babyEnergyAndFit: SCHEMA_babyEnergyAndFit,
  taegyoGuide: SCHEMA_taegyoGuide,
  motherFortuneRoutine: SCHEMA_motherFortuneRoutine,
  familySupportAndFinalMessage: SCHEMA_familySupportAndFinalMessage,
};

// ============================================================
// 11) Evidence Fact / Plan 타입 (Phase 2~3 — yearly/compat V4 mirror)
// ============================================================
export type PregnancyFactSource =
  | 'mother'                 // 엄마 사주 (신강신약/용신/오행/십성)
  | 'baby'                   // 아이 예정일 기준 사주
  | 'dayMasterRelation'      // 엄마-아이 일간 관계
  | 'elementComplement'      // 오행 보완
  | 'usefulGodInteraction'   // 용신/기신 상호 자극
  | 'combinationConflicts'   // 합충형파해
  | 'taegyo'                 // 태교 3축
  | 'fortuneRoutine'         // 개운 루틴
  | 'familySupport'          // 가족 도움
  | 'babyName';              // 태명 근거

export interface PregnancyMustUseFact {
  /** prefix로 ownerSection 식별 (getOwnerSectionOf와 정합) */
  id: string;
  source: PregnancyFactSource;
  /** 이 fact를 소유하는 단 하나의 섹션 (중복 배정 금지) */
  ownerSection: PregnancyNarrativeSectionId;
  /** 명리 근거 그 자체 (사람용으로 압축된 한 줄) */
  fact: string;
  /** 쉬운 뜻 (용어 즉시 풀이) */
  plainMeaning: string;
  /** 줄글로 어떻게 녹여야 하는지 힌트 */
  narrativeHint: string;
  /** validator가 흡수 여부를 확인할 짧은 한국어 토큰 */
  matchTokens: string[];
  role?: PregnancyEvidenceRole;
  /** 현실 장면 시드 (선택) */
  sceneHint?: {
    situation: string;
    motherTendency: string;
    betterUse?: string;
  };
  /** 조언 시드 (선택) */
  adviceHint?: {
    actionable: string;
    avoidPattern?: string;
  };
}

export interface PregnancyPlanStyleExamples {
  badExample: string;
  goodExample: string;
  transformationRule: string;
}

export interface PregnancyNarrativePlan {
  sectionId: PregnancyNarrativeSectionId;
  title: string;
  sectionGoal: string;
  mustUseFacts: PregnancyMustUseFact[];
  requiredBeats: string[];
  avoidRepeating: string[];
  /** sanitizer/validator와 align (의료/출산일/성별/성격단정/엄마탓/일반론) */
  avoidPatterns: string[];
  toneHints: string[];
  styleExamples: PregnancyPlanStyleExamples;
  maxTokens?: number;
  repairHints?: string[];
}

export type PregnancyNarrativePlanSet = PregnancyNarrativePlan[];

// ============================================================
// 12) Validation 타입
//     severity 정책 (의료/출산 민감 → 사용자 노출 위험 = high 강하게):
// ============================================================
export type PregnancyNarrativeIssueType =
  // ── high (사용자 노출 blocking) ──
  | 'medical-advice-risk'              // 의료/약/영양/치료/진료 대체 조언
  | 'pregnancy-health-prediction'      // 임신 중 건강 예측
  | 'birth-risk-prediction'            // 출산 난이도/분만 위험 예측
  | 'miscarriage-or-preterm-claim'     // 조산/유산 언급·예측
  | 'gender-prediction'                // 성별 예측
  | 'deterministic-child-personality'  // 아이 성격/운명 단정
  | 'mother-blame-language'            // 엄마 탓으로 들리는 표현
  | 'birth-date-determination-claim'   // 출산일 결정/추천/특정 날짜 출산 유도
  | 'fatalistic-claim'                 // 운명/반드시/확정 단정
  | 'invented-evidence'                // 계산되지 않은 명리 요소/태명 창작
  | 'validator-log-output'             // fact id/sectionId/내부 schema 토큰 노출
  | 'section-missing'                  // 필수 섹션 누락
  | 'json-parse-failed'                // generatorFlags: 섹션 JSON 파싱 실패
  | 'finish-length'                    // generatorFlags: 길이 초과로 truncated
  | 'unsupported-user-context'         // 입력에 없는 가족/상황 단정
  // ── medium (품질 — 사용자 노출 OK) ──
  | 'weak-prenatal-guide'              // 태교/리듬 조언이 추상적
  | 'generic-taegyo'                   // 일반적인 태교 나열
  | 'missing-mother-child-link'        // 엄마-아이 연결 근거 미흡
  | 'missing-useful-god-link'          // 용신/희신 연결 미흡
  | 'weak-family-support'              // 가족 도움이 구체적이지 않음
  | 'weak-baby-name-reason'            // 태명 이유가 약함
  | 'repetitive-content'               // 섹션 간 반복
  | 'too-medical-tone'                 // 의료처럼 들리는 톤(경계)
  | 'too-fatalistic-tone';             // 운명론적 톤(경계)

export interface PregnancyNarrativeValidationIssue {
  type: PregnancyNarrativeIssueType;
  sectionId: PregnancyNarrativeSectionId | 'global';
  sentence: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface PregnancyNarrativeValidationResult {
  isValid: boolean;
  issues: PregnancyNarrativeValidationIssue[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  sectionIssues: Record<string, PregnancyNarrativeValidationIssue[]>;
  repairTargets: PregnancyNarrativeSectionId[];
  shouldRepair: boolean;
}

// 재노출 (편의)
export { ELEMENT_KO };
export type { Element, BirthInput, BirthTimeConfidence };
