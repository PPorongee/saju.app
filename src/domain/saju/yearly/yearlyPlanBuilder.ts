// Yearly Fortune V4 — Plan Builder (Y3)
//
// 역할:
//   - formatYearlyEvidence(Y3-1)의 섹션별 fact 묶음을 받아
//     섹션별 YearlyPlan을 deterministic하게 빌드.
//   - 각 plan은 mustUseFacts + requiredBeats + avoidPatterns + toneHints + styleExamples + maxTokens 포함.
//   - GPT prompt(Y4)는 본 YearlyPlanSet을 받아 단일 호출 X / 섹션별 호출.
//
// 중복 방지:
//   - formatYearlyEvidence가 fact owner를 미리 정해두므로,
//     각 plan은 자기 owner section의 fact만 사용.
//   - 본 파일에서 fact를 새로 만들어 다른 섹션에 끼지 않음.
//
// 정합:
//   - Y2 계산 결과 그대로 사용. computedEvidence 외 명리 요소 X.

import type {
  YearlyFortuneAnalysis, YearlyPlan, YearlyPlanSet, YearlyFortuneSectionId, YearlyTopicKey,
} from './yearlyTypes';
import { YEARLY_SECTION_MAX_TOKENS, YEARLY_SECTION_TITLES } from './yearlyTypes';
import { formatYearlyEvidence, type FormattedYearlyEvidence } from './yearlyEvidenceFormatter';

// ============================================================
// 공통 — 톤/금지 패턴 기본값
// ============================================================
const COMMON_TONE: string[] = [
  '친근한 존댓말. 반말 금지.',
  '단정 미래 예측 금지. "~할 수 있어요" / "~흐름이 강해질 수 있어요" / "~선택이 안정적입니다" 톤.',
  '명리 용어가 등장하면 즉시 일상어로 풀이.',
];

const COMMON_AVOID_PATTERNS: string[] = [
  '반드시 / 무조건 / 100% / 틀림없이',
  '이직한다 / 결혼한다 / 돈이 들어온다 / 사고가 난다 / 반드시 깨진다',
  'wood / fire / earth / metal / water 영문 오행 키 (반드시 한글 목/화/토/금/수)',
];

const FINANCIAL_AVOID_PATTERNS: string[] = [
  '매수 / 매도 / 시세 / 수익률 / 레버리지',
  '시장 타이밍 / 투자 타이밍 / 거래 타이밍에 맞춰',
  '큰돈을 굴린다 / 코인 / 주식 / 단기 투자 / 트레이딩',
  '가격 흐름을 보고 거래',
];

const MEDICAL_AVOID_PATTERNS: string[] = [
  '질병명 / 발병 / 중병 / 위독 / 치료 / 약물 / 진단',
];

const RELATIONSHIP_NEUTRAL_PATTERNS: string[] = [
  'relationshipStatus가 unknown이면: 아내/남편/배우자/자녀 단정 금지',
  '대신 "가까운 관계" / "장기적인 관계를 생각한다면" / "후배·제자·돌봄이 필요한 대상" 중립 표현',
];

// ============================================================
// 섹션 1 — yearFlowCard
// ============================================================
function buildYearFlowCardPlan(ev: FormattedYearlyEvidence): YearlyPlan {
  return {
    sectionId: 'yearFlowCard',
    title: YEARLY_SECTION_TITLES.yearFlowCard,
    sectionGoal: '올해의 핵심 흐름을 한 줄 키워드 + 3~5문장 요약 + 키워드 3개로 압축한다.',
    mustUseFacts: ev.yearFlowCard,
    requiredBeats: [
      '올해의 별빛 흐름 제목 (예: "쌓아둔 것을 밖으로 꺼내는 해" 톤) 한 줄.',
      '짧은 부제 1문장.',
      '키워드 3개 (단어).',
      '3~5문장 요약 — 세운 십성·오행과 용신/기신 관계를 일상어로 풀어 자연스럽게.',
      '카드 끝은 다음 섹션(올해 운이 움직이는 방식)으로 가볍게 이어지는 톤.',
    ],
    avoidRepeating: ['올해는 대박나는 해', '무조건 성공', '평범한 해'],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      '카드 형식 — 짧고 임팩트 있게. 너무 많은 합·충·형·파·해 나열 금지.',
    ],
    styleExamples: {
      badExample: '올해는 대박나는 해입니다.',
      goodExample:
        '올해는 무작정 크게 확장하는 해라기보다, 이미 쌓아둔 것을 밖으로 꺼내고 검증받는 해에 가깝습니다. ' +
        '혼자 준비만 하던 것을 결과물, 제안서, 포트폴리오, 계약 조건처럼 눈에 보이는 형태로 만들수록 운이 살아납니다. ' +
        '다만 완벽해질 때까지 기다리면 기회가 늦어질 수 있으니, 작게 꺼내고 반응을 보며 다듬는 방식이 좋습니다.',
      transformationRule: '예언 톤 대신 "흐름·선택 전략" 톤. 카드는 짧고 임팩트 있게.',
    },
    maxTokens: YEARLY_SECTION_MAX_TOKENS.yearFlowCard,
    repairHints: [
      '키워드 3개 + 짧은 부제 + 3~5문장 요약 구조 유지.',
      '특정 일간 비유 하드코딩 금지 (예: "무토는 큰 산처럼").',
    ],
  };
}

