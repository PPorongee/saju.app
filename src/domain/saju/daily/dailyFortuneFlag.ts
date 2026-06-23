// Daily Fortune — feature flag (spec §13).
//
// 순수 모듈 (server-only 없음). route.ts / 테스트 모두 여기서 import.
//
// 정책:
//   - SAJU_DAILY_FORTUNE_ENABLED === 'true' 일 때만 API 활성.
//   - production 기본 OFF (env 미설정) → API 503.
//   - UI 카드는 NEXT_PUBLIC_SAJU_DAILY_FORTUNE_UI_ENABLED 로 별도 제어(클라이언트).

/** 서버 API 활성 여부. env.SAJU_DAILY_FORTUNE_ENABLED === 'true' 일 때만 true. */
export function isDailyFortuneEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.SAJU_DAILY_FORTUNE_ENABLED === 'true';
}
