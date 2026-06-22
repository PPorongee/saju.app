// Paid Report Productization V1 — feature flag.
// 서버 전용 env, `=== 'true'`일 때만 ON.
// production에는 설정하지 않음 → 기본 OFF → /api/saju-v4 응답에 paidReport 키 미부착 → byte-identical.
// dev/test에서는 기본 ON (명시적으로 'false'로 끌 수 있음).

const FLAG = 'SAJU_PAID_REPORT_V1_ENABLED';

/**
 * production: env 미설정 → OFF.
 * dev/test: 기본 ON (단, SAJU_PAID_REPORT_V1_ENABLED='false'면 OFF로 강제 가능).
 */
export function isPaidReportV1Enabled(): boolean {
  const raw = process.env[FLAG];
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  // 미설정: production이면 OFF, 그 외(dev/test)면 ON.
  return process.env.NODE_ENV !== 'production';
}
