// Event Forecast V1 — 타입 정의.
//
// 두 종류:
//   1) EventForecastEvidence — deterministic 계산에서 뽑은 "사건 신호" (내부 grounding 전용, compact).
//      GPT 프롬프트에만 전달되고 raw로 노출되지 않는다. raw coreAnalysis는 넣지 않는다.
//   2) EventForecast — GPT가 신호를 바탕으로 작성한 "운의 사건 예보" 출력. report.eventForecast에 부착.

export type EventForecastMode = 'personal' | 'yearly' | 'compat' | 'pregnancy';

export type EventType =
  | 'relationship' | 'career' | 'money' | 'business' | 'study'
  | 'family' | 'move' | 'health_rhythm' | 'collaboration' | 'decision';

/** 확률이 아니라 "운의 신호 강도". */
export type EventLikelihood = 'strong' | 'moderate' | 'subtle';

// ============================================================
// 1) Evidence (내부 grounding — 프롬프트 전용, compact)
// ============================================================

/** 계산된 시기별 사건 신호 1건 (대운/세운/월운/십성/합충에서). */
export interface ForecastSignal {
  /** 실제 계산된 시기 구간만 (예: "2027년", "6월 (망종~소서)", "현재 대운 32~41세"). */
  window: string;
  /** 사건 영역 힌트 (관계/일/돈/문서·자격/이동/결과물/협업 등). */
  kind: string;
  /** 명리 근거 한 줄 (세운 십성·오행·합충·신살). */
  signal: string;
  strength: EventLikelihood;
  /** 잡으면 좋은 결 (있을 때). */
  good?: string;
  /** 주의할 결 (있을 때). */
  caution?: string;
}

export interface EventForecastEvidence {
  mode: EventForecastMode;
  /** 시기 해상도: month(올해 절기 월운)/year(개인·궁합 연 단위)/none(임산부). */
  granularity: 'none' | 'year' | 'month';
  /** 용신/오행/신강약 등 핵심 좌표 (compact, 1~3줄). */
  coreLines: string[];
  /** 인연 신호 (성별 + 관성/재성 + 도화·홍염·배우자궁) — 근거 있을 때만. */
  relationshipSignals: string[];
  /** 시기별 사건 신호 (실제 계산된 대운/세운/월운에서). */
  signals: ForecastSignal[];
  /** yongsinDiagnostic 보조 (있을 때만, compact). */
  auxiliaryLines: string[];
  /** 짧은 시기 규칙 (없는 월/날짜/사건 생성 금지). */
  timingRule: string;
  /** 궁합 전용 — A/B 개인 결 + 관계 신호. */
  partner?: { aLines: string[]; bLines: string[]; relationLines: string[] };
}

// ============================================================
// 2) Output (GPT 생성 결과 — report.eventForecast)
// ============================================================

export interface EventCard {
  type: EventType;
  /** 선명한 제목 (예: "관계가 깊어지는 인연운"). */
  title: string;
  /** 계산된 시기 구간 (없는 날짜 생성 금지). */
  timeWindow: string;
  likelihood: EventLikelihood;
  /** 어떤 장면으로 나타날 수 있는지. */
  eventScene: string;
  /** 들어오는 사람/상황의 결 (근거 있을 때만). */
  personOrSituation?: string;
  /** 왜 이 신호가 나오는지 (명리 근거를 일상어로). */
  whyThisAppears: string;
  /** 이 사건이 좋게 풀리는 조건. */
  goodIf: string[];
  /** 조심해야 하는 조건. */
  carefulIf: string[];
  /** 한 줄 활용법. */
  howToUse: string;
}

export interface TimingMap {
  pushWindows: string[];
  cautionWindows: string[];
  preparationWindows: string[];
  relationshipWindows?: string[];
  moneyWindows?: string[];
  careerWindows?: string[];
}

export interface EventForecast {
  mode: EventForecastMode;
  /** 섹션 헤드라인 (예: "운의 사건 예보"). */
  headline: string;
  /** 전체 요약 (선명하게). */
  summary: string;
  /** 사건 카드 (핵심). */
  eventCards: EventCard[];
  /** 타이밍 맵 (있을 때). */
  timingMap?: TimingMap;
  /** 살펴볼 신호 (보조). */
  watchSigns: string[];
  /** 피해야 할 패턴 (보조). */
  avoidPatterns: string[];
  /** 모드별 안전 안내 (임산부 의료 면책 등). */
  disclaimer?: string;
}
