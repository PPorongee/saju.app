// 임산부 모드 V4 — Prompt Builder (Phase 4)
//
// 역할 (compat/yearly promptBuilder mirror):
//   - PregnancyNarrativePlan → section별 prompt (sectionwise GPT 호출용).
//   - mustUseFacts / requiredBeats / avoidPatterns / toneHints / styleExamples / repairHints 반영.
//   - Evidence-to-Narrative 흐름 강제 (명리근거→쉬운뜻→엄마-아이 사이 방식→좋게→조심할 때→태교/생활 조언).
//   - computedEvidence(mustUseFacts) 외 명리 요소 추가 금지.
//   - 결정적 섹션(motherBabyCard/babyNames/evidenceView)은 LLM 호출 없음 → null.
//
// 절대규칙 (ABSOLUTE_RULES) — 의료/출산 안전이 최우선:
//   - mustUseFacts 외 명리 요소 생성 금지 / 태명 창작 금지.
//   - 의료/건강/분만/진료/약/영양/치료 조언 금지 (병원 판단 대체 금지).
//   - 태아 건강 / 조산 / 유산 / 분만 위험 / 출산 난이도 / 성별 예측 금지.
//   - 아이 성격·운명 단정 금지 → "출생예정일 기준으로 보면 이런 결" 만.
//   - 출산일 결정/추천/특정 날짜 출산 유도 금지.
//   - 엄마 탓 표현 금지.
//   - 점수·등급 금지 / 운명·반드시·확정 단정 금지.
//   - 내부 토큰(fact id/sectionId/schema)·영문 오행 키 노출 금지.

import type {
  PregnancyNarrativePlan, PregnancyNarrativeContext, PregnancyNarrativeSectionId, PregnancyMustUseFact,
} from './pregnancyNarrativeTypes';
import { PREGNANCY_NARRATIVE_JSON_SCHEMAS, PREGNANCY_DISCLAIMER } from './pregnancyNarrativeTypes';

export interface BuiltPregnancyPrompt {
  sectionId: PregnancyNarrativeSectionId;
  system: string;
  user: string;
  maxTokens: number;
  outputJsonSchema: string;
}

