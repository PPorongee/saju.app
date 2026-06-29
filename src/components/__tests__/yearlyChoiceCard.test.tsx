/** 올해의 선택 카드 (잡을 것/놓을 것/한 수) — 렌더 검증. */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { YearlyChoiceCard } from '@/components/YearlyV4Report';

describe('YearlyChoiceCard', () => {
  it('잡을 것/놓을 것 top + 올해의 한 수', () => {
    const html = renderToStaticMarkup(
      <YearlyChoiceCard guide={{
        mustCatch: ['자격·문서로 실력을 남기기', '두 번째 항목'],
        betterAvoid: ['혼자 다 떠안기'],
        bestStrategy: '완성도보다 먼저 작은 결과를 밖으로 보여주세요.',
      }} />
    );
    expect(html).toContain('올해의 선택');
    expect(html).toContain('자격·문서로 실력을 남기기');
    expect(html).not.toContain('두 번째 항목'); // top 1만
    expect(html).toContain('혼자 다 떠안기');
    expect(html).toContain('올해의 한 수');
    expect(html).toContain('완성도보다 먼저');
  });

  it('빈/누락 데이터 null', () => {
    expect(renderToStaticMarkup(<YearlyChoiceCard guide={undefined} />)).toBe('');
    expect(renderToStaticMarkup(<YearlyChoiceCard guide={{ mustCatch: [], betterAvoid: [] }} />)).toBe('');
  });
});
