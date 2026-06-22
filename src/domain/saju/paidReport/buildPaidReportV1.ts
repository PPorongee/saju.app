// Paid Report Productization V1 — DETERMINISTIC builder.
//
// PersonalSajuGptInput(coreAnalysis 산출물) → PaidSajuReportV1.
// GPT 호출 없음. Date.now/env 없음. 모든 visible verdict는 evidenceMap의 evidenceId를 가진다.
// microcopy(2~4문장 다듬기)는 별도 단계 — 여기서는 결정론 seed만 만든다.

import type {
  PersonalSajuGptInput,
  TenGod,
  LifeWeapon,
  LifeTrap,
  LifeWeaponEvidenceSource,
  LifeTrapEvidenceSource,
  CareerMatch,
  ConditionalCareerMatch,
} from '../report/sajuReportSchema';
import type { Element } from '../rules/elements';
import { ELEMENT_KO, STEM_ELEMENT } from '../rules/elements';
import type { HeavenlyStem } from '../rules/heavenlyStems';
import { buildStarKeywordCard } from '../star/starKeywordCardBuilder';
import type { StarKeywordCardData } from '../star/starArchetypeTypes';

import type {
  PaidSajuReportV1,
  PaidReportValidation,
  PaidArchetypeCard,
  PaidCoreSummary,
  PaidWeaponItem,
  PaidTrapItem,
  PaidMoneyGuide,
  PaidTimingGuide,
  PaidTimingYear,
  PaidLuckGuide,
  PaidCareerGuide,
  PaidCareerFit,
  PaidRelationshipGuide,
  PaidDetailedNarrative,
  PaidDetailedNarrativeSection,
  PaidVerdictItem,
  PaidEvidenceSource,
} from './paidReportTypes';
import { EvidenceCollector } from './evidenceMap';
import { FAVORABLE_ELEMENT_SYMBOLS, BLOCKING_ELEMENT_ENVIRONMENTS } from './elementSymbols';
import { derivePeopleGuide } from './derivers/peopleGuide';
import { deCliche, hasCliche } from './textHygiene';
import { koElements, iGa, euRo } from './koText';
import { renderPaidReportProse } from './paidReportProse';
import { validatePaidReportV1 } from './paidReportValidator';

// ============================================================
// 작은 헬퍼
// ============================================================

const ALL_ELEMENTS = ['wood', 'fire', 'earth', 'metal', 'water'] as const;
function asElement(v: Element | TenGod | undefined): Element | null {
  return v && (ALL_ELEMENTS as readonly string[]).includes(v) ? (v as Element) : null;
}

function tg(g: PersonalSajuGptInput, name: TenGod): number {
  return g.coreAnalysis.tenGods.totals[name] ?? 0;
}

/** dominant 십성(0 초과 중 최대). */
function dominantTenGod(g: PersonalSajuGptInput): TenGod | null {
  const totals = g.coreAnalysis.tenGods.totals;
  const sorted = (Object.entries(totals) as Array<[TenGod, number]>)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  return sorted[0]?.[0] ?? null;
}

function isWeak(g: PersonalSajuGptInput): boolean {
  const lv = g.coreAnalysis.dayMasterStrength.level;
  return lv === 'weak' || lv === 'very-weak';
}

/** usefulGod의 element 묶음(primary가 element면 포함 + favorable의 element들). */
function favorableElements(g: PersonalSajuGptInput): Element[] {
  const out: Element[] = [];
  const ug = g.coreAnalysis.usefulGod;
  const p = ug.primaryUseful.type === 'element' ? asElement(ug.primaryUseful.value) : null;
  if (p) out.push(p);
  for (const f of ug.favorable) {
    const e = asElement(f);
    if (e && !out.includes(e)) out.push(e);
  }
  // primary가 tenGod이면 그 십성의 오행으로 대체 시도는 생략(favorable element로 충분).
  return out;
}

function unfavorableElements(g: PersonalSajuGptInput): Element[] {
  const out: Element[] = [];
  for (const u of g.coreAnalysis.usefulGod.unfavorable) {
    const e = asElement(u);
    if (e && !out.includes(e)) out.push(e);
  }
  return out;
}

function hasStar(g: PersonalSajuGptInput, name: string): boolean {
  return g.coreAnalysis.specialStars.some((s) => s.name === name);
}

