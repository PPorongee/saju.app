// Life Event Forecast V1 — deterministic 큰 사건 씨앗 추출 (compact, 프롬프트 grounding 전용).
//
// grounding 원칙 (도메인 advisory 반영):
//   - GROUNDED: work_change(관성), money(재성), contract/study_document(인성), relationship(성별별 관성/재성 + 도화/홍염), 가족(년주 합충 → yearly '가족').
//   - WEAK: move(역마 신살 있을 때만, 시기 단정 X), 자녀(식상은 결과물로 — 자녀 단정 X), business/real_estate(재성+인성/비겁으로만, 단독 단정 X).
//   - 없는 시기/사건은 만들지 않는다. 근거 약하면 strength=subtle.

import { ELEMENT_KO, type Element } from '../rules/elements';
import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type { YongsinDiagnostic } from '../analysis/yongsinDiagnostic';
import type { YearlyFortuneAnalysis } from '../yearly/yearlyTypes';
import type { CompatibilityAnalysisBundle } from '../compatibility/compatibilityTypes';
import type { PregnancyAnalysisBundle } from '../pregnancy/narrative/pregnancyMomBabyAnalyzer';
import type {
  EventForecastEvidence, EventSeed, EventStrength, LifeEventType, RelationshipStatus,
} from './eventForecastTypes';

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
function normStatus(v: unknown): RelationshipStatus {
  const s = String(v ?? 'unknown');
  if (s === 'single' || s === 'dating' || s === 'married' || s === 'divorced') return s;
  if (s === 'widowed') return 'married'; // 신규 연애 금지 측면에서 기혼과 동일 처리
  return 'unknown';
}
const allowsNewRomance = (s: RelationshipStatus) => s === 'single' || s === 'dating';

// 십성 → 사건 축
const AXIS_BY_TENGOD: Record<string, { axis: LifeEventType; label: string }> = {
  정관: { axis: 'work_change', label: '직장·역할·공식화' },
  편관: { axis: 'work_change', label: '직장·책임·도전' },
  정재: { axis: 'money', label: '돈·현실 자원' },
  편재: { axis: 'money', label: '돈·확장·기회' },
  식신: { axis: 'work_change', label: '결과물·표현' },
  상관: { axis: 'work_change', label: '이직·재능 전환' },
  정인: { axis: 'contract', label: '문서·계약·자격' },
  편인: { axis: 'study_document', label: '공부·전환·문서' },
  비견: { axis: 'business', label: '협업·자립' },
  겁재: { axis: 'business', label: '경쟁·변동' },
};
const REL_TENGODS_FEMALE = ['정관', '편관'];
const REL_TENGODS_MALE = ['정재', '편재'];
const PERSON_BY_TENGOD: Record<string, string> = {
  정관: '안정적이고 공식적인 결', 편관: '추진력·자기 기준이 분명한 결',
  정재: '성실·현실 감각의 결', 편재: '활동적·사교적인 결',
  식신: '편안하고 표현이 부드러운 결', 상관: '재능·자기표현이 강한 결',
  정인: '배려·안정감을 주는 결', 편인: '생각 깊고 개성 있는 결',
  비견: '대등한 동료 같은 결', 겁재: '경쟁적이고 변화가 많은 결',
};

function coreLinesFromPerson(gpt: PersonalSajuGptInput): string[] {
  const core: any = (gpt as any).coreAnalysis ?? {};
  const ug: any = core.usefulGod ?? {};
  const dm: any = core.dayMasterStrength ?? {};
  const lines: string[] = [];
  if (ug.primaryUseful) lines.push(`용신: ${toKo(ug.primaryUseful.value)}${ug.favorable?.length ? ` / 희신: ${koList(ug.favorable).join(',')}` : ''}${ug.unfavorable?.length ? ` / 기신: ${koList(ug.unfavorable).join(',')}` : ''}`);
  if (dm.level) lines.push(`일간 강약: ${STRENGTH_KO[dm.level] ?? dm.level}`);
  return lines;
}
function auxLines(diag: YongsinDiagnostic | undefined | null): string[] {
  if (!diag) return [];
  const out: string[] = [];
  const p = ELEMENT_KO[diag.currentFinalYongsin?.primary as Element];
  if (p) out.push(`주 용신(${p}) 유지 — 보조 결만 참고`);
  if (diag.drainCandidate?.element) out.push(`설기 보조: ${ELEMENT_KO[diag.drainCandidate.element]}`);
  if (diag.controlCandidate?.element) out.push(`극제 보조: ${ELEMENT_KO[diag.controlCandidate.element]}`);
  return out;
}
function strengthFromCount(n: number): EventStrength {
  if (n >= 3) return 'strong';
  if (n >= 1) return 'moderate';
  return 'subtle';
}
function hasYeokma(gpt: PersonalSajuGptInput): boolean {
  const stars: any[] = Array.isArray((gpt as any).coreAnalysis?.specialStars) ? (gpt as any).coreAnalysis.specialStars : [];
  return stars.some(s => /역마/.test(String(s?.name ?? '')));
}

