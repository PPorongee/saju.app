// 임산부 모드 V4 — Plan Builder (Phase 3)
//
// 역할:
//   - formatPregnancyEvidence의 fact 집합을 받아 LLM 섹션(7개)별 plan을 deterministic 빌드.
//   - 각 plan은 mustUseFacts(ownerSection === sectionId) + requiredBeats + avoidPatterns
//     + toneHints + styleExamples + maxTokens.
//   - 결정적 섹션(motherBabyCard/babyNames/evidenceView)은 plan 미생성.
//
// 안전(의료/출산 민감) align — 모든 plan 공통 금지 패턴 강제.

import type {
  PregnancyNarrativePlan, PregnancyNarrativePlanSet, PregnancyNarrativeContext,
  PregnancyMustUseFact, PregnancyNarrativeSectionId,
} from './pregnancyNarrativeTypes';
import {
  PREGNANCY_NARRATIVE_SECTION_TITLES, PREGNANCY_NARRATIVE_SECTION_MAX_TOKENS,
  PREGNANCY_NARRATIVE_LLM_SECTION_IDS,
} from './pregnancyNarrativeTypes';
import { formatPregnancyEvidence } from './pregnancyEvidenceFormatter';
import type { PregnancyAnalysisBundle } from './pregnancyMomBabyAnalyzer';
import type { TaegyoPlan } from './pregnancyTaegyoMapper';

const COMMON_TONE: string[] = [
  '친근한 존댓말. 반말 금지.',
  '명리 용어(일간·오행·용신·합충형파해)는 등장 즉시 일상어로 풀이.',
  '점수·등급·퍼센트로 평가하지 말 것.',
  '아이/아기에 대한 모든 해석은 "출생예정일 기준으로 보면" 톤 유지.',
];

// 의료/출산 안전 — 모든 섹션 공통 금지
const COMMON_AVOID_PATTERNS: string[] = [
  '의학·건강·분만·진료·약·영양제·치료 조언 (병원 판단을 대신하지 말 것)',
  '태아 건강 / 조산 / 유산 / 분만 위험 / 출산 난이도 예측',
  '성별 예측',
  '아이 성격·운명 단정 ("이 아이는 반드시 ~한 성격") — "예정일 기준으로 보면 이런 결" 만 허용',
  '출산일 결정/추천 / "이 날 낳으면 좋다·나쁘다" / "최고의 출산일" / 특정 날짜 출산 유도',
  '운명 / 반드시 / 무조건 / 100% / 확정 — 단정 표현',
  '엄마 탓으로 들리는 표현 ("엄마가 이래서 아이에게 안 좋다")',
  'wood / fire / earth / metal / water 영문 오행 키 (반드시 한글)',
  '계산되지 않은 명리 요소·신살을 지어내기 / 태명을 새로 창작',
  '점수 / 등급 / 궁합 몇 점 / 상위 몇 %',
];

function factsFor(all: PregnancyMustUseFact[], sectionId: PregnancyNarrativeSectionId): PregnancyMustUseFact[] {
  return all.filter(f => f.ownerSection === sectionId);
}