// LifeWeapon/LifeTrap evidence source → PaidEvidenceSource
function mapWeaponSource(s: LifeWeaponEvidenceSource): PaidEvidenceSource {
  switch (s) {
    case 'tenGod': return 'tenGod';
    case 'element': return 'element';
    case 'dayMasterStrength': return 'dayMasterStrength';
    case 'usefulGod': return 'usefulGod';
    case 'specialPoint': return 'specialPoint';
    case 'daewoon': return 'daewoon';
    case 'sewoon': return 'sewoon';
    default: return 'tenGod';
  }
}
function mapTrapSource(s: LifeTrapEvidenceSource): PaidEvidenceSource {
  switch (s) {
    case 'tenGod': return 'tenGod';
    case 'elementExcess':
    case 'elementDeficiency': return 'element';
    case 'conflict': return 'conflict';
    case 'usefulGod':
    case 'unfavorableGod': return 'usefulGod';
    case 'specialPoint': return 'specialPoint';
    default: return 'tenGod';
  }
}

let slugCounter = 0;
function nextSlug(prefix: string): string {
  slugCounter += 1;
  return `${prefix}-${slugCounter}`;
}

// ============================================================
// 1. archetypeCard
// ============================================================

function buildArchetypeCard(
  g: PersonalSajuGptInput,
  card: StarKeywordCardData,
  ev: EvidenceCollector,
): PaidArchetypeCard {
  const dm = g.birthChart.dayMaster;
  const dominant = dominantTenGod(g);
  const level = g.coreAnalysis.dayMasterStrength.level;

  const ids: string[] = [];
  ids.push(ev.add('dayMaster', dm, `일간 ${dm}`, `일간 ${dm} — 정체성의 뿌리`));
  if (dominant) {
    ids.push(ev.add('tenGod', dominant, `${dominant} 우세`, `십성 ${iGa(dominant)} 가장 강함 — 성향의 중심`));
  }
  ids.push(ev.add('dayMasterStrength', level, `${dm} ${level}`, `신강신약 ${level} — 에너지 운용의 방향`));

  return {
    id: 'archetypeCard',
    title: '나의 별',
    subtitle: card.label,
    verdict: card.displayTitle,
    evidenceIds: ids,
    confidence: 'high',
    displayPriority: 0,
    riskLevel: 'none',
    forbiddenClaims: ['이 별은 무조건 성공한다'],
    nickname: card.archetype.title,
    oneLiner: card.shortDescription,
    keywords: card.keywords.slice(0, 5),
    brightSide: card.brightSide,
    shadowSide: card.shadowSide,
  };
}

// ============================================================
// 2. coreSummary
// ============================================================

function buildCoreSummary(
  g: PersonalSajuGptInput,
  card: StarKeywordCardData,
  ev: EvidenceCollector,
): PaidCoreSummary {
  const ids: string[] = [];
  // identityKeywords 우선, 단 클리셰 키워드는 제외
  const cleanIdentity = g.identityKeywords.filter((k) => !hasCliche(k.keyword));
  let keywords: string[] = [];
  if (cleanIdentity.length >= 3) {
    keywords = cleanIdentity.slice(0, 5).map((k) => k.keyword);
    for (const k of cleanIdentity.slice(0, 5)) {
      const src = k.evidence[0]?.source ?? 'tenGod';
      // IdentityEvidenceSource → PaidEvidenceSource (근사 매핑)
      const paidSrc: PaidEvidenceSource =
        src === 'dayMaster' ? 'dayMaster'
        : src === 'monthBranch' ? 'element'
        : src === 'elementStrength' ? 'element'
        : src === 'usefulGod' ? 'usefulGod'
        : src === 'specialPoint' ? 'specialPoint'
        : src === 'combination' ? 'combination'
        : src === 'conflict' ? 'conflict'
        : 'tenGod';
      ids.push(ev.add(paidSrc, nextSlug('identity'), k.keyword, k.shortDescription || k.keyword));
    }
  } else {
    keywords = card.keywords.slice(0, 5);
    ids.push(ev.add('dayMaster', g.birthChart.dayMaster, `일간 ${g.birthChart.dayMaster}`, '아키타입 키워드의 근거'));
  }

  // coreSummary.oneLiner는 archetype.oneLiner와 중복되지 않도록 키워드 기반으로 합성.
  const oneLiner = keywords.length >= 2
    ? `${keywords.slice(0, 3).join(', ')} — 이 결들이 겹치는 자리에서 당신이 가장 선명해집니다.`
    : card.shortDescription;

  return {
    keywords,
    oneLiner,
    evidenceIds: ids,
  };
}

// ============================================================
// 3. weapons (max 3)
// ============================================================

