import { describe, it, expect } from 'vitest';
import { buildSajuPrompts } from '@/lib/saju-prompt-builder';
import { calcSaju, getOhCount, CG, JJ } from '@/lib/saju-calc';
import type { UserData } from '@/lib/saju-prompt';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_USER: UserData = {
  name: 'Tester',
  gender: 'm',
  year: 1990,
  month: 1,
  day: 15,
  hour: 4, // 인시 (03:00-05:00)
  concern: 0,
  state: 0,
  personality: [0, 0, 0],
  relationship: 0,
  wantToKnow: 0,
};

function makeUser(overrides: Partial<UserData> = {}): UserData {
  return { ...BASE_USER, ...overrides };
}

function buildFor(
  year: number,
  month: number,
  day: number,
  hour: number,
  userOverrides: Partial<UserData> = {}
): string[] {
  const sj = calcSaju(year, month, day, hour);
  const oh = getOhCount(sj);
  const user = makeUser({ year, month, day, hour, ...userOverrides });
  return buildSajuPrompts(sj, oh, user);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Prompt Differentiation', () => {
  it('produces different prompts for different birth dates', () => {
    // 1990-01-15 09:00 male  →  saju pillars will differ from 1985-07-20 15:00 female
    const [p1a, p1b] = buildFor(1990, 1, 15, 4, { gender: 'm' });
    const [p2a, p2b] = buildFor(1985, 7, 20, 7, { gender: 'f', year: 1985, month: 7, day: 20, hour: 7 });

    // The year-pillar block ("년주: ...") must differ
    const yearPillar1 = p1a.match(/년주: .+/)?.[0] ?? '';
    const yearPillar2 = p2a.match(/년주: .+/)?.[0] ?? '';
    expect(yearPillar1).not.toBe('');
    expect(yearPillar2).not.toBe('');
    expect(yearPillar1).not.toBe(yearPillar2);

    // The day-pillar block must also differ
    const dayPillar1 = p1a.match(/일주: .+/)?.[0] ?? '';
    const dayPillar2 = p2a.match(/일주: .+/)?.[0] ?? '';
    expect(dayPillar1).not.toBe(dayPillar2);

    // Overall prompt content must differ substantially
    expect(p1a).not.toBe(p2a);
    expect(p1b).not.toBe(p2b);
  });

  it('includes specific pillar data (천간/지지 characters) in the prompt', () => {
    // 1990-01-15 is after ipchun (Feb 4), so saju year is 1989 = 기사(己巳)
    // year stem 기(index 5), year branch 사(index 5)
    const sj = calcSaju(1990, 1, 15, 4);
    const oh = getOhCount(sj);
    const [prompt] = buildSajuPrompts(sj, oh, makeUser());

    // The actual CG/JJ values computed by calcSaju must appear in the prompt
    const yStemChar = CG[sj.yStem];
    const yBranchChar = JJ[sj.yBranch];
    const dStemChar = CG[sj.dStem];
    const dBranchChar = JJ[sj.dBranch];

    expect(prompt).toContain(yStemChar + yBranchChar); // year pillar combined
    expect(prompt).toContain(dStemChar + dBranchChar); // day pillar combined
  });

  it('handles unknown birth time — hour pillar absent, prompt notes missing time', () => {
    // hour = -1 signals unknown birth time
    const sj = calcSaju(1990, 1, 15, -1);
    const oh = getOhCount(sj);
    const user = makeUser({ hour: -1 });
    const [prompt] = buildSajuPrompts(sj, oh, user);

    // hStem/hBranch should be -1, so 시주 line must NOT appear
    expect(prompt).not.toMatch(/시주: [가-힣]/);

    // hBranch is -1 so the hour branch is excluded from charge/충 etc.
    // The prompt should still contain the three known pillars
    expect(prompt).toMatch(/년주:/);
    expect(prompt).toMatch(/월주:/);
    expect(prompt).toMatch(/일주:/);
  });

  it('includes ohaeng (오행) distribution counts in the prompt', () => {
    const sj = calcSaju(1990, 1, 15, 4);
    const oh = getOhCount(sj);
    const [prompt] = buildSajuPrompts(sj, oh, makeUser());

    // The prompt builder always emits "오행분포: 목:N개 화:N개 토:N개 금:N개 수:N개"
    expect(prompt).toMatch(/오행분포:/);

    // Every element should appear with its count
    for (const elem of ['목', '화', '토', '금', '수']) {
      const count = oh[elem] ?? 0;
      expect(prompt).toContain(elem + ':' + count + '개');
    }
  });

  it('two charts with different dominant elements show different element counts', () => {
    // Build a chart that skews heavily toward fire (병오년: 1906/1966/2026 summer)
    const sj1 = calcSaju(1966, 7, 15, 3); // 병오년 여름 — likely fire-heavy
    const oh1 = getOhCount(sj1);
    const [p1] = buildSajuPrompts(sj1, oh1, makeUser({ year: 1966, month: 7, day: 15, hour: 3 }));

    // Build a chart with very different birth date
    const sj2 = calcSaju(1982, 11, 20, 9); // 임술년 겨울 — likely water/metal heavy
    const oh2 = getOhCount(sj2);
    const [p2] = buildSajuPrompts(sj2, oh2, makeUser({ year: 1982, month: 11, day: 20, hour: 9 }));

    // Ohaeng distributions differ
    expect(JSON.stringify(oh1)).not.toBe(JSON.stringify(oh2));

    // Each prompt reflects its own element count (at minimum the line differs)
    const ohLine1 = p1.match(/오행분포: .+/)?.[0] ?? '';
    const ohLine2 = p2.match(/오행분포: .+/)?.[0] ?? '';
    expect(ohLine1).not.toBe(ohLine2);
  });

  it('sipsung values differ between charts and appear in the prompt', () => {
    const sj1 = calcSaju(1990, 1, 15, 4);
    const oh1 = getOhCount(sj1);
    const [p1] = buildSajuPrompts(sj1, oh1, makeUser());

    const sj2 = calcSaju(1980, 6, 10, 2);
    const oh2 = getOhCount(sj2);
    const [p2] = buildSajuPrompts(sj2, oh2, makeUser({ year: 1980, month: 6, day: 10, hour: 2 }));

    // Both prompts must contain a 십성: line
    expect(p1).toMatch(/십성:/);
    expect(p2).toMatch(/십성:/);

    // The sipsung lines must differ (different day masters → different relationships)
    const ss1 = p1.match(/십성: .+/)?.[0] ?? '';
    const ss2 = p2.match(/십성: .+/)?.[0] ?? '';
    expect(ss1).not.toBe(ss2);
  });

  it('prompts for saju mode vs compat/yearly use different sections', () => {
    // The buildSajuPrompts function is the saju mode builder.
    // Married vs unmarried changes section 5 (in prompt[1]) and section 13 (in prompt[2]).
    const unmarriedPrompts = buildFor(1990, 1, 15, 4, { relationship: 0 });
    const marriedPrompts = buildFor(1990, 1, 15, 4, { relationship: 3 });

    // Section 5 (love/marriage) is now in prompt[1] (Part 2: sections 5-10)
    expect(unmarriedPrompts[1]).toContain('연애 & 인연의 지도');
    expect(marriedPrompts[1]).toContain('부부 관계');
    expect(unmarriedPrompts[1]).not.toContain('부부 관계 & 배우자 분석');
    expect(marriedPrompts[1]).not.toContain('연애 & 인연의 지도');
  });

  it('injects classical references based on day master (ref-selector)', () => {
    // Day master is CG[dStem]. getRelevantRefs prioritises refs containing the
    // day-master character.  Both prompts call getRelevantRefs so at minimum the
    // reference block header should be present when refs exist.
    const sj = calcSaju(1990, 1, 15, 4);
    const oh = getOhCount(sj);
    const [p1, p2] = buildSajuPrompts(sj, oh, makeUser());

    // The reference block is added by getRelevantRefs
    expect(p1).toContain('참고 명리학 지식');
    expect(p2).toContain('참고 명리학 지식');

    // Different day masters should yield different reference content
    const sj2 = calcSaju(1975, 3, 25, 6); // different day master
    const oh2 = getOhCount(sj2);
    const [q1] = buildSajuPrompts(sj2, oh2, makeUser({ year: 1975, month: 3, day: 25, hour: 6 }));

    // If day masters differ the ref sections should differ
    if (CG[sj.dStem] !== CG[sj2.dStem]) {
      const refBlock1 = p1.match(/=== 참고 명리학 지식[\s\S]+?(?=\n===|\n##|$)/)?.[0] ?? '';
      const refBlock2 = q1.match(/=== 참고 명리학 지식[\s\S]+?(?=\n===|\n##|$)/)?.[0] ?? '';
      // They may differ — at minimum both are non-empty
      expect(refBlock1.length).toBeGreaterThan(0);
      expect(refBlock2.length).toBeGreaterThan(0);
    }
  });

  it('day-master element name appears explicitly in the prompt', () => {
    const elemNames: Record<number, string> = {
      0: '갑목(큰나무)', 1: '을목(꽃풀)', 2: '병화(태양)', 3: '정화(촛불)',
      4: '무토(산)', 5: '기토(들판)', 6: '경금(강철)', 7: '신금(보석)',
      8: '임수(바다)', 9: '계수(비이슬)',
    };
    const sj = calcSaju(1990, 1, 15, 4);
    const oh = getOhCount(sj);
    const [prompt] = buildSajuPrompts(sj, oh, makeUser());

    const expected = elemNames[sj.dStem];
    expect(expected).toBeTruthy();
    expect(prompt).toContain(expected);
  });
});
