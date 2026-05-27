// 임산부 모드 V4 — 엄마-아이 관계 분석기 (Phase 2)
//
// 정책:
//   - 궁합 interaction 분석기만 선별 재사용 (수정 금지, import only).
//   - 연애 프레임(attraction/conflict/recovery/stability/archetype layers) 미사용.
//   - 분석기 출력의 "A/B" 라벨은 엄마/아이 프레임으로 재서술 (비-연애).
//   - 의료/건강/성별/출산일 판단 일절 없음. 오행·일간·용신·합충 구조만.

import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';
import { analyzeDayMasterRelation } from '../../compatibility/interaction/dayMasterRelationAnalyzer';
import { analyzeElementComplement } from '../../compatibility/interaction/elementComplementAnalyzer';
import { analyzeUsefulGodInteraction } from '../../compatibility/interaction/usefulGodInteractionAnalyzer';
import { analyzeCompatibilityCombinationConflict } from '../../compatibility/interaction/combinationConflictAnalyzer';
import { STEM_ELEMENT, ELEMENT_KO, type Element } from '../../rules/elements';
import type { HeavenlyStem } from '../../rules/heavenlyStems';
import type { DayMasterRelationKind } from '../../compatibility/compatibilityTypes';

export interface PregnancyDayMasterRelation {
  relation: DayMasterRelationKind;
  balance: string;
  motherElementKo: string;
  babyElementKo: string;
  /** 엄마-아이 프레임 plain (비-연애, 비-의료) */
  plain: string;
}

export interface PregnancyElementComplement {
  /** 엄마에게 부족하고 아이 예정일 기운이 가진 오행 */
  motherNeedsFromBaby: Element[];
  /** 아이 예정일 기준 부족하고 엄마가 가진 오행 */
  babyNeedsFromMother: Element[];
  mutual: 'strong' | 'moderate' | 'weak' | 'one-sided';
  /** 엄마에게 과한 오행을 아이 예정일 기운이 더 자극하는지 */
  motherExcessAmplified: Element[];
  plain: string;
}

export interface PregnancyUsefulGodInteraction {
  motherUsefulTouchedByBaby: Element[];
  babyUsefulTouchedByMother: Element[];
  motherUnfavorableTriggeredByBaby: Element[];
  plain: string;
}

export interface PregnancyCombinationConflicts {
  combinations: string[];
  conflicts: string[];
  punishments: string[];
  destructions: string[];
  harms: string[];
}

export interface PregnancyAnalysisBundle {
  mother: PersonalSajuGptInput;
  baby: PersonalSajuGptInput;
  dayMasterRelation: PregnancyDayMasterRelation;
  elementComplement: PregnancyElementComplement;
  usefulGodInteraction: PregnancyUsefulGodInteraction;
  combinationConflicts: PregnancyCombinationConflicts;
}

function stemElementKo(dayMaster: string): string {
  const el = STEM_ELEMENT[dayMaster as HeavenlyStem];
  return el ? ELEMENT_KO[el] : '-';
}

/** A/B 라벨을 엄마/아이로 재서술한 일간 관계 plain */
function buildDayMasterPlain(relation: DayMasterRelationKind, momKo: string, babyKo: string): string {
  switch (relation) {
    case 'same-element':
      return `엄마와 아이 모두 일간이 ${momKo} 기운으로 비슷한 결이에요. 통하는 부분이 많지만, 같은 방향으로만 가면 비슷한 지점에서 부딪힐 수 있어 서로의 속도를 살펴주면 좋아요.`;
    case 'a-generates-b':
      return `엄마(${momKo})가 아이(${babyKo})에게 기운을 북돋아 주기 쉬운 결이에요. 좋게 쓰면 든든한 바탕이 되지만, 엄마가 계속 내어주기만 하면 지칠 수 있어 스스로를 챙기는 시간이 중요합니다.`;
    case 'b-generates-a':
      return `아이(${babyKo})의 기운이 엄마(${momKo})에게 생기와 안정을 더해주는 결이에요. 예정일 기준으로 보면, 아이를 품는 시간이 엄마에게도 새로운 리듬을 가져올 수 있는 구조예요.`;
    case 'a-controls-b':
      return `엄마(${momKo})가 아이(${babyKo})에게 기준과 틀을 주기 쉬운 결이에요. 좋게 쓰면 방향을 잡아주는 역할이 되지만, 너무 앞서가기보다 아이의 결을 천천히 지켜봐 주는 편이 편안합니다.`;
    case 'b-controls-a':
      return `아이(${babyKo})의 기운이 엄마(${momKo})의 평소 리듬을 살짝 흔들어 새로운 변화를 가져오는 결이에요. 예정일 기준으로 보면, 엄마가 기존 방식을 조금 내려놓을 때 더 편안해질 수 있어요.`;
    default:
      return `엄마(${momKo})와 아이(${babyKo})의 일간이 직접적인 생극보다, 오행 보완·용신 같은 다른 결로 연결되는 관계예요. 한쪽으로 단정하기보다 전체 균형을 보며 천천히 맞춰가면 좋아요.`;
  }
}

