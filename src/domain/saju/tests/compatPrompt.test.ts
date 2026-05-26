// 궁합 narrative V4 — Phase 3 Prompt Builder (deterministic, LLM 호출 X).
//
// 검증:
//   - buildCompatPromptsAll → 정확히 LLM 6개 섹션. user 비어있지 않음.
//   - 각 prompt는 자기 섹션의 [SECTION] <id> 헤더만 가짐 (다른 섹션 헤더 미포함).
//   - ABSOLUTE_RULES가 모든 섹션 prompt에 포함 (fatalism/mind-reading/score/internal-token 규칙 포함).
//   - JSON schema 문자열 + JSON-only 규칙(코드펜스 금지 / 첫 글자 {) 포함.
//   - 관계유형 차별화: dating vs coworker → prompt 다름 (type ko / focus 등장).
//   - buildCompatRepairPrompt: REPAIR_MODE + PREVIOUS_OUTPUT + issue + ABSOLUTE_RULES 유지 / 결정적 섹션 null.
//   - style-example hardcode 금지 문구 포함.
//   - 결정론: 같은 입력 2회 → identical prompts.

import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { composeCompatibilityAnalysis } from '../compatibility/compatibilityAnalyzer';
import { buildCompatNarrativePlans } from '../compatibility/narrative/compatPlanBuilder';
import {
  buildCompatPromptForSection,
  buildCompatPromptsAll,
  buildCompatRepairPrompt,
  COMPAT_PROMPT_INTERNAL,
  type CompatRepairContext,
} from '../compatibility/narrative/compatPromptBuilder';
import {
  buildCompatNarrativeContext,
  COMPAT_NARRATIVE_LLM_SECTION_IDS,
  COMPAT_NARRATIVE_SECTION_IDS,
  type CompatNarrativeSectionId,
} from '../compatibility/narrative/compatNarrativeTypes';
import { type RelationshipType } from '../compatibility/compatibilityTypes';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const NOW = new Date('2026-05-24T00:00:00Z');

