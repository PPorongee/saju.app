// Event Forecast V1 — 단위 테스트 (flag / evidence / prompt / generator).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isPersonalEventForecastEnabled, isYearlyEventForecastEnabled,
  isCompatEventForecastEnabled, isPregnancyEventForecastEnabled,
} from '../eventForecastFlag';
import {
  buildPersonalEventForecastEvidence, buildYearlyEventForecastEvidence,
  buildCompatEventForecastEvidence, buildPregnancyEventForecastEvidence,
} from '../eventForecastEvidence';
import { buildEventForecastPrompt } from '../eventForecastPromptBuilder';
import { generateEventForecast } from '../generateEventForecast';

const personGpt: any = {
  userContext: { gender: 'female', relationshipStatus: 'single', hasChildren: 'unknown' },
  coreAnalysis: {
    usefulGod: { primaryUseful: { type: 'element', value: 'water' }, favorable: ['fire'], unfavorable: ['earth'] },
    dayMasterStrength: { level: 'weak' },
    elementStrength: { strongest: ['water'], weakest: ['fire'], climate: { comment: '약간 차가운 편' } },
    tenGods: { totals: { 정관: 2, 편관: 2, 정재: 1, 편재: 0, 식신: 1, 상관: 0, 정인: 2, 편인: 0, 비견: 1, 겁재: 1 } },
    specialStars: [{ name: '도화', positions: ['일지'] }],
  },
  fortune: {
    currentDaewoon: { pillar: '갑신', ageRange: '30~39', theme: '편관 대운' },
    nextThreeYears: [
      { year: 2027, pillar: '정미', theme: '관계·확장', activatedTenGods: ['정관', '식신'], activatedElements: ['fire'], opportunities: ['공식적인 관계 진전'], risks: ['책임 가중'] },
      { year: 2028, pillar: '무신', theme: '자원 정비', activatedTenGods: ['편재'], activatedElements: ['metal'], opportunities: ['수익 구조 정비'], risks: [] },
    ],
  },
  futureTimingAnalysis: { years: [] },
  yongsinDiagnostic: { currentFinalYongsin: { primary: 'water', unfavorable: 'fire' }, drainCandidate: { element: 'wood', rationale: 'x' }, controlCandidate: null },
};

describe('eventForecastFlag — 기본 OFF', () => {
  const keys = ['SAJU_EVENT_FORECAST_ENABLED', 'SAJU_PERSONAL_EVENT_FORECAST_ENABLED', 'SAJU_YEARLY_EVENT_FORECAST_ENABLED', 'SAJU_COMPAT_EVENT_FORECAST_ENABLED', 'SAJU_PREGNANCY_EVENT_FORECAST_ENABLED'];
  beforeEach(() => keys.forEach(k => { delete process.env[k]; }));
  afterEach(() => keys.forEach(k => { delete process.env[k]; }));
  it('미설정이면 모두 OFF', () => {
    expect(isPersonalEventForecastEnabled()).toBe(false);
    expect(isYearlyEventForecastEnabled()).toBe(false);
    expect(isCompatEventForecastEnabled()).toBe(false);
    expect(isPregnancyEventForecastEnabled()).toBe(false);
  });
  it('master=true면 모두 ON', () => {
    process.env.SAJU_EVENT_FORECAST_ENABLED = 'true';
    expect(isPersonalEventForecastEnabled()).toBe(true);
    expect(isPregnancyEventForecastEnabled()).toBe(true);
  });
  it('per-mode만 ON', () => {
    process.env.SAJU_COMPAT_EVENT_FORECAST_ENABLED = 'true';
    expect(isCompatEventForecastEnabled()).toBe(true);
    expect(isPersonalEventForecastEnabled()).toBe(false);
  });
});

