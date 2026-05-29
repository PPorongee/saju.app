// All-mode Action Guide V1 — deterministic evidence 빌더.
//
// 역할: 각 모드의 이미 계산된 분석 결과에서 "사용자 친화 한글 근거 시드"를 추출.
//   - GPT가 없는 데이터를 지어내지 않도록 실제 계산값만 담는다.
//   - 영문 오행 key / 내부 enum은 한글로 변환. raw 점수/객체는 담지 않는다.
//   - 시기(월/날짜)는 실제 계산된 경우에만 timing.lines에 넣고, 아니면 granularity로 명시.
//
// 절대 금지:
//   - 없는 월운/일진 생성, 임의 점수, 특정 케이스 하드코딩.
//   - 임산부: 출산/건강/성별/아이 운명 예측 시드 금지 (timing.granularity='none').

import { ELEMENT_KO, STEM_ELEMENT, type Element } from '../rules/elements';
import type { HeavenlyStem } from '../rules/heavenlyStems';
import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type { YongsinDiagnostic } from '../analysis/yongsinDiagnostic';
import type { YearlyFortuneAnalysis } from '../yearly/yearlyTypes';
import type { CompatibilityAnalysisBundle } from '../compatibility/compatibilityTypes';
import type { PregnancyAnalysisBundle } from '../pregnancy/narrative/pregnancyMomBabyAnalyzer';
import type { ActionGuideEvidence, ActionGuideDomainSeed } from './actionGuideTypes';

const ELEMENT_KEYS = ['wood', 'fire', 'earth', 'metal', 'water'];

const STRENGTH_KO: Record<string, string> = {
  'very-strong': '매우 강한 편',
  'strong': '강한 편',
  'balanced': '균형 잡힌 편',
  'weak': '여린 편',
  'very-weak': '매우 여린 편',
};

/** 오행 영문 key는 한글로, 십성 등 이미 한글인 값은 그대로. */
function toKo(value: unknown): string {
  if (typeof value !== 'string') return String(value ?? '');
  if (ELEMENT_KEYS.includes(value)) return ELEMENT_KO[value as Element];
  return value;
}

function koList(list: Array<unknown> | undefined): string[] {
  return (list ?? []).map(toKo).filter(Boolean);
}

function stemElementKo(dayMaster: string | undefined): string {
  if (!dayMaster) return '-';
  const el = STEM_ELEMENT[dayMaster as HeavenlyStem];
  return el ? ELEMENT_KO[el] : '-';
}

// ============================================================
// 공통 — PersonalSajuGptInput → 핵심 명리 좌표 라인 (개인/궁합 A·B/임산부 엄마 공용)
// ============================================================
function coreLinesFromPerson(gpt: PersonalSajuGptInput): string[] {
  const core: any = (gpt as any).coreAnalysis ?? {};
  const ug: any = core.usefulGod ?? {};
  const dm: any = core.dayMasterStrength ?? {};
  const es: any = core.elementStrength ?? {};
  const lines: string[] = [];

  const usefulKo = ug.primaryUseful ? toKo(ug.primaryUseful.value) : '';
  if (usefulKo) lines.push(`가장 도움이 되는 기운(용신): ${usefulKo}`);
  if (ug.secondaryUseful?.value) lines.push(`보조로 도움이 되는 기운: ${toKo(ug.secondaryUseful.value)}`);
  const favKo = koList(ug.favorable);
  if (favKo.length) lines.push(`도움이 되는 기운(희신): ${favKo.join(', ')}`);
  const unfavKo = koList(ug.unfavorable);
  if (unfavKo.length) lines.push(`과해지면 부담이 될 수 있는 기운(기신): ${unfavKo.join(', ')}`);
  if (dm.level) lines.push(`일간(나 자신) 기운의 강약: ${STRENGTH_KO[dm.level] ?? dm.level}`);
  const strong = koList(es.strongest);
  const weak = koList(es.weakest);
  if (strong.length) lines.push(`타고나길 강한 오행: ${strong.join(', ')}`);
  if (weak.length) lines.push(`상대적으로 약한 오행: ${weak.join(', ')}`);
  if (typeof es.climate?.comment === 'string' && es.climate.comment) {
    lines.push(`타고난 기후(한난조습) 메모: ${es.climate.comment}`);
  }
  return lines;
}

