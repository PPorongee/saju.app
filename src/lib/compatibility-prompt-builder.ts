/**
 * 궁합 프롬프트 빌더
 *
 * 두 사람의 프로파일 + 관계 유형을 받아 AI에 전달할 단일 프롬프트를 만든다.
 * 개인사주 빌더와 같은 패턴을 따른다:
 *   - 4단 구조 강제 (분석형 섹션만)
 *   - 동적 캐치 제목
 *   - 한자어 OK / 한자 글자 금지
 *   - 팩트폭행·구체 명사 규칙
 * 남녀관계(love/marriage/crush/reunion)에는 매콤 룰 추가.
 */

import { CG, JJ, OH_CG, OH_JJ } from './saju-calc';
import {
  buildPersonProfile, analyzeCompatibility,
  type CompatPersonProfile, type RelationType, type CompatAnalysisResult,
} from './compatibility-analyzer';
import type { SajuResult } from './saju-calc';

export interface CompatBuilderOutput {
  prompt: string;
  analysis: CompatAnalysisResult;
}

export interface CompatBuilderInput {
  p1: {
    name: string;
    gender: 'm' | 'f';
    age: number;
    saju: SajuResult;
    exactHour?: number;
    exactMinute?: number;
  };
  p2: {
    name: string;
    gender: 'm' | 'f';
    age: number;
    saju: SajuResult;
    exactHour?: number;
    exactMinute?: number;
  };
  relationType: RelationType;
  lang?: 'ko' | 'en';
}

const ROMANTIC_TYPES: RelationType[] = ['love', 'marriage', 'crush', 'reunion'];

export function buildCompatPrompt(input: CompatBuilderInput): CompatBuilderOutput {
  const p1 = buildPersonProfile(input.p1.name, input.p1.gender, input.p1.age, input.p1.saju);
  const p2 = buildPersonProfile(input.p2.name, input.p2.gender, input.p2.age, input.p2.saju);
  const analysis = analyzeCompatibility(p1, p2, input.relationType);
  const isRomantic = ROMANTIC_TYPES.includes(input.relationType);
  const isEn = input.lang === 'en';

  // ============================================================
  // 머리말 (두 사주 원국)
  // ============================================================
  let head = '=== 두 사람의 사주 원국 ===\n';
  head += personBlock(p1, input.p1.exactHour, input.p1.exactMinute);
  head += '\n';
  head += personBlock(p2, input.p2.exactHour, input.p2.exactMinute);
  head += '\n';
  head += '관계 유형: ' + relTypeLabel(input.relationType) + '\n';
  head += '나이 맞춤 안내: ' + ageNote(p1.age, p2.age) + '\n\n';

  // ============================================================
  // 사전 계산 결과 (analyzer.promptBlock)
  // ============================================================
  head += analysis.promptBlock + '\n\n';

  // ============================================================
  // 공통 규칙
  // ============================================================
  head += commonRules(p1, p2, analysis.mainRelationships, analysis.spicyRelationships) + '\n';

  // ============================================================
  // 섹션 구성 (유형별)
  // ============================================================
  head += sectionPlan(input.relationType, p1, p2, isRomantic);

  // ============================================================
  // 영어 모드
  // ============================================================
  if (isEn) {
    const engHead = '🚨 CRITICAL LANGUAGE INSTRUCTION 🚨\n' +
      'Write EVERYTHING in English. EVERY section title, EVERY explanation must be in English. ' +
      'Translate Korean section titles. Saju terms like Gap(甲) may appear with English meaning. ' +
      'Use warm, casual, friend-like tone. IF YOU WRITE IN KOREAN, THE RESPONSE WILL BE REJECTED.\n\n';
    head = engHead + head + '\n\n🚨 FINAL REMINDER — Write EVERYTHING in English.\n';
  }

  return { prompt: head, analysis };
}