describe('evidence — 실제 계산 신호에서 추출', () => {
  it('개인: 세운 활성 십성에서 시기 신호 생성, 영문 오행 key 미노출', () => {
    const ev = buildPersonalEventForecastEvidence(personGpt);
    expect(ev.granularity).toBe('year');
    expect(ev.signals.some(s => s.window.includes('2027'))).toBe(true);
    const joined = JSON.stringify(ev);
    expect(joined).not.toMatch(/"wood"|water|fire|metal/);
  });
  it('개인: 여성+관성+도화 → 인연 신호 + 인연이 움직이는 연도', () => {
    const ev = buildPersonalEventForecastEvidence(personGpt);
    const rel = ev.relationshipSignals.join(' ');
    expect(rel).toContain('관성');
    expect(rel).toMatch(/도화|홍염/);
    expect(rel).toContain('2027'); // 세운 정관 활성 연도
  });
  it('개인: 인연 신호는 근거 없으면 안 만든다 (남성·관성0·신살 없음)', () => {
    const male: any = { ...personGpt, userContext: { gender: 'male' }, coreAnalysis: { ...personGpt.coreAnalysis, tenGods: { totals: { 정재: 0, 편재: 0 } }, specialStars: [] }, fortune: { nextThreeYears: [] } };
    const ev = buildPersonalEventForecastEvidence(male);
    expect(ev.relationshipSignals.length).toBe(0);
  });
  it('올해: 절기 월운 → month 신호', () => {
    const analysis: any = {
      carriedOver: { usefulGod: { primaryUseful: { type: 'element', value: 'metal' }, unfavorable: ['fire'] }, dayMasterStrength: { level: 'strong' } },
      strengthImpact: { natalStrength: '신강', yearlyEffect: 'mixed', plainMeaning: '분산 주의' },
      remainingMonthlyFortunes: [
        { monthLabel: '6월 흐름', periodLabel: '2026-06-05~07-06', keyword: '책임', activatedTopics: ['일'], usefulGodEffect: 'burdensome', goodChoice: '범위 확정', caution: '과로' },
        { monthLabel: '9월 흐름', periodLabel: '2026-09-07~10-08', keyword: '관계', activatedTopics: ['관계', '연애'], usefulGodEffect: 'helpful', goodChoice: '대화', caution: '' },
      ],
      nextTwoYears: [{ year: 2027, keyword: '확장', opportunity: '제휴', caution: '과확장' }],
    };
    const ev = buildYearlyEventForecastEvidence(analysis);
    expect(ev.granularity).toBe('month');
    expect(ev.signals.some(s => s.window.includes('6월'))).toBe(true);
    expect(ev.relationshipSignals.some(l => l.includes('9월'))).toBe(true);
  });
  it('궁합: A/B 결 분리 + 관계 신호, 용신-attribution 미포함', () => {
    const bundle: any = {
      elementComplement: { aNeedsFromB: ['fire'], bNeedsFromA: ['water'], mutualComplement: 'moderate' },
      dayMasterRelation: { description: '북돋우는 결' },
      usefulGodInteraction: { interpretation: '상대가 당신의 용신 역할을 합니다' }, // 차단되어야
      relationshipChoices: { helpfulChoices: [{ title: '대화', practicalAction: '주1회 점검' }], harmfulChoices: [] },
      futureFlow: [{ year: 2026, theme: '안정', advice: '속도 맞추기' }],
    };
    const ev = buildCompatEventForecastEvidence(bundle, personGpt, personGpt);
    expect(ev.partner!.aLines.length).toBeGreaterThan(0);
    expect(JSON.stringify(ev)).not.toContain('용신 역할');
    expect(ev.signals.some(s => s.window.includes('2026'))).toBe(true);
  });
  it('임산부: granularity none + 출산/날짜 금지 규칙', () => {
    const ev = buildPregnancyEventForecastEvidence({ mother: personGpt, elementComplement: { motherNeedsFromBaby: ['fire'] } } as any);
    expect(ev.granularity).toBe('none');
    expect(ev.timingRule).toContain('출산');
    expect(ev.signals.every(s => !/\d{4}-\d{2}|월/.test(s.window))).toBe(true);
  });
});

