// All-mode Action Guide V1 — 프롬프트 빌더.
//
// evidence(deterministic 근거 시드)를 받아 모드별 {system, user} 프롬프트를 만든다.
//   - 출력은 ActionGuide JSON 한 덩어리.
//   - 계산 evidence만 사용. 없는 시기/날짜 생성 금지.
//   - 금융/의료/법률 단정 금지, 고위험 결정 단정 금지, 공포/운명론 금지.
//   - 용신/기신을 미신(부적·색·방향 강요)이 아니라 행동·환경·구조로 번역.

import type { ActionGuideEvidence, ActionGuideMode } from './actionGuideTypes';

export interface BuiltActionGuidePrompt {
  system: string;
  user: string;
  maxTokens: number;
}

// ============================================================
// 공통 안전 규칙
// ============================================================
const SAFETY_RULES: string[] = [
  '[안전 규칙 — 위반 시 출력 폐기]',
  '1) 계산 evidence(아래 근거)에 없는 명리 요소·시기·날짜를 새로 만들지 말 것.',
  '2) 단정 금지: "반드시/무조건/100%/꼭 이때/틀림없이" 및 미래 사건 확정("이때 결혼한다/이직한다/돈 번다") 금지. 흐름·가능성·선택 결로만.',
  '3) 투자/금융 단정 금지: 매수·매도·시세·수익률·종목·코인·주식·레버리지·투자 타이밍 금지. 돈은 보상 기준·수익 구조·계약 조건·정산·소비 습관 결로만.',
  '4) 의료/법률 단정 금지: 질병·진단·치료·약물·소송 결과 단정 금지. 건강은 수면·휴식·생활 리듬·감정 회복 결로만.',
  '5) 고위험 결정(이직·창업·결혼·이별·계약·큰 지출)은 "현실 조건·대화·전문가 판단과 함께 결정"하도록 안내. 사주 단독으로 밀어붙이지 말 것.',
  '6) 공포·불안 조장 / 운명론("정해져 있다") 금지. 사람을 탓하지 말 것.',
  '7) 용신/기신/오행을 부적·색상·방향 강요 같은 미신으로 풀지 말 것. 행동·환경·관계·구조로 번역. 오행명을 과하게 반복하지 말 것.',
  '8) "사주는 참고 흐름이고, 결정은 현실 조건과 함께"라는 균형을 유지할 것.',
];

const SYSTEM = [
  '당신은 사주 명리를 "오늘 어떻게 살 것인가"의 실천 가이드로 번역하는 한국어 작가입니다.',
  '점쟁이가 아니라, 흐름을 읽고 구체적인 행동·루틴·결정 기준을 제안하는 안내자입니다.',
  '',
  '핵심 원칙:',
  '  - 성향 설명에 머물지 말고, 돈/일/관계/생활 리듬/결정 시기/개운 루틴처럼 "지금 무엇을 할지"에 답한다.',
  '  - 추상적 위로 대신 구체적 상황·행동·리스크로 풀어쓴다.',
  '  - 계산된 근거만 사용하고, 없는 시기/날짜를 지어내지 않는다.',
  '  - 친근한 존댓말. 명리 용어가 나오면 즉시 일상어로 풀이.',
  '  - 출력은 항상 유효한 JSON 한 덩어리. 코드펜스/주석/인사말 금지. 첫 글자 "{", 마지막 글자 "}".',
].join('\n');

// ============================================================
// 모드별 구조 지침 + JSON 스키마
// ============================================================
const MODE_TITLE: Record<ActionGuideMode, string> = {
  personal: '지금 운을 쓰는 법 — 흐름·결정·개운 가이드',
  yearly: '올해 운을 쓰는 법 — 기회·결정·개운 가이드',
  compat: '이 관계를 좋게 쓰는 법 — 실천·결정 가이드',
  pregnancy: '엄마가 편안해지는 임신 생활 가이드',
};

