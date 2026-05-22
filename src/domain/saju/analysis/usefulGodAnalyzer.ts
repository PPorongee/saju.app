// Module 11 — 용신 (用神) 분석 (spec §11 5관점).
//
// 5관점:
//   1. climate (조후) — 한열조습 조절
//   2. strength (억부) — 신강/신약 균형
//   3. bridge (통관) — 충돌 오행 중재
//   4. illnessMedicine (병약) — 과다·고립 다스림
//   5. structure (격국) — 격을 살리는 오행
//
// 각 method가 favorable/unfavorable 오행 후보 + 자기 신뢰도 score(0~1) 부여.
// 가중평균으로 primaryUseful 결정.

import type { FourPillars } from '../calendar/pillarCalculator';
import type {
  UsefulGodAnalysis, TenGodAnalysis, ElementStrengthAnalysis, DayMasterStrengthAnalysis,
} from '../report/sajuReportSchema';
import type { StructureAnalysis } from './structureAnalyzer';
import { ELEMENTS, STEM_ELEMENT, PRODUCES, RESTRAINS, type Element } from '../rules/elements';
import { SCORING } from '../rules/scoringWeights';

interface MethodResult {
  favorable: Element[];
  unfavorable: Element[];
  score: number;       // 0~1: 이 method의 신뢰도
  reasons: string[];
}

export function analyzeUsefulGod(args: {
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  structure: StructureAnalysis;
}): UsefulGodAnalysis {
  const { pillars, elements, dayMasterStrength: dm, structure } = args;
  const myEl = STEM_ELEMENT[pillars.dayMaster];

  const climate = climateMethod(pillars, elements);
  const strength = strengthMethod(myEl, dm);
  const bridge = bridgeMethod(elements);
  const illness = illnessMedicineMethod(myEl, elements);
  const structureM = structureMethod(myEl, structure, dm);

  const methods: Record<string, MethodResult> = { climate, strength, bridge, illnessMedicine: illness, structure: structureM };
  const weights = SCORING.USEFUL_GOD_METHOD_WEIGHTS;

  // 각 오행 점수 — favorable=가산, unfavorable=차감 (method 가중 × 신뢰도)
  // favorable 배열 내 순서 차등: idx 0 = 1순위(풀 가중), idx 1+ = 보조(0.5).
  const elemScores: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const [name, m] of Object.entries(methods)) {
    const w = weights[name as keyof typeof weights];
    m.favorable.forEach((el, idx) => {
      const positionWeight = idx === 0 ? 1.0 : 0.5;
      elemScores[el] += w * m.score * positionWeight;
    });
    for (const el of m.unfavorable) elemScores[el] -= w * m.score;
  }

  // ★ 조후 절대 우선 원칙 (명리 정통: 한여름·한겨울은 조후가 다른 룰 압도)
  //   climate.score가 0.9 이상이면 그 1순위 오행에 강한 boost.
  if (climate.score >= 0.9 && climate.favorable.length > 0) {
    elemScores[climate.favorable[0]] += 3.0;
  }

  // 신강이면 자기 오행은 후보에서 강하게 배제
  if (dm.level === 'very-strong' || dm.level === 'strong') {
    elemScores[myEl] -= 1.5;
  }

  const entries = ELEMENTS.map(el => [el, elemScores[el]] as [Element, number]);
  const sortedFav = [...entries].sort((a, b) => b[1] - a[1]);
  const sortedUnfav = [...entries].sort((a, b) => a[1] - b[1]);

  const primary = sortedFav[0][0];
  const secondary = sortedFav[1][1] > 0 ? sortedFav[1][0] : undefined;
  const ki = sortedUnfav[0][0];

  // method 합의도 → confidence
  const positiveMethods = Object.values(methods).filter(m => m.favorable.includes(primary)).length;
  const confidence: 'high' | 'medium' | 'low' =
    positiveMethods >= 3 ? 'high' : positiveMethods >= 2 ? 'medium' : 'low';

  const allReasons: string[] = [];
  for (const [name, m] of Object.entries(methods)) {
    if (m.reasons.length > 0) {
      allReasons.push(`[${name}] ${m.reasons.join(' / ')}`);
    }
  }

  const caution: string[] = [];
  if (confidence === 'low') caution.push('5관점 합의도 낮음 — 격국·조후 우선 검토 필요');
  if (primary === ki)        caution.push('주의: primary와 ki가 같음 — 입력 또는 가중치 검토');

  return {
    primaryUseful: { type: 'element', value: primary },
    secondaryUseful: secondary ? { type: 'element', value: secondary } : undefined,
    favorable: secondary ? [primary, secondary] : [primary],
    unfavorable: [ki],
    methodScores: {
      climate: climate.score,
      strength: strength.score,
      bridge: bridge.score,
      illnessMedicine: illness.score,
      structure: structureM.score,
    },
    reasons: allReasons,
    caution,
    confidence,
  };
}

