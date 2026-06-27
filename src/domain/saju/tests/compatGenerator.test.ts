// 궁합 narrative V4 — Phase 5 Generator 테스트 (LLM 호출 X, MOCK caller만).
//
// 정책:
//   - 실제 GPT/OpenAI API 호출 금지. 모든 테스트는 deterministic mock caller 주입.
//   - mock caller는 BuiltCompatPrompt.sectionId로 dispatch해 섹션별 JSON 형태 + finishReason 반환.
//   - 실제 caller(createOpenAiCompatNarrativeGptCaller)는 import하지 않는다.
//   - bundle은 calculateAnalysisOnly → composeCompatibilityAnalysis로 구성 (Phase 2/3/4 동일 PAIR).
//
// 검증:
//   - happy path → highCount 0, 8개 report 필드 채워짐, evidenceView deterministic, attempts 1, repaired 비어있음.
//   - 한 섹션 non-JSON → throw 없이 그 섹션 빈 채, json-parse-failed/section-missing.
//   - 한 섹션 빈 문자열 → 동일 내성.
//   - finish=length → finish-length HIGH.
//   - repair 기본 0: repairable-high → attempts 1, repaired 비어있음.
//   - repair maxRepairAttempts:1 + bad-then-clean-on-REPAIR_MODE → 해당 섹션만 재호출, attempts 2, repaired 포함, high 감소.
//   - 6개 relationshipType 모두 throw 없이 동작 + 카드/근거 결정적.

import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { composeCompatibilityAnalysis } from '../compatibility/compatibilityAnalyzer';
import {
  generateCompatNarrativeReport,
  type CompatNarrativeGptCaller,
} from '../compatibility/narrative/generateCompatNarrativeReport';
import {
  buildCompatNarrativeContext,
  type CompatNarrativeSectionId,
  type CompatNarrativeContext,
} from '../compatibility/narrative/compatNarrativeTypes';
import { type RelationshipType } from '../compatibility/compatibilityTypes';
import type { BuiltCompatPrompt } from '../compatibility/narrative/compatPromptBuilder';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const NOW = new Date('2026-05-24T00:00:00Z');

