// Life Event Forecast V1 — 단위 테스트 (flag / evidence / prompt / generator).
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

function personFixture(over: any = {}): any {
  return {
    userContext: { gender: 'female', relationshipStatus: over.relationshipStatus ?? 'single', hasChildren: 'unknown' },
    coreAnalysis: {
      usefulGod: { primaryUseful: { type: 'element', value: 'water' }, favorable: ['fire'], unfavorable: ['earth'] },
      dayMasterStrength: { level: 'weak' },
      elementStrength: { strongest: ['water'], weakest: ['fire'], climate: { comment: '약간 차가운 편' } },
      tenGods: { totals: { 정관: 2, 편관: 2, 정재: 1, 편재: 0, 식신: 1, 상관: 0, 정인: 2, 편인: 0, 비견: 1, 겁재: 1 } },
      specialStars: over.specialStars ?? [{ name: '역마', positions: ['일지'] }],
    },
    fortune: {
      currentDaewoon: { pillar: '갑신', ageRange: '30~39', theme: '편관 대운' },
      nextThreeYears: [
        { year: 2027, pillar: '정미', theme: '관계·확장', activatedTenGods: ['정관', '정재'], activatedElements: ['fire'], opportunities: ['공식 관계 진전'], risks: ['책임 가중'] },
        { year: 2028, pillar: '무신', theme: '문서·정비', activatedTenGods: ['정인'], activatedElements: ['metal'], opportunities: ['자격·문서 정리'], risks: [] },
      ],
    },
    yongsinDiagnostic: { currentFinalYongsin: { primary: 'water', unfavorable: 'fire' }, drainCandidate: { element: 'wood', rationale: 'x' }, controlCandidate: null },
  };
}

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
    expect(isCompatEventForecastEnabled()).toBe(true);
  });
});

describe('evidence — 큰 사건 축 추출', () => {
  it('개인(미혼): 세운 십성 → work_change/money/contract 축 + 인연 seed, 역마 → move', () => {
    const ev = buildPersonalEventForecastEvidence(personFixture({ relationshipStatus: 'single' }));
    const axes = ev.eventSeeds.map(s => s.axis);
    expect(axes).toContain('work_change'); // 정관
    expect(axes).toContain('money');       // 정재
    expect(axes).toContain('contract');    // 정인
    expect(axes).toContain('relationship');// 정관(여성 관성) 활성 → 인연
    expect(axes).toContain('move');        // 역마
    expect(JSON.stringify(ev)).not.toMatch(/water|fire|metal|wood/);
    expect(ev.relationshipStatus).toBe('single');
  });
  it('개인(기혼): 관성 활성이 인연이 아니라 배우자·가족 축으로 변환, 인연 seed 없음', () => {
    const ev = buildPersonalEventForecastEvidence(personFixture({ relationshipStatus: 'married' }));
    expect(ev.eventSeeds.some(s => s.axis === 'relationship')).toBe(false);
    expect(ev.eventSeeds.some(s => s.axis === 'family_child' && /가정 내|새 인연 아님/.test(s.basis))).toBe(true);
  });
  it('개인: 역마 없으면 move seed 없음', () => {
    const ev = buildPersonalEventForecastEvidence(personFixture({ specialStars: [] }));
    expect(ev.eventSeeds.some(s => s.axis === 'move')).toBe(false);
  });
  it('올해: 절기 월 topic → 축 (일/돈/계약/가족), 기혼이면 관계→가족', () => {
    const analysis: any = {
      carriedOver: { usefulGod: { primaryUseful: { type: 'element', value: 'metal' }, unfavorable: ['fire'] }, dayMasterStrength: { level: 'strong' } },
      strengthImpact: { natalStrength: '신강', plainMeaning: '분산 주의' },
      remainingMonthlyFortunes: [
        { monthLabel: '6월 흐름', periodLabel: '2026-06-05~07-06', keyword: '책임', activatedTopics: ['일', '계약'], usefulGodEffect: 'burdensome', goodChoice: '범위 확정', caution: '과로' },
        { monthLabel: '9월 흐름', periodLabel: '2026-09-07~10-08', keyword: '관계', activatedTopics: ['관계'], usefulGodEffect: 'helpful', goodChoice: '대화', caution: '' },
      ],
      nextTwoYears: [{ year: 2027, keyword: '확장', opportunity: '제휴', caution: '과확장' }],
    };
    const ev = buildYearlyEventForecastEvidence(analysis, 'married');
    const axes = ev.eventSeeds.map(s => s.axis);
    expect(ev.granularity).toBe('month');
    expect(axes).toContain('work_change');
    expect(axes).toContain('contract');
    expect(axes).toContain('family_child'); // 기혼 → 관계 topic이 가족으로
    expect(axes).not.toContain('relationship');
    expect(JSON.stringify(ev)).not.toMatch(/helpful|burdensome|supportive/);
  });
  it('궁합: A/B 결 분리 + 관계 seed, 용신-attribution 미포함', () => {
    const bundle: any = {
      elementComplement: { aNeedsFromB: ['fire'], bNeedsFromA: ['water'] },
      dayMasterRelation: { description: '북돋우는 결' },
      usefulGodInteraction: { interpretation: '상대가 당신의 용신 역할을 합니다' },
      relationshipChoices: { helpfulChoices: [{ title: '대화', practicalAction: '주1회' }], harmfulChoices: [] },
      futureFlow: [{ year: 2026, theme: '안정', advice: '속도 맞추기' }],
    };
    const ev = buildCompatEventForecastEvidence(bundle, personFixture(), personFixture(), 'dating');
    expect(ev.partner!.aLines.length).toBeGreaterThan(0);
    expect(JSON.stringify(ev)).not.toContain('용신 역할');
  });
  it('임산부: granularity none + 출산 금지 규칙', () => {
    const ev = buildPregnancyEventForecastEvidence({ mother: personFixture(), elementComplement: { motherNeedsFromBaby: ['fire'] } } as any);
    expect(ev.granularity).toBe('none');
    expect(ev.timingRule).toContain('출산');
    expect(ev.eventSeeds.every(s => !/\d{4}-\d{2}/.test(s.window))).toBe(true);
  });
});

