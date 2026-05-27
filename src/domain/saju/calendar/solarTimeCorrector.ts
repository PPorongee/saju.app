// Precision V1 — 태양시(local mean solar time) 보정기 (Phase 3).
//
// 정책:
//   - IANA timezone + 경도로 그 시점 utcOffset(DST·historical 포함)·보정분·보정시각 산출.
//   - V1 = local mean solar time. equation of time는 자리만 두고 0 (P3 검증 후 포함 여부 결정).
//   - formula: solarTimeAdjustmentMinutes = round(longitude*4 - utcOffsetMinutes)
//       (서울 lng≈126.98, KST offset 540 → ≈ -32)
//   - 지역 unknown(applyCorrection=false) → adj 0, applied=false (보정 미적용 = legacy와 동일 시각).
//   - 이 모듈은 도메인(서버) 계산 전용. client bundle 유입 금지 (UI 미배선).
//   - 아직 calculatePillars에 연결하지 않는다 (독립 단위).

import { DateTime } from 'luxon';

export interface CivilDateTime {
  year: number;
  month: number;  // 1~12
  day: number;
  hour: number;   // 0~23
  minute: number; // 0~59
}

export interface SolarTimeCorrectionInput {
  civil: CivilDateTime;
  ianaTimeZone: string;
  /** 동경(+)/서경(-) 십진 경도. */
  longitude: number;
  /** false면 보정 미적용 (지역 unknown). */
  applyCorrection: boolean;
}

export interface SolarTimeCorrectionResult {
  valid: boolean;
  /** 그 시점 UTC offset(분). DST·역사적 전환 포함. tz/날짜 무효면 null. */
  utcOffsetMinutes: number | null;
  /** 그 시점 DST 적용 여부. */
  dstApplied: boolean | null;
  solarTimeAdjustmentApplied: boolean;
  /** round(longitude*4 - utcOffset). applyCorrection=false면 0. */
  solarTimeAdjustmentMinutes: number;
  /** V1 = 0. 확장 자리. */
  equationOfTimeMinutes: number;
  /** 보정 적용된 현지 벽시계 (보정분 가산, 날짜 롤오버 처리). */
  correctedClock: CivilDateTime;
}

/** civil local time + tz + 경도 → 태양시 보정 결과. */
export function computeSolarTimeCorrection(input: SolarTimeCorrectionInput): SolarTimeCorrectionResult {
  const { civil, ianaTimeZone, longitude, applyCorrection } = input;

  const dt = DateTime.fromObject(
    { year: civil.year, month: civil.month, day: civil.day, hour: civil.hour, minute: civil.minute },
    { zone: ianaTimeZone },
  );

  // tz 무효 또는 날짜 무효 → 보정 없이 원본 반환 (valid=false)
  if (!dt.isValid) {
    return {
      valid: false,
      utcOffsetMinutes: null,
      dstApplied: null,
      solarTimeAdjustmentApplied: false,
      solarTimeAdjustmentMinutes: 0,
      equationOfTimeMinutes: 0,
      correctedClock: { ...civil },
    };
  }

  const utcOffsetMinutes = dt.offset;            // 분, DST·historical 포함
  const dstApplied = dt.isInDST;                 // boolean
  const eot = 0;                                 // V1: equation of time 미적용

  const adj = applyCorrection
    ? Math.round(longitude * 4 - utcOffsetMinutes) + eot
    : 0;

  const correctedDt = adj !== 0 ? dt.plus({ minutes: adj }) : dt;
  const correctedClock: CivilDateTime = {
    year: correctedDt.year,
    month: correctedDt.month,
    day: correctedDt.day,
    hour: correctedDt.hour,
    minute: correctedDt.minute,
  };

  return {
    valid: true,
    utcOffsetMinutes,
    dstApplied,
    solarTimeAdjustmentApplied: applyCorrection,
    solarTimeAdjustmentMinutes: adj,
    equationOfTimeMinutes: eot,
    correctedClock,
  };
}
