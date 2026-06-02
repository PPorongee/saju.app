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
    userContext: { gender: over.gender ?? 'male', relationshipStatus: over.relationshipStatus ?? 'single', hasChildren: over.hasChildren ?? 'unknown', age: over.age, currentConcerns: over.currentConcerns },
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

describe('관심사 다중선택 + 나이대 반영', () => {
  it('관심사 없음 → concerns [], 그래도 대운/돈/직업 + 생애상태 섹션', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture({ relationshipStatus: 'married', hasChildren: true }));
    expect(ev.concerns).toEqual([]);
    expect(ev.sectionPlan.slice(0, 3)).toEqual(['운이 트이는 시기(대운)', '돈과 재물운', '일·사업·이직']);
    expect(ev.sectionPlan).toContain('배우자와 집안');
    expect(ev.sectionPlan).toContain('자녀와 가족');
  });
  it('관심사 1개(이사) → housing 섹션 포함', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture({ currentConcerns: ['이사 가고 싶어요'] }));
    expect(ev.concerns).toContain('housing_move');
    expect(ev.sectionPlan).toContain('이동수와 집·부동산');
  });
  it('관심사 4개(돈/이사/자녀/사업) merge+dedup, 각 축 반영, 6~8 섹션', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture({ relationshipStatus: 'married', hasChildren: true, currentConcerns: ['money', '부동산/이사', '아이 교육', '창업/사업'] }));
    expect(ev.concerns).toEqual(expect.arrayContaining(['money', 'housing_move', 'child_family', 'business']));
    expect(ev.sectionPlan).toContain('이동수와 집·부동산');
    expect(ev.sectionPlan).toContain('자녀와 가족');
    expect(ev.sectionPlan.length).toBeGreaterThanOrEqual(6);
    expect(ev.sectionPlan.length).toBeLessThanOrEqual(9); // Depth-Up V1: 7~9 허용
    expect(ev.sectionPlan.slice(0, 3)).toEqual(['운이 트이는 시기(대운)', '돈과 재물운', '일·사업·이직']);
  });
  it('Depth-Up: noble/document seed 추가 + 기혼+자녀는 housing 섹션 승격 + 40대 이전 재물 서사', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture({ relationshipStatus: 'married', hasChildren: true, age: 32 }));
    const types = ev.seeds.map(s => s.verdictType);
    expect(types).toContain('noble');
    expect(types).toContain('document');
    expect(ev.sectionPlan).toContain('이동수와 집·부동산'); // 기혼+자녀 → housingSignal
    const noble = ev.seeds.find(s => s.verdictType === 'noble');
    expect(noble!.allowedClaims.join(' ')).toMatch(/피해야 할 사람|새게 만든/);
    const doc = ev.seeds.find(s => s.verdictType === 'document');
    expect(doc!.allowedClaims.join(' ')).toMatch(/법률.*금지|계약서|정산/);
    const wealth = ev.seeds.find(s => s.verdictType === 'wealth');
    expect(wealth!.allowedClaims.join(' ')).toMatch(/40대 이후 자산화|판을 까는|굵어/);
  });
  it('나이대 계산: 만 32세 → 30대 초반', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture({ age: 32 }));
    expect(ev.currentAge).toBe(32);
    expect(ev.ageBand).toBe('30대 초반');
  });
  it('나이 없음 → ageBand 빈 문자열', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture());
    expect(ev.ageBand).toBe('');
  });
  it('프롬프트에 나이대 해석방향 + 관심사 반영 지시', () => {
    const ev = buildPersonalFortuneVerdictEvidence(personFixture({ age: 42, currentConcerns: ['투자', '부동산'] }));
    const p = buildFortuneVerdictPrompt(ev);
    expect(p.user).toMatch(/나이대/);
    expect(p.user).toMatch(/40대/);
    expect(p.user).toMatch(/관심사/);
    expect(p.user).toMatch(/섹션 플랜/);
  });
});