function buildComplementPlain(c: Omit<PregnancyElementComplement, 'plain'>): string {
  const toKo = (els: Element[]) => els.map(e => ELEMENT_KO[e]).join('·');
  const parts: string[] = [];
  if (c.motherNeedsFromBaby.length) {
    parts.push(`엄마에게 부족하기 쉬운 ${toKo(c.motherNeedsFromBaby)} 기운을 아이 예정일 기운이 부드럽게 채워주는 결이에요.`);
  }
  if (c.babyNeedsFromMother.length) {
    parts.push(`반대로 아이 예정일 기준으로 옅은 ${toKo(c.babyNeedsFromMother)} 기운은 엄마 쪽이 자연스럽게 더해줄 수 있어요.`);
  }
  if (c.motherExcessAmplified.length) {
    parts.push(`다만 엄마에게 이미 강한 ${toKo(c.motherExcessAmplified)} 기운은 더 도드라질 수 있어, 그 부분만 조금 덜어내는 리듬이 도움이 돼요.`);
  }
  if (parts.length === 0) {
    parts.push('오행 차원의 직접적인 보완·자극은 약한 편이라, 합·충 같은 다른 결과 생활 리듬으로 관계가 결정되는 구조예요.');
  }
  return parts.join(' ');
}

export function composePregnancyAnalysis(
  mother: PersonalSajuGptInput,
  baby: PersonalSajuGptInput,
): PregnancyAnalysisBundle {
  // A = 엄마, B = 아이(예정일 기준)
  const dmRaw = analyzeDayMasterRelation({ personA: mother, personB: baby });
  const ecRaw = analyzeElementComplement({ personA: mother, personB: baby });
  const ugRaw = analyzeUsefulGodInteraction({ personA: mother, personB: baby });
  const ccRaw = analyzeCompatibilityCombinationConflict({ personA: mother, personB: baby });

  const momKo = stemElementKo(mother.birthChart.dayMaster);
  const babyKo = stemElementKo(baby.birthChart.dayMaster);

  const dayMasterRelation: PregnancyDayMasterRelation = {
    relation: dmRaw.relation,
    balance: dmRaw.balance,
    motherElementKo: momKo,
    babyElementKo: babyKo,
    plain: buildDayMasterPlain(dmRaw.relation, momKo, babyKo),
  };

  // 엄마에게 과한 오행을 아이 예정일 기운이 더 자극하는지: 엄마 excessive ∩ 아이 strongest
  const motherExcess = (mother.coreAnalysis.elementStrength.excessive ?? []) as Element[];
  const babyStrong = (baby.coreAnalysis.elementStrength.strongest ?? []) as Element[];
  const motherExcessAmplified = motherExcess.filter(e => babyStrong.includes(e));

  const ecBase = {
    motherNeedsFromBaby: ecRaw.aNeedsFromB,
    babyNeedsFromMother: ecRaw.bNeedsFromA,
    mutual: ecRaw.mutualComplement,
    motherExcessAmplified,
  };
  const elementComplement: PregnancyElementComplement = {
    ...ecBase,
    plain: buildComplementPlain(ecBase),
  };

  const usefulGodInteraction: PregnancyUsefulGodInteraction = {
    motherUsefulTouchedByBaby: ugRaw.aUsefulTouchedByB,
    babyUsefulTouchedByMother: ugRaw.bUsefulTouchedByA,
    motherUnfavorableTriggeredByBaby: ugRaw.aUnfavorableTriggeredByB,
    plain: relabel(ugRaw.interpretation),
  };

  const combinationConflicts: PregnancyCombinationConflicts = {
    combinations: ccRaw.combinations.map(relabel),
    conflicts: ccRaw.conflicts.map(relabel),
    punishments: ccRaw.punishments.map(relabel),
    destructions: ccRaw.destructions.map(relabel),
    harms: ccRaw.harms.map(relabel),
  };

  return {
    mother, baby,
    dayMasterRelation,
    elementComplement,
    usefulGodInteraction,
    combinationConflicts,
  };
}

/** 분석기 출력의 A/B 라벨을 엄마/아이로 치환 (evidence 표시용) */
function relabel(s: string): string {
  return s
    .replace(/\bA의\b/g, '엄마의')
    .replace(/\bB의\b/g, '아이의')
    .replace(/\bA가\b/g, '엄마가')
    .replace(/\bB가\b/g, '아이가')
    .replace(/(^|[^A-Za-z])A /g, '$1엄마 ')
    .replace(/(^|[^A-Za-z])B /g, '$1아이 ');
}
