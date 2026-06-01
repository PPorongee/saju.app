// Fortune Questions Verdict V1 — feature flag helpers (Event Forecast 대체).
// 서버 전용 env, `=== 'true'`일 때만 ON. flag OFF면 fortuneVerdict 미생성 → report에 키 미부착 → byte-identical.
// production에는 어떤 fortune verdict flag도 설정하지 않음 (preview/local 전용).

function flagOn(name: string): boolean {
  return process.env[name] === 'true';
}
const MASTER = 'SAJU_FORTUNE_VERDICT_ENABLED';

export function isPersonalFortuneVerdictEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_PERSONAL_FORTUNE_VERDICT_ENABLED');
}
export function isYearlyFortuneVerdictEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_YEARLY_FORTUNE_VERDICT_ENABLED');
}
export function isCompatFortuneVerdictEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_COMPAT_FORTUNE_VERDICT_ENABLED');
}
export function isPregnancyFortuneVerdictEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_PREGNANCY_FORTUNE_VERDICT_ENABLED');
}
