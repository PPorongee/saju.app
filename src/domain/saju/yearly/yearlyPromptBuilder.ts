// Yearly Fortune V4 — Prompt Builder (Y4)
//
// 역할:
//   - YearlyPlan을 입력받아 section별 prompt 생성 (sectionwise GPT 호출용)
//   - sectionId별 출력 규칙 명확화 + JSON schema 강제
//   - mustUseFacts / requiredBeats / avoidPatterns / toneHints / styleExamples / repairHints를 prompt에 반영
//   - Evidence-to-Narrative 흐름 강제
//   - 계산되지 않은 명리 요소 추가 금지
//   - evidenceView는 LLM 호출 없음 (deterministic UI 렌더) — null 반환
//
// 절대규칙 (ABSOLUTE_RULES):
//   - computedEvidence 외 명리 요소 추가 금지
//   - 단정 미래 예측 금지 (반드시/무조건/100%/틀림없이)
//   - 결혼/출산/이혼/사고/죽음 단정 금지
//   - 투자 조언 금지 (매수/매도/시세/수익률/시장 타이밍/코인/주식/레버리지)
//   - 의학 진단/질병 예측/치료/약물 금지
//   - relationshipStatus unknown이면 아내/남편/배우자/자녀 단정 금지
//   - 영문 오행 key (wood/fire/earth/metal/water) 출력 금지
//   - validator log/issue 내부명 사용자 노출 금지

import type {
  YearlyPlan, YearlyFortuneSectionId, YearlyMustUseFact, YearlyRelationshipStatus,
} from './yearlyTypes';

// ============================================================
// 입력/출력 타입
// ============================================================
export interface YearlyPromptContext {
  /** 사용자가 응답한 relationship 상태. 미응답이면 'unknown'. */
  relationshipStatus: YearlyRelationshipStatus;
  /** 올해 (세운 기준 연도) */
  targetYear: number;
}

export interface BuiltYearlyPrompt {
  sectionId: YearlyFortuneSectionId;
  system: string;
  user: string;
  maxTokens: number;
  /** 파서가 기대하는 JSON shape (개발/디버깅용 — prompt에도 포함됨) */
  outputJsonSchema: string;
}

export interface YearlyRepairIssueRef {
  type: string;
  sectionId: string;
  sentence?: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestion?: string;
}

export interface YearlyRepairContext {
  /** 직전 시도의 raw 출력 (parser 통과 여부 무관) */
  previousOutput: string;
  /** validator가 잡은 issue 목록 (이 섹션 관련만 전달 권장) */
  issues: YearlyRepairIssueRef[];
}

// ============================================================
// ABSOLUTE_RULES — 모든 prompt 최상단에 prepend
// ============================================================
const ABSOLUTE_RULES_TITLE = '[ABSOLUTE_RULES — 위반 시 출력 폐기]';

const ABSOLUTE_RULES_LINES: string[] = [
  '1) computedEvidence(아래 mustUseFacts)에 없는 명리 요소를 새로 만들지 말 것.',
  '   - 사주 원국, 대운, 세운, 월운, 신살, 용신/기신, 합·충·형·파·해를 임의로 추가 금지.',
  '   - 모든 해석의 근거는 mustUseFacts에서만 끌어와야 한다.',
  '2) 단정적 미래 예측 금지.',
  '   - "반드시", "무조건", "100%", "틀림없이", "꼭", "필연적으로", "분명히" 금지.',
  '3) 결혼/출산/이혼/사고/사망/파산 등 사건 단정 금지.',
  '   - "이번 해에 결혼합니다", "이직합니다", "큰돈이 들어옵니다" 같은 단정 문장 X.',
  '   - "변화 신호가 생길 수 있어요", "흐름이 강해질 수 있어요" 톤만 허용.',
  '4) 투자 조언 절대 금지.',
  '   - 매수 / 매도 / 시세 / 수익률 / 레버리지 / 시장 타이밍 / 투자 타이밍 / 거래 타이밍 단어 금지.',
  '   - 코인 / 주식 / 단기 투자 / 트레이딩 / 큰돈을 굴린다 표현 금지.',
  '   - 돈은 "보상 기준 / 작업 범위 / 수익 구조 / 정산 / 계약 조건" 결로만 다룬다.',
  '5) 의학적 진단/질병 예측/치료/약물 조언 금지.',
  '   - 질병명, 발병, 진단, 치료, 약물, 중병, 위독 단어 금지.',
  '   - 건강은 "수면, 생각 과부하, 감정 소모, 루틴, 회복" 결로만 다룬다.',
  '6) relationshipStatus가 unknown이면 아내/남편/배우자/자녀 단정 금지.',
  '   - 중립 표현: "가까운 관계", "장기적인 관계를 생각한다면", "후배·제자·돌봄 대상".',
  '7) 영문 오행 key 출력 금지.',
  '   - wood / fire / earth / metal / water 그대로 노출 X. 반드시 한글 목/화/토/금/수.',
  '8) validator log, issue 내부명, plan id, fact id를 사용자에게 보이는 문장에 노출 금지.',
  '   - 예: "missing-useful-god-link", "ym-currentDaewoon" 등의 내부 토큰 출력 X.',
  '9) 다른 섹션 영역 침범 금지.',
  '   - 이 섹션 prompt는 자기 섹션만 작성한다. 다른 섹션의 결론을 미리 내놓지 말 것.',
];

