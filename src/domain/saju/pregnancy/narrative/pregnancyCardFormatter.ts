// 임산부 모드 V4 — 결정적 카드 / 근거 조립 (Phase 6)
//
// 역할 (LLM 호출 없음):
//   - buildMotherBabyCard: 별빛 카드(title/snsPhrase/keywords/태교 방향 한 줄) — bundle + taegyoPlan에서.
//   - buildPregnancyEvidenceView: 명리 근거 접힘 데이터 — bundle에서.
//   - normalizePregnancyKeywords: 키워드 칩 정규화(짧게/문장형 제거/dedupe/3~5).
//   - 궁합은 archetype에서 카드를 뽑지만, 임산부는 archetype이 없으므로
//     엄마-아이 관계 결정값(일간 관계·오행 보완·태교 축)에서 deterministic하게 구성.

import { ELEMENT_KO, STEM_ELEMENT, type Element } from '../../rules/elements';
import type { HeavenlyStem } from '../../rules/heavenlyStems';
import type {
  MotherBabyCardSection, PregnancyEvidenceView, PregnancyNarrativeContext,
} from './pregnancyNarrativeTypes';
import type { PregnancyAnalysisBundle, PregnancyDayMasterRelation } from './pregnancyMomBabyAnalyzer';
import type { TaegyoPlan } from './pregnancyTaegyoMapper';

const STRENGTH_KO: Record<string, string> = {
  'very-strong': '매우 강한 편',
  'strong': '강한 편',
  'balanced': '균형 잡힌 편',
  'weak': '여린 편',
  'very-weak': '매우 여린 편',
};

// ── 카드 감성 문구 (아이 강한 오행 기준) ──
const CARD_TITLE_BY_ELEMENT: Record<Element, string> = {
  water: '조용히 깊어지는 물빛으로 이어지는 엄마와 아이',
  wood: '단단한 바탕 위에 새싹을 품는 엄마와 아이',
  fire: '햇살을 닮은 따뜻한 빛으로 만나는 엄마와 아이',
  earth: '포근한 땅처럼 안정되게 이어지는 엄마와 아이',
  metal: '맑고 단정한 결로 이어지는 엄마와 아이',
};
const CARD_SNS_BY_ELEMENT: Record<Element, string> = {
  water: '물빛 태교',
  wood: '새싹을 품는 엄마',
  fire: '햇살 태교',
  earth: '포근한 땅 태교',
  metal: '맑은 결 태교',
};

function relationKeyword(rel: PregnancyDayMasterRelation): string {
  switch (rel.relation) {
    case 'same-element': return '닮은 결';
    case 'a-generates-b': return '북돋움';
    case 'b-generates-a': return '생기';
    case 'a-controls-b': return '기준';
    case 'b-controls-a': return '새 리듬';
    default: return '잔잔한 연결';
  }
}

function babyDominantElement(bundle: PregnancyAnalysisBundle): Element {
  const strong = (bundle.baby.coreAnalysis.elementStrength.strongest ?? []) as Element[];
  return strong[0] ?? 'earth';
}

/** 키워드 정규화: 짧게(≤8자), 문장형/raw-fact 제거, dedupe, 3~5개 */
export function normalizePregnancyKeywords(raw: string[]): string[] {
  const cleaned: string[] = [];
  for (const k0 of raw) {
    let k = (k0 ?? '').trim();
    if (!k) continue;
    // 문장끝/특수문자 제거
    k = k.replace(/[.!?。…]+$/g, '').trim();
    // 너무 길거나 문장형이면 제외
    if (k.length > 8) continue;
    if (/(습니다|해요|이에요|예요|입니다|어요)$/.test(k)) continue;
    if (cleaned.includes(k)) continue;
    cleaned.push(k);
  }
  // 부족하면 폴백 풀로 보강 (중복 없이 머지 → 3~5개 보장)
  const fallback = ['연결', '보완', '안정', '태교', '리듬'];
  const merged: string[] = [];
  for (const k of [...cleaned, ...fallback]) {
    if (merged.length >= 5) break;
    if (!merged.includes(k)) merged.push(k);
  }
  return merged.slice(0, 5);
}

