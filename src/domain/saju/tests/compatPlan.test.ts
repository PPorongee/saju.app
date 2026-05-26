// 궁합 narrative V4 — Phase 2 Evidence Formatter + Plan Builder (deterministic, LLM 호출 X).
//
// 검증:
//   - ownerSection 중복 0: 어떤 fact id도 2개 섹션에 배정되지 않으며, 모든 ownerSection이 유효.
//   - buildCompatNarrativePlans는 LLM 6개 섹션에 대해서만 plan 반환 (결정적 2개 제외).
//   - 각 LLM plan의 mustUseFacts는 모두 ownerSection === plan.sectionId.
//   - 관계유형 차별화: 6개 유형(같은 pair) → requiredBeats(또는 toneHints)가 유형별로 다름.
//   - card/futureFlow/evidenceView fact는 어떤 LLM plan의 mustUseFacts에도 없음.
//   - 결정론: 같은 입력 2회 → deep-equal plans.

import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { composeCompatibilityAnalysis } from '../compatibility/compatibilityAnalyzer';
import {
  formatCompatEvidence, getOwnerSectionOf,
} from '../compatibility/narrative/compatEvidenceFormatter';
import { buildCompatNarrativePlans } from '../compatibility/narrative/compatPlanBuilder';
import {
  buildCompatNarrativeContext,
  COMPAT_NARRATIVE_LLM_SECTION_IDS,
  COMPAT_NARRATIVE_SECTION_IDS,
  type CompatNarrativeSectionId,
} from '../compatibility/narrative/compatNarrativeTypes';
import { RELATIONSHIP_TYPES, type RelationshipType } from '../compatibility/compatibilityTypes';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const NOW = new Date('2026-05-24T00:00:00Z');

const DETERMINISTIC: CompatNarrativeSectionId[] = ['compatibilityCard', 'evidenceView'];

