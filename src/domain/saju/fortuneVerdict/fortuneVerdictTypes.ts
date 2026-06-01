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

export interface FortuneVerdictEvidence {
  mode: FortuneVerdictMode;
  relationshipStatus: RelationshipStatus;
  hasChildren: boolean | 'unknown';
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
// 2) Output (GPT 생성 — report.fortuneVerdict)
// ============================================================
export interface Verdict {
  /** 사용자 질문 (예: "돈복이 있는가?"). */
  question: string;
  /** 판정 본문 — 단호·선명하게(결과 보장 금지). */
  verdict: string;
  strength: VerdictStrength;
  /** 시기 (계산된 것만). */
  timing: string;
  /** 명리 근거를 생활 언어로. */
  basis: string;
  /** 실제 삶의 장면. */
  whatItLooksLike: string;
  /** 결과 보장 방지용 단서(짧게). 본문을 죽이는 안전문구 금지. */
  caution: string;
}

export interface BreakthroughTiming {
  summary: string;
  accumulationPhase?: string;
  expansionPhase?: string;
  cautionPhase?: string;
}

export interface FortuneVerdict {
  mode: FortuneVerdictMode;
  title: string;
  lead: string;
  verdicts: Verdict[];
  breakthroughTiming: BreakthroughTiming;
  closing: string;
  disclaimer?: string;
}