const ABSOLUTE_RULES_BLOCK = [ABSOLUTE_RULES_TITLE, ...ABSOLUTE_RULES_LINES].join('\n');

// ============================================================
// 올해운세 톤 규칙 (예언서 X / 타이밍 사용설명서 O)
// ============================================================
const YEARLY_TONE_RULES_TITLE = '[YEARLY_TONE_RULES — 올해운세는 예언서가 아니라 "타이밍 사용설명서"]';

const YEARLY_TONE_GOOD: string[] = [
  '"올해는 이 흐름이 강합니다."',
  '"현실에서는 이런 장면으로 나타날 수 있습니다."',
  '"이럴 때는 이렇게 움직이는 것이 좋습니다."',
  '"다만 이 선택은 피하는 편이 좋습니다."',
];

const YEARLY_TONE_BAD: string[] = [
  '"올해 대박납니다."',
  '"무조건 귀인이 옵니다."',
  '"반드시 이직합니다."',
  '"연애운이 폭발합니다."',
  '"돈이 크게 들어옵니다."',
];

const YEARLY_TONE_RULES_BLOCK = [
  YEARLY_TONE_RULES_TITLE,
  '좋은 톤 (이 결을 따른다):',
  ...YEARLY_TONE_GOOD.map(s => `  - ${s}`),
  '나쁜 톤 (절대 쓰지 않는다):',
  ...YEARLY_TONE_BAD.map(s => `  - ${s}`),
  '문체: 친근한 존댓말. 반말 금지. 명리 용어가 등장하면 즉시 일상어로 풀이.',
  '명리 근거(세운 간지·십성, 대운, 용신/기신 관계, 합·충, 신살 등)는 별도 목록으로 나열하지 말고, 각 해석 문장 안에 "왜 그런 흐름인지"로 자연스럽게 녹여라. 근거가 곧 신뢰이므로 빼먹지 말되, 어려운 용어는 그 자리에서 바로 쉬운 말로 풀어 설명한다.',
  '🚫 [명리 전문용어 노출 절대 금지] 사용자가 보는 문장에는 다음 용어를 그대로 쓰지 마: 대운·세운·월운·일간·천간·지지·지장간·본기·여기·중기·편관·정관·편인·정인·식신·상관·비견·겁재·편재·정재·비겁·식상·재성·관성·인성·반합·삼합·방합·합·충·형·파·해·신강·신약·중화·용신·기신·오행, 그리고 간지 이름(병술·갑오·을미 등). 이 용어들은 내부 근거일 뿐이고, 본문에는 그 "뜻"만 보통 사람 말로 적는다. 한자/한자어 명리 술어가 한 개라도 본문에 보이면 실패다.',
  '변환 예시: "현재 대운 병술이 천간에서 편관의 기운을 준다" → "지금 거쳐가는 시기 자체가, 나를 시험하듯 책임을 무겁게 지우는 환경이에요"; "지지에서 본기 편인이 작동" → "그 안쪽에는 혼자 깊이 파고들고 배우려는 결도 함께 흐르고요"; "올해 화 기운은 중립적" → "올해 새로 들어오는 기운은 크게 밀거나 당기지 않고 지금 흐름을 그대로 이어가는 편"; "오술 반합으로 흐름이 모인다" → "여러 일이 한 방향으로 모이는 흐름"; "신강 구조라 지원적" → "원래 에너지가 단단한 편이라 이 흐름을 무리 없이 받쳐줘요".',
].join('\n');

