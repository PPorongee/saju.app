// Event Forecast V1 — feature flag helpers (Action Guide V1 대체).
//
// 서버 전용 env, `=== 'true'`일 때만 ON. flag OFF면 eventForecast 미생성 →
// report에 eventForecast 키 미부착 → 기존 결과 byte-identical.
// production에는 어떤 event forecast flag도 설정하지 않음 (preview/local 전용).

function flagOn(name: string): boolean {
  return process.env[name] === 'true';
}

const MASTER = 'SAJU_EVENT_FORECAST_ENABLED';

export function isPersonalEventForecastEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_PERSONAL_EVENT_FORECAST_ENABLED');
}
export function isYearlyEventForecastEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_YEARLY_EVENT_FORECAST_ENABLED');
}
export function isCompatEventForecastEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_COMPAT_EVENT_FORECAST_ENABLED');
}
export function isPregnancyEventForecastEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_PREGNANCY_EVENT_FORECAST_ENABLED');
}