// ============================================================
// 개인 사주 블록
// ============================================================
function personBlock(p: CompatPersonProfile, exactHour?: number, exactMinute?: number): string {
  const sj = p.saju;
  const lines: string[] = [];
  lines.push(`▶ ${p.name} (${p.gender === 'f' ? '여' : '남'} / 만 ${p.age}세)`);
  if (exactHour != null && exactHour >= 0) {
    lines.push(`  정확한 출생시간: ${String(exactHour).padStart(2, '0')}시 ${String(exactMinute ?? 0).padStart(2, '0')}분`);
  }
  lines.push(`  사주: ${CG[sj.yStem]}${JJ[sj.yBranch]} / ${CG[sj.mStem]}${JJ[sj.mBranch]} / ${CG[sj.dStem]}${JJ[sj.dBranch]}` +
    (sj.hStem >= 0 ? ` / ${CG[sj.hStem]}${JJ[sj.hBranch]}` : ''));
  lines.push(`  일간: ${CG[sj.dStem]}(${OH_CG[sj.dStem]}) / 일지: ${JJ[sj.dBranch]}(${OH_JJ[sj.dBranch]})`);
  lines.push(`  오행: 목${p.ohCount['목']} 화${p.ohCount['화']} 토${p.ohCount['토']} 금${p.ohCount['금']} 수${p.ohCount['수']}`);
  lines.push(`  십성: 비겁${p.advanced.sipsung.비겁} 식상${p.advanced.sipsung.식상} 재성${p.advanced.sipsung.재성} 관성${p.advanced.sipsung.관성} 인성${p.advanced.sipsung.인성}`);
  lines.push(`  신살: ${p.shinsal.join(', ') || '없음'}`);
  lines.push(`  격국·조후: ${p.advanced.gyeokguk.primary} · ${p.advanced.johoo.type}${p.advanced.johoo.needed.length > 0 ? ' (보완: ' + p.advanced.johoo.needed.join('·') + ')' : ''}`);
  lines.push(`  신강신약: ${p.advanced.strength.label}`);
  lines.push(`  사주 정수: ${p.advanced.essence.oneLineKo}`);
  return lines.join('\n');
}

function relTypeLabel(t: RelationType): string {
  switch (t) {
    case 'love': return '연애 중';
    case 'marriage': return '혼인(부부) 관계';
    case 'friendship': return '우정 관계';
    case 'colleague': return '동료 관계';
    case 'reunion': return '재회/이별 검토';
    case 'crush': return '짝사랑/썸';
  }
}

function ageNote(a1: number, a2: number): string {
  const bothAdult = a1 >= 20 && a2 >= 20;
  if (!bothAdult) return '미성년자가 포함됨 — 결혼/투자/부동산 같은 성인 주제는 "먼 미래에" 정도로만, 학업·진로·교우관계에 집중';
  const maxAge = Math.max(a1, a2);
  if (maxAge >= 60) return '60대 이상 포함 — 건강·노후·가족 중심. 첫 취업/수능 같은 젊은 시절 이야기는 자제';
  if (maxAge >= 50) return '50대 포함 — 인생 2막·은퇴·재정립 중심';
  if (maxAge >= 40) return '40대 포함 — 자녀교육·건강·전성기 활용 관점';
  if (maxAge >= 30) return '30대 — 결혼생활/커리어 성장/재테크/내집마련 관점';
  return '20대 — 연애·커리어 시작·자기계발 비중';
}

