// 임산부 모드 V4 — 태교 3축 매퍼 (Phase 2)
//
// 3축: ① 엄마 용신 기반 ② 아이 예정일 기운 기반 ③ 엄마-아이 보완.
// 정책:
//   - 음식/영양/운동을 의학 조언처럼 쓰지 않음. "산책"도 운동 처방이 아니라 생활 리듬 차원.
//   - 결정적 시드만 제공. 실제 줄글은 taegyoGuide LLM 섹션이 작성.
//   - 오행별 태교는 정서/환경/리듬 중심 (사용자 spec).

import { ELEMENT_KO, type Element } from '../../rules/elements';
import type { PregnancyAnalysisBundle } from './pregnancyMomBabyAnalyzer';

/** 오행별 태교 (정서·환경·리듬 중심, 의학/영양/운동 처방 아님) */
export const TAEGYO_BY_ELEMENT: Record<Element, string[]> = {
  wood: ['가까운 식물·초록을 곁에 두기', '가벼운 산책으로 생활 리듬 만들기', '하루를 짧게 기록하기', '그림책 천천히 넘겨보기'],
  fire: ['자연광이 드는 시간 보내기', '소리 내어 웃을 거리 만들기', '밝은 음악 듣기', '따뜻한 대화 나누기'],
  earth: ['일정한 하루 루틴 만들기', '주변 공간 가볍게 정리하기', '가족과 함께하는 차분한 시간', '편안한 공간 꾸미기'],
  metal: ['조용히 호흡을 고르는 시간', '깨끗하고 단순한 환경 유지', '잔잔한 단순한 음악', '물건을 조금 덜어내기'],
  water: ['잔잔한 음악·물소리 듣기', '감정을 글로 흘려보내기', '충분히 쉬는 시간 확보', '조용한 대화로 마음 풀기'],
};

export type TaegyoAxisKind = 'mother-useful' | 'baby-energy' | 'complement';

export interface TaegyoAxis {
  kind: TaegyoAxisKind;
  element: Element;
  elementKo: string;
  /** 이 축이 왜 도움이 되는지 (생활 리듬/정서 차원) */
  focus: string;
  /** 태교 활동 시드 (2~3개) */
  activities: string[];
}

export interface TaegyoPlan {
  axes: TaegyoAxis[];
  /** 조심할 태교 패턴 (과한 정보탐색/비교/완벽주의 등) — 결정적 시드 */
  cautionSeeds: string[];
  /** 참고한 오행 (한글, evidenceView용) */
  elementsKo: string[];
}

function focusFor(kind: TaegyoAxisKind, elementKo: string): string {
  switch (kind) {
    case 'mother-useful':
      return `엄마에게 도움이 되는 ${elementKo} 기운을 채우는 방향이라, 엄마 마음이 편안해지는 데 도움이 돼요.`;
    case 'baby-energy':
      return `아이 예정일 기준으로 보이는 ${elementKo} 결과 잘 어울리는 방향이에요.`;
    case 'complement':
      return `엄마와 아이 사이를 ${elementKo} 기운으로 부드럽게 이어주는 방향이에요.`;
  }
}

export function buildTaegyoPlan(bundle: PregnancyAnalysisBundle): TaegyoPlan {
  const axes: TaegyoAxis[] = [];
  const seen = new Set<string>(); // kind+element 중복 방지

  const addAxis = (kind: TaegyoAxisKind, el: Element | undefined) => {
    if (!el || !TAEGYO_BY_ELEMENT[el]) return;
    const key = kind + ':' + el;
    if (seen.has(key)) return;
    seen.add(key);
    axes.push({
      kind, element: el, elementKo: ELEMENT_KO[el],
      focus: focusFor(kind, ELEMENT_KO[el]),
      activities: TAEGYO_BY_ELEMENT[el].slice(0, 3),
    });
  };

  // ① 엄마 용신 기반
  const momUseful = bundle.mother.coreAnalysis.usefulGod.primaryUseful;
  if (momUseful.type === 'element') addAxis('mother-useful', momUseful.value as Element);

  // ② 아이 예정일 기운 기반 — 아이 강한 오행(예정일 기준)
  const babyStrong = (bundle.baby.coreAnalysis.elementStrength.strongest ?? []) as Element[];
  addAxis('baby-energy', babyStrong[0]);

  // ③ 엄마-아이 보완 — 엄마가 아이에게서 채우는 오행
  const complementEl = bundle.elementComplement.motherNeedsFromBaby[0];
  addAxis('complement', complementEl);

  // 3축 미달 시 엄마 희신/아이 부족으로 보강
  if (axes.length < 3) {
    const fav = bundle.mother.coreAnalysis.usefulGod.favorable.find(
      (v): v is Element => typeof v === 'string' && ['wood', 'fire', 'earth', 'metal', 'water'].includes(v),
    );
    addAxis('mother-useful', fav);
  }
  if (axes.length < 3) {
    const babyDef = (bundle.baby.coreAnalysis.elementStrength.deficient ?? []) as Element[];
    addAxis('baby-energy', babyDef[0]);
  }

  const cautionSeeds = [
    '태교를 많이 하기보다, 엄마가 편안하게 지속할 수 있는지가 더 중요해요.',
    '정보를 과하게 찾아보거나 다른 사람과 비교하다 마음이 분주해지기 쉬워요.',
    '완벽하게 하려다 혼자 다 감당하지 않도록, 힘을 빼는 연습이 도움이 됩니다.',
  ];

  const elementsKo = Array.from(new Set(axes.map(a => a.elementKo)));

  return { axes, cautionSeeds, elementsKo };
}