// ============================================================
// 1) 개인사주 — 대운/세운 활성 십성 → 큰 사건 축
// ============================================================
export function buildPersonalEventForecastEvidence(gpt: PersonalSajuGptInput): EventForecastEvidence {
  const core: any = (gpt as any).coreAnalysis ?? {};
  const fortune: any = (gpt as any).fortune ?? {};
  const gender: string = (gpt as any).userContext?.gender ?? 'unknown';
  const status = normStatus((gpt as any).userContext?.relationshipStatus);
  const relGods = gender === 'female' ? REL_TENGODS_FEMALE : gender === 'male' ? REL_TENGODS_MALE : [];
  const totals: Record<string, number> = core.tenGods?.totals ?? {};
  const relSum = relGods.reduce((a, g) => a + (Number(totals[g]) || 0), 0);

  const seeds: EventSeed[] = [];

  // 현재 대운 (큰 환경)
  const cd = fortune.currentDaewoon;
  if (cd?.theme || cd?.pillar) {
    seeds.push({ window: `현재 대운${cd.ageRange ? ` (${cd.ageRange}세)` : ''}`, axis: 'other', axisLabel: '큰 환경 흐름', basis: `${cd.pillar ?? ''} 대운 — ${cd.theme ?? ''}`.trim(), strength: 'moderate' });
  }
  // 역마 → 이동수 (시기 단정 없이 결만)
  if (hasYeokma(gpt)) {
    seeds.push({ window: '대운 전반', axis: 'move', axisLabel: '이동수', basis: '역마살 — 집·근무지·생활권·외부 일정이 움직이는 결', strength: 'subtle' });
  }

  const next3: any[] = Array.isArray(fortune.nextThreeYears) ? fortune.nextThreeYears : [];
  for (const y of next3.slice(0, 3)) {
    const tg: string[] = Array.isArray(y.activatedTenGods) ? y.activatedTenGods : [];
    const seenAxis = new Set<string>();
    const good = Array.isArray(y.opportunities) ? y.opportunities[0] : undefined;
    const caution = Array.isArray(y.risks) ? y.risks[0] : undefined;
    for (const g of tg) {
      const m = AXIS_BY_TENGOD[g];
      if (!m || seenAxis.has(m.axis)) continue;
      seenAxis.add(m.axis);
      seeds.push({ window: `${y.year}년`, axis: m.axis, axisLabel: m.label, basis: `세운 ${y.pillar ?? ''} — ${g} 활성`, strength: strengthFromCount(tg.length), good, caution });
    }
    // 관계/배우자 (성별별 관성·재성 활성 시)
    const relHit = relGods.filter(g => tg.includes(g));
    if (relHit.length) {
      if (allowsNewRomance(status)) {
        const persona = relHit.map(g => PERSON_BY_TENGOD[g]).filter(Boolean)[0];
        seeds.push({ window: `${y.year}년`, axis: 'relationship', axisLabel: '관계·인연', basis: `세운 ${relHit.join('·')} 활성 → 인연이 움직이는 구간${persona ? ` / 들어오는 사람의 결: ${persona}` : ''}`, strength: 'moderate', good, caution });
      } else {
        seeds.push({ window: `${y.year}년`, axis: 'family_child', axisLabel: '배우자·가족 결정', basis: `세운 ${relHit.join('·')} 활성 → 가정 내 돈·역할·자녀·집안 문제가 움직이는 구간(새 인연 아님)`, strength: 'moderate', good, caution });
      }
    }
  }

  // 관계 의무 카드 보장: 세운 활성에서 관계 seed가 안 나왔으면 대운 차원에서 1개.
  const hasRelSeed = seeds.some(s => s.axis === 'relationship' || s.axis === 'family_child');
  if (!hasRelSeed) {
    if (allowsNewRomance(status) && relSum >= 1) {
      seeds.push({ window: '대운 전반', axis: 'relationship', axisLabel: '관계·인연', basis: `${gender === 'female' ? '관성' : '재성'}(관계의 결)이 사주에 있어 대운 안에서 인연이 한 번 움직이는 구간`, strength: 'subtle' });
    } else if (!allowsNewRomance(status)) {
      seeds.push({ window: '대운 전반', axis: 'family_child', axisLabel: '배우자·가족 결정', basis: '가정 내 돈·역할·자녀·생활권 결정이 한 번 크게 움직이는 구간(새 인연 아님)', strength: 'subtle' });
    }
  }

  return {
    mode: 'personal',
    granularity: seeds.length ? 'year' : 'none',
    relationshipStatus: status,
    coreLines: coreLinesFromPerson(gpt),
    eventSeeds: seeds,
    auxiliaryLines: auxLines((gpt as any).yongsinDiagnostic),
    timingRule: '시기는 대운·연 단위까지만 계산됨. 특정 월·계절·날짜를 새로 만들지 말 것. 부동산/사업은 단독 단정 말고 돈·계약·문서 흐름 안에서. 자녀는 단정 금지(가족·책임 흐름으로).',
  };
}

