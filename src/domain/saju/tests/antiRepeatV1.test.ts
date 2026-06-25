// Anti-Repeat V1 (2026-06) 회귀 테스트.
//
// 검증 대상 (모두 deterministic — 실제 GPT 호출 없음):
//   1. findCrossSectionRepeats — 뒷 섹션이 앞 섹션 문장을 near-verbatim 재탕하면 탐지
//   2. validateNarrativeReport.repetitionSafe — 재탕/근거없는 수렴문구가 있으면 false
//   3. dedupeFoundationalFacts — 토대 fact(신강/용신/대표신살)를 전담 장 1개로 정리 + 메모
//   4. buildNarrativePlans — 실제 plan에서 토대 source가 섹션당 최대 1회만 남음

import { describe, it, expect } from 'vitest';
import {
  validateNarrativeReport, findCrossSectionRepeats,
} from '../narrative/narrativeReportValidator';
import { buildNarrativePlans, dedupeFoundationalFacts } from '../narrative/narrativePlanBuilder';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import type { NarrativePlan, NarrativeMustUseFact } from '../narrative/narrativeTypes';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const NOW = new Date('2026-05-24T00:00:00Z');
const INPUT_A: BirthInput = {
  gender: 'female', calendarType: 'solar',
  birthDate: '1995-07-06', birthTime: '12:00',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};

// 거의 같은 문장(어미만 다름)을 2장·5장에 심은 리포트
const DUP_SENT = '주변이 흔들릴 때 자기 자리를 단단히 지키는 결단력이 강한 구조입니다';
function buildReportWithDup(): string {
  return [
    '# 1. 이 사주를 한 문장으로 말하면',
    '겉으로는 차분해 보여도 안쪽에는 분명한 기준을 품은 사람에 가까워요. 이 결을 다음 장에서 풀어 봅니다.',
    '# 2. 당신이 이런 방식으로 살아온 이유',
    `무는 자기 기준이 분명한 일간입니다. ${DUP_SENT}. 그래서 책임이 모이는 자리를 자연스럽게 맡게 됩니다.`,
    '# 3. 반복해서 찾아오는 삶의 패턴',
    '처음엔 괜찮다고 생각했는데 어느 순간 너무 많이 떠안고 있는 상태가 반복되기 쉽습니다. 가족과 직장에서 모두 나타날 수 있어요.',
    '# 4. 일과 재능: 어떤 역할에서 실력이 살아나는가',
    '복잡한 흐름을 정리하고 막힌 곳을 찾아 다시 굴러가게 만드는 일에서 강한 편이에요. 운영 개선·프로세스 관리 같은 역할이 맞습니다.',
    '# 5. 돈과 수익화: 어떤 방식으로 돈이 붙는가',
    `돈은 신뢰와 기준이 쌓이며 커지는 구조가 맞습니다. ${DUP_SENT}. 작업 범위와 보상 기준을 명문화하는 게 중요합니다.`,
    '# 6. 관계와 연애: 어떤 사람에게 마음이 열리고 닫히는가',
    '말의 빈도보다 행동의 일관성을 보는 편이에요. 역할을 나눌 줄 아는 사람과 편하게 지냅니다.',
    '# 7. 결국 이 사주는 이렇게 써야 해요',
    '이미 강한 힘을 어디까지 쓰고 어디서 나눌지 정할 때 운이 열립니다. 기준을 세우고 역할을 나누는 게 핵심입니다.',
  ].join('\n\n');
}

describe('Anti-Repeat V1 — findCrossSectionRepeats', () => {
  it('뒷 섹션이 앞 섹션 문장을 near-verbatim 재탕하면 (앞<뒤)로 탐지', () => {
    const blocks = [
      { id: 'lifeStructureNarrative', index: 2, body: `무는 기준이 분명합니다. ${DUP_SENT}.` },
      { id: 'moneyMonetizationNarrative', index: 5, body: `돈은 기준으로 붙습니다. ${DUP_SENT}.` },
    ];
    const repeats = findCrossSectionRepeats(blocks);
    expect(repeats.length).toBeGreaterThan(0);
    expect(repeats[0].earlierId).toBe('lifeStructureNarrative');
    expect(repeats[0].laterId).toBe('moneyMonetizationNarrative');
    expect(repeats[0].sim).toBeGreaterThanOrEqual(0.62);
  });

  it('서로 다른 문장은 탐지하지 않음 (false positive 방지)', () => {
    const blocks = [
      { id: 'lifeStructureNarrative', index: 2, body: '무는 자기 기준이 분명한 일간이라 책임을 빨리 체감합니다.' },
      { id: 'moneyMonetizationNarrative', index: 5, body: '돈은 작업 범위와 보상 기준을 명문화할 때 반복 가능한 구조가 됩니다.' },
    ];
    expect(findCrossSectionRepeats(blocks).length).toBe(0);
  });
});

