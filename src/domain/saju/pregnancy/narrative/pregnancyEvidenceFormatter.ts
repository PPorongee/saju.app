// 임산부 모드 V4 — Evidence Formatter (Phase 3)
//
// 역할:
//   - PregnancyAnalysisBundle(엄마-아이 결정적 분석) + TaegyoPlan을 받아
//     7개 LLM 섹션별 ownership이 분리된 PregnancyMustUseFact 집합으로 변환.
//   - 각 fact는 EXACTLY ONE ownerSection (id prefix로 식별, getOwnerSectionOf와 정합).
//   - computedEvidence(분석 결과) 외 명리 요소 생성 금지.
//   - 결정적 섹션(motherBabyCard/babyNames/evidenceView)은 fact 미생성 (코드가 직접 조립).
//
// id prefix → ownerSection:
//   oc-   openingConnection
//   mech- motherChildMechanism
//   comf- motherComfortRhythm
//   baby- babyEnergyAndFit
//   tg-   taegyoGuide
//   fr-   motherFortuneRoutine
//   fam-  familySupportAndFinalMessage

import { ELEMENT_KO, type Element } from '../../rules/elements';
import type { PregnancyMustUseFact, PregnancyNarrativeSectionId, PregnancyNarrativeContext } from './pregnancyNarrativeTypes';
import type { PregnancyAnalysisBundle } from './pregnancyMomBabyAnalyzer';
import type { TaegyoPlan } from './pregnancyTaegyoMapper';

export interface FormattedPregnancyEvidence {
  facts: PregnancyMustUseFact[];
}

function joinNonEmpty(items: (string | undefined | null)[], sep = ', '): string {
  return items.filter((s): s is string => !!s && s.trim().length > 0).join(sep);
}

function elsKo(els: Element[]): string {
  return els.map(e => ELEMENT_KO[e]).join('·');
}

const STRENGTH_KO: Record<string, string> = {
  'very-strong': '매우 강한 편(신강)',
  'strong': '강한 편(신강)',
  'balanced': '균형 잡힌 편',
  'weak': '여린 편(신약)',
  'very-weak': '매우 여린 편(신약)',
};

/** 엄마 개운 루틴 — 용신 오행별 행동 시드 (물건구매식 금지, 행동 중심) */
const FORTUNE_ROUTINE_BY_ELEMENT: Record<Element, string[]> = {
  wood: ['초록·식물을 가까이 두기', '짧은 산책으로 하루 리듬 잡기', '하루를 가볍게 기록하기'],
  fire: ['자연광이 드는 시간 보내기', '따뜻한 대화로 기분 환기하기', '밝은 음악으로 마음 데우기'],
  earth: ['주변 공간을 가볍게 정리하기', '일정한 하루 루틴 만들기', '편안한 자리를 마련해 두기'],
  metal: ['물건을 조금 덜어내 단순하게', '깨끗한 환경 유지하기', '조용히 호흡을 고르는 시간'],
  water: ['잔잔한 음악·물소리 곁에 두기', '감정을 글로 흘려보내기', '충분히 쉬는 시간 확보하기'],
};

// ── openingConnection (oc-) — 어떤 별처럼 오는가 (첫인상/상징) ──
function buildOpeningFacts(b: PregnancyAnalysisBundle): PregnancyMustUseFact[] {
  return [
    {
      id: 'oc-connection',
      source: 'dayMasterRelation',
      ownerSection: 'openingConnection',
      fact: `엄마-아이 일간 결: ${b.dayMasterRelation.relation}`,
      plainMeaning: b.dayMasterRelation.plain,
      narrativeHint: '"이 아이가 엄마에게 어떤 별처럼 오는가"의 첫인상으로. 세부 명리 원인은 다음 섹션이므로 여기선 따뜻한 framing만. 반드시 "출생예정일 기준으로 보면" 톤.',
      matchTokens: ['예정일', '아이'],
      role: 'main',
    },
    {
      id: 'oc-brings',
      source: 'elementComplement',
      ownerSection: 'openingConnection',
      fact: `아이가 더해주는 결: ${elsKo(b.elementComplement.motherNeedsFromBaby) || '잔잔한 변화'}`,
      plainMeaning: b.elementComplement.plain,
      narrativeHint: '아이가 엄마 삶에 상징적으로 가져오는 의미를 부드럽게. 단정("반드시 이런 아이") 금지, 가능성 톤.',
      matchTokens: ['더해', '변화'],
      role: 'support',
    },
  ];
}

