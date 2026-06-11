// Same-Age Differentiation Guard (Safety Net V1 — item 3·4)
//
// 이 파일의 "가드" 테스트들은 **현재 코드에서 의도적으로 실패**한다(수렴 버그를 재현).
//   - 기본: it.fails 로 표시 → vitest가 "expected fail"로 보고, `npm test`는 통과(GREEN).
//     리팩터가 수렴을 없애면 assertion이 통과 → it.fails가 자동으로 빨개짐 → ".fails 떼라" 신호.
//   - 하드 레드로 보고 싶으면: `STRICT_DIFF_GUARD=1 npx vitest run ...` → 진짜 실패로 표시.
import { describe, it, expect } from 'vitest';
import {
  findConvergencePhrases, sharedConvergencePhrases, unjustifiedSharedPhrases, sharedExactStrings,
} from '../narrative/convergenceGuard';
import { FINAL_LINE_CANDIDATES } from '../narrative/topicCoverageTypes';
import { buildPersonalFortuneVerdictEvidence } from '../fortuneVerdict/fortuneVerdictEvidence';
import {
  coreOf, gptOf, plansOf, signalsOf, forcedMeanings, allForcedText, goldText, type SampleId,
} from './_abcFixtures';

// 의도된 RED 스위치: STRICT_DIFF_GUARD=1 이면 하드 실패, 아니면 expected-fail.
const guardIt = process.env.STRICT_DIFF_GUARD === '1' ? it : it.fails;

const IDS: SampleId[] = ['A', 'B', 'C'];

describe('4) same-age 통제 — 셋 다 31세', () => {
  it('A/B/C 나이가 모두 31세로 동일(나이 변수 제거됨)', () => {
    expect(coreOf('A').age).toBe(31);
    expect(coreOf('B').age).toBe(31);
    expect(coreOf('C').age).toBe(31);
  });
});

describe('3) generic phrase blocker — 근거 없이 세 차트 공통이면 FAIL (현재 RED)', () => {
  // plan 전체 강제 fact에서 근거 없이 공통 등장하는 수렴 문구.
  guardIt('plan 강제 fact: 근거 없이 공통 등장하는 수렴 문구가 없어야 한다', () => {
    const entries = IDS.map(id => ({ text: allForcedText(plansOf(id)), signals: signalsOf(id) }));
    const bad = unjustifiedSharedPhrases(entries);
    expect(bad).toEqual([]); // 현재: action-over-words, scope-and-reward 등 검출 → 실패
  });

  // 관계/돈 섹션 합성 fact가 세 차트에 동일 문자열로 공유됨.
  guardIt('관계 섹션: 세 차트에 동일한 강제문구(plainMeaning) 공유 금지', () => {
    const shared = sharedExactStrings(IDS.map(id => forcedMeanings(plansOf(id), 'relationshipLoveNarrative')));
    expect(shared).toEqual([]);
  });
  guardIt('돈 섹션: 세 차트에 동일한 강제문구(plainMeaning) 공유 금지', () => {
    const shared = sharedExactStrings(IDS.map(id => forcedMeanings(plansOf(id), 'moneyMonetizationNarrative')));
    expect(shared).toEqual([]);
  });

  // GOLD(styleExamples)는 차트 무관 상수 → 모든 차트가 같은 수렴 문구를 베낌.
  guardIt('GOLD example(openingDefinition): 근거 없는 수렴 문구가 세 차트 공통이면 안 됨', () => {
    const entries = IDS.map(id => ({ text: goldText(plansOf(id), 'openingDefinition'), signals: signalsOf(id) }));
    expect(unjustifiedSharedPhrases(entries)).toEqual([]);
  });
  guardIt('GOLD example(finalStrategy): 근거 없는 수렴 문구가 세 차트 공통이면 안 됨', () => {
    const entries = IDS.map(id => ({ text: goldText(plansOf(id), 'finalStrategyNarrative'), signals: signalsOf(id) }));
    expect(unjustifiedSharedPhrases(entries)).toEqual([]);
  });

  // 교차오염: B(신강·편재)에 신약/협업 보완 결, A(신약)에 양인·괴강 버티는 힘이 새어들면 안 됨.
  guardIt('B plan: 신약·협업 보완 결("협업")이 강제 fact로 들어오면 안 됨', () => {
    expect(allForcedText(plansOf('B'))).not.toContain('협업');
  });
});

describe('4) same-age 수렴 가드 — 나이대로 결론이 수렴하면 FAIL (현재 RED)', () => {
  // FINAL_LINE 상수 5개가 전부 "혼자 버티기 / 기준·역할" 수렴 문구.
  guardIt('FINAL_LINE_CANDIDATES 상수에 수렴 문구가 없어야 한다', () => {
    const hits = FINAL_LINE_CANDIDATES.flatMap(line => findConvergencePhrases(line));
    expect(hits).toEqual([]);
  });

  // fortuneVerdict 근거: before40(31세)이라 셋 다 "30대 판 깔기 → 40대 자산화"로 수렴.
  guardIt('fortuneVerdict breakthroughLines가 "30대 기반→40대 자산"으로 수렴하면 안 됨', () => {
    const entries = IDS.map(id => {
      const ev: any = buildPersonalFortuneVerdictEvidence(gptOf(id));
      return { text: (ev.breakthroughLines ?? []).join(' '), signals: signalsOf(id) };
    });
    // asset-after-40 / lay-the-board 가 셋 공통이면 검출
    const shared = sharedConvergencePhrases(entries.map(e => e.text));
    expect(shared.filter(id => /asset-after-40|lay-the-board/.test(id))).toEqual([]);
  });

  // wealth seed allowedClaims도 "40대 자산화"를 무조건 push → 셋 공통.
  guardIt('fortuneVerdict wealth seed가 "40대 자산화"를 무조건 담아 셋이 같으면 안 됨', () => {
    const entries = IDS.map(id => {
      const ev: any = buildPersonalFortuneVerdictEvidence(gptOf(id));
      const wealth = (ev.seeds ?? []).find((s: any) => s.verdictType === 'wealth');
      return { text: (wealth?.allowedClaims ?? []).join(' '), signals: signalsOf(id) };
    });
    expect(unjustifiedSharedPhrases(entries)).toEqual([]);
  });
});