function buildOpeningPlan(facts: PregnancyMustUseFact[]): PregnancyNarrativePlan {
  return {
    sectionId: 'openingConnection',
    title: PREGNANCY_NARRATIVE_SECTION_TITLES.openingConnection,
    sectionGoal: '이 아이가 엄마에게 어떤 별처럼 오는지, 전체 관계의 첫인상을 따뜻하게 잡아준다.',
    mustUseFacts: factsFor(facts, 'openingConnection'),
    requiredBeats: [
      '관계의 첫인상을 한 문장으로 (oneLine).',
      '두 사람이 만나는 분위기를 "감성적 첫인상"으로만 — 누가 기준·틀을 준다는 구조 설명은 다음 섹션에 양보.',
      '아이가 엄마에게 상징적으로 가져오는 의미 (가능성 톤).',
      '반드시 "출생예정일 기준으로 보면" 표현을 자연스럽게 포함.',
    ],
    avoidRepeating: ['전생의 인연', '아기가 엄마를 선택했다', '천생연분', '기준과 틀을 주기 쉬운 결'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [...COMMON_TONE, '카드 다음에 오는 도입부 톤. 너무 길지 않게.'],
    styleExamples: {
      badExample: '이 아기는 전생부터 엄마를 선택해서 온 천생의 인연입니다.',
      goodExample:
        '출생예정일 기준으로 보면, 이 아이는 엄마의 차분한 결 위에 잔잔한 변화를 더해주는 작은 별처럼 다가오는 흐름이에요. ' +
        '아직 확정된 것은 아니지만, 지금의 기운만 보아도 두 사람이 서로의 속도를 부드럽게 맞춰가기 좋은 결이 느껴집니다.',
      transformationRule: '운명·전생 단정 대신 "예정일 기준 + 가능성 + 따뜻한 상징"의 framing.',
    },
    maxTokens: PREGNANCY_NARRATIVE_SECTION_MAX_TOKENS.openingConnection,
    repairHints: ['oneLine 1문장 + 예정일 기준 표현 포함.', '운명/전생/선택 단정 0건.'],
  };
}

function buildMechanismPlan(facts: PregnancyMustUseFact[]): PregnancyNarrativePlan {
  return {
    sectionId: 'motherChildMechanism',
    title: PREGNANCY_NARRATIVE_SECTION_TITLES.motherChildMechanism,
    sectionGoal: '엄마와 아이의 일간·오행·용신/기신·합충이 어떻게 만나는지 원인→결과→현실 장면→태교 조언 흐름으로 설명한다.',
    mustUseFacts: factsFor(facts, 'motherChildMechanism'),
    requiredBeats: [
      '엄마와 아이 일간이 만나는 기본 결 (누가 더 주고 받는지).',
      '오행 보완 — 서로 채우는지 / 과한 결을 더 자극하는지.',
      '용신/기신 — 엄마에게 편한 기운인지 부담스러운 기운인지.',
      '합·충·형·파·해는 나열 금지, "끌어당기는 결 / 조정이 필요한 결" 균형으로 한 문장.',
      '각 근거 끝에 "그래서 태교에서는 이렇게" 한 줄씩 자연스럽게 연결.',
    ],
    avoidRepeating: ['궁합 점수', '상극이라 나쁘다', '상생이라 좋다'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      '명리 구조 → 쉬운 뜻 → 엄마-아이 사이 방식 → 태교 조언 순.',
      '합/충은 좋다/나쁘다 단정 금지. 연결·조정 톤.',
    ],
    styleExamples: {
      badExample: '엄마와 아기는 일간이 상극이라 기운이 부딪혀서 안 좋습니다.',
      goodExample:
        '엄마의 기운은 아이에게 안정된 바탕을 내어주기 쉬운 결이고, 아이 예정일 기운은 거기에 잔잔한 생기를 더해주는 흐름이에요. ' +
        '엄마에게 옅기 쉬운 결을 아이 쪽 기운이 부드럽게 채워주는 자리도 보여서, 태교에서는 그 결을 억지로 끌어올리기보다 편안하게 곁에 두는 정도가 잘 맞습니다.',
      transformationRule: '명리 근거 → 쉬운 뜻 → 엄마-아이 방식 → 태교 조언. 합충 나열·상생상극 단정 금지.',
    },
    maxTokens: PREGNANCY_NARRATIVE_SECTION_MAX_TOKENS.motherChildMechanism,
    repairHints: ['일간·오행·용신·합충 결이 본문에 모두 한 번씩.', '영문 오행 키 0건.', '상생/상극 단정 0건.'],
  };
}

function buildComfortPlan(facts: PregnancyMustUseFact[]): PregnancyNarrativePlan {
  return {
    sectionId: 'motherComfortRhythm',
    title: PREGNANCY_NARRATIVE_SECTION_TITLES.motherComfortRhythm,
    sectionGoal: '엄마가 임신 기간에 마음이 편안해지는 방식(신강신약·용신·감정 리듬·도움 요청)을 짚는다. 의료 조언 금지.',
    mustUseFacts: factsFor(facts, 'motherComfortRhythm'),
    requiredBeats: [
      '엄마가 혼자 끌어안기 쉬운지 / 기대도 되는지의 마음 리듬.',
      '어떤 환경·결에서 마음이 안정되는지 (용신 기반, 환경·정서 차원).',
      '무리하기 쉬운 패턴(완벽주의·불안·정보 과부하)을 부드럽게.',
      '도움을 요청하는 것이 약점이 아니라는 방향.',
    ],
    avoidRepeating: ['건강 관리', '몸조리', '영양 섭취'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [...COMMON_TONE, '철저히 정서·마음 리듬 차원. 음식/운동/건강 조언 금지. 엄마 탓 금지.'],
    styleExamples: {
      badExample: '엄마는 몸이 약하니 영양제를 챙겨 먹고 무리한 운동은 피하세요.',
      goodExample:
        '엄마는 웬만하면 괜찮다고 말하며 혼자 끌어안기 쉬운 결이라, 마음의 짐이 조용히 쌓이기 쉬워요. ' +
        '조용한 환경에서 마음을 가라앉히는 시간을 의식적으로 만들고, 버겁다 싶을 때 "이건 도와줘"라고 먼저 꺼내는 연습이 이 시기에는 큰 힘이 됩니다.',
      transformationRule: '건강/영양/운동 조언 → 정서·마음 리듬·도움 요청으로 전환.',
    },
    maxTokens: PREGNANCY_NARRATIVE_SECTION_MAX_TOKENS.motherComfortRhythm,
    repairHints: ['의료/건강/영양/운동 표현 0건.', '도움 요청 방향 포함.'],
  };
}

function buildBabyFitPlan(facts: PregnancyMustUseFact[], ctx: PregnancyNarrativeContext): PregnancyNarrativePlan {
  const beats = [
    '아이의 "중심 기운(일간)"과 "예정일 전체 분위기(오행 분포)"를 구분해서 쉬운 말로 풀 것 (예: 안쪽 흐름 vs 바깥 분위기). 둘이 다를 수 있음을 친절히 설명.',
    '실제 출생일·시간에 따라 달라질 수 있음을 한 번 명시.',
    '엄마와 닮은 점 / 다른 점 (다른 점은 "서로 채워준다" 방향). 단 "누가 기준·틀을 준다"는 관계 구조 재서술 금지 — 그건 앞 섹션 몫.',
    '둘 사이의 잘 맞는 지점 + 태교에서 살려주면 좋은 방향 한 줄.',
  ];
  if (ctx.babyHourKnown) {
    beats.push('예정시간이 입력된 경우이므로, "예정시간까지 함께 보면 이 기운의 결이 조금 더 선명하게 읽히지만, 실제 출생일과 시간에 따라 달라질 수 있어 참고 흐름으로 본다"는 취지의 보수적 문장을 딱 한 번 자연스럽게 넣을 것. 시간으로 성격·운명을 단정하거나 "이 시간이 더 좋다"고 말하지 말 것.');
  } else {
    beats.push('예정시간이 입력되지 않았으므로 "예정시간 기준" 같은 시간 관련 표현은 쓰지 말 것 (출생예정일 기준으로만 서술).');
  }
  return {
    sectionId: 'babyEnergyAndFit',
    title: PREGNANCY_NARRATIVE_SECTION_TITLES.babyEnergyAndFit,
    sectionGoal: '아이의 중심 기운(일간)과 예정일 전체 분위기(오행 분포)를 구분해 보여주고, 엄마와의 닮은점/다른점·잘 맞는 지점을 짚는다. 성격 단정 금지.',
    mustUseFacts: factsFor(facts, 'babyEnergyAndFit'),
    requiredBeats: beats,
    avoidRepeating: ['이 아이는 반드시', '아이의 성격은', '커서 ~가 된다', '기준과 틀을 주기 쉬운 결'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      '"이 아이는 이런 성격" 단정 절대 금지. "예정일 기준으로 보면 이런 결" 톤.',
      '중심 기운(일간)과 전체 분위기(오행 분포)를 구분해 설명 — 같은 문단에 섞어 혼동 주지 말 것.',
    ],
    styleExamples: {
      badExample: '이 아이는 고집이 세고 리더십이 강한 성격으로 자랍니다. 이 시간에 태어나면 더 좋습니다.',
      goodExample:
        '아이의 중심 기운은 수로 읽히지만, 예정일 전체의 분위기에서는 화와 금의 결도 함께 드러납니다. 쉽게 말해 안쪽에는 섬세하게 받아들이는 흐름이 있고, 바깥 분위기에는 밝은 자극과 정리된 감각이 섞인 구조로 볼 수 있어요. ' +
        '물론 실제 출생일과 시간에 따라 달라질 수 있어요. 엄마와는 중심 기운이 달라 보이는데, 그래서 오히려 서로의 부족한 부분을 채워주기 좋은 조합이라, 태교에서는 아이의 결을 눌러두기보다 안전하게 펼칠 자리를 만들어주는 방향이 잘 맞아요.',
      transformationRule: '성격 단정 → 중심기운(일간)/전체분위기(분포) 구분 + 변동 가능성 + 태교 방향. (예정시간 입력 시에만 보수적 참고 문장 1회.)',
    },
    maxTokens: PREGNANCY_NARRATIVE_SECTION_MAX_TOKENS.babyEnergyAndFit,
    repairHints: [
      '중심 기운(일간)과 전체 분위기(분포) 구분 포함.',
      '"예정일 기준" + 변동 가능성 명시.',
      '아이 성격 단정 0건.',
      ctx.babyHourKnown ? '예정시간 참고 문장 1회 (보수적, 단정 금지).' : '예정시간 관련 표현 0건.',
    ],
  };
}

function buildTaegyoPlan(facts: PregnancyMustUseFact[]): PregnancyNarrativePlan {
  return {
    sectionId: 'taegyoGuide',
    title: PREGNANCY_NARRATIVE_SECTION_TITLES.taegyoGuide,
    sectionGoal: '조심할 태교 패턴과 이 조합에 맞는 태교 3가지(엄마 용신 / 아이 기운 / 보완 3축)를 제시한다.',
    mustUseFacts: factsFor(facts, 'taegyoGuide'),
    requiredBeats: [
      '조심할 태교 패턴 — "많이 하기보다 엄마가 편안하게 지속할 수 있는지가 더 중요".',
      '이 조합에 맞는 태교 3가지를 각각 명리 근거(어떤 결을 살리는지)와 함께.',
      '음식/영양/운동을 처방처럼 쓰지 말 것 ("산책"도 생활 리듬 차원).',
    ],
    avoidRepeating: ['태교 음식', '영양', '태교에 좋은 운동'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [...COMMON_TONE, '"이 태교는 아이에게 나쁘다" 금지. 3가지는 결정적 시드(축)를 그대로 살려 근거와 함께.'],
    styleExamples: {
      badExample: '태교에는 견과류와 단백질이 좋고, 매일 30분 이상 걷기 운동을 하세요.',
      goodExample:
        '이 조합에서는 태교를 많이 채우기보다, 엄마가 편안하게 이어갈 수 있는지가 더 중요해요. ' +
        '엄마에게 도움이 되는 결을 살리는 잔잔한 음악과 짧은 기록, 아이 예정일 기운과 어울리는 자연광 시간, 그리고 두 사람 사이를 부드럽게 잇는 조용한 대화 — 이 세 가지를 부담 없이 곁에 두는 정도가 잘 맞습니다.',
      transformationRule: '음식/운동 처방 → 정서·환경·리듬 중심 태교 3축을 근거와 함께.',
    },
    maxTokens: PREGNANCY_NARRATIVE_SECTION_MAX_TOKENS.taegyoGuide,
    repairHints: ['태교 3가지 각각 명리 근거 포함.', '음식/영양/운동 처방 0건.'],
  };
}

function buildFortuneRoutinePlan(facts: PregnancyMustUseFact[]): PregnancyNarrativePlan {
  return {
    sectionId: 'motherFortuneRoutine',
    title: PREGNANCY_NARRATIVE_SECTION_TITLES.motherFortuneRoutine,
    sectionGoal: '엄마 용신/희신 기반의 개운 루틴을 행동 중심(색·공간·소리·기록·정리·도움)으로 제시한다.',
    mustUseFacts: factsFor(facts, 'motherFortuneRoutine'),
    requiredBeats: [
      '엄마에게 도움이 되는 기운을 채우는 "행동" 중심 루틴.',
      '마음의 압력을 낮춰주는 방향 (조용한 음악·기록·정리·휴식 등).',
      '물건을 사면 운이 좋아진다는 식 금지.',
    ],
    avoidRepeating: ['행운의 아이템', '부적', '이걸 사면 운이 좋아진다'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [...COMMON_TONE, '물건 구매·부적 금지. 엄마 자신을 위한 행동 루틴.'],
    styleExamples: {
      badExample: '엄마에게는 노란색 지갑과 황수정 팔찌가 행운을 가져다줍니다.',
      goodExample:
        '엄마에게는 마음을 가라앉히는 결이 도움이 되는 구조라, 잔잔한 음악을 곁에 두고 하루의 감정을 짧게 적어 흘려보내는 시간이 개운 방향이 돼요. ' +
        '무언가를 더 사들이기보다, 주변을 조금 비우고 조용한 자리를 만드는 행동이 마음의 압력을 낮춰줍니다.',
      transformationRule: '행운 아이템·부적 → 색/공간/소리/기록/정리/도움의 행동 루틴.',
    },
    maxTokens: PREGNANCY_NARRATIVE_SECTION_MAX_TOKENS.motherFortuneRoutine,
    repairHints: ['물건구매/부적 표현 0건.', '행동 중심 루틴 포함.'],
  };
}

function buildFamilyPlan(facts: PregnancyMustUseFact[]): PregnancyNarrativePlan {
  return {
    sectionId: 'familySupportAndFinalMessage',
    title: PREGNANCY_NARRATIVE_SECTION_TITLES.familySupportAndFinalMessage,
    sectionGoal: '가족·배우자가 함께 읽어도 좋은 도움 방식과, 아이에게 전하는 마지막 한 문장으로 마무리한다.',
    mustUseFacts: factsFor(facts, 'familySupportAndFinalMessage'),
    requiredBeats: [
      '엄마에게 필요한 도움 방식 (구체적 분담).',
      '피해야 할 말 / 도움이 되는 말 예시.',
      '아이에게 전하는 따뜻한 마지막 한 문장 (finalMessage 필드).',
    ],
    avoidRepeating: ['남편이 도와주세요', '가족이 사랑으로'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [...COMMON_TONE, '가족이 함께 읽는 톤. 마지막 문장은 공유하고 싶을 만큼 감성적으로, 단 운명 단정 금지.'],
    styleExamples: {
      badExample: '가족들이 사랑으로 도와주면 다 잘 됩니다. 이 아이는 효자가 될 운명입니다.',
      goodExample:
        '엄마는 힘들다는 말을 바로 꺼내기보다 괜찮다고 버티기 쉬운 결이라, 주변에서는 "필요하면 말해"보다 "오늘은 내가 이걸 할게"처럼 구체적인 도움을 먼저 건네는 편이 좋아요. ' +
        '(finalMessage) 너는 엄마에게, 조금 더 천천히 가도 괜찮다는 걸 알려주러 오는 작은 별일지도 몰라요.',
      transformationRule: '추상적 응원·운명 단정 → 구체적 분담 + 따뜻한(단정 아닌) 마지막 한 문장.',
    },
    maxTokens: PREGNANCY_NARRATIVE_SECTION_MAX_TOKENS.familySupportAndFinalMessage,
    repairHints: ['구체적 도움 예시 포함.', 'finalMessage 필드 채움.', '아이 운명 단정 0건.'],
  };
}

type PlanBuilder = (facts: PregnancyMustUseFact[], ctx: PregnancyNarrativeContext) => PregnancyNarrativePlan;

const LLM_PLAN_BUILDERS: Partial<Record<PregnancyNarrativeSectionId, PlanBuilder>> = {
  openingConnection: buildOpeningPlan,
  motherChildMechanism: buildMechanismPlan,
  motherComfortRhythm: buildComfortPlan,
  babyEnergyAndFit: buildBabyFitPlan,
  taegyoGuide: buildTaegyoPlan,
  motherFortuneRoutine: buildFortuneRoutinePlan,
  familySupportAndFinalMessage: buildFamilyPlan,
};

export function buildPregnancyNarrativePlans(
  bundle: PregnancyAnalysisBundle,
  taegyoPlan: TaegyoPlan,
  ctx: PregnancyNarrativeContext,
): PregnancyNarrativePlanSet {
  const { facts } = formatPregnancyEvidence(bundle, taegyoPlan, ctx);
  return PREGNANCY_NARRATIVE_LLM_SECTION_IDS.map(sectionId => {
    const builder = LLM_PLAN_BUILDERS[sectionId];
    return builder!(facts, ctx);
  });
}