// ── motherChildMechanism (mech-) — 기운이 만나는 방식 (E2N 핵심) ──
function buildMechanismFacts(b: PregnancyAnalysisBundle): PregnancyMustUseFact[] {
  const cc = b.combinationConflicts;
  const combLabel = joinNonEmpty([
    cc.combinations.length ? `합 ${cc.combinations.length}` : '',
    cc.conflicts.length ? `충 ${cc.conflicts.length}` : '',
    cc.punishments.length ? `형 ${cc.punishments.length}` : '',
    cc.destructions.length ? `파 ${cc.destructions.length}` : '',
    cc.harms.length ? `해 ${cc.harms.length}` : '',
  ]);
  return [
    {
      id: 'mech-dayMaster',
      source: 'dayMasterRelation',
      ownerSection: 'motherChildMechanism',
      fact: `일간 관계: 엄마 ${b.dayMasterRelation.motherElementKo} ↔ 아이 ${b.dayMasterRelation.babyElementKo}`,
      plainMeaning: b.dayMasterRelation.plain,
      narrativeHint: '엄마와 아이의 "기본 기운이 만나는 방식"을 일상어로. 원인→결과→현실 장면→태교 조언 흐름. 한자/영문 오행 금지.',
      matchTokens: ['일간', '기운'],
      role: 'main',
    },
    {
      id: 'mech-elementComplement',
      source: 'elementComplement',
      ownerSection: 'motherChildMechanism',
      fact: `오행 보완: 엄마←아이 ${elsKo(b.elementComplement.motherNeedsFromBaby) || '-'} / 아이←엄마 ${elsKo(b.elementComplement.babyNeedsFromMother) || '-'}`,
      plainMeaning: b.elementComplement.plain,
      narrativeHint: '서로 부족한 결을 채우는지 / 과한 결을 더 자극하는지를 생활 장면으로. 일방성이 있으면 짚되 엄마 탓 금지.',
      matchTokens: ['보완', '채워'],
      role: b.elementComplement.motherExcessAmplified.length ? 'tension' : 'support',
    },
    {
      id: 'mech-usefulGod',
      source: 'usefulGodInteraction',
      ownerSection: 'motherChildMechanism',
      fact: `용신/기신 상호: ${b.usefulGodInteraction.plain}`,
      plainMeaning: '엄마에게 편한 기운을 아이 예정일 기운이 채우는지, 부담스러운 기운을 건드리는지의 결입니다.',
      narrativeHint: '용신/기신을 부적·방향 같은 미신으로 풀지 말고 "편한 기운/부담스러운 기운"을 정서·환경 결로.',
      matchTokens: ['용신', '기운'],
      role: 'support',
    },
    {
      id: 'mech-combinationConflicts',
      source: 'combinationConflicts',
      ownerSection: 'motherChildMechanism',
      fact: `합·충·형·파·해: ${combLabel || '두드러진 작용 적음'}`,
      plainMeaning: '두 사주가 만났을 때 끌어당기는 작용(합)과 흔들리는 작용(충·형·파·해)이 어느 정도인지의 결입니다.',
      narrativeHint: '합·충·형·파·해를 일일이 나열하지 말 것. "끌어당기는 결/조정이 필요한 결"의 균형으로 한 문장 정도만 흡수. 좋다/나쁘다 단정 금지.',
      matchTokens: ['합', '결'],
      role: 'tension',
    },
  ];
}