const BIRTH_PAIRS: Array<{ label: string; a: BirthInput; b: BirthInput }> = [
  {
    label: 'pair1',
    a: { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
    b: { gender: 'male', calendarType: 'solar', birthDate: '1988-03-15', birthTime: '03:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  },
  {
    label: 'pair2',
    a: { gender: 'female', calendarType: 'solar', birthDate: '2001-11-22', birthTime: '20:45', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
    b: { gender: 'male', calendarType: 'solar', birthDate: '1990-05-05', birthTime: '06:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  },
  {
    label: 'pair3',
    a: { gender: 'male', calendarType: 'solar', birthDate: '1992-03-10', birthTime: '09:15', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
    b: { gender: 'female', calendarType: 'solar', birthDate: '1998-08-12', birthTime: '23:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  },
];

function bundleOf(pair: { a: BirthInput; b: BirthInput }, type: RelationshipType) {
  const personA = calculateAnalysisOnly(pair.a, NOW);
  const personB = calculateAnalysisOnly(pair.b, NOW);
  return composeCompatibilityAnalysis(personA, personB, type);
}

describe('CP-1 ownerSection 단일 소유 (중복 0)', () => {
  it('모든 fact는 단 하나의 유효한 ownerSection을 가지고, id 중복이 없다', () => {
    for (const pair of BIRTH_PAIRS) {
      for (const type of RELATIONSHIP_TYPES) {
        const bundle = bundleOf(pair, type);
        const ctx = buildCompatNarrativeContext(type);
        const { facts } = formatCompatEvidence(bundle, ctx);

        // id 중복 0
        const ids = facts.map(f => f.id);
        expect(new Set(ids).size).toBe(ids.length);

        // 각 fact의 ownerSection이 유효 + getOwnerSectionOf와 정합
        for (const f of facts) {
          expect(COMPAT_NARRATIVE_SECTION_IDS).toContain(f.ownerSection);
          expect(getOwnerSectionOf(f.id)).toBe(f.ownerSection);
        }

        // 한 fact id가 두 섹션에 배정되는 일이 없음 (id→ownerSection 단일 맵)
        const idToOwner = new Map<string, CompatNarrativeSectionId>();
        for (const f of facts) {
          if (idToOwner.has(f.id)) {
            expect(idToOwner.get(f.id)).toBe(f.ownerSection);
          }
          idToOwner.set(f.id, f.ownerSection);
        }
      }
    }
  });
});

describe('CP-2 buildCompatNarrativePlans 구성', () => {
  it('정확히 LLM 6개 섹션에 대해서만 plan 반환 (결정적 2개 제외)', () => {
    const pair = BIRTH_PAIRS[0];
    const ctx = buildCompatNarrativeContext('dating');
    const plans = buildCompatNarrativePlans(bundleOf(pair, 'dating'), ctx);

    const sectionIds = plans.map(p => p.sectionId);
    expect(sectionIds.sort()).toEqual([...COMPAT_NARRATIVE_LLM_SECTION_IDS].sort());
    for (const d of DETERMINISTIC) {
      expect(sectionIds).not.toContain(d);
    }
  });

  it('각 LLM plan의 mustUseFacts는 모두 ownerSection === plan.sectionId', () => {
    for (const pair of BIRTH_PAIRS) {
      for (const type of RELATIONSHIP_TYPES) {
        const ctx = buildCompatNarrativeContext(type);
        const plans = buildCompatNarrativePlans(bundleOf(pair, type), ctx);
        for (const plan of plans) {
          for (const f of plan.mustUseFacts) {
            expect(f.ownerSection).toBe(plan.sectionId);
          }
        }
      }
    }
  });
});

describe('CP-3 card/futureFlow/evidenceView fact는 LLM plan에 없음', () => {
  it('LLM plan mustUseFacts에 cc-(card)/evidenceView/futureFlow source fact 미포함', () => {
    const pair = BIRTH_PAIRS[0];
    const ctx = buildCompatNarrativeContext('married');
    const plans = buildCompatNarrativePlans(bundleOf(pair, 'married'), ctx);

    const allPlanFacts = plans.flatMap(p => p.mustUseFacts);
    for (const f of allPlanFacts) {
      // 결정적 카드 fact id(cc-)는 LLM plan에 없어야 함
      expect(f.id.startsWith('cc-')).toBe(false);
      // ownerSection이 결정적 섹션인 fact도 없어야 함
      expect(DETERMINISTIC).not.toContain(f.ownerSection);
    }
    // futureFlow source fact는 finalAdvice의 ONE summary로만 존재 (LLM plan에는 정확히 1개)
    const flowFacts = allPlanFacts.filter(f => f.source === 'futureFlow');
    expect(flowFacts.length).toBe(1);
    expect(flowFacts[0].ownerSection).toBe('finalAdvice');
  });
});

describe('CP-4 관계유형 차별화', () => {
  it('6개 유형(같은 pair) → requiredBeats가 유형별로 다름 (dating vs coworker 등)', () => {
    const pair = BIRTH_PAIRS[0];
    const byType: Record<RelationshipType, ReturnType<typeof buildCompatNarrativePlans>> = {} as any;
    for (const type of RELATIONSHIP_TYPES) {
      byType[type] = buildCompatNarrativePlans(bundleOf(pair, type), buildCompatNarrativeContext(type));
    }

    // dating vs coworker — repeatedPattern beats가 deep-equal이면 안 됨
    const datingRP = byType.dating.find(p => p.sectionId === 'repeatedPattern')!;
    const coworkerRP = byType.coworker.find(p => p.sectionId === 'repeatedPattern')!;
    expect(datingRP.requiredBeats).not.toEqual(coworkerRP.requiredBeats);

    // 모든 유형 쌍에서 finalAdvice의 requiredBeats(또는 toneHints)가 서로 구별됨
    const fingerprints = RELATIONSHIP_TYPES.map(t => {
      const fa = byType[t].find(p => p.sectionId === 'finalAdvice')!;
      return JSON.stringify([fa.requiredBeats, fa.toneHints]);
    });
    expect(new Set(fingerprints).size).toBe(RELATIONSHIP_TYPES.length);
  });

  it('reunion_or_breakup은 단정 금지 톤이 toneHints에 반영됨', () => {
    const pair = BIRTH_PAIRS[0];
    const plans = buildCompatNarrativePlans(bundleOf(pair, 'reunion_or_breakup'), buildCompatNarrativeContext('reunion_or_breakup'));
    const fa = plans.find(p => p.sectionId === 'finalAdvice')!;
    expect(fa.toneHints.some(t => t.includes('단정 금지'))).toBe(true);
  });
});

describe('CP-5 결정론', () => {
  it('같은 입력 2회 → deep-equal plans', () => {
    for (const pair of BIRTH_PAIRS) {
      for (const type of RELATIONSHIP_TYPES) {
        const ctx = buildCompatNarrativeContext(type);
        const p1 = buildCompatNarrativePlans(bundleOf(pair, type), ctx);
        const p2 = buildCompatNarrativePlans(bundleOf(pair, type), ctx);
        expect(p1).toEqual(p2);
      }
    }
  });
});
