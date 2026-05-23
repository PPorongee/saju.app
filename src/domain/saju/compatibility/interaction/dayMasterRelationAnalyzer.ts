// 두 사람의 일간 생극 관계 분석.

import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';
import type { DayMasterRelationAnalysis } from '../compatibilityTypes';
import { STEM_ELEMENT, PRODUCES, RESTRAINS, ELEMENT_KO, type Element } from '../../rules/elements';
import type { HeavenlyStem } from '../../rules/heavenlyStems';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
}

export function analyzeDayMasterRelation({ personA, personB }: Args): DayMasterRelationAnalysis {
  const aStem = personA.birthChart.dayMaster as HeavenlyStem;
  const bStem = personB.birthChart.dayMaster as HeavenlyStem;
  const aEl = STEM_ELEMENT[aStem];
  const bEl = STEM_ELEMENT[bStem];
  const aKo = ELEMENT_KO[aEl];
  const bKo = ELEMENT_KO[bEl];

  if (aEl === bEl) {
    return {
      relation: 'same-element',
      balance: 'mutual',
      description: `두 분 모두 일간이 ${aKo} 기운 — 본능적으로 비슷한 결로 통하지만, 같은 방향만 가다 보면 충돌도 비슷한 결로 반복될 수 있어요.`,
      evidence: [`A 일간 ${aStem}(${aKo}) = B 일간 ${bStem}(${bKo})`],
    };
  }
  if (PRODUCES[aEl] === bEl) {
    return {
      relation: 'a-generates-b',
      balance: 'A-gives-more',
      description: `A는 B에게 활력·에너지를 주는 쪽에 가깝고, B는 그 에너지를 받아 단단해지는 결이에요. 다만 A가 계속 주기만 하는 구조가 되면 피로가 쌓일 수 있습니다.`,
      evidence: [`A ${aKo} → B ${bKo} (상생)`],
    };
  }
  if (PRODUCES[bEl] === aEl) {
    return {
      relation: 'b-generates-a',
      balance: 'B-gives-more',
      description: `B는 A에게 안정감과 기준을 주는 쪽이고, A는 그 안정 위에서 자기 색을 펼치는 결이에요. B 쪽이 계속 맞춰주는 구조가 되면 서운함이 누적될 수 있어요.`,
      evidence: [`B ${bKo} → A ${aKo} (상생)`],
    };
  }
  if (RESTRAINS[aEl] === bEl) {
    return {
      relation: 'a-controls-b',
      balance: 'tense',
      description: `A가 B의 결을 누르거나 정리하는 위치예요. 좋게 쓰면 B의 방향을 잡아주는 역할이 되지만, 잘못 쓰면 통제·압박으로 느껴질 수 있어요.`,
      evidence: [`A ${aKo} ↔ B ${bKo} (A 극 B)`],
    };
  }
  if (RESTRAINS[bEl] === aEl) {
    return {
      relation: 'b-controls-a',
      balance: 'tense',
      description: `B가 A의 결을 누르거나 정리하는 위치예요. 좋게 쓰면 A에게 기준을 주는 역할이 되지만, 잘못 쓰면 A 쪽이 답답함을 느끼기 쉽습니다.`,
      evidence: [`B ${bKo} ↔ A ${aKo} (B 극 A)`],
    };
  }
  return {
    relation: 'neutral',
    balance: 'neutral',
    description: `두 일간이 직접적인 생극 관계는 약한 편 — 즉시 강한 끌림이나 충돌보다, 다른 요소(일지·오행 보완·십성)에 따라 결이 결정되는 관계예요.`,
    evidence: [`A 일간 ${aStem}(${aKo}), B 일간 ${bStem}(${bKo})`],
  };
}

// 보조 — 합성에 쓸 수도 있게 export
export function pairElements(aEl: Element, bEl: Element) {
  return { aEl, bEl };
}
