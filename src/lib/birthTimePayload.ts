// 출생시간 payload 통일 헬퍼 (UI → API birthTime/birthTimeConfidence).
//
// 정책 (개인사주·올해운세·궁합 공통):
//   1. 정확입력(시/분)을 아는 경우  → birthTime = "HH:mm"(실제 시각 그대로), confidence = 'exact'
//   2. 시진(時辰)만 아는 경우        → birthTime = 시진 대표시각 "HH:mm",     confidence = 'approximate'
//   3. 시간을 모르는 경우            → birthTime = undefined,                  confidence = 'unknown'
//
// ⚠️ 주의: 시진 인덱스(0~11)를 절대 "HH"(시)로 직접 쓰지 말 것.
//   반드시 sijuToRepresentativeTime으로 대표 벽시계로 변환해서 보낸다.
//   (과거 궁합 버그: compatPerson.hour(시진 인덱스)를 그대로 HH에 넣어 11:10→"06:10"으로 오염)

const pad2 = (n: number): string => String(n).padStart(2, '0');

/**
 * 시진 인덱스(0~11) → 대표 벽시계 "HH:mm".
 * 개인사주 grid 규칙과 동일: (인덱스 × 2):00 (자시 0 → "00:00").
 * 범위 밖(-1 등)이면 undefined.
 */
export function sijuToRepresentativeTime(sijuIndex: number): string | undefined {
  if (sijuIndex < 0 || sijuIndex > 11) return undefined;
  return `${pad2((sijuIndex * 2) || 0)}:00`;
}

export type BirthTimeConfidence = 'exact' | 'approximate' | 'unknown';

export interface BirthTimeFields {
  birthTime: string | undefined;
  birthTimeConfidence: BirthTimeConfidence;
}

export interface ResolveBirthTimeArgs {
  /** 시진 인덱스 0~11, -1=모름. */
  sijuIndex: number;
  /** 정확입력(시/분) 상태. use=true면 hour/min을 실제 벽시계로 사용. 없으면 시진/모름 처리. */
  exact?: { use: boolean; hour: number; min: number };
}

/**
 * (시진 인덱스 + 정확입력) → { birthTime, birthTimeConfidence }.
 *   - exact.use && exact.hour>=0 → "HH:mm"(실제) + 'exact'
 *   - sijuIndex>=0               → 시진 대표값 + 'approximate'
 *   - 그 외                       → undefined + 'unknown'
 */
export function resolveBirthTimeFields(args: ResolveBirthTimeArgs): BirthTimeFields {
  const { sijuIndex, exact } = args;
  if (exact?.use && exact.hour >= 0) {
    return { birthTime: `${pad2(exact.hour)}:${pad2(exact.min)}`, birthTimeConfidence: 'exact' };
  }
  if (sijuIndex >= 0) {
    return { birthTime: sijuToRepresentativeTime(sijuIndex), birthTimeConfidence: 'approximate' };
  }
  return { birthTime: undefined, birthTimeConfidence: 'unknown' };
}

/**
 * 임산부 전용 시진 대표시각: 자시 0 → "00:30", 그 외 k → (2k):00.
 * (임산부 모드는 분 단위 정확입력 UI가 없어 시진 grid만 사용 — 기존 _toTime 정책 보존.)
 */
export function pregnancySijuToTime(sijuIndex: number): string | undefined {
  if (sijuIndex < 0 || sijuIndex > 11) return undefined;
  return sijuIndex === 0 ? '00:30' : `${pad2(sijuIndex * 2)}:00`;
}

/**
 * 임산부 시진 기반 fields — 분 단위 정확입력이 없으므로 항상 대표값 + approximate.
 *   - sijuIndex>=0 → 대표시각 + 'approximate'
 *   - 그 외        → undefined + 'unknown'
 * (절대 'exact'를 반환하지 않는다.)
 */
export function pregnancySijuBirthTimeFields(sijuIndex: number): BirthTimeFields {
  if (sijuIndex < 0) return { birthTime: undefined, birthTimeConfidence: 'unknown' };
  return { birthTime: pregnancySijuToTime(sijuIndex), birthTimeConfidence: 'approximate' };
}
