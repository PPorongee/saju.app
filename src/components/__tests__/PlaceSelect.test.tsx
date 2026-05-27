// Precision V1 — Phase 7: PlaceSelect 컴포넌트 + payload 헬퍼 + import 안전성.
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import PlaceSelect, { birthPlacePayloadPatch } from '@/components/PlaceSelect';

// ── payload 헬퍼: flag/선택 상태 → birthPlaceId 포함 여부 ──
describe('birthPlacePayloadPatch', () => {
  it('flag off → {} (지역 선택 무관, payload 변동 없음)', () => {
    expect(birthPlacePayloadPatch(false, 'KR-11')).toEqual({});
    expect(birthPlacePayloadPatch(false, '')).toEqual({});
  });
  it('flag on + 지역 선택 → { birthPlaceId }', () => {
    expect(birthPlacePayloadPatch(true, 'KR-11')).toEqual({ birthPlaceId: 'KR-11' });
  });
  it('flag on + 지역 모름(빈 문자열/공백/null/undefined) → {}', () => {
    expect(birthPlacePayloadPatch(true, '')).toEqual({});
    expect(birthPlacePayloadPatch(true, '   ')).toEqual({});
    expect(birthPlacePayloadPatch(true, null)).toEqual({});
    expect(birthPlacePayloadPatch(true, undefined)).toEqual({});
  });
  it('calculationMode는 절대 포함하지 않음 (precision 제어는 서버 env 소관)', () => {
    const patch = birthPlacePayloadPatch(true, 'KR-11');
    expect('calculationMode' in patch).toBe(false);
  });
});

// ── 렌더 ──
describe('PlaceSelect 렌더', () => {
  it('지역 모름 + 국내 광역 + 해외 도시 옵션을 노출', () => {
    render(<PlaceSelect value="" onChange={() => {}} />);
    expect(screen.getByText('지역 모름')).toBeInTheDocument();
    expect(screen.getByText('서울')).toBeInTheDocument();   // 국내 region
    expect(screen.getByText('부산')).toBeInTheDocument();
    expect(screen.getByText('도쿄')).toBeInTheDocument();   // 해외 city
    expect(screen.getByText('런던')).toBeInTheDocument();
  });
  it('선택 변경 시 place id를 그대로 전달', () => {
    const onChange = vi.fn();
    render(<PlaceSelect value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('출생지역 (선택)'), { target: { value: 'KR-11' } });
    expect(onChange).toHaveBeenCalledWith('KR-11');
  });
  it('지역 모름 재선택 시 빈 문자열 전달', () => {
    const onChange = vi.fn();
    render(<PlaceSelect value="KR-11" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('출생지역 (선택)'), { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith('');
  });
  it('어려운 용어(태양시/자시/DST/절기/시차/정밀 보정)를 노출하지 않음', () => {
    const { container } = render(<PlaceSelect value="" onChange={() => {}} />);
    const txt = container.textContent || '';
    for (const term of ['태양시', '자시', 'DST', '절기', '시차', '정밀 보정']) {
      expect(txt).not.toContain(term);
    }
  });
});

// ── import 안전성: PlaceSelect는 places 데이터셋만 import (luxon/계산모듈 금지) ──
describe('PlaceSelect import 안전성', () => {
  it('소스의 import 구문이 luxon/solarTimeCorrector/precisionAdjust/precisionContext를 포함하지 않음', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/PlaceSelect.tsx'), 'utf8');
    // 주석에는 이 단어들이 등장할 수 있으므로(설명용), 실제 import 구문만 검사한다.
    const importLines = src.split('\n').filter(l => /^\s*import\b/.test(l)).join('\n');
    expect(importLines).not.toMatch(/luxon/);
    expect(importLines).not.toMatch(/solarTimeCorrector/);
    expect(importLines).not.toMatch(/precisionAdjust/);
    expect(importLines).not.toMatch(/precisionContext/);
    // 데이터셋만 import 하는지 양성 확인
    expect(importLines).toMatch(/calendar\/data\/places/);
  });
});