describe('Anti-Repeat V1 — validateNarrativeReport.repetitionSafe', () => {
  const gptInput = calculateAnalysisOnly(INPUT_A, NOW);
  const plans = buildNarrativePlans(gptInput);

  it('섹션 간 재탕이 있으면 repetitionSafe=false + repeated-theme-no-development 발생', () => {
    const r = validateNarrativeReport({ reportText: buildReportWithDup(), gptInput, narrativePlans: plans });
    expect(r.repetitionSafe).toBe(false);
    expect(r.issues.some(i => i.type === 'repeated-theme-no-development')).toBe(true);
    // 재탕 issue는 뒷 섹션(5장)을 repair 대상으로 지목
    const rep = r.issues.find(i => i.type === 'repeated-theme-no-development' && i.sectionId === 'moneyMonetizationNarrative');
    expect(rep).toBeTruthy();
  });

  it('재탕 issue는 high로 격상되지 않음 — repetitionSafe(품질)와 exposureSafe(안전)는 분리', () => {
    const r = validateNarrativeReport({ reportText: buildReportWithDup(), gptInput, narrativePlans: plans });
    expect(r.repetitionSafe).toBe(false); // 반복 게이트는 깨짐 → repair 유발
    // 반복 자체는 노출 위험이 아니므로 medium에 머문다(안전 게이트 오염 방지)
    const repIssues = r.issues.filter(i => i.type === 'repeated-theme-no-development');
    expect(repIssues.length).toBeGreaterThan(0);
    expect(repIssues.every(i => i.severity !== 'high')).toBe(true);
  });
});

describe('Anti-Repeat V1 — dedupeFoundationalFacts', () => {
  function fact(source: NarrativeMustUseFact['source'], f: string): NarrativeMustUseFact {
    return { id: `${source}-x`, source, fact: f, plainMeaning: f, narrativeHint: '', matchTokens: [f] };
  }
  function plan(sectionId: NarrativePlan['sectionId'], facts: NarrativeMustUseFact[]): NarrativePlan {
    return {
      sectionId, sectionGoal: '', mustUseFacts: facts, requiredBeats: [],
      avoidRepeating: [], styleExamples: { badExample: '', goodExample: '', transformationRule: '' },
    };
  }

  it('같은 토대 fact가 2장에 있으면 전담 장 1개만 남고 다른 장엔 재설명 금지 메모', () => {
    const plans: NarrativePlan[] = [
      plan('lifeStructureNarrative', [fact('specialStar', '양인'), fact('dayMasterStrength', '신강')]),
      plan('moneyMonetizationNarrative', [fact('specialStar', '양인')]),
      plan('finalStrategyNarrative', [fact('dayMasterStrength', '신강'), fact('usefulGod', '용신 수')]),
    ];
    dedupeFoundationalFacts(plans);
    const has = (sid: string, f: string) =>
      plans.find(p => p.sectionId === sid)!.mustUseFacts.some(x => x.fact === f);

    // 양인: home=lifeStructure 유지, money에서는 제거
    expect(has('lifeStructureNarrative', '양인')).toBe(true);
    expect(has('moneyMonetizationNarrative', '양인')).toBe(false);
    // 신강: home=lifeStructure 유지, final에서는 제거
    expect(has('lifeStructureNarrative', '신강')).toBe(true);
    expect(has('finalStrategyNarrative', '신강')).toBe(false);
    // 제거된 장엔 메모
    const money = plans.find(p => p.sectionId === 'moneyMonetizationNarrative')!;
    expect(money.avoidRepeating.some(n => n.includes('에서 설명함'))).toBe(true);
  });

  it('실제 buildNarrativePlans 결과: 토대 source는 섹션당 최대 1회', () => {
    const gptInput = calculateAnalysisOnly(INPUT_A, NOW);
    const plans = buildNarrativePlans(gptInput);
    for (const src of ['dayMasterStrength', 'usefulGod'] as const) {
      const sectionsWith = plans.filter(p => p.mustUseFacts.some(f => f.source === src)).length;
      expect(sectionsWith).toBeLessThanOrEqual(1);
    }
  });
});
