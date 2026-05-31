// Event Forecast V1 — deterministic 사건 신호 추출 (compact, 프롬프트 grounding 전용).
//
// 원칙:
//   - 실제 계산된 대운/세운/월운/십성/합충/신살에서만 신호를 만든다. 없는 시기/사건은 만들지 않는다.
//   - raw coreAnalysis/점수/객체는 넣지 않는다 — 한글 요약 라인만.
//   - 근거가 약하면 strength를 subtle로.

import { ELEMENT_KO, type Element } from '../rules/elements';
import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type { YongsinDiagnostic } from '../analysis/yongsinDiagnostic';
import type { YearlyFortuneAnalysis } from '../yearly/yearlyTypes';
import type { CompatibilityAnalysisBundle } from '../compatibility/compatibilityTypes';
import type { PregnancyAnalysisBundle } from '../pregnancy/narrative/pregnancyMomBabyAnalyzer';
import type { EventForecastEvidence, ForecastSignal, EventLikelihood } from './eventForecastTypes';

const ELEMENT_KEYS = ['wood', 'fire', 'earth', 'metal', 'water'];
const STRENGTH_KO: Record<string, string> = {
  'very-strong': '매우 강함', strong: '강함', balanced: '균형', weak: '여림', 'very-weak': '매우 여림',
};

function toKo(v: unknown): string {
  if (typeof v !== 'string') return String(v ?? '');
  return ELEMENT_KEYS.includes(v) ? ELEMENT_KO[v as Element] : v;
}
function koList(l: Array<unknown> | undefined): string[] {
  return (l ?? []).map(toKo).filter(Boolean);
}

// 십성 → 사건 영역 결.
const TEN_GOD_KIND: Record<string, string> = {
  정관: '일·책임·공식화', 편관: '일·압박·도전',
  정재: '돈·현실 자원', 편재: '돈·기회·확장',
  식신: '결과물·표현', 상관: '표현·이직·재능',
  정인: '문서·자격·안정', 편인: '공부·전환',
  비견: '협업·자립', 겁재: '경쟁·변동',
};
const REL_TENGODS_FEMALE = ['정관', '편관'];
const REL_TENGODS_MALE = ['정재', '편재'];

// 십성 → 들어오는 사람의 "결" (personOrSituation grounding용, 단정 아님).
const PERSON_BY_TENGOD: Record<string, string> = {
  정관: '안정적이고 공식적인 결, 책임감 있는 사람',
  편관: '추진력·카리스마가 있고 자기 기준이 분명한 결',
  정재: '성실하고 현실 감각이 또렷한 결',
  편재: '활동적이고 사교적인, 일·돈 감각이 있는 결',
  식신: '편안하고 표현이 부드러운 결',
  상관: '재능 있고 자기 표현이 강한 결',
  정인: '배려·돌봄이 있고 안정감을 주는 결',
  편인: '생각이 깊고 개성이 또렷한 결',
  비견: '대등하고 동료 같은 결',
  겁재: '경쟁적이고 변화가 많은 결',
};

// 상태 enum → 한글 (raw 영문 enum이 evidence/프롬프트로 새지 않게).
const USEFUL_GOD_EFFECT_KO: Record<string, string> = {
  helpful: '용신에 힘이 되는', burdensome: '기신이 자극되어 부담되는', mixed: '엇갈리는', neutral: '중립적인',
};
const YEARLY_EFFECT_KO: Record<string, string> = {
  supportive: '지원받는', burdensome: '부담되는', mixed: '혼재된', neutral: '중립적인',
};

function kindsFromTenGods(tenGods: string[]): string {
  const kinds = Array.from(new Set((tenGods ?? []).map(t => TEN_GOD_KIND[t]).filter(Boolean)));
  return kinds.slice(0, 3).join(' / ') || '흐름 변화';
}
function strengthFromCount(n: number): EventLikelihood {
  if (n >= 3) return 'strong';
  if (n >= 1) return 'moderate';
  return 'subtle';
}

function coreLinesFromPerson(gpt: PersonalSajuGptInput): string[] {
  const core: any = (gpt as any).coreAnalysis ?? {};
  const ug: any = core.usefulGod ?? {};
  const dm: any = core.dayMasterStrength ?? {};
  const lines: string[] = [];
  if (ug.primaryUseful) lines.push(`용신(도움 되는 기운): ${toKo(ug.primaryUseful.value)}${ug.favorable?.length ? ` / 희신: ${koList(ug.favorable).join(',')}` : ''}${ug.unfavorable?.length ? ` / 기신: ${koList(ug.unfavorable).join(',')}` : ''}`);
  if (dm.level) lines.push(`일간 강약: ${STRENGTH_KO[dm.level] ?? dm.level}`);
  return lines;
}

