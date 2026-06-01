// Fortune Questions Verdict V1 — 단위 테스트 (flag / evidence / prompt / generator).
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  isPersonalFortuneVerdictEnabled, isYearlyFortuneVerdictEnabled,
  isCompatFortuneVerdictEnabled, isPregnancyFortuneVerdictEnabled,
} from '../fortuneVerdictFlag';
import {
  buildPersonalFortuneVerdictEvidence, buildYearlyFortuneVerdictEvidence,
  buildCompatFortuneVerdictEvidence, buildPregnancyFortuneVerdictEvidence,
} from '../fortuneVerdictEvidence';
import { buildFortuneVerdictPrompt } from '../fortuneVerdictPromptBuilder';
import { generateFortuneVerdict } from '../generateFortuneVerdict';

function personFixture(over: any = {}): any {
  return {
    userContext: { gender: over.gender ?? 'male', relationshipStatus: over.relationshipStatus ?? 'single', hasChildren: over.hasChildren ?? 'unknown' },
    coreAnalysis: {
      usefulGod: { primaryUseful: { type: 'element', value: 'water' }, favorable: over.favorable ?? ['정재'], unfavorable: ['편관'] },
      dayMasterStrength: { level: over.dm ?? 'strong' },
      elementStrength: { strongest: ['water'], weakest: ['fire'] },
      tenGods: {
        totals: over.totals ?? { 정재: 2, 편재: 2, 식신: 2, 상관: 1, 정관: 1, 편관: 1, 정인: 1, 편인: 0, 비견: 1, 겁재: 1 },
        visible: over.visible ?? [{ position: 'hourBranch', tenGod: '정재' }, { position: 'monthStem', tenGod: '정관' }],
        hidden: [],
      },
      specialStars: over.specialStars ?? [{ name: '역마', positions: ['일지'] }],
    },
    fortune: { currentDaewoon: { pillar: '갑신', ageRange: '38~47', theme: '재성 대운' }, nextThreeYears: [{ year: 2028, pillar: '무신', theme: '확장', activatedTenGods: ['편재', '식신'], opportunities: ['수익 구조'], risks: [] }] },
    yongsinDiagnostic: { currentFinalYongsin: { primary: 'water', unfavorable: 'fire' }, drainCandidate: null, controlCandidate: null },
  };
}

describe('flag — 기본 OFF', () => {
  const keys = ['SAJU_FORTUNE_VERDICT_ENABLED', 'SAJU_PERSONAL_FORTUNE_VERDICT_ENABLED', 'SAJU_YEARLY_FORTUNE_VERDICT_ENABLED', 'SAJU_COMPAT_FORTUNE_VERDICT_ENABLED', 'SAJU_PREGNANCY_FORTUNE_VERDICT_ENABLED'];
  beforeEach(() => keys.forEach(k => { delete process.env[k]; }));
  afterEach(() => keys.forEach(k => { delete process.env[k]; }));
  it('미설정이면 모두 OFF', () => {
    expect(isPersonalFortuneVerdictEnabled()).toBe(false);
    expect(isYearlyFortuneVerdictEnabled()).toBe(false);
    expect(isCompatFortuneVerdictEnabled()).toBe(false);
    expect(isPregnancyFortuneVerdictEnabled()).toBe(false);
  });
  it('master=true면 모두 ON', () => {
    process.env.SAJU_FORTUNE_VERDICT_ENABLED = 'true';
    expect(isPersonalFortuneVerdictEnabled()).toBe(true);
    expect(isPregnancyFortuneVerdictEnabled()).toBe(true);
  });
});

