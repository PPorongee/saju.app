// All-mode Action Guide V1 — 단위 테스트 (flag / evidence / prompt / generator).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isPersonalActionGuideEnabled, isYearlyActionGuideEnabled,
  isCompatActionGuideEnabled, isPregnancyActionGuideEnabled,
} from '../actionGuideFlag';
import {
  buildPersonalActionGuideEvidence, buildYearlyActionGuideEvidence,
  buildCompatActionGuideEvidence, buildPregnancyActionGuideEvidence,
} from '../actionGuideEvidence';
import { buildActionGuidePrompt } from '../actionGuidePromptBuilder';
import { generateActionGuide } from '../generateActionGuide';

// ── 픽스처 (evidence 빌더가 읽는 필드만 최소 구성, 타입은 캐스팅) ──
const personGpt: any = {
  coreAnalysis: {
    usefulGod: {
      primaryUseful: { type: 'element', value: 'water' },
      favorable: ['fire'],
      unfavorable: ['earth'],
    },
    dayMasterStrength: { level: 'weak' },
    elementStrength: { strongest: ['water'], weakest: ['fire'], climate: { comment: '약간 차가운 편' } },
    tenGods: { totals: { 정재: 2, 편재: 1, 식신: 2, 상관: 0, 정관: 1, 편관: 0, 정인: 3, 편인: 0, 비견: 2, 겁재: 1 } },
  },
  fortune: {
    currentDaewoon: { pillar: '갑신', ageRange: '30~39', theme: '편관 대운' },
    nextThreeYears: [{ year: 2026, theme: '확장의 해', opportunities: ['협업'] }],
  },
  // 실제 타입은 { years: [...] } 객체 (배열 아님).
  futureTimingAnalysis: { years: [{ year: 2027, headline: '도약', bestActions: ['정리', '제안'] }] },
  specialPoints: [{ title: '천을귀인 도움' }],
  yongsinDiagnostic: {
    currentFinalYongsin: { primary: 'water', unfavorable: 'fire' },
    drainCandidate: { element: 'wood', rationale: '인성 과다를 풀어내는 결' },
    controlCandidate: null,
  },
};

describe('actionGuideFlag — 기본 OFF, env=true일 때만 ON', () => {
  const keys = [
    'SAJU_ACTION_GUIDE_ENABLED',
    'SAJU_PERSONAL_ACTION_GUIDE_ENABLED', 'SAJU_YEARLY_ACTION_GUIDE_ENABLED',
    'SAJU_COMPAT_ACTION_GUIDE_ENABLED', 'SAJU_PREGNANCY_ACTION_GUIDE_ENABLED',
  ];
  beforeEach(() => keys.forEach(k => { delete process.env[k]; }));
  afterEach(() => keys.forEach(k => { delete process.env[k]; }));

  it('미설정이면 4개 모드 모두 OFF', () => {
    expect(isPersonalActionGuideEnabled()).toBe(false);
    expect(isYearlyActionGuideEnabled()).toBe(false);
    expect(isCompatActionGuideEnabled()).toBe(false);
    expect(isPregnancyActionGuideEnabled()).toBe(false);
  });
  it('master=true면 4개 모드 모두 ON', () => {
    process.env.SAJU_ACTION_GUIDE_ENABLED = 'true';
    expect(isPersonalActionGuideEnabled()).toBe(true);
    expect(isYearlyActionGuideEnabled()).toBe(true);
    expect(isCompatActionGuideEnabled()).toBe(true);
    expect(isPregnancyActionGuideEnabled()).toBe(true);
  });
  it('per-mode flag는 해당 모드만 ON', () => {
    process.env.SAJU_YEARLY_ACTION_GUIDE_ENABLED = 'true';
    expect(isYearlyActionGuideEnabled()).toBe(true);
    expect(isPersonalActionGuideEnabled()).toBe(false);
  });
  it("'true' 문자열만 ON ('1'/'on'은 OFF)", () => {
    process.env.SAJU_ACTION_GUIDE_ENABLED = '1';
    expect(isPersonalActionGuideEnabled()).toBe(false);
    process.env.SAJU_ACTION_GUIDE_ENABLED = 'on';
    expect(isPersonalActionGuideEnabled()).toBe(false);
  });
});