// ============================================================
// 5개 method
// ============================================================

function climateMethod(pillars: FourPillars, elements: ElementStrengthAnalysis): MethodResult {
  const monthBranch = pillars.month.branch;
  const reasons: string[] = [];
  let favorable: Element[] = [];
  let unfavorable: Element[] = [];
  let score = 0.5;

  // 한여름 사오미
  if (['사', '오', '미'].includes(monthBranch)) {
    favorable = ['water', 'metal'];  // 水 1순위 (조후), 金 (수원)
    unfavorable = ['fire'];
    score = 0.9;
    reasons.push(`월지 ${monthBranch} 여름 → 火 과열, 水 조후 필수 (없으면 金 수원)`);
  }
  // 한겨울 해자축
  else if (['해', '자', '축'].includes(monthBranch)) {
    favorable = ['fire', 'wood'];
    unfavorable = ['water'];
    score = 0.9;
    reasons.push(`월지 ${monthBranch} 겨울 → 水 한기, 火 조후 필수 (없으면 木 점화)`);
  }
  // 봄 인묘진
  else if (['인', '묘', '진'].includes(monthBranch)) {
    favorable = ['fire'];   // 봄 木 → 火로 향상
    score = 0.5;
    reasons.push(`월지 ${monthBranch} 봄 → 火로 木 향상 보조`);
  }
  // 가을 신유술
  else if (['신', '유', '술'].includes(monthBranch)) {
    favorable = ['fire'];   // 火로 金 제어
    score = 0.5;
    reasons.push(`월지 ${monthBranch} 가을 → 火로 金 제어`);
  }

  // 조후가 이미 충족됐다면 score 낮춤 (이미 시원/이미 따뜻)
  if (elements.climate.coldHot === 'balanced') score *= 0.6;

  return { favorable, unfavorable, score, reasons };
}

function strengthMethod(myEl: Element, dm: DayMasterStrengthAnalysis): MethodResult {
  const reasons: string[] = [];
  let favorable: Element[] = [];
  let unfavorable: Element[] = [];
  let score = 0.7;

  if (dm.level === 'very-strong' || dm.level === 'strong') {
    // 설기·극제 — 식상(내가 생함) · 재성(내가 극함) · 관성(나를 극함)
    favorable = [PRODUCES[myEl], RESTRAINS[myEl], inverseRestrains(myEl)];
    // 자기 오행 + 인성(생해주는) → 더 강해지면 안 됨
    unfavorable = [myEl, inverseProduces(myEl)];
    score = dm.level === 'very-strong' ? 0.9 : 0.7;
    reasons.push(`신강(${dm.level}) → 설기·극제 (식상/재성/관성 유익, 인성/비겁 과중)`);
  } else if (dm.level === 'weak' || dm.level === 'very-weak') {
    // 생조 — 인성(생해주는) · 비겁(자기)
    favorable = [inverseProduces(myEl), myEl];
    unfavorable = [PRODUCES[myEl], RESTRAINS[myEl], inverseRestrains(myEl)];
    score = dm.level === 'very-weak' ? 0.9 : 0.7;
    reasons.push(`신약(${dm.level}) → 생조 (인성/비겁 유익, 식상/재성/관성 과중)`);
  } else {
    // 중화 — 조후·격국에 양보
    score = 0.3;
    reasons.push('중화 — 억부 영향 약함, 조후/격국 우선');
  }

  return { favorable, unfavorable, score, reasons };
}