/** yongsinDiagnostic이 있으면 "주 용신 유지" 전제의 보조 운용 후보 라인을 만든다. */
function auxiliaryLinesFromDiagnostic(diag: YongsinDiagnostic | undefined | null): string[] {
  if (!diag) return [];
  const lines: string[] = [];
  const primaryKo = ELEMENT_KO[diag.currentFinalYongsin?.primary as Element] ?? '';
  if (primaryKo) {
    lines.push(`주 용신(${primaryKo})은 그대로 유지합니다. 아래는 실행 전략에만 참고하는 보조 결입니다.`);
  }
  const drain = diag.drainCandidate;
  if (drain?.element) {
    lines.push(`설기(풀어내기) 보조 결: ${ELEMENT_KO[drain.element]} — ${drain.rationale ?? ''}`.trim());
  }
  const control = diag.controlCandidate;
  if (control?.element) {
    lines.push(`극제(조절) 보조 결: ${ELEMENT_KO[control.element]} — ${control.rationale ?? ''}`.trim());
  }
  return lines;
}

// 십성 그룹 → 영역. totals는 한글 십성 키(정재/편재 등). 실제 계산값만 사용.
const TEN_GOD_GROUPS: Record<string, string[]> = {
  재성: ['정재', '편재'],
  식상: ['식신', '상관'],
  관성: ['정관', '편관'],
  인성: ['정인', '편인'],
  비겁: ['비견', '겁재'],
};

function groupSum(totals: Record<string, number> | undefined, names: string[]): number {
  if (!totals) return 0;
  return names.reduce((acc, n) => acc + (Number(totals[n]) || 0), 0);
}

/** 십성 비중을 "강한 편/있는 편/약한 편"으로. 점수 raw는 노출하지 않는다. */
function weight(n: number): string {
  if (n >= 3) return '강한 편';
  if (n >= 1) return '있는 편';
  return '약한 편';
}

/** 십성 totals + 기후/강약 → 영역별 근거 시드 (돈/커리어/관계/공부/컨디션). */
function domainSeedsFromPerson(gpt: PersonalSajuGptInput): ActionGuideDomainSeed[] {
  const core: any = (gpt as any).coreAnalysis ?? {};
  const totals: Record<string, number> = core.tenGods?.totals ?? {};
  const seeds: ActionGuideDomainSeed[] = [];

  const jae = groupSum(totals, TEN_GOD_GROUPS.재성);    // 현실 자원·보상 감각
  const sik = groupSum(totals, TEN_GOD_GROUPS.식상);    // 표현·생산·수익 창출
  const gwan = groupSum(totals, TEN_GOD_GROUPS.관성);   // 책임·조직·평가
  const inseong = groupSum(totals, TEN_GOD_GROUPS.인성); // 배움·자격·돌봄
  const bigeop = groupSum(totals, TEN_GOD_GROUPS.비겁); // 동료·경쟁·자립

  seeds.push({
    domain: '돈/수입·소비',
    lines: [
      `재성(돈·현실 자원을 다루는 기운)이 ${weight(jae)}`,
      `식상(일을 결과·수익으로 바꾸는 기운)이 ${weight(sik)}`,
      '돈은 보상 기준·수익 구조·계약 조건·소비 습관 결로만 다룬다(투자 조언 금지).',
    ],
  });
  seeds.push({
    domain: '커리어/일',
    lines: [
      `관성(책임·조직·평가를 받는 기운)이 ${weight(gwan)}`,
      `식상(내 결과물을 밖으로 내보내는 기운)이 ${weight(sik)}`,
    ],
  });
  seeds.push({
    domain: '관계',
    lines: [
      `비겁(동료·자립·경쟁의 기운)이 ${weight(bigeop)}`,
      `관성·재성으로 본 관계 맺는 결의 비중: 관성 ${weight(gwan)}, 재성 ${weight(jae)}`,
    ],
  });
  seeds.push({
    domain: '공부/성장',
    lines: [`인성(배움·자격·돌봄을 받는 기운)이 ${weight(inseong)}`],
  });

  const es: any = core.elementStrength ?? {};
  const dm: any = core.dayMasterStrength ?? {};
  const conditionLines: string[] = [];
  if (es.climate?.comment) conditionLines.push(`타고난 기후 메모: ${es.climate.comment}`);
  if (dm.level) conditionLines.push(`일간 강약(추진/회복 균형 참고): ${STRENGTH_KO[dm.level] ?? dm.level}`);
  if (conditionLines.length) seeds.push({ domain: '컨디션/생활 리듬', lines: conditionLines });

  return seeds;
}

