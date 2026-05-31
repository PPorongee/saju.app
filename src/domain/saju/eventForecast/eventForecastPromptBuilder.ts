// Life Event Forecast V1 — 프롬프트 빌더 (줄글/타임라인형, 큰 사건 중심).
//
// compact evidence만 받아 모드별 {system,user} 프롬프트를 만든다. 별도 1회 호출.
// 기존 섹션 프롬프트에는 손대지 않음(중복 append 없음).

import type { EventForecastEvidence, EventForecastMode, RelationshipStatus } from './eventForecastTypes';

export interface BuiltEventForecastPrompt {
  system: string;
  user: string;
  maxTokens: number;
}

const SYSTEM = [
  '당신은 사주 명리로 "앞으로 들어올 큰 사건"을 예보하는 한국어 작가입니다.',
  '무료 운세의 뻔한 생활 조언이 아니라, 유료 사주에서 사용자가 정말 보고 싶어하는 "내 삶에 실제로 어떤 일이 들어올 수 있는가"를 씁니다.',
  '작은 루틴(명상·스트레칭·소통·생활 점검)으로 도망가지 않습니다. 이동수·이사·직장 변화·돈 흐름·계약·부동산·자녀/가족·관계·사업·문서 같은 "큰 사건"을 먼저 말하고, 조건을 뒤에 붙입니다.',
  '선명하게 말하되 결과 보장은 하지 않습니다. 출력은 유효한 JSON 한 덩어리(코드펜스/주석/인사말 금지, 첫 글자 "{" 마지막 "}").',
].join('\n');

const BANNED_PHRASES = [
  '가능성이 있습니다', '가능성이 큽니다', '중요합니다', '필요합니다', '활용해보세요', '활용하는 것이', '열린 마음',
  '긍정적으로 대응', '팀워크', '커뮤니케이션을 늘리세요', '소통을 강화', '정리해 공유', '생활 패턴을 점검', '점검하는 것이',
  '무리하지 마세요', '좋은 인연을 쌓아보세요', '기회를 잘 활용', '명확히 하는 것이', '강화하는 것이', '스트레칭', '명상', '하루 목표', '소통하세요',
];

const TONE = [
  '[문체 — 유료 사주답게 선명하게, 결과 보장 없이]',
  '- 금지 표현(무료 운세·자기계발 냄새, 한 번도 쓰지 말 것): ' + BANNED_PHRASES.join(' / '),
  '- 문장을 "~이 중요합니다 / ~이 필요합니다 / ~점검하세요 / ~소통하세요 / ~활용하세요"로 끝내지 말 것. 조언은 충고가 아니라 인과+타이밍으로.',
  '',
  '[lead 규칙] lead는 반드시 "구체 연도/시기 + 실제 사건 2개"를 담는다. 예: "2026년 일터의 판이 바뀌고, 2028년 돈줄이 열립니다 — 그 사이 사는 곳도 한 번 옮깁니다."',
  '  금지 lead: "변화의 흐름이 당신의 삶에 큰 영향을 미칠 것입니다", "여러 가지 큰 사건이…", "다가오는 시기에는…" 같은 0정보 도입.',
  '',
  '[forecast 규칙] 사건을 "구체적 형태"로 지목. 예: 돈=보너스·정산·자산 매각·계약금 중 하나 / 직장=상사 교체·팀 재편·보고라인 변경 / 이동=직장 따라 이사·생활권 이동 / 관계=동거 거론·양가 인사·만남 빈도 변화. "흐름이 들어옵니다"로만 끝내지 말 것.',
  '',
  '[decisionAdvice 규칙] 체크리스트("조건은 ~, 신호는 ~")가 아니라 인과+타이밍 한 문장. 형식: "○○를 받으면/넘기면 ○○ 시기에 ○○로 돌아온다" 또는 "여기서 갈리는 지점은 ○○다 — ○○면 ○○로 간다".',
  '',
  '[GOLD 예시 — 이 결을 따른다(복붙 금지, 사용자 근거로 변형)]',
  '  · "2028년 목돈이 한 번 들어온다(보너스·정산·자산 매각 중 하나). 같은 해 가족 부양 지출이 겹쳐 들어온 만큼 나가는 구조가 된다."',
  '  · "35세 이전 한 번 생활권을 통째로 옮긴다 — 직장 따라 이사하거나, 이사가 이직을 끌고 온다. 둘은 한 묶음으로 움직인다."',
  '  · "6월 초, 역할을 다시 정하자는 얘기가 나온다. 모호하게 넘기면 12월 평가 시즌에 권한 없이 책임만 늘어난 채 돌아온다."',
  '  · (궁합) "2027년, 같이 사는 문제 또는 양가 인사 얘기가 처음 식탁에 오른다. 결정이 아니라 거론되는 해다."',
];

