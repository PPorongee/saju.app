// GptCaller 인터페이스 검증 + generatePersonalSajuReport와의 wire 확인.
// 실제 OpenAI 호출은 비용 + 비결정성 때문에 mock으로.

import { describe, it, expect, vi } from 'vitest';
import { generatePersonalSajuReport } from '../generatePersonalSajuReport';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const CASE: BirthInput = {
  gender: 'female', calendarType: 'solar',
  birthDate: '1995-07-06', birthTime: '12:00',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};

describe('generatePersonalSajuReport + mock GptCaller', () => {
  it('GptCaller가 system/user prompt를 받고 응답을 reportText로 반환', async () => {
    const calls: Array<{ system: string; user: string }> = [];
    const mockCaller = vi.fn(async ({ system, user }: { system: string; user: string }) => {
      calls.push({ system, user });
      return '# 전체 요약\n무토 일간이 한여름에 났다.\n\n# 이 사주가 평범하지 않은 이유\n승부형 + 반전형 구조.';
    });

    const r = await generatePersonalSajuReport(CASE, {
      callGpt: mockCaller,
      now: new Date('2026-05-22'),
    });

    expect(mockCaller).toHaveBeenCalledTimes(1);
    expect(calls[0].system).toContain('절대 규칙');
    expect(calls[0].user).toContain('"birthChart"');
    expect(calls[0].user).toContain('"specialPoints"');
    expect(r.reportText.length).toBeGreaterThan(0);
    expect(r.validation.isValid).toBe(true);
  });

  it('금칙 응답 → repair 재시도 1회 (maxRepairAttempts=1)', async () => {
    let count = 0;
    const mockCaller = vi.fn(async () => {
      count++;
      // 첫 응답: 금칙 포함. 두 번째: 깨끗.
      return count === 1
        ? '# 전체 요약\n노력하면 좋아질 것입니다.'
        : '# 전체 요약\n무토 일간이 한여름에 났다. 용신은 수.';
    });

    const r = await generatePersonalSajuReport(CASE, {
      callGpt: mockCaller,
      maxRepairAttempts: 1,
      now: new Date('2026-05-22'),
    });

    expect(mockCaller).toHaveBeenCalledTimes(2);
    expect(r.attempts).toBe(2);
    expect(r.validation.isValid).toBe(true);
    expect(r.reportText).toContain('용신은 수');
  });

  it('금칙 응답 + repair 시도 0 → validation.isValid=false 반환 (사용자에 검증 결과 노출)', async () => {
    const mockCaller = vi.fn(async () => '# 전체 요약\n노력하면 좋아질 것입니다.');
    const r = await generatePersonalSajuReport(CASE, {
      callGpt: mockCaller,
      maxRepairAttempts: 0,
      now: new Date('2026-05-22'),
    });
    expect(mockCaller).toHaveBeenCalledTimes(1);
    expect(r.validation.isValid).toBe(false);
    expect(r.validation.issues[0].type).toBe('generic');
  });
});
