// Daily Fortune — 오행별 행운 아이템/장소/루틴/색 룩업 (spec §8).
//
// 주의(§8): "이걸 가지면 운이 오른다" 식 보장 금지.
// 의미 = "오늘의 기운을 생활에서 맞추는 상징/환경/루틴".
// 행운 요소는 추천 오행(용신·희신·오늘 오행 관계로 결정)에 기반한다.

import type { Element } from '../rules/elements';

export interface ElementLuck {
  colors: string[];
  places: string[];
  routines: string[];
  items: string[];
}

export const LUCK_BY_ELEMENT: Record<Element, ElementLuck> = {
  water: {
    colors: ['남색', '검정', '투명한 계열'],
    places: ['강가', '바다', '조용한 카페', '기록하기 좋은 공간'],
    routines: ['물 충분히 마시기', '짧은 산책', '정보 정리하기', '생각 메모'],
    items: ['텀블러', '노트', '이어폰', '투명한 소품'],
  },
  wood: {
    colors: ['초록', '연두'],
    places: ['공원', '나무가 있는 길', '서점'],
    routines: ['스트레칭', '계획 세우기', '새 아이디어 메모'],
    items: ['작은 화분', '다이어리', '펜'],
  },
  fire: {
    colors: ['빨강', '주황', '따뜻한 톤'],
    places: ['햇빛 드는 공간', '공연장', '활기 있는 장소'],
    routines: ['짧은 운동', '생각 소리내어 말하기', '콘텐츠 올리기'],
    items: ['따뜻한 음료', '조명', '향'],
  },
  earth: {
    colors: ['베이지', '갈색', '노랑'],
    places: ['집', '안정적인 작업 공간', '동네 산책로'],
    routines: ['정리정돈', '일정 점검', '끼니 챙기기'],
    items: ['체크리스트', '파우치', '편한 신발'],
  },
  metal: {
    colors: ['흰색', '은색', '회색'],
    places: ['깔끔한 사무 공간', '정돈된 카페'],
    routines: ['불필요한 것 비우기', '기준 한 가지 정하기', '파일 정리'],
    items: ['시계', '메탈 소품', '정리함'],
  },
};

// ─── English mirror ────────────────────────────────────────────────────────────

export const LUCK_BY_ELEMENT_EN: Record<Element, ElementLuck> = {
  water: {
    colors: ['navy', 'black', 'clear tones'],
    places: ['riverside', 'the sea', 'a quiet café', 'a good place to journal'],
    routines: ['drink enough water', 'take a short walk', 'organize information', 'jot down thoughts'],
    items: ['a tumbler', 'a notebook', 'earphones', 'a clear or glass accessory'],
  },
  wood: {
    colors: ['green', 'soft lime'],
    places: ['a park', 'a tree-lined street', 'a bookshop'],
    routines: ['stretch in the morning', 'map out a plan', 'note down a new idea'],
    items: ['a small plant', 'a planner', 'a good pen'],
  },
  fire: {
    colors: ['red', 'orange', 'warm tones'],
    places: ['a sunny spot', 'a live venue', 'somewhere energetic'],
    routines: ['a short workout', 'say your thoughts out loud', 'post or publish something'],
    items: ['a hot drink', 'a lamp or candle', 'incense'],
  },
  earth: {
    colors: ['beige', 'brown', 'yellow'],
    places: ['home', 'a stable workspace', 'a neighborhood walking path'],
    routines: ['tidy and organize', 'check your schedule', 'eat a proper meal'],
    items: ['a checklist', 'a pouch', 'comfortable shoes'],
  },
  metal: {
    colors: ['white', 'silver', 'grey'],
    places: ['a clean office', 'a tidy café'],
    routines: ['clear out the unnecessary', 'set one clear standard for the day', 'organize your files'],
    items: ['a watch', 'a metal accessory', 'a storage organizer'],
  },
};
