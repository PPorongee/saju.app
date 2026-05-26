// 궁합 narrative V4 — Phase 1 types/schema sanity (LLM 호출 X).
import { describe, it, expect } from 'vitest';
import {
  COMPAT_NARRATIVE_SECTION_IDS,
  COMPAT_NARRATIVE_LLM_SECTION_IDS,
  COMPAT_NARRATIVE_SECTION_TITLES,
  COMPAT_NARRATIVE_SECTION_MAX_TOKENS,
  COMPAT_NARRATIVE_JSON_SCHEMAS,
  COMPAT_NARRATIVE_DEFAULTS,
  COMPAT_NARRATIVE_FLAG_ENV,
  RELATIONSHIP_TYPE_FOCUS,
  buildCompatNarrativeContext,
  type CompatNarrativeSectionId,
  type CompatibilityNarrativeReport,
} from '../compatibility/narrative/compatNarrativeTypes';
import { RELATIONSHIP_TYPES } from '../compatibility/compatibilityTypes';

const DETERMINISTIC: CompatNarrativeSectionId[] = ['compatibilityCard', 'evidenceView'];

describe('CN-1 sectionId 구성', () => {
  it('8개 섹션, 중복 없음', () => {
    expect(COMPAT_NARRATIVE_SECTION_IDS.length).toBe(8);
    expect(new Set(COMPAT_NARRATIVE_SECTION_IDS).size).toBe(8);
  });

  it('LLM 섹션 6개 = 전체 8 − 결정적 2', () => {
    expect(COMPAT_NARRATIVE_LLM_SECTION_IDS.length).toBe(6);
    // LLM 섹션은 전체에 포함되고, 결정적 2개는 LLM 목록에 없어야 함
    for (const s of COMPAT_NARRATIVE_LLM_SECTION_IDS) {
      expect(COMPAT_NARRATIVE_SECTION_IDS).toContain(s);
      expect(DETERMINISTIC).not.toContain(s);
    }
    for (const d of DETERMINISTIC) {
      expect(COMPAT_NARRATIVE_LLM_SECTION_IDS).not.toContain(d);
    }
  });
});

describe('CN-2 titles / maxTokens 정합', () => {
  it('모든 섹션에 title 존재', () => {
    for (const s of COMPAT_NARRATIVE_SECTION_IDS) {
      expect(typeof COMPAT_NARRATIVE_SECTION_TITLES[s]).toBe('string');
      expect(COMPAT_NARRATIVE_SECTION_TITLES[s].length).toBeGreaterThan(0);
    }
  });

  it('모든 섹션에 maxTokens 존재, 결정적은 0, LLM은 >0', () => {
    for (const s of COMPAT_NARRATIVE_SECTION_IDS) {
      const t = COMPAT_NARRATIVE_SECTION_MAX_TOKENS[s];
      expect(typeof t).toBe('number');
      if (DETERMINISTIC.includes(s)) expect(t).toBe(0);
      else expect(t).toBeGreaterThan(0);
    }
  });
});

describe('CN-3 JSON schema', () => {
  it('schema 키 집합 == LLM 섹션 집합', () => {
    const keys = Object.keys(COMPAT_NARRATIVE_JSON_SCHEMAS).sort();
    const llm = [...COMPAT_NARRATIVE_LLM_SECTION_IDS].sort();
    expect(keys).toEqual(llm);
  });

  it('각 schema는 유효 JSON이고 자기 섹션 키를 최상위에 가짐', () => {
    for (const [sectionId, schema] of Object.entries(COMPAT_NARRATIVE_JSON_SCHEMAS)) {
      const parsed = JSON.parse(schema); // 유효 JSON이어야 함 (throw 시 실패)
      expect(parsed[sectionId]).toBeDefined();
    }
  });

  it('relationshipMechanism schema는 evidenceBlocks 6단계 필드를 가짐', () => {
    const m = JSON.parse(COMPAT_NARRATIVE_JSON_SCHEMAS.relationshipMechanism);
    const blk = m.relationshipMechanism.evidenceBlocks[0];
    for (const f of ['evidence', 'causalExplanation', 'betweenScene', 'positiveUse', 'shadowPattern', 'practicalAdvice']) {
      expect(blk[f]).toBeDefined();
    }
  });
});

