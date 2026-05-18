/**
 * 격국(格局) · 조후(調候) · 사주 정수(精髓) 분석 모듈
 *
 * 코드가 결정론적으로 사주의 큰 그림을 파악해 AI 프롬프트에 주입한다.
 * 핵심 격국 6종과 조후 4분류, 그리고 한 줄 정수 요약을 제공한다.
 *
 * Reference: 자평진전, 적천수 (단, 본 모듈은 인용 X — 판별 로직만 사용)
 */

import { SajuResult, OH_CG, OH_JJ, calcSipsung, CG, JJ, JIJANGGAN } from './saju-calc';

const OH_LIST = ['목', '화', '토', '금', '수'] as const;
type Oh = typeof OH_LIST[number];

const OH_SAENG: Record<Oh, Oh> = { '목': '화', '화': '토', '토': '금', '금': '수', '수': '목' };
const OH_GEUK: Record<Oh, Oh> = { '목': '토', '화': '금', '토': '수', '금': '목', '수': '화' };

export interface SipsungCount {
  비겁: number;
  식상: number;
  재성: number;
  관성: number;
  인성: number;
}

function classify(name: string, counts: SipsungCount) {
  if (['비견', '겁재'].includes(name)) counts.비겁++;
  else if (['식신', '상관'].includes(name)) counts.식상++;
  else if (['편재', '정재'].includes(name)) counts.재성++;
  else if (['편관', '정관'].includes(name)) counts.관성++;
  else if (['편인', '정인'].includes(name)) counts.인성++;
}

/**
 * 십성 카운트 — 천간 4개(일간 본인 포함) + 지지 4개 본기 합산.
 * 일간 본인을 비겁에 포함하는 것이 명리학 표준 (자기 자신도 비견의 일종).
 */
export function countSipsung(sj: SajuResult): SipsungCount {
  const counts: SipsungCount = { 비겁: 0, 식상: 0, 재성: 0, 관성: 0, 인성: 0 };
  const stems = [sj.yStem, sj.mStem, sj.dStem]; if (sj.hStem >= 0) stems.push(sj.hStem);
  for (const s of stems) {
    classify(calcSipsung(sj.dStem, s), counts);
  }
  // 지지 본기 (JIJANGGAN의 마지막 = 본기)
  const branches = [sj.yBranch, sj.mBranch, sj.dBranch]; if (sj.hBranch >= 0) branches.push(sj.hBranch);
  for (const b of branches) {
    const hidden = JIJANGGAN[b];
    if (hidden.length > 0) {
      const main = hidden[hidden.length - 1];
      classify(calcSipsung(sj.dStem, main), counts);
    }
  }
  return counts;
}

// ============================================================
// 1. 신강/신약 판단
// ============================================================
export interface StrengthResult {
  isStrong: boolean;
  score: number;
  deukryung: boolean;
  tonggeun: number;
  bigup: number;
  label: '신왕' | '신강' | '중화' | '신약' | '신쇠';
}

export function analyzeStrength(sj: SajuResult, ohCount: Record<string, number>): StrengthResult {
  const dayOh = OH_CG[sj.dStem] as Oh;
  const mBranchOh = OH_JJ[sj.mBranch] as Oh;
  const deukryung = mBranchOh === dayOh || OH_SAENG[mBranchOh] === dayOh;

  const branches = [sj.yBranch, sj.mBranch, sj.dBranch]; if (sj.hBranch >= 0) branches.push(sj.hBranch);
  const stems = [sj.yStem, sj.mStem, sj.dStem]; if (sj.hStem >= 0) stems.push(sj.hStem);

  let tonggeun = 0;
  for (const b of branches) if (OH_JJ[b] === dayOh) tonggeun++;

  let bigup = -1; // 일간 본인 제외
  for (const s of stems) if (OH_CG[s] === dayOh) bigup++;

  const score = (deukryung ? 3 : 0) + tonggeun * 2 + bigup * 1.5;

  let label: StrengthResult['label'];
  if (score >= 8) label = '신왕';
  else if (score >= 4) label = '신강';
  else if (score >= 2.5) label = '중화';
  else if (score >= 1) label = '신약';
  else label = '신쇠';

  return { isStrong: score >= 4, score, deukryung, tonggeun, bigup, label };
}