// ============================================================
// 공통 규칙
// ============================================================
function commonRules(
  p1: CompatPersonProfile, p2: CompatPersonProfile,
  main: Array<{ relationship: { title: string } }>,
  spicy: Array<{ relationship: { title: string } }>,
): string {
  const mainTitles = main.map(m => m.relationship.title).join(', ') || '평이한 케미';
  const spicyTitles = spicy.map(m => m.relationship.title).join(', ');

  return '=== 공통 규칙 ===\n' +
    '1. 반말만 사용. 친한 친구에게 조언하듯 다정하고 사근사근하게.\n' +
    '2. 20년 경력 사주 전문가 어조. 단정적·자신감 있는 톤. "~할 수 있어/일 수 있어" 같은 애매한 표현 금지.\n' +
    '3. 명리학 용어(천간합/육합/도화살/편관/식상/조후 등)는 자유롭게 사용. 단 한자 글자(甲乙, 七殺 등) 표기는 금지 — 한글로만.\n' +
    '4. 고전 문헌 인용 금지 ("적천수에/자평진전에/궁통보감에" 같은 표현 X).\n' +
    '5. 각 섹션 600~1100자. 임팩트 우선. 길이 채우려 같은 말 반복 금지.\n' +
    '6. 어려운 용어는 괄호 안에 쉬운 풀이 추가. 예: 식상(표현/실행), 재성(돈/결과), 관성(책임/압박).\n' +
    '7. "마치 ~같다" 금지! "~라고 할 수 있어" 같은 AI 패턴 금지. "이건 X야"로 단정.\n' +
    '8. "결론적으로/정리하면" 금지. 다음 섹션이 궁금해지게 끝내기.\n' +
    '9. 의문문으로 끝내지 마. 단정 문장으로 마무리.\n' +
    '10. 현재 연도 2026년. 과거 예측 금지, 미래만 다룸.\n\n' +

    '=== 명리학적 근거 필수 규칙 ===\n' +
    '시스템이 사전 계산한 다음 값을 반드시 본문에 명시적으로 활용:\n' +
    `  - 메인 관계 정의(${mainTitles})를 ##1번 "관계의 정의" 섹션의 핵심 비유로 반드시 사용\n` +
    (spicyTitles ? `  - 매콤 관계 정의(${spicyTitles})를 매콤 섹션의 핵심 비유로 사용\n` : '') +
    `  - ${p1.name} 격국(${p1.advanced.gyeokguk.primary}) / ${p2.name} 격국(${p2.advanced.gyeokguk.primary})은 최소 1회 본문 노출\n` +
    `  - ${p1.name} 조후(${p1.advanced.johoo.type}) / ${p2.name} 조후(${p2.advanced.johoo.type})는 관련 섹션에서 인용\n` +
    `  - 신살(${[...p1.shinsal, ...p2.shinsal].join(', ') || '없음'})은 해당 섹션에서 직접 호명\n` +
    '  - 합/충/형/반합 관계는 "오술 반합으로 화 기운이~" 같은 식으로 직접 인용\n' +
    '근거 제시 방법:\n' +
    `  - "${p1.name} 일간 ${CG[p1.saju.dStem]}이 ${p2.name} 일간 ${CG[p2.saju.dStem]}을 만나니까~" 식으로 어떤 글자끼리의 관계인지 명시\n` +
    '  - 인과관계 설명 ("X 구조라서 → 이런 결과")\n' +
    '  - 근거 없는 단순 결론 금지\n\n' +

    '=== 구체 명사 강제 규칙 ===\n' +
    '추상적 조언 금지. 각 섹션마다 지명·제품·브랜드·숫자 등 구체 명사 최소 3개 자연스럽게 박기.\n' +
    '예: "동쪽 공원/숲(분당 율동공원, 청량리 일대)이 너희 둘 충전소" / "주 1회 한강 변 데이트(마포·용산)" / "메탈 액세서리" 등.\n\n' +

    '=== 팩트폭행 규칙 ===\n' +
    '궁합도 솔직해야 신뢰. 칭찬만 하면 가치 없음. 각 섹션에서:\n' +
    '- 두 사람 충돌 포인트를 직구로 ("이거 분명 싸운 적 있지?")\n' +
    '- "이 커플의 지뢰밭" 구체 시나리오\n' +
    '- 돌려 말하지 마 ("약간 마찰이~"(X) → "이거 분명 싸운 적 있지?"(O))\n' +
    '- 팩트폭행 뒤 반드시 3줄 이상 구체적 해결책\n' +
    '- 콘텐츠 비율: 좋은 점 55% + 솔직한 문제점 25% + 해결책 20%\n\n' +

    (spicyTitles ?
      '=== 🌶️ 매콤 규칙 (남녀관계 전용 매콤 섹션에만 적용) ===\n' +
      '명리학적 근거 100% — 도화살/홍염살/일지합/편관/음양 균형으로만 매콤함 표현.\n' +
      '- 자극적이지만 천박하지 않게. "끌리는 화학반응" "심장 뛰는 코드" 같은 어휘. 노골적·19금 표현 X.\n' +
      '- 도발적 직설 OK: "둘 다 도화살이네ㅋㅋ 외부 유혹 다발이라 서로 질투 폭발하지?"\n' +
      '- 잠자리·스킨십 케미는 "일지 합 → 신체적 케미", "음양 편중 → 격정 vs 잔잔" 식으로 명리 근거에 묶어서.\n' +
      '- 위험 신호(양인+양인, 충+도화, 귀문관 등) 솔직히 짚되 해결책 동반.\n' +
      '- 매콤 섹션도 4단 구조 강제.\n\n'
      : '') +

    '=== 비유 & 표현 규칙 ===\n' +
    '비유 소재: 게임/주식/쇼핑/운동/드라마/넷플릭스/SNS/카페/직장 등 현대 소재.\n' +
    '위트: ㅋㅋ, "솔직히", "진짜", "레전드", "대박인 게" 자연스럽게.\n' +
    '"마치" 단어 절대 금지 — 한 번이라도 쓰면 탈락.\n\n' +

    '=== 해결책 구체성 규칙 ===\n' +
    '"조심해", "노력하면 돼" 같은 뜬구름 금지. 반드시 구체 행동 + 빈도 + 명리 근거:\n' +
    '- 좋은 예: "월 1회 동쪽 공원 산책. 둘 다 목 부족이라 동쪽이 충전소"\n' +
    '- 좋은 예: "다툰 다음 날 함께 따뜻한 차 한잔 — 일지 충 진정 효과"\n' +
    '- 개운법은 본문에 자연스럽게 녹여. "💡 실천 포인트" 같은 별도 블록 만들지 마.\n\n';
}

