/** 특별 포인트 "만 명 중 N명" 희소성 배지 — 렌더 검증. */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SectionDiffPoints } from '@/components/SajuV4Report';

function pt(over: any) {
  return {
    id: over.id, name: over.name ?? '천을귀인', category: 'noble', title: over.title ?? '결정적 순간의 귀인',
    shortLabel: '귀인', strengthScore: 80, displayPriority: over.displayPriority ?? 10,
    rarity: { level: over.level ?? 'rare', estimatedPer10000: over.per, basis: null, caution: '' },
    evidence: [], activatedBy: [], weakenedBy: [],
    narrative: { coreMeaning: over.core ?? '핵심 의미', whySpecial: '', lifeScene: '', goodUse: '', shadowSide: '' },
  } as any;
}

describe('SectionDiffPoints 희소성 배지', () => {
  it('estimatedPer10000 있으면 "만 명 중 약 N명" 배지', () => {
    const html = renderToStaticMarkup(<SectionDiffPoints points={[pt({ id: 'a', per: 80 })]} lang="ko" />);
    expect(html).toContain('만 명 중 약 80명');
    expect(html).not.toContain('귀한 결'); // 숫자 있으면 정성 라벨 대신 숫자
  });

  it('estimatedPer10000 없으면 정성 라벨, "만 명 중" 미표시', () => {
    const html = renderToStaticMarkup(<SectionDiffPoints points={[pt({ id: 'b', per: null, level: 'rare' })]} lang="ko" />);
    expect(html).toContain('귀한 결');
    expect(html).not.toContain('만 명 중');
  });

  it('EN/빈 데이터는 null', () => {
    expect(renderToStaticMarkup(<SectionDiffPoints points={[pt({ id: 'c', per: 80 })]} lang="en" />)).toBe('');
    expect(renderToStaticMarkup(<SectionDiffPoints points={[]} lang="ko" />)).toBe('');
  });
});