// ============================================================
// 2. 격국(格局) 판별 - 핵심 6종
// ============================================================
export type GyeokgukType =
  | '군겁쟁재'      // 비겁이 많고 재성을 빼앗는 형국
  | '식상생재'      // 식상이 재성을 도와 부 축적
  | '재자약살'      // 재성이 약한 관성을 도움
  | '관인상생'      // 관성이 인성을, 인성이 일간을 도움
  | '종왕격'        // 일간+비겁+인성이 극강, 충/극 없음
  | '종강격'        // 인성이 극강
  | '식신제살'      // 식신이 강한 관성(살)을 다스림
  | '인성과다'      // 인성이 너무 많아 비겁만 키움
  | '재다신약'      // 재성은 많은데 일간이 약함
  | '일반격';       // 위 어디에도 해당 안 됨

export interface GyeokgukResult {
  primary: GyeokgukType;
  secondary?: GyeokgukType;
  description: string;
}

export function analyzeGyeokguk(
  sj: SajuResult,
  ohCount: Record<string, number>,
  strength: StrengthResult,
  sipsung: SipsungCount,
): GyeokgukResult {
  const { 비겁, 식상, 재성, 관성, 인성 } = sipsung;

  // 종왕격: 비겁+인성 합이 매우 많고 재/관/식상 미약
  if (비겁 + 인성 >= 5 && 식상 + 재성 + 관성 <= 1) {
    return {
      primary: '종왕격',
      description: '일간과 비겁·인성이 극강하여 그 세력을 따르는 격. 같은 오행 운에 발복',
    };
  }

  // 종강격: 인성 극강 (어머니 기운만 극강)
  if (인성 >= 4 && 식상 + 재성 <= 1) {
    return {
      primary: '종강격',
      description: '인성이 압도적으로 강해 학문·문서운이 두드러지나 실행력 부족 가능',
    };
  }

  // 군겁쟁재: 비겁이 재성보다 많고 재성이 위협받는 형국
  if (비겁 >= 3 && 재성 >= 1 && 비겁 > 재성) {
    return {
      primary: '군겁쟁재',
      secondary: strength.isStrong ? undefined : '재다신약',
      description: '비겁(친구/형제 자아)이 많아 재성(돈)을 두고 다투는 형국. 금전 분쟁·동업 손실 조심',
    };
  }

  // 재다신약: 재성 많은데 일간 약함
  if (재성 >= 3 && !strength.isStrong) {
    return {
      primary: '재다신약',
      description: '재물이 보이나 감당할 힘이 부족. 비겁/인성으로 일간 보강이 우선',
    };
  }

  // 식상생재: 식상 → 재성 (활발한 표현+돈)
  if (식상 >= 2 && 재성 >= 2) {
    return {
      primary: '식상생재',
      description: '표현력·창의성(식상)이 재물(재성)을 만들어주는 좋은 구조. 사업/창작 적합',
    };
  }

  // 식신제살: 식신이 편관 다스림
  if (식상 >= 2 && 관성 >= 2 && !strength.isStrong) {
    return {
      primary: '식신제살',
      description: '식신으로 강한 관성(압박/스트레스)을 다스리는 격. 위기 돌파력 좋음',
    };
  }

  // 관인상생: 관 → 인 → 일간
  if (관성 >= 1 && 인성 >= 2) {
    return {
      primary: '관인상생',
      description: '관성(권위/책임)이 인성(학문/명예)으로 흐르는 격. 공직·전문직 적합',
    };
  }

  // 인성과다: 인성 많아 비겁만 키우는 형국 (모친 의존)
  if (인성 >= 3 && 식상 <= 1) {
    return {
      primary: '인성과다',
      description: '인성이 과해 모친 영향력 크고 독립심·실행력 저하 가능. 식상 보완 필요',
    };
  }

  return {
    primary: '일반격',
    description: '특수 격국에 속하지 않는 보편적 구조. 십성 균형 분석이 우선',
  };
}