describe('prompt — 줄글 사건 예보 + 블랙리스트', () => {
  it('금지 표현/축 규칙/관계 규칙/출력 schema 포함', () => {
    const p = buildEventForecastPrompt(buildPersonalEventForecastEvidence(personFixture()));
    expect(p.user).toMatch(/스트레칭|명상/); // 금지 목록에 등장
    expect(p.user).toMatch(/사건 축 표현 규칙/);
    expect(p.user).toContain('majorEvents');
    expect(p.user).toMatch(/관계 규칙/);
  });
  it('기혼 프롬프트는 새 연애 금지 명시', () => {
    const p = buildEventForecastPrompt(buildPersonalEventForecastEvidence(personFixture({ relationshipStatus: 'married' })));
    expect(p.user).toMatch(/새로운 연애 인연.*금지|새 사람과 깊어지는 관계 절대 금지/);
  });
});

describe('generateEventForecast — 파싱/안전/null', () => {
  const ev = buildPersonalEventForecastEvidence(personFixture());
  const valid = JSON.stringify({
    title: '앞으로 들어올 큰 변화', lead: '2027년에 일과 관계가 동시에 움직입니다.',
    eventNarrative: ['앞으로 3년은 책임이 커지는 흐름입니다.'],
    majorEvents: [
      { timeWindow: '2027년', title: '직장 환경이 바뀌는 구간', eventType: 'work_change', forecast: '맡는 역할과 평가 기준이 달라집니다.', scene: '새 프로젝트의 책임을 맡습니다.', signalBasis: '세운 정관 활성', decisionAdvice: '권한 없이 책임만 커지면 미루세요.' },
      { timeWindow: '2028년', title: '문서·계약 정리 구간', eventType: 'contract', forecast: '서류와 자격이 일을 살립니다.', scene: '계약서를 다시 씁니다.', signalBasis: '세운 정인 활성', decisionAdvice: '조건을 다시 따지세요.' },
    ],
    closing: '큰 흐름은 정리에서 갈립니다.',
  });
  it('유효 JSON → forecast, majorEvents 2~4 보존', async () => {
    const f = await generateEventForecast(ev, async () => valid);
    expect(f).toBeTruthy();
    expect(f!.mode).toBe('personal');
    expect(f!.majorEvents.length).toBe(2);
    expect(f!.majorEvents[0].eventType).toBe('work_change');
  });
  it('필러 스크럽: 블랙리스트 제거 + 한국어 깨짐 없음', async () => {
    const filler = JSON.stringify({
      title: 't', lead: '2026년 직장이 바뀌고 2028년 돈이 들어옵니다.',
      eventNarrative: ['새로운 인연이 생길 가능성이 높아집니다.'],
      majorEvents: [{ timeWindow: '2027년', title: '인연', eventType: 'relationship', forecast: '소통이 중요합니다.', scene: '작은 합의를 꾸준히 쌓아가는 모습.', signalBasis: 'w', decisionAdvice: '관계가 깊어질 가능성이 있습니다.' }],
      closing: '준비가 필요합니다.',
    });
    const f = await generateEventForecast(ev, async () => filler);
    const ser = JSON.stringify(f);
    expect(ser).not.toMatch(/가능성이 (있|높|큼)|중요합니다|필요합니다|작은 합의/);
    expect(ser).not.toContain('뚜렷하아'); // 활용형 깨짐 회귀 방지
  });
  it('lead/majorEvents 비면 null', async () => {
    const f = await generateEventForecast(ev, async () => JSON.stringify({ title: 't' }));
    expect(f).toBeNull();
  });
  it('throw → null', async () => {
    const f = await generateEventForecast(ev, async () => { throw new Error('t'); });
    expect(f).toBeNull();
  });
  it('투자/투자자 → 스크럽', async () => {
    const fin = JSON.stringify({ title: 'h', lead: '투자 기회가 열립니다.', eventNarrative: [], majorEvents: [{ timeWindow: '2028년', title: '돈', eventType: 'money', forecast: '투자나 새 사업', scene: '투자자와 협업', signalBasis: 'w', decisionAdvice: 'd' }], closing: '' });
    const f = await generateEventForecast(ev, async () => fin);
    expect(JSON.stringify(f)).not.toContain('투자');
  });
  it('기혼: 신규 연애 majorEvent 제거', async () => {
    const evMarried = buildPersonalEventForecastEvidence(personFixture({ relationshipStatus: 'married' }));
    const romance = JSON.stringify({ title: 'h', lead: '올해 흐름', eventNarrative: [], majorEvents: [
      { timeWindow: '2027년', title: '새로운 인연', eventType: 'relationship', forecast: '새 사람과 인연이 깊어집니다.', scene: '새로운 연애가 시작됩니다.', signalBasis: 'w', decisionAdvice: 'd' },
      { timeWindow: '2027년', title: '집안 결정', eventType: 'family_child', forecast: '가족 돈·역할이 움직입니다.', scene: '배우자와 집안 일정을 다시 짭니다.', signalBasis: 'w', decisionAdvice: 'd' },
    ], closing: '' });
    const f = await generateEventForecast(evMarried, async () => romance);
    expect(f!.majorEvents.every(m => !/새(로운)?\s*(인연|사람|연애)/.test(m.title + m.forecast + m.scene))).toBe(true);
    expect(f!.majorEvents.length).toBe(1); // 집안 결정만 남음
  });
  it('임산부: 출산/성별 majorEvent 제거', async () => {
    const pregEv = buildPregnancyEventForecastEvidence({ mother: personFixture(), elementComplement: {} } as any);
    const leaky = JSON.stringify({ title: 'h', lead: '엄마가 편안해지는 흐름', eventNarrative: [], majorEvents: [
      { timeWindow: '임신 기간', title: '출산 택일', eventType: 'family_child', forecast: '좋은 출산일을 잡으세요.', scene: '택일', signalBasis: 'w', decisionAdvice: 'd' },
      { timeWindow: '임신 기간', title: '가족 분담', eventType: 'family_child', forecast: '가족이 집안일을 나눕니다.', scene: '오늘은 내가 이걸 할게', signalBasis: 'w', decisionAdvice: 'd' },
    ], closing: '' }, );
    const f = await generateEventForecast(pregEv, async () => leaky, { disclaimer: '의료진을 따르세요.' });
    expect(f!.majorEvents.length).toBe(1);
    expect(JSON.stringify(f)).not.toMatch(/출산일|택일/);
  });
});