// ============================================================
// 4단 구조 / 동적 캐치 제목 (헬퍼)
// ============================================================
const fourPartRule =
  '=== 4단 문단 구조 (이 섹션 적용) ===\n' +
  '[문단 1] 캐치한 결론 + 강한 비유 (3~5문장) — 예: "운명의 자석" "라면+김치"\n' +
  '[문단 2] 명리학적 근거 (4~6문장) — 어떤 글자끼리 어떤 관계인지 명시\n' +
  '[문단 3] 더 깊은 메커니즘 (4~6문장) — 합/충/형, 십성, 오행 작용\n' +
  '[문단 4] 구체 행동 처방 (3~5문장) — 지명·제품·시간·숫자\n' +
  '→ 정확히 4문단. 문단 사이는 빈 줄로 구분.\n\n';

function titleRule(n: number, theme: string, hint?: string): string {
  return `##${n}.[이 관계만의 특징을 압축한 캐치프레이즈 — 비유/밈/이미지 활용, 12자 내외]##\n` +
    `   주제: ${theme}\n` +
    '   제목 지시: 평이한 제목 금지. 호기심을 자극하는 한 줄로.\n' +
    '   좋은 예: "운명의 자석같은 둘", "롤러코스터 위의 우리", "라면+김치 콤비"\n' +
    '   나쁜 예: "두 사람의 관계", "케미 분석", "궁합 결과"\n' +
    (hint ? `   힌트: ${hint}\n` : '');
}