// 사건 축별 허용/금지 표현 (선명하되 단정 금지)
const AXIS_RULES = [
  '[사건 축 표현 규칙]',
  '- 이동수: "이동수가 들어옵니다 / 집·근무지·생활권·자주 오가는 장소 중 하나가 바뀌는 흐름". 금지: "반드시 이사한다", 특정 지역 지정.',
  '- 직장 변화: "일하는 판이 바뀝니다 / 같이 일하는 사람·역할·평가 기준 중 하나가 달라집니다 / 권한 없이 책임만 커지면 소모". 금지: "반드시 이직/퇴사하라".',
  '- 돈: "돈의 흐름이 열립니다 / 고정 수입·계약·정산·가격 기준을 다시 잡을 때 살아납니다 / 변동성 큰 승부수는 맞지 않습니다". 금지: 돈 번다 확정, 주식·코인 매수/매도 지시, 수익률 보장.',
  '- 부동산/큰 계약: "부동산·큰 계약을 건드릴 수 있는 운 / 대출·보증금·계약 기간·가족 동선을 먼저 / 빨리 잡는 운이 아니라 조건을 다시 따지는 운". 금지: 사라/팔아라/계약해라 확정.',
  '- 자녀/가족: "자녀운이 들어옵니다 / 아이 계획·교육비·양육 분담·가족 책임이 움직입니다". 금지: 임신·출산 확정, 아이 건강/성별/운명 단정, 엄마 탓.',
  '- 사업/동업: "키우기보다 구조를 다시 짜는 운 / 고객·계약이 생기지만 조건을 먼저 / 동업은 역할과 돈의 기준이 먼저". 금지: 사업 성공 확정, 투자 권유.',
  '- 문서/행정/법적: "서류·계약·자격·행정 처리 운 / 문서 확인이 일을 살립니다". 금지: 법률 판단 대체.',
];

function relationshipRule(status: RelationshipStatus): string {
  switch (status) {
    case 'married':
      return '[관계 규칙] 기혼 — 새로운 연애 인연/새 사람과 깊어지는 관계 절대 금지. 관계운은 "배우자·가족·집안 결정·생활권·역할 분담·자녀 문제"로만 변환.';
    case 'single':
      return '[관계 규칙] 미혼 — 새 인연/깊어지는 인연 허용. 다만 "반드시 만난다/결혼한다" 단정 금지. "인연운이 열리는 구간"으로.';
    case 'dating':
      return '[관계 규칙] 연애 중 — 관계 공식화·동거·결혼 논의 가능성은 조심스럽게 허용(단정 금지). 새 사람과의 인연은 강조하지 말 것.';
    case 'divorced':
      return '[관계 규칙] 이혼 — 재혼 단정 금지. 관계 결의 변화·정리 톤으로.';
    default:
      return '[관계 규칙] 관계 상태 미상 — 연애/결혼 단정 금지. "가까운 관계·가족·주변 사람" 중립 표현.';
  }
}

const MODE_TITLE: Record<EventForecastMode, string> = {
  personal: '앞으로 들어올 큰 변화',
  yearly: '올해의 사건 타이밍',
  compat: '이 관계에서 들어올 사건들',
  pregnancy: '엄마를 편하게 하는 흐름',
};

function modeStructure(mode: EventForecastMode, status: RelationshipStatus): string[] {
  switch (mode) {
    case 'personal': {
      const relObligation = (status === 'single' || status === 'dating')
        ? '- 필수(없으면 실패): majorEvents에 eventType:"relationship" 카드 정확히 1장 — 언제 인연이 움직이는지 + 들어오는 사람의 결(성향). "반드시 만난다/결혼한다" 단정만 금지. 직장 카드만 채우지 말 것.'
        : '- 필수(없으면 실패): majorEvents에 eventType:"family_child" 카드 1장(집안 돈·역할·자녀·생활권 결정). 기혼/이혼이면 새 연애 인연 절대 금지.';
      return [
        '[구조] 1~3년 안에 들어올 큰 사건 3~4개를 majorEvents로(작은 루틴 금지). 축을 한쪽(직장)에 몰지 말 것.',
        '- eventNarrative는 1~2문단 필수(비워두지 말 것): 큰 사건 2~3개를 시간순으로 엮은 도입.',
        relObligation,
        '- 각 사건: timeWindow(연도/대운) + 선명한 title + forecast(구체 사건 형태) + scene(실제 장면) + signalBasis(명리 근거) + decisionAdvice(인과+타이밍).',
        '- closing은 자기계발 마무리("잘 이해하고 준비하면") 금지 — 구체 사건+조건 한 문장으로.',
      ];
    }
    case 'yearly':
      return [
        '[구조] 올해 주요 사건 타이밍 정확히 3~5개를 majorEvents로(2개 이하는 실패). timeWindow는 신호의 절기 구간(날짜) 그대로.',
        '- 돈/계약/일터 변화/관계 중 서로 다른 축으로 분화. 인접 구간을 같은 문장으로 반복 금지.',
        '- lead에서 언급한 사건(예: 계약 점검)은 반드시 majorEvents 카드로 구현할 것(말만 하고 빼면 실패).',
        '- decisionAdvice는 "이 시기에 ○○를 받으면/넘기면 ○○ 구간에 ○○로 돌아온다" 인과 형식.',
      ];
    case 'compat':
      return [
        '[구조] 두 사람 사이에서 "관측 가능한 실제 사건" 2~4개. 무드 그래프(온도가 식는다/안정된다/지속된다) 금지. "작은 합의를 쌓아간다" 류 반복 금지.',
        '- 사건 슬롯 예: 만남 빈도 변화 / 동거 거론 / 양가 인사 / 거주지·직장 이동이 관계 형태를 강제 / 돈·역할 분담 마찰 / 장거리냐 합치냐 갈림. 단정 금지(거론·갈림으로).',
        '- 상대를 용신/기신/운명으로 단정 금지. scene에 "A는 ~, B는 ~"로 두 사람 구체화. 한쪽을 위험인물로 낙인 금지.',
      ];
    case 'pregnancy':
      return [
        '[구조] 엄마의 생활/가족/집안 준비/태교 환경 사건 3개를 임신 초기·중기·후기로 나눠서(국면 timeWindow). 출산일/건강/성별/아이 운명 예측 절대 금지.',
        '- 환경 사건 예: 중기 집안일 분담 마찰("누가 더 하느냐") / 후기 소음·동선 때문에 방·가구 이동 / 가족 역할 재배치. 의료·태아 예측은 절대 금지(환경·집안일에만 한정).',
        '- 가족 도움은 "필요하면 말해"가 아니라 "오늘은 내가 이걸 할게"처럼 구체적 분담으로.',
      ];
  }
}

