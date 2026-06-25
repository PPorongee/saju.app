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
import { calculateAnalysisOnly, generateNarrativePersonalSajuReport, type NarrativeGptCaller } from '../generatePersonalSajuReport';
import { buildNarrativePlans } from '../narrative/narrativePlanBuilder';
import { buildStarKeywordCard } from '../star/starKeywordCardBuilder';
import { parseNarrativeReport } from '@/lib/saju-v4-narrative-parser';
import { validateNarrativeReport } from '../narrative/narrativeReportValidator';
import { buildSectionPrompt } from '../narrative/narrativePromptBuilder';
import { sanitizeNarrativeText, stripFutureLeaks, applyFinalSanitizers, sanitizeUnsupportedUserContext, sanitizeFinancialAdviceRisk } from '../narrative/narrativeSanitizer';
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

// ============================================================
// 2026-05 audit — severity taxonomy + unsupported-user-context
// ============================================================
describe('severity taxonomy — high는 사용자 노출 blocking issue 한정', () => {
  it('missing-topic-coverage (REQUIRED_HARD)는 high가 아니라 medium', () => {
    // 일부러 본문에 specialPoints 토큰을 안 넣으면 missing-topic-coverage 발동.
    // 그 issue가 medium severity여야 함.
    const ref = computed_ref();
    // 본문에 specialPoints 이름이 들어가지 않도록 짧은 본문만
    const md = buildMd({});
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
      topicCoverageMap: { specialPoints: true } as any,
    });
    const topicIssues = r.issues.filter(i => i.type === 'missing-topic-coverage');
    // medium만 있어야 함 (high는 안 됨)
    expect(topicIssues.length).toBeGreaterThan(0);
    expect(topicIssues.every(i => i.severity === 'medium')).toBe(true);
  });
});

