// All-mode Action Guide V1 — feature flag helpers.
//
// 정책 (yongsinDiagnosticFlag.ts 패턴 미러):
//   - 서버 전용 env (NEXT_PUBLIC_ 아님). `=== 'true'` 일 때만 ON. 미설정/기타값은 OFF.
//   - flag OFF면 action guide 자체를 생성하지 않음 → report에 actionGuideV1 키 미부착 →
//     JSON 직렬화에서 누락 → 기존 결과와 byte-identical.
//   - master flag(SAJU_ACTION_GUIDE_ENABLED)는 4개 모드 전체를 한 번에 켜는 용도.
//     모드별 flag로 개별 제어도 가능 (master OR per-mode).
//   - production에는 어떤 action guide flag도 설정하지 않음 (preview/local 전용).

function flagOn(name: string): boolean {
  return process.env[name] === 'true';
}

/** 전체 모드 마스터 스위치. */
const MASTER = 'SAJU_ACTION_GUIDE_ENABLED';

/** 개인사주 action guide ON 여부 (master OR per-mode). */
export function isPersonalActionGuideEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_PERSONAL_ACTION_GUIDE_ENABLED');
}

/** 올해운세 action guide ON 여부. */
export function isYearlyActionGuideEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_YEARLY_ACTION_GUIDE_ENABLED');
}

/** 궁합 action guide ON 여부. */
export function isCompatActionGuideEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_COMPAT_ACTION_GUIDE_ENABLED');
}

/** 임산부 action guide ON 여부. */
export function isPregnancyActionGuideEnabled(): boolean {
  return flagOn(MASTER) || flagOn('SAJU_PREGNANCY_ACTION_GUIDE_ENABLED');
}
