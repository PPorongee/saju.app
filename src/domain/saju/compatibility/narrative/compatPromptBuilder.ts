// 궁합 narrative V4 — Prompt Builder (Phase 3)
//
// 역할 (올해운세 yearlyPromptBuilder.ts mirror):
//   - CompatNarrativePlan을 입력받아 section별 prompt 생성 (sectionwise GPT 호출용)
//   - sectionId별 출력 규칙 명확화 + JSON schema 강제
//   - mustUseFacts / requiredBeats / avoidPatterns / toneHints / styleExamples / repairHints를 prompt에 반영
//   - Evidence-to-Narrative 흐름 강제 (6단계: 명리근거→쉬운뜻→두 사람 사이 방식→좋게→꼬일 때→사용법)
//   - 관계유형(relationshipType) 차별화: ctx.relationshipTypeKo + focus.primaryConcerns/toneHint 주입
//   - computedEvidence(mustUseFacts) 외 명리 요소 추가 금지
//   - 결정적 섹션(compatibilityCard/evidenceView)은 LLM 호출 없음 → null 반환
//
// 절대규칙 (ABSOLUTE_RULES) 요약:
//   - mustUseFacts 외 명리 요소 생성 금지
//   - 상대 마음/감정 단정·예언 금지 (mind-reading)
//   - 운명론/관계 단정 금지 (반드시 헤어진다/운명이다 등) → 가능성·조건·선택기준
//   - 결혼/이혼/바람/재회/이별 단정 금지 → 가능성/조건 톤
//   - 점수·등급 중심 표현 금지
//   - validator log/issue명/fact id/sectionId/internal schema 노출 금지
//   - 영문 오행 key 노출 금지 → 한글
//   - 선택한 관계 유형과 다른 맥락 침범 금지
//   - 다른 섹션 결론/내용 반복 금지
//
// 정합: NO LLM/network. 순수 문자열 조립만. style example에 특정 사주값 hardcode 금지 (구조만).

import type {
  CompatNarrativePlan, CompatNarrativeContext, CompatNarrativeSectionId, CompatMustUseFact,
} from './compatNarrativeTypes';
import { COMPAT_NARRATIVE_JSON_SCHEMAS } from './compatNarrativeTypes';

// ============================================================
// 입력/출력 타입 (yearly mirror)
// ============================================================
export interface BuiltCompatPrompt {
  sectionId: CompatNarrativeSectionId;
  system: string;
  user: string;
  maxTokens: number;
  /** 파서가 기대하는 JSON shape (prompt에도 포함됨) */
  outputJsonSchema: string;
}