// ============================================================
// Evidence-to-Narrative 규칙
// ============================================================
const EVIDENCE_TO_NARRATIVE_TITLE = '[EVIDENCE_TO_NARRATIVE — 각 핵심 해석은 아래 흐름으로 풀어야 한다]';

const EVIDENCE_TO_NARRATIVE_BLOCK = [
  EVIDENCE_TO_NARRATIVE_TITLE,
  '1) 명리 근거 (mustUseFacts에서 가져옴)',
  '2) 쉬운 뜻 (사람이 이해할 수 있게 풀이)',
  '3) 올해 현실에서 어떤 장면으로 나타날 수 있는지',
  '4) 좋게 쓰이는 방식 (활성화 패턴)',
  '5) 꼬일 수 있는 방식 (회피 패턴)',
  '6) 선택 전략 (행동/환경/구조화 — 부적·색상·방향 같은 미신 X)',
  '',
  '[나쁜 예]',
  '  "올해 재성이 들어와 돈운이 있습니다."',
  '[좋은 방향] (명리 용어 없이, 뜻만 일상어로)',
  '  "올해는 돈 자체보다, 현실적인 조건과 보상 기준·사람과의 약속이 중요해지는 흐름으로 볼 수 있습니다. ',
  '   그래서 큰 한 방을 기대하기보다, 내가 맡는 일의 범위와 보상 기준을 또렷이 정해 둘 때 흐름이 안정적으로 살아납니다."',
].join('\n');

// ============================================================
// styleExamples 사용 규칙 (모든 prompt에 포함)
// ============================================================
const STYLE_EXAMPLE_DISCLAIMER_TITLE = '[STYLE_EXAMPLE_DISCLAIMER — 예시는 참고용]';

const STYLE_EXAMPLE_DISCLAIMER_BLOCK = [
  STYLE_EXAMPLE_DISCLAIMER_TITLE,
  '- 아래 [좋은 예]의 문장을 그대로 복사하지 말 것.',
  '- 예시에 등장하는 일간·오행·연도·십성 표현을 현재 사용자에게 그대로 적용하지 말 것.',
  '- 현재 computedEvidence(mustUseFacts)에 있는 근거만 사용해서 톤·구조만 참고할 것.',
].join('\n');

// ============================================================
// JSON 출력 강제 규칙
// ============================================================
const JSON_OUTPUT_RULES_TITLE = '[JSON_OUTPUT_RULES]';

function jsonRulesBlock(schemaName: string): string {
  return [
    JSON_OUTPUT_RULES_TITLE,
    '- 출력은 JSON 한 덩어리만. 코드펜스(```), 주석, 인사말, 마무리 멘트 금지.',
    '- 첫 글자는 `{`이고 마지막 글자는 `}`이어야 한다.',
    `- 정확히 아래 ${schemaName} schema를 따른다.`,
    '- 모든 string은 사람이 읽을 수 있는 한글 문장. plan id/fact id/영문 key 금지.',
  ].join('\n');
}

