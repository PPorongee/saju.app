// 오행 (五行) — wood·fire·earth·metal·water
// spec에 따라 영어 enum 사용. 표시용 한글 매핑은 KO 객체.

import type { HeavenlyStem } from './heavenlyStems';
import type { EarthlyBranch } from './earthlyBranches';

export type Element = 'wood' | 'fire' | 'earth' | 'metal' | 'water';
export const ELEMENTS: readonly Element[] = ['wood', 'fire', 'earth', 'metal', 'water'] as const;

export const ELEMENT_KO: Record<Element, string> = {
  wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
};

export const KO_TO_ELEMENT: Record<string, Element> = {
  목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water',
};

export const STEM_ELEMENT: Record<HeavenlyStem, Element> = {
  갑: 'wood', 을: 'wood',
  병: 'fire', 정: 'fire',
  무: 'earth', 기: 'earth',
  경: 'metal', 신: 'metal',
  임: 'water', 계: 'water',
};

export const BRANCH_ELEMENT: Record<EarthlyBranch, Element> = {
  자: 'water', 축: 'earth', 인: 'wood', 묘: 'wood',
  진: 'earth', 사: 'fire', 오: 'fire', 미: 'earth',
  신: 'metal', 유: 'metal', 술: 'earth', 해: 'water',
};

// 상생 (生): wood→fire→earth→metal→water→wood
export const PRODUCES: Record<Element, Element> = {
  wood: 'fire', fire: 'earth', earth: 'metal', metal: 'water', water: 'wood',
};

// 상극 (克): wood→earth→water→fire→metal→wood
export const RESTRAINS: Record<Element, Element> = {
  wood: 'earth', earth: 'water', water: 'fire', fire: 'metal', metal: 'wood',
};

export function isProducing(a: Element, b: Element): boolean { return PRODUCES[a] === b; }
export function isRestraining(a: Element, b: Element): boolean { return RESTRAINS[a] === b; }

/** 계절 왕(旺) 오행 — 월지 기준 */
export const SEASON_ELEMENT: Record<EarthlyBranch, Element> = {
  인: 'wood', 묘: 'wood', 진: 'wood',
  사: 'fire', 오: 'fire', 미: 'fire',
  신: 'metal', 유: 'metal', 술: 'metal',
  해: 'water', 자: 'water', 축: 'water',
};
