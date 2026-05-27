// Precision V1 — 출생지역 resolver (Phase 2).
//
// 정책:
//   - 정적 데이터셋(places.ts)만 사용. 외부 geocoding/네트워크 호출 금지.
//   - 매칭은 id / labelKo / labelEn / aliases (전부 정규화 후 정확 일치). 좌표 임의 추정 금지.
//   - resolve 실패는 명시적 결과({ok:false, reason})로 반환 (throw 안 함).
//   - lookup 맵은 모듈 로드시 1회 구성. id/alias 중복은 빌드시 데이터 오류 → 테스트가 강제.

import { PLACES, type Place, type PlacePrecision } from './data/places';

export type { Place, PlacePrecision };

export type PlaceResolveResult =
  | { ok: true; place: Place }
  | { ok: false; reason: 'empty' | 'not-found' };

/** 검색 키 정규화: trim → lower → 내부 공백/하이픈/언더스코어 단일화 제거. */
function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[\s_\-]+/g, ' ')
    .trim();
}

// ── lookup 맵 (모듈 1회 구성) ──
const KEY_TO_PLACE: Map<string, Place> = (() => {
  const map = new Map<string, Place>();
  const add = (key: string, place: Place) => {
    const k = normalizeKey(key);
    if (!k) return;
    // 중복 키가 서로 다른 place를 가리키면 데이터 오류 (테스트가 검출). 먼저 들어온 것 유지.
    if (!map.has(k)) map.set(k, place);
  };
  for (const p of PLACES) {
    add(p.id, p);
    add(p.labelKo, p);
    add(p.labelEn, p);
    for (const a of p.aliases) add(a, p);
  }
  return map;
})();

const ID_TO_PLACE: Map<string, Place> = new Map(PLACES.map(p => [p.id, p]));

/** id로 직접 조회 (정확 일치). 없으면 null. */
export function getPlaceById(id: string): Place | null {
  return ID_TO_PLACE.get(id) ?? null;
}

/** 질의 문자열 resolve. 실패는 명시적. 임의 좌표 추정/외부 호출 없음. */
export function resolvePlace(query: string | null | undefined): PlaceResolveResult {
  if (query == null) return { ok: false, reason: 'empty' };
  const k = normalizeKey(query);
  if (!k) return { ok: false, reason: 'empty' };
  const place = KEY_TO_PLACE.get(k);
  if (!place) return { ok: false, reason: 'not-found' };
  return { ok: true, place };
}

/** 전체 목록 (UI select 구성용). */
export function listPlaces(): Place[] {
  return PLACES.slice();
}
