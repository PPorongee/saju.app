/**
 * Smoke render tests for SajuApp.
 *
 * These are regression guards before component extraction — they verify the
 * component mounts without crashing and key structural elements are present
 * for the default (screen 0) render. Full screen-transition tests live in
 * the integration suite; these intentionally stay lightweight.
 *
 * Browser APIs not available in jsdom are stubbed in vitest-setup.ts.
 * Remaining stubs (scrollTo, fetch) are set up per-test here.
 */
import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { setupLocalStorage, mockStreamingFetch } from '@/__tests__/helpers/saju-app-test-utils';

// ---------------------------------------------------------------------------
// Per-test setup: reset fetch + scrollTo stubs and localStorage
// ---------------------------------------------------------------------------

beforeEach(() => {
  // scrollTo is called on screen transitions
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

  // Default fetch stub — most screens that load data need this
  global.fetch = mockStreamingFetch('테스트 AI 응답');

  // Blank localStorage (no consent, no stars) is the default new-visitor state
  setupLocalStorage();
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper: render SajuApp after mocks are in place
// ---------------------------------------------------------------------------

async function mountSajuApp() {
  // Dynamic import ensures all vi.fn() stubs are in place before the module
  // executes its top-level code (important for localStorage reads in useEffect)
  const { default: SajuApp } = await import('@/components/SajuApp');

  let container!: HTMLElement;
  await act(async () => {
    const result = render(<SajuApp />);
    container = result.container;
  });

  // Flush useEffect queue (hasMounted, savedResults, etc.)
  await act(async () => {
    await new Promise(r => setTimeout(r, 0));
  });

  return container;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('SajuApp — smoke render tests', () => {
  it('mounts without throwing', async () => {
    await expect(mountSajuApp()).resolves.toBeTruthy();
  });

  it('renders the intro screen (screen 0) by default', async () => {
    await mountSajuApp();
    // h1 with the app title must be present
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
    expect(screen.getByText('별빛 사주')).toBeInTheDocument();
  });

  it('renders the language toggle button', async () => {
    await mountSajuApp();
    // The fixed lang-toggle button is always rendered regardless of screen
    const langBtn = screen.getByRole('button', { name: /EN|한국어/i });
    expect(langBtn).toBeInTheDocument();
  });

  it('renders the three feature cards on the intro screen', async () => {
    await mountSajuApp();
    expect(screen.getByText('내 사주 해설')).toBeInTheDocument();
    expect(screen.getByText('궁합 보기')).toBeInTheDocument();
    expect(screen.getByText('2026 올해운세')).toBeInTheDocument();
  });

  it('renders the business-info footer', async () => {
    await mountSajuApp();
    // The footer is always rendered; check for the registration-number label
    expect(screen.getByText(/사업자등록번호/)).toBeInTheDocument();
  });

  it('renders the app-container root element', async () => {
    const container = await mountSajuApp();
    expect(container.querySelector('.app-container')).not.toBeNull();
  });

  it('does not render birth-input screen elements on first load', async () => {
    await mountSajuApp();
    // Screen 1 heading should NOT be present on the initial render
    expect(screen.queryByText('너의 생년월일을 알려줘')).toBeNull();
  });

  it('renders consent banner after hydration when no consent stored', async () => {
    setupLocalStorage({ consent: false });
    await mountSajuApp();
    // The consent banner uses the text '동의' (Accept) — present when no prior consent
    expect(screen.getByText('동의')).toBeInTheDocument();
  });

  it('does not render consent banner when consent is already stored', async () => {
    setupLocalStorage({ consent: true });
    await mountSajuApp();
    expect(screen.queryByText('동의')).toBeNull();
  });
});