export interface CompatRepairIssueRef {
  type: string;
  sectionId: string;
  sentence?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface CompatRepairContext {
  /** 직전 시도의 raw 출력 (parser 통과 여부 무관) */
  previousOutput: string;
  /** validator가 잡은 issue 목록 (이 섹션 관련만 전달 권장) */
  issues: CompatRepairIssueRef[];
}

// 결정적 섹션 (LLM 호출 없음)
const DETERMINISTIC_SECTIONS: CompatNarrativeSectionId[] = ['compatibilityCard', 'evidenceView'];

function isLlmSection(sectionId: CompatNarrativeSectionId): boolean {
  return !DETERMINISTIC_SECTIONS.includes(sectionId);
}

// ============================================================
// ABSOLUTE_RULES — 모든 prompt 최상단에 prepend
// ============================================================
const ABSOLUTE_RULES_TITLE = '[ABSOLUTE_RULES — 위반 시 출력 폐기]';

const ABSOLUTE_RULES_LINES: string[] = [
  '1) computedEvidence(아래 mustUseFacts)에 없는 명리 요소를 새로 만들지 말 것.',
  '   - 일간, 오행, 십성, 용신/기신, 일지, 합·충·형·파·해를 임의로 추가 금지.',
  '   - 모든 해석의 근거는 mustUseFacts에서만 끌어와야 한다.',
  '2) 상대의 마음/감정을 단정하거나 예언하지 말 것 (mind-reading 금지).',
  '   - "상대는 당신을 좋아하지 않습니다", "상대도 같은 마음입니다" 같은 단정 X.',
  '   - "이런 반응이 생기기 쉽습니다", "이렇게 느껴질 수 있습니다" 가능성 톤만 허용.',
  '3) 운명론/관계 단정 금지.',
  '   - "반드시 헤어집니다 / 절대 안 맞습니다 / 무조건 재회합니다 / 이 사람은 운명입니다 / 상대는 반드시 돌아옵니다" 금지.',
  '   - 모든 결론은 가능성·조건·선택 기준 톤으로 (확정 미래 X).',
  '4) 결혼/이혼/바람/재회/이별을 단정하지 말 것.',
  '   - "바람납니다 / 이혼합니다 / 결혼합니다 / 헤어집니다" 같은 단정 X.',
  '   - "~할 가능성 / ~할 조건이 갖춰지면" 톤으로만 다룬다.',
  '5) 점수·등급 중심 표현 금지.',
  '   - "X점 / 상위 N% / 궁합 N점 / 등급 / 퍼센트"로 관계를 평가 금지.',
  '   - 관계는 점수가 아니라 "결·구조·선택 기준"으로 설명한다.',
  '6) validator log, issue 내부명, fact id, sectionId, 내부 schema 키를 사용자에게 보이는 문장에 노출 금지.',
  '   - 예: "ds-dayMasterRelation", "relationshipMechanism", "matchTokens" 등의 내부 토큰 출력 X.',
  '7) 영문 오행 key 출력 금지.',
  '   - wood / fire / earth / metal / water 그대로 노출 X. 반드시 한글 목/화/토/금/수.',
  '8) 선택한 관계 유형과 다른 맥락 침범 금지.',
  '   - 연애 관계인데 직장 동료 이야기, 동료 관계인데 연애·결혼 이야기를 끌어오지 말 것.',
  '   - 아래 [CONTEXT]의 관계 유형 결만 다룬다.',
  '9) 다른 섹션의 결론/내용을 미리 내놓거나 반복하지 말 것.',
  '   - 이 prompt는 자기 섹션(ownerSection)만 작성한다. 다른 섹션의 결론을 선점·재요약 금지.',
];

const ABSOLUTE_RULES_BLOCK = [ABSOLUTE_RULES_TITLE, ...ABSOLUTE_RULES_LINES].join('\n');

// ============================================================
// 궁합 톤 규칙 (점쟁이 X / 관계 이야기 잘 풀어주는 사람 O)
// ============================================================
const TONE_RULES_TITLE = '[TONE_RULES — 궁합은 점괘가 아니라 "두 사람 관계를 잘 풀어주는 이야기"]';

const TONE_GOOD: string[] = [
  '"두 사람은 이런 결로 만나는 사이입니다."',
  '"이럴 때는 이런 장면이 생기기 쉽습니다."',
  '"이렇게 거리를 조절하면 편해집니다."',
  '"이 관계는 이런 기준으로 보는 편이 낫습니다."',
];

const TONE_BAD: string[] = [
  '"두 분은 천생연분입니다."',
  '"이 사람은 운명입니다."',
  '"반드시 헤어집니다."',
  '"무조건 재회합니다."',
  '"궁합 점수가 매우 높습니다."',
];

const TONE_RULES_BLOCK = [
  TONE_RULES_TITLE,
  '관점: 점쟁이가 아니라, 두 사람 사이를 옆에서 잘 풀어주는 다정한 사람.',
  '좋은 톤 (이 결을 따른다):',
  ...TONE_GOOD.map(s => `  - ${s}`),
  '나쁜 톤 (절대 쓰지 않는다):',
  ...TONE_BAD.map(s => `  - ${s}`),
  '문체: 친근한 존댓말. 반말 금지. 명리 용어가 등장하면 즉시 일상어로 풀이.',
  '추상어 단독 사용 금지: "잘 맞아요 / 소통이 중요해요" 같은 표현은 반드시 실제 장면으로 바꿔 쓴다.',
].join('\n');

// ============================================================
// Evidence-to-Narrative 규칙 (명세 §7 — 6단계)
//   명리 근거 → 쉬운 뜻 → 두 사람 사이 방식 → 좋게 → 꼬일 때 → 사용법
// ============================================================
const EVIDENCE_TO_NARRATIVE_TITLE = '[EVIDENCE_TO_NARRATIVE — 각 핵심 해석은 아래 흐름으로 풀어야 한다]';

const EVIDENCE_TO_NARRATIVE_BLOCK = [
  EVIDENCE_TO_NARRATIVE_TITLE,
  '1) 명리 근거 (mustUseFacts에서 가져옴)',
  '2) 쉬운 뜻 (사람이 이해할 수 있게 풀이)',
  '3) 두 사람 사이에서 그것이 어떤 방식으로 나타나는지 (관계 장면)',
  '4) 좋게 작동할 때 (활성화 방향)',
  '5) 꼬일 수 있을 때 (회피·주의 방향)',
  '6) 관계를 좋게 쓰는 사용법 (행동/거리/역할/타이밍 — 부적·색상·방향 같은 미신 X)',
  '',
  '[나쁜 예]',
  '  "두 사람은 일지에 충이 있어 궁합이 나쁩니다."',
  '[좋은 방향]',
  '  "가장 가까운 자리에서 서로를 강하게 끌어당기면서 동시에 생활 리듬이 흔들리는 결이 함께 있습니다. ',
  '   그래서 가까워질수록 같은 자리에서 끌림과 부딪힘이 같이 올라오기 쉬우니, 거리를 어떻게 조절할지 미리 정해두면 편해집니다."',
].join('\n');

// ============================================================
// styleExamples 사용 규칙 (모든 prompt에 포함)
//   ★ 핵심: style example은 구조 예시일 뿐 특정 사주값을 복사하지 말 것.
// ============================================================
const STYLE_EXAMPLE_DISCLAIMER_TITLE = '[STYLE_EXAMPLE_DISCLAIMER — 예시는 구조 참고용]';

const STYLE_EXAMPLE_DISCLAIMER_BLOCK = [
  STYLE_EXAMPLE_DISCLAIMER_TITLE,
  '- 아래 style example([좋은 예])은 구조 예시일 뿐, 특정 사주값을 복사하지 말 것.',
  '- 예시에 등장하는 일간·오행·십성·관계 표현을 현재 두 사람에게 그대로 적용하지 말 것.',
  '- 현재 computedEvidence(mustUseFacts)에 있는 근거만 사용해서 톤·구조만 참고할 것.',
].join('\n');

// ============================================================
// JSON 출력 강제 규칙
// ============================================================
const JSON_OUTPUT_RULES_TITLE = '[JSON_OUTPUT_RULES]';

function jsonRulesBlock(sectionId: CompatNarrativeSectionId): string {
  return [
    JSON_OUTPUT_RULES_TITLE,
    '- 출력은 JSON 한 덩어리만. 코드펜스(```), 주석, 인사말, 마무리 멘트 금지.',
    '- 첫 글자는 `{`이고 마지막 글자는 `}`이어야 한다.',
    `- 정확히 아래 ${sectionId} schema를 따른다.`,
    '- 모든 string은 사람이 읽을 수 있는 한글 문장. fact id / sectionId / 영문 key 노출 금지.',
    '- style example은 구조 예시일 뿐 특정 사주값을 복사하지 말 것.',
  ].join('\n');
}

// ============================================================
// 섹션별 출력 구조 강제 룰 (LLM 6개 섹션)
// ============================================================
const SECTION_OUTPUT_RULES: Record<CompatNarrativeSectionId, string[]> = {
  compatibilityCard: ['(해당 없음 — LLM 호출 X, UI deterministic 렌더)'],
  relationshipOverview: [
    'oneLine은 관계를 한 문장으로 요약. 점수·운명 단정 금지.',
    'body는 밝은 면과 그늘진 면을 균형 있게 + 첫인상 케미 한 문장.',
    '세부 명리 원인은 다음 섹션으로 넘기고 여기선 framing만.',
    '너무 길지 않게. 카드 다음에 오는 도입부 톤.',
  ],
  relationshipMechanism: [
    '일간·오행·십성·용신/기신·일지 결을 본문에 한 흐름으로 녹인다 (용어 즉시 풀이).',
    '합·충·형·파·해는 단순 나열 금지. "끌어당기는 결 / 흔들리는 결" 균형으로.',
    '"신강=좋다 / 충=나쁘다" 단정 금지. 연결·흔들림·조정 톤.',
    'evidenceBlocks는 1~3개. 각 block은 Evidence-to-Narrative 6단계를 모두 채운다.',
    '마지막 1문장은 "그래서 이 관계는 ..." 톤으로.',
  ],
  attractionAndFriction: [
    '끌림 지점과 부담 지점이 같은 뿌리에서 나온다는 한 구조로 묶을 것.',
    '끌림 따로 / 부담 따로 나열만 하면 안 됨.',
    '상대 마음을 단정하지 말 것 ("이런 반응이 생기기 쉽다" 톤).',
  ],
  repeatedPattern: [
    '한 번 부딪히면 어떤 순서로 흘러가는지 반복 장면 (갈등→회복→안정).',
    '단정 미래("반드시 깨진다") 금지. "이런 흐름이 반복되기 쉽다" 톤.',
    '반복을 비난이 아니라 "순서·구조"로 설명하고 회복 규칙을 함께 제시.',
  ],
  relationshipGuide: [
    '도움이 되는 선택을 구체 행동으로 (언제·무엇을·어떻게: 대화/거리/역할/타이밍).',
    '추상 조언("노력하세요 / 대화를 많이 하세요") 금지.',
    '피하는 게 좋은 선택은 "이렇게 바꾸면 된다"의 교정 행동으로.',
    '상대 비난 톤 금지. 두 사람이 함께 할 수 있는 행동으로.',
  ],
  finalAdvice: [
    '관계 유형 관점의 "선택 기준"으로 결론을 닫는다. 앞 섹션 재요약 금지.',
    '관계 핵심 조언을 기억에 남는 한 문장으로.',
    '앞으로의 흐름은 아주 짧게 한 문장으로만 연결 (3년 재서술 금지).',
    '좋다/나쁘다 평가가 아니라 "이 관계를 어떻게 쓸지"의 기준으로.',
  ],
  evidenceView: ['(해당 없음 — LLM 호출 X)'],
};

// ============================================================
// mustUseFacts 렌더 (yearly renderFact 패턴 차용)
// ============================================================
function renderFact(f: CompatMustUseFact): string {
  const lines: string[] = [];
  lines.push(`  - [${f.id} / ${f.source}] fact: "${f.fact}"`);
  lines.push(`      쉬운 풀이: ${f.plainMeaning}`);
  lines.push(`      흡수 힌트: ${f.narrativeHint}`);
  if (f.matchTokens && f.matchTokens.length > 0) {
    lines.push(`      흡수 확인 토큰(내부용 — 본문 노출 금지): ${f.matchTokens.join(', ')}`);
  }
  if (f.lifeSceneHint) {
    const h = f.lifeSceneHint;
    const sceneParts = [
      `상황: ${h.situation}`,
      `행동 가능성: ${h.likelyBehavior}`,
      `내면 반응: ${h.innerReaction}`,
      h.externalMisunderstanding ? `외부 오해: ${h.externalMisunderstanding}` : '',
      h.betterUse ? `더 잘 쓰는 방향: ${h.betterUse}` : '',
    ].filter(Boolean);
    lines.push('      ▷ 두 사람 사이 장면 시드 (본문 안에 자연스럽게 녹임):');
    sceneParts.forEach(p => lines.push(`        ${p}`));
  }
  if (f.adviceHint) {
    const a = f.adviceHint;
    const parts = [
      `행동 조언: ${a.actionable}`,
      a.avoidPattern ? `꼬이는 선택: ${a.avoidPattern}` : '',
      a.activatePattern ? `좋게 쓰는 선택: ${a.activatePattern}` : '',
    ].filter(Boolean);
    lines.push('      ▷ 명리 구조 → 행동 조언 (원인·결과·관계 장면 다음에 자연스럽게 연결):');
    parts.forEach(p => lines.push(`        ${p}`));
  }
  return lines.join('\n');
}

function renderFactsBlock(facts: CompatMustUseFact[]): string {
  if (facts.length === 0) return '  (mustUseFacts 없음 — 본 섹션 근거는 앞뒤 흐름에서만 가볍게 연결)';
  return facts.map(renderFact).join('\n');
}

// ============================================================
// 관계유형 context hint (relationshipTypeKo + focus 주입)
// ============================================================
function relationshipContextBlock(ctx: CompatNarrativeContext): string {
  const concernLines = ctx.focus.primaryConcerns.map(c => `    - ${c}`).join('\n');
  return [
    '[CONTEXT — 관계 유형]',
    `- 관계 유형: ${ctx.relationshipTypeKo}`,
    `- 이 유형의 톤: ${ctx.focus.toneHint}`,
    '- 이 유형에서 특히 중요한 관심사 (이 결만 다룬다):',
    concernLines,
    `- 다른 관계 유형의 맥락(예: ${ctx.relationshipTypeKo}가 아닌 다른 관계 이야기)은 끌어오지 말 것.`,
  ].join('\n');
}

// ============================================================
// 공통 prompt assembler
// ============================================================
function commonHeader(plan: CompatNarrativePlan, ctx: CompatNarrativeContext): string {
  return [
    ABSOLUTE_RULES_BLOCK,
    '',
    TONE_RULES_BLOCK,
    '',
    EVIDENCE_TO_NARRATIVE_BLOCK,
    '',
    relationshipContextBlock(ctx),
    '',
    `[SECTION] ${plan.sectionId} — "${plan.title}"`,
    `목표: ${plan.sectionGoal}`,
  ].join('\n');
}

function planBodyBlock(plan: CompatNarrativePlan): string {
  const beatLines = plan.requiredBeats.map((b, i) => `  ${i + 1}. ${b}`).join('\n');
  const avoidRepLines = plan.avoidRepeating.length > 0
    ? plan.avoidRepeating.map(s => `  - "${s}"`).join('\n')
    : '  (없음)';
  const avoidPatternsLines = plan.avoidPatterns.length > 0
    ? plan.avoidPatterns.map(s => `  - ${s}`).join('\n')
    : '  (없음)';
  const toneLines = plan.toneHints.map(s => `  - ${s}`).join('\n');
  const outputRuleLines = (SECTION_OUTPUT_RULES[plan.sectionId] ?? [])
    .map(s => `  - ${s}`).join('\n');
  const repairLines = plan.repairHints && plan.repairHints.length > 0
    ? plan.repairHints.map(s => `  - ${s}`).join('\n')
    : '  (없음)';
  const topicTargetsLine = plan.topicTargets && plan.topicTargets.length > 0
    ? plan.topicTargets.join(', ')
    : '(없음)';

  return [
    '[MUST_USE_FACTS — 빠지면 missing-fact 처리]',
    renderFactsBlock(plan.mustUseFacts),
    '',
    '[REQUIRED_BEATS — 이 흐름대로 전개]',
    beatLines,
    '',
    '[AVOID_PATTERNS — 표현·키워드 금지]',
    avoidPatternsLines,
    '',
    '[AVOID_REPEATING — 같은 phrase 반복 금지]',
    avoidRepLines,
    '',
    '[TONE_HINTS]',
    toneLines,
    '',
    '[SECTION_OUTPUT_RULES — 이 섹션 출력 구조 강제]',
    outputRuleLines,
    '',
    `[TOPIC_TARGETS — 관계 유형 관심사] ${topicTargetsLine}`,
    '',
    '[REPAIR_HINTS — 다시 작성할 때 우선 점검]',
    repairLines,
  ].join('\n');
}

function styleBlock(plan: CompatNarrativePlan): string {
  return [
    STYLE_EXAMPLE_DISCLAIMER_BLOCK,
    '',
    `[STYLE_EXAMPLES — ${plan.sectionId}]`,
    `  [나쁜 예] ${plan.styleExamples.badExample}`,
    `  [좋은 예]`,
    plan.styleExamples.goodExample.split('\n').map(l => `    ${l}`).join('\n'),
    `  [변환 규칙] ${plan.styleExamples.transformationRule}`,
  ].join('\n');
}

function outputBlock(plan: CompatNarrativePlan): string {
  const schema = COMPAT_NARRATIVE_JSON_SCHEMAS[
    plan.sectionId as keyof typeof COMPAT_NARRATIVE_JSON_SCHEMAS
  ];
  return [
    jsonRulesBlock(plan.sectionId),
    '',
    `[OUTPUT_JSON_SCHEMA — ${plan.sectionId}]`,
    schema,
  ].join('\n');
}

// ============================================================
// SYSTEM prompt — 모든 섹션 공통
// ============================================================
const SYSTEM_PROMPT = [
  '당신은 사주 명리학과 글쓰기에 능한 한국어 작가입니다.',
  '단, 점쟁이가 아니라 "두 사람의 관계를 옆에서 잘 풀어주는 다정한 사람"입니다.',
  '',
  '핵심 원칙:',
  '  - 운명·관계 단정 금지. 모든 문장은 결/가능성/선택 기준 톤.',
  '  - 상대의 마음·감정을 단정하거나 예언하지 않는다 (mind-reading 금지).',
  '  - computedEvidence(mustUseFacts)에 없는 명리 요소를 새로 만들지 않는다.',
  '  - 점수·등급으로 관계를 평가하지 않는다.',
  '  - 출력은 항상 한 덩어리의 유효한 JSON. 코드펜스/주석/인사말 금지.',
  '',
  '문체:',
  '  - 친근한 존댓말. 반말 금지.',
  '  - 명리 용어가 등장하면 즉시 일상어로 풀이.',
  '  - 추상어("잘 맞아요/소통이 중요") 단독 금지 — 실제 장면으로.',
  '  - 선택한 관계 유형만 다루고, 다른 섹션을 침범하지 않는다.',
].join('\n');

// ============================================================
// 단일 섹션 prompt 빌드
//   결정적 섹션(compatibilityCard/evidenceView)은 null.
// ============================================================
export function buildCompatPromptForSection(
  plan: CompatNarrativePlan,
  ctx: CompatNarrativeContext,
): BuiltCompatPrompt | null {
  // 결정적 섹션은 LLM 호출 없음 (plan은 LLM 6개만 존재하지만 guard)
  if (!isLlmSection(plan.sectionId)) return null;

  const schema = COMPAT_NARRATIVE_JSON_SCHEMAS[
    plan.sectionId as keyof typeof COMPAT_NARRATIVE_JSON_SCHEMAS
  ];
  if (!schema) return null;

  const user = [
    commonHeader(plan, ctx),
    '',
    planBodyBlock(plan),
    '',
    styleBlock(plan),
    '',
    outputBlock(plan),
    '',
    '[FINAL_REMINDER]',
    '- 위 ABSOLUTE_RULES, TONE_RULES, EVIDENCE_TO_NARRATIVE, SECTION_OUTPUT_RULES를 모두 지킨다.',
    '- mustUseFacts에 없는 명리 요소를 끌어오지 않는다.',
    '- 상대 마음을 단정하지 않고, 관계를 점수로 평가하지 않는다.',
    `- 관계 유형(${ctx.relationshipTypeKo})만 다루고, 다른 섹션의 결론은 미리 내놓지 않는다.`,
    '- 출력은 JSON 한 덩어리만.',
  ].join('\n');

  return {
    sectionId: plan.sectionId,
    system: SYSTEM_PROMPT,
    user,
    maxTokens: plan.maxTokens ?? 1200,
    outputJsonSchema: schema,
  };
}

// ============================================================
// 전체 plan set → section별 prompt Map (null 제외)
// ============================================================
export function buildCompatPromptsAll(
  plans: CompatNarrativePlan[],
  ctx: CompatNarrativeContext,
): Map<CompatNarrativeSectionId, BuiltCompatPrompt> {
  const out = new Map<CompatNarrativeSectionId, BuiltCompatPrompt>();
  for (const p of plans) {
    const built = buildCompatPromptForSection(p, ctx);
    if (built) out.set(p.sectionId, built);
  }
  return out;
}

// ============================================================
// Repair prompt — section validation 실패 시 재호출용
// ============================================================
function renderRepairIssues(issues: CompatRepairIssueRef[]): string {
  if (issues.length === 0) return '  (없음)';
  return issues.map((iss, i) => {
    const parts = [
      `${i + 1}. [${iss.severity}] ${iss.type} (섹션: ${iss.sectionId})`,
      iss.sentence ? `   문제 문장: "${iss.sentence}"` : '',
      `   사유: ${iss.reason}`,
      iss.suggestion ? `   개선 힌트: ${iss.suggestion}` : '',
    ].filter(Boolean);
    return parts.join('\n');
  }).join('\n');
}

export function buildCompatRepairPrompt(
  plan: CompatNarrativePlan,
  ctx: CompatNarrativeContext,
  repair: CompatRepairContext,
): BuiltCompatPrompt | null {
  if (!isLlmSection(plan.sectionId)) return null;

  const base = buildCompatPromptForSection(plan, ctx);
  if (!base) return null;

  const repairBlock = [
    '[REPAIR_MODE — 직전 출력이 validator를 통과하지 못함]',
    '',
    '[PREVIOUS_OUTPUT (raw)]',
    repair.previousOutput.slice(0, 6000), // safety cap
    '',
    '[ISSUES — 이 섹션 범위만 다시 고친다]',
    renderRepairIssues(repair.issues),
    '',
    '[REPAIR_RULES]',
    '- 위 issue만 정확히 고친다. 다른 섹션 내용으로 확장 금지.',
    '- ABSOLUTE_RULES / TONE_RULES / EVIDENCE_TO_NARRATIVE / SECTION_OUTPUT_RULES 그대로 유지.',
    '- mustUseFacts에 없는 명리 요소를 추가 금지.',
    '- 상대 마음 단정·점수 평가·운명 단정 0건.',
    '- 출력은 동일한 JSON schema로 한 덩어리만.',
  ].join('\n');

  const user = [
    base.user,
    '',
    '────────────────────────────',
    '',
    repairBlock,
  ].join('\n');

  return {
    sectionId: plan.sectionId,
    system: SYSTEM_PROMPT,
    user,
    maxTokens: plan.maxTokens ?? 1200,
    outputJsonSchema: base.outputJsonSchema,
  };
}

// ============================================================
// 외부 노출 (테스트/디버깅용)
// ============================================================
export const COMPAT_PROMPT_INTERNAL = {
  ABSOLUTE_RULES_TITLE,
  ABSOLUTE_RULES_LINES,
  TONE_RULES_TITLE,
  EVIDENCE_TO_NARRATIVE_TITLE,
  STYLE_EXAMPLE_DISCLAIMER_TITLE,
  JSON_OUTPUT_RULES_TITLE,
  SECTION_OUTPUT_RULES,
  SYSTEM_PROMPT,
  DETERMINISTIC_SECTIONS,
};