describe('unsupported-user-context validator — relationshipStatus=unknown', () => {
  const ref = computed_ref();
  // FIXTURES[0] = unknown
  it('"아내" 단어 → high', () => {
    const md = buildMd({ relation: '관계에서는 아내와의 균형이 중요합니다.' });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issue = r.issues.find(i => i.type === 'unsupported-user-context' && i.sentence.includes('아내'));
    expect(issue?.severity).toBe('high');
  });
  it('"남편" 단어 → high', () => {
    const md = buildMd({ relation: '남편과의 대화 패턴이 중요합니다.' });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issue = r.issues.find(i => i.type === 'unsupported-user-context' && i.sentence.includes('남편'));
    expect(issue?.severity).toBe('high');
  });
  it('"자녀와" 단어 → high', () => {
    const md = buildMd({ life: '자녀와의 관계가 깊어집니다.' });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issue = r.issues.find(i => i.type === 'unsupported-user-context' && i.sentence.includes('자녀'));
    expect(issue?.severity).toBe('high');
  });
  it('"배우자" 단정형 → high, "배우자궁"은 통과', () => {
    const md1 = buildMd({ relation: '배우자와의 관계는 ...' });
    const r1 = validateNarrativeReport({
      reportText: md1, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issue1 = r1.issues.find(i => i.type === 'unsupported-user-context' && i.sentence.includes('배우자'));
    expect(issue1?.severity).toBe('high');
    // 배우자궁 명리용어는 통과
    const md2 = buildMd({ life: '일지는 배우자궁으로 본인 자리와 관련된 결입니다.' });
    const r2 = validateNarrativeReport({
      reportText: md2, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issue2 = r2.issues.find(i => i.type === 'unsupported-user-context' && i.sentence === '배우자');
    expect(issue2).toBeUndefined();
  });
});

describe('sanitizeUnsupportedUserContext — 단정 표현 중립 치환', () => {
  it('relationshipStatus=unknown → "아내/남편/배우자" 치환', () => {
    const input = '아내와 대화를 하고, 남편의 입장을 듣고, 배우자와 갈등이 ...';
    const out = sanitizeUnsupportedUserContext(input, { relationshipStatus: 'unknown', hasChildren: 'unknown' });
    expect(out).not.toMatch(/아내/);
    expect(out).not.toMatch(/남편/);
    expect(out).not.toContain('배우자');
    expect(out).toContain('가까운 관계의 상대');
    expect(out).toContain('장기적인 관계의 상대');
  });
  it('"배우자궁" 명리용어는 보존', () => {
    const input = '일지는 배우자궁이라 본인 자리.';
    const out = sanitizeUnsupportedUserContext(input, { relationshipStatus: 'unknown', hasChildren: 'unknown' });
    expect(out).toContain('배우자궁');
  });
  it('hasChildren=unknown → "자녀/아이" 치환', () => {
    const input = '자녀와 함께 시간을 보내거나 아이를 가르치는 ...';
    const out = sanitizeUnsupportedUserContext(input, { relationshipStatus: 'unknown', hasChildren: 'unknown' });
    expect(out).not.toMatch(/자녀(?=[를는이가와과에도]|$|\s)/);
    expect(out).not.toMatch(/아이(?=[를는이가와과에도]|$|\s)/);
    expect(out).toContain('후배·제자·돌봄이 필요한 대상');
    expect(out).toContain('돌봄이 필요한 대상');
  });
  it('relationshipStatus=married + hasChildren=true → 치환 X (원형 유지)', () => {
    const input = '아내와 깊은 대화를 나누고 자녀와 함께 시간을 보냅니다.';
    const out = sanitizeUnsupportedUserContext(input, { relationshipStatus: 'married', hasChildren: true });
    expect(out).toContain('아내');
    expect(out).toContain('자녀');
  });
});

// ============================================================
// 2026-05 Narrative Depth v1 — feature flag off/on 회귀
// ============================================================
describe('Narrative Depth v1 — feature flag 기본값 계약', () => {
  // R1 (2026-06): 기본값에서 useEvidenceNarrativeBlocks 를 true 로 변경.
  //   신강약·대표신살(lifeStructure) + 용신(finalStrategy) fact를 복구해 A/B/C 수렴을 방지.
  //   Engine-Coverage v1 (2026-06): gaewoonDirection도 기본 ON으로 전환(용신→행동 명리 콘텐츠).
  //   luckOpeningCondition만 도입 잡음 위험으로 계속 기본 OFF.
  it('기본값(미지정) 시 evidence blocks + gaewoonDirection ON — lifeStructure에 dayMasterStrength, final에 usefulGod·gaewoonDirection fact가 추가된다', () => {
    for (const f of FIXTURES) {
      const gptInput = calculateAnalysisOnly(f.input, NOW);
      const plans = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false });
      const life = plans.find(p => p.sectionId === 'lifeStructureNarrative')!;
      const final = plans.find(p => p.sectionId === 'finalStrategyNarrative')!;
      const opening = plans.find(p => p.sectionId === 'openingDefinition')!;
      const lifeSources = life.mustUseFacts.map(f => f.source);
      const finalSources = final.mustUseFacts.map(f => f.source);
      const openingSources = opening.mustUseFacts.map(f => f.source);
      // evidence blocks 기본 ON → 복구된 fact 존재
      expect(lifeSources).toContain('dayMasterStrength');
      expect(finalSources).toContain('usefulGod');
      // Engine-Coverage v1: gaewoonDirection 기본 ON
      expect(finalSources).toContain('gaewoonDirection');
      // luckOpeningCondition만 기본 OFF → 여전히 없음
      expect(openingSources).not.toContain('luckOpeningCondition');
    }
  });

  it('명시적 all-off 시 lifeStructure/final/opening에 어떤 depth fact도 추가되지 않는다 (안정화 v0)', () => {
    for (const f of FIXTURES) {
      const gptInput = calculateAnalysisOnly(f.input, NOW);
      const plansOff = buildNarrativePlans(gptInput, undefined, {
        includeFutureFlow: false,
        depthOptions: {
          useEvidenceNarrativeBlocks: false,
          useSajuOpeningLuckCondition: false,
          useFinalGaewoonDirection: false,
        },
      });
      const life = plansOff.find(p => p.sectionId === 'lifeStructureNarrative')!;
      const final = plansOff.find(p => p.sectionId === 'finalStrategyNarrative')!;
      const opening = plansOff.find(p => p.sectionId === 'openingDefinition')!;
      const lifeSources = life.mustUseFacts.map(f => f.source);
      const finalSources = final.mustUseFacts.map(f => f.source);
      const openingSources = opening.mustUseFacts.map(f => f.source);
      expect(lifeSources).not.toContain('dayMasterStrength');
      expect(life.mustUseFacts.some(ff => ff.id.startsWith('representative-star-'))).toBe(false);
      expect(finalSources).not.toContain('usefulGod');
      expect(finalSources).not.toContain('gaewoonDirection');
      expect(openingSources).not.toContain('luckOpeningCondition');
    }
  });
});

describe('Narrative Depth v1 — feature flag on — depth fact가 plan에 추가된다', () => {
  const depthAllOn = {
    useEvidenceNarrativeBlocks: true,
    useSajuOpeningLuckCondition: true,
    useFinalGaewoonDirection: true,
  };

  it('lifeStructure에 신강/신약 (dayMasterStrength) fact가 추가된다', () => {
    for (const f of FIXTURES) {
      const gptInput = calculateAnalysisOnly(f.input, NOW);
      const plans = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false, depthOptions: depthAllOn });
      const life = plans.find(p => p.sectionId === 'lifeStructureNarrative')!;
      const dmsFact = life.mustUseFacts.find(f => f.source === 'dayMasterStrength');
      expect(dmsFact).toBeTruthy();
      // plainMeaning에 신강/신약/중화 키워드 중 하나가 있어야 함
      expect(dmsFact!.plainMeaning).toMatch(/신강|신약|중화/);
      // adviceHint가 반드시 부착되어 있어야 함 (행동 조언 시드)
      expect(dmsFact!.adviceHint?.actionable).toBeTruthy();
      // lifeSceneHint도 부착
      expect(dmsFact!.lifeSceneHint?.situation).toBeTruthy();
    }
  });

  it('lifeStructure에 대표 신살 1~3개 fact가 추가된다 (가능할 때)', () => {
    for (const f of FIXTURES) {
      const gptInput = calculateAnalysisOnly(f.input, NOW);
      if ((gptInput.coreAnalysis.specialStars?.length ?? 0) === 0) continue; // skip if no stars
      const plans = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false, depthOptions: depthAllOn });
      const life = plans.find(p => p.sectionId === 'lifeStructureNarrative')!;
      const starFacts = life.mustUseFacts.filter(f => f.id.startsWith('representative-star-'));
      expect(starFacts.length).toBeGreaterThanOrEqual(1);
      expect(starFacts.length).toBeLessThanOrEqual(3);
      // 각 fact에 adviceHint 또는 narrativeHint가 충분히 부착
      for (const sf of starFacts) {
        expect(sf.narrativeHint.length).toBeGreaterThan(20);
      }
    }
  });

  it('finalStrategy에 용신 (usefulGod) fact와 개운 방향 (gaewoonDirection) fact가 추가된다', () => {
    for (const f of FIXTURES) {
      const gptInput = calculateAnalysisOnly(f.input, NOW);
      const plans = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false, depthOptions: depthAllOn });
      const final = plans.find(p => p.sectionId === 'finalStrategyNarrative')!;
      const ugFact = final.mustUseFacts.find(f => f.source === 'usefulGod');
      const gaewoonFact = final.mustUseFacts.find(f => f.source === 'gaewoonDirection');
      expect(ugFact).toBeTruthy();
      expect(gaewoonFact).toBeTruthy();
      expect(ugFact!.adviceHint?.actionable).toBeTruthy();
      expect(gaewoonFact!.narrativeHint).toMatch(/미신|부적|색상|개운/);
    }
  });

  it('opening에 "운이 열리는 방식" (luckOpeningCondition) fact가 추가된다 (2~3문장 짧게)', () => {
    for (const f of FIXTURES) {
      const gptInput = calculateAnalysisOnly(f.input, NOW);
      const plans = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false, depthOptions: depthAllOn });
      const opening = plans.find(p => p.sectionId === 'openingDefinition')!;
      const luckFact = opening.mustUseFacts.find(f => f.source === 'luckOpeningCondition');
      expect(luckFact).toBeTruthy();
      // narrativeHint에 "2~3문장" 또는 "짧게" 같은 길이 제한 표현이 있어야 함
      expect(luckFact!.narrativeHint).toMatch(/2~3문장|짧게/);
    }
  });

  it('depth flag on/off로 plan을 빌드해도 includeFutureFlow=false이면 섹션 수는 7로 동일', () => {
    for (const f of FIXTURES) {
      const gptInput = calculateAnalysisOnly(f.input, NOW);
      const off = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false });
      const on = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false, depthOptions: depthAllOn });
      expect(off.length).toBe(7);
      expect(on.length).toBe(7);
      // 섹션 id 순서도 동일 (depth는 fact 추가만, 섹션 추가 X)
      expect(off.map(p => p.sectionId)).toEqual(on.map(p => p.sectionId));
    }
  });
});