// 올해운세 topic → 축
const AXIS_BY_TOPIC: Record<string, { axis: LifeEventType; label: string }> = {
  '일': { axis: 'work_change', label: '직장·일' },
  '돈': { axis: 'money', label: '돈 흐름' },
  '계약': { axis: 'contract', label: '계약·정산' },
  '공부': { axis: 'study_document', label: '문서·자격·공부' },
  '관계': { axis: 'relationship', label: '관계' },
  '연애': { axis: 'relationship', label: '연애' },
  '가족': { axis: 'family_child', label: '가족' },
  '결과물': { axis: 'work_change', label: '결과물·공개' },
  '이동': { axis: 'move', label: '이동수' },
  '건강리듬': { axis: 'health_rhythm', label: '생활 리듬' },
};

// ============================================================
// 2) 올해운세 — 절기 월운 활성 topic → 큰 사건 축
// ============================================================
export function buildYearlyEventForecastEvidence(
  analysis: YearlyFortuneAnalysis,
  relationshipStatus: RelationshipStatus = 'unknown',
): EventForecastEvidence {
  const carried: any = analysis.carriedOver ?? {};
  const ug: any = carried.usefulGod ?? {};
  const coreLines: string[] = [];
  if (ug.primaryUseful) coreLines.push(`용신: ${toKo(ug.primaryUseful.value)}${ug.unfavorable?.length ? ` / 기신: ${koList(ug.unfavorable).join(',')}` : ''}`);
  const si: any = analysis.strengthImpact ?? {};
  if (si.natalStrength) coreLines.push(`올해 신강/신약: ${si.natalStrength} → ${si.plainMeaning || ''}`.trim());

  const status = normStatus(relationshipStatus);
  const seeds: EventSeed[] = [];
  const months: any[] = Array.isArray(analysis.remainingMonthlyFortunes) ? analysis.remainingMonthlyFortunes : [];
  for (const m of months) {
    const topics: string[] = Array.isArray(m.activatedTopics) ? m.activatedTopics : [];
    const win = `${m.monthLabel ?? ''}${m.periodLabel ? ` (${m.periodLabel})` : ''}`.trim();
    const seenAxis = new Set<string>();
    for (const t of topics) {
      let m2 = AXIS_BY_TOPIC[t];
      if (!m2) continue;
      // 기혼이면 관계/연애 topic → 가족·집안으로 변환
      if (m2.axis === 'relationship' && !allowsNewRomance(status)) m2 = { axis: 'family_child', label: '배우자·가족' };
      if (seenAxis.has(m2.axis)) continue;
      seenAxis.add(m2.axis);
      seeds.push({ window: win, axis: m2.axis, axisLabel: m2.label, basis: `${m.keyword ?? t}`, strength: m.usefulGodEffect === 'helpful' ? 'strong' : 'moderate', good: m.goodChoice || undefined, caution: m.caution || undefined });
    }
  }
  const next2: any[] = Array.isArray(analysis.nextTwoYears) ? analysis.nextTwoYears : [];
  for (const y of next2) {
    seeds.push({ window: `${y.year}년`, axis: 'other', axisLabel: '이후 큰 흐름', basis: `${y.keyword ?? ''}`, strength: 'subtle', good: y.opportunity || undefined, caution: y.caution || undefined });
  }

  return {
    mode: 'yearly',
    granularity: months.length ? 'month' : 'year',
    relationshipStatus: status,
    coreLines,
    eventSeeds: seeds,
    auxiliaryLines: [],
    timingRule: '아래 구간은 절기 기준 실제 계산값. 이 구간만 쓰고 없는 월/날짜를 만들지 말 것. 인접 구간은 서로 다른 사건 결로 분화. 이동수는 계산된 신호가 없으면 만들지 말 것.',
  };
}