function buildWeapons(g: PersonalSajuGptInput, ev: EvidenceCollector): PaidWeaponItem[] {
  const weak = isWeak(g);
  // 신약/매우신약 차트에서는 '버티는 힘' 류 신강 결의 무기 이름(verdict)을 제외한다.
  // (verdict = lifeWeapon.name 이라 deCliche로 다듬을 수 없으므로 후보에서 걸러 다음 무기로 백필.)
  const sorted = [...g.lifeWeapons]
    .sort((a, b) => b.strengthScore - a.strengthScore)
    .filter((w) => !hasCliche(w.name, weak))
    .slice(0, 3);
  const out: PaidWeaponItem[] = [];
  sorted.forEach((w: LifeWeapon, i) => {
    const ids = w.evidence.map((e) =>
      ev.add(mapWeaponSource(e.source), nextSlug(`weapon-${e.source}`), w.name, e.description),
    );
    if (ids.length === 0) return; // 근거 없으면 생략
    out.push({
      id: `weapon-${i}`,
      title: '나의 무기',
      verdict: w.name,
      evidenceIds: ids,
      confidence: w.strengthScore >= 50 ? 'high' : w.strengthScore >= 30 ? 'medium' : 'low',
      displayPriority: 10 + i,
      riskLevel: 'none',
      forbiddenClaims: [],
      scene: deCliche(w.realLifeScene, w.name, weak),
      howToUse: deCliche(w.howToUse, '강점이 드러나는 자리를 의식적으로 골라 쓰기', weak),
    });
  });
  return out;
}

// ============================================================
// 4. traps (max 3)
// ============================================================

function buildTraps(g: PersonalSajuGptInput, ev: EvidenceCollector): PaidTrapItem[] {
  const weak = isWeak(g);
  const sorted = [...g.lifeTraps]
    .sort((a, b) => b.riskScore - a.riskScore)
    .filter((t) => !hasCliche(t.name, weak))
    .slice(0, 3);
  const out: PaidTrapItem[] = [];
  sorted.forEach((t: LifeTrap, i) => {
    const ids = t.evidence.map((e) =>
      ev.add(mapTrapSource(e.source), nextSlug(`trap-${e.source}`), t.name, e.description),
    );
    if (ids.length === 0) return;
    out.push({
      id: `trap-${i}`,
      title: '나의 함정',
      verdict: t.name,
      evidenceIds: ids,
      confidence: t.riskScore >= 50 ? 'high' : t.riskScore >= 30 ? 'medium' : 'low',
      displayPriority: 20 + i,
      riskLevel: t.riskScore >= 60 ? 'high' : t.riskScore >= 35 ? 'medium' : 'low',
      forbiddenClaims: [],
      pattern: deCliche(t.patternDescription, t.name, weak),
      escape: deCliche(t.escapeStrategy, '작게 검증하는 행동으로 먼저 바꿔보기', weak),
    });
  });
  return out;
}

// ============================================================
// 6. moneyGuide
// ============================================================