// ============================================================
// 섹션별 JSON schema
// ============================================================
const JSON_SCHEMAS: Record<YearlyFortuneSectionId, string> = {
  yearFlowCard: [
    '{',
    '  "sectionId": "yearFlowCard",',
    '  "yearFlowCard": {',
    '    "title": string,        // 카드 제목 한 줄',
    '    "subtitle": string,     // 부제 1문장',
    '    "keywords": [string, string, string],  // 단어 3개',
    '    "summary": string       // 3~5문장',
    '  },',
    '  "yearlyOverview": {',
    '    "oneLine": string,      // 한 줄 요약',
    '    "body": string          // 3~5문장 본문',
    '  }',
    '}',
  ].join('\n'),

  yearlyMechanism: [
    '{',
    '  "sectionId": "yearlyMechanism",',
    '  "yearlyMechanism": {',
    '    "body": string,         // 줄글 본문 (대운→세운→궁→신강/신약→용신/기신 흐름)',
    '    "evidenceBlocks": [     // 1~3개의 Evidence-to-Narrative block',
    '      {',
    '        "sectionId": "yearlyMechanism",',
    '        "evidence": [ { "label": string, "plainMeaning": string, "role": "main"|"support"|"tension"|"caution" } ],',
    '        "causalExplanation": string,',
    '        "lifeScene": string,',
    '        "positiveUse": string,',
    '        "shadowPattern": string,',
    '        "practicalAdvice": string',
    '      }',
    '    ]',
    '  }',
    '}',
  ].join('\n'),

  remainingMonths: [
    '{',
    '  "sectionId": "remainingMonths",',
    '  "remainingMonths": [',
    '    {',
    '      "monthLabel": string,      // 예: "6월 흐름"',
    '      "periodLabel": string,     // 예: "2026-06-05 ~ 2026-07-06 (망종~소서 전)"',
    '      "keyword": string,         // 한 줄 (일반론 금지)',
    '      "body": string,            // 4~6문장',
    '      "work": string,            // 일 영역 1~2문장',
    '      "money": string,           // 돈 영역 1~2문장 (투자 조언 0)',
    '      "relationship": string,    // 관계 영역 1~2문장 (단정 0)',
    '      "goodChoice": string,      // 좋은 선택 1문장',
    '      "caution": string          // 주의 1문장',
    '    }',
    '  ]',
    '}',
    '※ remainingMonths 배열의 개수는 mustUseFacts의 월운 fact 개수와 정확히 같아야 한다.',
  ].join('\n'),

  topicFortunes: [
    '{',
    '  "sectionId": "topicFortunes",',
    '  "topicFortunes": {',
    '    "career": string,        // 일·커리어 + (해당 시) 공부·시험·문서·합격 (단정 X)',
    '    "money": string,         // 돈·수익 (투자 조언 0)',
    '    "relationship": string,  // 관계·연애·새 인연·대인관계 (relationshipStatus 정책 준수)',
    '    "rhythm": string         // 생활 리듬·멘탈 + 건강(체력·수면) + 이동/이사·환경 변화 (의학 진단 0)',
    '  }',
    '}',
  ].join('\n'),

  actionGuide: [
    '{',
    '  "sectionId": "actionGuide",',
    '  "actionGuide": {',
    '    "mustCatch": [string, ...],   // 잡아야 할 행동 2~4개',
    '    "betterAvoid": [string, ...], // 흘려보낼 행동 2~3개',
    '    "bestStrategy": string         // 저장하고 싶은 한 문장 전략',
    '  }',
    '}',
  ].join('\n'),

  nextTwoYears: [
    '{',
    '  "sectionId": "nextTwoYears",',
    '  "nextTwoYears": [',
    '    {',
    '      "year": number,         // 예: 2027',
    '      "keyword": string,      // 핵심 키워드 한 줄',
    '      "summary": string,      // 3~5문장 (올해보다 짧게)',
    '      "opportunity": string,  // 잡으면 좋은 결 한 줄',
    '      "caution": string       // 주의할 결 한 줄',
    '    }',
    '  ]',
    '}',
    '※ nextTwoYears 배열은 정확히 2개.',
  ].join('\n'),

  evidenceView: '(해당 없음 — LLM 호출 X, UI deterministic 렌더)',
};

