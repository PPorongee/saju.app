// Life Event Forecast V1 — 타입 정의 (카드형 → 줄글·타임라인형 사건 예보로 교체).
//
// 핵심: 작은 생활 루틴이 아니라 "삶에 들어올 수 있는 큰 사건"을 줄글/타임라인으로 예보.
//   - 큰 사건 축: 이동수/이사·직장 변화·돈 흐름·계약·부동산·자녀/가족·관계·사업·문서/행정.
//   - 모든 축을 강제로 채우지 않는다. evidence 강한 2~4개만.
//   - 선명하게 말하되 결과 보장은 하지 않는다(조건부).
//
// 두 종류:
//   1) EventForecastEvidence — deterministic 계산에서 뽑은 "큰 사건 신호 씨앗" (내부 grounding 전용, compact).
//   2) EventForecast — GPT가 작성한 줄글형 인생 이벤트 예보 출력. report.eventForecast에 부착.

export type EventForecastMode = 'personal' | 'yearly' | 'compat' | 'pregnancy';

/** 큰 사건 축 (내부 분류용 — UI badge로 과노출 금지). */
export type LifeEventType =
  | 'move'            // 이동수/이사/생활권/출장
  | 'work_change'     // 직장 환경·역할·평가 변화
  | 'money'           // 돈 흐름/수입/정산
  | 'contract'        // 계약/협상/가격 기준
  | 'real_estate'     // 부동산/대출/보증금/큰 계약
  | 'relationship'    // 배우자/관계/인연 변화
  | 'family_child'    // 자녀/가족 책임
  | 'business'        // 사업/동업/확장·축소
  | 'study_document'  // 문서/시험/자격
  | 'health_rhythm'   // 컨디션/생활 리듬 (보조)
  | 'legal_admin'     // 행정/법적 절차
  | 'other';

export type EventStrength = 'strong' | 'moderate' | 'subtle';
export type RelationshipStatus = 'single' | 'dating' | 'married' | 'divorced' | 'unknown';

// ============================================================
// 1) Evidence (내부 grounding — 프롬프트 전용, compact)
// ============================================================

/** 계산된 시기별 "큰 사건 씨앗". */
export interface EventSeed {
  /** 실제 계산된 시기 구간만 (예: "2027년", "올해 6월(절기)", "현재 대운"). */
  window: string;
  /** 사건 축. */
  axis: LifeEventType;
  /** 축 한글 라벨 (이동수/직장 변화/돈 흐름/계약/부동산/자녀·가족/관계/사업/문서). */
  axisLabel: string;
  /** 명리 근거 한 줄 (세운 활성 십성·신살·충 등, 일상어). */
  basis: string;
  strength: EventStrength;
  /** 잡아도 되는 조건. */
  good?: string;
  /** 피해야 할 신호. */
  caution?: string;
}

export interface EventForecastEvidence {
  mode: EventForecastMode;
  /** 시기 해상도: month(올해 절기)/year(개인·궁합 연)/none(임산부). */
  granularity: 'none' | 'year' | 'month';
  /** 관계 상태 — 기혼이면 신규 연애 사건 금지(배우자/가족으로 변환). */
  relationshipStatus: RelationshipStatus;
  /** 용신/오행/신강약 등 핵심 좌표 (compact). */
  coreLines: string[];
  /** 큰 사건 씨앗 (실제 계산된 신호에서). 2~4개를 GPT가 선별. */
  eventSeeds: EventSeed[];
  /** yongsinDiagnostic 보조 (있을 때만, compact). */
  auxiliaryLines: string[];
  /** 짧은 시기 규칙 (없는 월/날짜/사건 생성 금지). */
  timingRule: string;
  /** 궁합 전용 — A/B 결 + 관계 신호. */
  partner?: { aLines: string[]; bLines: string[]; relationLines: string[] };
}

// ============================================================
// 2) Output (GPT 생성 — report.eventForecast). 줄글/타임라인형.
// ============================================================

export interface MajorEvent {
  /** 계산된 시기 구간 (없는 날짜 생성 금지). */
  timeWindow: string;
  /** 선명한 사건 제목 (예: "이동수가 들어오는 구간"). */
  title: string;
  /** 내부 분류 (UI badge 과노출 금지). */
  eventType?: LifeEventType;
  /** 사건 예보 줄글 — 선명하되 결과 보장 X (사건 먼저, 조건 뒤). */
  forecast: string;
  /** 실제 삶에서 나타나는 장면. */
  scene: string;
  /** 명리 근거(일상어). */
  signalBasis: string;
  /** 갈리는 지점 / 잡아도 되는 조건 / 피해야 할 신호. */
  decisionAdvice: string;
}

export interface EventForecast {
  mode: EventForecastMode;
  /** 섹션 제목 (예: "앞으로 들어올 큰 변화"). */
  title: string;
  /** 강한 도입 한 줄. */
  lead: string;
  /** 도입 줄글 (1~3문단). */
  eventNarrative: string[];
  /** 주요 사건 2~4개 (타임라인형). */
  majorEvents: MajorEvent[];
  /** 마무리 한 문단. */
  closing: string;
  /** 모드별 안전 안내 (임산부 의료 면책 등). */
  disclaimer?: string;
}
