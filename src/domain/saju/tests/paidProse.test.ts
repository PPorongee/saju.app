// Paid Report — renderPaidProse(GPT 줄글 폴리시) 테스트. 실제 OpenAI 호출 없음(mock caller).
import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { buildPaidReportV1 } from '../paidReport/buildPaidReportV1';
import { renderPaidProse } from '../paidReport/renderPaidProse';
import type { BirthInput } from '../calendar/normalizeBirthInput';
import type { GptCaller } from '../generatePersonalSajuReport';

const NOW = new Date('2026-06-06T12:00:00+09:00');
const A: BirthInput = { gender: 'female', calendarType: 'solar', birthDate: '1995-06-22', birthTime: '17:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul', birthPlace: '대전' };
const C: BirthInput = { gender: 'male', calendarType: 'solar', birthDate: '1995-05-31', birthTime: '00:30', birthTimeConfidence: 'approximate', timezone: 'Asia/Seoul', birthPlace: '경기' };

function build(input: BirthInput) {
  return buildPaidReportV1(calculateAnalysisOnly(input, NOW));
}

/** 입력 JSON({id:body})을 받아 각 body를 transform한 JSON을 돌려주는 mock caller. */
function mockCaller(transform: (id: string, body: string) => string): GptCaller {
  return async ({ user }) => {
    const m = user.match(/\{[\s\S]*\}$/);
    const obj = JSON.parse(m![0]) as Record<string, string>;
    const out: Record<string, string> = {};
    for (const [id, body] of Object.entries(obj)) out[id] = transform(id, body);
    return JSON.stringify(out);
  };
}

describe('renderPaidProse — GPT 줄글 폴리시', () => {
  it('정상: 모든 prose body가 다듬어지고 구조/검증 유지', async () => {
    const base = build(A);
    const ids = base.prose.map((s) => s.id);
    const polished = await renderPaidProse(base, mockCaller((_id, body) => `다듬음: ${body.slice(0, 10)} … 흐르는 줄글이야.`));
    expect(polished.prose.map((s) => s.id)).toEqual(ids); // 구조 유지
    expect(polished.prose.every((s) => s.body.startsWith('다듬음:'))).toBe(true);
    expect(polished.validation.highCount).toBe(0);
    // evidenceMap/모듈 보존
    expect(Object.keys(polished.evidenceMap).length).toBe(Object.keys(base.evidenceMap).length);
  });

  it('금지 클리셰 주입 → 그 섹션만 결정론 원문으로 revert', async () => {
    const base = build(A);
    const target = base.prose[0].id;
    const origBody = base.prose[0].body;
    const polished = await renderPaidProse(base, mockCaller((id, body) =>
      id === target ? '일단 기준을 세워라. 역할을 나눠라.' : `다듬음: ${body.slice(0, 8)} 흐르는 줄글.`,
    ));
    const sec = polished.prose.find((s) => s.id === target)!;
    expect(sec.body).toBe(origBody); // revert
    expect(polished.validation.highCount).toBe(0);
    // 다른 섹션은 다듬어짐
    expect(polished.prose.filter((s) => s.id !== target).every((s) => s.body.startsWith('다듬음:'))).toBe(true);
  });

  it('신약 차트(C)에 "혼자 버티는 힘" 주입 → 해당 섹션 revert', async () => {
    const base = build(C);
    const target = base.prose[0].id;
    const orig = base.prose[0].body;
    const polished = await renderPaidProse(base, mockCaller((id, body) =>
      id === target ? '너의 핵심은 혼자 버티는 힘이야.' : `다듬음: ${body.slice(0, 8)}.`,
    ));
    expect(polished.prose.find((s) => s.id === target)!.body).toBe(orig);
  });

  it('callGpt throw → 원본 그대로(폴백)', async () => {
    const base = build(A);
    const caller: GptCaller = async () => { throw new Error('network'); };
    const polished = await renderPaidProse(base, caller);
    expect(polished.prose.map((s) => s.body)).toEqual(base.prose.map((s) => s.body));
  });

  it('malformed JSON → 원본 그대로(폴백)', async () => {
    const base = build(A);
    const caller: GptCaller = async () => 'not json at all';
    const polished = await renderPaidProse(base, caller);
    expect(polished.prose.map((s) => s.body)).toEqual(base.prose.map((s) => s.body));
  });
});