// ============================================================
// 섹션별 출력 구조 강제 룰
// ============================================================
const SECTION_OUTPUT_RULES: Record<YearlyFortuneSectionId, string[]> = {
  yearFlowCard: [
    'title은 한 줄 (예: "쌓아둔 것을 밖으로 꺼내는 해" 톤).',
    'subtitle은 한 문장.',
    'keywords는 정확히 3개의 단어.',
    'summary는 3~5문장. 합·충·형·파·해를 너무 많이 나열 금지.',
    'yearlyOverview.oneLine은 카드 본문과 다른 표현으로.',
    '카드는 짧고 임팩트 있게. 길게 풀어쓰지 말 것.',
  ],
  yearlyMechanism: [
    '원국 + 대운(큰 환경) + 세운(올해) + 신강/신약 + 용신/기신 + 대표 합·충 1~3개를 한 흐름으로.',
    '세운이 어느 궁(년/월/일/시주)을 건드리는지 1~2개만.',
    '"신강=좋다 / 신약=나쁘다" 단정 금지.',
    '합/충은 "연결·흔들림·조정" 톤. 좋다/나쁘다 단정 금지.',
    '구조: 명리 근거 → 결과 → 현실 장면 → 선택 전략.',
    '개인사주식 성격 풀이로 흐르지 말 것 (이 섹션은 "올해 운이 어떻게 움직이는지"에 집중).',
    'evidenceBlocks는 1~3개. 각 block은 Evidence-to-Narrative 6단계를 모두 채운다.',
  ],
  remainingMonths: [
    '각 월: keyword 1줄 + body 4~6문장 + work + money + relationship + goodChoice + caution.',
    '월 keyword는 일반론 금지 (예: "좋은 달", "조심할 달", "변화의 달", "평범한 달").',
    '"올해 세운 흐름 안에서 이 달에 어떤 주제가 강해지는가" 톤. 단독 해석 금지.',
    '"몇 월에 무조건 이직/연애/돈" 같은 단정 금지.',
    '월별 분량은 균형 있게. 카드형 아닌 줄글.',
    '⚠️ 인접한 달끼리 같은 표현·문장·조언을 반복하지 말 것. 각 달은 그 달 고유의 간지·합충·keyword에 맞춰 서로 다른 장면과 조언으로 써. 십성 계열이 비슷해도(예: 두 달 다 관성 계열) 정관/편관의 결 차이와 그 달 월지(月支)의 결을 살려 또렷이 구분해.',
    'money는 투자 조언 절대 금지.',
    'relationship은 relationshipStatus 정책 준수.',
  ],
  topicFortunes: [
    'career / money / relationship / rhythm 네 영역 모두 작성.',
    'career: 일·커리어가 중심이되, 해당되면 공부·시험·자격·문서·합격의 결도 자연스럽게 포함. 학업·시험이 관심사이거나 사회초년/학생 결이면 시험·도전 운의 비중을 높여라.',
    'money: 매수/매도/시세/수익률/시장 타이밍/투자 타이밍/코인/주식/레버리지 단어 0건.',
    'money는 "보상 기준 / 작업 범위 / 수익 구조 / 정산 / 계약 조건" 결로만.',
    'relationship: 연애에만 머물지 말고 새로운 인연·대인관계·기존 관계의 변화까지 폭넓게 다뤄라. relationshipStatus 정책 준수 — single이면 "새로운 인연이 들어올 수 있는 흐름"을 비중 있게, dating이면 관계가 깊어지거나 한 단계 나아가는 결, married면 동반자 관계의 결로.',
    'relationship: relationshipStatus unknown이면 아내/남편/배우자/자녀 단정 0건. 중립 표현.',
    'rhythm: 생활 리듬·멘탈에 더해 건강(체력·수면·컨디션·생활습관)과 이동/환경 변화(이사·이동·생활 공간이나 환경이 바뀌는 결)도 함께 다뤄라. 단 질병/진단/치료/약물/발병/중병 단어 0건 — 생활 관리 관점으로만.',
    '각 영역은 "이런 선택이 안정적이다"로 마무리.',
  ],
  actionGuide: [
    'mustCatch: 구체 행동 2~4개. 추상 표현 금지 ("최선을 다하면", "긍정적으로" 같은 일반론 X).',
    'betterAvoid: 구체 회피 행동 2~3개. 단정 미래 사건 X.',
    'bestStrategy: 저장하고 싶을 만큼 기억에 남는 한 문장.',
    '용신/기신을 부적·색상·방향 같은 미신으로 풀지 말 것. 행동·환경·구조화로 번역.',
    '신강/신약을 사람 강약 단정 금지. 추진/협업 구조 균형으로.',
  ],
  nextTwoYears: [
    '정확히 2개 연도 (targetYear+1, targetYear+2).',
    '각 연도: keyword 한 줄 + summary 3~5문장 + opportunity 한 줄 + caution 한 줄.',
    'summary는 올해(yearlyMechanism) 본문보다 길지 않게.',
    '월별 흐름 만들지 말 것.',
    '단정 예언 (반드시 이직/결혼/돈) 금지.',
  ],
  evidenceView: ['(해당 없음 — LLM 호출 X)'],
};