describe('evidence — 한글 변환 + 시기 해상도', () => {
  it('개인: 용신/오행 한글화, 영문 오행 key 미노출, 시기=year', () => {
    const ev = buildPersonalActionGuideEvidence(personGpt);
    const joined = ev.coreLines.join(' ');
    expect(joined).toContain('수');   // water → 수
    expect(joined).toContain('화');   // fire → 화
    expect(joined).not.toMatch(/water|fire|earth|metal|wood/);
    expect(ev.timing.granularity).toBe('year');
    expect(ev.timing.lines.length).toBeGreaterThan(0);
  });
  it('개인: futureTimingAnalysis는 {years:[]} 객체에서 읽어 시기 라인에 반영 (배열 오인 버그 회귀 방지)', () => {
    const ev = buildPersonalActionGuideEvidence(personGpt);
    expect(ev.timing.lines.some(l => l.includes('2027'))).toBe(true);
  });
  it('개인: 돈/커리어/관계/공부/컨디션 영역 근거 시드가 십성에서 생성된다', () => {
    const ev = buildPersonalActionGuideEvidence(personGpt);
    const domains = ev.domainSeeds.map(d => d.domain);
    expect(domains).toContain('돈/수입·소비');
    expect(domains).toContain('커리어/일');
    expect(domains).toContain('관계');
    // 재성 합 3 → "강한 편"
    const money = ev.domainSeeds.find(d => d.domain === '돈/수입·소비');
    expect(money!.lines.join(' ')).toContain('강한 편');
  });
  it('개인: yongsinDiagnostic 있으면 보조 운용 후보 라인 + "주 용신 유지" 명시', () => {
    const ev = buildPersonalActionGuideEvidence(personGpt);
    const aux = ev.auxiliaryLines.join(' ');
    expect(aux).toContain('주 용신');
    expect(aux).toContain('보조');
    expect(aux).not.toMatch(/water|wood/); // 한글화
  });
  it('올해: 절기 월운 있으면 timing=month, 월 라인 생성', () => {
    const analysis: any = {
      carriedOver: { usefulGod: { primaryUseful: { type: 'element', value: 'metal' }, favorable: ['earth'], unfavorable: ['fire'] }, dayMasterStrength: { level: 'strong' } },
      yearElementEffect: { label: '토 기운 — 용신 결', adviceHint: { actionable: '맡은 범위를 명확히' } },
      strengthImpact: { natalStrength: '신강', yearlyEffect: 'mixed', plainMeaning: '추진력은 좋되 분산 주의', adviceHint: { actionable: '핵심 1개에 집중' } },
      activatedTopics: [{ topic: '일', adviceHint: '책임 범위를 먼저 정한다' }],
      remainingMonthlyFortunes: [
        { monthLabel: '6월 흐름', periodLabel: '2026-06-05 ~ 2026-07-06', keyword: '정리', goodChoice: '범위 확정', caution: '과로 주의', usefulGodEffect: 'helpful' },
      ],
      nextTwoYears: [{ year: 2027, keyword: '확장', opportunity: '제휴', caution: '과확장' }],
    };
    const ev = buildYearlyActionGuideEvidence(analysis);
    expect(ev.timing.granularity).toBe('month');
    expect(ev.timing.lines.some(l => l.includes('6월'))).toBe(true);
    expect(ev.coreLines.join(' ')).not.toMatch(/metal|earth|fire/);
  });
  it('궁합: A/B 개인 근거 분리 + 관계 라인, 시기는 month 미만', () => {
    const bundle: any = {
      elementComplement: { aNeedsFromB: ['fire'], bNeedsFromA: ['water'], mutualComplement: 'moderate' },
      dayMasterRelation: { description: '서로 북돋우는 결' },
      usefulGodInteraction: { interpretation: '기운이 자연스럽게 오감' },
      relationshipChoices: { helpfulChoices: [{ title: '대화 시간', practicalAction: '주 1회 점검 대화' }] },
      futureFlow: [{ year: 2026, theme: '안정', advice: '속도 맞추기' }],
    };
    const ev = buildCompatActionGuideEvidence(bundle, personGpt, personGpt);
    expect(ev.partner).toBeTruthy();
    expect(ev.partner!.aLines.length).toBeGreaterThan(0);
    expect(ev.partner!.bLines.length).toBeGreaterThan(0);
    expect(ev.coreLines.join(' ')).not.toMatch(/water|fire/);
    expect(ev.timing.granularity).not.toBe('month');
  });
  it('임산부: 시기 데이터 없음(none) + 출산/날짜 금지 규칙 명시', () => {
    const bundle: any = { mother: personGpt, elementComplement: { motherNeedsFromBaby: ['fire'] } };
    const ev = buildPregnancyActionGuideEvidence(bundle);
    expect(ev.timing.granularity).toBe('none');
    expect(ev.timing.lines).toHaveLength(0);
    expect(ev.timing.rule).toContain('출산');
    expect(ev.coreLines.length).toBeGreaterThan(0);
  });
});

