// Precision V1 — 계산 메타 타입 & 빌더 (Phase 1, 순수 모듈).
//
// 정책:
//   - 이 파일은 타입/빌더만 정의한다. 계산 파이프라인에 아직 배선하지 않는다(P5).
//   - legacy 경로 출력에 영향 0 (PersonalSajuGptInput.calculationMeta는 optional, 미설정).
//   - calculationVersion: legacy(기존 standard-23/야자시) | precision-v1(조자시 + 태양시 보정).
//   - warnings는 내부 검증/근거 보기 전용 — 사용자 화면 불안 노출 금지.

export type CalculationMode = 'legacy' | 'precision-v1';
export type ZiHourPolicy = 'standard-23' | 'zi-midnight-day-boundary';
export type CalendarBasis = 'solar-term';
export type BirthPlacePrecision = 'country' | 'region' | 'city' | 'unknown';
export type BirthTimeConfidenceMeta = 'exact' | 'approximate' | 'unknown';

export const DEFAULT_CALCULATION_MODE: CalculationMode = 'legacy';

/** 모드별 자시 정책 (확정):
 *   legacy       → standard-23 (23시 출생 시 일주를 익일로 시프트, 야자시)
 *   precision-v1 → zi-midnight-day-boundary (일주는 자정 00:00 전환, 시지 자시 23:00~00:59 = 조자시) */
export const ZI_HOUR_POLICY_BY_MODE: Record<CalculationMode, ZiHourPolicy> = {
  'legacy': 'standard-23',
  'precision-v1': 'zi-midnight-day-boundary',
};

export interface CalculationMeta {
  calculationVersion: CalculationMode;
  calendarBasis: CalendarBasis;
  birthTimeConfidence: BirthTimeConfidenceMeta;
  birthPlacePrecision: BirthPlacePrecision;
  timeZoneId: string | null;
  utcOffsetMinutes: number | null;
  dstApplied: boolean | null;
  solarTimeAdjustmentApplied: boolean;
  /** 태양시(LMST) 보정 분. 지역 known일 때만 적용, unknown이면 0/null. */
  solarTimeAdjustmentMinutes: number | null;
  /** 균시차(equation of time). V1 기본 0/null (P3에서 포함 여부 결정), 확장 자리. */
  equationOfTimeMinutes: number | null;
  ziHourPolicy: ZiHourPolicy;
  birthPlaceId: string | null;
  /** 내부 전용. UI 본문 비노출. */
  warnings: string[];
}

export interface BuildCalculationMetaArgs {
  mode: CalculationMode;
  birthTimeConfidence: BirthTimeConfidenceMeta;
  birthPlacePrecision?: BirthPlacePrecision;
  timeZoneId?: string | null;
  utcOffsetMinutes?: number | null;
  dstApplied?: boolean | null;
  solarTimeAdjustmentApplied?: boolean;
  solarTimeAdjustmentMinutes?: number | null;
  equationOfTimeMinutes?: number | null;
  birthPlaceId?: string | null;
  warnings?: string[];
}

/** 인자 → CalculationMeta (자시 정책은 모드에서 강제 도출). */
export function buildCalculationMeta(args: BuildCalculationMetaArgs): CalculationMeta {
  const solarApplied = args.solarTimeAdjustmentApplied ?? false;
  return {
    calculationVersion: args.mode,
    calendarBasis: 'solar-term',
    birthTimeConfidence: args.birthTimeConfidence,
    birthPlacePrecision: args.birthPlacePrecision ?? 'unknown',
    timeZoneId: args.timeZoneId ?? null,
    utcOffsetMinutes: args.utcOffsetMinutes ?? null,
    dstApplied: args.dstApplied ?? null,
    solarTimeAdjustmentApplied: solarApplied,
    solarTimeAdjustmentMinutes: solarApplied ? (args.solarTimeAdjustmentMinutes ?? 0) : (args.solarTimeAdjustmentMinutes ?? null),
    equationOfTimeMinutes: args.equationOfTimeMinutes ?? null,
    ziHourPolicy: ZI_HOUR_POLICY_BY_MODE[args.mode],
    birthPlaceId: args.birthPlaceId ?? null,
    warnings: args.warnings ?? [],
  };
}

/** legacy 기본 메타 — 기존 엔진(Asia/Seoul 고정, standard-23, 보정 없음)을 그대로 기술. */
export function legacyCalculationMeta(birthTimeConfidence: BirthTimeConfidenceMeta): CalculationMeta {
  return buildCalculationMeta({
    mode: 'legacy',
    birthTimeConfidence,
    birthPlacePrecision: 'unknown',
    timeZoneId: 'Asia/Seoul',
    utcOffsetMinutes: 540,
    dstApplied: false,
    solarTimeAdjustmentApplied: false,
    solarTimeAdjustmentMinutes: null,
    equationOfTimeMinutes: null,
    birthPlaceId: null,
    warnings: [],
  });
}