function bridgeMethod(elements: ElementStrengthAnalysis): MethodResult {
  const reasons: string[] = [];
  const favorable: Element[] = [];
  const score = 0.5;

  // 강한 두 오행이 상극이면 그 사이 통관 오행 추천
  const strong = elements.strongest;
  const pairs: Array<[Element, Element, Element]> = [
    ['water', 'fire',  'wood'],   // 수극화 → 목 통관
    ['fire',  'metal', 'earth'],  // 화극금 → 토 통관
    ['metal', 'wood',  'water'],  // 금극목 → 수 통관
    ['wood',  'earth', 'fire'],   // 목극토 → 화 통관
    ['earth', 'water', 'metal'],  // 토극수 → 금 통관
  ];
  for (const [a, b, bridge] of pairs) {
    if (strong.includes(a) && strong.includes(b)) {
      favorable.push(bridge);
      reasons.push(`${a}-${b} 상극 → ${bridge}로 통관`);
    }
  }

  return { favorable, unfavorable: [], score, reasons };
}

function illnessMedicineMethod(myEl: Element, elements: ElementStrengthAnalysis): MethodResult {
  const reasons: string[] = [];
  const favorable: Element[] = [];
  const unfavorable: Element[] = [];
  let score = 0.4;

  // 과다 오행 = 병 → 극하는 오행 또는 설하는 오행 = 약
  for (const dom of elements.excessive) {
    if (dom === myEl) continue; // 자기 자신은 별도 처리
    favorable.push(inverseRestrainsByElement(dom)); // dom을 극하는 오행
    favorable.push(PRODUCES[dom]);                  // dom이 설기되는 오행
    unfavorable.push(inverseProduces(dom));         // dom을 더 생함
    score = 0.7;
    reasons.push(`${dom} 과다(병) → ${inverseRestrainsByElement(dom)}로 극(약), ${PRODUCES[dom]}로 설(약)`);
  }

  // 고립된 오행이 일간에 필요한 도구면 그 오행을 생하는 게 약
  for (const iso of elements.isolated) {
    if (iso === myEl) continue;
    // 단순화 — 고립된 도구를 살리는 오행 추천
    favorable.push(inverseProduces(iso));
    reasons.push(`${iso} 고립 → ${inverseProduces(iso)}로 보충`);
  }

  return { favorable, unfavorable, score, reasons };
}

function structureMethod(myEl: Element, structure: StructureAnalysis, dm: DayMasterStrengthAnalysis): MethodResult {
  const reasons: string[] = [];
  const favorable: Element[] = [];
  const unfavorable: Element[] = [];
  let score = 0.6;

  const name = structure.name;
  reasons.push(`격: ${name}`);

  // 격국별 보호 오행 (간단 휴리스틱 — 정통 자평진전 기준)
  if (name === '정관격' || name === '편관격') {
    // 관격: 신약이면 인성, 신강이면 재성으로 관 생재
    if (dm.level === 'weak' || dm.level === 'very-weak') favorable.push(inverseProduces(myEl));
    else favorable.push(RESTRAINS[myEl]);
    score = 0.7;
  }
  else if (name === '정인격' || name === '편인격') {
    // 인격: 신강이면 식상으로 설기, 신약이면 관성으로 인 보호
    if (dm.level === 'very-strong' || dm.level === 'strong') favorable.push(PRODUCES[myEl]);
    else favorable.push(inverseRestrains(myEl));
    score = 0.7;
  }
  else if (name === '식신격' || name === '상관격') {
    // 식상격: 재성 (식신생재). 신약하면 인성으로 패인
    favorable.push(RESTRAINS[myEl]);
    if (dm.level === 'weak' || dm.level === 'very-weak') favorable.push(inverseProduces(myEl));
    score = 0.7;
  }
  else if (name === '정재격' || name === '편재격') {
    // 재격: 신강이면 관성으로 재생관, 신약이면 비겁으로 도움
    if (dm.level === 'very-strong' || dm.level === 'strong') favorable.push(inverseRestrains(myEl));
    else favorable.push(myEl);
    score = 0.7;
  }
  else {
    score = 0.3;
  }

  return { favorable, unfavorable, score, reasons };
}

// ============================================================
// 헬퍼 — 역방향 생/극
// ============================================================

/** myEl을 생하는 오행 (인성) */
function inverseProduces(myEl: Element): Element {
  return (Object.keys(PRODUCES) as Element[]).find(k => PRODUCES[k] === myEl)!;
}

/** myEl을 극하는 오행 (관성) */
function inverseRestrains(myEl: Element): Element {
  return inverseRestrainsByElement(myEl);
}

function inverseRestrainsByElement(target: Element): Element {
  return (Object.keys(RESTRAINS) as Element[]).find(k => RESTRAINS[k] === target)!;
}
