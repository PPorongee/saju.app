// narrative pipeline 회귀 테스트 (2026-05 stabilize).
//
// 정책 (절대):
//   - 이 파일에서는 실제 GPT/OpenAI API를 호출하지 않는다.
//   - 모든 검증은 deterministic 함수(calculateAnalysisOnly + buildNarrativePlans +
//     parseNarrativeReport + validateNarrativeReport)와 hand-crafted markdown으로만.
//   - 실제 GPT 호출이 필요한 회귀는 scripts/verify-narrative-fixtures.mjs
//     (RUN_LLM_INTEGRATION_TESTS=true 일 때만 실행)에서 별도로 수행.
//
// 이 파일이 검증하는 것:
//   - 3명 fixture(서로 다른 사주) → 서로 다른 starArchetype
//   - plan.mustUseFacts 중 dayMaster fact의 plainMeaning이 dictionary와 일치
//   - parser가 8섹션(futureFlow 옵션) 헤더 자동 감지
//   - validator가 cross-leak/future-leak/english-key/final-missing high를 잡음

import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { buildNarrativePlans } from '../narrative/narrativePlanBuilder';
import { buildStarKeywordCard } from '../star/starKeywordCardBuilder';
import { parseNarrativeReport } from '@/lib/saju-v4-narrative-parser';
import { validateNarrativeReport } from '../narrative/narrativeReportValidator';
import { buildSectionPrompt } from '../narrative/narrativePromptBuilder';
import { sanitizeNarrativeText, stripFutureLeaks, applyFinalSanitizers } from '../narrative/narrativeSanitizer';
import { buildContextGuard } from '../report/contextGuard';
import { normalizeBirthInput } from '../calendar/normalizeBirthInput';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const NOW = new Date('2026-05-24T00:00:00Z');

const FIXTURES: Array<{ name: string; input: BirthInput }> = [
  {
    name: 'A',
    input: {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTime: '12:00',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    },
  },
  {
    name: 'B',
    input: {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1988-03-15',
      birthTime: '03:30',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    },
  },
  {
    name: 'C',
    input: {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '2001-11-22',
      birthTime: '20:45',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    },
  },
];

describe('narrative pipeline — 3명 fixture deterministic 회귀', () => {
  const computed = FIXTURES.map(f => {
    const gptInput = calculateAnalysisOnly(f.input, NOW);
    const plans = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false });
    const card = buildStarKeywordCard(gptInput);
    return { name: f.name, gptInput, plans, card };
  });

  it('세 fixture가 모두 정상적으로 분석 결과를 생성한다', () => {
    for (const c of computed) {
      expect(c.gptInput.birthChart.dayMaster).toBeTruthy();
      expect(c.plans.length).toBe(7); // includeFutureFlow=false
      expect(c.card.displayTitle).toMatch(/별$/); // "~~~한 별"
    }
  });

  it('세 fixture가 서로 다른 starArchetype을 받는다 (deterministic)', () => {
    const ids = computed.map(c => c.card.archetype.id);
    const unique = new Set(ids);
    // 모두 같은 archetype이 나오면 selector가 너무 단조롭다는 신호
    expect(unique.size).toBeGreaterThanOrEqual(2);
    // 같은 fixture로 다시 빌드해도 같은 archetype (deterministic 재현)
    for (const f of FIXTURES) {
      const c1 = buildStarKeywordCard(calculateAnalysisOnly(f.input, NOW));
      const c2 = buildStarKeywordCard(calculateAnalysisOnly(f.input, NOW));
      expect(c1.archetype.id).toBe(c2.archetype.id);
    }
  });

  it('plan의 dayMaster fact가 dictionary의 plainMeaning을 그대로 사용한다', () => {
    for (const c of computed) {
      const lifeStructure = c.plans.find(p => p.sectionId === 'lifeStructureNarrative');
      expect(lifeStructure).toBeTruthy();
      const dmFact = lifeStructure!.mustUseFacts.find(f => f.id === 'dayMaster-structure');
      expect(dmFact).toBeTruthy();
      // plainMeaning이 비어 있거나 placeholder가 아닌지
      expect(dmFact!.plainMeaning).not.toBe('');
      expect(dmFact!.plainMeaning).not.toMatch(/<.+>/);
      // 같은 plainMeaning을 다른 일간이 공유하지 않는지 (3명 일간 다르면 plainMeaning도 보통 다름)
    }
    const plainMeanings = computed.map(c => {
      const ls = c.plans.find(p => p.sectionId === 'lifeStructureNarrative');
      const dm = ls!.mustUseFacts.find(f => f.id === 'dayMaster-structure');
      return dm!.plainMeaning;
    });
    const uniquePM = new Set(plainMeanings);
    // 3명 중 최소 2명은 서로 다른 일간 plainMeaning을 가짐
    expect(uniquePM.size).toBeGreaterThanOrEqual(2);
  });

  it('plans는 includeFutureFlow=false면 7개, true면 8개', () => {
    for (const f of FIXTURES) {
      const gptInput = calculateAnalysisOnly(f.input, NOW);
      const without = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false });
      const withFuture = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: true });
      expect(without.length).toBe(7);
      expect(withFuture.length).toBe(8);
      // 마지막은 항상 finalStrategy
      expect(without[without.length - 1].sectionId).toBe('finalStrategyNarrative');
      expect(withFuture[withFuture.length - 1].sectionId).toBe('finalStrategyNarrative');
      // 옵션 모드에서 futureFlow가 끝에서 2번째
      expect(withFuture[withFuture.length - 2].sectionId).toBe('futureFlowNarrative');
    }
  });
});