// ============================================================
// 섹션 2 — yearlyMechanism
// ============================================================
function buildYearlyMechanismPlan(ev: FormattedYearlyEvidence): YearlyPlan {
  return {
    sectionId: 'yearlyMechanism',
    title: YEARLY_SECTION_TITLES.yearlyMechanism,
    sectionGoal: '원국+대운+세운+신강신약+용신/기신이 올해 어떻게 작동하는지 한 흐름으로 설명한다.',
    mustUseFacts: ev.yearlyMechanism,
    requiredBeats: [
      '대운(큰 환경)이 무엇을 키우고 있는지 한 단락.',
      '올해 세운이 어떤 결로 들어오는지 (세운 천간 십성 + 오행).',
      '세운이 어느 궁(년/월/일/시주)을 건드리는지 — 대표 1~2개.',
      '신강/신약 구조에서 올해 흐름이 지원인지 부담인지.',
      '용신/기신 관계를 행동·환경 결로 풀이.',
      '대운-세운 작용 1~2개 한 줄로 (있으면).',
      '마지막 1문장은 "그래서 올해는 ..." 톤으로 다음 섹션으로 연결.',
    ],
    avoidRepeating: [
      '올해는 좋습니다',
      '올해는 나쁜 해',
      '용신이 없어서 안 됩니다',
    ],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      '"신강=좋다 / 신약=나쁘다" 식 단정 금지. 사주 구조 설명으로만.',
      '합/충은 좋다/나쁘다 단정 금지. 연결·흔들림·조정 톤.',
    ],
    styleExamples: {
      badExample: '올해 충이 있어서 안 좋습니다.',
      goodExample:
        '올해 지지가 원국의 월지를 건드리면, 사회적 역할이나 일하는 환경에서 변화 신호가 생길 수 있습니다. ' +
        '충은 무조건 나쁜 뜻이 아니라, 고정되어 있던 흐름이 흔들리며 방향 전환을 요구하는 신호로 봅니다. ' +
        '그래서 올해는 버티기만 하기보다, 역할·환경·계약 조건을 다시 점검하는 것이 중요합니다.',
      transformationRule: '명리 구조 → 결과 → 현실 장면 → 선택 전략 흐름으로.',
    },
    maxTokens: YEARLY_SECTION_MAX_TOKENS.yearlyMechanism,
    repairHints: [
      '신강/신약 단어 본문에 반드시 1회.',
      '용신/기신 단어 본문에 반드시 1회.',
      '대운(큰 환경) 언급 1회 이상.',
    ],
  };
}

