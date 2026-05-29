// 용신 diagnostic 게이트 — 서버 전용 플래그. 기본 OFF.
//
// 정책:
//   - 서버 전용. NEXT_PUBLIC_ 아님 → 클라이언트 번들/브라우저 노출 없음.
//   - env 미설정 또는 'true'가 아니면 false → personal gptInput에 yongsinDiagnostic 미부착.
//   - 미부착 시 JSON.stringify에서 키 자체가 누락 → 기존 출력과 byte-identical (calculationMeta 패턴과 동일).
//   - production env 미설정 상태가 기본 → production 결과 무변경.
export function isYongsinDiagnosticEnabled(): boolean {
  return typeof process !== 'undefined'
    && !!process.env
    && process.env.SAJU_YONGSIN_DIAGNOSTIC === 'true';
}