// ============================================================
// relationship 정책 hint
// ============================================================
function relationshipPolicyHint(status: YearlyRelationshipStatus): string {
  switch (status) {
    case 'unknown':
      return 'relationshipStatus = unknown → 아내/남편/배우자/자녀 단정 금지. "가까운 관계" / "장기적 관계를 생각한다면" / "주변 사람" 중립 표현.';
    case 'single':
      return 'relationshipStatus = single → 결혼/배우자/자녀 단정 금지. "관계가 시작될 수 있는 흐름" / "가까워지는 사람" 중립 표현.';
    case 'dating':
      return 'relationshipStatus = dating → 결혼/배우자 단정 금지. 현재 만나는 사람 결을 자연스럽게.';
    case 'married':
      return 'relationshipStatus = married → 배우자라는 표현은 가능하나, 이혼/별거 단정 금지.';
    case 'divorced':
      return 'relationshipStatus = divorced → 재혼 단정 금지. 관계 결의 변화 톤으로.';
    default:
      return 'relationshipStatus 미상 → 관계 단정 금지.';
  }
}

// ============================================================
// mustUseFacts 렌더 (개인사주 narrativePromptBuilder 패턴 차용)
// ============================================================
function renderFact(f: YearlyMustUseFact): string {
  const lines: string[] = [];
  lines.push(`  - [${f.id} / ${f.source}] 내부 근거(이 명리 용어·표현을 본문에 그대로 쓰지 말 것 — 뜻만 활용): "${f.fact}"`);
  lines.push(`      ✅ 본문에는 이 "쉬운 풀이"의 결만 일상어로 녹여라: ${f.plainMeaning}`);
  lines.push(`      흡수 힌트: ${f.narrativeHint}`);
  if (f.lifeSceneHint) {
    const h = f.lifeSceneHint;
    const sceneParts = [
      `상황: ${h.situation}`,
      `행동 가능성: ${h.likelyBehavior}`,
      `내면 반응: ${h.innerReaction}`,
      h.externalMisunderstanding ? `외부 오해: ${h.externalMisunderstanding}` : '',
      h.betterUse ? `더 잘 쓰는 방향: ${h.betterUse}` : '',
    ].filter(Boolean);
    lines.push('      ▷ 실제 장면 시드 (본문 안에 자연스럽게 녹임):');
    sceneParts.forEach(p => lines.push(`        ${p}`));
  }
  if (f.adviceHint) {
    const a = f.adviceHint;
    const parts = [
      `행동 조언: ${a.actionable}`,
      a.avoidPattern ? `운이 막히는 선택: ${a.avoidPattern}` : '',
      a.activatePattern ? `운이 살아나는 선택: ${a.activatePattern}` : '',
    ].filter(Boolean);
    lines.push('      ▷ 명리 구조 → 행동 조언 (원인·결과·현실 장면 다음에 자연스럽게 연결):');
    parts.forEach(p => lines.push(`        ${p}`));
  }
  return lines.join('\n');
}

function renderFactsBlock(facts: YearlyMustUseFact[]): string {
  if (facts.length === 0) return '  (mustUseFacts 없음 — 본 섹션은 LLM 호출 대상 아님)';
  return facts.map(renderFact).join('\n');
}

// ============================================================
// 공통 prompt assembler
// ============================================================
function commonHeader(plan: YearlyPlan, ctx: YearlyPromptContext): string {
  return [
    ABSOLUTE_RULES_BLOCK,
    '',
    YEARLY_TONE_RULES_BLOCK,
    '',
    EVIDENCE_TO_NARRATIVE_BLOCK,
    '',
    `[CONTEXT]`,
    `- targetYear: ${ctx.targetYear}`,
    `- ${relationshipPolicyHint(ctx.relationshipStatus)}`,
    '',
    `[SECTION] ${plan.sectionId} — "${plan.title}"`,
    `목표: ${plan.sectionGoal}`,
  ].join('\n');
}

function planBodyBlock(plan: YearlyPlan): string {
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
    `[TOPIC_TARGETS] ${topicTargetsLine}`,
    '',
    '[REPAIR_HINTS — 다시 작성할 때 우선 점검]',
    repairLines,
  ].join('\n');
}