describe('evidence — 큰 질문 판정 씨앗', () => {
  it('개인: 재물/횡재/투자성향/직장/이직/사업/이동/부동산/관계/자녀 축 + 영문 enum 미노출', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture());
    const types = ev.seeds.map(s => s.verdictType);
    for (const t of ['wealth', 'windfall', 'wealth_style', 'career_job', 'job_change', 'business', 'move', 'real_estate', 'child']) expect(types).toContain(t);
    expect(JSON.stringify(ev)).not.toMatch(/wood|fire|water|metal|earth|정재"|편재"/); // 생활 언어 번역(키 노출 X). (정재 etc.는 basis 번역됨)
    expect(ev.breakthroughLines.length).toBeGreaterThan(0);
  });
  it('개인 미혼: relationship 판정 / 기혼: family_spouse(새 인연 아님) + 자녀운 유지', () => {
    const single = buildPersonalFortuneVerdictEvidence(personFixture({ relationshipStatus: 'single', gender: 'female' }));
    expect(single.seeds.some(s => s.verdictType === 'relationship')).toBe(true);
    const married = buildPersonalFortuneVerdictEvidence(personFixture({ relationshipStatus: 'married', hasChildren: true }));
    expect(married.seeds.some(s => s.verdictType === 'relationship')).toBe(false);
    expect(married.seeds.some(s => s.verdictType === 'family_spouse')).toBe(true);
    expect(married.seeds.some(s => s.verdictType === 'child')).toBe(true);
    expect(married.relationshipStatus).toBe('married');
    expect(married.hasChildren).toBe(true);
  });
  it('개인: 역마 없으면 이동수 not_prominent', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture({ specialStars: [] }));
    const move = ev.seeds.find(s => s.verdictType === 'move');
    expect(move!.strength).toBe('not_prominent');
  });
  it('개인: 자녀 seed는 숫자/출산 단정 금지 명시', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture());
    const child = ev.seeds.find(s => s.verdictType === 'child');
    expect(child!.allowedClaims.join(' ')).toMatch(/확정.*금지|예측.*금지/);
  });
  it('올해: 올해 큰 결론 seeds', () => {
    const analysis: any = { carriedOver: { usefulGod: { primaryUseful: { type: 'element', value: 'metal' } } }, yearElementEffect: { label: '토 기운 — 용신 결' }, remainingMonthlyFortunes: [{ activatedTopics: ['돈', '계약'] }, { activatedTopics: ['일'] }] };
    const ev = buildYearlyFortuneVerdictEvidence(analysis, 'single', 'unknown');
    expect(ev.seeds.some(s => s.verdictType === 'wealth')).toBe(true);
    expect(ev.seeds.some(s => s.verdictType === 'job_change')).toBe(true);
  });
  it('궁합: A/B 결 + 용신-attribution 미포함', () => {
    const bundle: any = { elementComplement: { aNeedsFromB: ['fire'], bNeedsFromA: ['water'] }, dayMasterRelation: { description: '북돋움' }, relationshipChoices: { harmfulChoices: [{ title: '거리 조절 실패' }] } };
    const ev = buildCompatFortuneVerdictEvidence(bundle, personFixture(), personFixture(), 'dating');
    expect(ev.partner!.aLines.length).toBeGreaterThan(0);
    expect(ev.timingRule).toMatch(/용신/);
  });
  it('임산부: 출산/성별/수 예측 금지 규칙', () => {
    const ev = buildPregnancyFortuneVerdictEvidence({ mother: personFixture() } as any);
    expect(ev.timingRule).toMatch(/출산.*금지|성별/);
    expect(ev.seeds.some(s => s.verdictType === 'child')).toBe(true);
  });
});

