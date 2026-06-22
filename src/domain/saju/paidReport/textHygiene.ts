// Paid Report — 텍스트 위생(de-cliché) 헬퍼.
//
// 정책(사용자 spec): 아래 범용 코칭 클리셰는 어떤 visible verdict text에도 노출 금지.
// deriver가 source 분석 텍스트(escapeStrategy/howToUse 등)를 재사용할 때,
// 클리셰 조각이 섞여 있으면 그 조각을 잘라내거나(문장 단위) 안전 문장으로 대체한다.
// 결정론적·순수 함수 — GPT/Date/env 없음.

/** 노출 금지 클리셰 — 부분 문자열 매칭(정규식 fragment). */
export const BANNED_CLICHE_FRAGMENTS: string[] = [
  '기준을 세워',
  '기준을 잡',
  '역할을 나눠',
  '역할을 분담',
  '작업 범위',
  '보상 기준',
  '혼자 감당하지',
  '혼자 모든 것을 감당하지',
  '혼자 다 감당하지',
  '중간 단계에서',
  '겉과 속이 다른',
  '입체적인 사람',
  '입체적인 성향',
  '혼자 버티는 힘',
];

/** 신약/매우신약일 때 추가로 금지되는 표현. */
export const BANNED_WHEN_WEAK: string[] = [
  '혼자 버티는 힘',
  '버티는 힘',
];

/** 문장 분할(한국어 종결 + 대시/세미콜론 휴리스틱). */
function splitClauses(text: string): string[] {
  return text
    .split(/(?<=[.!?。])\s+|\s—\s|\s-\s|;|·\s|\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 텍스트에서 클리셰가 포함된 절(clause)을 제거. 남는 절이 없으면 fallback 반환.
 * weak=true면 BANNED_WHEN_WEAK도 함께 적용.
 */
export function deCliche(text: string, fallback: string, weak = false): string {
  if (!text) return fallback;
  const banned = weak
    ? [...BANNED_CLICHE_FRAGMENTS, ...BANNED_WHEN_WEAK]
    : BANNED_CLICHE_FRAGMENTS;
  const clauses = splitClauses(text);
  const kept = clauses.filter((c) => !banned.some((b) => c.includes(b)));
  const joined = kept.join(' ').trim();
  return joined.length >= 2 ? joined : fallback;
}

/** 텍스트에 클리셰가 하나라도 있으면 true. */
export function hasCliche(text: string, weak = false): boolean {
  const banned = weak
    ? [...BANNED_CLICHE_FRAGMENTS, ...BANNED_WHEN_WEAK]
    : BANNED_CLICHE_FRAGMENTS;
  return banned.some((b) => text.includes(b));
}