// ============================================================
// 1) 개인사주
// ============================================================
export function buildPersonalActionGuideEvidence(gpt: PersonalSajuGptInput): ActionGuideEvidence {
  const coreLines = coreLinesFromPerson(gpt);
  const auxiliaryLines = auxiliaryLinesFromDiagnostic((gpt as any).yongsinDiagnostic);

  // 시기: 개인사주는 대운(나이 기준) + 앞으로 몇 년 흐름(연 단위)만 — 월/날짜 없음.
  const fortune: any = (gpt as any).fortune ?? {};
  const timingLines: string[] = [];
  const cd = fortune.currentDaewoon;
  if (cd) {
    const head = [cd.pillar, cd.ageRange ? `(${cd.ageRange}세)` : '', cd.theme].filter(Boolean).join(' ');
    if (head) timingLines.push(`현재 큰 흐름(대운): ${head}`);
  }
  const next3: any[] = Array.isArray(fortune.nextThreeYears) ? fortune.nextThreeYears : [];
  for (const y of next3.slice(0, 3)) {
    const opp = Array.isArray(y.opportunities) ? y.opportunities.slice(0, 1).join('') : '';
    timingLines.push(`${y.year}년 흐름: ${y.theme ?? ''}${opp ? ` / 기회: ${opp}` : ''}`.trim());
  }
  // FutureTimingAnalysis는 { years: [...] } 객체 (배열 아님) — .years에서 추출.
  const ftaYears: any[] = Array.isArray((gpt as any).futureTimingAnalysis?.years) ? (gpt as any).futureTimingAnalysis.years : [];
  for (const f of ftaYears.slice(0, 3)) {
    const best = Array.isArray(f.bestActions) ? f.bestActions.slice(0, 2).join(', ') : '';
    if (f.year && (f.headline || best)) {
      timingLines.push(`${f.year}년 추천 행동 시드: ${f.headline ?? ''}${best ? ` (${best})` : ''}`.trim());
    }
  }

  const domainSeeds: ActionGuideDomainSeed[] = domainSeedsFromPerson(gpt);
  const sp: any[] = Array.isArray((gpt as any).specialPoints) ? (gpt as any).specialPoints : [];
  const spTitles = sp.map(p => p?.title).filter(Boolean).slice(0, 5);
  if (spTitles.length) domainSeeds.push({ domain: '강점/차별점', lines: spTitles });

  return {
    mode: 'personal',
    coreLines,
    auxiliaryLines,
    domainSeeds,
    timing: {
      granularity: timingLines.length ? 'year' : 'none',
      lines: timingLines,
      rule: '시기는 "대운·연 단위 흐름"까지만 계산되어 있습니다. 특정 월·날짜를 새로 만들지 말고, "올해~앞으로 몇 년"의 흐름과 "추진/점검/정리" 리듬으로만 표현하세요.',
    },
  };
}