const PAIR: { a: BirthInput; b: BirthInput } = {
  a: { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  b: { gender: 'male', calendarType: 'solar', birthDate: '1988-03-15', birthTime: '03:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
};

const ALL_TYPES: RelationshipType[] = [
  'dating', 'married', 'friendship', 'coworker', 'reunion_or_breakup', 'crush_or_something',
];

// ============================================================
// 섹션별 valid JSON 컨텐츠 (compatNarrativeValidator.test.ts buildValidMockReport 재현)
//   → 본문이 validator highCount 0 / medium 임계 미만이 되도록 구성.
//   → 유형 관심사 토큰(concern)을 type-aware 섹션에 흡수.
// ============================================================
function validSectionPayload(sectionId: CompatNarrativeSectionId, ctx: CompatNarrativeContext): any {
  const concern = ctx.focus.primaryConcerns[0];
  switch (sectionId) {
    case 'relationshipOverview':
      return {
        relationshipOverview: {
          oneLine: '닮은 결이 많아 빠르게 편해지지만 같은 자리에서 다른 기대가 드러나는 사이',
          body: '두 사람은 처음에는 결이 비슷해 빠르게 가까워지지만, 가까워질수록 같은 지점에서 서로 다른 기대가 드러나는 사이에 가깝습니다. 잘 맞을 때는 부족한 부분을 자연스럽게 채워주고, 어긋날 때는 바로 그 지점에서 답답함이 올라오기 쉽습니다.',
        },
      };
    case 'relationshipMechanism':
      return {
        relationshipMechanism: {
          body: '두 사람의 일간이 만나는 기본 기운은 한쪽이 조금 더 끌고 가는 결이라, 한 사람이 분위기를 이끄는 흐름이 자연스럽게 생깁니다. 오행으로 보면 서로 부족한 부분을 채워주는 결이 있고, 십성으로는 상대가 책임처럼 느껴지는 자리가 있습니다. 용신과 기신이 함께 자극받아 편한 기운과 부담스러운 기운이 같이 올라옵니다. 가장 가까운 자리인 일지에서는 강하게 끌어당기는 동시에 생활 리듬이 흔들리는 결이 함께 있어서, 끌어당기는 결과 흔들리는 결이 같이 옵니다. 그래서 이 관계는 거리를 잘 조절할수록 편해지는 구조입니다.',
          evidenceBlocks: [
            {
              evidence: [{ label: '일지 결', plainMeaning: '가장 가까운 자리의 맞물림', role: 'main' }],
              causalExplanation: '가까운 자리에서 끌림과 흔들림이 함께 생깁니다.',
              betweenScene: '같이 있는 시간이 길어질 때 생활 리듬에서 결이 갈리는 순간',
              positiveUse: '서로의 속도를 미리 맞춰두기',
              shadowPattern: '한쪽이 끌고 다른 쪽이 끌려가며 지치는 패턴',
              practicalAdvice: '거리와 속도를 함께 정해두기',
            },
          ],
        },
      };
    case 'attractionAndFriction':
      return {
        attractionAndFriction: {
          body: '처음에는 망설임 없이 밀고 나가는 모습에 끌리지만, 가까워지면 바로 그 단호함이 내 속도가 무시당한다는 느낌으로 바뀌기 쉽습니다. 끌렸던 특성과 부담스러운 특성이 사실 같은 뿌리에서 나오기 때문에, 그 특성을 없애려 하기보다 언제 켜고 끌지를 함께 정하는 편이 낫습니다. 함께 있는 장면에서 이 결이 자주 드러납니다.',
        },
      };
    case 'repeatedPattern':
      return {
        repeatedPattern: {
          body: `한 사람이 빠르게 풀고 싶어 다가갈 때 다른 사람은 혼자 정리할 시간이 필요해서, 다가갈수록 더 멀어지는 흐름이 반복되기 쉽습니다. 싸울 때 이 순서를 미리 알고 지금은 식히는 시간이라고 이름 붙여두면, 같은 장면이 와도 덜 흔들립니다. ${concern} 같은 부분도 이 흐름 안에서 함께 풀어가면 좋습니다.`,
        },
      };
    case 'relationshipGuide':
      return {
        relationshipGuide: {
          body: '감정이 올라온 그 자리에서 바로 풀려고 하기보다, 오늘은 여기까지 말하고 내일 이어가자처럼 한 번 끊는 약속을 미리 정해두는 편이 낫습니다. 역할도 둘 다 끌고 가려다 부딪히기보다, 결정하는 사람과 챙기는 사람을 상황별로 번갈아 맡으면 마찰이 줄어듭니다.',
        },
      };
    case 'finalAdvice':
      return {
        finalAdvice: {
          body: `이 관계는 잘 맞고 안 맞고로 나눌 관계라기보다, 서로의 속도와 거리를 어디까지 맞출 수 있는지를 보고 선택할 관계에 가깝습니다. 그 기준만 분명히 해두면 흔들림 없이 같은 방향을 볼 수 있습니다. ${concern} 관점에서도 같은 기준이 도움이 됩니다.`,
        },
      };
    default:
      return {};
  }
}

// ============================================================
// mock callers — 모두 { text, finishReason } 반환 (실제 caller import 금지)
// ============================================================

// 모든 섹션 valid JSON 반환
function makeGoodCaller(ctx: CompatNarrativeContext): CompatNarrativeGptCaller {
  return async (prompt: BuiltCompatPrompt) => ({
    text: JSON.stringify(validSectionPayload(prompt.sectionId, ctx)),
    finishReason: 'stop',
  });
}

// 특정 섹션만 non-JSON 반환 (나머지는 valid)
function makeBrokenSectionCaller(ctx: CompatNarrativeContext, broken: CompatNarrativeSectionId): CompatNarrativeGptCaller {
  return async (prompt: BuiltCompatPrompt) => {
    if (prompt.sectionId === broken) {
      return { text: '죄송합니다. 이번엔 JSON이 아니라 그냥 문장이에요.', finishReason: 'stop' };
    }
    return { text: JSON.stringify(validSectionPayload(prompt.sectionId, ctx)), finishReason: 'stop' };
  };
}

// 특정 섹션만 빈 문자열 반환
function makeEmptyStringCaller(ctx: CompatNarrativeContext, empty: CompatNarrativeSectionId): CompatNarrativeGptCaller {
  return async (prompt: BuiltCompatPrompt) => {
    if (prompt.sectionId === empty) return { text: '', finishReason: 'stop' };
    return { text: JSON.stringify(validSectionPayload(prompt.sectionId, ctx)), finishReason: 'stop' };
  };
}

// 특정 섹션만 finishReason='length' (valid JSON이지만 잘렸다고 표시)
function makeLengthCaller(ctx: CompatNarrativeContext, lengthy: CompatNarrativeSectionId): CompatNarrativeGptCaller {
  return async (prompt: BuiltCompatPrompt) => {
    const text = JSON.stringify(validSectionPayload(prompt.sectionId, ctx));
    return { text, finishReason: prompt.sectionId === lengthy ? 'length' : 'stop' };
  };
}

// relationshipMechanism 1차엔 invented-evidence(계산 안 된 신살 "도화") 위반, REPAIR_MODE면 clean.
// "도화"는 sanitizer가 보존하는 명리 신살 토큰 → validator invented-evidence HIGH 유발.
function makeRepairCaller(ctx: CompatNarrativeContext): CompatNarrativeGptCaller {
  return async (prompt: BuiltCompatPrompt) => {
    if (prompt.sectionId === 'relationshipMechanism') {
      const isRepair = prompt.user.includes('REPAIR_MODE');
      const payload = validSectionPayload('relationshipMechanism', ctx);
      if (!isRepair) {
        payload.relationshipMechanism.body += ' 두 사람 사이에는 도화 기운이 강합니다.';
      }
      return { text: JSON.stringify(payload), finishReason: 'stop' };
    }
    return { text: JSON.stringify(validSectionPayload(prompt.sectionId, ctx)), finishReason: 'stop' };
  };
}

// ============================================================
// C5-1 happy path
// ============================================================
describe('C5-1 generateCompatNarrativeReport — happy path', () => {
  it('valid mock → highCount 0, 8개 report 필드 채워짐, attempts 1, repairedSections 비어있음', async () => {
    const ctx = buildCompatNarrativeContext('dating');
    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: makeGoodCaller(ctx),
      now: NOW,
    });

    expect(res.validation.highCount).toBe(0);
    expect(res.attempts).toBe(1);
    expect(res.repairedSections.length).toBe(0);

    const r = res.report;
    // 8개 필드 모두 채워짐
    expect(r.compatibilityCard.title).toBeTruthy();
    expect(r.relationshipOverview.oneLine).toBeTruthy();
    expect(r.relationshipOverview.body).toBeTruthy();
    expect(r.relationshipMechanism.body).toBeTruthy();
    expect(r.relationshipMechanism.evidenceBlocks.length).toBeGreaterThan(0);
    expect(r.attractionAndFriction.body).toBeTruthy();
    expect(r.repeatedPattern.body).toBeTruthy();
    expect(r.relationshipGuide.body).toBeTruthy();
    expect(r.finalAdvice.body).toBeTruthy();
    expect(r.evidenceView).toBeTruthy();
  });

  it('compatibilityCard + evidenceView가 bundle에서 deterministic하게 도출됨', async () => {
    const ctx = buildCompatNarrativeContext('dating');
    const personA = calculateAnalysisOnly(PAIR.a, NOW);
    const personB = calculateAnalysisOnly(PAIR.b, NOW);
    const bundle = composeCompatibilityAnalysis(personA, personB, 'dating');

    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: makeGoodCaller(ctx),
      now: NOW,
    });

    // card는 archetype에서 (title은 그대로, keywords는 카드 칩용 정규화 적용)
    expect(res.report.compatibilityCard.title).toBe(bundle.relationshipArchetype.title);
    // keywords: 정규화된 칩 — 3~5개, 각 ≤12자, raw-fact 마커/문장끝 없음.
    const chips = res.report.compatibilityCard.keywords;
    expect(chips.length).toBeGreaterThanOrEqual(3);
    expect(chips.length).toBeLessThanOrEqual(5);
    for (const c of chips) {
      expect(c.length).toBeLessThanOrEqual(12);
      for (const m of ['상대가', '본능적으로', '결핍', '욕구', '또는']) {
        expect(c.includes(m)).toBe(false);
      }
    }

    // evidenceView는 bundle에서
    const ev = res.report.evidenceView;
    expect(ev.relationshipType).toBe('dating');
    expect(ev.relationshipTypeKo).toBe(ctx.relationshipTypeKo);
    expect(ev.archetypeTitle).toBe(bundle.relationshipArchetype.title);
    expect(ev.dayMasterRelation.relation).toBe(bundle.dayMasterRelation.relation);
    expect(ev.dayMasterRelation.balance).toBe(bundle.dayMasterRelation.balance);
    expect(ev.spousePalaceRelation.kinds).toEqual(bundle.spousePalaceRelation.relationTypes);
    expect(ev.spousePalaceRelation.intensity).toBe(bundle.spousePalaceRelation.intensity);
    expect(ev.elementComplement.aNeedsFromB).toEqual(bundle.elementComplement.aNeedsFromB);
    expect(ev.elementComplement.mutual).toBe(bundle.elementComplement.mutualComplement);
    expect(ev.combinationConflicts.combinations).toEqual(bundle.combinationConflicts.combinations);
    expect(ev.combinationConflicts.conflicts).toEqual(bundle.combinationConflicts.conflicts);
  });
});

