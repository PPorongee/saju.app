// 명리 규칙 설정 — 룰 변경 시 version을 올린다.
// 동일 입력 + 동일 RuleConfig → 동일 출력 보장.

export type RuleConfig = {
  version: 'saju-rule-v1';
  timezone: 'Asia/Seoul';
  /** 입춘 기준 연주 전환 */
  yearPillarBoundary: 'ipchun';
  /** 절입 기준 월주 전환 */
  monthPillarBoundary: 'solar-term';
  /** 기본값: 23:00부터 자시 (다음날 일주로 시프트) */
  hourBoundaryMode: 'standard-23';
  /** 대운 순행/역행 — 양남음녀 순행 / 음남양녀 역행 (年干 기준) */
  fortuneDirectionRule: 'gender-year-yin-yang';
  /** 용신 산정 방법 (다중 적용, 우선순위는 analyzer가 결정) */
  usefulGodMethod: Array<
    | 'climate'         // 조후
    | 'strength'        // 억부
    | 'bridge'          // 통관
    | 'illnessMedicine' // 병약
    | 'structure'       // 격국
  >;
};

export const DEFAULT_RULE_CONFIG: RuleConfig = {
  version: 'saju-rule-v1',
  timezone: 'Asia/Seoul',
  yearPillarBoundary: 'ipchun',
  monthPillarBoundary: 'solar-term',
  hourBoundaryMode: 'standard-23',
  fortuneDirectionRule: 'gender-year-yin-yang',
  usefulGodMethod: ['climate', 'strength', 'bridge', 'illnessMedicine', 'structure'],
};

// 하위호환 — 기존 코드 import용 (점진적 제거)
export const RULE_VERSION = DEFAULT_RULE_CONFIG.version;
export const YAJASI_POLICY: 'shift-day' = 'shift-day';