function renderEvidence(ev: EventForecastEvidence): string {
  const b: string[] = [];
  b.push(`[핵심 좌표] ${ev.coreLines.join(' / ') || '(없음)'}`);
  if (ev.auxiliaryLines.length) b.push(`[보조 운용] ${ev.auxiliaryLines.join(' / ')}`);
  b.push(relationshipRule(ev.relationshipStatus));
  if (ev.partner) {
    b.push(`[A 결] ${ev.partner.aLines.join(' / ') || '(없음)'}`);
    b.push(`[B 결] ${ev.partner.bLines.join(' / ') || '(없음)'}`);
    if (ev.partner.relationLines.length) b.push(`[관계 신호]\n${ev.partner.relationLines.map(l => `  - ${l}`).join('\n')}`);
  }
  b.push(`[큰 사건 씨앗 — 해상도 ${ev.granularity}. 이 window/축만 사용. 근거 강한 2~4개 선별]`);
  if (ev.eventSeeds.length) {
    b.push(ev.eventSeeds.map(s =>
      `  · ${s.window} | ${s.axisLabel}(${s.axis}) | 강도:${s.strength} | 근거:${s.basis}${s.good ? ` | 조건:${s.good}` : ''}${s.caution ? ` | 주의:${s.caution}` : ''}`
    ).join('\n'));
  } else {
    b.push('  (큰 사건 신호 없음 — 시기형 사건을 지어내지 말 것)');
  }
  b.push(`[시기 규칙] ${ev.timingRule}`);
  return b.join('\n');
}

function outputSchema(): string {
  return [
    '{',
    '  "title": string,',
    '  "lead": string,                 // 강한 도입 한 줄',
    '  "eventNarrative": [string],     // 도입 줄글 1~3문단',
    '  "majorEvents": [ {              // 2~4개',
    '    "timeWindow": string,         // 씨앗의 window만',
    '    "title": string,              // 선명한 사건 제목',
    '    "eventType": "move"|"work_change"|"money"|"contract"|"real_estate"|"relationship"|"family_child"|"business"|"study_document"|"health_rhythm"|"legal_admin"|"other",',
    '    "forecast": string,           // 사건 먼저, 조건 뒤 (선명)',
    '    "scene": string,              // 실제 삶의 장면',
    '    "signalBasis": string,        // 명리 근거(일상어)',
    '    "decisionAdvice": string      // 갈리는 지점/잡을 조건/피할 신호',
    '  } ],',
    '  "closing": string',
    '}',
  ].join('\n');
}

export function buildEventForecastPrompt(ev: EventForecastEvidence): BuiltEventForecastPrompt {
  const user = [
    `[모드] ${ev.mode} / [권장 title] ${MODE_TITLE[ev.mode]}`,
    TONE.join('\n'),
    AXIS_RULES.join('\n'),
    modeStructure(ev.mode, ev.relationshipStatus).join('\n'),
    renderEvidence(ev),
    '[출력 JSON]',
    outputSchema(),
    '[FINAL] 큰 사건을 먼저, 조건을 뒤에. 금지 표현 사용 금지. 씨앗의 window만. 카드/체크리스트가 아니라 줄글. JSON 한 덩어리만.',
  ].join('\n\n');
  return { system: SYSTEM, user, maxTokens: 2600 };
}

export const EVENT_FORECAST_PROMPT_INTERNAL = { SYSTEM, BANNED_PHRASES, TONE, AXIS_RULES, MODE_TITLE };