function modeStructure(mode: ActionGuideMode): string[] {
  switch (mode) {
    case 'personal':
      return [
        '구조(개인사주 Action Guide):',
        '  - overview: 현재 운의 전체 흐름을 2~3문장으로.',
        '  - domainFlows: 커리어/일, 돈/수입·소비, 사업/프로젝트, 연애/관계, 공부/성장, 컨디션/생활 리듬 중 근거가 닿는 4~6개. 각 항목 flow/opportunity/caution/suggestedAction.',
        '  - decisionGuide: 추진하기 좋은 흐름(goodFor) / 점검이 필요한 흐름(beCarefulWith) / 작게 시작하거나 미루는 게 나은 흐름(postponeOrScaleDown) / 결정 전 체크리스트(checklist).',
        '  - remedyRoutines: daily(매일 10분), weekly(주간), monthly(월간), environment(환경·공간·관계 방식), avoidPatterns(피해야 할 패턴).',
        '  - immediateActions: 지금 당장 할 일 5개 (아주 구체적으로).',
      ];
    case 'yearly':
      return [
        '구조(올해운세 Action Guide):',
        '  - overview: 올해 전체 흐름 요약 2~3문장.',
        '  - domainFlows: 일/커리어, 돈/계약·협상, 관계/연애, 공부/성장, 생활 리듬 중 4~5개. 각 항목 flow/opportunity/caution/suggestedAction.',
        '  - decisionGuide: 크게 밀어도 되는 흐름(goodFor) / 점검해야 하는 흐름(beCarefulWith) / 서두르지 말아야 하는 흐름(postponeOrScaleDown) / 결정 전 체크리스트(checklist).',
        '  - remedyRoutines: 올해 개운 루틴(daily/weekly/monthly) + environment + avoidPatterns(올해 피해야 할 패턴).',
        '  - immediateActions: 이번 달 또는 지금 당장 할 일 5개.',
        '  ※ 월별 언급은 아래 "실제 계산된 월 흐름"에 있는 월만 사용. 없는 월/분기를 만들지 말 것. 데이터가 부족하면 "상반기/하반기·초반/중반/후반" 정도로 보수적으로만.',
      ];
    case 'compat':
      return [
        '구조(궁합 Action Guide):',
        '  - overview: 관계의 전체 흐름 2~3문장.',
        '  - domainFlows: 잘 맞는 지점 / 부딪히기 쉬운 지점 / 대화 조율 / 돈·일·생활 리듬 조율 / 감정 표현 조율 중 4~5개. 각 항목 flow/opportunity/caution/suggestedAction.',
        '  - decisionGuide: 중요한 관계 결정 가이드. 고백·결혼·동거·이별·사업파트너·금전거래 같은 고위험 결정은 단정하지 말고, 현실 조건·대화·책임 분담·가족/재정 검토를 함께 언급(checklist).',
        '  - partnerNotes: aAdvice(A 개인 조언) / bAdvice(B 개인 조언) / together(두 사람이 함께 해볼 것). A와 B를 혼동하지 말 것.',
        '  - immediateActions: 이번 주 또는 지금 당장 같이 해볼 일 5개.',
        '  ※ 금지: "상대가 당신의 용신/기신입니다", "상대가 당신을 살린다/망친다", "이 관계는 반드시 된다/안 된다", "결혼해야/헤어져야 합니다". 상대를 위험인물로 낙인찍지 말 것.',
      ];
    case 'pregnancy':
      return [
        '구조(임산부 Action Guide — 엄마 중심):',
        '  - overview: 엄마가 편안해지는 흐름 2~3문장.',
        '  - domainFlows: 임신 기간 생활 리듬 / 태교 방향 / 공간·환경 / 관계·휴식 중 3~5개. 각 항목 flow/opportunity/caution/suggestedAction.',
        '  - decisionGuide: 무리하지 않는 생활 결정 기준 + 결정 전 체크리스트. (출산일/출산시간 추천 금지, 의료 결정 조언 금지 — 병원·의료진 판단 우선.)',
        '  - remedyRoutines: daily(태교 루틴) / weekly / environment(공간·관계·휴식) / avoidPatterns(피해야 할 부담 패턴). monthly는 생략 가능.',
        '  - immediateActions: 오늘부터 할 수 있는 태교 루틴 5개.',
        '  ※ 금지: 출산일/택일 추천, 순산/난산·조산/유산·성별·건강 예측, 병원 판단 대체, 엄마 탓, 아이 성격/운명 단정. 시기 대신 "컨디션 회복기/안정기" 같은 생활 리듬 표현만.',
      ];
  }
}