// ── motherComfortRhythm (comf-) — 엄마가 편안해지는 방식 (엄마 본인 사주) ──
function buildComfortFacts(b: PregnancyAnalysisBundle): PregnancyMustUseFact[] {
  const m = b.mother.coreAnalysis;
  const usefulKo = m.usefulGod.primaryUseful.type === 'element'
    ? ELEMENT_KO[m.usefulGod.primaryUseful.value as Element]
    : String(m.usefulGod.primaryUseful.value);
  const excess = (m.elementStrength.excessive ?? []) as Element[];
  return [
    {
      id: 'comf-strength',
      source: 'mother',
      ownerSection: 'motherComfortRhythm',
      fact: `엄마 신강/신약: ${STRENGTH_KO[m.dayMasterStrength.level] ?? m.dayMasterStrength.level}`,
      plainMeaning: m.dayMasterStrength.conclusion,
      narrativeHint: '신강/신약을 "혼자 끌어안기 쉬운지 / 기대도 되는지"의 마음 리듬으로. 의료 표현 금지.',
      matchTokens: ['편안', '리듬'],
      role: 'main',
      adviceHint: { actionable: '무리하기 쉬운 지점에서 미리 힘을 빼는 리듬 만들기' },
    },
    {
      id: 'comf-useful',
      source: 'mother',
      ownerSection: 'motherComfortRhythm',
      fact: `엄마에게 편안한 기운: ${usefulKo}`,
      plainMeaning: `${usefulKo} 기운이 도움이 되는 구조라, 그 결을 채우는 환경에서 마음이 안정되기 쉬워요.`,
      narrativeHint: '용신을 환경·정서 차원으로. "이런 환경/리듬에서 마음이 놓인다"로. 부적·물건 금지.',
      matchTokens: ['안정', '기운'],
      role: 'support',
    },
    {
      id: 'comf-overload',
      source: 'mother',
      ownerSection: 'motherComfortRhythm',
      fact: `무리하기 쉬운 결: ${excess.length ? elsKo(excess) + ' 과다' : '완벽주의·정보 과부하 경향'}`,
      plainMeaning: '임신 중 완벽주의·불안·정보 과부하로 혼자 다 감당하기 쉬운 지점입니다.',
      narrativeHint: '"완벽하게 하려다 지치기 쉽다 → 도움을 요청하는 게 약점이 아니다" 방향으로. 엄마 탓 금지.',
      matchTokens: ['도움', '완벽'],
      role: 'caution',
      adviceHint: { actionable: '필요할 때 구체적으로 도움 요청하기', avoidPattern: '혼자 다 감당하려는 습관' },
    },
  ];
}