function auxLines(diag: YongsinDiagnostic | undefined | null): string[] {
  if (!diag) return [];
  const out: string[] = [];
  const primary = ELEMENT_KO[diag.currentFinalYongsin?.primary as Element];
  if (primary) out.push(`주 용신(${primary})은 유지 — 아래는 보조 운용 결만 참고`);
  if (diag.drainCandidate?.element) out.push(`설기 보조: ${ELEMENT_KO[diag.drainCandidate.element]}`);
  if (diag.controlCandidate?.element) out.push(`극제 보조: ${ELEMENT_KO[diag.controlCandidate.element]}`);
  return out;
}

// ============================================================
// 1) 개인사주 — 대운/세운 활성 십성에서 사건 신호
// ============================================================
export function buildPersonalEventForecastEvidence(gpt: PersonalSajuGptInput): EventForecastEvidence {
  const core: any = (gpt as any).coreAnalysis ?? {};
  const fortune: any = (gpt as any).fortune ?? {};
  const gender: string = (gpt as any).userContext?.gender ?? 'unknown';
  const totals: Record<string, number> = core.tenGods?.totals ?? {};

  const signals: ForecastSignal[] = [];
  const cd = fortune.currentDaewoon;
  if (cd?.theme || cd?.pillar) {
    signals.push({
      window: `현재 대운${cd.ageRange ? ` (${cd.ageRange}세)` : ''}`,
      kind: '큰 환경 흐름',
      signal: `${cd.pillar ?? ''} 대운 — ${cd.theme ?? ''}`.trim(),
      strength: 'moderate',
    });
  }
  const next3: any[] = Array.isArray(fortune.nextThreeYears) ? fortune.nextThreeYears : [];
  for (const y of next3.slice(0, 3)) {
    const tg: string[] = Array.isArray(y.activatedTenGods) ? y.activatedTenGods : [];
    const els: string[] = koList(y.activatedElements);
    signals.push({
      window: `${y.year}년`,
      kind: kindsFromTenGods(tg),
      signal: `세운 ${y.pillar ?? ''} — ${tg.length ? tg.join('·') + ' 활성' : (y.theme ?? '')}${els.length ? ` (${els.join(',')} 기운)` : ''}`.trim(),
      strength: strengthFromCount(tg.length),
      good: Array.isArray(y.opportunities) ? y.opportunities[0] : undefined,
      caution: Array.isArray(y.risks) ? y.risks[0] : undefined,
    });
  }

  // 인연 신호 (근거 있을 때만)
  const relSignals: string[] = [];
  const relGods = gender === 'female' ? REL_TENGODS_FEMALE : gender === 'male' ? REL_TENGODS_MALE : [];
  const relSum = relGods.reduce((a, g) => a + (Number(totals[g]) || 0), 0);
  if (relGods.length && relSum >= 1) {
    const label = gender === 'female' ? '관성(관계·공식화의 결)' : '재성(현실 인연의 결)';
    relSignals.push(`${gender === 'female' ? '여성' : '남성'} 사주에서 ${label}이 ${relSum >= 3 ? '뚜렷한' : '있는'} 편`);
  }
  const stars: any[] = Array.isArray((gpt as any).coreAnalysis?.specialStars) ? (gpt as any).coreAnalysis.specialStars : [];
  const starNames = stars.map(s => s?.name).filter(Boolean);
  if (starNames.some((n: string) => /도화|홍염|홍란|천희/.test(n))) {
    relSignals.push('도화·홍염 계열 신살이 있어 끌림·매력의 결이 또렷한 편');
  }
  // 인연이 움직이는 연도: 세운에 관계 십성 활성
  for (const y of next3.slice(0, 3)) {
    const tg: string[] = Array.isArray(y.activatedTenGods) ? y.activatedTenGods : [];
    const hit = relGods.filter(g => tg.includes(g));
    if (hit.length) {
      const persona = hit.map(g => PERSON_BY_TENGOD[g]).filter(Boolean)[0];
      relSignals.push(`${y.year}년 세운에 ${hit.join('·')} 활성 → 관계/인연이 움직이기 쉬운 구간${persona ? ` / 들어오는 사람의 결: ${persona}` : ''}`);
    }
  }

  return {
    mode: 'personal',
    granularity: signals.length ? 'year' : 'none',
    coreLines: coreLinesFromPerson(gpt),
    relationshipSignals: relSignals,
    signals,
    auxiliaryLines: auxLines((gpt as any).yongsinDiagnostic),
    timingRule: '시기는 대운·연 단위까지만 계산됨. 특정 월·계절·날짜는 만들지 말 것(연도/대운 구간으로만).',
  };
}