function outputSchema(mode: ActionGuideMode): string {
  const partner = mode === 'compat'
    ? '  "partnerNotes": { "aAdvice": string, "bAdvice": string, "together": [string, ...] },\n'
    : '';
  const domainFlows = mode === 'pregnancy'
    ? '  "domainFlows": [ { "domain": string, "flow": string, "opportunity": string, "caution": string, "suggestedAction": string } ],   // 3~5개\n'
    : '  "domainFlows": [ { "domain": string, "flow": string, "opportunity": string, "caution": string, "suggestedAction": string } ],   // 4~6개\n';
  const monthly = mode === 'pregnancy'
    ? '    "environment": [string, ...], "avoidPatterns": [string, ...]\n'
    : '    "monthly": [string, ...], "environment": [string, ...], "avoidPatterns": [string, ...]\n';
  return [
    '{',
    '  "title": string,         // 섹션 제목 한 줄',
    '  "overview": string,      // 전체 흐름 요약',
    domainFlows.replace(/\n$/, ''),
    '  "decisionGuide": {',
    '    "goodFor": [string, ...], "beCarefulWith": [string, ...], "postponeOrScaleDown": [string, ...], "checklist": [string, ...]',
    '  },',
    '  "remedyRoutines": {',
    '    "daily": [string, ...], "weekly": [string, ...],',
    monthly.replace(/\n$/, ''),
    '  },',
    partner.replace(/\n$/, ''),
    '  "immediateActions": [string, string, string, string, string]   // 정확히 5개 권장',
    '}',
  ].filter(Boolean).join('\n');
}

// ============================================================
// evidence 렌더
// ============================================================
function renderEvidence(ev: ActionGuideEvidence): string {
  const blocks: string[] = [];
  blocks.push('[핵심 명리 좌표 — 이 근거만 사용]');
  blocks.push(ev.coreLines.length ? ev.coreLines.map(l => `  - ${l}`).join('\n') : '  (없음)');

  if (ev.auxiliaryLines.length) {
    blocks.push('');
    blocks.push('[보조 운용 후보 — 주 용신은 그대로 유지, 실행 전략에만 참고]');
    blocks.push(ev.auxiliaryLines.map(l => `  - ${l}`).join('\n'));
  }

  if (ev.partner) {
    blocks.push('');
    blocks.push('[A(첫 번째 사람) 개인 근거]');
    blocks.push(ev.partner.aLines.length ? ev.partner.aLines.map(l => `  - ${l}`).join('\n') : '  (없음)');
    blocks.push('[B(두 번째 사람) 개인 근거]');
    blocks.push(ev.partner.bLines.length ? ev.partner.bLines.map(l => `  - ${l}`).join('\n') : '  (없음)');
  }

  if (ev.domainSeeds.length) {
    blocks.push('');
    blocks.push('[영역별 근거 시드]');
    for (const d of ev.domainSeeds) {
      blocks.push(`  · ${d.domain}: ${d.lines.filter(Boolean).join(' / ')}`);
    }
  }

  blocks.push('');
  blocks.push(`[시기/타이밍 — 해상도: ${ev.timing.granularity}]`);
  blocks.push(`  규칙: ${ev.timing.rule}`);
  if (ev.timing.lines.length) {
    blocks.push('  실제 계산된 시기 흐름(이 목록만 사용):');
    blocks.push(ev.timing.lines.map(l => `    - ${l}`).join('\n'));
  } else {
    blocks.push('  (시기 데이터 없음 — 특정 월/날짜를 만들지 말 것)');
  }
  return blocks.join('\n');
}

// ============================================================
// public
// ============================================================
export function buildActionGuidePrompt(ev: ActionGuideEvidence): BuiltActionGuidePrompt {
  const user = [
    `[모드] ${ev.mode}`,
    `[권장 제목] ${MODE_TITLE[ev.mode]}`,
    '',
    SAFETY_RULES.join('\n'),
    '',
    modeStructure(ev.mode).join('\n'),
    '',
    renderEvidence(ev),
    '',
    '[출력 JSON 스키마]',
    outputSchema(ev.mode),
    '',
    '[FINAL]',
    '- 위 안전 규칙과 구조를 모두 지키고, 계산 근거에 없는 시기/사실을 만들지 말 것.',
    '- decisionGuide의 goodFor/beCarefulWith/postponeOrScaleDown 항목에는, 위 "시기/타이밍"에 연도·대운·월 흐름이 있으면 가능한 한 그 시점을 함께 붙여라(없으면 시점을 지어내지 말 것).',
    '- immediateActions는 정확히 5개. 각 항목은 오늘~이번 주 안에 실제로 실행할 수 있는 "동사 + 대상" 한 문장으로 (예: "이력서에 최근 프로젝트 1건 추가하기"). 추상적 다짐("긍정적으로 살기") 금지.',
    '- 추상적 위로가 아니라 구체적 상황·행동·리스크로 풀어쓸 것. 출력은 JSON 한 덩어리만.',
  ].join('\n');

  return { system: SYSTEM, user, maxTokens: 2200 };
}

export const ACTION_GUIDE_PROMPT_INTERNAL = { SAFETY_RULES, SYSTEM, MODE_TITLE };