describe('CN-4 relationshipType context', () => {
  it('RELATIONSHIP_TYPE_FOCUS는 6개 관계유형 모두 커버', () => {
    const keys = Object.keys(RELATIONSHIP_TYPE_FOCUS).sort();
    expect(keys).toEqual([...RELATIONSHIP_TYPES].sort());
    for (const t of RELATIONSHIP_TYPES) {
      expect(RELATIONSHIP_TYPE_FOCUS[t].primaryConcerns.length).toBeGreaterThan(0);
      expect(RELATIONSHIP_TYPE_FOCUS[t].toneHint.length).toBeGreaterThan(0);
    }
  });

  it('buildCompatNarrativeContext — 유형별 ko/focus 조립', () => {
    const ctx = buildCompatNarrativeContext('reunion_or_breakup');
    expect(ctx.relationshipType).toBe('reunion_or_breakup');
    expect(ctx.relationshipTypeKo).toBe('재회/이별');
    expect(ctx.focus.toneHint).toContain('단정 금지');
    // 유형마다 관심사가 실제로 다른지 (dating vs coworker)
    const dating = buildCompatNarrativeContext('dating');
    const coworker = buildCompatNarrativeContext('coworker');
    expect(dating.focus.primaryConcerns).not.toEqual(coworker.focus.primaryConcerns);
  });
});

describe('CN-5 feature flag 기본값 (반드시 off)', () => {
  it('api/ui 기본 false', () => {
    expect(COMPAT_NARRATIVE_DEFAULTS.apiEnabled).toBe(false);
    expect(COMPAT_NARRATIVE_DEFAULTS.uiEnabled).toBe(false);
  });
  it('flag env 이름 상수 존재', () => {
    expect(COMPAT_NARRATIVE_FLAG_ENV.apiEnabled).toBe('COMPAT_NARRATIVE_API_ENABLED');
    expect(COMPAT_NARRATIVE_FLAG_ENV.uiEnabled).toBe('NEXT_PUBLIC_COMPAT_NARRATIVE_UI_ENABLED');
    expect(COMPAT_NARRATIVE_FLAG_ENV.verifySecret).toBe('COMPAT_NARRATIVE_VERIFY_SECRET');
  });
});

describe('CN-6 Report 타입 shape (컴파일 + 런타임 구성)', () => {
  it('최소 Report 객체가 8개 필드를 갖고 구성됨', () => {
    const report: CompatibilityNarrativeReport = {
      compatibilityCard: { title: '닮아서 부딪히고 달라서 배우는 사이', snsPhrase: '...', keywords: ['연결', '속도차', '성장'] },
      relationshipOverview: { oneLine: '...', body: '...' },
      relationshipMechanism: {
        body: '...',
        evidenceBlocks: [{
          sectionId: 'relationshipMechanism',
          evidence: [{ label: '일지 충', plainMeaning: '가까워질수록 생활 리듬이 흔들릴 수 있어요', role: 'main' }],
          causalExplanation: '...', betweenScene: '...', positiveUse: '...', shadowPattern: '...', practicalAdvice: '...',
        }],
      },
      attractionAndFriction: { body: '...' },
      repeatedPattern: { body: '...' },
      relationshipGuide: { body: '...' },
      finalAdvice: { body: '...' },
      evidenceView: {
        relationshipType: 'dating', relationshipTypeKo: '연애중', archetypeTitle: '...',
        dayMasterRelation: { relation: 'same-element', balance: 'mutual', plain: '...' },
        spousePalaceRelation: { kinds: ['conflict'], intensity: 'medium', plain: '...' },
        elementComplement: { aNeedsFromB: [], bNeedsFromA: [], mutual: 'moderate' },
        tenGodInteraction: { aFeelsBAs: [], bFeelsAAs: [] },
        usefulGodInteraction: { plain: '...' },
        combinationConflicts: { combinations: [], conflicts: [], punishments: [], destructions: [], harms: [] },
      },
    };
    expect(Object.keys(report).sort()).toEqual([...COMPAT_NARRATIVE_SECTION_IDS].sort());
  });
});
