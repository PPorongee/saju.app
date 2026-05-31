// Event Forecast V1 — 프롬프트 빌더 (lean, 사건 예보 중심).
//
// compact evidence만 받아 모드별 {system,user} 프롬프트를 만든다. 별도 1회 호출.
// 기존 섹션 프롬프트/yongsinDiagnostic guidance에는 손대지 않음(중복 삽입 없음).

import type { EventForecastEvidence, EventForecastMode } from './eventForecastTypes';

export interface BuiltEventForecastPrompt {
  system: string;
  user: string;
  maxTokens: number;
}

const SYSTEM = [
  '당신은 사주 명리로 "운의 사건 예보"를 쓰는 한국어 작가입니다.',
  '점쟁이가 아니라, 계산된 흐름에서 "언제 / 무엇이 / 누구·어떤 상황으로 / 어떻게 전개될지"를 선명하게 짚는 예보관입니다.',
  '출력은 유효한 JSON 한 덩어리. 코드펜스/주석/인사말 금지. 첫 글자 "{", 마지막 글자 "}".',
].join('\n');

// 공통 안전 + 톤 (compact)
const RULES = [
  '[규칙]',
  '- 미래 단정 금지(반드시/무조건/100%/꼭 이때 X). 단, "가능성이 있습니다"만 반복하지 말고 조건부로 선명하게.',
  '- 투자(매수·매도·시세·수익률·코인·주식) / 결혼·이직·출산 "확정" 권유 금지. 의료·건강 진단/예측 금지.',
  '- 아래 신호(signals)의 window(시기)만 사용. 없는 월·계절·날짜·사건을 만들지 말 것. 근거 약하면 likelihood=subtle.',
  '- 자기계발 루틴 금지: "명상하세요/스트레칭/생활패턴 점검/긍정적 관계 유지/무리하지 마세요" 같은 일반 조언 X.',
  '- 각 카드는 실제 장면(eventScene)·사람이나 상황의 결(personOrSituation)·활용법(howToUse)을 구체적으로. 추상어 금지.',
  '- 명리 용어는 즉시 일상어로. 영문 오행 key 금지. 친근한 존댓말.',
];

const MODE_HEADLINE: Record<EventForecastMode, string> = {
  personal: '운의 사건 예보 — 앞으로 들어올 흐름',
  yearly: '올해의 사건 타이밍',
  compat: '관계의 전개 포인트',
  pregnancy: '엄마를 편하게 하는 흐름',
};

function modeStructure(mode: EventForecastMode): string[] {
  switch (mode) {
    case 'personal':
      return [
        '[구조] 사건 예보가 핵심. 필수 eventCards: 1)관계/인연 2)커리어·역할 변화 3)돈·계약·수익화 4)관계 정리·협업 5)결과물·표현·공개.',
        '- 인연 카드는 relationshipSignals가 있을 때만 쓰고 personOrSituation(들어오는 사람의 결)을 신호 근거로 구체화. 없으면 생략.',
        '- timeWindow는 signals의 window(연도/대운)만. 계절·월을 지어내지 말 것.',
        '- watchSigns/avoidPatterns는 짧게(보조).',
      ];
    case 'yearly':
      return [
        '[구조] 상단 timingMap 필수: pushWindows(승부처)/cautionWindows(조심)/preparationWindows(준비) + moneyWindows/careerWindows/relationshipWindows(해당 시).',
        '- eventCards: 올해 승부처 + 조심 구간 + 돈·계약 / 관계·인연 / 결과물 구간. 각 카드 timeWindow는 signals의 월(절기)만.',
        '- 인접 월을 같은 문장으로 반복 금지 — 각 월을 다른 사건 결로 분화(예: 책임 들어옴 / 평가·검증 / 자료 축적 / 문서화 / 공개).',
      ];
    case 'compat':
      return [
        '[구조] 필수 eventCards: 1)가까워지는 계기 2)부딪히기 쉬운 장면 3)깊어지는 조건 4)멀어지는 패턴 5)돈·일·생활을 엮을 때 주의점.',
        '- "이 관계는 역할이 정리될 때 가까워진다"처럼 국면으로. 상대를 용신/기신/운명으로 단정 금지. "반드시 결혼/이별" 금지.',
        '- A/B 개인 결은 partner 근거에서만. personOrSituation에 "A는 ~한 결, B는 ~한 결"처럼 두 사람을 구체화. 한쪽을 위험인물로 낙인 금지.',
      ];
    case 'pregnancy':
      return [
        '[구조] 제한적 예보. 필수 eventCards: 1)엄마가 편안해지는 환경 2)가족이 도와줄 타이밍 3)태교 리듬 4)부담 쌓이기 쉬운 패턴 5)정서 환경 준비.',
        '- timeWindow는 날짜가 아니라 국면("임신 기간 전반","부담이 쌓이기 쉬운 국면"). 출산일/출산시간/건강/성별/아이 운명 절대 금지.',
        '- 가족 도움은 "필요하면 말해"가 아니라 "오늘은 내가 이걸 할게"처럼 구체적 분담으로.',
      ];
  }
}