function buildMoneyGuide(g: PersonalSajuGptInput, ev: EvidenceCollector): PaidMoneyGuide {
  const jaeseong = tg(g, '편재') + tg(g, '정재');
  const siksang = tg(g, '식신') + tg(g, '상관');
  const bigeop = tg(g, '비견') + tg(g, '겁재');
  const unfav = unfavorableElements(g);

  const earnRoutes: PaidVerdictItem[] = [];
  const fitMonetization: PaidVerdictItem[] = [];
  const leakRoutes: PaidVerdictItem[] = [];
  const avoidMoneyStyle: PaidVerdictItem[] = [];

  // earnRoutes / fitMonetization ← moneyMakingStyle
  g.careerSpecificAnalysis.moneyMakingStyle.forEach((m, i) => {
    const id = ev.add('careerAnalysis', `money-${m.kind}-${i}`, m.title, m.description);
    earnRoutes.push({ text: m.title, why: m.description, evidenceIds: [id] });
    fitMonetization.push({
      text: m.title,
      why: (m.evidence[0] ?? m.description),
      evidenceIds: [id],
    });
  });

  // 재성/식상 구조 보강
  if (jaeseong >= 1.5) {
    const id = ev.add('tenGod', '재성강', '재성 강함', `재성 ${jaeseong.toFixed(2)} — 거래·확장·기회 포착에서 돈이 붙는 구조(편재형)`);
    earnRoutes.push({
      text: '흐름과 거래를 읽고 기회를 잡을 때 돈이 붙는다',
      why: `재성이 강해(${jaeseong.toFixed(1)}) 변동·확장·거래 감각이 실재하기 때문`,
      evidenceIds: [id],
    });
  } else if (jaeseong < 1.0) {
    const id = ev.add('tenGod', '재성약', '재성 약함', `재성 ${jaeseong.toFixed(2)} — 모으기 이전에 '형태화'(결과물·자격으로 굳히기)가 먼저`);
    earnRoutes.push({
      text: '쌓기 전에 먼저 형태로 굳혀야 돈이 남는다',
      why: `재성이 약해(${jaeseong.toFixed(1)}) 축적보다 결과물·자격으로 굳히는 단계가 핵심이기 때문`,
      evidenceIds: [id],
    });
  }
  if (siksang >= 1.0) {
    const id = ev.add('tenGod', '식상강', '식상 있음', `식상 ${siksang.toFixed(2)} — 내가 만든 결과물이 수익으로 이어지는 결`);
    fitMonetization.push({
      text: '내가 만든 결과물에 가격을 붙이는 방식',
      why: `식상이 살아 있어(${siksang.toFixed(1)}) 산출물 기반 수익화가 맞기 때문`,
      evidenceIds: [id],
    });
  }

  // leakRoutes ← fortuneBlockingChoices (재무 관련만, 클리셰 제거)
  g.fortuneTriggers.fortuneBlockingChoices.forEach((c, i) => {
    const moneyish = /돈|비용|확장|투자|소비|지출|재/.test(c.title + c.reason + (c.practicalRisk ?? ''));
    if (!moneyish) return;
    const id = ev.add('tenGod', `blocking-${i}`, c.title, c.reason);
    const why = koElements(deCliche(c.practicalRisk || c.reason, c.reason, isWeak(g)));
    leakRoutes.push({ text: c.title, why, evidenceIds: [id] });
  });

  // 비겁이 재성을 앞지름 → 군겁쟁재(돈 나감). 재성이 충분(편재형)이면 제외.
  if (bigeop >= 1.2 && bigeop > jaeseong) {
    const id = ev.add('tenGod', '군겁쟁재', '비겁 강함', `비겁 ${bigeop.toFixed(2)} > 재성 ${jaeseong.toFixed(2)} — 군겁쟁재: 같이 나눠 가지려는 힘에 돈이 새기 쉽다`);
    leakRoutes.push({
      text: '나눠 가지는 자리에서 돈이 새어 나간다',
      why: `비겁이 강해(${bigeop.toFixed(1)}) 군겁쟁재 — 들어온 돈을 함께 쓰는 구조로 빠지기 쉽기 때문`,
      evidenceIds: [id],
    });
    avoidMoneyStyle.push({
      text: '공동 지갑·공동 투자처럼 경계가 흐린 돈 방식',
      why: `비겁이 강해(${bigeop.toFixed(1)}) 경계가 흐려지면 내 몫이 빠르게 줄기 때문`,
      evidenceIds: [id],
    });
  }

  // 기신 오행 → 돈을 그쪽으로 몰지 말기
  if (unfav.length > 0) {
    const e = unfav[0];
    const id = ev.add('usefulGod', `unfavorable-${e}`, `기신 ${ELEMENT_KO[e]}`, `기신 ${ELEMENT_KO[e]} — 이 방향으로 돈·에너지를 몰면 회수가 약하다`);
    avoidMoneyStyle.push({
      text: `${ELEMENT_KO[e]} 영역으로 한꺼번에 돈을 몰아넣는 방식`,
      why: `${iGa(ELEMENT_KO[e])} 기신이라 그쪽으로 크게 베팅하면 회수가 약하기 때문`,
      evidenceIds: [id],
    });
  }

  const baseId = ev.add('careerAnalysis', 'money-base', '재성 구조', '돈 가이드의 기준 — 재성/식상/비겁 구조와 기신 오행');
  return {
    id: 'moneyGuide',
    title: '돈 가이드',
    subtitle: '돈이 붙는 길, 새는 길',
    verdict: earnRoutes[0]?.text ?? '내 구조에 맞는 수익 루트를 골라야 돈이 남는다',
    evidenceIds: [baseId],
    confidence: 'medium',
    displayPriority: 60,
    riskLevel: 'low',
    forbiddenClaims: ['이 방식이면 반드시 돈을 번다', '확실히 대박 난다'],
    earnRoutes,
    leakRoutes,
    fitMonetization,
    avoidMoneyStyle,
  };
}

// ============================================================
// 7. timingGuide
// ============================================================

const POSITIVE_THEMES = new Set(['career', 'money', 'self-branding', 'business', 'study', 'relationship']);