// ============================================================
// C5-2 parse 실패 내성 (non-JSON)
// ============================================================
describe('C5-2 generateCompatNarrativeReport — non-JSON 섹션 내성', () => {
  it('한 섹션이 non-JSON → throw 없이 반환, 그 섹션 빈 채, json-parse-failed 또는 section-missing', async () => {
    const ctx = buildCompatNarrativeContext('dating');
    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: makeBrokenSectionCaller(ctx, 'attractionAndFriction'),
      now: NOW,
      maxRepairAttempts: 0,
    });

    expect(res.report).toBeTruthy();
    // 다른 섹션은 정상
    expect(res.report.relationshipOverview.body).toBeTruthy();
    // 깨진 섹션은 빈 채
    expect(res.report.attractionAndFriction.body).toBe('');
    // json-parse-failed 또는 section-missing 둘 중 하나는 그 섹션에 대해 존재
    const flagged = res.validation.issues.filter(
      i => (i.type === 'json-parse-failed' || i.type === 'section-missing') && i.sectionId === 'attractionAndFriction',
    );
    expect(flagged.length).toBeGreaterThan(0);
  });
});

// ============================================================
// C5-2b 빈 문자열 응답 내성
// ============================================================
describe('C5-2b generateCompatNarrativeReport — 빈 문자열 응답 내성', () => {
  it('한 섹션이 빈 문자열 반환 → throw 없이 반환, 그 섹션 빈 채, parse-failed/section-missing', async () => {
    const ctx = buildCompatNarrativeContext('dating');
    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: makeEmptyStringCaller(ctx, 'relationshipGuide'),
      now: NOW,
      maxRepairAttempts: 0,
    });

    expect(res.report).toBeTruthy();
    expect(res.report.relationshipOverview.body).toBeTruthy();
    expect(res.report.relationshipGuide.body).toBe('');
    const flagged = res.validation.issues.filter(
      i => (i.type === 'json-parse-failed' || i.type === 'section-missing') && i.sectionId === 'relationshipGuide',
    );
    expect(flagged.length).toBeGreaterThan(0);
  });
});

