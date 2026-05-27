// Precision V1 — 계산 준비 레이어 (Phase 4, 순수 / 미배선).
//
// 역할:
//   - (mode + 양력 civil 일시 + birthPlaceId) → 보정된 벽시계 + calculationMeta 산출.
//   - 아직 calculatePillars / fortuneCycleCalculator / calculateAnalysisOnly 에 연결하지 않는다(P5).
//   - 입력은 "이미 양력으로 변환된" civil 값을 받는다 (음력→양력 변환은 P5 배선에서 toSolarDate가 먼저 수행).
//
// 정책:
//   - legacy: 보정 없음. 원본 시각 그대로 + legacyCalculationMeta (standard-23).
//   - precision-v1: 항상 조자시(zi-midnight-day-boundary).
//       · 지역 known + 시간 known → 태양시(LMST) 보정 적용.
//       · 지역 unknown → 표준시(Asia/Seoul) 기준, 보정 없음(adj 0).
//       · 시간 unknown → 보정 불가(시각 없음) → adjustedClock=null (pillar 엔진 정오 fallback 유지).
//   - warnings: 내부 전용. UI 비노출.

import {
  buildCalculationMeta,
  legacyCalculationMeta,
  type CalculationMeta,
  type CalculationMode,
  type ZiHourPolicy,
  type BirthTimeConfidenceMeta,
  ZI_HOUR_POLICY_BY_MODE,
} from './calculationMeta';
import { computeSolarTimeCorrection, type CivilDateTime } from './solarTimeCorrector';
import { getPlaceById, type Place } from './placeResolver';

const DEFAULT_TZ = 'Asia/Seoul';

export interface PrepareCalculationArgs {
  mode: CalculationMode;
  /** 이미 양력으로 변환된 일자 (음력→양력 변환은 호출 전 완료). */
  solarYear: number;
  solarMonth: number;
  solarDay: number;
  /** 시(0~23). 시간 미상이면 null. */
  hour: number | null;
  minute: number;
  birthTimeConfidence: BirthTimeConfidenceMeta;
  /** 출생지역 id (placeResolver). 미입력/미해결이면 표준시 fallback. */
  birthPlaceId?: string | null;
}

export interface PrepareCalculationResult {
  mode: CalculationMode;
  ziHourPolicy: ZiHourPolicy;
  /** pillar 엔진에 먹일 보정 양력 벽시계. 시간 미상이면 null. legacy/지역unknown이면 원본과 동일. */
  adjustedClock: CivilDateTime | null;
  calculationMeta: CalculationMeta;
}

export function prepareCalculation(args: PrepareCalculationArgs): PrepareCalculationResult {
  const { mode, solarYear, solarMonth, solarDay, hour, minute, birthTimeConfidence } = args;
  const hourKnown = hour !== null && hour !== undefined;
  const originalClock: CivilDateTime | null = hourKnown
    ? { year: solarYear, month: solarMonth, day: solarDay, hour: hour as number, minute }
    : null;

  // ── legacy: 보정 없음 ──
  if (mode === 'legacy') {
    return {
      mode: 'legacy',
      ziHourPolicy: ZI_HOUR_POLICY_BY_MODE['legacy'], // standard-23
      adjustedClock: originalClock,                    // 원본 그대로 (legacy 경로는 별도, 여기선 미사용)
      calculationMeta: legacyCalculationMeta(birthTimeConfidence),
    };
  }

  // ── precision-v1 ──
  const place: Place | null = args.birthPlaceId ? getPlaceById(args.birthPlaceId) : null;
  const placeKnown = place !== null;
  const tz = place?.ianaTimeZone ?? DEFAULT_TZ;
  const warnings: string[] = [];

  // offset/dst 메타는 가능하면 산출 (시간 known이면 그 시각, unknown이면 정오 기준)
  const refHour = hourKnown ? (hour as number) : 12;
  const refMinute = hourKnown ? minute : 0;
  const correction = computeSolarTimeCorrection({
    civil: { year: solarYear, month: solarMonth, day: solarDay, hour: refHour, minute: refMinute },
    ianaTimeZone: tz,
    longitude: place?.lng ?? 0,
    // 보정은 "지역 known + 시간 known"일 때만
    applyCorrection: placeKnown && hourKnown,
  });

  const placeIdProvided = !!args.birthPlaceId;
  if (!placeKnown && placeIdProvided) {
    warnings.push('유효하지 않은 출생지역 id → 표준시(Asia/Seoul) fallback, 태양시 보정 미적용');
  } else if (!placeKnown) {
    warnings.push('출생지역 미입력 → 표준시(Asia/Seoul) 기준, 태양시 보정 미적용');
  }
  if (!hourKnown) warnings.push('출생시간 미상 → 태양시 보정 미적용, 시주는 정오 가정 fallback');
  if (correction.dstApplied) warnings.push('서머타임(DST) 구간 → 표준시 offset 보정 반영');
  if (placeKnown && place!.precision === 'country') warnings.push('국가 단위 fallback → 대표 좌표/표준시로 근사');
  if (tz === 'Asia/Seoul' && solarYear < 1961) {
    warnings.push('1961년 이전 한국 표준시는 tzdata 버전에 의존 — 근사값(historical offset approximation)');
  }

  // adjustedClock: 시간 known이면 보정 결과(보정 없으면 원본), 시간 unknown이면 null
  const adjustedClock: CivilDateTime | null = hourKnown ? correction.correctedClock : null;

  const calculationMeta = buildCalculationMeta({
    mode: 'precision-v1',
    birthTimeConfidence,
    birthPlacePrecision: place?.precision ?? 'unknown',
    timeZoneId: tz,
    utcOffsetMinutes: correction.utcOffsetMinutes,
    dstApplied: correction.dstApplied,
    solarTimeAdjustmentApplied: correction.solarTimeAdjustmentApplied,
    solarTimeAdjustmentMinutes: correction.solarTimeAdjustmentApplied ? correction.solarTimeAdjustmentMinutes : null,
    equationOfTimeMinutes: null,
    birthPlaceId: place?.id ?? null,
    warnings,
  });

  return {
    mode: 'precision-v1',
    ziHourPolicy: ZI_HOUR_POLICY_BY_MODE['precision-v1'], // zi-midnight-day-boundary
    adjustedClock,
    calculationMeta,
  };
}
