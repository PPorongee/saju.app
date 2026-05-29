// 용신 diagnostic 게이트 — 서버 전용 플래그. 기본 OFF.
//
// 정책:
//   - 서버 전용. NEXT_PUBLIC_ 아님 → 클라이언트 번들/브라우저 노출 없음.
//   - env 미설정 또는 'true'가 아니면 false → personal gptInput에 yongsinDiagnostic 미부착.
//   - 미부착 시 JSON.stringify에서 키 자체가 누락 → 기존 출력과 byte-identical (calculationMeta 패턴과 동일).
//   - production env 미설정 상태가 기본 → production 결과 무변경.
function flagOn(name: string): boolean {
  return typeof process !== 'undefined' && !!process.env && process.env[name] === 'true';
}

/** 개인사주 V4 (기존). production 활성 중. */
export function isYongsinDiagnosticEnabled(): boolean {
  return flagOn('SAJU_YONGSIN_DIAGNOSTIC');
}

/** 올해운세 — 별도 flag, 기본 OFF. */
export function isYearlyYongsinDiagnosticEnabled(): boolean {
  return flagOn('SAJU_YONGSIN_DIAGNOSTIC_YEARLY');
}

/** 궁합 — 별도 flag, 기본 OFF. */
export function isCompatYongsinDiagnosticEnabled(): boolean {
  return flagOn('SAJU_YONGSIN_DIAGNOSTIC_COMPAT');
}

/** 임산부(엄마 사주만) — 별도 flag, 기본 OFF. */
export function isPregnancyYongsinDiagnosticEnabled(): boolean {
  return flagOn('SAJU_YONGSIN_DIAGNOSTIC_PREGNANCY');
}
