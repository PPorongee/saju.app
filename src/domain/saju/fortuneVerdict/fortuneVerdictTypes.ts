// Fortune Questions Verdict V1 — 타입 정의 (작은 사건 예보 → 인생 큰 질문 "판정서"로 교체).
//
// 사용자가 유료 사주에서 진짜 궁금한 큰 질문(재물운/횡재수/투자성향/사업·이직운/이동수·부동산/
// 결혼·관계운/자녀운/운 터지는 시기)에 명리식으로 "판정"한다. 단호·선명하되 결과 보장은 금지.
//
// 두 종류:
//   1) FortuneVerdictEvidence — 코드가 계산한 "판정 씨앗"(VerdictSeed). GPT는 선택하지 않고 문장화만.
//   2) FortuneVerdict — GPT가 작성한 판정서 출력. report.fortuneVerdict에 부착.

export type FortuneVerdictMode = 'personal' | 'yearly' | 'compat' | 'pregnancy';

/** 판정 강도 — 회피하지 않는다. not_prominent도 유용한 판정. */
export type VerdictStrength = 'strong' | 'moderate' | 'weak' | 'not_prominent';
export type RelationshipStatus = 'single' | 'dating' | 'married' | 'divorced' | 'unknown';

/** 판정 축. */
export type VerdictType =
  | 'wealth'          // 재물운 강약
  | 'windfall'        // 횡재수
  | 'wealth_style'    // 축적형/거래형/사업형/투자성향
  | 'career_job'      // 직장 안에서 크는 타입
  | 'job_change'      // 이직운
  | 'business'        // 독립·사업운/확장 시기
  | 'move'            // 이동수/이사
  | 'real_estate'     // 부동산·큰 계약
  | 'relationship'    // 결혼·배우자·인연
  | 'family_spouse'   // 기혼: 집안·배우자·가족 구조
  | 'child'           // 자녀운
  | 'noble'           // 귀인운 / 피해야 할 사람 (운을 열어주는 사람 vs 새게 만드는 사람)
  | 'document'        // 문서·계약 리스크 (계약·정산·집 문서·가족 간 돈)
  | 'breakthrough'    // 운 터지는 시기 (별도 섹션으로도 출력)
  | 'other';

// ============================================================
// 1) Evidence (내부 grounding — 프롬프트 전용)
// ============================================================
export interface VerdictSeed {
  /** 사용자 질문형 (예: "돈복이 있는가?", "횡재수가 있는가?"). */
  question: string;
  verdictType: VerdictType;
  strength: VerdictStrength;
  /** 시기 (계산된 것만: "현재 대운(32~41세)", "2027년 하반기", "말년(시주)" 등). 없으면 ''. */
  timing: string;
  /** 명리 근거(일상어로 번역된 신호들). 영문 십성/오행 key 금지. */
  basisSignals: string[];
  /** 이 seed에서 말해도 되는 판정 결(축적형/거래형/집중형 등). */
  allowedClaims: string[];
}

/** 정규화된 관심사 축. */
export type ConcernKey = 'money' | 'housing_move' | 'child_family' | 'career' | 'business' | 'relationship';

export interface FortuneVerdictEvidence {
  mode: FortuneVerdictMode;
  relationshipStatus: RelationshipStatus;
  hasChildren: boolean | 'unknown';
  /** 현재 나이(만, userContext.age). 모르면 null. */
  currentAge: number | null;
  /** 나이대 라벨(예: "30대 초반"). 모르면 ''. */
  ageBand: string;
  /** 정규화·중복제거·merge된 관심사. 없으면 []. */
  concerns: ConcernKey[];
  /** (개인) 써야 할 섹션 제목 순서. 다른 모드는 []. */
  sectionPlan: string[];
  /** 핵심 좌표(용신/신강약 등, compact). */
  coreLines: string[];
  /** 판정 씨앗 — GPT는 이 중에서만 판정. */
  seeds: VerdictSeed[];
  /** 운 터지는 시기 grounding(축적기/확장기/주의기). */
  breakthroughLines: string[];
  /** yongsinDiagnostic 보조(있을 때만). */
  auxiliaryLines: string[];
  /** 짧은 시기 규칙(없는 시기 생성 금지). */
  timingRule: string;
  /** 궁합 전용 — A/B 결 + 관계 신호. */
  partner?: { aLines: string[]; bLines: string[]; relationLines: string[] };
}

// ============================================================
// 2) Output (GPT 생성 — report.fortuneVerdict) — 줄글형 "운명 판정 서사"
//    Q&A 판정표/강도 라벨/근거 라벨을 쓰지 않는다. 자연스러운 사주풀이 문단만.
// ============================================================
export interface FortuneNarrativeSection {
  /** 섹션 제목 (예: "돈과 재물운", "운이 트이는 시기"). */
  title: string;
  /** 문단 배열(2~4문단). "판정:" / "Q." / "근거 ·" 라벨 금지 — 줄글. */
  body: string[];
}

export interface FortuneVerdict {
  mode: FortuneVerdictMode;
  /** 전체 제목. */
  title: string;
  /** 이 사주를 한 호흡으로 짚는 도입 한 줄(두루뭉술 금지). */
  lead: string;
  /** 줄글 섹션들. */
  sections: FortuneNarrativeSection[];
  /** 운이 트이는 시기 요약(선택). */
  timingSummary?: string;
  /** 마무리 문단. */
  closing: string;
  /** 모드별 안전 안내(임산부 의료 면책 등). */
  disclaimer?: string;
}