export function buildMotherBabyCard(
  bundle: PregnancyAnalysisBundle,
  taegyoPlan: TaegyoPlan,
): MotherBabyCardSection {
  const babyEl = babyDominantElement(bundle);
  const ec = bundle.elementComplement;

  // 키워드 후보 조립 → 정규화
  const rawKeywords: string[] = [
    relationKeyword(bundle.dayMasterRelation),
    ec.motherNeedsFromBaby.length ? '보완' : '',
    ec.motherExcessAmplified.length ? '조절' : '',
    ELEMENT_KO[babyEl] + ' 기운',
    '태교',
  ].filter(Boolean);
  const keywords = normalizePregnancyKeywords(rawKeywords);

  // 태교 방향 한 줄 (첫 축 기반)
  const ax0 = taegyoPlan.axes[0];
  const taegyoDirection = ax0
    ? `${ax0.elementKo} 기운을 살리는 ${ax0.activities[0] ?? '잔잔한 태교'}부터 부담 없이`
    : '엄마가 편안하게 이어갈 수 있는 태교부터';

  return {
    title: CARD_TITLE_BY_ELEMENT[babyEl],
    snsPhrase: CARD_SNS_BY_ELEMENT[babyEl],
    keywords,
    taegyoDirection,
  };
}

function elementDistributionKo(scores: Record<Element, number>): Record<string, number> {
  const out: Record<string, number> = {};
  (['wood', 'fire', 'earth', 'metal', 'water'] as Element[]).forEach(e => {
    out[ELEMENT_KO[e]] = Math.round((scores?.[e] ?? 0) * 10) / 10;
  });
  return out;
}

function favListKo(list: Array<Element | string>): string[] {
  return (list ?? []).map(v => {
    if (typeof v === 'string' && ['wood', 'fire', 'earth', 'metal', 'water'].includes(v)) {
      return ELEMENT_KO[v as Element];
    }
    return String(v);
  });
}

function stemElKo(dayMaster: string): string {
  const el = STEM_ELEMENT[dayMaster as HeavenlyStem];
  return el ? ELEMENT_KO[el] : '-';
}

export function buildPregnancyEvidenceView(
  bundle: PregnancyAnalysisBundle,
  taegyoPlan: TaegyoPlan,
  ctx: PregnancyNarrativeContext,
  babyNameElementsKo: string[],
): PregnancyEvidenceView {
  const m = bundle.mother.coreAnalysis;
  const b = bundle.baby.coreAnalysis;
  const useful = m.usefulGod.primaryUseful;
  const usefulKo = useful.type === 'element' ? ELEMENT_KO[useful.value as Element] : String(useful.value);

  return {
    mother: {
      dayMaster: bundle.mother.birthChart.dayMaster,
      dayMasterElementKo: stemElKo(bundle.mother.birthChart.dayMaster),
      strengthLevel: STRENGTH_KO[m.dayMasterStrength.level] ?? m.dayMasterStrength.level,
      usefulGodKo: usefulKo,
      favorableKo: favListKo(m.usefulGod.favorable),
      unfavorableKo: favListKo(m.usefulGod.unfavorable),
      elementDistributionKo: elementDistributionKo(m.elementStrength.scores),
    },
    baby: {
      dueDateLabel: ctx.dueDateLabel,
      hourKnown: ctx.babyHourKnown,
      dayMaster: bundle.baby.birthChart.dayMaster,
      dayMasterElementKo: stemElKo(bundle.baby.birthChart.dayMaster),
      elementDistributionKo: elementDistributionKo(b.elementStrength.scores),
      threeWeekBasis: !ctx.babyHourKnown,
    },
    connection: {
      dayMasterRelation: {
        relation: bundle.dayMasterRelation.relation,
        balance: bundle.dayMasterRelation.balance,
        plain: bundle.dayMasterRelation.plain,
      },
      elementComplement: {
        motherNeedsFromBaby: bundle.elementComplement.motherNeedsFromBaby.map(e => ELEMENT_KO[e]),
        babyNeedsFromMother: bundle.elementComplement.babyNeedsFromMother.map(e => ELEMENT_KO[e]),
        mutual: bundle.elementComplement.mutual,
      },
      usefulGodInteraction: { plain: bundle.usefulGodInteraction.plain },
      combinationConflicts: {
        combinations: bundle.combinationConflicts.combinations,
        conflicts: bundle.combinationConflicts.conflicts,
        punishments: bundle.combinationConflicts.punishments,
        destructions: bundle.combinationConflicts.destructions,
        harms: bundle.combinationConflicts.harms,
      },
    },
    recommendationBasis: {
      taegyoElements: taegyoPlan.elementsKo,
      babyNameElements: babyNameElementsKo,
    },
  };
}
