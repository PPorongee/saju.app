// All-mode Action Guide V1 — 타입 정의.
//
// 두 종류:
//   1) ActionGuideEvidence — deterministic 계산 결과에서 뽑은 "근거 시드" (내부 grounding 전용).
//      GPT 프롬프트에만 전달되고, 사용자에게 raw로 노출되지 않는다.
//   2) ActionGuide — GPT가 evidence를 바탕으로 작성한 최종 출력. report.actionGuideV1에 부착.
//
// 핵심 원칙:
//   - evidence는 모두 한글 사용자 친화 문자열. 영문 오행 key / 내부 enum 미포함.
//   - 없는 시기(월/날짜)는 evidence에 만들지 않는다. timing.granularity로 해상도를 명시.

export type ActionGuideMode = 'personal' | 'yearly' | 'compat' | 'pregnancy';

// ============================================================
// 1) Evidence (내부 grounding — report 미노출, 프롬프트 전용)
// ============================================================

/** 시기/타이밍 데이터 해상도. 모드별로 실제 계산 가능한 수준이 다르다. */
export interface ActionGuideTimingEvidence {
  /** 'month' = 절기 기준 실제 월운 있음(올해운세). 'year' = 연 단위 흐름만(개인/궁합). 'none' = 시기 데이터 없음(임산부). */
  granularity: 'none' | 'year' | 'month';
  /** 실제 계산된 시기 라인만. granularity='none'이면 빈 배열. */
  lines: string[];
  /** GPT에게 줄 시기 관련 지시(없는 시기 만들지 말 것 등). */
  rule: string;
}

export interface ActionGuideDomainSeed {
  /** 영역명 (예: '커리어/일', '돈/수입', '관계', '생활 리듬'). */
  domain: string;
  /** 이 영역에 대한 계산 근거 시드 라인들 (adviceHint/goodChoice 등에서 추출). */
  lines: string[];
}

/** 궁합 전용 — A/B 개인 근거 + 관계 근거 (상대를 용신/기신으로 단정하지 않도록 중립 구성). */
export interface ActionGuidePartnerEvidence {
  /** A(첫 번째 사람) 개인 명리 근거. */
  aLines: string[];
  /** B(두 번째 사람) 개인 명리 근거. */
  bLines: string[];
  /** 두 사람 사이 관계 근거 (보완/작용 — 중립 표현). */
  relationLines: string[];
}

export interface ActionGuideEvidence {
  mode: ActionGuideMode;
  /** 용신/희신/기신/신강약/오행 강약 등 핵심 명리 좌표 (한글). */
  coreLines: string[];
  /** yongsinDiagnostic 보조 운용 후보 (있을 때만). "주 용신 유지" 전제. */
  auxiliaryLines: string[];
  /** 영역별 근거 시드. */
  domainSeeds: ActionGuideDomainSeed[];
  /** 시기/타이밍. */
  timing: ActionGuideTimingEvidence;
  /** 궁합 전용. */
  partner?: ActionGuidePartnerEvidence;
}

// ============================================================
// 2) Output (GPT 생성 결과 — report.actionGuideV1)
// ============================================================

export interface ActionGuideDomainFlow {
  /** 영역 (커리어/돈/사업/연애·관계/공부·성장/생활 리듬 등). */
  domain: string;
  /** 지금 이 영역의 흐름. */
  flow: string;
  /** 잘 살릴 수 있는 기회. */
  opportunity: string;
  /** 점검·주의할 지점. */
  caution: string;
  /** 구체적 추천 행동. */
  suggestedAction: string;
}

export interface ActionGuideDecisionGuide {
  /** 추진하기 좋은 흐름. */
  goodFor: string[];
  /** 점검이 필요한 흐름. */
  beCarefulWith: string[];
  /** 작게 시작하거나 미루는 게 나은 흐름. */
  postponeOrScaleDown: string[];
  /** 결정 전 체크리스트. */
  checklist: string[];
}

export interface ActionGuideRemedyRoutines {
  /** 매일 루틴. */
  daily: string[];
  /** 주간 루틴. */
  weekly: string[];
  /** 월간 루틴 (선택). */
  monthly?: string[];
  /** 환경/공간/관계 방식 (선택). */
  environment?: string[];
  /** 피해야 할 패턴. */
  avoidPatterns: string[];
}

/** 궁합 전용 — A/B 개인 조언 + 함께 해볼 것 (상대 낙인 금지). */
export interface ActionGuidePartnerNotes {
  /** A 개인을 위한 조언. */
  aAdvice?: string;
  /** B 개인을 위한 조언. */
  bAdvice?: string;
  /** 두 사람이 함께 해볼 것. */
  together?: string[];
}

export interface ActionGuide {
  /** 어느 모드에서 생성됐는지. */
  mode: ActionGuideMode;
  /** UI 섹션 제목 (예: "지금 운을 쓰는 법"). */
  title: string;
  /** 전체 흐름 요약. */
  overview: string;
  /** 영역별 흐름 (선택 — 모드별로 채움). */
  domainFlows?: ActionGuideDomainFlow[];
  /** 중요한 결정 가이드 (선택). */
  decisionGuide?: ActionGuideDecisionGuide;
  /** 개운 루틴 (선택). */
  remedyRoutines?: ActionGuideRemedyRoutines;
  /** 지금 당장 할 일 (필수). */
  immediateActions: string[];
  /** 궁합 전용 A/B 조언. */
  partnerNotes?: ActionGuidePartnerNotes;
  /** 모드별 안전 안내 (임산부 의료 면책 등). */
  disclaimer?: string;
}