// ============================================================
// 섹션 3 — remainingMonths
// ============================================================
function buildRemainingMonthsPlan(ev: FormattedYearlyEvidence): YearlyPlan {
  return {
    sectionId: 'remainingMonths',
    title: YEARLY_SECTION_TITLES.remainingMonths,
    sectionGoal: '남은 올해 월별 흐름을 절기 기준으로, 월마다 짧고 구체적으로 풀어준다.',
    mustUseFacts: ev.remainingMonths,
    requiredBeats: [
      '각 월: keyword 1줄 + 4~6문장 본문 + 좋은 선택 1줄 + 주의 1줄.',
      '월 keyword는 일반론 금지 (예: "좋은 달", "조심할 달" 금지).',
      '"올해 세운 흐름 안에서 이 달에 어떤 주제가 강해지는가" 톤. 단독 해석 금지.',
      '월별로 너무 길게 쓰지 말 것. 카드형이 아닌 줄글.',
    ],
    avoidRepeating: ['좋은 달', '조심할 달', '변화의 달', '평범한 달'],
    avoidPatterns: [...COMMON_AVOID_PATTERNS, ...FINANCIAL_AVOID_PATTERNS, ...MEDICAL_AVOID_PATTERNS],
    toneHints: [
      ...COMMON_TONE,
      '월별 표현은 "이 달에는 ~ 신호가 생길 수 있어요" 톤.',
      '단정 사건 (이직/결혼/사고) 금지.',
    ],
    styleExamples: {
      badExample: '6월은 재성이라 돈운 좋음.',
      goodExample:
        '6월 — 정리하고 다시 기준을 세우는 달\n\n' +
        '이번 달은 새롭게 크게 벌이기보다, 이미 진행 중인 일의 기준을 다시 정리하는 흐름이 강합니다. ' +
        '일에서는 역할이 애매한 일을 명확히 나누는 것이 중요하고, 돈에서는 지출이나 정산 조건을 다시 확인하는 것이 좋습니다. ' +
        '관계에서는 말로는 괜찮다고 했지만 속으로 쌓였던 불편함이 드러날 수 있으니, 감정이 커지기 전에 짧게 기준을 나누는 편이 좋습니다.\n\n' +
        '좋은 선택: 작게 정리하고, 기준을 문서로 남기기\n주의: 한 번에 다 바꾸려고 하거나, 애매한 약속을 그대로 두는 것',
      transformationRule: '월별 단독 해석 X. 올해 세운 흐름 안에서 이 달에 무엇이 강해지는지 표현.',
    },
    maxTokens: YEARLY_SECTION_MAX_TOKENS.remainingMonths,
    repairHints: [
      '각 월별 keyword가 일반론(좋은 달/조심할 달/변화의 달)이면 다시 작성.',
      '단정 미래 예측(이직/결혼/사고) 0건.',
      '월별 본문에 투자 권유성 표현(매수/매도/시세/시장 타이밍) 0건.',
    ],
  };
}

// ============================================================
// 섹션 4 — topicFortunes (일/돈/관계/리듬)
// ============================================================
function buildTopicFortunesPlan(ev: FormattedYearlyEvidence): YearlyPlan {
  return {
    sectionId: 'topicFortunes',
    title: YEARLY_SECTION_TITLES.topicFortunes,
    sectionGoal: '일·돈·관계·리듬 네 영역에서 올해 들어오는 변화를 안전 톤으로 정리한다.',
    mustUseFacts: ev.topicFortunes,
    requiredBeats: [
      '일·커리어: 역할 변화/책임 증감/평가/이직 신호/공부/협업/좋은 환경/피해야 할 환경 줄글.',
      '돈·수익화: 돈이 붙는 방식 / 새는 방식 / 보상 기준 / 정산 / 가격 정책 / 반복 가능한 수익 구조.',
      '관계·연애: 가까워지는/멀어지는 사람 / 반복 패턴 / 신뢰 형성 / 갈등 회복 가이드.',
      '생활 리듬·멘탈: 과로/수면/생각 과부하/감정 소모 결의 신호와 정리 루틴.',
      '각 영역은 결국 "이런 선택이 안정적이다"로 마무리.',
    ],
    avoidRepeating: ['이직한다', '돈이 들어온다', '연애가 시작된다', '큰돈을 굴린다'],
    avoidPatterns: [...COMMON_AVOID_PATTERNS, ...FINANCIAL_AVOID_PATTERNS, ...MEDICAL_AVOID_PATTERNS, ...RELATIONSHIP_NEUTRAL_PATTERNS],
    toneHints: [
      ...COMMON_TONE,
      '돈 영역: 투자 조언 톤 절대 금지. 수익화 구조·보상 기준 중심.',
      '관계 영역: relationshipStatus 단정 금지. 중립 표현.',
      '리듬 영역: 의학 진단/치료 표현 절대 금지.',
    ],
    styleExamples: {
      badExample: '올해 이직운이 있고, 시장 변화를 보고 거래하면 돈이 들어옵니다.',
      goodExample:
        '일 영역: 올해 일운은 무조건 회사를 옮기는 흐름이라기보다, 내가 맡고 있는 역할의 기준을 다시 정리하는 흐름에 가깝습니다. ' +
        '이직을 바로 결정하기보다, 먼저 지금 맡은 일의 범위와 권한, 평가 기준이 맞는지 확인하는 것이 좋습니다.\n\n' +
        '돈 영역: 올해 돈운은 한 번에 크게 들어오는 흐름이라기보다, 능력을 수익 구조로 바꾸는 쪽에서 살아납니다. ' +
        '작은 일이라도 작업 범위, 기간, 보상 기준을 먼저 정해야 실력과 보상이 연결됩니다.',
      transformationRule: '4개 영역을 각각 한 단락으로. 단정 예언 대신 "흐름과 선택 전략".',
    },
    topicTargets: ['일', '돈', '관계', '연애', '건강리듬', '계약'] satisfies YearlyTopicKey[],
    maxTokens: YEARLY_SECTION_MAX_TOKENS.topicFortunes,
    repairHints: [
      '돈 영역에 투자/거래/시세/매수/매도 단어 0건.',
      '관계 영역에 아내/남편/배우자/자녀 단정 0건 (unknown 케이스).',
      '리듬 영역에 질병/치료/약물/진단 0건.',
    ],
  };
}