function buildTimingGuide(g: PersonalSajuGptInput, ev: EvidenceCollector): PaidTimingGuide {
  const openingYears: PaidTimingYear[] = [];
  const cautionYears: PaidTimingYear[] = [];

  // futureTimingAnalysis.years
  g.futureTimingAnalysis.years.forEach((y) => {
    const hasPositive = y.strongestThemes.some((t) => POSITIVE_THEMES.has(t));
    const hasBest = (y.bestActions?.length ?? 0) > 0;
    const hasAvoid = (y.avoidActions?.length ?? 0) > 0;

    if (hasPositive && hasBest) {
      const id = ev.add('futureTiming', String(y.year), `${y.year}년`, `${y.year} ${y.headline} — ${y.evidence[0] ?? ''}`);
      openingYears.push({
        year: y.year,
        age: y.age,
        label: '운이 강하게 열리는 해',
        why: koElements(`${y.headline} — ${y.bestActions[0]}`),
        evidenceIds: [id],
        confidence: y.confidence,
      });
    }
    if (hasAvoid) {
      const id = ev.add('futureTiming', String(y.year), `${y.year}년`, `${y.year} ${y.headline} — 주의: ${y.avoidActions[0]}`);
      cautionYears.push({
        year: y.year,
        age: y.age,
        label: '변동이 큰 해 — 무리한 결정 주의',
        why: koElements(`${y.avoidActions[0]}`),
        evidenceIds: [id],
        confidence: y.confidence,
      });
    }
  });

  // fortune.nextThreeYears opportunities/risks 보강
  g.fortune.nextThreeYears.forEach((y) => {
    if ((y.opportunities?.length ?? 0) > 0 && !openingYears.some((o) => o.year === y.year)) {
      const id = ev.add('sewoon', String(y.year), `${y.year}년 세운`, `${y.year} ${y.theme} — ${y.opportunities[0]}`);
      openingYears.push({
        year: y.year,
        label: '운이 강하게 열리는 해',
        why: y.opportunities[0],
        evidenceIds: [id],
        confidence: 'medium',
      });
    }
    if ((y.risks?.length ?? 0) > 0 && !cautionYears.some((c) => c.year === y.year)) {
      const id = ev.add('sewoon', String(y.year), `${y.year}년 세운`, `${y.year} ${y.theme} — 주의: ${y.risks[0]}`);
      cautionYears.push({
        year: y.year,
        label: '변동이 큰 해 — 무리한 결정 주의',
        why: y.risks[0],
        evidenceIds: [id],
        confidence: 'medium',
      });
    }
  });

  const baseId = openingYears[0]?.evidenceIds[0]
    ?? cautionYears[0]?.evidenceIds[0]
    ?? ev.add('futureTiming', 'overview', '앞으로 3년', '타이밍 가이드의 기준 — 세운·미래 흐름');
  return {
    id: 'timingGuide',
    title: '타이밍 가이드',
    subtitle: '열리는 해, 조심할 해',
    verdict: openingYears[0]
      ? `${openingYears[0].year}년은 ${openingYears[0].label}`
      : '앞으로 3년의 흐름을 미리 읽고 움직이면 유리하다',
    evidenceIds: [baseId],
    confidence: 'medium',
    displayPriority: 70,
    riskLevel: 'low',
    forbiddenClaims: ['이 해에 확실히 대박 난다', '반드시 성공한다'],
    openingYears,
    cautionYears,
  };
}

// ============================================================
// 8. luckGuide
// ============================================================

function buildLuckGuide(g: PersonalSajuGptInput, ev: EvidenceCollector): PaidLuckGuide {
  const fav = favorableElements(g);
  const primary: Element = fav[0] ?? 'earth';
  const sym = FAVORABLE_ELEMENT_SYMBOLS[primary];

  const ids: string[] = [];
  ids.push(ev.add('usefulGod', 'primary', `용신 ${ELEMENT_KO[primary]}`, `용신/희신 오행 ${ELEMENT_KO[primary]} — 균형을 돕는 상징의 근거`));

  // 두 번째 희신이 있으면 색/장소를 한 세트 더 섞어줌(차별화)
  const second = fav[1];
  const colors = second && FAVORABLE_ELEMENT_SYMBOLS[second]
    ? [...sym.colors.slice(0, 2), FAVORABLE_ELEMENT_SYMBOLS[second].colors[0]]
    : sym.colors.slice(0, 3);
  const places = second && FAVORABLE_ELEMENT_SYMBOLS[second]
    ? [...sym.places.slice(0, 2), FAVORABLE_ELEMENT_SYMBOLS[second].places[0]]
    : sym.places.slice(0, 3);

  const unfav = unfavorableElements(g);
  const blockingEnvironments: string[] = [];
  for (const e of unfav) {
    blockingEnvironments.push(...BLOCKING_ELEMENT_ENVIRONMENTS[e]);
    ids.push(ev.add('usefulGod', `unfavorable-${e}`, `기신 ${ELEMENT_KO[e]}`, `기신 ${ELEMENT_KO[e]} — 운을 막는 환경의 근거`));
  }

  return {
    id: 'luckGuide',
    title: '행운 가이드',
    subtitle: '균형을 돕는 색·장소·습관',
    verdict: `${sym.places[0]}·${sym.colors[0]} 같은 ${ELEMENT_KO[primary]} 계열 환경이 흐트러진 균형을 잡아준다`,
    evidenceIds: ids,
    confidence: 'medium',
    displayPriority: 80,
    riskLevel: 'none',
    // 정책: "이걸 사면 운이 오른다" 식 단정 금지 — 균형 돕는 상징으로 프레이밍
    forbiddenClaims: [
      '이걸 사면 운이 오른다',
      '이 색을 입으면 반드시 잘된다',
      '이 물건이 행운을 가져온다',
    ],
    items: sym.items.slice(0, 4),
    colors,
    places,
    routines: sym.routines.slice(0, 4),
    blockingEnvironments: blockingEnvironments.slice(0, 4),
  };
}