// ============================================================
// 유형별 섹션 구성
// ============================================================
function sectionPlan(
  type: RelationType,
  p1: CompatPersonProfile, p2: CompatPersonProfile,
  isRomantic: boolean,
): string {
  switch (type) {
    case 'love':       return loveSections(p1, p2);
    case 'marriage':   return marriageSections(p1, p2);
    case 'friendship': return friendshipSections(p1, p2);
    case 'colleague':  return colleagueSections(p1, p2);
    case 'reunion':    return reunionSections(p1, p2);
    case 'crush':      return crushSections(p1, p2);
  }
}

// ─────────── 연애 (8개) ───────────
function loveSections(p1: CompatPersonProfile, p2: CompatPersonProfile): string {
  let out = '=== 아래 8개 섹션을 차례대로. 반드시 모두 작성. ##숫자.제목## 형식 ===\n\n';

  out += titleRule(1, '우리 관계의 정의 — 시스템이 매칭한 상위 관계 정의를 핵심 비유로',
    '메인 관계 정의 1~2개를 그대로 가져와 본문 비유의 뼈대로 사용. 4단 구조 강제');
  out += fourPartRule;

  out += titleRule(2, `${p1.name}과 ${p2.name}, 우리 둘은 (각자 사주 핵심)`,
    '좌우 분할로 두 사람 격국·일간 특성 한 문단씩. 4단 강제 X. 각 사람 4~6줄');
  out += '형식: 두 카드 (좌:' + p1.name + ' / 우:' + p2.name + '). 4단 구조 X.\n\n';

  out += titleRule(3, '케미 & 부딪힘 — 만났을 때 시너지와 갈등',
    '4단 강제. 사랑 언어 차이·시너지·반복 갈등 패턴 통합. ##5/##6에서 다시 다루지 마');
  out += fourPartRule;

  out += titleRule(4, '🌶️ 끌리는 진짜 이유 — 사주가 만든 화학반응',
    '매콤 섹션. 매콤 관계 정의를 핵심 비유로. 도화/홍염/일지합/편관 근거. 4단 강제');
  out += fourPartRule;
  out += '⚠ 매콤 규칙 적용. 천박 X, 자극적 OK.\n\n';

  out += titleRule(5, '권태기와 장기 흐름 — 시간이 가져올 변화',
    '권태기 도래 시기·반복 패턴·대운 동조도 통합. 4단 강제');
  out += fourPartRule;

  out += titleRule(6, '결혼 가능성 — 사주적 전망과 적기',
    '일지 합·배우자성·대운 분석. 4단 강제');
  out += fourPartRule;

  out += titleRule(7, '관계 처방 — 둘만의 사용설명서',
    '구체 행동 리스트. 데이트 추천/화해법/용신 활용/공동 취미 등. 4단 강제 X');
  out += '형식: 5~7개 구체 처방 리스트. 각 항목 명리 근거 + 구체 명사(지명/제품) 포함.\n\n';

  out += titleRule(8, '두 사람에게 — 따뜻한 편지',
    '3~4단 자유 편지. 격국·조후 흐름 기반 비유, 진심 응원');
  out += '형식: 자유 편지. 4단 강제 X.\n\n';
  return out;
}