describe('prompt — 판정 + 안전 규칙', () => {
  it('SAFETY/GOLD/블랙리스트/관계 규칙/출력 schema 포함', () => {
    const p = buildFortuneVerdictPrompt(buildPersonalFortuneVerdictEvidence(personFixture()));
    expect(p.user).toMatch(/금지\(결과 보장/);
    expect(p.user).toMatch(/GOLD 판정 예시/);
    expect(p.user).toContain('verdicts');
    expect(p.user).toMatch(/관계 규칙/);
  });
  it('기혼 프롬프트는 새 연애 금지 명시', () => {
    const p = buildFortuneVerdictPrompt(buildPersonalFortuneVerdictEvidence(personFixture({ relationshipStatus: 'married', hasChildren: true })));
    expect(p.user).toMatch(/새 연애 인연 절대 금지/);
  });
});

describe('generate — 파싱/안전/null', () => {
  const ev = buildPersonalFortuneVerdictEvidence(personFixture());
  const valid = JSON.stringify({
    title: '인생 큰 질문 판정서', lead: '이 사주는 횡재형이 아니라 축적형 재물운입니다.',
    verdicts: [
      { question: '돈복이 있는가?', verdict: '돈은 한 번에 터지기보다 직책·소유·고정수입으로 늦게 크게 쌓이는 구조입니다.', strength: 'moderate', timing: '40대 이후', basis: '성실·고정형 돈 기운', whatItLooksLike: '전문성이 보상으로 바뀜', caution: '단타성 투자는 맞지 않음' },
      { question: '이동수가 있는가?', verdict: '집·근무지·생활권 중 하나를 현실적으로 바꾸는 이동수입니다.', strength: 'moderate', timing: '현재 대운', basis: '이동·변화의 결', whatItLooksLike: '근무지 이동', caution: '' },
    ],
    breakthroughTiming: { summary: '40대 이후 축적이 돈으로', accumulationPhase: '30대', expansionPhase: '40대', cautionPhase: '' },
    closing: '축적형으로 가면 늦게 크게 됩니다.',
  });
  it('유효 JSON → verdicts 보존', async () => {
    const f = await generateFortuneVerdict(ev, async () => valid);
    expect(f).toBeTruthy();
    expect(f!.mode).toBe('personal');
    expect(f!.verdicts.length).toBe(2);
    expect(f!.breakthroughTiming.expansionPhase).toBe('40대');
  });
  it('lead/verdicts<2면 null', async () => {
    const f = await generateFortuneVerdict(ev, async () => JSON.stringify({ title: 't', lead: 'x', verdicts: [{ question: 'q', verdict: 'v', strength: 'weak' }] }));
    expect(f).toBeNull();
  });
  it('throw → null', async () => {
    const f = await generateFortuneVerdict(ev, async () => { throw new Error('t'); });
    expect(f).toBeNull();
  });
  it('필러/블랙리스트 제거 + 한국어 깨짐 없음', async () => {
    const filler = JSON.stringify({ title: 't', lead: '돈복이 큽니다.', verdicts: [
      { question: '돈복?', verdict: '재물운은 강합니다. 소통이 중요합니다.', strength: 'strong', timing: '', basis: '수익이 발생할 가능성이 큽니다', whatItLooksLike: '활용해보세요', caution: '무리하지 마세요' },
      { question: '이직?', verdict: '이직은 가능성이 있습니다.', strength: 'moderate', timing: '', basis: 'x', whatItLooksLike: 'y', caution: '' },
    ], breakthroughTiming: { summary: 's' }, closing: '준비가 필요합니다.' });
    const f = await generateFortuneVerdict(ev, async () => filler);
    const ser = JSON.stringify(f);
    expect(ser).not.toMatch(/중요합니다|필요합니다|무리하지 마세요|활용해보세요|가능성이 (있|큽|높)/);
    expect(ser).not.toContain('뚜렷하아');
    expect(f!.lead).toContain('돈복이 큽니다'); // 진짜 판정("돈복이 큽니다")은 보존(가능성이 큽니다만 제거)
  });
  it('기혼: 신규 연애 verdict 제거', async () => {
    const evM = buildPersonalFortuneVerdictEvidence(personFixture({ relationshipStatus: 'married', hasChildren: true }));
    const romance = JSON.stringify({ title: 't', lead: '판정', verdicts: [
      { question: '인연운?', verdict: '새로운 인연이 들어옵니다.', strength: 'strong', timing: '', basis: 'x', whatItLooksLike: '새 사람과 연애', caution: '' },
      { question: '집안운?', verdict: '배우자와 돈·역할을 다시 정합니다.', strength: 'moderate', timing: '', basis: 'x', whatItLooksLike: 'y', caution: '' },
      { question: '재물운?', verdict: '축적형입니다.', strength: 'moderate', timing: '', basis: 'x', whatItLooksLike: 'y', caution: '' },
    ], breakthroughTiming: { summary: 's' }, closing: 'c' });
    const f = await generateFortuneVerdict(evM, async () => romance);
    expect(f!.verdicts.every(v => !/새(로운)?\s*(인연|사람|연애)/.test(v.verdict + v.whatItLooksLike))).toBe(true);
  });
  it('임산부: 성별/출산/수 예측 verdict 제거', async () => {
    const evP = buildPregnancyFortuneVerdictEvidence({ mother: personFixture() } as any);
    const leaky = JSON.stringify({ title: 't', lead: '자녀운 판정', verdicts: [
      { question: '자녀운?', verdict: '딸일 가능성이 높습니다.', strength: 'strong', timing: '', basis: 'x', whatItLooksLike: '아이가 2명', caution: '' },
      { question: '가족운?', verdict: '가족 분담이 핵심입니다.', strength: 'moderate', timing: '', basis: 'x', whatItLooksLike: '가족이 나눔', caution: '' },
      { question: '엄마 구조?', verdict: '혼자 떠안기 쉽습니다.', strength: 'moderate', timing: '', basis: 'x', whatItLooksLike: 'y', caution: '' },
    ], breakthroughTiming: { summary: 's' }, closing: 'c' });
    const f = await generateFortuneVerdict(evP, async () => leaky, { disclaimer: '의료진을 따르세요.' });
    expect(JSON.stringify(f)).not.toMatch(/딸|아들|성별|아이가 \d/);
  });
});