// ============================================================
// 2) 올해운세 — 절기 월운 + 이후 2년
// ============================================================
export function buildYearlyEventForecastEvidence(analysis: YearlyFortuneAnalysis): EventForecastEvidence {
  const carried: any = analysis.carriedOver ?? {};
  const ug: any = carried.usefulGod ?? {};
  const coreLines: string[] = [];
  if (ug.primaryUseful) coreLines.push(`용신: ${toKo(ug.primaryUseful.value)}${ug.unfavorable?.length ? ` / 기신: ${koList(ug.unfavorable).join(',')}` : ''}`);
  const si: any = analysis.strengthImpact ?? {};
  if (si.natalStrength) coreLines.push(`올해 신강/신약 영향: ${si.natalStrength} → ${si.plainMeaning || (YEARLY_EFFECT_KO[si.yearlyEffect] ?? '')}`.trim());

  const signals: ForecastSignal[] = [];
  const months: any[] = Array.isArray(analysis.remainingMonthlyFortunes) ? analysis.remainingMonthlyFortunes : [];
  let prevKind = '';
  for (const m of months) {
    const topics: string[] = Array.isArray(m.activatedTopics) ? m.activatedTopics : [];
    const eff = m.usefulGodEffect;
    let kind = topics.length ? topics.join(' / ') : (m.keyword ?? '흐름');
    // 인접 월 동일 topic이면 keyword로 분화(같은 제목 반복 방지).
    if (kind === prevKind && m.keyword) kind = `${kind} · ${m.keyword}`;
    prevKind = topics.length ? topics.join(' / ') : kind;
    signals.push({
      window: `${m.monthLabel ?? ''}${m.periodLabel ? ` (${m.periodLabel})` : ''}`.trim(),
      kind,
      signal: `${m.keyword ?? ''}${eff ? ` · 용신 작용: ${USEFUL_GOD_EFFECT_KO[eff] ?? '중립적인'}` : ''}`.trim(),
      strength: eff === 'helpful' ? 'strong' : (eff === 'burdensome' || eff === 'mixed') ? 'moderate' : 'subtle',
      good: m.goodChoice || undefined,
      caution: m.caution || undefined,
    });
  }
  const next2: any[] = Array.isArray(analysis.nextTwoYears) ? analysis.nextTwoYears : [];
  for (const y of next2) {
    signals.push({
      window: `${y.year}년`,
      kind: y.keyword ?? '큰 흐름',
      signal: `${y.keyword ?? ''}`,
      strength: 'moderate',
      good: y.opportunity || undefined,
      caution: y.caution || undefined,
    });
  }

  // 관계가 움직이는 월 (activatedTopics에 관계/연애)
  const relSignals: string[] = months
    .filter(m => (m.activatedTopics ?? []).some((t: string) => /관계|연애/.test(t)))
    .map(m => `${m.monthLabel}: 관계/인연 주제가 강해지는 구간`);

  return {
    mode: 'yearly',
    granularity: months.length ? 'month' : 'year',
    coreLines,
    relationshipSignals: relSignals,
    signals,
    auxiliaryLines: [],
    timingRule: '아래 월은 절기 기준 실제 계산값. 이 목록의 월만 쓰고 없는 월/날짜는 만들지 말 것. 인접 월은 서로 다른 사건 결로 분화할 것(반복 금지).',
  };
}