// ── babyEnergyAndFit (baby-) — 아이 예정일 기운 + 닮은점/다른점 + 잘 맞는 지점 ──
function buildBabyFitFacts(b: PregnancyAnalysisBundle): PregnancyMustUseFact[] {
  const babyStrong = (b.baby.coreAnalysis.elementStrength.strongest ?? []) as Element[];
  const momKo = b.dayMasterRelation.motherElementKo;
  const babyDmKo = b.dayMasterRelation.babyElementKo; // 아이 중심 기운(일간)
  const same = momKo === babyDmKo;
  return [
    {
      id: 'baby-energy',
      source: 'baby',
      ownerSection: 'babyEnergyAndFit',
      // 일간(중심 기운)과 오행 분포(전체 분위기)를 구분해서 제공
      fact: `아이 중심 기운(일간): ${babyDmKo} / 예정일 전체 분위기(강한 오행): ${elsKo(babyStrong) || '균형 잡힌 편'}`,
      plainMeaning: '아이의 "중심 기운(일간)"과 "예정일 전체 분위기(오행 분포)"는 서로 다를 수 있어요. 출생예정일 기준으로 보면 이런 결이며, 실제 출생일·시간에 따라 달라질 수 있어요.',
      narrativeHint: '"중심 기운(일간)"과 "예정일 전체 분위기(오행 분포)"를 반드시 구분해서 쉬운 말로 풀 것 (예: 안쪽 흐름 vs 바깥 분위기). "예정일 기준으로 보면" 톤 유지, 성격 단정 절대 금지.',
      matchTokens: ['예정일', '중심', '분위기'],
      role: 'main',
    },
    {
      id: 'baby-similarity',
      source: 'baby',
      ownerSection: 'babyEnergyAndFit',
      // 일간 관계 plain(기준·틀 등 구조 설명)은 여기서 재서술하지 않음 — 닮음/다름만.
      fact: `엄마와 닮은/다른 결: 일간 ${same ? '같은' : '다른'} 기운 (엄마 ${momKo} · 아이 ${babyDmKo})`,
      plainMeaning: same
        ? '엄마와 아이의 중심 기운이 비슷해 통하는 부분이 많은 결이에요.'
        : '엄마와 아이의 중심 기운이 달라, 서로 부족한 부분을 채워주기 좋은 결이에요.',
      narrativeHint: '엄마와 닮은 점/다른 점만 따뜻하게. "누가 기준·틀을 준다"는 관계 구조 설명은 앞 섹션(어떤 별처럼 오는가)에 양보하고 여기서 반복하지 말 것. 다른 점은 "그래서 서로 채워준다" 방향.',
      matchTokens: ['닮', '다른'],
      role: 'support',
    },
    {
      id: 'baby-fit',
      source: 'elementComplement',
      ownerSection: 'babyEnergyAndFit',
      fact: `잘 맞는 지점: 엄마가 아이에게 주기 쉬운 안정 + 아이가 엄마에게 여는 변화`,
      plainMeaning: b.elementComplement.plain,
      narrativeHint: '엄마가 자연스럽게 줄 수 있는 안정감, 아이가 열어주는 변화를 구체 장면으로. 태교에서 살려주면 좋은 방향 한 줄. "기준과 틀" 같은 관계 구조 표현은 반복하지 말 것.',
      matchTokens: ['안정', '맞'],
      role: 'support',
    },
  ];
}

// ── taegyoGuide (tg-) — 태교 3축 + 조심할 패턴 ──
function buildTaegyoFacts(plan: TaegyoPlan): PregnancyMustUseFact[] {
  const facts: PregnancyMustUseFact[] = [];
  plan.axes.forEach((ax, i) => {
    facts.push({
      id: `tg-axis-${i}`,
      source: 'taegyo',
      ownerSection: 'taegyoGuide',
      fact: `태교 축 ${i + 1} (${ax.elementKo}): ${ax.activities.join(' / ')}`,
      plainMeaning: ax.focus,
      narrativeHint: '음식/영양/운동을 의학 조언처럼 쓰지 말 것. "산책"도 생활 리듬 차원으로만. 이 축이 왜 이 조합에 맞는지 근거와 함께.',
      matchTokens: [ax.elementKo, '태교'],
      role: 'support',
    });
  });
  facts.push({
    id: 'tg-cautions',
    source: 'taegyo',
    ownerSection: 'taegyoGuide',
    fact: `조심할 태교 패턴: ${plan.cautionSeeds[0]}`,
    plainMeaning: joinNonEmpty(plan.cautionSeeds, ' '),
    narrativeHint: '"이 태교는 아이에게 나쁘다" 금지. "많이 하기보다 엄마가 편안하게 지속할 수 있는지가 더 중요" 방향으로.',
    matchTokens: ['편안', '지속'],
    role: 'caution',
  });
  return facts;
}

