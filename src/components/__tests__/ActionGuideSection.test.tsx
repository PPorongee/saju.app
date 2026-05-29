// ActionGuideSection — 렌더 테스트 (있으면 표시, 없으면 미렌더).
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { ActionGuideSection } from '@/components/ActionGuideSection';
import type { ActionGuide } from '@/domain/saju/actionGuide/actionGuideTypes';

const baseGuide: ActionGuide = {
  mode: 'personal',
  title: '지금 운을 쓰는 법',
  overview: '정리와 집중이 어울리는 흐름입니다.',
  domainFlows: [
    { domain: '커리어/일', flow: '흐름', opportunity: '기회설명', caution: '점검설명', suggestedAction: '행동제안' },
  ],
  decisionGuide: { goodFor: ['추진A'], beCarefulWith: ['점검B'], postponeOrScaleDown: ['미루기C'], checklist: ['체크D'] },
  remedyRoutines: { daily: ['매일루틴'], weekly: ['주간루틴'], avoidPatterns: ['피할패턴'] },
  immediateActions: ['즉시행동1', '즉시행동2'],
};

describe('ActionGuideSection', () => {
  it('guide 없으면 아무것도 렌더하지 않음 (flag-off 안전)', () => {
    const { container } = render(<ActionGuideSection guide={undefined} />);
    expect(container.firstChild).toBeNull();
    const { container: c2 } = render(<ActionGuideSection guide={null} />);
    expect(c2.firstChild).toBeNull();
  });

  it('guide 있으면 제목/개요/영역/결정/루틴/즉시행동 표시', () => {
    const { getByText, container } = render(<ActionGuideSection guide={baseGuide} />);
    expect(getByText('지금 운을 쓰는 법')).toBeTruthy();
    expect(container.textContent).toContain('정리와 집중');
    expect(container.textContent).toContain('커리어/일');
    expect(container.textContent).toContain('중요한 결정 가이드');
    expect(container.textContent).toContain('개운 루틴');
    expect(container.textContent).toContain('지금 당장 할 일');
    expect(container.textContent).toContain('즉시행동1');
  });

  it('궁합 partnerNotes의 A/B 조언을 구분해 표시', () => {
    const compat: ActionGuide = {
      mode: 'compat', title: '이 관계를 좋게 쓰는 법', overview: '관계 개요',
      partnerNotes: { aAdvice: 'A를 위한 조언', bAdvice: 'B를 위한 조언', together: ['함께해볼것'] },
      immediateActions: ['같이1'],
    };
    const { container } = render(<ActionGuideSection guide={compat} />);
    expect(container.textContent).toContain('두 사람을 위한 조언');
    expect(container.textContent).toContain('A를 위한 조언');
    expect(container.textContent).toContain('B를 위한 조언');
    expect(container.textContent).toContain('함께해볼것');
  });

  it('임산부 disclaimer를 노출하고, 출산일/택일 같은 시기 단정 텍스트는 데이터에 없으면 표시되지 않음', () => {
    const preg: ActionGuide = {
      mode: 'pregnancy', title: '엄마가 편안해지는 생활 가이드', overview: '엄마 중심 개요',
      immediateActions: ['오늘 태교1'],
      disclaimer: '건강·분만·의학적 판단은 반드시 담당 의료진의 안내를 따르세요.',
    };
    const { container } = render(<ActionGuideSection guide={preg} />);
    expect(container.textContent).toContain('의료진');
    expect(container.textContent).not.toContain('출산일은');
  });
});