describe('prompt — 안전 규칙 + 모드별 구조', () => {
  it('공통 안전 규칙 + 없는 시기 금지가 항상 포함', () => {
    const ev = buildPersonalActionGuideEvidence(personGpt);
    const p = buildActionGuidePrompt(ev);
    expect(p.user).toContain('안전 규칙');
    expect(p.user).toContain('계산 evidence');
    expect(p.user).toMatch(/없는 시기|만들지/);
    expect(p.system).toContain('JSON');
  });
  it('임산부 프롬프트는 출산/의료 단정 금지를 강제', () => {
    const bundle: any = { mother: personGpt, elementComplement: {} };
    const p = buildActionGuidePrompt(buildPregnancyActionGuideEvidence(bundle));
    expect(p.user).toContain('출산');
    expect(p.user).toMatch(/의료/);
  });
  it('궁합 프롬프트는 상대를 용신/기신으로 단정 금지를 명시', () => {
    const bundle: any = { elementComplement: {}, dayMasterRelation: {}, usefulGodInteraction: {}, relationshipChoices: {}, futureFlow: [] };
    const p = buildActionGuidePrompt(buildCompatActionGuideEvidence(bundle, personGpt, personGpt));
    expect(p.user).toMatch(/상대가 당신의 용신/);
  });
});

describe('generateActionGuide — 파싱/안전/null 처리', () => {
  const ev = buildPersonalActionGuideEvidence(personGpt);
  const validJson = JSON.stringify({
    title: '지금 운을 쓰는 법',
    overview: '전반적으로 정리와 집중이 어울리는 흐름입니다.',
    domainFlows: [{ domain: '커리어/일', flow: 'x', opportunity: 'y', caution: 'z', suggestedAction: 'w' }],
    decisionGuide: { goodFor: ['a'], beCarefulWith: ['b'], postponeOrScaleDown: ['c'], checklist: ['d'] },
    remedyRoutines: { daily: ['10분 정리'], weekly: ['주간 회고'], avoidPatterns: ['과부하'] },
    immediateActions: ['1', '2', '3', '4', '5'],
  });

  it('유효 JSON → ActionGuide 반환, mode 코드가 세팅', async () => {
    const guide = await generateActionGuide(ev, async () => validJson);
    expect(guide).toBeTruthy();
    expect(guide!.mode).toBe('personal');
    expect(guide!.overview).toContain('정리');
    expect(guide!.immediateActions).toHaveLength(5);
    expect(guide!.domainFlows!.length).toBe(1);
  });
  it('overview/immediateActions 비면 null (부착 안 함)', async () => {
    const guide = await generateActionGuide(ev, async () => JSON.stringify({ title: 't' }));
    expect(guide).toBeNull();
  });
  it('호출이 throw하면 null (메인 리포트 무영향)', async () => {
    const guide = await generateActionGuide(ev, async () => { throw new Error('timeout'); });
    expect(guide).toBeNull();
  });
  it('파싱 불가 응답이면 null', async () => {
    const guide = await generateActionGuide(ev, async () => '죄송합니다 JSON이 아닙니다');
    expect(guide).toBeNull();
  });
  it('sanitize가 모든 문자열 필드에 적용된다', async () => {
    const guide = await generateActionGuide(
      ev, async () => validJson,
      { sanitize: (t) => t.replace('정리', '정돈') },
    );
    expect(guide!.overview).toContain('정돈');
    expect(guide!.overview).not.toContain('정리');
  });
  it('disclaimer 옵션이 그대로 부착된다', async () => {
    const guide = await generateActionGuide(ev, async () => validJson, { disclaimer: '의료 판단은 의료진을 따르세요.' });
    expect(guide!.disclaimer).toContain('의료진');
  });
  it('공통 안전 스크럽: 단정 미래 표현이 출력에서 완화된다', async () => {
    const risky = JSON.stringify({
      overview: '올해는 반드시 이직합니다.',
      immediateActions: ['행동1'],
    });
    const guide = await generateActionGuide(ev, async () => risky);
    expect(guide).toBeTruthy();
    expect(guide!.overview).not.toContain('반드시');
  });
  it('임산부: 출산 시기/택일 결이 남으면 통째 폐기(null)', async () => {
    const pregEv = buildPregnancyActionGuideEvidence({ mother: personGpt, elementComplement: {} } as any);
    const leaky = JSON.stringify({
      overview: '엄마가 편안해지는 흐름입니다.',
      immediateActions: ['좋은 택일을 잡으세요', '편히 쉬기'],
    });
    const guide = await generateActionGuide(pregEv, async () => leaky, { disclaimer: '의료진을 따르세요.' });
    expect(guide).toBeNull();
  });
});
