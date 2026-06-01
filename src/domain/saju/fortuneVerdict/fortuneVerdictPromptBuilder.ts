// Fortune Questions Verdict V1 — 프롬프트 빌더 (줄글형 "운명 판정 서사").
// seeds는 내부 판단 자료일 뿐, 사용자에겐 자연스러운 사주풀이 문단만 나온다.
// Q&A 표/강도 라벨/근거 라벨 금지. 별도 1회 호출(기존 섹션 프롬프트 무수정).

import type { FortuneVerdictEvidence, FortuneVerdictMode, RelationshipStatus } from './fortuneVerdictTypes';

export interface BuiltFortuneVerdictPrompt { system: string; user: string; maxTokens: number; }

const SYSTEM = [
  '당신은 40년 경력의 사주 명리 상담가입니다. 손님 앞에서 종이에 적어 읽어주듯, 인생의 큰 질문(돈·재물·횡재·투자 성향·직장/사업/이직·이동수·집·관계·자녀·운 터지는 시기)을 줄글로 단호하게 풀어줍니다.',
  '검사표나 Q&A가 아니라, 한 편의 사주풀이 글입니다. "Q.", "판정:", "근거 ·" 같은 라벨을 절대 쓰지 않습니다.',
  '강함/약함을 회피하지 않되, "약하다"도 문장 안에서 의미 있게 풉니다("한 방은 아니지만 시간이 붙을수록 커진다"처럼).',
  '출력은 유효한 JSON 한 덩어리(코드펜스/주석/인사말 금지, 첫 글자 "{" 마지막 "}").',
].join('\n');

const SAFETY = [
  '[금지(결과 보장·지시만 금지 — 사건/강약 판정은 허용)]',
  '- 주식·코인 매수/매도 지시, 투자 수익 보장 금지. 부동산 사라/팔아라 확정 지시 금지.',
  '- 임신·출산 확정, 아이 건강/성별/운명/수(數) 단정 금지. 이직/퇴사·결혼/이혼 확정 지시 금지.',
  '- 의료·법률·금융 전문가 판단 대체 금지. "반드시/무조건/100%" 금지.',
];

const TONE = [
  '[문체 — 유료 사주풀이체, 줄글]',
  '- 라벨 금지: "Q.", "판정: 약함/보통/두드러지지 않음", "근거 ·", 강도 표시. 모두 문장 안에 자연스럽게 녹인다.',
  '- "이 사주는 ○○ 사주입니다"를 매 문단 반복하지 말 것. 명리 용어(편인/식상 등)는 생활 언어로 번역.',
  '- 자기계발/상담 멘트 금지: "주의하세요 / 신중하게 결정 / 소통이 원활해야 / 목표를 명확히 / 점검하세요 / 활용해보세요 / 무리하지 마세요".',
  '- 사건·결론을 먼저, 근거는 짧게 뒤에. 시기는 seed/breakthrough의 것만(생애 단계 또는 계산된 연도). 없는 월·날짜·자녀 수 만들지 말 것.',
  '',
  '[GOLD 예시 — 이 결·호흡을 따른다(복붙 금지)]',
  '  · "이 사주는 초반에 돈이 쉽게 터지는 사주는 아닙니다. 20~30대에는 버는 돈보다 책임이 먼저 커지고, 가족 안에서 감당할 몫도 같이 늘어나는 그림입니다. 하지만 말년으로 갈수록 약해지지 않습니다 — 오히려 40대 이후부터 돈의 구조가 잡힙니다. 직책·고정 수입·부동산성 자산·오래 가져가는 계약처럼 시간이 붙어야 커지는 돈에 강합니다."',
  '  · "자녀운은 약하게만 보지 않습니다. 다만 여러 방향으로 넓게 퍼지기보다 한 아이에게 관심과 책임이 집중되는 그림이 더 강합니다. 이미 자녀가 있다면 앞으로의 자녀운은 새로 생기는 아이보다 아이의 교육·생활권·가족의 돈 배분·배우자와의 역할 분담 문제로 더 크게 움직입니다."',
  '  · "이동수도 있습니다. 여행처럼 가볍게 움직이는 운이 아니라 집과 가족의 조건 때문에 움직이는 운입니다. 2027년 말부터 2028년 사이 집을 옮기거나, 아이의 생활권이 바뀌거나, 배우자의 일정과 내 일하는 장소가 맞물려 실제 이동을 고민하게 됩니다."',
];