describe('parser — 8섹션(옵션 미래) 자동 감지', () => {
  it('# 1 ~ # 7만 있으면 # 7 = finalStrategy', () => {
    const md = `# 1. opening\nA\n\n# 2. life\nB\n\n# 3. repeated\nC\n\n# 4. career\nD\n\n# 5. money\nE\n\n# 6. relation\nF\n\n# 7. final\nG`;
    const r = parseNarrativeReport(md);
    expect(r.openingDefinition).toContain('A');
    expect(r.lifeStructureNarrative).toContain('B');
    expect(r.repeatedPatternNarrative).toContain('C');
    expect(r.careerTalentNarrative).toContain('D');
    expect(r.moneyMonetizationNarrative).toContain('E');
    expect(r.relationshipLoveNarrative).toContain('F');
    expect(r.finalStrategyNarrative).toContain('G');
    expect(r.futureFlowNarrative).toBeUndefined();
  });

  it('# 1 ~ # 8이 있으면 # 7 = future, # 8 = final', () => {
    const md = `# 1. opening\nA\n\n# 2. life\nB\n\n# 3. repeated\nC\n\n# 4. career\nD\n\n# 5. money\nE\n\n# 6. relation\nF\n\n# 7. 앞으로 3년\n### 2026\nY26 body\n### 2027\nY27 body\n### 2028\nY28 body\n\n# 8. 결국\nFINAL`;
    const r = parseNarrativeReport(md);
    expect(r.finalStrategyNarrative).toContain('FINAL');
    expect(r.futureFlowNarrative).toBeTruthy();
    expect(r.futureFlowNarrative!.years.length).toBe(3);
    expect(r.futureFlowNarrative!.years.map(y => y.year)).toEqual([2026, 2027, 2028]);
  });
});

describe('validator — cross-leak / future-leak / final-missing / english-key high severity', () => {
  const ref = computed_ref();

  it('moneyMonetization 본문에 결론조 침범 시 cross-section-leak high', () => {
    const md = buildMd({
      money: '돈은 작은 단위로 검증하는 게 좋습니다. 결국 이 사주는 ... ',
    });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const leak = r.issues.find(i => i.type === 'cross-section-leak' && i.sectionId === 'moneyMonetizationNarrative');
    expect(leak).toBeTruthy();
    expect(leak!.severity).toBe('high');
    expect(r.isValid).toBe(false);
  });

  it('relationshipLove 본문에 결론조 침범 시 cross-section-leak high', () => {
    const md = buildMd({
      relation: '관계에서는 행동의 일관성을 봅니다. 이 사주를 어떻게 써야 하는지 정리하면 ...',
    });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const leak = r.issues.find(i => i.type === 'cross-section-leak' && i.sectionId === 'relationshipLoveNarrative');
    expect(leak).toBeTruthy();
    expect(leak!.severity).toBe('high');
  });

  it('future-leak: plan에 futureFlow 없는데 본문에 "2026년" 등장 시 high', () => {
    const md = buildMd({
      career: '이 사주는 2026년에 큰 흐름이 ...',
    });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const leak = r.issues.find(i => i.type === 'future-leak');
    expect(leak).toBeTruthy();
    expect(leak!.severity).toBe('high');
  });

  it('english-element-key-leak: 본문에 "earth 기운" 등장 시 high', () => {
    const md = buildMd({ career: '이 사주는 earth 기운이 강합니다.' });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const leak = r.issues.find(i => i.type === 'english-element-key-leak');
    expect(leak).toBeTruthy();
    expect(leak!.severity).toBe('high');
  });

  it('final-section-missing: 결론 본문이 짧으면 high', () => {
    const md = buildMd({ final: '결론.' }); // 50자 미만
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const miss = r.issues.find(i => i.type === 'final-section-missing');
    expect(miss).toBeTruthy();
    expect(miss!.severity).toBe('high');
  });
});

