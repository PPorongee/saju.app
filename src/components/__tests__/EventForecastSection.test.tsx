// EventForecastSection — 렌더 테스트.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { EventForecastSection } from '@/components/EventForecastSection';
import type { EventForecast } from '@/domain/saju/eventForecast/eventForecastTypes';

const base: EventForecast = {
  mode: 'personal',
  headline: '운의 사건 예보',
  summary: '2027년 관계가 진전되는 흐름이 열립니다.',
  eventCards: [
    { type: 'relationship', title: '관계가 깊어지는 인연운', timeWindow: '2027년', likelihood: 'strong', eventScene: '조용한 사람이 들어옵니다', personOrSituation: '기준이 분명한 결', whyThisAppears: '세운 정관 활성', goodIf: ['생활 리듬이 맞을 때'], carefulIf: ['속도'], howToUse: '천천히 확인' },
  ],
  timingMap: { pushWindows: ['2027년'], cautionWindows: ['2028년'], preparationWindows: [] },
  watchSigns: ['관계 신호'], avoidPatterns: ['조급함'],
};

describe('EventForecastSection', () => {
  it('forecast 없으면 미렌더', () => {
    const { container } = render(<EventForecastSection forecast={undefined} />);
    expect(container.firstChild).toBeNull();
    const { container: c2 } = render(<EventForecastSection forecast={null} />);
    expect(c2.firstChild).toBeNull();
  });
  it('헤드라인/요약/타이밍맵/이벤트 카드 표시', () => {
    const { container, getByText } = render(<EventForecastSection forecast={base} />);
    expect(getByText('운의 사건 예보')).toBeTruthy();
    expect(container.textContent).toContain('2027년 관계가 진전');
    expect(container.textContent).toContain('타이밍 맵');
    expect(container.textContent).toContain('관계가 깊어지는 인연운');
    expect(container.textContent).toContain('기준이 분명한 결');
    expect(container.textContent).toContain('신호 강함');
  });
  it('임산부 disclaimer 노출', () => {
    const preg: EventForecast = {
      mode: 'pregnancy', headline: '엄마를 편하게 하는 흐름', summary: '엄마 중심 흐름',
      eventCards: [{ type: 'family', title: '가족 도움', timeWindow: '임신 기간 전반', likelihood: 'moderate', eventScene: 's', whyThisAppears: 'w', goodIf: [], carefulIf: [], howToUse: 'h' }],
      watchSigns: [], avoidPatterns: [],
      disclaimer: '건강·분만·의학적 판단은 반드시 담당 의료진의 안내를 따르세요.',
    };
    const { container } = render(<EventForecastSection forecast={preg} />);
    expect(container.textContent).toContain('의료진');
  });
});
