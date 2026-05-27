// Precision V1 — Phase 7: SajuApp 개인사주 입력 폼의 출생지역 flag 게이팅.
//   flag off(기본): PlaceSelect 미렌더 → 기존 입력 폼 그대로.
//   flag on:        PlaceSelect 렌더.
// 플래그는 컴포넌트 본문에서 매 렌더마다 process.env를 읽으므로, import 전에 env를 세팅한다.
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, mockStreamingFetch } from '@/__tests__/helpers/saju-app-test-utils';

const FLAG = 'NEXT_PUBLIC_SAJU_PRECISION_INPUTS_ENABLED';
const PLACE_LABEL = '출생지역 (선택)';

async function mountAndOpenBirthInput() {
  const { default: SajuApp } = await import('@/components/SajuApp');
  await act(async () => { render(<SajuApp />); });
  await act(async () => { await new Promise(r => setTimeout(r, 0)); }); // hydration flush
  // intro(screen 0) → 개인사주 → 생년월일 입력(screen 1)
  await act(async () => { fireEvent.click(screen.getByText('내 사주 해설')); });
}

beforeEach(() => {
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  global.fetch = mockStreamingFetch('테스트 AI 응답');
  setupLocalStorage({ consent: true });
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  delete process.env[FLAG];
});

describe('SajuApp 출생지역 입력 flag 게이팅', () => {
  it('flag off(기본): 생년월일 화면에 PlaceSelect 미렌더', async () => {
    delete process.env[FLAG];
    vi.resetModules();
    await mountAndOpenBirthInput();
    // 생년월일 입력 화면(screen 1)에 도달했는지 안정적 마커로 확인 (이름 입력 placeholder)
    expect(screen.getByPlaceholderText(/이름을 입력/i)).toBeInTheDocument();
    // 출생지역 필드는 없어야 함
    expect(screen.queryByText(PLACE_LABEL)).toBeNull();
  });

  it('flag on: 생년월일 화면에 PlaceSelect 렌더', async () => {
    process.env[FLAG] = 'true';
    vi.resetModules();
    await mountAndOpenBirthInput();
    expect(screen.getByPlaceholderText(/이름을 입력/i)).toBeInTheDocument();
    expect(screen.getByText(PLACE_LABEL)).toBeInTheDocument();
    expect(screen.getByText('지역 모름')).toBeInTheDocument();
  });
});