function styleBlock(plan: YearlyPlan): string {
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

function outputBlock(plan: YearlyPlan): string {
  return [
    jsonRulesBlock(plan.sectionId),
    '',
    `[OUTPUT_JSON_SCHEMA — ${plan.sectionId}]`,
    JSON_SCHEMAS[plan.sectionId],
  ].join('\n');
}

// ============================================================
// SYSTEM prompt — 모든 섹션 공통
// ============================================================
const SYSTEM_PROMPT = [
  '당신은 사주 명리학과 글쓰기에 능한 한국어 작가입니다.',
  '단, 점쟁이가 아니라 "타이밍 사용설명서를 쓰는 안내자"입니다.',
  '',
  '핵심 원칙:',
  '  - 단정 미래 예측 금지. 모든 문장은 흐름/가능성/선택 전략 톤.',
  '  - computedEvidence(mustUseFacts)에 없는 명리 요소를 새로 만들지 않는다.',
  '  - 투자 조언, 의학 진단, 사건 단정은 절대 금지.',
  '  - 출력은 항상 한 덩어리의 유효한 JSON. 코드펜스/주석/인사말 금지.',
  '',
  '문체:',
  '  - 친근한 존댓말. 반말 금지.',
  '  - 명리 용어가 등장하면 즉시 일상어로 풀이.',
  '  - 한 섹션은 다른 섹션을 침범하지 않는다.',
].join('\n');

// ============================================================
// 단일 섹션 prompt 빌드
// ============================================================
export function buildYearlyPromptForSection(
  plan: YearlyPlan,
  ctx: YearlyPromptContext,
): BuiltYearlyPrompt | null {
  // evidenceView는 LLM 호출 없음
  if (plan.sectionId === 'evidenceView') return null;

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
    '- 위 ABSOLUTE_RULES, YEARLY_TONE_RULES, EVIDENCE_TO_NARRATIVE, SECTION_OUTPUT_RULES를 모두 지킨다.',
    '- mustUseFacts에 없는 명리 요소를 끌어오지 않는다.',
    '- 다른 섹션의 결론은 미리 내놓지 않는다.',
    '- 출력은 JSON 한 덩어리만.',
  ].join('\n');

  return {
    sectionId: plan.sectionId,
    system: SYSTEM_PROMPT,
    user,
    maxTokens: plan.maxTokens ?? 1200,
    outputJsonSchema: JSON_SCHEMAS[plan.sectionId],
  };
}

// ============================================================
// 전체 plan set → section별 prompt Map
// ============================================================
export function buildYearlyPromptsAll(
  plans: YearlyPlan[],
  ctx: YearlyPromptContext,
): Map<YearlyFortuneSectionId, BuiltYearlyPrompt> {
  const out = new Map<YearlyFortuneSectionId, BuiltYearlyPrompt>();
  for (const p of plans) {
    const built = buildYearlyPromptForSection(p, ctx);
    if (built) out.set(p.sectionId, built);
  }
  return out;
}

// ============================================================
// Repair prompt — section validation 실패 시 재호출용
// ============================================================
function renderRepairIssues(issues: YearlyRepairIssueRef[]): string {
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

export function buildYearlyRepairPrompt(
  plan: YearlyPlan,
  ctx: YearlyPromptContext,
  repair: YearlyRepairContext,
): BuiltYearlyPrompt | null {
  if (plan.sectionId === 'evidenceView') return null;

  const base = buildYearlyPromptForSection(plan, ctx);
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
    '- ABSOLUTE_RULES / YEARLY_TONE_RULES / EVIDENCE_TO_NARRATIVE / SECTION_OUTPUT_RULES 그대로 유지.',
    '- mustUseFacts에 없는 명리 요소를 추가 금지.',
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
export const YEARLY_PROMPT_INTERNAL = {
  ABSOLUTE_RULES_TITLE,
  ABSOLUTE_RULES_LINES,
  YEARLY_TONE_RULES_TITLE,
  EVIDENCE_TO_NARRATIVE_TITLE,
  STYLE_EXAMPLE_DISCLAIMER_TITLE,
  JSON_OUTPUT_RULES_TITLE,
  JSON_SCHEMAS,
  SECTION_OUTPUT_RULES,
  SYSTEM_PROMPT,
};