// ============================================================
// 2) 올해운세 (유일하게 절기 기준 실제 월운 데이터 보유)
// ============================================================
export function buildYearlyActionGuideEvidence(analysis: YearlyFortuneAnalysis): ActionGuideEvidence {
  const carried: any = analysis.carriedOver ?? {};
  const ug: any = carried.usefulGod ?? {};
  const dm: any = carried.dayMasterStrength ?? {};
  const coreLines: string[] = [];
  if (ug.primaryUseful) coreLines.push(`가장 도움이 되는 기운(용신): ${toKo(ug.primaryUseful.value)}`);
  const favKo = koList(ug.favorable);
  if (favKo.length) coreLines.push(`도움이 되는 기운(희신): ${favKo.join(', ')}`);
  const unfavKo = koList(ug.unfavorable);
  if (unfavKo.length) coreLines.push(`과해지면 부담이 될 수 있는 기운(기신): ${unfavKo.join(', ')}`);
  if (dm.level) coreLines.push(`일간 기운의 강약: ${STRENGTH_KO[dm.level] ?? dm.level}`);

  const yee: any = analysis.yearElementEffect ?? {};
  if (yee.label) coreLines.push(`올해 세운 오행 작용: ${yee.label}`);
  const si: any = analysis.strengthImpact ?? {};
  if (si.natalStrength && si.yearlyEffect) {
    coreLines.push(`올해 신강/신약 영향: ${si.natalStrength} → ${si.plainMeaning ?? si.yearlyEffect}`);
  }

  // 영역 시드 — 계산된 adviceHint들에서.
  const domainSeeds: ActionGuideDomainSeed[] = [];
  const yeeAdvice = yee.adviceHint;
  if (yeeAdvice?.actionable) {
    domainSeeds.push({ domain: '올해 전반', lines: [yeeAdvice.actionable, yeeAdvice.activatePattern, yeeAdvice.avoidPattern].filter(Boolean) });
  }
  const siAdvice = si.adviceHint;
  if (siAdvice?.actionable) {
    domainSeeds.push({ domain: '추진/회복 리듬', lines: [siAdvice.actionable, siAdvice.activatePattern, siAdvice.avoidPattern].filter(Boolean) });
  }
  // activatedTopics의 topic 키(일/돈/관계/공부 등)를 그대로 영역명으로 매핑 → 영역별 근거가 섞이지 않게.
  const topics: any[] = Array.isArray(analysis.activatedTopics) ? analysis.activatedTopics : [];
  for (const t of topics.slice(0, 5)) {
    if (t?.topic && t?.adviceHint) domainSeeds.push({ domain: String(t.topic), lines: [t.adviceHint].filter(Boolean) });
  }

  // 시기: 절기 기준 실제 월운 (REAL).
  const months: any[] = Array.isArray(analysis.remainingMonthlyFortunes) ? analysis.remainingMonthlyFortunes : [];
  const timingLines: string[] = months.map(m => {
    const parts = [
      `${m.monthLabel ?? ''}`,
      m.periodLabel ? `[${m.periodLabel}]` : '',
      m.keyword ? `키워드: ${m.keyword}` : '',
      m.goodChoice ? `좋은 선택: ${m.goodChoice}` : '',
      m.caution ? `주의: ${m.caution}` : '',
    ].filter(Boolean);
    return parts.join(' / ');
  }).filter(Boolean);
  const next2: any[] = Array.isArray(analysis.nextTwoYears) ? analysis.nextTwoYears : [];
  for (const y of next2) {
    timingLines.push(`${y.year}년 큰 흐름: ${y.keyword ?? ''}${y.opportunity ? ` / 기회: ${y.opportunity}` : ''}${y.caution ? ` / 주의: ${y.caution}` : ''}`.trim());
  }

  return {
    mode: 'yearly',
    coreLines,
    auxiliaryLines: [],
    domainSeeds,
    timing: {
      granularity: months.length ? 'month' : 'year',
      lines: timingLines,
      rule: '아래 월별 라인은 절기 기준으로 실제 계산된 흐름입니다. 이 목록에 있는 월만 다루고, 없는 월·날짜를 새로 만들지 마세요. "이 달에 무조건 ~한다" 같은 단정은 금지하고 흐름·선택 결로만 표현하세요.',
    },
  };
}