// ============================================================
// C5-3 finish=length → HIGH
// ============================================================
describe('C5-3 generateCompatNarrativeReport — finish=length HIGH', () => {
  it('한 섹션 finishReason=length → finish-length HIGH issue', async () => {
    const ctx = buildCompatNarrativeContext('dating');
    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: makeLengthCaller(ctx, 'relationshipMechanism'),
      now: NOW,
      maxRepairAttempts: 0,
    });

    const len = res.validation.issues.find(
      i => i.type === 'finish-length' && i.sectionId === 'relationshipMechanism',
    );
    expect(len).toBeTruthy();
    expect(len!.severity).toBe('high');
    expect(res.validation.highCount).toBeGreaterThan(0);
  });
});

// ============================================================
// C5-4 repair 기본 0 (maxRepairAttempts 미지정)
// ============================================================
describe('C5-4 repair 기본 0', () => {
  it('repairable high(invented 도화) + maxRepairAttempts 미지정 → attempts 1, repairedSections 비어있음', async () => {
    const ctx = buildCompatNarrativeContext('dating');
    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: makeRepairCaller(ctx),
      now: NOW,
      // maxRepairAttempts 미지정 → LIVE 기본 0
    });

    expect(res.attempts).toBe(1);
    expect(res.repairedSections).toHaveLength(0);
    expect(res.report).toBeTruthy();
    // 1차 위반이 그대로 남아 highCount > 0
    expect(res.validation.highCount).toBeGreaterThan(0);
  });
});