export interface PregnancyRepairIssueRef {
  type: string;
  sectionId: string;
  sentence?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface PregnancyRepairContext {
  previousOutput: string;
  issues: PregnancyRepairIssueRef[];
}

const DETERMINISTIC_SECTIONS: PregnancyNarrativeSectionId[] = ['motherBabyCard', 'babyNames', 'evidenceView'];

function isLlmSection(sectionId: PregnancyNarrativeSectionId): boolean {
  return !DETERMINISTIC_SECTIONS.includes(sectionId);
}

// ============================================================
// ABSOLUTE_RULES
// ============================================================
const ABSOLUTE_RULES_TITLE = '[ABSOLUTE_RULES — 위반 시 출력 폐기]';

const ABSOLUTE_RULES_LINES: string[] = [
  '1) computedEvidence(아래 mustUseFacts)에 없는 명리 요소를 새로 만들지 말 것.',
  '   - 일간·오행·용신/기신·합·충·형·파·해를 임의로 추가 금지. 근거는 mustUseFacts에서만.',
  '   - 태명을 새로 지어내지 말 것 (태명은 별도 결정적 후보에서만 제공됨).',
  '2) 의료/건강 조언 금지 — 이 기능은 의료 조언이 아니라 사주적 상징 해석 + 정서 안정 + 태교 방향이다.',
  '   - 약·영양제·치료·진료·검사·운동량·식단을 처방하듯 말하지 말 것.',
  '   - "병원 대신 / 의사 말보다" 같은 의료 대체 표현 절대 금지.',
  '3) 태아 건강·조산·유산·분만 위험·출산 난이도·성별을 예측하지 말 것.',
  '   - "건강하게 태어난다 / 순산한다 / 난산이다 / 아들이다 / 딸이다" 등 일절 금지.',
  '4) 아이의 성격·운명을 단정하지 말 것.',
  '   - "이 아이는 반드시 ~한 성격" 금지. "출생예정일 기준으로 보면 이런 결이 강하게 보입니다" 톤만.',
  '   - 실제 출생일과 시간에 따라 달라질 수 있음을 잊지 말 것.',
  '5) 출산일을 정하거나 추천하지 말 것.',
  '   - "이 날 낳으면 좋다/나쁘다 / 최고의 출산일 / 이 날은 피하라 / 며칠에 낳아라" 금지.',
  '6) 엄마 탓으로 들리는 표현 금지.',
  '   - "엄마가 이래서 아이에게 안 좋다" 식 금지. 엄마를 지지하고 안심시키는 톤.',
  '7) 점수·등급·퍼센트로 평가 금지. 운명·반드시·무조건·100%·확정 단정 금지.',
  '   - 모든 해석은 결·가능성·방향·선택 기준 톤.',
  '8) 내부 토큰(fact id / sectionId / matchTokens / schema 키)을 본문에 노출 금지.',
  '9) 영문 오행 키(wood/fire/earth/metal/water) 노출 금지 → 반드시 한글 목/화/토/금/수.',
  '10) 이 prompt는 자기 섹션만 작성한다. 다른 섹션의 결론을 선점·재요약 금지.',
];

const ABSOLUTE_RULES_BLOCK = [ABSOLUTE_RULES_TITLE, ...ABSOLUTE_RULES_LINES].join('\n');

// ============================================================
// TONE_RULES
// ============================================================
const TONE_RULES_TITLE = '[TONE_RULES — 점괘가 아니라 "엄마를 안심시키는 따뜻한 사주 이야기"]';

const TONE_GOOD: string[] = [
  '"출생예정일 기준으로 보면, 이런 결이 느껴집니다."',
  '"엄마에게는 이런 환경이 마음을 편안하게 해줍니다."',
  '"이 조합에서는 이런 태교가 부담 없이 잘 맞습니다."',
  '"실제 출생일과 시간에 따라 달라질 수 있어요."',
];

const TONE_BAD: string[] = [
  '"이 아기는 천재 사주입니다."',
  '"이 날 낳으면 최고의 사주가 됩니다."',
  '"아기는 건강하게 순산할 것입니다."',
  '"이 아이는 반드시 리더가 됩니다."',
  '"엄마가 약해서 아기에게 안 좋습니다."',
];

const TONE_RULES_BLOCK = [
  TONE_RULES_TITLE,
  '관점: 점쟁이가 아니라, 예비 엄마 곁에서 마음을 다독여주는 다정한 사람.',
  '좋은 톤:',
  ...TONE_GOOD.map(s => `  - ${s}`),
  '나쁜 톤 (절대 금지):',
  ...TONE_BAD.map(s => `  - ${s}`),
  '문체: 따뜻한 존댓말. 반말 금지. 명리 용어가 등장하면 즉시 일상어로 풀이.',
  '추상어 단독 금지: "좋아요 / 태교가 중요해요"는 반드시 구체 장면·행동으로.',
].join('\n');

// ============================================================
// Evidence-to-Narrative (태교/생활 조언 단계 포함)
// ============================================================
const EVIDENCE_TO_NARRATIVE_TITLE = '[EVIDENCE_TO_NARRATIVE — 각 핵심 해석은 아래 흐름으로]';

const EVIDENCE_TO_NARRATIVE_BLOCK = [
  EVIDENCE_TO_NARRATIVE_TITLE,
  '1) 명리 근거 (mustUseFacts에서 가져옴)',
  '2) 쉬운 뜻 (사람이 이해할 수 있게 풀이)',
  '3) 엄마와 아이 사이에서 그것이 어떤 방식으로 나타나는지',
  '4) 좋게 작동할 때 (활성화 방향)',
  '5) 조심하면 좋을 때 (정서·생활 리듬 차원 — 의료/건강 표현 금지)',
  '6) 태교/생활 리듬 차원의 조언 (부적·색상점·방향점 같은 미신 X, 출산일/의료 조언 X)',
  '',
  '[나쁜 예]',
  '  "엄마와 아기는 상극이라 기운이 부딪혀 안 좋습니다."',
  '[좋은 방향]',
  '  "엄마의 차분한 결 위에 아이 예정일 기운이 잔잔한 생기를 더해주는 흐름이라, 서로의 속도가 다를 때 마음이 분주해지기 쉽습니다. ',
  '   그래서 태교에서는 무리해서 채우기보다, 엄마가 편안하게 이어갈 수 있는 잔잔한 리듬을 곁에 두는 정도가 잘 맞습니다."',
].join('\n');

const STYLE_EXAMPLE_DISCLAIMER_TITLE = '[STYLE_EXAMPLE_DISCLAIMER — 예시는 구조 참고용]';

const STYLE_EXAMPLE_DISCLAIMER_BLOCK = [
  STYLE_EXAMPLE_DISCLAIMER_TITLE,
  '- 아래 style example([좋은 예])은 구조 예시일 뿐, 특정 사주값을 복사하지 말 것.',
  '- 예시의 일간·오행·결 표현을 현재 엄마/아이에게 그대로 적용하지 말 것.',
  '- 현재 mustUseFacts에 있는 근거만 사용해서 톤·구조만 참고할 것.',
].join('\n');

const JSON_OUTPUT_RULES_TITLE = '[JSON_OUTPUT_RULES]';

function jsonRulesBlock(sectionId: PregnancyNarrativeSectionId): string {
  return [
    JSON_OUTPUT_RULES_TITLE,
    '- 출력은 JSON 한 덩어리만. 코드펜스(```), 주석, 인사말, 마무리 멘트 금지.',
    '- 첫 글자는 `{`이고 마지막 글자는 `}`이어야 한다.',
    `- 정확히 아래 ${sectionId} schema를 따른다.`,
    '- 모든 string은 사람이 읽을 수 있는 한글 문장. fact id / sectionId / 영문 key 노출 금지.',
  ].join('\n');
}

// ============================================================
// 섹션별 출력 구조 강제 룰
// ============================================================
const SECTION_OUTPUT_RULES: Record<PregnancyNarrativeSectionId, string[]> = {
  motherBabyCard: ['(해당 없음 — LLM 호출 X, 결정적 렌더)'],
  openingConnection: [
    'oneLine은 관계 첫인상을 한 문장으로. 운명·전생 단정 금지.',
    'body는 엄마-아이가 만나는 방식의 따뜻한 framing + 아이가 가져오는 상징적 의미.',
    '반드시 "출생예정일 기준으로 보면" 표현을 자연스럽게 포함.',
  ],
  motherChildMechanism: [
    '일간·오행·용신/기신 결을 본문에 한 흐름으로 (용어 즉시 풀이).',
    '합·충·형·파·해는 나열 금지. "끌어당기는 결 / 조정이 필요한 결" 균형으로.',
    '상생/상극을 좋다/나쁘다로 단정 금지.',
    'evidenceBlocks는 1~3개. 각 block은 Evidence-to-Narrative 6단계를 채운다 (6단계는 태교/생활 조언).',
  ],
  motherComfortRhythm: [
    '엄마가 편안해지는 방식(신강신약·용신·감정 리듬·도움 요청)을 정서 차원으로.',
    '의료·건강·영양·운동 조언 절대 금지.',
    '도움 요청이 약점이 아니라는 방향 + 엄마 탓 금지.',
  ],
  babyEnergyAndFit: [
    '아이 예정일 기준 결을 "예정일 기준으로 보면" 톤으로.',
    '실제 출생일·시간에 따라 달라질 수 있음을 한 번 명시.',
    '엄마와 닮은 점/다른 점 + 잘 맞는 지점 + 태교에서 살릴 방향.',
    '아이 성격 단정 0건.',
  ],
  taegyoGuide: [
    '조심할 태교 패턴 — "많이 하기보다 편안하게 지속"이 핵심.',
    '이 조합에 맞는 태교 3가지를 각각 명리 근거와 함께.',
    '음식/영양/운동 처방 금지. 정서·환경·리듬 중심.',
  ],
  motherFortuneRoutine: [
    '엄마 용신 기반 개운 루틴을 행동 중심(색·공간·소리·기록·정리·도움)으로.',
    '물건 구매·부적 금지. 엄마 자신을 위한 루틴.',
  ],
  familySupportAndFinalMessage: [
    '가족·배우자가 함께 읽어도 좋은 도움 방식(구체적 분담) + 피해야 할 말 / 도움되는 말.',
    'finalMessage 필드에 아이에게 전하는 따뜻한 마지막 한 문장 (운명 단정 금지).',
  ],
  babyNames: ['(해당 없음 — LLM 호출 X)'],
  evidenceView: ['(해당 없음 — LLM 호출 X)'],
};

// ============================================================
// mustUseFacts 렌더
// ============================================================
function renderFact(f: PregnancyMustUseFact): string {
  const lines: string[] = [];
  lines.push(`  - [${f.id} / ${f.source}] fact: "${f.fact}"`);
  lines.push(`      쉬운 풀이: ${f.plainMeaning}`);
  lines.push(`      흡수 힌트: ${f.narrativeHint}`);
  if (f.matchTokens && f.matchTokens.length > 0) {
    lines.push(`      흡수 확인 토큰(내부용 — 본문 노출 금지): ${f.matchTokens.join(', ')}`);
  }
  if (f.sceneHint) {
    const h = f.sceneHint;
    const parts = [
      `상황: ${h.situation}`,
      `엄마 경향: ${h.motherTendency}`,
      h.betterUse ? `더 잘 쓰는 방향: ${h.betterUse}` : '',
    ].filter(Boolean);
    lines.push('      ▷ 엄마-아이 장면 시드 (본문 안에 자연스럽게 녹임):');
    parts.forEach(p => lines.push(`        ${p}`));
  }
  if (f.adviceHint) {
    const a = f.adviceHint;
    const parts = [
      `행동/태교 조언: ${a.actionable}`,
      a.avoidPattern ? `조심할 패턴: ${a.avoidPattern}` : '',
    ].filter(Boolean);
    lines.push('      ▷ 명리 구조 → 태교/생활 조언:');
    parts.forEach(p => lines.push(`        ${p}`));
  }
  return lines.join('\n');
}

function renderFactsBlock(facts: PregnancyMustUseFact[]): string {
  if (facts.length === 0) return '  (mustUseFacts 없음 — 앞뒤 흐름에서만 가볍게 연결)';
  return facts.map(renderFact).join('\n');
}

// ============================================================
// CONTEXT (예정일/시간 입력 여부 주입)
// ============================================================
function contextBlock(ctx: PregnancyNarrativeContext): string {
  return [
    '[CONTEXT — 입력 정보]',
    `- 엄마 이름(호칭): ${ctx.motherName}`,
    `- 아이 출생예정일: ${ctx.dueDateLabel}`,
    `- 아이 예정시간 입력 여부: ${ctx.babyHourKnown ? '있음 (예정시간 기준 참고 — 확정 아님)' : '없음 (예정시간 미입력 → 출생예정일 기준 3주로만 참고)'}`,
    `- 엄마 출생시간 입력 여부: ${ctx.motherHourKnown ? '있음' : '없음 (시간 미상 — 시주는 참고에서 제외)'}`,
    '- 아이에 대한 모든 해석은 "출생예정일 기준으로 보면" 톤을 유지하고, 확정처럼 말하지 않는다.',
  ].join('\n');
}

// ============================================================
// 공통 prompt assembler
// ============================================================
function commonHeader(plan: PregnancyNarrativePlan, ctx: PregnancyNarrativeContext): string {
  return [
    ABSOLUTE_RULES_BLOCK,
    '',
    TONE_RULES_BLOCK,
    '',
    EVIDENCE_TO_NARRATIVE_BLOCK,
    '',
    contextBlock(ctx),
    '',
    `[SECTION] ${plan.sectionId} — "${plan.title}"`,
    `목표: ${plan.sectionGoal}`,
  ].join('\n');
}

function planBodyBlock(plan: PregnancyNarrativePlan): string {
  const beatLines = plan.requiredBeats.map((b, i) => `  ${i + 1}. ${b}`).join('\n');
  const avoidRepLines = plan.avoidRepeating.length > 0
    ? plan.avoidRepeating.map(s => `  - "${s}"`).join('\n') : '  (없음)';
  const avoidPatternsLines = plan.avoidPatterns.length > 0
    ? plan.avoidPatterns.map(s => `  - ${s}`).join('\n') : '  (없음)';
  const toneLines = plan.toneHints.map(s => `  - ${s}`).join('\n');
  const outputRuleLines = (SECTION_OUTPUT_RULES[plan.sectionId] ?? []).map(s => `  - ${s}`).join('\n');
  const repairLines = plan.repairHints && plan.repairHints.length > 0
    ? plan.repairHints.map(s => `  - ${s}`).join('\n') : '  (없음)';

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
    '[REPAIR_HINTS — 다시 작성할 때 우선 점검]',
    repairLines,
  ].join('\n');
}