function renderEvidence(ev: EventForecastEvidence): string {
  const b: string[] = [];
  b.push(`[핵심 좌표] ${ev.coreLines.join(' / ') || '(없음)'}`);
  if (ev.auxiliaryLines.length) b.push(`[보조 운용] ${ev.auxiliaryLines.join(' / ')}`);
  if (ev.relationshipSignals.length) b.push(`[인연 신호]\n${ev.relationshipSignals.map(l => `  - ${l}`).join('\n')}`);
  if (ev.partner) {
    b.push(`[A 결] ${ev.partner.aLines.join(' / ') || '(없음)'}`);
    b.push(`[B 결] ${ev.partner.bLines.join(' / ') || '(없음)'}`);
    if (ev.partner.relationLines.length) b.push(`[관계 신호]\n${ev.partner.relationLines.map(l => `  - ${l}`).join('\n')}`);
  }
  b.push(`[시기 신호 — 해상도 ${ev.granularity}. 이 window만 사용]`);
  if (ev.signals.length) {
    b.push(ev.signals.map(s =>
      `  · ${s.window} | ${s.kind} | 강도:${s.strength} | ${s.signal}${s.good ? ` | 기회:${s.good}` : ''}${s.caution ? ` | 주의:${s.caution}` : ''}`
    ).join('\n'));
  } else {
    b.push('  (시기 신호 없음 — 시기형 카드 생성 금지)');
  }
  b.push(`[시기 규칙] ${ev.timingRule}`);
  return b.join('\n');
}

function outputSchema(): string {
  return [
    '{',
    '  "headline": string,',
    '  "summary": string,            // 선명한 2~3문장',
    '  "eventCards": [ {',
    '    "type": "relationship"|"career"|"money"|"business"|"study"|"family"|"move"|"health_rhythm"|"collaboration"|"decision",',
    '    "title": string,            // 선명한 제목',
    '    "timeWindow": string,       // signals의 window만',
    '    "likelihood": "strong"|"moderate"|"subtle",',
    '    "eventScene": string,       // 실제 장면',
    '    "personOrSituation": string,// 사람/상황의 결 (근거 있을 때)',
    '    "whyThisAppears": string,   // 명리 근거를 일상어로',
    '    "goodIf": [string], "carefulIf": [string], "howToUse": string',
    '  } ],',
    '  "timingMap": { "pushWindows":[string], "cautionWindows":[string], "preparationWindows":[string], "relationshipWindows":[string], "moneyWindows":[string], "careerWindows":[string] },',
    '  "watchSigns": [string], "avoidPatterns": [string]',
    '}',
  ].join('\n');
}

export function buildEventForecastPrompt(ev: EventForecastEvidence): BuiltEventForecastPrompt {
  const user = [
    `[모드] ${ev.mode} / [권장 headline] ${MODE_HEADLINE[ev.mode]}`,
    RULES.join('\n'),
    modeStructure(ev.mode).join('\n'),
    renderEvidence(ev),
    '[출력 JSON]',
    outputSchema(),
    '[FINAL] 위 신호의 window만 사용. 자기계발 조언이 아니라 사건 예보로. 선명하되 결과 보장 금지. JSON 한 덩어리만.',
  ].join('\n\n');
  return { system: SYSTEM, user, maxTokens: 2400 };
}

export const EVENT_FORECAST_PROMPT_INTERNAL = { SYSTEM, RULES, MODE_HEADLINE };