// ─────────── 혼인 (8개) ───────────
function marriageSections(p1: CompatPersonProfile, p2: CompatPersonProfile): string {
  let out = '=== 아래 8개 섹션을 차례대로. 반드시 모두 작성. ##숫자.제목## 형식 ===\n\n';

  out += titleRule(1, '우리 부부의 정의 — 메인 관계 정의 활용');
  out += fourPartRule;

  out += titleRule(2, `${p1.name}과 ${p2.name}, 우리 둘은 (부부 관점)`);
  out += '형식: 좌우 분할 카드. 4단 X.\n\n';

  out += titleRule(3, '부부 다이내믹 — 일상 조화와 주도권',
    '관성/비겁/인성 균형 기반. 4단 강제');
  out += fourPartRule;

  out += titleRule(4, '돈 & 가정 경제 — 재성 비교',
    '소비/저축관/재테크 궁합. 4단 강제');
  out += fourPartRule;

  out += titleRule(5, '위기와 권태기 — 그리고 다시 불붙이는 법 🌶️',
    '일지 충·세운 위기 시기 + 매콤 단락(다시 불붙이는 법) 포함. 4단 강제. 부드럽게');
  out += fourPartRule;
  out += '⚠ 위기는 부드럽게 돌려 표현. 매콤 단락(다시 불붙이는 법)을 4번째 문단 처방에 포함.\n\n';

  out += titleRule(6, '자녀운 — 시주와 양육 궁합',
    '시주 + 식상 + 자녀 시기. 4단 강제');
  out += fourPartRule;
  if (p1.age >= 50 || p2.age >= 50) {
    out += '※ 50대 이상 — 성인 자녀 관계, 손주, 가족 모임 시기에 초점. 출산 이야기 금지.\n\n';
  }

  out += titleRule(7, '부부 처방 — 매주/매달 실천 가이드');
  out += '형식: 5~7개 구체 처방. 4단 X.\n\n';

  out += titleRule(8, '부부에게 — 따뜻한 편지');
  out += '형식: 자유 편지.\n\n';
  return out;
}

// ─────────── 우정 (7개) ───────────
function friendshipSections(p1: CompatPersonProfile, p2: CompatPersonProfile): string {
  let out = '=== 아래 7개 섹션을 차례대로. ##숫자.제목## 형식. 절대 연애/결혼 단어 사용 금지 ===\n\n';

  out += titleRule(1, '우리 우정의 정의 — 메인 관계 정의 활용');
  out += fourPartRule;

  out += titleRule(2, `${p1.name}과 ${p2.name}, 우리 둘은 (친구 관점)`);
  out += '형식: 좌우 분할 카드. 4단 X.\n\n';

  out += titleRule(3, '케미 & 에너지 흐름 — 충전 vs 소모',
    '같이 있으면 충전되는 타입인지 vs 피곤해지는 타입인지 솔직히. 4단 강제');
  out += fourPartRule;

  out += titleRule(4, '신뢰 체크 — 속마음·돈/비밀·위기 행동',
    '재성/겁재 + 식상/인성으로 돈 거래/비밀 공유/위기 시 행동 통합. 4단 강제');
  out += fourPartRule;

  out += titleRule(5, '오래갈 인연인지 — 타임라인',
    '일지 합/충 + 대운 흐름으로 10년/20년 후. 연도별 리스트 가능');
  out += '형식: 4단 또는 타임라인 리스트.\n\n';

  out += titleRule(6, '친해지는 법 — 함께하면 좋은 활동');
  out += '형식: 5~7개 구체 활동/시간대/장소 리스트. 4단 X.\n\n';

  out += titleRule(7, '친구에게 — 따뜻한 편지');
  out += '형식: 자유 편지.\n\n';
  return out;
}

// ─────────── 동료 (6개) ───────────
function colleagueSections(p1: CompatPersonProfile, p2: CompatPersonProfile): string {
  let out = '=== 아래 6개 섹션. ##숫자.제목## 형식. 사적 감정/사랑 표현 사용 금지 ===\n\n';

  out += titleRule(1, '이 콤비의 정의 — 업무 관점');
  out += fourPartRule;

  out += titleRule(2, `${p1.name}과 ${p2.name}, 우리 둘은 (직장 스타일)`);
  out += '형식: 좌우 분할. 4단 X.\n\n';

  out += titleRule(3, '업무 시너지 & 갈등 — 역할 분담과 충돌',
    '관성/식상/비겁 기반. 4단 강제');
  out += fourPartRule;

  out += titleRule(4, '사업·동업 가능성 — 함께 돈을 벌 수 있나',
    '재성/겁재 기반. 4단 강제');
  out += fourPartRule;

  out += titleRule(5, '함께 할 일 / 따로 할 일');
  out += '형식: 두 리스트 (각 3개). 4단 X.\n\n';

  out += titleRule(6, '동료에게 — 짧은 응원 한마디');
  out += '형식: 자유 (짧게).\n\n';
  return out;
}