// 나이대별 해석 방향(같은 관심사도 나이대에 따라 다르게).
function ageGuideOf(band: string): string {
  if (/10대|20대/.test(band)) return '진로 선택·첫 기반·관계 탐색 중심. 돈은 축적보다 수입 구조 형성, 이직보다 기반 다지기.';
  if (/30대/.test(band)) return '결혼·자녀·집·이직·사업 검증기. 가족 책임과 돈이 함께 움직이고, 직장 안 책임 확대 또는 독립 고민, 집·생활권이 본격화.';
  if (/40대/.test(band)) return '재물 축적·자산화. 부동산·사업 확장·직책/권한, 자녀 교육비·가족 돈 구조, 부모/상속 가능성. 전문성이 돈으로 바뀌는 시기.';
  if (/50대/.test(band)) return '수확·안정·자산 방어. 가족/부모/상속/건강 리듬, 확장보다 정리·관리, 돈을 지키는 운.';
  if (/60대/.test(band)) return '자산 유지·가족 배분·건강 리듬·구조 정리·거주 안정.';
  return '';
}

const MODE_TITLE: Record<FortuneVerdictMode, string> = {
  personal: '사주가 말하는 당신의 큰 운',
  yearly: '올해, 사주가 말하는 것',
  compat: '두 사람, 사주가 말하는 것',
  pregnancy: '엄마와 아이, 사주가 말하는 것',
};

function relationshipRule(status: RelationshipStatus, hasChildren: boolean | 'unknown'): string {
  const child = hasChildren === true ? ' (자녀 있음 — 새 아이 여부가 아니라 교육·생활권·돈·역할로 자녀운을 풀 것)' : '';
  switch (status) {
    case 'married': return `[관계 규칙] 기혼${child} — 새 연애 인연 절대 금지. 관계운은 배우자·집안·돈·아이·부모 구조로만.`;
    case 'single': return `[관계 규칙] 미혼 — "인연과 결혼" 섹션을 반드시 1개 포함하고 인연운 강약·결을 풀 것("반드시 만난다" 단정만 금지).${hasChildren === true ? '' : ' 자녀가 없으므로 자녀 전용 섹션은 만들지 말 것(자녀운은 아직 열리지 않은 영역으로 한두 문장만).'}`;
    case 'dating': return '[관계 규칙] 연애 중 — "인연과 결혼" 섹션을 포함해 공식화/동거/결혼 논의 가능성을 조심스럽게 풀 것(새 사람 강조 금지). 자녀 전용 섹션은 만들지 말 것.';
    case 'divorced': return '[관계 규칙] 이혼 — 재혼 단정 금지. 관계 결 변화·정리로.';
    default: return '[관계 규칙] 관계 상태 미상 — 연애/결혼 단정 금지.';
  }
}

function modeSections(mode: FortuneVerdictMode): string[] {
  switch (mode) {
    case 'personal':
      return [
        '[섹션 구성] 위 [섹션 플랜]을 6~8개 줄글 섹션으로(각 2~4문단). 대운(운 트이는 시기)/돈/직업·사업은 반드시 포함. 관심사는 각각 최소 1회 반영하되 관련된 것끼리 묶어도 됨.',
        '- "돈과 재물운": 언제부터 돈이 붙는가, 한 방형 vs 축적형, 주식·코인 같은 변동성 돈 vs 부동산·실물·고정수입 중 무엇이 맞는가를 한 흐름으로(나이대 반영).',
        '- "일·사업·이직": 직장 안에서 크는가 독립해야 크는가, 이직이 도망인가 기회인가, 사업 확장은 언제가 나은가.',
        '- "이동수와 집·부동산": 이사·생활권·집 문제가 언제 어떤 형태로 움직이는가(여행성 X, 현실 조건성 O).',
        '- "자녀와 가족"/"배우자와 집안": 위 관계 규칙대로(기혼 새 연애 금지, 기존 자녀는 교육·생활권·돈·역할로).',
        '- timingSummary: 몇 살 이후/어느 대운 구간이 진짜 확장기인지 한 문단(나이대 기준).',
      ];
    case 'yearly':
      return [
        '[섹션 구성] "올해 돈" / "올해 일·이직" / "올해 집·계약·이동" / "올해 가족·관계" / "올해 운이 트이는 때". 각 줄글 1~3문단, 올해의 큰 결론 중심(월별 잔조언 금지).',
      ];
    case 'compat':
      return [
        '[섹션 구성] "이 관계의 큰 그림" / "돈·생활·가족이 얽힐 때" / "오래가려면" / "흐름의 분기점". 상대를 용신/기신/운명으로 단정 금지. A/B 결은 partner 근거에서만, 조언이 아니라 구조 진단으로.',
      ];
    case 'pregnancy':
      return [
        '[섹션 구성] "엄마가 떠안기 쉬운 구조" / "가족이 도와야 할 방식" / "집안에서 먼저 정리할 것" / "자녀·가족운의 그림". 출산일·성별·건강·아이 수·태아 운명 예측 절대 금지(환경·가족·자녀운 경향만).',
      ];
  }
}

