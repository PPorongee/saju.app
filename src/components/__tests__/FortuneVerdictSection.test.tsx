// FortuneVerdictSection — 렌더 테스트.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FortuneVerdictSection } from '@/components/FortuneVerdictSection';
import type { FortuneVerdict } from '@/domain/saju/fortuneVerdict/fortuneVerdictTypes';

const base: FortuneVerdict = {
  mode: 'personal',
  title: '인생 큰 질문 판정서',
  lead: '이 사주는 횡재형이 아니라 축적형 재물운입니다.',
  verdicts: [
    { question: '돈복이 있는가?', verdict: '직책·소유·고정수입으로 늦게 크게 쌓이는 구조입니다.', strength: 'moderate', timing: '40대 이후', basis: '성실·고정형 돈 기운', whatItLooksLike: '전문성이 보상으로', caution: '단타성 투자는 맞지 않음' },
    { question: '이동수가 있는가?', verdict: '생활권 중 하나를 현실적으로 바꾸는 이동수입니다.', strength: 'strong', timing: '현재 대운', basis: '역마', whatItLooksLike: '근무지 이동', caution: '' },
  ],
  breakthroughTiming: { summary: '40대 이후 축적이 돈으로 바뀝니다.', accumulationPhase: '30대', expansionPhase: '40대' },
  closing: '축적형으로 가면 늦게 크게 됩니다.',
};

describe('FortuneVerdictSection', () => {
  it('verdict 없으면 미렌더', () => {
    expect(render(<FortuneVerdictSection verdict={undefined} />).container.firstChild).toBeNull();
    expect(render(<FortuneVerdictSection verdict={null} />).container.firstChild).toBeNull();
  });
  it('제목/lead/판정/강도/운터지는시기 표시', () => {
    const { container, getByText } = render(<FortuneVerdictSection verdict={base} />);
    expect(getByText('인생 큰 질문 판정서')).toBeTruthy();
    expect(container.textContent).toContain('축적형 재물운');
    expect(container.textContent).toContain('돈복이 있는가?');
    expect(container.textContent).toContain('판정: 보통');
    expect(container.textContent).toContain('운이 터지는 시기');
    expect(container.textContent).toContain('축적기');
  });
  it('임산부 disclaimer 노출', () => {
    const preg: FortuneVerdict = {
      mode: 'pregnancy', title: '자녀·가족운 판정', lead: '자녀운 판정', verdicts: [
        { question: '자녀운?', verdict: '한 아이에게 집중되는 그림이 강합니다.', strength: 'moderate', timing: '', basis: 'x', whatItLooksLike: 'y', caution: '' },
        { question: '가족 구조?', verdict: '엄마가 혼자 떠안기 쉬운 구조입니다.', strength: 'moderate', timing: '', basis: 'x', whatItLooksLike: 'y', caution: '' },
      ], breakthroughTiming: { summary: '' }, closing: '', disclaimer: '건강·분만·의학적 판단은 반드시 담당 의료진의 안내를 따르세요.',
    };
    expect(render(<FortuneVerdictSection verdict={preg} />).container.textContent).toContain('의료진');
  });
});