// ============================================================
// 3) 궁합 (A/B 개인 + 관계 — 상대를 용신/기신으로 단정 금지)
// ============================================================
export function buildCompatActionGuideEvidence(
  bundle: CompatibilityAnalysisBundle,
  personA: PersonalSajuGptInput,
  personB: PersonalSajuGptInput,
): ActionGuideEvidence {
  const aLines = coreLinesFromPerson(personA);
  const bLines = coreLinesFromPerson(personB);

  // 관계 근거 — 보완/작용을 중립적으로. "상대가 당신의 용신/기신" 표현은 만들지 않는다.
  const relationLines: string[] = [];
  const ec: any = bundle.elementComplement ?? {};
  const aNeeds = (ec.aNeedsFromB ?? []).map((e: Element) => ELEMENT_KO[e]).filter(Boolean);
  const bNeeds = (ec.bNeedsFromA ?? []).map((e: Element) => ELEMENT_KO[e]).filter(Boolean);
  if (aNeeds.length) relationLines.push(`A는 ${aNeeds.join('·')} 기운이 더해질 때 편안해지는 결 (관계에서 자연히 보완될 수 있는 부분)`);
  if (bNeeds.length) relationLines.push(`B는 ${bNeeds.join('·')} 기운이 더해질 때 편안해지는 결`);
  if (ec.mutualComplement) relationLines.push(`상호 보완 정도: ${ec.mutualComplement}`);
  const dmr: any = bundle.dayMasterRelation ?? {};
  if (dmr.description) relationLines.push(`일간 관계 결: ${dmr.description}`);
  const ugi: any = bundle.usefulGodInteraction ?? {};
  // 안전: "상대가 당신의 용신/기신/살린다/망친다" 결로 읽힐 수 있는 해석은 시드로 넣지 않는다.
  if (ugi.interpretation && !/용신|기신|살린|망친|망쳐|살려/.test(ugi.interpretation)) {
    relationLines.push(`기운 상호작용 해석: ${ugi.interpretation}`);
  }
  const choices: any = bundle.relationshipChoices ?? {};
  for (const c of (choices.helpfulChoices ?? []).slice(0, 3)) {
    if (c?.practicalAction) relationLines.push(`도움이 되는 선택 시드: ${c.title ?? ''} — ${c.practicalAction}`.trim());
  }

  // 시기: 궁합은 연 단위 관계 흐름(futureFlow)만 — 월/날짜 없음.
  const flow: any[] = Array.isArray(bundle.futureFlow) ? bundle.futureFlow : [];
  const timingLines: string[] = flow.slice(0, 3).map(f =>
    `${f.year ?? ''} 관계 흐름: ${f.theme ?? ''}${f.advice ? ` / ${f.advice}` : ''}`.trim(),
  ).filter(Boolean);

  return {
    mode: 'compat',
    coreLines: relationLines,
    auxiliaryLines: [],
    domainSeeds: [],
    timing: {
      granularity: timingLines.length ? 'year' : 'none',
      lines: timingLines,
      rule: '관계는 연 단위 흐름까지만 계산됩니다. 특정 날짜/달을 만들지 마세요. 고백·결혼·이별·동거·사업파트너·금전거래 같은 고위험 결정은 단정하지 말고, 현실 조건·대화·책임 분담을 함께 검토하도록 안내하세요.',
    },
    partner: { aLines, bLines, relationLines },
  };
}

// ============================================================
// 4) 임산부 (엄마 중심 — 시기 없음, 의료/출산 단정 금지)
// ============================================================
export function buildPregnancyActionGuideEvidence(bundle: PregnancyAnalysisBundle): ActionGuideEvidence {
  const mother: PersonalSajuGptInput = (bundle as any).mother;
  const coreLines = mother ? coreLinesFromPerson(mother) : [];
  const auxiliaryLines = auxiliaryLinesFromDiagnostic((mother as any)?.yongsinDiagnostic);

  // 태교/보완 시드 — 엄마 기준. 아이 운명/건강/성별 시드는 만들지 않는다.
  const domainSeeds: ActionGuideDomainSeed[] = [];
  const ec: any = (bundle as any).elementComplement ?? {};
  const momNeeds = (ec.motherNeedsFromBaby ?? []).map((e: Element) => ELEMENT_KO[e]).filter(Boolean);
  if (momNeeds.length) domainSeeds.push({ domain: '엄마에게 편안한 기운', lines: [`${momNeeds.join('·')} 기운을 살리는 환경/활동이 안정에 도움`] });

  return {
    mode: 'pregnancy',
    coreLines,
    auxiliaryLines,
    domainSeeds,
    timing: {
      granularity: 'none',
      lines: [],
      rule: '임신 기간에는 특정 날짜·달·출산 시기를 절대 만들지 마세요. 출산일/출산시간 추천, 순산/난산·조산/유산·성별·건강 예측은 금지입니다. 시기 대신 "컨디션이 회복될수록", "안정기에 접어들면서" 같은 생활 리듬 표현만 쓰고, 의료 판단은 담당 의료진을 우선하도록 안내하세요.',
    },
  };
}