describe('prompt — 사건 예보 중심 + 자기계발 금지', () => {
  it('규칙에 자기계발 금지 + 없는 시기 금지 포함', () => {
    const p = buildEventForecastPrompt(buildPersonalEventForecastEvidence(personGpt));
    expect(p.user).toMatch(/자기계발/);
    expect(p.user).toMatch(/없는 월|만들지/);
    expect(p.user).toContain('eventCards');
  });
  it('궁합 프롬프트는 상대 용신/운명 단정 금지 명시', () => {
    const bundle: any = { elementComplement: {}, dayMasterRelation: {}, usefulGodInteraction: {}, relationshipChoices: {}, futureFlow: [] };
    const p = buildEventForecastPrompt(buildCompatEventForecastEvidence(bundle, personGpt, personGpt));
    expect(p.user).toMatch(/용신\/기신\/운명/);
  });
  it('임산부 프롬프트는 출산 시기 금지', () => {
    const p = buildEventForecastPrompt(buildPregnancyEventForecastEvidence({ mother: personGpt, elementComplement: {} } as any));
    expect(p.user).toContain('출산');
  });
});

describe('generateEventForecast — 파싱/안전/null', () => {
  const ev = buildPersonalEventForecastEvidence(personGpt);
  const valid = JSON.stringify({
    headline: '운의 사건 예보', summary: '2027년 관계가 진전되는 흐름이 열립니다.',
    eventCards: [{ type: 'relationship', title: '관계가 깊어지는 인연운', timeWindow: '2027년', likelihood: 'strong', eventScene: '조용한 사람이 들어옵니다', personOrSituation: '기준이 분명한 결', whyThisAppears: '세운 정관 활성', goodIf: ['생활 리듬'], carefulIf: ['속도'], howToUse: '천천히' }],
    timingMap: { pushWindows: ['2027년'], cautionWindows: [], preparationWindows: [] },
    watchSigns: ['관계 신호'], avoidPatterns: ['조급함'],
  });
  it('유효 JSON → forecast, mode 세팅, eventCards 보존', async () => {
    const f = await generateEventForecast(ev, async () => valid);
    expect(f).toBeTruthy();
    expect(f!.mode).toBe('personal');
    expect(f!.eventCards[0].title).toContain('인연운');
    expect(f!.eventCards[0].type).toBe('relationship');
  });
  it('summary/eventCards 비면 null', async () => {
    const f = await generateEventForecast(ev, async () => JSON.stringify({ headline: 'x' }));
    expect(f).toBeNull();
  });
  it('throw → null', async () => {
    const f = await generateEventForecast(ev, async () => { throw new Error('t'); });
    expect(f).toBeNull();
  });
  it('안전 스크럽: 단정 표현 완화', async () => {
    const risky = JSON.stringify({ headline: 'h', summary: '2027년에 반드시 결혼합니다.', eventCards: [{ type: 'relationship', title: 't', timeWindow: '2027년', likelihood: 'moderate', eventScene: 's', whyThisAppears: 'w', goodIf: [], carefulIf: [], howToUse: 'h' }] });
    const f = await generateEventForecast(ev, async () => risky);
    expect(f!.summary).not.toContain('반드시');
  });
  it('금융 단어 스크럽: "투자/투자자"가 출력에 남지 않는다', async () => {
    const fin = JSON.stringify({ headline: 'h', summary: '투자 기회가 열립니다.', eventCards: [{ type: 'money', title: '재정 기회', timeWindow: '2028년', likelihood: 'moderate', eventScene: '투자나 새 사업으로 기회를 모색', personOrSituation: '투자자와의 협업', whyThisAppears: 'w', goodIf: [], carefulIf: [], howToUse: 'h' }] });
    const f = await generateEventForecast(ev, async () => fin);
    expect(JSON.stringify(f)).not.toContain('투자');
  });
  it('임산부: 출산 시기/택일 잔여 시 null', async () => {
    const pregEv = buildPregnancyEventForecastEvidence({ mother: personGpt, elementComplement: {} } as any);
    const leaky = JSON.stringify({ headline: 'h', summary: '엄마가 편안해지는 흐름', eventCards: [{ type: 'family', title: '좋은 택일', timeWindow: '임신 기간', likelihood: 'subtle', eventScene: '택일을 잡으세요', whyThisAppears: 'w', goodIf: [], carefulIf: [], howToUse: 'h' }] });
    const f = await generateEventForecast(pregEv, async () => leaky, { disclaimer: '의료진을 따르세요.' });
    expect(f).toBeNull();
  });
});