// ============================================================
// 3) 궁합 — 관계 연 단위 흐름 + A/B 결
// ============================================================
export function buildCompatEventForecastEvidence(
  bundle: CompatibilityAnalysisBundle,
  personA: PersonalSajuGptInput,
  personB: PersonalSajuGptInput,
): EventForecastEvidence {
  const relationLines: string[] = [];
  const ec: any = bundle.elementComplement ?? {};
  const aNeeds = (ec.aNeedsFromB ?? []).map((e: Element) => ELEMENT_KO[e]).filter(Boolean);
  const bNeeds = (ec.bNeedsFromA ?? []).map((e: Element) => ELEMENT_KO[e]).filter(Boolean);
  if (aNeeds.length) relationLines.push(`A는 ${aNeeds.join('·')} 기운이 더해질 때 편안해지는 결`);
  if (bNeeds.length) relationLines.push(`B는 ${bNeeds.join('·')} 기운이 더해질 때 편안해지는 결`);
  const dmr: any = bundle.dayMasterRelation ?? {};
  if (dmr.description) relationLines.push(`일간 관계 결: ${dmr.description}`);
  const choices: any = bundle.relationshipChoices ?? {};
  for (const c of (choices.helpfulChoices ?? []).slice(0, 2)) {
    if (c?.practicalAction) relationLines.push(`가까워지는 결: ${c.title ?? ''} — ${c.practicalAction}`.trim());
  }
  for (const c of (choices.harmfulChoices ?? []).slice(0, 2)) {
    if (c?.practicalAction || c?.title) relationLines.push(`멀어지는 결: ${c.title ?? ''}${c.practicalAction ? ` — ${c.practicalAction}` : ''}`.trim());
  }
  const ugi: any = bundle.usefulGodInteraction ?? {};
  if (ugi.interpretation && !/용신|기신|살린|망친|망쳐|살려/.test(ugi.interpretation)) {
    relationLines.push(`기운 상호작용: ${ugi.interpretation}`);
  }

  const signals: ForecastSignal[] = [];
  const flow: any[] = Array.isArray(bundle.futureFlow) ? bundle.futureFlow : [];
  for (const f of flow.slice(0, 3)) {
    signals.push({
      window: `${f.year ?? ''}`,
      kind: '관계 전개',
      signal: `${f.theme ?? ''}`,
      strength: 'moderate',
      good: f.opportunity || f.advice || undefined,
      caution: f.caution || undefined,
    });
  }

  return {
    mode: 'compat',
    granularity: signals.length ? 'year' : 'none',
    coreLines: relationLines,
    relationshipSignals: [],
    signals,
    auxiliaryLines: [],
    timingRule: '관계는 연 단위 흐름까지만 계산됨. 특정 날짜를 만들지 말 것. 고백·결혼·이별 같은 결정은 단정 금지, "어떤 국면에서 가까워지고/부딪히는지"로.',
    partner: { aLines: coreLinesFromPerson(personA), bLines: coreLinesFromPerson(personB), relationLines },
  };
}

// ============================================================
// 4) 임산부 — 시기 없음. 패턴(감정/가족/태교/부담) 중심.
// ============================================================
export function buildPregnancyEventForecastEvidence(bundle: PregnancyAnalysisBundle): EventForecastEvidence {
  const mother: PersonalSajuGptInput = (bundle as any).mother;
  const coreLines = mother ? coreLinesFromPerson(mother) : [];
  const ec: any = (bundle as any).elementComplement ?? {};
  const momNeeds = (ec.motherNeedsFromBaby ?? []).map((e: Element) => ELEMENT_KO[e]).filter(Boolean);

  // 시기 없는 "패턴 신호" — 감정/가족/태교/부담. window는 날짜가 아니라 국면.
  const signals: ForecastSignal[] = [
    { window: '임신 기간 전반', kind: '엄마 감정 리듬', signal: `${momNeeds.length ? momNeeds.join('·') + ' 기운을 살리는 환경이 안정에 도움' : '안정적인 생활 리듬이 도움'}`, strength: 'moderate' },
    { window: '부담이 쌓이기 쉬운 국면', kind: '가족 지원', signal: '엄마가 혼자 버티려 할 때 부담이 커지기 쉬움 — 가족의 구체적 분담이 필요', strength: 'moderate' },
  ];

  return {
    mode: 'pregnancy',
    granularity: 'none',
    coreLines,
    relationshipSignals: [],
    signals,
    auxiliaryLines: auxLines((mother as any)?.yongsinDiagnostic),
    timingRule: '출산일·출산시간·특정 날짜·달을 절대 만들지 말 것. 순산/난산·조산/유산·성별·건강·아이 운명 예측 금지. 시기 대신 "컨디션 회복기/안정기" 같은 국면 표현만. 의료 판단은 의료진 우선.',
  };
}