function styleBlock(plan: PregnancyNarrativePlan): string {
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

function outputBlock(plan: PregnancyNarrativePlan): string {
  const schema = PREGNANCY_NARRATIVE_JSON_SCHEMAS[
    plan.sectionId as keyof typeof PREGNANCY_NARRATIVE_JSON_SCHEMAS
  ];
  return [
    jsonRulesBlock(plan.sectionId),
    '',
    `[OUTPUT_JSON_SCHEMA — ${plan.sectionId}]`,
    schema,
  ].join('\n');
}

const SYSTEM_PROMPT = [
  '당신은 사주 명리학과 글쓰기에 능한 한국어 작가입니다.',
  '단, 점쟁이나 의료인이 아니라 "예비 엄마 곁에서 마음을 다독여주는 다정한 사람"입니다.',
  '',
  '핵심 원칙:',
  '  - 이 리포트는 의료 조언이 아니라 사주적 상징 해석 + 정서 안정 + 태교 방향 + 생활 리듬 추천이다.',
  '  - 태아 건강·조산·유산·분만·성별·출산일을 예측하거나 결정하지 않는다.',
  '  - 아이에 대한 모든 해석은 "출생예정일 기준으로 보면" 톤. 성격·운명 단정 금지.',
  '  - 엄마를 지지하고 안심시킨다. 엄마 탓 표현 금지.',
  '  - computedEvidence(mustUseFacts)에 없는 명리 요소를 새로 만들지 않는다. 태명 창작 금지.',
  '  - 점수·등급으로 평가하지 않는다.',
  '  - 출력은 항상 한 덩어리의 유효한 JSON. 코드펜스/주석/인사말 금지.',
  '',
  '문체: 따뜻한 존댓말. 명리 용어는 즉시 일상어로 풀이. 추상어 단독 금지 — 실제 장면·행동으로.',
].join('\n');

// ============================================================
// 단일 섹션 prompt
// ============================================================
export function buildPregnancyPromptForSection(
  plan: PregnancyNarrativePlan,
  ctx: PregnancyNarrativeContext,
): BuiltPregnancyPrompt | null {
  if (!isLlmSection(plan.sectionId)) return null;
  const schema = PREGNANCY_NARRATIVE_JSON_SCHEMAS[
    plan.sectionId as keyof typeof PREGNANCY_NARRATIVE_JSON_SCHEMAS
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
    '- 의료/건강/출산일/성별/아이 성격 단정 0건. 엄마 탓 0건.',
    '- mustUseFacts에 없는 명리 요소·태명을 만들지 않는다.',
    '- 아이 해석은 "출생예정일 기준으로 보면" 톤. 출력은 JSON 한 덩어리만.',
  ].join('\n');

  return {
    sectionId: plan.sectionId,
    system: SYSTEM_PROMPT,
    user,
    maxTokens: plan.maxTokens ?? 1500,
    outputJsonSchema: schema,
  };
}

export function buildPregnancyPromptsAll(
  plans: PregnancyNarrativePlan[],
  ctx: PregnancyNarrativeContext,
): Map<PregnancyNarrativeSectionId, BuiltPregnancyPrompt> {
  const out = new Map<PregnancyNarrativeSectionId, BuiltPregnancyPrompt>();
  for (const p of plans) {
    const built = buildPregnancyPromptForSection(p, ctx);
    if (built) out.set(p.sectionId, built);
  }
  return out;
}

// ============================================================
// Repair prompt
// ============================================================
function renderRepairIssues(issues: PregnancyRepairIssueRef[]): string {
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

export function buildPregnancyRepairPrompt(
  plan: PregnancyNarrativePlan,
  ctx: PregnancyNarrativeContext,
  repair: PregnancyRepairContext,
): BuiltPregnancyPrompt | null {
  if (!isLlmSection(plan.sectionId)) return null;
  const base = buildPregnancyPromptForSection(plan, ctx);
  if (!base) return null;

  const repairBlock = [
    '[REPAIR_MODE — 직전 출력이 validator를 통과하지 못함]',
    '',
    '[PREVIOUS_OUTPUT (raw)]',
    repair.previousOutput.slice(0, 6000),
    '',
    '[ISSUES — 이 섹션 범위만 다시 고친다]',
    renderRepairIssues(repair.issues),
    '',
    '[REPAIR_RULES]',
    '- 위 issue만 정확히 고친다. 다른 섹션 내용으로 확장 금지.',
    '- ABSOLUTE_RULES / TONE_RULES / EVIDENCE_TO_NARRATIVE / SECTION_OUTPUT_RULES 그대로 유지.',
    '- 의료/출산일/성별/아이 성격 단정·엄마 탓·점수·운명 단정 0건.',
    '- mustUseFacts에 없는 명리 요소·태명을 추가 금지.',
    '- 출력은 동일한 JSON schema로 한 덩어리만.',
  ].join('\n');

  const user = [base.user, '', '────────────────────────────', '', repairBlock].join('\n');

  return {
    sectionId: plan.sectionId,
    system: SYSTEM_PROMPT,
    user,
    maxTokens: plan.maxTokens ?? 1500,
    outputJsonSchema: base.outputJsonSchema,
  };
}

export const PREGNANCY_PROMPT_INTERNAL = {
  ABSOLUTE_RULES_TITLE,
  ABSOLUTE_RULES_LINES,
  TONE_RULES_TITLE,
  EVIDENCE_TO_NARRATIVE_TITLE,
  STYLE_EXAMPLE_DISCLAIMER_TITLE,
  JSON_OUTPUT_RULES_TITLE,
  SECTION_OUTPUT_RULES,
  SYSTEM_PROMPT,
  DETERMINISTIC_SECTIONS,
  DISCLAIMER: PREGNANCY_DISCLAIMER,
};