// ============================================================
// 9. careerGuide
// ============================================================

function buildCareerGuide(g: PersonalSajuGptInput, ev: EvidenceCollector): PaidCareerGuide {
  const ca = g.careerSpecificAnalysis;

  const topFits: PaidCareerFit[] = ca.topCareerMatches.map((m: CareerMatch, i): PaidCareerFit => {
    const id = ev.add('careerAnalysis', `top-${i}-${m.industry}`, m.industry, m.whyFits.join(' / '));
    return {
      industry: m.industry,
      roles: m.roles,
      why: koElements(m.whyFits[0] ?? m.howItShowsInLife),
      evidenceIds: [id],
      fitScore: m.fitScore,
    };
  });

  const conditionalFits: PaidCareerFit[] = ca.conditionalCareerMatches.map(
    (m: ConditionalCareerMatch, i): PaidCareerFit => {
      const id = ev.add('careerAnalysis', `cond-${i}-${m.industry}`, m.industry, `${m.condition} — ${m.whyFits.join(' / ')}`);
      return {
        industry: m.industry,
        roles: m.roles,
        why: koElements(`${m.condition} ${m.whyFits[0] ?? ''}`.trim()),
        evidenceIds: [id],
        fitScore: 50,
      };
    },
  );

  const avoidEnvironments: PaidVerdictItem[] = ca.avoidCareerEnvironments.map((e, i) => {
    const id = ev.add('careerAnalysis', `avoid-env-${i}`, e.environment, e.reason);
    return { text: koElements(e.environment), why: koElements(e.reason), evidenceIds: [id] };
  });

  const weak = isWeak(g);
  const bestWorkStyle: PaidVerdictItem[] = ca.bestWorkStyle.map((w, i) => {
    const id = ev.add('careerAnalysis', `workstyle-${i}`, w.title, w.evidence.join(' / ') || w.description);
    return {
      text: koElements(deCliche(w.title, w.title, weak)),
      why: koElements(deCliche(w.description || w.evidence.join(' / '), w.title, weak)),
      evidenceIds: [id],
    };
  });

  const baseId = topFits[0]?.evidenceIds[0]
    ?? ev.add('careerAnalysis', 'career-base', '직업 적합', '직업 가이드의 기준');
  return {
    id: 'careerGuide',
    title: '직업 가이드',
    subtitle: '맞는 일, 피할 환경',
    verdict: topFits[0] ? `${topFits[0].industry}에서 강점이 가장 잘 산다` : '내 구조가 살아나는 일을 골라야 한다',
    evidenceIds: [baseId],
    confidence: 'medium',
    displayPriority: 90,
    riskLevel: 'low',
    forbiddenClaims: ['이 직업이면 반드시 성공한다'],
    topFits,
    conditionalFits,
    avoidEnvironments,
    bestWorkStyle,
  };
}

// ============================================================
// 10. relationshipGuide
// ============================================================

