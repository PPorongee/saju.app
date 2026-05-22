// 점수·임계값 default — 명리 판단의 모든 수치를 한 곳에 모은다.
// 사용자가 정확도 튜닝 시 이 파일만 수정.

export const SCORING = {
  // ============================================================
  // 오행 강약 가중치
  // ============================================================

  /** 일간 자기 자신 — 항상 1.0 (자기 오행 1점) */
  WEIGHT_DAY_STEM: 1.0,

  /** 일간 외 천간 — 0.8 */
  WEIGHT_OTHER_STEM: 0.8,

  /** 지장간 본기/중기/여기 — hiddenStems의 weight 그대로 사용 (0.6/0.3/0.1 등) */
  HIDDEN_STEM_WEIGHT_MULTIPLIER: 0.8,

  /** 월지 본기 가중 배수 — 월령은 가장 큰 영향 */
  MONTH_BRANCH_PRIMARY_MULTIPLIER: 2.0,

  /** 계절 왕(旺) 오행에 추가 가중 (월지 계절과 같은 오행) */
  SEASON_BONUS: 0.5,

  /** 일지(배우자궁) 본기 가중 (자기 자리) */
  DAY_BRANCH_PRIMARY_MULTIPLIER: 1.5,

  // ============================================================
  // 오행 분류 임계값
  // ============================================================

  ELEMENT_EXCESSIVE_THRESHOLD: 4.0,
  ELEMENT_STRONG_THRESHOLD: 2.5,
  ELEMENT_DEFICIENT_THRESHOLD: 0.8,
  /** 0이거나 매우 낮으면 isolated */
  ELEMENT_ISOLATED_THRESHOLD: 0.3,

  // ============================================================
  // 십성 가중·임계값
  // ============================================================

  /** visible(투출 천간) 십성의 기본 가중 */
  TEN_GOD_VISIBLE_WEIGHT: 1.0,
  /** 월간 보너스 (월간에 투출된 십성은 격국에 직결) */
  TEN_GOD_MONTH_STEM_BONUS: 0.5,

  TEN_GOD_EXCESSIVE_THRESHOLD: 3.5,
  TEN_GOD_STRONG_RATIO: 0.85,   // top group: max * 0.85 이상
  TEN_GOD_DEFICIENT_THRESHOLD: 0.3,

  // ============================================================
  // 신강·신약 레벨 컷오프 (총점 기준)
  // ============================================================

  // 임계값 (95년 무토 한여름 인성왕+통근+비견 케이스가 strong으로 떨어지도록 조정)
  DAY_MASTER_STRENGTH_THRESHOLDS: {
    'very-strong': 7.0,
    'strong': 5.0,
    'balanced': 2.5,
    'weak': 0.5,
    'very-weak': 0,
  } as const,

  // ============================================================
  // 신강·신약 점수 가산 항목
  // ============================================================

  /** 월령이 일간을 생함 (인성) — 명리상 월령 인수는 신강의 결정적 요인 */
  DM_BONUS_MONTH_PRODUCES_SELF: 4.0,
  /** 월령이 일간과 같은 오행 (비겁) */
  DM_BONUS_MONTH_SAME_ELEMENT: 5.0,
  /** 일지에 통근 (지장간 본기/중기에 자기 오행) */
  DM_BONUS_DAY_BRANCH_ROOT: 2.0,
  /** 일지가 자기 오행 (본기) */
  DM_BONUS_DAY_BRANCH_PRIMARY_SELF: 2.5,
  /** 천간에 비견·겁재 (자기 오행) 1개당 */
  DM_BONUS_STEM_SAME_ELEMENT: 1.0,
  /** 천간에 인성 (생해주는 오행) 1개당 */
  DM_BONUS_STEM_PRODUCES_SELF: 0.8,

  /** 식상·재성·관성이 천간에 1개당 (소모) */
  DM_DRAIN_STEM_OUT: 0.8,
  /** 월지가 일간을 극함 */
  DM_DRAIN_MONTH_RESTRAINS_SELF: 2.0,
  /** 월지가 일간이 극하는 오행 (재성왕) */
  DM_DRAIN_MONTH_RESTRAINED_BY_SELF: 1.5,
  /** 월지가 일간이 생하는 오행 (식상왕) */
  DM_DRAIN_MONTH_PRODUCED_BY_SELF: 1.8,

  // ============================================================
  // 용신 5관점 점수 가중 (final score = weighted average)
  // ============================================================

  USEFUL_GOD_METHOD_WEIGHTS: {
    climate: 1.2,
    strength: 1.5,
    bridge: 0.8,
    illnessMedicine: 1.0,
    structure: 1.3,
  } as const,
};

export type DayMasterStrengthLevelKey = keyof typeof SCORING.DAY_MASTER_STRENGTH_THRESHOLDS;
