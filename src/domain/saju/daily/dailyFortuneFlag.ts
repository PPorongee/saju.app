// Daily Fortune — feature flag (spec §13).
//
// 순수 모듈 (server-only 없음). route.ts / 테스트 모두 여기서 import.
//
// 정책 (2026-06 런칭):
//   - 기본 ON. SAJU_DAILY_FORTUNE_ENABLED === 'false' 로 명시할 때만 비활성(503).
//   - 끄려면 env에 'false' 설정. (런칭 전 기본 OFF였으나 정식 노출로 전환.)
//   - UI 카드는 NEXT_PUBLIC_SAJU_DAILY_FORTUNE_UI_ENABLED 로 별도 제어(클라이언트).

/** 서버 API 활성 여부. 기본 ON, env.SAJU_DAILY_FORTUNE_ENABLED === 'false' 일 때만 비활성. */
export function isDailyFortuneEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.SAJU_DAILY_FORTUNE_ENABLED !== 'false';
}