// ============================================================
// 2026-05 prompt-hardening 회귀 — sanitizer + 미래 단어 + input dump
// ============================================================
describe('input dump sanitizer — buildSectionPrompt가 영문 오행 키를 한글로 치환한다', () => {
  it('GPT input JSON dump에 wood/fire/earth/metal/water가 단독 따옴표로 등장하지 않는다', () => {
    const gptInput = calculateAnalysisOnly(FIXTURES[0].input, NOW);
    const plans = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false });
    const normalized = normalizeBirthInput(FIXTURES[0].input, NOW);
    const guard = buildContextGuard(normalized.context, normalized.hourUnknown);
    const sp = buildSectionPrompt({
      plan: plans[0], headerIndex: 1, input: gptInput,
      contextGuard: guard, allPlans: plans,
    });
    // "wood" 같이 quoted 영문 element key가 user 메시지에 등장하면 fail
    for (const eng of ['wood', 'fire', 'earth', 'metal', 'water']) {
      expect(sp.user).not.toContain(`"${eng}"`);
    }
  });
});

describe('output sanitizer', () => {
  it('sanitizeNarrativeText: wood/fire/earth/metal/water를 목/화/토/금/수로 치환', () => {
    const input = '이 사주는 earth 기운이 강하고 water 흐름이 있어요. wood는 약합니다.';
    const out = sanitizeNarrativeText(input);
    expect(out).not.toMatch(/\b(wood|fire|earth|metal|water)\b/i);
    expect(out).toContain('토 기운');
    expect(out).toContain('수 흐름');
    expect(out).toContain('목');
  });
  it('sanitizeNarrativeText: 코드 블록 내부는 보호 (raw key 유지)', () => {
    const input = 'narrative earth 텍스트.\n\n```json\n{ "scores": { "earth": 5 } }\n```\n또 다른 wood 줄.';
    const out = sanitizeNarrativeText(input);
    expect(out).toContain('토'); // 본문 치환
    expect(out).toContain('"earth": 5'); // 코드 블록 내부 보존
  });
  it('stripFutureLeaks: 미래 단어 포함 문장 삭제', () => {
    const input = '이 사주는 안정적입니다. 앞으로 3년 동안 큰 변화가 있어요. 결론은 단단함입니다.';
    const out = stripFutureLeaks(input);
    expect(out).not.toContain('앞으로 3년');
    expect(out).toContain('이 사주는 안정적입니다');
    expect(out).toContain('결론은 단단함입니다');
  });
  it('applyFinalSanitizers: 영문 키 + 미래 단어 동시 정리', () => {
    const input = 'earth 기운이 강함. 2026년 큰 변화 가능. 안정적인 사주입니다.';
    const out = applyFinalSanitizers(input, { stripFuture: true });
    expect(out).not.toMatch(/\bearth\b/i);
    expect(out).not.toContain('2026년');
    expect(out).toContain('안정적인 사주입니다');
  });
});

describe('미래 단어 확장 패턴 — validator가 high로 잡는다', () => {
  it('"향후 3년"도 future-leak high', () => {
    const md = buildMd({ career: '향후 3년 동안 큰 흐름이 ...' });
    const ref = computed_ref();
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const leak = r.issues.find(i => i.type === 'future-leak');
    expect(leak).toBeTruthy();
    expect(leak!.severity).toBe('high');
  });
  it('"다음 3년"도 future-leak high', () => {
    const md = buildMd({ life: '다음 3년에는 ...' });
    const ref = computed_ref();
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const leak = r.issues.find(i => i.type === 'future-leak');
    expect(leak).toBeTruthy();
  });
});

// ───────── helpers ─────────
function computed_ref() {
  const f = FIXTURES[0];
  const gptInput = calculateAnalysisOnly(f.input, NOW);
  const plans = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false });
  return { gptInput, plans };
}

function buildMd(overrides: Partial<{
  opening: string; life: string; repeated: string;
  career: string; money: string; relation: string; final: string;
}> = {}): string {
  const pad = '본문 단락이 충분히 길어야 underdeveloped로 안 잡힘. '.repeat(20);
  const finalPad = '결론 본문이 충분히 길어야 final-section-missing으로 안 잡힘. '.repeat(20);
  return [
    `# 1. opening`, overrides.opening ?? pad,
    `# 2. life`, overrides.life ?? pad,
    `# 3. repeated`, overrides.repeated ?? pad,
    `# 4. career`, overrides.career ?? pad,
    `# 5. money`, overrides.money ?? pad,
    `# 6. relation`, overrides.relation ?? pad,
    `# 7. final`, overrides.final ?? finalPad,
  ].join('\n\n');
}