// ============================================================
// 3) 궁합 — 관계 연 단위 흐름 + A/B 결
// ============================================================
export function buildCompatEventForecastEvidence(
  bundle: CompatibilityAnalysisBundle,
  personA: PersonalSajuGptInput,
  personB: PersonalSajuGptInput,
  relationshipType?: string,
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
  for (const c of (choices.helpfulChoices ?? []).slice(0, 2)) if (c?.practicalAction) relationLines.push(`가까워지는 결: ${c.title ?? ''} — ${c.practicalAction}`.trim());
  for (const c of (choices.harmfulChoices ?? []).slice(0, 2)) if (c?.title || c?.practicalAction) relationLines.push(`멀어지는 결: ${c.title ?? ''}${c.practicalAction ? ` — ${c.practicalAction}` : ''}`.trim());
  const ugi: any = bundle.usefulGodInteraction ?? {};
  if (ugi.interpretation && !/용신|기신|살린|망친|망쳐|살려/.test(ugi.interpretation)) relationLines.push(`기운 상호작용: ${ugi.interpretation}`);

  const seeds: EventSeed[] = [];
  const flow: any[] = Array.isArray(bundle.futureFlow) ? bundle.futureFlow : [];
  for (const f of flow.slice(0, 2)) {
    seeds.push({ window: `${f.year ?? ''}`, axis: 'relationship', axisLabel: '관계 전개', basis: `${f.theme ?? ''}`, strength: 'moderate', good: f.opportunity || f.advice || undefined, caution: f.caution || undefined });
  }
  // 관측 가능한 관계 사건 슬롯(무드 그래프 대신). 단정 아님 — 거론/갈림으로.
  const years = flow.map(f => String(f.year)).filter(Boolean);
  const wA = years[0] || '앞으로', wMid = years[1] || years[0] || '앞으로', wEnd = years[2] || years[1] || '이후';
  if (relationshipType === 'married') {
    seeds.push({ window: wMid, axis: 'family_child', axisLabel: '집안·돈·역할 결정', basis: '생활·돈·역할 분담을 다시 정하는 사건이 한 번 식탁에 오르는 구간', strength: 'subtle', caution: '책임 분담이 흐려지면 한쪽이 소모' });
  } else {
    seeds.push({ window: wMid, axis: 'family_child', axisLabel: '관계 결정 거론(동거·양가)', basis: '동거·양가 인사·합치기가 처음 거론되는 구간(결정 아님, 거론)', strength: 'subtle' });
    seeds.push({ window: wEnd, axis: 'move', axisLabel: '거주지·직장 이동이 관계를 강제', basis: '한쪽의 거주지·직장 이동이 장거리냐 합치냐를 정하게 만드는 갈림 구간', strength: 'subtle' });
  }
  seeds.push({ window: wA, axis: 'relationship', axisLabel: '만남 빈도 변화', basis: '한쪽이 일·이사로 바빠지며 연락·만남 빈도가 눈에 띄게 달라지는 구간', strength: 'subtle', caution: '주기를 안 정하면 자연 소강으로 흐름' });

  return {
    mode: 'compat',
    granularity: seeds.length ? 'year' : 'none',
    relationshipStatus: relationshipType === 'married' ? 'married' : 'unknown',
    coreLines: relationLines,
    eventSeeds: seeds,
    auxiliaryLines: [],
    timingRule: '관계는 연 단위 흐름까지만. 특정 날짜 만들지 말 것. 동거·결혼·금전거래·사업 파트너는 사건으로 다루되 단정 금지. 상대를 용신/기신/운명으로 단정 금지.',
    partner: { aLines: coreLinesFromPerson(personA), bLines: coreLinesFromPerson(personB), relationLines },
  };
}

// ============================================================
// 4) 임산부 — 시기 없음. 가족·집안 준비·태교 환경 국면.
// ============================================================
export function buildPregnancyEventForecastEvidence(bundle: PregnancyAnalysisBundle): EventForecastEvidence {
  const mother: PersonalSajuGptInput = (bundle as any).mother;
  const coreLines = mother ? coreLinesFromPerson(mother) : [];
  const ec: any = (bundle as any).elementComplement ?? {};
  const momNeeds = (ec.motherNeedsFromBaby ?? []).map((e: Element) => ELEMENT_KO[e]).filter(Boolean);

  const seeds: EventSeed[] = [
    { window: '임신 기간 전반', axis: 'family_child', axisLabel: '가족이 나눠야 할 일', basis: '엄마가 혼자 떠안기 쉬운 구조 — 가족의 구체적 분담이 필요한 국면', strength: 'moderate' },
    { window: '임신 기간 전반', axis: 'health_rhythm', axisLabel: '엄마 생활·태교 환경', basis: `${momNeeds.length ? momNeeds.join('·') + ' 기운을 살리는 환경이 안정에 도움' : '안정적인 생활 환경이 도움'}`, strength: 'moderate' },
  ];

  return {
    mode: 'pregnancy',
    granularity: 'none',
    relationshipStatus: 'unknown',
    coreLines,
    eventSeeds: seeds,
    auxiliaryLines: auxLines((mother as any)?.yongsinDiagnostic),
    timingRule: '출산일·출산시간·특정 날짜·달을 절대 만들지 말 것. 순산/난산·조산/유산·성별·건강·아이 운명 예측 금지. 시기 대신 "안정기·회복기" 같은 국면만. 의료 판단은 의료진 우선.',
  };
}