// ── motherFortuneRoutine (fr-) — 엄마 개운 루틴 (행동 중심) ──
function buildFortuneRoutineFacts(b: PregnancyAnalysisBundle): PregnancyMustUseFact[] {
  const useful = b.mother.coreAnalysis.usefulGod.primaryUseful;
  const el: Element = useful.type === 'element' ? (useful.value as Element) : 'water';
  const routine = FORTUNE_ROUTINE_BY_ELEMENT[el] ?? FORTUNE_ROUTINE_BY_ELEMENT.water;
  return [
    {
      id: 'fr-routine',
      source: 'fortuneRoutine',
      ownerSection: 'motherFortuneRoutine',
      fact: `엄마 개운 방향(${ELEMENT_KO[el]} 기반): ${routine.join(' / ')}`,
      plainMeaning: `${ELEMENT_KO[el]} 기운이 도움이 되는 구조라, 그 결을 채우는 행동이 마음의 압력을 낮춰줘요.`,
      narrativeHint: '물건을 사면 운이 좋아진다는 식 금지. 색·공간·소리·기록·정리·도움 요청 같은 행동 중심으로. 엄마 자신을 위한 루틴.',
      matchTokens: ['개운', '루틴'],
      role: 'main',
    },
  ];
}

// ── familySupportAndFinalMessage (fam-) — 가족 부탁 + 마지막 한 문장 ──
function buildFamilyFacts(b: PregnancyAnalysisBundle): PregnancyMustUseFact[] {
  return [
    {
      id: 'fam-support',
      source: 'familySupport',
      ownerSection: 'familySupportAndFinalMessage',
      fact: `엄마에게 도움이 되는 방식: 구체적인 분담`,
      plainMeaning: '힘들다는 말을 바로 하기보다 괜찮다고 버티기 쉬운 구조라, 주변의 구체적인 도움이 더 도움이 됩니다.',
      narrativeHint: '가족이 함께 읽어도 좋은 톤. 피해야 할 말 / 도움되는 말 / 구체적 역할 분담을 예시로. "필요하면 말해"보다 "오늘은 내가 이걸 할게"처럼.',
      matchTokens: ['도움', '함께'],
      role: 'main',
      adviceHint: { actionable: '구체적인 도움을 먼저 제안하기', avoidPattern: '"필요하면 말해"처럼 떠넘기는 말' },
    },
    {
      id: 'fam-finalMessage',
      source: 'familySupport',
      ownerSection: 'familySupportAndFinalMessage',
      fact: `마지막 한 문장 시드: 아이가 엄마에게 가져오는 결(${b.dayMasterRelation.babyElementKo})`,
      plainMeaning: b.dayMasterRelation.plain,
      narrativeHint: '아이에게 전하는 감성적 마지막 한 문장. 별빛 사주 브랜드와 어울리게. 운명 단정 금지, 가능성·따뜻함 톤.',
      matchTokens: ['아이', '별'],
      role: 'support',
    },
  ];
}

export function formatPregnancyEvidence(
  bundle: PregnancyAnalysisBundle,
  taegyoPlan: TaegyoPlan,
  _ctx: PregnancyNarrativeContext,
): FormattedPregnancyEvidence {
  const facts: PregnancyMustUseFact[] = [
    ...buildOpeningFacts(bundle),
    ...buildMechanismFacts(bundle),
    ...buildComfortFacts(bundle),
    ...buildBabyFitFacts(bundle),
    ...buildTaegyoFacts(taegyoPlan),
    ...buildFortuneRoutineFacts(bundle),
    ...buildFamilyFacts(bundle),
  ];
  return { facts };
}

/** id prefix → ownerSection (중복 방지 검증용) */
export function getOwnerSectionOf(factId: string): PregnancyNarrativeSectionId | null {
  if (factId.startsWith('oc-'))   return 'openingConnection';
  if (factId.startsWith('mech-')) return 'motherChildMechanism';
  if (factId.startsWith('comf-')) return 'motherComfortRhythm';
  if (factId.startsWith('baby-')) return 'babyEnergyAndFit';
  if (factId.startsWith('tg-'))   return 'taegyoGuide';
  if (factId.startsWith('fr-'))   return 'motherFortuneRoutine';
  if (factId.startsWith('fam-'))  return 'familySupportAndFinalMessage';
  return null;
}