const PAIR: { a: BirthInput; b: BirthInput } = {
  a: { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  b: { gender: 'male', calendarType: 'solar', birthDate: '1988-03-15', birthTime: '03:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
};

function bundleOf(type: RelationshipType) {
  const personA = calculateAnalysisOnly(PAIR.a, NOW);
  const personB = calculateAnalysisOnly(PAIR.b, NOW);
  return composeCompatibilityAnalysis(personA, personB, type);
}

function plansAndCtx(type: RelationshipType) {
  const ctx = buildCompatNarrativeContext(type);
  const plans = buildCompatNarrativePlans(bundleOf(type), ctx);
  return { ctx, plans };
}

describe('CPB-1 buildCompatPromptsAll 구성', () => {
  it('정확히 LLM 6개 섹션 prompt를 반환하고, 각 user는 비어있지 않다', () => {
    const { ctx, plans } = plansAndCtx('dating');
    const map = buildCompatPromptsAll(plans, ctx);

    const ids = Array.from(map.keys());
    expect(ids.sort()).toEqual([...COMPAT_NARRATIVE_LLM_SECTION_IDS].sort());

    for (const built of map.values()) {
      expect(built.user.length).toBeGreaterThan(0);
      expect(built.system.length).toBeGreaterThan(0);
      expect(built.maxTokens).toBeGreaterThan(0);
    }
  });

  it('각 prompt는 자기 섹션의 [SECTION] <id> 헤더만 가지고 다른 섹션 헤더는 없다', () => {
    const { ctx, plans } = plansAndCtx('dating');
    const map = buildCompatPromptsAll(plans, ctx);

    for (const [sectionId, built] of map.entries()) {
      // 자기 섹션 헤더 존재
      expect(built.user).toContain(`[SECTION] ${sectionId}`);
      // 다른 섹션의 [SECTION] 헤더는 미포함
      for (const other of COMPAT_NARRATIVE_LLM_SECTION_IDS) {
        if (other === sectionId) continue;
        expect(built.user).not.toContain(`[SECTION] ${other}`);
      }
    }
  });
});

describe('CPB-2 ABSOLUTE_RULES + safety 규칙', () => {
  it('모든 섹션 prompt에 ABSOLUTE_RULES 블록 + fatalism/mind-reading/score/internal-token 규칙 포함', () => {
    const { ctx, plans } = plansAndCtx('dating');
    const map = buildCompatPromptsAll(plans, ctx);

    for (const built of map.values()) {
      expect(built.user).toContain(COMPAT_PROMPT_INTERNAL.ABSOLUTE_RULES_TITLE);

      // fatalism (운명·관계 단정)
      expect(built.user).toContain('반드시 헤어집니다');
      expect(built.user).toContain('운명입니다');
      // mind-reading (상대 마음)
      expect(built.user).toContain('상대의 마음');
      expect(built.user).toContain('mind-reading');
      // score (점수·등급)
      expect(built.user).toContain('점수·등급');
      // internal-token 비노출
      expect(built.user).toContain('fact id');
      expect(built.user).toContain('sectionId');
    }
  });
});

describe('CPB-3 JSON schema + JSON-only 규칙', () => {
  it('각 prompt에 JSON schema 문자열 + 코드펜스 금지 / 첫 글자 { 규칙 포함', () => {
    const { ctx, plans } = plansAndCtx('dating');
    const map = buildCompatPromptsAll(plans, ctx);

    for (const built of map.values()) {
      // schema 문자열이 prompt에 박혀 있음
      expect(built.user).toContain(built.outputJsonSchema);
      expect(built.outputJsonSchema.length).toBeGreaterThan(0);

      // JSON-only 규칙
      expect(built.user).toContain(COMPAT_PROMPT_INTERNAL.JSON_OUTPUT_RULES_TITLE);
      expect(built.user).toContain('코드펜스');
      expect(built.user).toContain('첫 글자는 `{`');
    }
  });
});

describe('CPB-4 관계유형 차별화', () => {
  it('dating vs coworker — 같은 pair여도 prompt가 다르고, 유형 ko/focus가 들어간다', () => {
    const dating = plansAndCtx('dating');
    const coworker = plansAndCtx('coworker');
    const datingMap = buildCompatPromptsAll(dating.plans, dating.ctx);
    const coworkerMap = buildCompatPromptsAll(coworker.plans, coworker.ctx);

    for (const sectionId of COMPAT_NARRATIVE_LLM_SECTION_IDS) {
      const d = datingMap.get(sectionId)!;
      const c = coworkerMap.get(sectionId)!;
      // 유형별 prompt가 달라야 함
      expect(d.user).not.toEqual(c.user);
    }

    // type ko 라벨이 각 prompt에 등장
    const datingOverview = datingMap.get('relationshipOverview')!;
    const coworkerOverview = coworkerMap.get('relationshipOverview')!;
    expect(datingOverview.user).toContain(dating.ctx.relationshipTypeKo);
    expect(coworkerOverview.user).toContain(coworker.ctx.relationshipTypeKo);

    // focus.primaryConcerns가 prompt에 주입됨 (CONTEXT 블록)
    expect(datingOverview.user).toContain(dating.ctx.focus.primaryConcerns[0]);
    expect(coworkerOverview.user).toContain(coworker.ctx.focus.primaryConcerns[0]);
    // toneHint도 주입
    expect(datingOverview.user).toContain(dating.ctx.focus.toneHint);
  });
});

describe('CPB-5 결정적 섹션 null + repair', () => {
  it('buildCompatPromptForSection: 결정적 섹션 id면 null', () => {
    const { ctx, plans } = plansAndCtx('dating');
    const overview = plans.find(p => p.sectionId === 'relationshipOverview')!;

    // 강제로 결정적 섹션 id를 가진 plan을 만들어 guard 확인
    const fakeDeterministic = { ...overview, sectionId: 'compatibilityCard' as CompatNarrativeSectionId };
    expect(buildCompatPromptForSection(fakeDeterministic, ctx)).toBeNull();

    const fakeEvidence = { ...overview, sectionId: 'evidenceView' as CompatNarrativeSectionId };
    expect(buildCompatPromptForSection(fakeEvidence, ctx)).toBeNull();
  });

  it('buildCompatRepairPrompt: REPAIR_MODE + PREVIOUS_OUTPUT + issue + ABSOLUTE_RULES 유지', () => {
    const { ctx, plans } = plansAndCtx('reunion_or_breakup');
    const plan = plans.find(p => p.sectionId === 'finalAdvice')!;

    const repair: CompatRepairContext = {
      previousOutput: '{"finalAdvice":{"body":"두 분은 반드시 재회합니다."}}',
      issues: [
        {
          type: 'fatalism',
          sectionId: 'finalAdvice',
          sentence: '두 분은 반드시 재회합니다.',
          reason: '재회 단정 (운명론)',
          severity: 'high',
          suggestion: '가능성·조건 톤으로 바꿀 것',
        },
      ],
    };

    const built = buildCompatRepairPrompt(plan, ctx, repair)!;
    expect(built).not.toBeNull();
    expect(built.user).toContain('[REPAIR_MODE');
    expect(built.user).toContain('[PREVIOUS_OUTPUT');
    expect(built.user).toContain('두 분은 반드시 재회합니다.');
    expect(built.user).toContain('재회 단정 (운명론)');
    // ABSOLUTE_RULES 유지
    expect(built.user).toContain(COMPAT_PROMPT_INTERNAL.ABSOLUTE_RULES_TITLE);
    // 다른 섹션 확장 금지
    expect(built.user).toContain('다른 섹션 내용으로 확장 금지');
  });

  it('buildCompatRepairPrompt: 결정적 섹션이면 null', () => {
    const { ctx, plans } = plansAndCtx('dating');
    const overview = plans.find(p => p.sectionId === 'relationshipOverview')!;
    const fake = { ...overview, sectionId: 'evidenceView' as CompatNarrativeSectionId };
    const repair: CompatRepairContext = { previousOutput: '{}', issues: [] };
    expect(buildCompatRepairPrompt(fake, ctx, repair)).toBeNull();
  });
});

describe('CPB-6 style-example hardcode 금지 문구', () => {
  it('모든 섹션 prompt에 "특정 사주값을 복사하지 말 것" 류 문구 포함', () => {
    const { ctx, plans } = plansAndCtx('dating');
    const map = buildCompatPromptsAll(plans, ctx);
    for (const built of map.values()) {
      expect(built.user).toContain(COMPAT_PROMPT_INTERNAL.STYLE_EXAMPLE_DISCLAIMER_TITLE);
      expect(built.user).toContain('특정 사주값을 복사하지 말 것');
    }
  });
});

describe('CPB-7 결정론', () => {
  it('같은 입력 2회 → identical prompts (모든 유형)', () => {
    for (const sectionId of COMPAT_NARRATIVE_SECTION_IDS) {
      void sectionId; // 섹션 목록은 참조만
    }
    const types: RelationshipType[] = ['dating', 'married', 'friendship', 'coworker', 'reunion_or_breakup', 'crush_or_something'];
    for (const type of types) {
      const a = plansAndCtx(type);
      const b = plansAndCtx(type);
      const mapA = buildCompatPromptsAll(a.plans, a.ctx);
      const mapB = buildCompatPromptsAll(b.plans, b.ctx);
      for (const sectionId of COMPAT_NARRATIVE_LLM_SECTION_IDS) {
        expect(mapA.get(sectionId)!.user).toEqual(mapB.get(sectionId)!.user);
        expect(mapA.get(sectionId)!.system).toEqual(mapB.get(sectionId)!.system);
      }
    }
  });
});