describe('Narrative Depth v1 — validator 4종 medium issue (high count 영향 없음)', () => {
  const depthAllOn = {
    useEvidenceNarrativeBlocks: true,
    useSajuOpeningLuckCondition: true,
    useFinalGaewoonDirection: true,
  };

  function depthRef() {
    const f = FIXTURES[0];
    const gptInput = calculateAnalysisOnly(f.input, NOW);
    const plans = buildNarrativePlans(gptInput, undefined, { includeFutureFlow: false, depthOptions: depthAllOn });
    return { gptInput, plans };
  }

  it('lifeStructure에 신강/신약/중화 단어 없음 → missing-strength-interpretation medium', () => {
    const ref = depthRef();
    const md = buildMd({ life: '본문에 강함이라는 표현은 있지만 명리 키워드는 없습니다. '.repeat(20) });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issue = r.issues.find(i => i.type === 'missing-strength-interpretation');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('medium');
  });

  it('final에 용신/기신 키워드 없음 → missing-useful-god-advice medium', () => {
    const ref = depthRef();
    const md = buildMd({ final: '결론 본문은 충분히 길지만 명리 결 단어가 빠져 있습니다. '.repeat(20) });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issue = r.issues.find(i => i.type === 'missing-useful-god-advice');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('medium');
  });

  it('final에 개운/운을 편하게 키워드 없음 → gaewoon-direction-missing medium', () => {
    const ref = depthRef();
    // 용신은 들어가게 해서 missing-useful-god-advice는 통과시키고 gaewoon만 누락
    const md = buildMd({ final: '결론 — 용신과 기신 결을 다룹니다. 도와주는 결과 과해지면 막히는 결을 함께 봅니다. '.repeat(15) });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issue = r.issues.find(i => i.type === 'gaewoon-direction-missing');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('medium');
  });

  it('새 4종 issue가 모두 medium severity — high count에 영향 없음', () => {
    const ref = depthRef();
    const md = buildMd({ life: '본문은 길지만 신강·신약 풀이가 없습니다. '.repeat(20) });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const newTypes = [
      'missing-strength-interpretation',
      'missing-useful-god-advice',
      'special-star-too-shallow',
      'gaewoon-direction-missing',
    ];
    for (const t of newTypes) {
      const issues = r.issues.filter(i => i.type === t);
      for (const it of issues) expect(it.severity).toBe('medium');
    }
  });
});

