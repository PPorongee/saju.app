// FortuneVerdictSection — 렌더 테스트 (줄글형, 판정표 라벨 없음).
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FortuneVerdictSection } from '@/components/FortuneVerdictSection';
import type { FortuneVerdict } from '@/domain/saju/fortuneVerdict/fortuneVerdictTypes';

const base: FortuneVerdict = {
  mode: 'personal',
  title: '사주가 말하는 당신의 큰 운',
  lead: '이 사주는 시간이 붙을수록 커지는 축적형 사주입니다.',
  sections: [
    { title: '돈과 재물운', body: ['돈은 한 번에 터지기보다 늦게 크게 쌓이는 구조입니다.', '40대 이후 돈의 구조가 잡힙니다.'] },
    { title: '이동수와 집', body: ['집과 가족의 조건 때문에 생활권을 옮기는 흐름이 있습니다.'] },
  ],
  timingSummary: '40대 이후가 진짜 확장기입니다.',
  closing: '축적형으로 가면 늦게 크게 됩니다.',
};

describe('FortuneVerdictSection', () => {
  it('verdict 없으면 미렌더', () => {
    expect(render(<FortuneVerdictSection verdict={undefined} />).container.firstChild).toBeNull();
    expect(render(<FortuneVerdictSection verdict={null} />).container.firstChild).toBeNull();
  });
  it('제목/lead/섹션 줄글/운트이는시기 표시, 판정표 라벨 없음', () => {
    const { container, getByText } = render(<FortuneVerdictSection verdict={base} />);
    expect(getByText('사주가 말하는 당신의 큰 운')).toBeTruthy();
    expect(container.textContent).toContain('축적형 사주');
    expect(container.textContent).toContain('돈과 재물운');
    expect(container.textContent).toContain('40대 이후 돈의 구조');
    expect(container.textContent).toContain('운이 트이는 시기');
    // 판정표 잔재 없음
    expect(container.textContent).not.toMatch(/Q\.|판정\s*:|근거\s*·/);
  });
  it('임산부 disclaimer 노출', () => {
    const preg: FortuneVerdict = {
      mode: 'pregnancy', title: '엄마와 아이, 사주가 말하는 것', lead: '자녀·가족운을 봅니다.',
      sections: [{ title: '엄마 구조', body: ['엄마가 혼자 떠안기 쉬운 구조입니다.'] }, { title: '가족', body: ['가족이 나눠야 합니다.'] }],
      closing: '', disclaimer: '건강·분만·의학적 판단은 반드시 담당 의료진의 안내를 따르세요.',
    };
    expect(render(<FortuneVerdictSection verdict={preg} />).container.textContent).toContain('의료진');
  });
});