// ============================================================
// C5-5 repair maxRepairAttempts:1 (bad-then-clean-on-REPAIR_MODE)
// ============================================================
describe('C5-5 repair maxRepairAttempts:1', () => {
  it('relationshipMechanism 1차 위반 → repair clean → 해당 섹션만 재호출, attempts 2, repaired 포함, high 감소', async () => {
    const ctx = buildCompatNarrativeContext('dating');

    // 어떤 섹션이 재호출됐는지 추적
    const repairCalls: CompatNarrativeSectionId[] = [];
    const base = makeRepairCaller(ctx);
    const tracking: CompatNarrativeGptCaller = async (prompt, o) => {
      if (prompt.user.includes('REPAIR_MODE')) repairCalls.push(prompt.sectionId);
      return base(prompt, o);
    };

    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: tracking,
      now: NOW,
      maxRepairAttempts: 1,
    });

    expect(res.attempts).toBe(2);
    expect(res.repairedSections).toContain('relationshipMechanism');
    expect(res.validation.highCount).toBe(0);
    // 재호출은 mechanism만 (global high가 mechanism로 redirect됨)
    expect(repairCalls).toContain('relationshipMechanism');
    expect(new Set(repairCalls)).toEqual(new Set<CompatNarrativeSectionId>(['relationshipMechanism']));
  });
});

// ============================================================
// C5-7 highOnlyRepair (라이브 안전망: maxRepairAttempts 0이어도 HIGH면 1회 재생성)
// ============================================================
describe('C5-7 highOnlyRepair — HIGH 1+ 시 maxRepairAttempts 0이어도 1회 재생성', () => {
  it('highOnlyRepair:true + invented HIGH → attempts 2, mechanism repaired, highCount 0', async () => {
    const ctx = buildCompatNarrativeContext('dating');
    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: makeRepairCaller(ctx),
      now: NOW,
      // maxRepairAttempts 미지정(=0)이지만 highOnlyRepair가 1회 끌어올림
      highOnlyRepair: true,
    });

    expect(res.attempts).toBe(2);
    expect(res.repairedSections).toContain('relationshipMechanism');
    expect(res.validation.highCount).toBe(0);
  });

  it('highOnlyRepair 미설정 + invented HIGH → 게이트 OFF, attempts 1, highCount > 0', async () => {
    const ctx = buildCompatNarrativeContext('dating');
    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: makeRepairCaller(ctx),
      now: NOW,
      // highOnlyRepair 미설정 → 재생성 안 함
    });

    expect(res.attempts).toBe(1);
    expect(res.repairedSections).toHaveLength(0);
    expect(res.validation.highCount).toBeGreaterThan(0);
  });

  it('highOnlyRepair:true + HIGH 없음(happy) → 재생성 안 함, attempts 1 (지연 영향 0)', async () => {
    const ctx = buildCompatNarrativeContext('dating');
    const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, 'dating', {
      callGpt: makeGoodCaller(ctx),
      now: NOW,
      highOnlyRepair: true,
    });

    expect(res.validation.highCount).toBe(0);
    expect(res.attempts).toBe(1);
    expect(res.repairedSections).toHaveLength(0);
  });
});

// ============================================================
// C5-6 모든 relationshipType
// ============================================================
describe('C5-6 모든 relationshipType', () => {
  it('6개 유형 모두 throw 없이 동작 + 카드/근거 deterministic present', async () => {
    for (const type of ALL_TYPES) {
      const ctx = buildCompatNarrativeContext(type);
      const res = await generateCompatNarrativeReport(PAIR.a, PAIR.b, type, {
        callGpt: makeGoodCaller(ctx),
        now: NOW,
      });

      expect(res.report, `${type} report`).toBeTruthy();
      // 결정적 섹션 존재
      expect(res.report.compatibilityCard, `${type} card`).toBeTruthy();
      expect(res.report.evidenceView, `${type} evidenceView`).toBeTruthy();
      expect(res.report.evidenceView.relationshipType, `${type} ev.type`).toBe(type);
      expect(res.report.evidenceView.relationshipTypeKo, `${type} ev.typeKo`).toBe(ctx.relationshipTypeKo);
      // 본문 채워짐
      expect(res.report.relationshipMechanism.body, `${type} mechanism`).toBeTruthy();
      expect(res.validation.highCount, `${type} highCount`).toBe(0);
    }
  });
});
