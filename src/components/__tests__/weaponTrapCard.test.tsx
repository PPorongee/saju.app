/** 무기 vs 함정 카드 — 렌더 검증. */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SectionWeaponTrap } from '@/components/SajuV4Report';

const W: any = [
  { name: '핵심을 가르는 판단력', howToUse: '복잡한 흐름에서 병목을 찾아 정리하는 자리에서 쓰세요.', displayPriority: 9 },
  { name: '버티는 힘', howToUse: '약함.', displayPriority: 3 },
];
const T: any = [
  { name: '혼자 떠안기', patternDescription: '책임이 애매하면 먼저 나서서 다 짊어지는 패턴이에요.', displayPriority: 8 },
];

describe('SectionWeaponTrap', () => {
  it('최우선 무기 + 함정 렌더', () => {
    const html = renderToStaticMarkup(<SectionWeaponTrap weapons={W} traps={T} lang="ko" />);
    expect(html).toContain('나의 무기와 함정');
    expect(html).toContain('핵심을 가르는 판단력'); // displayPriority 높은 것
    expect(html).not.toContain('버티는 힘');        // 낮은 것은 미표시
    expect(html).toContain('혼자 떠안기');
    expect(html).toContain('⚔️ 무기');
    expect(html).toContain('⚠ 함정');
  });

  it('EN/빈 데이터 null', () => {
    expect(renderToStaticMarkup(<SectionWeaponTrap weapons={W} traps={T} lang="en" />)).toBe('');
    expect(renderToStaticMarkup(<SectionWeaponTrap weapons={[]} traps={[]} lang="ko" />)).toBe('');
  });
});