// ============================================================
// 3. 조후(調候) 분류 - 사주의 온도/습도
// ============================================================
export type JohooType = '조열' | '한랭' | '조습' | '평윤';

export interface JohooResult {
  type: JohooType;
  description: string;
  needed: Oh[]; // 보충 필요 오행
}

export function analyzeJohoo(sj: SajuResult, ohCount: Record<string, number>): JohooResult {
  const fire = ohCount['화'] || 0;
  const water = ohCount['수'] || 0;
  const earth = ohCount['토'] || 0;
  const wood = ohCount['목'] || 0;
  const metal = ohCount['금'] || 0;
  const mBranchOh = OH_JJ[sj.mBranch];
  const isSummerMonth = ['사', '오', '미'].includes(JJ[sj.mBranch]);
  const isWinterMonth = ['해', '자', '축'].includes(JJ[sj.mBranch]);

  // 조열 (강): 화 강 + 수 약
  if (fire >= 3 && water <= 1) {
    return {
      type: '조열',
      description: '화 기운이 강하고 수 기운이 부족해 뜨겁고 건조한 사주. 단비(수)와 쟁기(금)로 균형',
      needed: ['수', '금'],
    };
  }

  // 조열 (중): 여름월 + 화토 합 강 + 수 약 + 금 미약
  if (isSummerMonth && fire + earth >= 4 && water <= 2 && metal <= 1) {
    return {
      type: '조열',
      description: '여름월 출생에 화·토가 두텁고 금·수가 빈약해 메마른 대지 형국. 수(단비)와 금(쟁기)이 절실',
      needed: metal === 0 ? ['금', '수'] : ['수'],
    };
  }

  // 한랭: 수 강 + 화 약 (특히 겨울 출생)
  if (water >= 3 && fire <= 1) {
    return {
      type: '한랭',
      description: '수 기운이 강하고 화 기운이 부족해 차갑고 어두운 사주. 따뜻한 햇볕(화)이 절실',
      needed: ['화', '목'],
    };
  }

  // 조습: 토 많고 수 약, 화도 약함 (메마른 진흙)
  if (earth >= 4 && water <= 1 && fire <= 1) {
    return {
      type: '조습',
      description: '토 기운이 두텁고 수·화가 부족해 메마른 진흙 같은 사주. 수·목·금이 골고루 필요',
      needed: ['수', '목', '금'],
    };
  }

  // 여름인데 수 1개 이하면 조열 약버전
  if (isSummerMonth && water <= 1) {
    return {
      type: '조열',
      description: '여름 출생에 수 기운이 부족해 사주가 메마름. 수 보충이 가장 시급',
      needed: ['수'],
    };
  }

  // 겨울인데 화 1개 이하면 한랭 약버전
  if (isWinterMonth && fire <= 1) {
    return {
      type: '한랭',
      description: '겨울 출생에 화 기운이 부족해 차가움. 따뜻한 기운(화·목) 보충 필요',
      needed: ['화', '목'],
    };
  }

  return {
    type: '평윤',
    description: '오행 균형이 비교적 평탄해 조후 균형은 무난',
    needed: [],
  };
}

// ============================================================
// 4. 사주 정수(精髓) 한 줄 요약
// ============================================================
export interface SajuEssence {
  oneLineKo: string;
  oneLineEn: string;
}