// ============================================================
// 섹션 5 — actionGuide
// ============================================================
function buildActionGuidePlan(ev: FormattedYearlyEvidence): YearlyPlan {
  return {
    sectionId: 'actionGuide',
    title: YEARLY_SECTION_TITLES.actionGuide,
    sectionGoal: '올해 잡아야 할 것 / 흘려보낼 것 / 운 살리는 선택 / 막는 선택 / 한 문장 전략.',
    mustUseFacts: ev.actionGuide,
    requiredBeats: [
      '올해 잡아야 할 것 (행동 3가지 정도, 줄글이나 짧은 리스트).',
      '올해 흘려보낼 것 (피해야 할 행동 2~3가지).',
      '용신/기신을 부적·색상·방향이 아니라 행동·환경·구조화로 번역한 1단락.',
      '신강/신약 구조에 맞춘 한 단락 (추진/협업 균형, 혼자 X 함께).',
      '저장하고 싶을 정도로 기억에 남는 한 문장 전략으로 마무리.',
    ],
    avoidRepeating: [
      '협업을 통해 더 나은 결과',
      '긍정적인 결과를 가져올',
      '항상 최선을 다하면',
    ],
    avoidPatterns: COMMON_AVOID_PATTERNS,
    toneHints: [
      ...COMMON_TONE,
      '개운법은 부적/색상/방향 같은 미신 X. 행동·구조·역할 분담 중심.',
    ],
    styleExamples: {
      badExample: '올해는 긍정적으로 생각하고 최선을 다하면 좋은 결과가 옵니다.',
      goodExample:
        '올해 잡아야 할 것은 결과물로 남길 수 있는 일, 조건이 명확한 협업, 나의 능력을 문서화하고 가격 기준을 붙이는 기회입니다.\n\n' +
        '올해 흘려보낼 것은 책임은 많은데 권한은 없는 자리, 말은 많지만 행동이 없는 관계, 기준 없이 부탁만 쌓이는 일입니다.\n\n' +
        '이 사주의 개운 방향은 더 강해지는 것이 아니라, 이미 강한 힘을 어디까지 쓰고 어디서 나눌지를 정하는 데 있습니다. ' +
        '책임을 혼자 떠안기보다 역할·권한·보상 기준을 문서화하고 나누는 선택이 운을 편하게 만듭니다.\n\n' +
        '올해는 더 많이 버티는 해가 아니라, 내가 감당할 조건을 정하고 그 기준 안에서 움직일 때 운이 살아나는 해입니다.',
      transformationRule: '용신/기신은 행동·환경 번역. 마지막 1문장은 캡처할 만한 임팩트.',
    },
    maxTokens: YEARLY_SECTION_MAX_TOKENS.actionGuide,
    repairHints: [
      '"잡아야 할 것" / "흘려보낼 것" 둘 다 본문에 포함.',
      '"개운 방향" 또는 "운을 살리는/막는 선택" 단어 본문에 1회 이상.',
      '한 문장 전략으로 마무리.',
    ],
  };
}

