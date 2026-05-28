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
const PREG_FLAG = 'NEXT_PUBLIC_PREGNANCY_NARRATIVE_UI_ENABLED'; // 임산부 narrative 카드(엄마 시간/지역 입력) 게이트
const PLACE_LABEL = '출생지역 (선택)';
const NAME_PH = /이름을 입력/i;
// SajuApp 동적 import + 무거운 화면(특히 궁합: PlaceSelect 2개 × ~70 option) 렌더는 부하 시 느리다.
// findBy 대기(WAIT)와 테스트 타임아웃을 넉넉히 둔다 (testTimeout > WAIT 보장).
const WAIT = { timeout: 15000 } as const;
vi.setConfig({ testTimeout: 30000, hookTimeout: 30000 });

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

/** intro → 궁합 보기 → 궁합 입력(screen 5) 도달까지 대기. 이 render의 container 반환. */
async function openCompatInput(): Promise<HTMLElement> {
  const { default: SajuApp } = await import('@/components/SajuApp');
  let container!: HTMLElement;
  await act(async () => { ({ container } = render(<SajuApp />)); });
  const scoped = within(container);
  await act(async () => { fireEvent.click(scoped.getByText('궁합 보기')); });
  // 궁합 입력 화면의 안정적 마커(관계 유형 카드 제목) 도달 확정
  await scoped.findByText('💫 두 사람의 관계는?', undefined, WAIT);
  return container;
}

/** intro → 임산부 모드 → 임산부 입력(screen 6) 도달까지 대기. 이 render의 container 반환. */
async function openPregnancyInput(): Promise<HTMLElement> {
  const { default: SajuApp } = await import('@/components/SajuApp');
  let container!: HTMLElement;
  await act(async () => { ({ container } = render(<SajuApp />)); });
  const scoped = within(container);
  await act(async () => { fireEvent.click(scoped.getByText('임산부 모드')); });
  // 임산부 입력 화면의 안정적 마커(산모 이름 라벨, 항상 렌더) 도달 확정
  await scoped.findByText('👩 산모 이름', undefined, WAIT);
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
  delete process.env[PREG_FLAG];
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

describe('SajuApp 궁합(compat) 출생지역 입력 flag 게이팅 (P7.3)', () => {
  // 궁합 화면은 person1+person2 카드 + (flag on 시) PlaceSelect 2개(각 ~70 option)로 렌더가 무겁다.
  // jsdom에서 기본 5s testTimeout을 넘길 수 있어 per-test timeout을 넉넉히(WAIT보다 크게) 둔다.
  it('flag off(기본): 궁합 입력에 PlaceSelect 미렌더 (A/B 모두 0)', async () => {
    delete process.env[FLAG];
    vi.resetModules();
    const c = await openCompatInput();
    expect(within(c).queryAllByText(PLACE_LABEL)).toHaveLength(0);
  }, 20000);

  it('flag on: 궁합 A/B 각각 PlaceSelect 렌더 (총 2개)', async () => {
    process.env[FLAG] = 'true';
    vi.resetModules();
    const c = await openCompatInput();
    // PlaceSelect는 A/B 2개가 같은 커밋에 마운트되므로 findAllByText(복수 허용)로 대기 후 개수 단언.
    // (findByText 단수는 2개 매칭 시 "multiple elements" 예외를 던지므로 사용 불가.)
    const found = await within(c).findAllByText(PLACE_LABEL, undefined, WAIT);
    expect(found).toHaveLength(2);
  });
});

describe('SajuApp 임산부(pregnancy) 출생지역 입력 flag 게이팅 (P7.4)', () => {
  // 엄마 PlaceSelect는 narrative 카드(PREGNANCY_NARRATIVE_UI_ENABLED) 안 + precision flag 안에 있다.
  it('precision flag off(narrative on): 엄마 PlaceSelect 미렌더', async () => {
    process.env[PREG_FLAG] = 'true'; // narrative 카드(엄마 시간/지역 입력 영역) 렌더
    delete process.env[FLAG];         // precision off
    vi.resetModules();
    const c = await openPregnancyInput();
    expect(within(c).queryAllByText(PLACE_LABEL)).toHaveLength(0);
  });

  it('precision on + narrative on: 엄마 PlaceSelect 1개만 렌더 (아기 예정엔 없음)', async () => {
    process.env[PREG_FLAG] = 'true';
    process.env[FLAG] = 'true';
    vi.resetModules();
    const c = await openPregnancyInput();
    // 엄마만 1개 — 아기 예정 영역엔 PlaceSelect를 추가하지 않았으므로 정확히 1개여야 함.
    const found = await within(c).findAllByText(PLACE_LABEL, undefined, WAIT);
    expect(found).toHaveLength(1);
  });
});