// ============================================================
// 2026-05 audit — financial-advice-risk sanitizer + validator
// ============================================================
describe('financial-advice-risk — validator high + sanitizer 치환', () => {
  const ref = computed_ref();

  it('"시장 변화와 가격 흐름을 보고 타이밍에 맞춰 거래" → validator high', () => {
    const md = buildMd({ money: '돈은 시장 변화와 가격 흐름을 보고 타이밍에 맞춰 거래하는 방식이 좋습니다. '.repeat(8) });
    const r = validateNarrativeReport({
      reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issue = r.issues.find(i => i.type === 'financial-advice-risk');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('high');
  });

  it('sanitizeFinancialAdviceRisk가 위험 표현을 안전한 수익화 표현으로 치환', () => {
    const input = '돈은 시장 변화와 가격 흐름을 보고 타이밍에 맞춰 거래하는 방식이 좋습니다.';
    const out = sanitizeFinancialAdviceRisk(input);
    // 위험 표현이 제거되어야 함
    expect(out).not.toMatch(/시장\s*변화/);
    expect(out).not.toMatch(/가격\s*흐름을?\s*보고\s*타이밍/);
    // 안전 표현으로 치환되어야 함
    expect(out).toMatch(/수익\s*구조|작업\s*범위|가격\s*기준/);
  });

  it('"큰돈을 굴리기 전에" → "큰 결정을 하기 전에"', () => {
    const out = sanitizeFinancialAdviceRisk('큰돈을 굴리기 전에 작게 검증하세요.');
    expect(out).not.toMatch(/큰돈을?\s*굴리/);
    expect(out).toContain('큰 결정을 하기 전에');
  });

  it('"가격 흐름을 읽고 들어가는 방식" → 안전한 표현', () => {
    const out = sanitizeFinancialAdviceRisk('가격 흐름을 읽고 들어가는 방식이 잘 맞아요.');
    expect(out).not.toMatch(/가격\s*흐름/);
    expect(out).toMatch(/수요와 조건/);
  });

  it('"매수/매도/시세/수익률/레버리지/베팅/코인/주식/단기 투자/급등/트레이딩" 위험 단어 제거 + 안전 단어 등장', () => {
    // 조사 정합성("가격를")은 sanitizer 책임 밖 — 위험 단어 제거 + 안전 단어 등장만 검사.
    // 자연스러운 조사는 prompt 강화(M1)로 처음부터 방지.
    const cases: Array<{ input: string; mustNot: RegExp; mustContain: string }> = [
      { input: '매수를 ', mustNot: /매수/, mustContain: '확보' },
      { input: '매도가 ', mustNot: /매도/, mustContain: '정리' },
      { input: '시세를 ', mustNot: /시세/, mustContain: '가격' },
      { input: '수익률이 ', mustNot: /수익률/, mustContain: '수익 구조' },
      { input: '레버리지를 ', mustNot: /레버리지/, mustContain: '확장' },
      { input: '베팅에 ', mustNot: /베팅/, mustContain: '결정' },
      { input: '코인에 ', mustNot: /코인/, mustContain: '디지털 자산' },
      { input: '주식이 ', mustNot: /주식/, mustContain: '유가증권' },
      { input: '단기 투자가 ', mustNot: /단기\s*투자/, mustContain: '단기 수익 구조' },
      { input: '급등하기 ', mustNot: /급등/, mustContain: '갑작스러운 변화' },
      { input: '트레이딩이 ', mustNot: /트레이딩/, mustContain: '수익 구조 운영' },
    ];
    for (const { input, mustNot, mustContain } of cases) {
      const out = sanitizeFinancialAdviceRisk(input);
      expect(out).not.toMatch(mustNot);
      expect(out).toContain(mustContain);
    }
  });

  it('sanitize 적용 후 validator 재검증 — financial-advice-risk 0건', () => {
    const dirty = buildMd({ money: '돈은 시장 변화와 가격 흐름을 보고 타이밍에 맞춰 거래하는 방식이 좋습니다. 큰돈을 굴리기 전에 작게 검증하세요. '.repeat(5) });
    const cleaned = sanitizeFinancialAdviceRisk(dirty);
    const r = validateNarrativeReport({
      reportText: cleaned, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issues = r.issues.filter(i => i.type === 'financial-advice-risk');
    expect(issues.length).toBe(0);
  });

  it('applyFinalSanitizers({sanitizeFinancial: true})로 묶음 적용 시에도 0건', () => {
    const dirty = buildMd({ money: '큰돈을 굴리기 전에 시장 변화와 가격 흐름을 보고 타이밍에 맞춰 거래하는 방식. '.repeat(5) });
    const cleaned = applyFinalSanitizers(dirty, { stripFuture: false, sanitizeFinancial: true });
    const r = validateNarrativeReport({
      reportText: cleaned, gptInput: ref.gptInput, narrativePlans: ref.plans,
    });
    const issues = r.issues.filter(i => i.type === 'financial-advice-risk');
    expect(issues.length).toBe(0);
  });

  it('코드 블록 내부는 보호 (sanitize 안 함)', () => {
    const input = '본문에 시장 변화는 사라져야 함.\n\n```\n{ "marketChange": "시장 변화" }\n```\n다시 본문 시장 변화.';
    const out = sanitizeFinancialAdviceRisk(input);
    // 본문은 치환됨
    expect(out.indexOf('본문에 시장 변화는') === -1).toBe(true);
    // 코드 블록은 보존
    expect(out).toContain('"marketChange": "시장 변화"');
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

// ============================================================
// Repair Gating R1 (2026-06) — high(노출 위험)일 때만 repair, medium/low는 통과
// ============================================================
describe('Repair Gating R1 — validator 노출안전(exposureSafe) 계약', () => {
  const ref = computed_ref();

  it('medium만 있고 high 없음 → isValid=true·exposureSafe=true·highCount=0·mediumCount>0, qualityWarnings=non-high', () => {
    // pad 본문: 명리 fact 토큰이 거의 없어 missing-narrative-fact 등 medium 다수 발생.
    // 단, leak/단정/영문오행 없음 → high 0.
    const md = buildMd({});
    const r = validateNarrativeReport({ reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans });
    expect(r.highCount).toBe(0);
    expect(r.exposureSafe).toBe(true);
    expect(r.isValid).toBe(true);
    expect(r.mediumCount).toBeGreaterThan(0);
    // qualityWarnings는 medium+low 합과 동일하고 high를 포함하지 않음
    expect(r.qualityWarnings.length).toBe(r.mediumCount + r.lowCount);
    expect(r.qualityWarnings.every(i => i.severity !== 'high')).toBe(true);
  });

  it('high 이슈(cross-section-leak)가 있으면 → isValid=false·exposureSafe=false·highCount>0', () => {
    const md = buildMd({ money: '돈은 작은 단위로 검증하는 게 좋습니다. 결국 이 사주는 이렇게 정리됩니다. '.repeat(3) });
    const r = validateNarrativeReport({ reportText: md, gptInput: ref.gptInput, narrativePlans: ref.plans });
    expect(r.highCount).toBeGreaterThan(0);
    expect(r.exposureSafe).toBe(false);
    expect(r.isValid).toBe(false);
  });
});

describe('Repair Gating R1 — generator는 high가 있을 때만 repair', () => {
  // 섹션 프롬프트 system에 "(id: <sectionId>)"가 있어 섹션별 응답을 제어할 수 있음.
  function sectionIdOf(prompt: { system: string; user: string }): string {
    const m = `${prompt.system}\n${prompt.user}`.match(/\(id:\s*([A-Za-z]+)\)/);
    return m ? m[1] : 'unknown';
  }
  // leak/단정/영문오행/결론조 없는 충분히 긴 안전 본문 → high 0 (medium은 다수 발생 가능).
  const SAFE_BODY = '이 부분은 충분히 긴 안전한 줄글 본문입니다. 명리 용어 없이 일상어로 풀어 씁니다. 회의나 가족, 가까운 관계 같은 장면도 자연스럽게 들어갑니다. 무리한 단정 없이 결을 설명합니다. '.repeat(6);

  it('high 없음(medium만) → repair 미실행: attempts=1, repairedSections=[], exposureSafe=true', async () => {
    let calls = 0;
    // Anti-Repeat V1: 섹션마다 고유 본문(동일 SAFE_BODY면 cross-section 재탕으로 잡힘).
    // Engine-Coverage v1: 각 섹션의 priority fact(대운·십성·오행) matchToken을 흡수해야 coverageSafe=true →
    //   medium만 남아 repair 미실행. 섹션별 priority 토큰을 그 섹션 본문에만 포함(다른 섹션에 넣으면 재탕).
    const refPlans = buildNarrativePlans(calculateAnalysisOnly(FIXTURES[0].input, NOW));
    const priorityToksBySection = new Map<string, string[]>();
    for (const p of refPlans) {
      const toks = p.mustUseFacts.filter(f => (f as { priority?: boolean }).priority)
        .flatMap(f => f.matchTokens).filter(t => t.length >= 2);
      if (toks.length) priorityToksBySection.set(p.sectionId, Array.from(new Set(toks)));
    }
    const caller: NarrativeGptCaller = async (prompt) => {
      calls++;
      const sid = sectionIdOf(prompt);
      const base = `${sid} 장의 고유한 줄글입니다. 이 장은 ${sid} 주제만 일상어로 풀어 다룹니다. ${sid} 맥락의 회의·가족·관계 장면을 무리한 단정 없이 설명합니다. `.repeat(6);
      const toks = priorityToksBySection.get(sid) ?? [];
      return toks.length ? base + ` 이 장은 ${toks.join(', ')} 흐름을 현재형으로 함께 짚습니다.` : base;
    };
    const res = await generateNarrativePersonalSajuReport(FIXTURES[0].input, { callGpt: caller, now: NOW });
    expect(res.attempts).toBe(1);                       // 1차 병렬 호출만 — repair 라운드 없음
    expect(res.repairedSections.length).toBe(0);
    expect(res.validation.exposureSafe).toBe(true);
    expect(res.validation.highCount).toBe(0);
    expect(res.validation.qualityWarnings.every(i => i.severity !== 'high')).toBe(true);
    expect(calls).toBe(res.narrativePlans.length);      // repair 추가 호출 없음(= 섹션 수만큼만)
  });

  it('high(final-section-missing) 있으면 → repair 실행: attempts=2, 결론 섹션 repair 시도', async () => {
    const caller: NarrativeGptCaller = async (prompt) => {
      const sid = sectionIdOf(prompt);
      if (sid === 'finalStrategyNarrative') return '결론.';   // 너무 짧음 → final-section-missing(high)
      return SAFE_BODY;
    };
    const res = await generateNarrativePersonalSajuReport(FIXTURES[0].input, { callGpt: caller, now: NOW });
    expect(res.attempts).toBe(2);                                  // repair 1회 실행
    expect(res.repairedSections).toContain('finalStrategyNarrative');
    expect(res.validation.highCount).toBeGreaterThan(0);           // mock이 계속 짧게 반환 → 여전히 high
  });
});
