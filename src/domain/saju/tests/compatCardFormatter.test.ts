// compatCardFormatter — 순수 함수 단위 테스트 (LLM/network 없음)
//
// 대상 결함:
//   1) archetype의 raw-fact 문장이 카드 키워드 칩으로 새는 문제 → normalizeCompatibilityKeywords
//   2) 3년 흐름의 연속 중복 연도 → normalizeCompatFutureFlow

import { describe, it, expect } from 'vitest';
import {
  normalizeCompatibilityKeywords,
  normalizeCompatFutureFlow,
  compactRelationshipKeyword,
} from '../compatibility/narrative/compatCardFormatter';
import {
  buildCompatNarrativeContext,
} from '../compatibility/narrative/compatNarrativeTypes';
import type { RelationshipYearFlow } from '../compatibility/compatibilityTypes';

const RAW_SENTENCE = '상대가 내 결핍 또는 욕구를 본능적으로 건드리는 끌림';
const RAW_FACT_MARKERS = ['상대가', '본능적으로', '결핍', '욕구', '또는'];
const SENTENCE_ENDINGS = ['습니다', '습니까', '니다', '는다', '지만', '다', '요'];

function assertValidChips(chips: string[]) {
  expect(chips.length).toBeGreaterThanOrEqual(3);
  expect(chips.length).toBeLessThanOrEqual(5);
  // dedupe
  expect(new Set(chips).size).toBe(chips.length);
  for (const c of chips) {
    expect(c.length).toBeGreaterThan(0);
    expect(c.length).toBeLessThanOrEqual(12);
    for (const m of RAW_FACT_MARKERS) expect(c.includes(m)).toBe(false);
    for (const e of SENTENCE_ENDINGS) expect(c.endsWith(e)).toBe(false);
  }
}

describe('normalizeCompatibilityKeywords', () => {
  it('raw 문장 + 짧은 칩 혼합 → 3~5개 유효 칩 (raw 마커/문장끝 없음)', () => {
    const input = [RAW_SENTENCE, '끌림', '거리감', '독립성'];
    const out = normalizeCompatibilityKeywords(input);
    assertValidChips(out);
    // 짧은 유효 칩은 보존
    expect(out).toContain('끌림');
    expect(out).toContain('거리감');
    expect(out).toContain('독립성');
    // raw 문장 자체는 칩으로 들어가지 않음
    expect(out).not.toContain(RAW_SENTENCE);
  });

  it('유효 칩 < 3 → focus.primaryConcerns/generic 풀로 ≥3 보충', () => {
    const input = [RAW_SENTENCE]; // 유효 칩 0개
    const out = normalizeCompatibilityKeywords(input, {
      primaryConcerns: ['끌리는 이유', '싸우는 이유', '감정 온도 차이'],
    });
    assertValidChips(out);
  });

  it('focus 없이 모두 무효 → generic 풀로 ≥3 보충', () => {
    const out = normalizeCompatibilityKeywords([RAW_SENTENCE]);
    assertValidChips(out);
  });

  it('5개 초과 금지', () => {
    const input = ['끌림', '거리감', '독립성', '신뢰', '온도차', '리듬', '균형'];
    const out = normalizeCompatibilityKeywords(input);
    expect(out.length).toBeLessThanOrEqual(5);
  });

  it('빈 입력 → generic 풀로 ≥3', () => {
    const out = normalizeCompatibilityKeywords([]);
    assertValidChips(out);
  });

  it('determinism: 동일 입력 → 동일 출력', () => {
    const input = [RAW_SENTENCE, '끌림', '거리감', '독립성'];
    expect(normalizeCompatibilityKeywords(input)).toEqual(
      normalizeCompatibilityKeywords(input),
    );
  });
});

describe('compactRelationshipKeyword', () => {
  it('raw 문장에서 짧은 head 명사구 추출', () => {
    const out = compactRelationshipKeyword(RAW_SENTENCE);
    expect(out.length).toBeLessThanOrEqual(12);
  });
});

describe('normalizeCompatFutureFlow', () => {
  const ctx = buildCompatNarrativeContext('dating');

  function yr(year: number, theme: string, opp: string, caution: string): RelationshipYearFlow {
    return {
      year,
      theme,
      relationshipEventTypes: [],
      opportunity: opp,
      caution,
      advice: '',
      evidence: [],
    };
  }

  it('2026/2027 동일 theme/opp/caution → 3년 모두 distinct theme', () => {
    const input = [
      yr(2025, '서로를 알아가는 흐름', '대화 기회', '오해 주의'),
      yr(2026, '같은 흐름', '같은 기회', '같은 주의'),
      yr(2027, '같은 흐름', '같은 기회', '같은 주의'),
    ];
    const out = normalizeCompatFutureFlow(input, ctx);
    expect(out.length).toBe(3);
    const themes = out.map(o => o.theme);
    expect(new Set(themes).size).toBe(3);
    // year 보존
    expect(out.map(o => o.year)).toEqual([2025, 2026, 2027]);
  });

  it('변주 결과에 단정 예측/점수 토큰 없음', () => {
    const input = [
      yr(2026, '같은 흐름', '같은 기회', '같은 주의'),
      yr(2027, '같은 흐름', '같은 기회', '같은 주의'),
      yr(2028, '같은 흐름', '같은 기회', '같은 주의'),
    ];
    const out = normalizeCompatFutureFlow(input, ctx);
    const joined = out
      .map(o => `${o.theme} ${o.opportunity} ${o.caution}`)
      .join(' ');
    expect(/반드시|무조건|운명|이혼|헤어집니다|결혼합니다/.test(joined)).toBe(false);
    expect(/\d+\s*점|상위\s*\d+\s*%|궁합\s*\d+/.test(joined)).toBe(false);
  });

  it('이미 distinct → 원본 유지', () => {
    const input = [
      yr(2026, '알아가는 흐름', '대화', '오해'),
      yr(2027, '맞춰가는 흐름', '조율', '피로'),
      yr(2028, '정리되는 흐름', '합의', '미룸'),
    ];
    const out = normalizeCompatFutureFlow(input, ctx);
    expect(out).toEqual(input);
  });

  it('빈 입력 → 빈 배열', () => {
    expect(normalizeCompatFutureFlow([], ctx)).toEqual([]);
  });

  it('determinism: 동일 입력 → 동일 출력', () => {
    const input = [
      yr(2026, '같은 흐름', '같은 기회', '같은 주의'),
      yr(2027, '같은 흐름', '같은 기회', '같은 주의'),
      yr(2028, '같은 흐름', '같은 기회', '같은 주의'),
    ];
    expect(normalizeCompatFutureFlow(input, ctx)).toEqual(
      normalizeCompatFutureFlow(input, ctx),
    );
  });
});