export function buildSajuEssence(
  sj: SajuResult,
  strength: StrengthResult,
  gyeokguk: GyeokgukResult,
  johoo: JohooResult,
): SajuEssence {
  const dayPillar = CG[sj.dStem] + JJ[sj.dBranch];
  const dayOh = OH_CG[sj.dStem];
  const monthOh = OH_JJ[sj.mBranch];

  const allianceOhs = new Set([dayOh, monthOh]);
  const allianceLabel = allianceOhs.size === 1
    ? `${dayOh} 일색형`
    : `${dayOh}${monthOh} 동맹형`;

  const johooSuffix = johoo.type === '평윤'
    ? '오행 균형형'
    : `${johoo.type} 사주 (${johoo.needed.join('·')} 보완 필요)`;

  const oneLineKo = `${dayPillar} 일주 ${allianceLabel} — ${gyeokguk.primary} ${strength.label}사주, ${johooSuffix}`;
  const oneLineEn = `${dayPillar} day pillar (${allianceLabel}) — ${gyeokguk.primary}, ${strength.label}, ${johoo.type}`;

  return { oneLineKo, oneLineEn };
}

// ============================================================
// 5. 통합 분석 + 프롬프트 블록
// ============================================================
export interface AdvancedAnalysis {
  sipsung: SipsungCount;
  strength: StrengthResult;
  gyeokguk: GyeokgukResult;
  johoo: JohooResult;
  essence: SajuEssence;
  jijangganBlock: string;
  promptBlock: string;
}

function buildJijangganBlock(sj: SajuResult): string {
  const labels = ['년지', '월지', '일지', '시지'];
  const branches = [sj.yBranch, sj.mBranch, sj.dBranch];
  if (sj.hBranch >= 0) branches.push(sj.hBranch);
  const lines: string[] = ['지장간 (각 지지 속 숨은 천간):'];
  for (let i = 0; i < branches.length; i++) {
    const stems = JIJANGGAN[branches[i]].map(s => `${CG[s]}(${OH_CG[s]})`).join(', ');
    lines.push(`  - ${labels[i]} ${JJ[branches[i]]}: ${stems}`);
  }
  return lines.join('\n');
}

export function analyzeAdvanced(sj: SajuResult, ohCount: Record<string, number>): AdvancedAnalysis {
  const sipsung = countSipsung(sj);
  const strength = analyzeStrength(sj, ohCount);
  const gyeokguk = analyzeGyeokguk(sj, ohCount, strength, sipsung);
  const johoo = analyzeJohoo(sj, ohCount);
  const essence = buildSajuEssence(sj, strength, gyeokguk, johoo);
  const jijangganBlock = buildJijangganBlock(sj);

  const promptBlock = [
    '=== 사주 정수(시스템 사전 계산 — 이걸 기반으로 해석할 것) ===',
    `한 줄 정수: ${essence.oneLineKo}`,
    '',
    `십성 분포: 비겁 ${sipsung.비겁} / 식상 ${sipsung.식상} / 재성 ${sipsung.재성} / 관성 ${sipsung.관성} / 인성 ${sipsung.인성}`,
    `신강신약: ${strength.label} (점수 ${strength.score.toFixed(1)}, 득령 ${strength.deukryung ? 'O' : 'X'}, 통근 ${strength.tonggeun}, 비겁 ${strength.bigup})`,
    `격국: ${gyeokguk.primary}${gyeokguk.secondary ? ' + ' + gyeokguk.secondary : ''}`,
    `  → ${gyeokguk.description}`,
    `조후: ${johoo.type}`,
    `  → ${johoo.description}`,
    johoo.needed.length > 0 ? `  → 보충 필요 오행: ${johoo.needed.join(', ')}` : '',
    '',
    jijangganBlock,
    '',
    '⚠️ 위 결과는 시스템이 결정론적으로 판별한 값이야. AI가 임의로 바꾸지 마.',
    '⚠️ 격국명(예: 군겁쟁재)과 조후(예: 조열)는 본문 해설에 반드시 1회 이상 자연스럽게 언급할 것.',
  ].filter(Boolean).join('\n');

  return { sipsung, strength, gyeokguk, johoo, essence, jijangganBlock, promptBlock };
}
