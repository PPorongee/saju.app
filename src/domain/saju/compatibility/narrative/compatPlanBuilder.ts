// 궁합 narrative V4 — Plan Builder (Phase 2)
//
// 역할:
//   - formatCompatEvidence(Phase 2-1)의 fact 집합을 받아
//     LLM 섹션(6개)별 CompatNarrativePlan을 deterministic하게 빌드.
//   - 각 plan은 mustUseFacts + requiredBeats + avoidPatterns + toneHints + styleExamples + maxTokens 포함.
//   - 결정적 섹션(compatibilityCard/evidenceView)은 plan을 만들지 않는다.
//
// 중복 방지:
//   - formatCompatEvidence가 fact owner를 미리 정해두므로,
//     각 plan은 ownerSection === sectionId인 fact만 사용.
//   - 본 파일에서 fact를 새로 만들어 다른 섹션에 끼지 않음.
//
// 관계유형 차별화:
//   - requiredBeats + toneHints가 ctx.relationshipType(=focus.primaryConcerns/toneHint)에 따라 달라짐.
//   - 10문항 관심사는 별도 Q&A가 아니라 이 beats로 흡수.
//
// 정합:
//   - bundle 계산 결과 그대로 사용. computedEvidence 외 명리 요소 X.
//   - styleExamples는 구조만 (특정 일간/오행/사주값 hardcode 금지).

import type { CompatibilityAnalysisBundle } from '../compatibilityTypes';
import type {
  CompatNarrativePlan, CompatNarrativePlanSet, CompatNarrativeContext,
  CompatMustUseFact, CompatNarrativeSectionId,
} from './compatNarrativeTypes';
import {
  COMPAT_NARRATIVE_SECTION_TITLES, COMPAT_NARRATIVE_SECTION_MAX_TOKENS,
  COMPAT_NARRATIVE_LLM_SECTION_IDS,
} from './compatNarrativeTypes';
import { formatCompatEvidence } from './compatEvidenceFormatter';

// ============================================================
// 공통 — 톤/금지 패턴 기본값 (safety 규칙 align)
// ============================================================
const COMMON_TONE: string[] = [
  '친근한 존댓말. 반말 금지.',
  '명리 용어(일간·십성·용신·합충형파해)는 등장 즉시 일상어로 풀이.',
  '점수·등급·퍼센트로 관계를 평가하지 말 것.',
];

const COMMON_AVOID_PATTERNS: string[] = [
  '점수 / 등급 / 몇 점 / 궁합 퍼센트',
  '운명 / 천생연분 / 반드시 / 무조건 / 100% — 단정 표현',
  '상대가 너를 좋아한다 / 상대 마음을 단정 (mind-reading)',
  '반드시 헤어진다 / 반드시 결혼한다 / 반드시 재회한다 — 단정 미래',
  '일반론("서로 노력하면 잘 됩니다") · 누구에게나 맞는 추상 조언',
  'wood / fire / earth / metal / water 영문 오행 키 (반드시 한글)',
];

// ============================================================
// 관계유형별 beat 차별화 — focus.primaryConcerns를 beat로 흡수
//   섹션마다 유형 관심사가 다르게 반영되도록 prefix를 붙여 차별화.
// ============================================================
function concernBeats(ctx: CompatNarrativeContext, prefix: string): string[] {
  return ctx.focus.primaryConcerns.map(c => `${prefix} 관점에서 "${c}"를 자연스럽게 다룬다.`);
}

function typeToneHints(ctx: CompatNarrativeContext): string[] {
  return [
    `관계 유형 = ${ctx.relationshipTypeKo}. 이 유형의 톤: ${ctx.focus.toneHint}.`,
  ];
}

// 섹션별 owner fact 추출
function factsFor(
  all: CompatMustUseFact[],
  sectionId: CompatNarrativeSectionId,
): CompatMustUseFact[] {
  return all.filter(f => f.ownerSection === sectionId);
}

