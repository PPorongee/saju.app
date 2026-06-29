/** 오행 밸런스 / 어울리는 일 한눈 카드 — 렌더 검증. */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SectionWuxingGlance, SectionCareerGlance } from '@/components/SajuV4Report';

describe('SectionWuxingGlance', () => {
  it('5오행 막대 + 강한/약한 한 줄', () => {
    const el: any = {
      scores: { wood: 1, fire: 3, earth: 2, metal: 5, water: 0 },
      strongest: ['metal'], weakest: ['water'], excessive: [], deficient: [], isolated: [],
      climate: { coldHot: 'balanced', dryWet: 'balanced', comment: '' }, reasons: [],
    };
    const html = renderToStaticMarkup(<SectionWuxingGlance elements={el} />);
    expect(html).toContain('오행 밸런스');
    expect(html).toContain('강한 금');
    expect(html).toContain('약한 수');
  });
  it('scores 없으면 null', () => {
    expect(renderToStaticMarkup(<SectionWuxingGlance elements={undefined} />)).toBe('');
  });
});

describe('SectionCareerGlance', () => {
  it('업계 + 직무 칩', () => {
    const career: any = { topCareerMatches: [{ industry: '스타트업 / IT 플랫폼', roles: ['서비스 기획', 'PM/PO', '운영 개선'] }] };
    const html = renderToStaticMarkup(<SectionCareerGlance career={career} lang="ko" />);
    expect(html).toContain('어울리는 일');
    expect(html).toContain('스타트업 / IT 플랫폼');
    expect(html).toContain('서비스 기획');
  });
  it('EN/빈 데이터 null', () => {
    const career: any = { topCareerMatches: [{ industry: 'x', roles: ['y'] }] };
    expect(renderToStaticMarkup(<SectionCareerGlance career={career} lang="en" />)).toBe('');
    expect(renderToStaticMarkup(<SectionCareerGlance career={{ topCareerMatches: [] } as any} lang="ko" />)).toBe('');
  });
});
