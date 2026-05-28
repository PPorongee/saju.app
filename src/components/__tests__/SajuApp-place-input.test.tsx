// Precision V1 — Phase 7: SajuApp 출생지역 flag 게이팅 (개인사주 P7.1 + 올해운세 P7.2).
//   flag off(기본): PlaceSelect 미렌더 → 기존 입력 폼 그대로.
//   flag on:        PlaceSelect 렌더.
// 플래그는 컴포넌트 본문에서 매 렌더마다 process.env를 읽으므로, import 전에 env를 세팅한다.
//
// 안정성(flake 방지):
//   - SajuApp은 매우 무거운 동적 import 컴포넌트라, 병렬 워커/공유 jsdom 환경에서
//     전역 `screen`(document.body) 쿼리가 다른 테스트(예: PlaceSelect.test)에서 누수된
//     "출생지역 (선택)" 노드를 잡아 flake가 났다.
//   - → 모든 쿼리를 이번 render의 container로 스코프(within)하고, afterEach에서 cleanup한다.
//   - screen 1 도달은 findBy(비동기 대기)로 확정한 뒤 단언한다.
import React from 'react';
import { render, fireEvent, act, within, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, mockStreamingFetch } from '@/__tests__/helpers/saju-app-test-utils';

const FLAG = 'NEXT_PUBLIC_SAJU_PRECISION_INPUTS_ENABLED';
const PLACE_LABEL = '출생지역 (선택)';
const NAME_PH = /이름을 입력/i;
const WAIT = { timeout: 8000 } as const;

/** SajuApp 마운트 → 카드 클릭 → 생년월일 입력(screen 1) 도달까지 대기. 이 render의 container 반환. */
async function openBirthInput(cardText: string): Promise<HTMLElement> {
  const { default: SajuApp } = await import('@/components/SajuApp');
  let container!: HTMLElement;
  await act(async () => { ({ container } = render(<SajuApp />)); });
  const scoped = within(container);
  await act(async () => { fireEvent.click(scoped.getByText(cardText)); });
  // screen 1 렌더 완료를 container 범위에서 비동기로 확정 (전역 누수 노드 무시)
  await scoped.findByPlaceholderText(NAME_PH, undefined, WAIT);
  return container;
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  global.fetch = mockStreamingFetch('테스트 AI 응답');
  setupLocalStorage({ consent: true });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.resetModules();
  delete process.env[FLAG];
});

describe('SajuApp 개인사주 출생지역 입력 flag 게이팅 (P7.1)', () => {
  it('flag off(기본): 생년월일 화면에 PlaceSelect 미렌더', async () => {
    delete process.env[FLAG];
    vi.resetModules();
    const c = await openBirthInput('내 사주 해설');
    expect(within(c).queryByText(PLACE_LABEL)).toBeNull();
  });

  it('flag on: 생년월일 화면에 PlaceSelect 렌더', async () => {
    process.env[FLAG] = 'true';
    vi.resetModules();
    const c = await openBirthInput('내 사주 해설');
    expect(await within(c).findByText(PLACE_LABEL, undefined, WAIT)).toBeInTheDocument();
    expect(within(c).getByText('지역 모름')).toBeInTheDocument();
  });
});

describe('SajuApp 올해운세(yearly) 출생지역 입력 flag 게이팅 (P7.2)', () => {
  it('flag off(기본): 올해운세 생년월일 화면에 PlaceSelect 미렌더', async () => {
    delete process.env[FLAG];
    vi.resetModules();
    const c = await openBirthInput('2026 올해운세');
    expect(within(c).queryByText(PLACE_LABEL)).toBeNull();
  });

  it('flag on: 올해운세 생년월일 화면에도 PlaceSelect 렌더 (개인사주와 동일 폼 공유)', async () => {
    process.env[FLAG] = 'true';
    vi.resetModules();
    const c = await openBirthInput('2026 올해운세');
    expect(await within(c).findByText(PLACE_LABEL, undefined, WAIT)).toBeInTheDocument();
    expect(within(c).getByText('지역 모름')).toBeInTheDocument();
  });
});