// ============================================================
// 섹션 6 — nextTwoYears
// ============================================================
function buildNextTwoYearsPlan(ev: FormattedYearlyEvidence): YearlyPlan {
  return {
    sectionId: 'nextTwoYears',
    title: YEARLY_SECTION_TITLES.nextTwoYears,
    sectionGoal: 'targetYear+1, targetYear+2의 큰 흐름을 압축해 보여준다. 올해보다 짧게.',
    mustUseFacts: ev.nextTwoYears,
    requiredBeats: [
      '각 연도: 핵심 키워드 한 줄.',
      '3~5문장 요약 — 흐름과 선택 전략 톤.',
      '잡으면 좋은 결 한 줄 + 주의할 결 한 줄.',
      '올해 본문보다 자세하면 안 됨. 월별 흐름 만들지 말 것.',
    ],
    avoidRepeating: ['반드시 결혼한다', '반드시 이직한다', '무조건 성공'],
    avoidPatterns: [...COMMON_AVOID_PATTERNS, ...FINANCIAL_AVOID_PATTERNS],
    toneHints: [
      ...COMMON_TONE,
      '단정 미래 사건 절대 금지. "변화 신호가 생길 수 있어요" 톤.',
    ],
    styleExamples: {
      badExample: '2027년에 반드시 이직합니다.',
      goodExample:
        '2027년 — 연결과 확장\n\n' +
        '올해 정리한 결과물이 사람과 기회에 연결되는 흐름이 강해질 수 있습니다. ' +
        '혼자 준비만 하는 것보다 소개, 협업, 제안, 외부 프로젝트처럼 사람을 통해 판이 열리는 식입니다. ' +
        '다만 무리하게 확장하면 과부하가 생길 수 있으니, 어떤 관계를 오래 가져갈지 고르는 감각이 중요합니다.',
      transformationRule: '연도별로 핵심 키워드 + 짧은 요약 + 잡을/주의 한 줄씩. 단정 사건 X.',
    },
    maxTokens: YEARLY_SECTION_MAX_TOKENS.nextTwoYears,
    repairHints: [
      '2개 연도 keyword + summary + opportunity + caution 모두 존재.',
      '올해(targetYear) 분량보다 짧게.',
      '월별 흐름 만들지 말 것.',
    ],
  };
}

// ============================================================
// 섹션 7 — evidenceView (LLM 호출 X)
// ============================================================
function buildEvidenceViewPlan(ev: FormattedYearlyEvidence): YearlyPlan {
  return {
    sectionId: 'evidenceView',
    title: YEARLY_SECTION_TITLES.evidenceView,
    sectionGoal: '명리 근거(세운/대운/월운/용신·기신/신강신약/합충형파해)를 deterministic UI 카드로 보여준다. LLM 호출 X.',
    mustUseFacts: ev.evidenceView,
    requiredBeats: [
      '카드형 — UI 측에서 deterministic 렌더.',
      'LLM 호출 절대 없음.',
    ],
    avoidRepeating: [],
    avoidPatterns: [],
    toneHints: ['evidenceView는 본문이 아니라 UI 카드. 본 plan은 metadata만 제공.'],
    styleExamples: {
      badExample: '(해당 없음 — LLM 호출 없음)',
      goodExample: '(해당 없음 — UI에서 직접 렌더)',
      transformationRule: 'LLM 프롬프트에 포함하지 말 것.',
    },
    maxTokens: YEARLY_SECTION_MAX_TOKENS.evidenceView, // 0
    repairHints: ['evidenceView는 repair 대상 아님.'],
  };
}

// ============================================================
// 메인
// ============================================================
export function buildYearlyPlans(analysis: YearlyFortuneAnalysis): YearlyPlanSet {
  const ev = formatYearlyEvidence(analysis);
  return [
    buildYearFlowCardPlan(ev),
    buildYearlyMechanismPlan(ev),
    buildRemainingMonthsPlan(ev),
    buildTopicFortunesPlan(ev),
    buildActionGuidePlan(ev),
    buildNextTwoYearsPlan(ev),
    buildEvidenceViewPlan(ev),
  ];
}

// re-export sectionId 순서 (Y4 sectionwise 호출용)
export const YEARLY_LLM_SECTION_IDS: YearlyFortuneSectionId[] = [
  'yearFlowCard',
  'yearlyMechanism',
  'remainingMonths',
  'topicFortunes',
  'actionGuide',
  'nextTwoYears',
];