function buildRelationshipGuide(g: PersonalSajuGptInput, ev: EvidenceCollector): PaidRelationshipGuide {
  const attractionStyle: PaidVerdictItem[] = [];
  const relationshipPattern: PaidVerdictItem[] = [];
  const whatHelps: PaidVerdictItem[] = [];
  const whatHurts: PaidVerdictItem[] = [];

  // attractionStyle ← 도화/홍염 + specialPoints(attraction-popularity)
  if (hasStar(g, '도화')) {
    const id = ev.add('specialStar', '도화', '도화', '도화 — 사람을 끌어당기는 매력의 결');
    attractionStyle.push({
      text: '자연스럽게 시선을 모으고 사람을 끌어당기는 매력',
      why: '도화 — 존재 자체로 끌림이 생기는 구조라서',
      evidenceIds: [id],
    });
  }
  if (hasStar(g, '홍염')) {
    const id = ev.add('specialStar', '홍염', '홍염', '홍염 — 분위기·끼로 매력을 발산하는 결');
    attractionStyle.push({
      text: '분위기와 끼로 은근한 매력을 풍기는 결',
      why: '홍염 — 무드로 사람을 끌어당기는 매력이 있어서',
      evidenceIds: [id],
    });
  }
  for (const sp of g.specialPoints.filter((p) => p.category === 'attraction-popularity')) {
    const id = ev.add('specialPoint', sp.id, sp.shortLabel || sp.name, sp.narrative.coreMeaning);
    attractionStyle.push({ text: sp.title, why: sp.narrative.whySpecial, evidenceIds: [id] });
  }

  // relationshipPattern ← specialPoints(relationship-pattern)
  for (const sp of g.specialPoints.filter((p) => p.category === 'relationship-pattern')) {
    const id = ev.add('specialPoint', sp.id, sp.shortLabel || sp.name, sp.narrative.coreMeaning);
    relationshipPattern.push({ text: sp.title, why: sp.narrative.lifeScene || sp.narrative.coreMeaning, evidenceIds: [id] });
  }
  // 화개 → 거리감 패턴
  if (hasStar(g, '화개')) {
    const id = ev.add('specialStar', '화개', '화개', '화개 — 혼자만의 거리·정신적 공간이 필요한 결');
    relationshipPattern.push({
      text: '가까워질수록 혼자만의 거리를 다시 두려는 결',
      why: '화개 — 친밀함 속에서도 정신적 거리가 필요한 구조라서',
      evidenceIds: [id],
    });
  }
  // 역마 → 이동·변동 패턴(정착형 아님)
  if (hasStar(g, '역마')) {
    const id = ev.add('specialStar', '역마', '역마', '역마 — 한자리 정착보다 이동·변동 속에서 흐름이 풀리는 결');
    relationshipPattern.push({
      text: '한곳에 오래 묶이기보다 옮겨 다니며 풀리는 결',
      why: '역마 — 이동·변동이 잦은 구조라 정착보다 움직임 속에서 안정되기 때문',
      evidenceIds: [id],
    });
  }

  // whatHelps / whatHurts ← 관성/재성 구조 + usefulGod
  const gwanseong = tg(g, '편관') + tg(g, '정관');
  const jaeseong = tg(g, '편재') + tg(g, '정재');
  const fav = favorableElements(g);

  if (gwanseong >= 1.0) {
    const id = ev.add('tenGod', '관성', '관성 있음', `관성 ${gwanseong.toFixed(2)} — 약속·책임이 분명한 관계에서 안정`);
    whatHelps.push({
      text: '약속과 책임이 분명한 관계에서 편안해진다',
      why: `관성이 살아 있어(${gwanseong.toFixed(1)}) 명확한 틀이 있는 관계에서 안정되기 때문`,
      evidenceIds: [id],
    });
  }
  if (fav.length > 0) {
    const e = fav[0];
    const id = ev.add('usefulGod', `favorable-${e}`, `희신 ${ELEMENT_KO[e]}`, `희신 ${ELEMENT_KO[e]} — 이 결을 가진 상대와 균형`);
    whatHelps.push({
      text: `${ELEMENT_KO[e]} 기운의 결을 가진 상대와 만나면 균형이 잡힌다`,
      why: `${iGa(ELEMENT_KO[e])} 희신이라 부족분을 채워주는 상대에게서 안정되기 때문`,
      evidenceIds: [id],
    });
  }
  if (jaeseong < 1.0) {
    const id = ev.add('tenGod', '재성약', '재성 약함', `재성 ${jaeseong.toFixed(2)} — 받기만 하는 비대칭 관계에 약함`);
    whatHurts.push({
      text: '한쪽만 주고 받는 게 없는 비대칭이 길어질 때',
      why: `재성이 약해(${jaeseong.toFixed(1)}) 일방적 관계에서 소진되기 때문`,
      evidenceIds: [id],
    });
  }
  if (hasStar(g, '도화') || hasStar(g, '홍염')) {
    const star = hasStar(g, '도화') ? '도화' : '홍염';
    const id = ev.add('specialStar', star, star, `${star} — 매력이 강해 관계가 쉽게 시작되는 만큼 정리도 필요`);
    whatHurts.push({
      text: '쉽게 시작된 관계를 정리하지 못하고 겹쳐 끌고 갈 때',
      why: `${euRo(star)} 끌림이 잦은 만큼, 정리 없이 쌓이면 관계가 엉키기 때문`,
      evidenceIds: [id],
    });
  }

  const baseId = attractionStyle[0]?.evidenceIds[0]
    ?? whatHelps[0]?.evidenceIds[0]
    ?? ev.add('tenGod', 'rel-base', '관계 구조', '관계 가이드의 기준');
  return {
    id: 'relationshipGuide',
    title: '관계 가이드',
    subtitle: '끌림의 결, 관계가 풀리는 조건',
    verdict: attractionStyle[0]?.text ?? whatHelps[0]?.text ?? '내 결에 맞는 관계 방식을 알면 덜 소진된다',
    evidenceIds: [baseId],
    confidence: 'medium',
    displayPriority: 100,
    riskLevel: 'low',
    forbiddenClaims: ['이 사람과 결혼하면 행복하다', '반드시 좋은 인연을 만난다'],
    attractionStyle,
    relationshipPattern,
    whatHelps,
    whatHurts,
  };
}

