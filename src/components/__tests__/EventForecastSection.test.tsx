// EventForecastSection — 렌더 테스트 (줄글/타임라인형).
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EventForecastSection } from '@/components/EventForecastSection';
import type { EventForecast } from '@/domain/saju/eventForecast/eventForecastTypes';

const base: EventForecast = {
  mode: 'personal',
  title: '앞으로 들어올 큰 변화',
  lead: '2027년에 일과 관계가 동시에 움직입니다.',
  eventNarrative: ['앞으로 3년은 책임이 커지는 흐름입니다.'],
  majorEvents: [
    { timeWindow: '2027년', title: '직장 환경이 바뀌는 구간', eventType: 'work_change', forecast: '맡는 역할과 평가 기준이 달라집니다.', scene: '새 프로젝트의 책임을 맡습니다.', signalBasis: '세운 정관 활성', decisionAdvice: '권한 없이 책임만 커지면 미루세요.' },
    { timeWindow: '2028년', title: '문서·계약 정리 구간', eventType: 'contract', forecast: '서류와 자격이 일을 살립니다.', scene: '계약서를 다시 씁니다.', signalBasis: '세운 정인 활성', decisionAdvice: '조건을 다시 따지세요.' },
  ],
  closing: '큰 흐름은 정리에서 갈립니다.',
};

describe('EventForecastSection', () => {
  it('forecast 없으면 미렌더', () => {
    expect(render(<EventForecastSection forecast={undefined} />).container.firstChild).toBeNull();
    expect(render(<EventForecastSection forecast={null} />).container.firstChild).toBeNull();
  });
  it('제목/lead/도입/타임라인 사건 표시', () => {
    const { container, getByText } = render(<EventForecastSection forecast={base} />);
    expect(getByText('앞으로 들어올 큰 변화')).toBeTruthy();
    expect(container.textContent).toContain('2027년에 일과 관계');
    expect(container.textContent).toContain('직장 환경이 바뀌는 구간');
    expect(container.textContent).toContain('새 프로젝트의 책임');
    expect(container.textContent).toContain('여기서 갈리는 지점');
    expect(container.textContent).toContain('큰 흐름은 정리에서 갈립니다');
  });
  it('임산부 disclaimer 노출', () => {
    const preg: EventForecast = {
      mode: 'pregnancy', title: '엄마를 편하게 하는 흐름', lead: '엄마 중심 흐름', eventNarrative: [],
      majorEvents: [{ timeWindow: '임신 기간 전반', title: '가족 분담', eventType: 'family_child', forecast: '가족이 집안일을 나눕니다.', scene: '오늘은 내가 이걸 할게', signalBasis: 'w', decisionAdvice: 'd' }],
      closing: '', disclaimer: '건강·분만·의학적 판단은 반드시 담당 의료진의 안내를 따르세요.',
    };
    expect(render(<EventForecastSection forecast={preg} />).container.textContent).toContain('의료진');
  });
});
