// Precision V1 — 계산 모드 결정 + precision 컨텍스트 빌더 (Phase 5 배선용).
//
// 정책:
//   - mode 결정 우선순위: input.calculationMode > env SAJU_CALC_MODE > 'legacy'.
//   - legacy면 모든 옵션 undefined 반환 → calculatePillars/calculateFortuneCycles가 기존 경로 그대로 실행(byte-identical).
//   - precision-v1이면 음력→양력 변환(toSolarDate) 후 prepareCalculation으로 보정 시각/메타 산출.
//   - 시간 미상이면 pillarOptions 미생성(legacy 동등) + calculationMeta만 precision으로 기록.

import { toSolarDate } from './solarLunarConverter';
import { prepareCalculation } from './precisionAdjust';
import type { NormalizedBirth, BirthInput } from './normalizeBirthInput';
import type { PrecisionPillarOptions } from './pillarCalculator';
import type { CivilDateTime } from './solarTimeCorrector';
import type { CalculationMeta, CalculationMode, BirthTimeConfidenceMeta } from './calculationMeta';

export function resolveCalculationMode(input: Pick<BirthInput, 'calculationMode'>): CalculationMode {
  if (input.calculationMode === 'precision-v1') return 'precision-v1';
  if (input.calculationMode === 'legacy') return 'legacy';
  if (typeof process !== 'undefined' && process.env && process.env.SAJU_CALC_MODE === 'precision-v1') {
    return 'precision-v1';
  }
  return 'legacy';
}

export interface PrecisionContext {
  mode: CalculationMode;
  /** calculatePillars 3번째 인자. legacy/시간미상이면 undefined. */
  pillarOptions?: PrecisionPillarOptions;
  /** calculateFortuneCycles 4번째 인자(보정 시각). legacy/시간미상이면 undefined. */
  fortuneClock?: CivilDateTime;
  /** precision-v1일 때만 존재. legacy면 undefined → 출력에 미부착(byte-identical). */
  calculationMeta?: CalculationMeta;
}

/** normalized + input → precision 컨텍스트. legacy면 전부 undefined. */
export function buildPrecisionContext(normalized: NormalizedBirth, input: BirthInput): PrecisionContext {
  const mode = resolveCalculationMode(input);
  if (mode === 'legacy') return { mode: 'legacy' };

  // 음력→양력 변환을 보정 전에 수행 (precisionAdjust는 양력 civil을 받음)
  const solar = toSolarDate(normalized.inputCalendar, normalized.year, normalized.month, normalized.day, normalized.isLeapMonth);
  const prep = prepareCalculation({
    mode: 'precision-v1',
    solarYear: solar.year,
    solarMonth: solar.month,
    solarDay: solar.day,
    hour: normalized.hour,
    minute: normalized.minute,
    birthTimeConfidence: input.birthTimeConfidence as BirthTimeConfidenceMeta,
    birthPlaceId: input.birthPlaceId ?? null,
  });

  return {
    mode: 'precision-v1',
    pillarOptions: prep.adjustedClock
      ? { adjustedClock: prep.adjustedClock, ziHourPolicy: prep.ziHourPolicy }
      : undefined,
    fortuneClock: prep.adjustedClock ?? undefined,
    calculationMeta: prep.calculationMeta,
  };
}
