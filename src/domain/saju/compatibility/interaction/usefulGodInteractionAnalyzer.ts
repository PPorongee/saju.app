// 용신/기신 상호 자극.
// 상대가 내 용신을 보완하는지, 내 기신을 자극하는지.

import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';
import type { UsefulGodInteractionAnalysis } from '../compatibilityTypes';
import { ELEMENT_KO, type Element } from '../../rules/elements';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
}

export function analyzeUsefulGodInteraction({ personA, personB }: Args): UsefulGodInteractionAnalysis {
  const aUseful  = personA.coreAnalysis.usefulGod.primaryUseful.value as Element;
  const aFavor   = personA.coreAnalysis.usefulGod.favorable as Element[];
  const aUnfav   = personA.coreAnalysis.usefulGod.unfavorable as Element[];

  const bUseful  = personB.coreAnalysis.usefulGod.primaryUseful.value as Element;
  const bFavor   = personB.coreAnalysis.usefulGod.favorable as Element[];
  const bUnfav   = personB.coreAnalysis.usefulGod.unfavorable as Element[];

  const aStrong = personA.coreAnalysis.elementStrength.strongest as Element[];
  const bStrong = personB.coreAnalysis.elementStrength.strongest as Element[];

  // B의 강한 오행이 A의 용신/희신과 겹치는가
  const aUsefulTouchedByB = uniqueIntersect(bStrong, [aUseful, ...aFavor]);
  const bUsefulTouchedByA = uniqueIntersect(aStrong, [bUseful, ...bFavor]);
  const aUnfavorableTriggeredByB = uniqueIntersect(bStrong, aUnfav);
  const bUnfavorableTriggeredByA = uniqueIntersect(aStrong, bUnfav);

  const evidence: string[] = [
    `A 용신 ${ELEMENT_KO[aUseful]}, 희신 ${aFavor.map(e => ELEMENT_KO[e as Element]).join('·') || '-'}, 기신 ${aUnfav.map(e => ELEMENT_KO[e as Element]).join('·') || '-'}`,
    `B 용신 ${ELEMENT_KO[bUseful]}, 희신 ${bFavor.map(e => ELEMENT_KO[e as Element]).join('·') || '-'}, 기신 ${bUnfav.map(e => ELEMENT_KO[e as Element]).join('·') || '-'}`,
  ];
  if (aUsefulTouchedByB.length) evidence.push(`B의 ${aUsefulTouchedByB.map(e => ELEMENT_KO[e]).join('·')} 기운이 A 용신/희신을 보완`);
  if (bUsefulTouchedByA.length) evidence.push(`A의 ${bUsefulTouchedByA.map(e => ELEMENT_KO[e]).join('·')} 기운이 B 용신/희신을 보완`);
  if (aUnfavorableTriggeredByB.length) evidence.push(`B의 ${aUnfavorableTriggeredByB.map(e => ELEMENT_KO[e]).join('·')} 기운이 A 기신을 자극`);
  if (bUnfavorableTriggeredByA.length) evidence.push(`A의 ${bUnfavorableTriggeredByA.map(e => ELEMENT_KO[e]).join('·')} 기운이 B 기신을 자극`);

  // 해석
  let interpretation: string;
  if (aUsefulTouchedByB.length && bUsefulTouchedByA.length && !aUnfavorableTriggeredByB.length && !bUnfavorableTriggeredByA.length) {
    interpretation = '서로의 용신을 채워주는 보완 구조 — 같이 있을 때 균형감이 생기는 결이에요.';
  } else if (aUsefulTouchedByB.length && bUsefulTouchedByA.length) {
    interpretation = '서로 보완해주는 부분이 있지만, 동시에 약한 결도 건드리는 양면 구조 — 좋게 쓰면 성장 자극, 잘못 쓰면 피로 누적.';
  } else if (aUsefulTouchedByB.length || bUsefulTouchedByA.length) {
    interpretation = '한쪽만 일방적으로 보완받는 구조 — 일방성이 길어지면 피로가 한쪽에 쌓이기 쉬워요.';
  } else if (aUnfavorableTriggeredByB.length || bUnfavorableTriggeredByA.length) {
    interpretation = '상대가 내 약한 결을 자극하는 쪽이 더 큰 구조 — 가까워질수록 평소보다 더 예민하게 반응할 수 있어요.';
  } else {
    interpretation = '용신/기신 차원의 직접 자극은 약한 편 — 끌림·갈등은 다른 결(일지·십성·생활 패턴)에서 결정됩니다.';
  }

  return {
    aUsefulTouchedByB,
    bUsefulTouchedByA,
    aUnfavorableTriggeredByB,
    bUnfavorableTriggeredByA,
    interpretation,
    evidence,
  };
}

function uniqueIntersect<T>(a: T[], b: T[]): T[] {
  const setB = new Set(b);
  const out: T[] = [];
  for (const x of a) if (setB.has(x) && !out.includes(x)) out.push(x);
  return out;
}