// ============================================================
// detailedNarrative
// ============================================================

function buildDetailedNarrative(text?: string): PaidDetailedNarrative {
  if (!text || !text.trim()) return { sections: [] };
  const lines = text.split('\n');
  const sections: PaidDetailedNarrativeSection[] = [];
  let current: PaidDetailedNarrativeSection | null = null;
  let idx = 0;
  for (const line of lines) {
    const m = line.match(/^##\s+(.*)$/);
    if (m) {
      if (current) sections.push(current);
      idx += 1;
      current = { id: `section-${idx}`, title: m[1].trim(), body: '' };
    } else if (current) {
      current.body += (current.body ? '\n' : '') + line;
    }
  }
  if (current) sections.push(current);
  sections.forEach((s) => { s.body = s.body.trim(); });
  return { sections };
}

// ============================================================
// 메인 빌더
// ============================================================

export function buildPaidReportV1(
  gptInput: PersonalSajuGptInput,
  opts?: { starKeywordCard?: StarKeywordCardData; detailedNarrativeText?: string },
): PaidSajuReportV1 {
  slugCounter = 0;
  const ev = new EvidenceCollector();
  const card = opts?.starKeywordCard ?? buildStarKeywordCard(gptInput);

  const archetypeCard = buildArchetypeCard(gptInput, card, ev);
  const coreSummary = buildCoreSummary(gptInput, card, ev);
  const weapons = buildWeapons(gptInput, ev);
  const traps = buildTraps(gptInput, ev);
  const peopleGuide = derivePeopleGuide(gptInput, ev);
  const moneyGuide = buildMoneyGuide(gptInput, ev);
  const timingGuide = buildTimingGuide(gptInput, ev);
  const luckGuide = buildLuckGuide(gptInput, ev);
  const careerGuide = buildCareerGuide(gptInput, ev);
  const relationshipGuide = buildRelationshipGuide(gptInput, ev);
  const detailedNarrative = buildDetailedNarrative(opts?.detailedNarrativeText);

  const dm = gptInput.birthChart.dayMaster as HeavenlyStem;
  const dayMasterElement = STEM_ELEMENT[dm];

  // 줄글 "실전 가이드" — 카드 데이터를 prose 문단으로 (메인 narrative 아래 렌더).
  const prose = renderPaidReportProse({
    meta: {
      version: 'paid-v1', dayMaster: gptInput.birthChart.dayMaster, dayMasterElement,
      strength: gptInput.coreAnalysis.dayMasterStrength.level,
      generatedDeterministically: true, microcopyApplied: false,
    },
    archetypeCard, coreSummary, weapons, traps,
    peopleGuide, moneyGuide, timingGuide, luckGuide, careerGuide, relationshipGuide,
    detailedNarrative, evidenceMap: ev.build(),
  });

  const draft: Omit<PaidSajuReportV1, 'validation'> = {
    meta: {
      version: 'paid-v1',
      dayMaster: gptInput.birthChart.dayMaster,
      dayMasterElement,
      strength: gptInput.coreAnalysis.dayMasterStrength.level,
      generatedDeterministically: true,
      microcopyApplied: false,
    },
    archetypeCard,
    coreSummary,
    weapons,
    traps,
    peopleGuide,
    moneyGuide,
    timingGuide,
    luckGuide,
    careerGuide,
    relationshipGuide,
    prose,
    detailedNarrative,
    evidenceMap: ev.build(),
  };

  const validation: PaidReportValidation = validatePaidReportV1(draft);

  return { ...draft, validation };
}