function renderEvidence(ev: FortuneVerdictEvidence): string {
  const b: string[] = [];
  b.push(`[핵심 좌표] ${ev.coreLines.join(' / ') || '(없음)'}`);
  if (ev.auxiliaryLines.length) b.push(`[보조 운용] ${ev.auxiliaryLines.join(' / ')}`);
  b.push(relationshipRule(ev.relationshipStatus, ev.hasChildren));
  if (ev.ageBand) {
    b.push(`[나이대] ${ev.ageBand}${ev.currentAge ? ` (만 ${ev.currentAge}세)` : ''} — 해석 방향: ${ageGuideOf(ev.ageBand)}`);
    b.push('  ※ 결과 문장에 나이대를 자연스럽게 녹일 것(예: "지금 나이대는 돈이 갑자기 터지기보다 40대 이후 자산 구조를 만드는 시기"). 같은 운도 나이대에 따라 해석을 달리할 것.');
  }
  if (ev.concerns.length) {
    b.push(`[사용자 관심사 — 각각 반드시 1회 이상 반영] ${ev.concerns.join(', ')}`);
    b.push('  ※ 관심사가 여러 개면 관련된 것끼리 한 섹션으로 묶어도 됨(예: 자녀+집+돈 → "아이 때문에 집과 돈이 함께 움직이는 운"). evidence가 약한 관심사도 "없음"으로 끝내지 말고, 어떤 방식으로 나타나는지 대체 해석을 줄 것.');
  } else {
    b.push('[관심사] 없음 — 전체운 기본 모드. 대운/돈/직업 + 생애상태 + evidence 강한 축으로 충실히(얇아지지 않게).');
  }
  if (ev.sectionPlan.length) {
    b.push(`[섹션 플랜 — 아래 제목으로 6~8개 섹션(관련된 것끼리 묶기 가능, 순서 참고). 대운/돈/직업 필수. 플랜에 없는 섹션(특히 무자녀 미혼의 자녀 섹션)을 임의로 추가하지 말 것]\n${ev.sectionPlan.map(t => `  - ${t}`).join('\n')}`);
  }
  if (ev.partner) {
    b.push(`[A 결] ${ev.partner.aLines.join(' / ') || '(없음)'}`);
    b.push(`[B 결] ${ev.partner.bLines.join(' / ') || '(없음)'}`);
    if (ev.partner.relationLines.length) b.push(`[관계 신호]\n${ev.partner.relationLines.map(l => `  - ${l}`).join('\n')}`);
  }
  b.push('[내부 판단 자료 — 이 강약/시기/허용판정을 줄글에 녹여라. 질문 문구를 그대로 쓰지 말 것. 강도 라벨 노출 금지]');
  b.push(ev.seeds.map(s =>
    `  · (${s.verdictType}) 내부질문:${s.question} / 강도:${s.strength} / 시기:${s.timing || '-'}\n    근거:${s.basisSignals.join(' / ')}\n    풀이결:${s.allowedClaims.join(' / ')}`
  ).join('\n'));
  if (ev.breakthroughLines.length) {
    b.push('[운 터지는 시기 근거]');
    b.push(ev.breakthroughLines.map(l => `  - ${l}`).join('\n'));
  }
  b.push(`[시기 규칙] ${ev.timingRule}`);
  return b.join('\n');
}

function outputSchema(): string {
  return [
    '{',
    '  "title": string,',
    '  "lead": string,                          // 이 사주를 한 호흡으로 짚는 도입 한 줄(두루뭉술 금지)',
    '  "sections": [ { "title": string, "body": [string, string] } ],   // 각 body는 2~4문단(줄글). 라벨 금지',
    '  "timingSummary": string,                 // 운 트이는 시기 한 문단(개인/올해)',
    '  "closing": string',
    '}',
  ].join('\n');
}

export function buildFortuneVerdictPrompt(ev: FortuneVerdictEvidence): BuiltFortuneVerdictPrompt {
  const user = [
    `[모드] ${ev.mode} / [권장 title] ${MODE_TITLE[ev.mode]}`,
    SAFETY.join('\n'),
    TONE.join('\n'),
    modeSections(ev.mode).join('\n'),
    renderEvidence(ev),
    '[출력 JSON]',
    outputSchema(),
    '[FINAL] 검사표가 아니라 한 편의 사주풀이 글로. "Q./판정:/근거 ·" 절대 금지. 내부 자료의 강약·시기를 문장 속에 자연스럽게 녹이고, 결과 보장은 하지 마라. JSON 한 덩어리만.',
  ].join('\n\n');
  return { system: SYSTEM, user, maxTokens: 3600 };
}

export const FORTUNE_VERDICT_PROMPT_INTERNAL = { SYSTEM, SAFETY, TONE, MODE_TITLE };
