/**
 * 기질 한 컷 카드 — 렌더 텍스트 검증 (GPT/네트워크 무관, renderToStaticMarkup).
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SectionTemperamentCard } from '@/components/SajuV4Report';

// 경금·매우신약·강한금·약한목, 키워드 "기준이 분명한 사람" 모의 응답
const API: any = {
  birthChart: { year: '경오', month: '신사', day: '경진', dayMaster: '경', isHourEstimated: false },
  coreAnalysis: {
    elementStrength: { strongest: ['metal'], weakest: ['wood'] },
    dayMasterStrength: { level: 'very-weak' },
  },
  identityKeywords: [{ keyword: '기준이 분명한 사람' }],
};

describe('SectionTemperamentCard', () => {
  it('KO: 헤드라인(키워드+일간비유) + 칩 4종', () => {
    const html = renderToStaticMarkup(<SectionTemperamentCard api={API} lang="ko" />);
    expect(html).toContain('기준이 분명한, 잘 벼린 칼 같은 사람');
    expect(html).toContain('庚 경금');
    expect(html).toContain('매우 신약');
    expect(html).toContain('강한 금 ▲');
    expect(html).toContain('약한 목 ▽');
    expect(html).toContain('한 줄로 보는 나');
  });

  it('EN: 비유 기반 헤드라인 + 영문 칩', () => {
    const html = renderToStaticMarkup(<SectionTemperamentCard api={API} lang="en" />);
    expect(html).toContain('Like a sharpened blade');
    expect(html).toContain('Very weak');
    expect(html).toContain('Strong Metal');
    expect(html).toContain('Weak Wood');
  });

  it('데이터 없으면 안전하게 null', () => {
    const html = renderToStaticMarkup(<SectionTemperamentCard api={{} as any} lang="ko" />);
    expect(html).toBe('');
  });
});