describe('prompt — 판정 + 안전 규칙', () => {
  it('SAFETY/GOLD/블랙리스트/관계 규칙/출력 schema 포함', () => {
    const p = buildFortuneVerdictPrompt(buildPersonalFortuneVerdictEvidence(personFixture()));
    expect(p.user).toMatch(/금지\(결과 보장/);
    expect(p.user).toMatch(/GOLD 예시/);
    expect(p.user).toContain('sections');
    expect(p.user).toMatch(/라벨 금지/); // Q./판정:/근거· 금지
    expect(p.user).toMatch(/관계 규칙/);
  });
  it('기혼 프롬프트는 새 연애 금지 명시', () => {
    const p = buildFortuneVerdictPrompt(buildPersonalFortuneVerdictEvidence(personFixture({ relationshipStatus: 'married', hasChildren: true })));
    expect(p.user).toMatch(/새 연애 인연 절대 금지/);
  });
});

describe('generate — 줄글 파싱/안전/null', () => {
  const ev = buildPersonalFortuneVerdictEvidence(personFixture());
  const valid = JSON.stringify({
    title: '사주가 말하는 당신의 큰 운',
    lead: '이 사주는 초반보다 시간이 붙을수록 커지는 축적형 사주입니다.',
    sections: [
      { title: '돈과 재물운', body: ['돈은 한 번에 터지기보다 직책·소유·고정수입으로 늦게 크게 쌓이는 구조입니다.', '40대 이후 돈의 구조가 잡히고, 변동성 큰 자금보다 형태가 남는 자산에서 운이 살아납니다.'] },
      { title: '이동수와 집', body: ['집과 가족의 조건 때문에 생활권을 한 번 옮기는 흐름이 있습니다.'] },
    ],
    timingSummary: '40대 이후가 진짜 확장기입니다.',
    closing: '축적형으로 가면 늦게 크게 됩니다.',
  });
  it('유효 JSON → sections 보존', async () => {
    const f = await generateFortuneVerdict(ev, async () => valid);
    expect(f).toBeTruthy();
    expect(f!.mode).toBe('personal');
    expect(f!.sections.length).toBe(2);
    expect(f!.sections[0].body.length).toBe(2);
    expect(f!.timingSummary).toContain('40대');
  });
  it('lead 없거나 섹션<2면 null', async () => {
    const f = await generateFortuneVerdict(ev, async () => JSON.stringify({ title: 't', lead: '', sections: [{ title: 'a', body: ['x'] }] }));
    expect(f).toBeNull();
  });
  it('throw → null', async () => {
    const f = await generateFortuneVerdict(ev, async () => { throw new Error('t'); });
    expect(f).toBeNull();
  });
  it('라벨(Q./판정:/근거·) + 필러 + 깨짐 제거', async () => {
    const dirty = JSON.stringify({
      title: 't', lead: '돈복이 큽니다.',
      sections: [
        { title: '돈', body: ['Q. 돈복이 있는가? 판정: 강함. 재물운은 강합니다. 소통이 중요합니다.', '근거 · 수익이 발생할 가능성이 큽니다.'] },
        { title: '일', body: ['이직은 가능성이 있습니다. 활용해보세요. 무리하지 마세요.', '확장은 신중하게 결정해야 합니다.'] },
      ],
      timingSummary: '', closing: '준비가 필요합니다.',
    });
    const f = await generateFortuneVerdict(ev, async () => dirty);
    const ser = JSON.stringify(f);
    expect(ser).not.toMatch(/Q\.|판정\s*[:：]|근거\s*[·:]/);
    expect(ser).not.toMatch(/중요합니다|필요합니다|무리하지 마세요|활용해보세요|가능성이 (있|큽|높)|신중하게 결정/);
    expect(ser).not.toContain('뚜렷하아');
    expect(f!.lead).toContain('돈복이 큽니다'); // 진짜 판정은 보존
  });
  it('punch-up: 노잼 표현 펀치 교체 + "관건입니다" 미출현', async () => {
    const bland = JSON.stringify({
      title: 't', lead: '돈복은 큽니다.',
      sections: [
        { title: '돈', body: ['큰 돈은 안정적으로 쌓이는 구조입니다.', '부동산이 유리합니다. 조율하는 것이 핵심입니다.'] },
        { title: '관계', body: ['역할 분담이 중요합니다.', '소통이 필요합니다.'] },
      ],
      timingSummary: '', closing: '전략적으로 준비한다면 좋습니다.',
    });
    const f = await generateFortuneVerdict(ev, async () => bland);
    const ser = JSON.stringify(f);
    expect(ser).not.toMatch(/안정적으로 쌓이는 구조입니다|유리합니다|관건입니다|조율하는 것이 핵심|전략적으로 준비한다면|중요합니다|필요합니다/);
  });
  it('기혼: 신규 연애 문단 제거', async () => {
    const evM = buildPersonalFortuneVerdictEvidence(personFixture({ relationshipStatus: 'married', hasChildren: true }));
    const romance = JSON.stringify({
      title: 't', lead: '집안 구조가 움직입니다.',
      sections: [
        { title: '관계와 가족', body: ['새로운 인연이 들어와 새 사람과 연애가 시작됩니다.', '배우자와 돈·역할을 다시 정하는 흐름입니다.'] },
        { title: '돈', body: ['축적형 재물운입니다.', '40대 이후 구조가 잡힙니다.'] },
      ],
      timingSummary: '', closing: 'c',
    });
    const f = await generateFortuneVerdict(evM, async () => romance);
    expect(JSON.stringify(f)).not.toMatch(/새(로운)?\s*(인연|사람|연애)/);
    // 배우자/돈 문단은 살아남음
    expect(JSON.stringify(f)).toMatch(/배우자와 돈/);
  });
  it('임산부: 성별/출산/수 예측 문단 제거', async () => {
    const evP = buildPregnancyFortuneVerdictEvidence({ mother: personFixture() } as any);
    const leaky = JSON.stringify({
      title: 't', lead: '자녀·가족운을 봅니다.',
      sections: [
        { title: '자녀운', body: ['딸일 가능성이 높고 아이가 2명으로 보입니다.', '자녀운은 가족 책임으로 번지는 그림입니다.'] },
        { title: '엄마 구조', body: ['엄마가 혼자 떠안기 쉬운 구조입니다.', '가족이 나눠 맡아야 하는 흐름입니다.'] },
      ],
      timingSummary: '', closing: 'c',
    });
    const f = await generateFortuneVerdict(evP, async () => leaky, { disclaimer: '의료진을 따르세요.' });
    expect(JSON.stringify(f)).not.toMatch(/딸|아들|성별|아이가 \d/);
    expect(f!.disclaimer).toContain('의료진');
  });
});
