/** 올해 한 컷 카드 — 렌더 텍스트 검증 (결정론, 네트워크 무관). */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { YearlyOneShotCard } from '@/components/YearlyV4Report';

const CORE: any = {
  targetYear: 2026,
  targetYearGanji: { display: '병오' },
  yearTenGod: { stemTenGod: '편재' },
  yearElementEffect: { element: '화', relationToUsefulGod: 'unfavorable' },
  strengthImpact: { natalStrength: '신약', yearlyEffect: 'supportive' },
};

describe('YearlyOneShotCard', () => {
  it('헤드라인 + 칩 4종', () => {
    const html = renderToStaticMarkup(<YearlyOneShotCard core={CORE} />);
    expect(html).toContain('2026년, 편재의 해');
    expect(html).toContain('2026 병오');
    expect(html).toContain('세운 편재');
    expect(html).toContain('화 기운 · 주의 ▽');
    expect(html).toContain('신약 · 힘 실리는 해 ▲');
    expect(html).toContain('올해 한 컷');
  });

  it('데이터 없으면 null', () => {
    expect(renderToStaticMarkup(<YearlyOneShotCard core={undefined} />)).toBe('');
    expect(renderToStaticMarkup(<YearlyOneShotCard core={{ targetYear: 2026 } as any} />)).toBe('');
  });
});