// ============================================================
// 섹션 1 — relationshipOverview
// ============================================================
function buildOverviewPlan(facts: CompatMustUseFact[], ctx: CompatNarrativeContext): CompatNarrativePlan {
  return {
    sectionId: 'relationshipOverview',
    title: COMPAT_NARRATIVE_SECTION_TITLES.relationshipOverview,
    sectionGoal: '두 사람 관계의 핵심 분위기와 첫인상 케미를 한 문장 + 짧은 본문으로 잡아준다.',
    mustUseFacts: factsFor(facts, 'relationshipOverview'),
    requiredBeats: [
      '관계를 한 문장으로 요약 (oneLine).',
      '밝은 면과 그늘진 면을 균형 있게 한 단락.',
      '처음 가까워질 때의 케미(속도·결)를 한 문장.',
      `${ctx.relationshipTypeKo} 관점에서 첫인상이 어떻게 다르게 읽히는지 가볍게.`,
      '세부 명리 원인은 다음 섹션으로 넘기고 여기선 framing만.',
    ],
    avoidRepeating: ['천생연분', '최고의 궁합', '운명적인 만남'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [...COMMON_TONE, ...typeToneHints(ctx), '너무 길지 않게. 카드 다음에 오는 도입부 톤.'],
    styleExamples: {
      badExample: '두 분은 천생연분이고 궁합 점수가 매우 높습니다.',
      goodExample:
        '두 사람은 처음에는 결이 비슷해 빠르게 편해지지만, 가까워질수록 같은 지점에서 서로 다른 기대가 드러나는 사이에 가깝습니다. ' +
        '잘 맞을 때는 서로의 부족한 부분을 자연스럽게 채워주지만, 어긋날 때는 바로 그 지점에서 답답함이 생기기 쉽습니다.',
      transformationRule: '점수·운명 단정 대신 "분위기 + 밝은 면/그늘진 면 + 첫인상 결"의 framing.',
    },
    topicTargets: ctx.focus.primaryConcerns.slice(0, 2),
    maxTokens: COMPAT_NARRATIVE_SECTION_MAX_TOKENS.relationshipOverview,
    repairHints: ['oneLine 1문장 + 밝은면/그늘진면 + 첫인상 케미 구조 유지.', '특정 일간/오행 하드코딩 금지.'],
  };
}

// ============================================================
// 섹션 2 — relationshipMechanism (E2N 핵심 장)
// ============================================================
function buildMechanismPlan(facts: CompatMustUseFact[], ctx: CompatNarrativeContext): CompatNarrativePlan {
  return {
    sectionId: 'relationshipMechanism',
    title: COMPAT_NARRATIVE_SECTION_TITLES.relationshipMechanism,
    sectionGoal: '일간·오행·십성·용신/기신·일지·합충형파해가 이 관계의 느낌을 어떻게 만드는지 한 흐름으로 설명한다.',
    mustUseFacts: factsFor(facts, 'relationshipMechanism'),
    requiredBeats: [
      '★ 핵심 용어 최소 2개(일지·용신·십성·일간 중)는 그 용어를 한 번 그대로 드러내고 바로 쉬운 말로 푼다. 용어를 100% 일상어로 지우지 말 것 — 사주 근거가 보여야 한다.',
      '두 사람 일간이 만나는 기본 결 (누가 더 주고 받는지) 한 단락.',
      '오행 보완 — 서로 채우는지 한쪽으로 기우는지.',
      '십성 작용 — 상대가 나에게 어떤 역할로 느껴지는지 (그 십성 이름을 한 번 드러내고 즉시 풀이).',
      '용신/기신 상호 자극 — "용신/기신"이라는 말과 함께, 편한 기운인지 부담스러운 기운인지.',
      '일지(가장 가까운 자리)에서 어떻게 맞물리는지 — "일지"라는 말을 한 번 드러내고.',
      '합·충·형·파·해는 나열 금지, "끌어당기는 결 / 흔들리는 결" 균형으로 한 문장.',
      '마지막 1문장은 "그래서 이 관계는 ..." 톤으로 다음 섹션 연결.',
    ],
    avoidRepeating: ['궁합이 좋다', '궁합이 나쁘다', '용신이 안 맞아서 안 됩니다'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      ...typeToneHints(ctx),
      '합/충은 좋다/나쁘다 단정 금지. 연결·흔들림·조정 톤.',
      '명리 구조 → 쉬운 뜻 → 두 사람 사이 방식 순으로.',
    ],
    styleExamples: {
      // 나쁜 예: 용어를 단정에 쓴 경우(궁합이 나쁘다). 용어를 쓰는 것 자체는 좋다.
      badExample: '두 사람은 일지에 충이 있어서 궁합이 나쁩니다.',
      // 좋은 예: 핵심 용어(일간·일지·용신)를 한 번씩 그대로 드러내고 바로 쉬운 말로 풀이 + 단정 없음.
      //   ※ 아래 토/수 같은 구체값은 복사 금지(구조만 참고). 현재 두 사람의 실제 fact 값으로 채울 것.
      goodExample:
        '두 사람의 일간(타고난 기본 기운)이 만나는 결을 보면 한쪽이 조금 더 끌고 가는 흐름이에요. ' +
        '특히 가장 가까운 자리(일지)에서는 서로 강하게 끌어당기면서도 생활 리듬이 흔들리는 결이 함께 있어서, 가까워질수록 같은 자리에서 끌림과 부딪힘이 같이 올라옵니다. ' +
        '게다가 상대의 기운이 내 용신(곁에 있으면 한결 편해지는 기운)에 가까워, 가까이 있을수록 마음이 풀리는 느낌이 들 수 있어요. ' +
        '그래서 이 관계는 거리를 잘 조절할수록 편해지는 구조입니다.',
      transformationRule: '핵심 용어(일간·일지·용신 등)를 한 번 그대로 드러낸 뒤 바로 쉬운 뜻으로 풀고 → 두 사람 사이의 방식으로. 용어를 완전히 지우지 말 것. 합충 나열·단정 금지.',
    },
    maxTokens: COMPAT_NARRATIVE_SECTION_MAX_TOKENS.relationshipMechanism,
    repairHints: [
      '일간·오행·십성·용신/기신·일지 결이 본문에 모두 한 번씩.',
      '합·충·형·파·해 단순 나열 0건.',
      '영문 오행 키 0건.',
    ],
  };
}

// ============================================================
// 섹션 3 — attractionAndFriction
// ============================================================
function buildAttractionFrictionPlan(facts: CompatMustUseFact[], ctx: CompatNarrativeContext): CompatNarrativePlan {
  return {
    sectionId: 'attractionAndFriction',
    title: COMPAT_NARRATIVE_SECTION_TITLES.attractionAndFriction,
    sectionGoal: '서로에게 끌리는 지점과 부담을 느끼는 지점이 같은 뿌리에서 나온다는 것을 보여준다.',
    mustUseFacts: factsFor(facts, 'attractionAndFriction'),
    requiredBeats: [
      '서로를 알아본 끌림 지점을 구체 장면으로.',
      '바로 그 지점이 어떻게 부담/마찰로 바뀌는지 (같은 뿌리).',
      '상대 마음을 단정하지 않고 "이런 반응이 생기기 쉽다" 톤.',
      ...concernBeats(ctx, '끌림/부딪힘'),
    ],
    avoidRepeating: ['서로 다르기 때문에', '성격 차이 때문에'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      ...typeToneHints(ctx),
      '"끌림 = 부담의 뿌리"라는 한 구조로 묶을 것. 둘을 따로 나열만 하면 안 됨.',
    ],
    styleExamples: {
      badExample: '서로 성격이 달라서 끌리고, 또 성격이 달라서 부딪힙니다.',
      goodExample:
        '처음에는 망설임 없이 밀고 나가는 모습에 끌리지만, 가까워지면 바로 그 단호함이 "내 속도는 무시당한다"는 느낌으로 바뀌기 쉽습니다. ' +
        '끌렸던 특성과 부담스러운 특성이 사실 같은 자리에서 나오기 때문에, 그 특성을 없애려 하기보다 언제 켜고 끌지를 함께 정하는 편이 낫습니다.',
      transformationRule: '끌림과 부담을 같은 뿌리로 묶기. 끌림 따로/부담 따로 나열 금지.',
    },
    topicTargets: ctx.focus.primaryConcerns,
    maxTokens: COMPAT_NARRATIVE_SECTION_MAX_TOKENS.attractionAndFriction,
    repairHints: ['끌림과 부담이 같은 뿌리임을 명시.', '상대 마음 단정 0건.'],
  };
}

// ============================================================
// 섹션 4 — repeatedPattern (유형별)
// ============================================================
function buildRepeatedPatternPlan(facts: CompatMustUseFact[], ctx: CompatNarrativeContext): CompatNarrativePlan {
  return {
    sectionId: 'repeatedPattern',
    title: COMPAT_NARRATIVE_SECTION_TITLES.repeatedPattern,
    sectionGoal: '현실에서 반복되기 쉬운 관계 패턴(갈등→회복→안정)을 관계유형 관점으로 구체화한다.',
    mustUseFacts: factsFor(facts, 'repeatedPattern'),
    requiredBeats: [
      '한 번 부딪히면 어떤 순서로 흘러가는지 반복 장면.',
      '갈등 뒤 회복 방식 — 서로가 필요로 하는 것이 다름.',
      '오래 함께할 때 편한 지점과 피로해지는 지점.',
      ...concernBeats(ctx, '반복 패턴'),
      '단정 미래("반드시 깨진다") 금지, "이런 흐름이 반복되기 쉽다" 톤.',
    ],
    avoidRepeating: ['항상 싸웁니다', '결국 헤어집니다'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      ...typeToneHints(ctx),
      ctx.relationshipType === 'reunion_or_breakup'
        ? '재회/이별 — 반복 조건을 보여주되 "다시 만나라/헤어져라" 단정 금지.'
        : '반복 패턴은 비난이 아니라 "구조"로 설명.',
    ],
    styleExamples: {
      badExample: '두 사람은 항상 같은 이유로 싸우다가 결국 헤어집니다.',
      goodExample:
        '한 사람이 빠르게 풀고 싶어 다가갈 때 다른 사람은 혼자 정리할 시간이 필요해서, 다가갈수록 더 멀어지는 흐름이 반복되기 쉽습니다. ' +
        '이 순서를 미리 알고 "지금은 식히는 시간"이라고 이름 붙여두면, 같은 장면이 와도 덜 흔들립니다.',
      transformationRule: '반복을 단정 결말이 아니라 "순서·구조"로. 회복 규칙을 함께 제시.',
    },
    topicTargets: ctx.focus.primaryConcerns,
    maxTokens: COMPAT_NARRATIVE_SECTION_MAX_TOKENS.repeatedPattern,
    repairHints: ['갈등→회복→안정 순서 포함.', '단정 미래(반드시 헤어진다 등) 0건.'],
  };
}

// ============================================================
// 섹션 5 — relationshipGuide
// ============================================================
function buildGuidePlan(facts: CompatMustUseFact[], ctx: CompatNarrativeContext): CompatNarrativePlan {
  return {
    sectionId: 'relationshipGuide',
    title: COMPAT_NARRATIVE_SECTION_TITLES.relationshipGuide,
    sectionGoal: '이 관계를 좋게 쓰는 구체 행동(대화·거리·역할·타이밍)을 제시한다. 추상 조언 금지.',
    mustUseFacts: factsFor(facts, 'relationshipGuide'),
    requiredBeats: [
      '도움이 되는 선택을 구체 행동으로 (대화/거리/역할/타이밍).',
      '피하는 게 좋은 선택은 "이렇게 바꾸면 된다"의 교정 행동으로.',
      ...concernBeats(ctx, '관계 사용법'),
      '상대 비난 톤 금지. 두 사람이 함께 할 수 있는 행동으로.',
    ],
    avoidRepeating: ['서로 노력하면', '대화를 많이 하세요', '이해하려고 노력하세요'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      ...typeToneHints(ctx),
      '"노력하세요" 같은 추상 조언 금지. 언제·무엇을·어떻게의 구체 행동.',
    ],
    styleExamples: {
      badExample: '서로 더 노력하고 대화를 많이 하면 좋아집니다.',
      goodExample:
        '감정이 올라온 그 자리에서 바로 풀려고 하기보다, "오늘은 여기까지 말하고 내일 이어가자"처럼 한 번 끊는 약속을 미리 정해두는 편이 낫습니다. ' +
        '역할도 둘 다 끌고 가려다 부딪히기보다, 결정하는 사람과 챙기는 사람을 상황별로 번갈아 맡으면 마찰이 줄어듭니다.',
      transformationRule: '추상 조언 대신 언제/무엇을/어떻게의 구체 행동. 교정형으로.',
    },
    topicTargets: ctx.focus.primaryConcerns,
    maxTokens: COMPAT_NARRATIVE_SECTION_MAX_TOKENS.relationshipGuide,
    repairHints: ['추상 조언("노력하세요") 0건.', '도움/피할 선택 각각 구체 행동 포함.'],
  };
}

// ============================================================
// 섹션 6 — finalAdvice (관계유형별 결론)
// ============================================================
function buildFinalAdvicePlan(facts: CompatMustUseFact[], ctx: CompatNarrativeContext): CompatNarrativePlan {
  return {
    sectionId: 'finalAdvice',
    title: COMPAT_NARRATIVE_SECTION_TITLES.finalAdvice,
    sectionGoal: `${ctx.relationshipTypeKo} 관점의 "선택 기준"으로 결론을 닫는다. 앞 섹션 재요약 금지.`,
    mustUseFacts: factsFor(facts, 'finalAdvice'),
    requiredBeats: [
      `${ctx.relationshipTypeKo} 관점에서 무엇을 기준으로 볼지 한 단락.`,
      '관계 핵심 조언을 기억에 남는 한 문장으로.',
      '앞으로의 흐름은 아주 짧게 한 문장으로만 연결 (3년 재서술 금지).',
      ...concernBeats(ctx, '결론'),
    ],
    avoidRepeating: ['앞에서 말했듯이', '결국 궁합이 좋다/나쁘다'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      ...typeToneHints(ctx),
      ctx.relationshipType === 'reunion_or_breakup'
        ? '재회/이별 결론 — "다시 만나라/헤어져라" 단정 금지, 판단 기준만 제공.'
        : '결론은 평가가 아니라 "이 관계를 어떻게 쓸지"의 선택 기준으로.',
    ],
    styleExamples: {
      badExample: '결국 이 궁합은 좋으니 결혼하시면 됩니다.',
      goodExample:
        '이 관계는 잘 맞고 안 맞고로 나눌 관계라기보다, 서로의 속도와 거리를 어디까지 맞출 수 있는지를 보고 선택할 관계에 가깝습니다. ' +
        '그 기준만 분명히 해두면, 앞으로의 흐름이 바뀌어도 흔들림 없이 같은 방향을 볼 수 있습니다.',
      transformationRule: '결론은 좋다/나쁘다 평가가 아니라 "선택 기준". 앞 섹션 재요약·3년 재서술 금지.',
    },
    topicTargets: ctx.focus.primaryConcerns,
    maxTokens: COMPAT_NARRATIVE_SECTION_MAX_TOKENS.finalAdvice,
    repairHints: ['관계유형 관점의 선택 기준 포함.', '앞으로의 흐름은 1문장 이내.', '단정 미래 0건.'],
  };
}

// ============================================================
// 메인 — buildCompatNarrativePlans
//   LLM 섹션(6개)만 plan 생성. 결정적 2개(compatibilityCard/evidenceView) 제외.
// ============================================================
type LlmPlanBuilder = (facts: CompatMustUseFact[], ctx: CompatNarrativeContext) => CompatNarrativePlan;

// LLM 섹션 id → plan builder. (결정적 2개는 의도적으로 제외 — partial map)
const LLM_PLAN_BUILDERS: Partial<Record<CompatNarrativeSectionId, LlmPlanBuilder>> = {
  relationshipOverview: buildOverviewPlan,
  relationshipMechanism: buildMechanismPlan,
  attractionAndFriction: buildAttractionFrictionPlan,
  repeatedPattern: buildRepeatedPatternPlan,
  relationshipGuide: buildGuidePlan,
  finalAdvice: buildFinalAdvicePlan,
};

export function buildCompatNarrativePlans(
  bundle: CompatibilityAnalysisBundle,
  ctx: CompatNarrativeContext,
): CompatNarrativePlanSet {
  const { facts } = formatCompatEvidence(bundle, ctx);
  return COMPAT_NARRATIVE_LLM_SECTION_IDS.map(sectionId => {
    const builder = LLM_PLAN_BUILDERS[sectionId];
    return builder!(facts, ctx);
  });
}