// ─────────── 재회/이별 (7개) ───────────
function reunionSections(p1: CompatPersonProfile, p2: CompatPersonProfile): string {
  let out = '=== 아래 7개 섹션. ##숫자.제목## 형식 ===\n\n';

  out += titleRule(1, '이 인연의 정의 — 메인 관계 정의 활용');
  out += fourPartRule;

  out += titleRule(2, `${p2.name}의 현재 마음 (상대 사주 기반 추정)`,
    '상대 식상/관성 + 현재 대운으로 상대의 현재 감정 상태 추정. 4단 강제');
  out += fourPartRule;

  out += titleRule(3, '🌶️ 왜 못 잊는지 — 사주가 만든 얽힘',
    '매콤 섹션. 매콤 관계 정의 활용. 끊을 수 없는 코드의 정체. 4단 강제');
  out += fourPartRule;
  out += '⚠ 매콤 규칙 적용. 자극적이되 따뜻하게.\n\n';

  out += titleRule(4, '재회 가능성 + 잡을까 놓을까 (결정)',
    '천간합/일지합/충 + 대운으로 재회 확률 + 잡는 게 맞는지 종합 판단. 4단 강제');
  out += fourPartRule;

  out += titleRule(5, '새 인연 시기 — 배우자성 들어오는 해',
    '대운/세운 분석. 4단 강제');
  out += fourPartRule;

  out += titleRule(6, '마음 회복 처방 — 사주적 셀프케어');
  out += '형식: 5~7개 구체 처방 리스트. 4단 X.\n\n';

  out += titleRule(7, '너에게 — 위로 편지');
  out += '형식: 자유 편지. 부드럽게 위로.\n\n';
  return out;
}

// ─────────── 짝사랑/썸 (8개) ───────────
function crushSections(p1: CompatPersonProfile, p2: CompatPersonProfile): string {
  let out = '=== 아래 8개 섹션. ##숫자.제목## 형식 ===\n\n';

  out += titleRule(1, '지금 이 썸의 정의 — 메인 관계 정의 활용');
  out += fourPartRule;

  out += titleRule(2, `${p1.name}과 ${p2.name}, 우리 둘은`);
  out += '형식: 좌우 분할. 4단 X.\n\n';

  out += titleRule(3, '발전 가능성 + 상대 성향 — 이성으로 발전할 확률',
    '일간/일지 합 + 상대 재성/관성 구조로 발전 확률 + 이성 보는 시각. 4단 강제');
  out += fourPartRule;

  out += titleRule(4, `🌶️ 왜 ${p2.name}한테 미쳐있는지 — 끌림의 정체`,
    '매콤 섹션. 매콤 관계 정의 활용. 도화/홍염/편관 끌림 분석. 4단 강제');
  out += fourPartRule;
  out += '⚠ 매콤 규칙 적용.\n\n';

  out += titleRule(5, '누가 먼저 & 고백 타이밍 — 식상/관성 + 세운',
    '둘 중 누가 먼저 다가가야 성공 확률 높은지 + 2026~2028년 고백 적기. 4단 강제');
  out += fourPartRule;

  out += titleRule(6, '길어질 가능성 / 결론 — 이 썸 잡을 가치 있나',
    '미지근하게 끝날 구조인지, 진지하게 갈 구조인지. 솔직히. 4단 강제');
  out += fourPartRule;

  out += titleRule(7, '다가가는 법 — 구체 시나리오');
  out += '형식: 5~7개 구체 행동 리스트. 4단 X.\n\n';

  out += titleRule(8, '너에게 — 두근거리는 응원');
  out += '형식: 자유 편지.\n\n';
  return out;
}
