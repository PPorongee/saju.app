// 임산부 모드 V4 — Pregnancy Narrative 종합 테스트 (LLM 호출 X, MOCK caller만).
//
// 정책:
//   - 실제 GPT/OpenAI API 호출 금지. deterministic mock caller 주입.
//   - 실제 caller(createOpenAiPregnancyNarrativeGptCaller)는 import하지 않는다.
//
// 검증:
//   - happy path → highCount 0, 결정적3+LLM7 채워짐, disclaimer 존재, 태명 3~5, evidenceView.
//   - 예정시간 unknown(3주) / 입력(참고) 분기.
//   - non-JSON / 빈 문자열 / finish=length 내성.
//   - repair 기본 0 / repair 1.
//   - sanitizer: 의료/출산일/성별/엄마탓/운명 표현 제거.
//   - validator: 위반 주입 시 HIGH 발생.
//   - 태명 풀 결정적 선정.
//   - server flags + request validation.
//   - types 기본값.

import { describe, it, expect } from 'vitest';
import {
  generatePregnancyNarrativeReport,
  type PregnancyNarrativeGptCaller,
} from '../pregnancy/narrative/generatePregnancyNarrativeReport';
import type { BuiltPregnancyPrompt } from '../pregnancy/narrative/pregnancyPromptBuilder';
import type { PregnancyNarrativeSectionId, PregnancyNarrativeReport } from '../pregnancy/narrative/pregnancyNarrativeTypes';
import {
  PREGNANCY_NARRATIVE_LLM_SECTION_IDS,
  PREGNANCY_NARRATIVE_DETERMINISTIC_SECTION_IDS,
  PREGNANCY_NARRATIVE_DEFAULTS,
  PREGNANCY_DISCLAIMER,
} from '../pregnancy/narrative/pregnancyNarrativeTypes';
import {
  applyPregnancyFinalSanitizers, sanitizeBirthHealthAndGender,
  sanitizeBirthDateDetermination, sanitizeMotherBlame, sanitizeMedicalAdvice,
} from '../pregnancy/narrative/pregnancySanitizer';
import { validatePregnancyNarrativeReport } from '../pregnancy/narrative/pregnancyNarrativeValidator';
import { composePregnancyAnalysis } from '../pregnancy/narrative/pregnancyMomBabyAnalyzer';
import { buildTaegyoPlan } from '../pregnancy/narrative/pregnancyTaegyoMapper';
import { selectBabyNames } from '../pregnancy/narrative/pregnancyBabyNamePool';
import { buildPregnancyNarrativePlans } from '../pregnancy/narrative/pregnancyPlanBuilder';
import { buildPregnancyNarrativeContext } from '../pregnancy/narrative/pregnancyNarrativeTypes';
import {
  normalizePregnancyNarrativeServerFlags,
  validatePregnancyNarrativeRequestBody,
  resolveLivePregnancyRepairAttempts,
} from '../pregnancy/narrative/pregnancyNarrativeServerFlags';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const NOW = new Date('2026-05-27T00:00:00Z');

const MOM: BirthInput = { name: '산모', gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' };
const BABY_NO_TIME: BirthInput = { name: '아기', gender: 'unknown', calendarType: 'solar', birthDate: '2026-09-15', birthTimeConfidence: 'unknown', timezone: 'Asia/Seoul' };
const BABY_WITH_TIME: BirthInput = { name: '아기', gender: 'unknown', calendarType: 'solar', birthDate: '2026-09-15', birthTime: '03:30', birthTimeConfidence: 'approximate', timezone: 'Asia/Seoul' };

// ============================================================
// 섹션별 valid JSON payload — validator highCount 0 / medium 낮게.
//   금지 토큰(반드시/무조건/운명/조산/유산/아들/딸/영양/병원 대신 등) 미포함.
// ============================================================
function validSectionPayload(sectionId: PregnancyNarrativeSectionId): any {
  switch (sectionId) {
    case 'openingConnection':
      return {
        openingConnection: {
          oneLine: '출생예정일 기준으로 보면, 엄마의 차분한 결 위에 잔잔한 변화를 더해주는 아이로 다가오는 흐름이에요',
          body: '출생예정일 기준으로 보면, 두 사람이 만나는 결은 부드럽게 이어집니다. 아이는 엄마의 삶에 새로운 리듬을 살며시 더해주는 의미로 다가올 수 있어요. 아직 확정된 것은 아니지만 지금의 기운만으로도 따뜻한 연결이 느껴집니다.',
        },
      };
    case 'motherChildMechanism':
      return {
        motherChildMechanism: {
          body: '엄마와 아이의 일간이 만나는 기본 기운을 보면, 엄마가 아이에게 안정된 바탕을 내어주기 쉬운 결입니다. 오행으로 보면 엄마에게 옅은 기운을 아이 쪽이 부드럽게 채워주는 보완의 자리가 있고, 용신으로 보면 엄마에게 편안한 기운이 함께 살아납니다. 끌어당기는 결과 조정이 필요한 결이 함께 있어서, 태교에서는 무리해서 채우기보다 잔잔하게 곁에 두는 정도가 잘 맞습니다.',
          evidenceBlocks: [
            {
              evidence: [{ label: '엄마 용신', plainMeaning: '엄마에게 편안한 기운', role: 'main' }],
              causalExplanation: '엄마에게 편안한 기운을 아이 쪽 결이 채워주는 자리가 있습니다.',
              betweenScene: '두 사람의 속도가 다를 때 마음이 분주해지는 순간',
              positiveUse: '엄마가 편안한 리듬을 먼저 챙길 때 연결이 부드러워집니다.',
              shadowPattern: '무리해서 다 채우려 할 때 마음이 지치기 쉬운 결',
              taegyoAdvice: '잔잔한 리듬을 곁에 두는 정도로 충분합니다.',
            },
          ],
        },
      };
    case 'motherComfortRhythm':
      return {
        motherComfortRhythm: {
          body: '엄마는 웬만하면 괜찮다고 말하며 혼자 끌어안기 쉬운 결이라 마음의 짐이 조용히 쌓이기 쉬워요. 엄마에게 편안한 기운을 채우는 조용한 환경에서 마음이 놓이기 쉽고, 버겁다 싶을 때 도움을 먼저 청하는 연습이 큰 힘이 됩니다. 용신으로 보면 그런 결을 채우는 시간이 도움이 됩니다.',
        },
      };
    case 'babyEnergyAndFit':
      return {
        babyEnergyAndFit: {
          body: '출생예정일 기준으로 보면, 아이는 자기 결이 또렷하게 드러나는 기운이 보입니다. 물론 실제 출생일과 시간에 따라 달라질 수 있어요. 엄마의 차분함과는 결이 조금 달라 보이는데, 그래서 서로의 부족한 부분을 채워주기 좋은 조합이라 태교에서는 아이의 결을 안전하게 펼칠 자리를 만들어주는 방향이 잘 맞아요.',
        },
      };
    case 'taegyoGuide':
      return {
        taegyoGuide: {
          body: '이 조합에서는 채우는 양보다 엄마가 편안하게 이어갈 수 있는지가 더 중요해요. 엄마에게 도움이 되는 결을 살리는 잔잔한 음악과 짧은 기록, 아이 예정일 기운과 어울리는 짧은 산책, 그리고 두 사람 사이를 부드럽게 잇는 조용한 대화를 부담 없이 곁에 두는 정도가 잘 맞습니다.',
        },
      };
    case 'motherFortuneRoutine':
      return {
        motherFortuneRoutine: {
          body: '엄마에게는 마음을 가라앉히는 기운이 도움이 되는 구조라, 잔잔한 음악을 곁에 두고 하루의 감정을 짧게 적어 흘려보내는 시간이 도움이 됩니다. 무언가를 더 들이기보다 주변을 조금 정리하고 조용한 자리를 만드는 행동이 마음의 압력을 낮춰줘요.',
        },
      };
    case 'familySupportAndFinalMessage':
      return {
        familySupportAndFinalMessage: {
          body: '엄마는 힘들다는 말을 바로 꺼내기보다 괜찮다고 버티기 쉬운 결이라, 주변에서는 필요하면 말해보다 오늘은 내가 이걸 할게처럼 구체적인 도움을 먼저 건네는 편이 좋아요. 역할을 미리 나눠두면 엄마가 한결 편안해집니다.',
          finalMessage: '너는 엄마에게, 조금 더 천천히 가도 괜찮다는 걸 알려주러 오는 작은 별일지도 몰라요.',
        },
      };
    default:
      return {};
  }
}

function makeGoodCaller(): PregnancyNarrativeGptCaller {
  return async (prompt: BuiltPregnancyPrompt) => ({
    text: JSON.stringify(validSectionPayload(prompt.sectionId)),
    finishReason: 'stop',
  });
}
function makeBrokenCaller(broken: PregnancyNarrativeSectionId): PregnancyNarrativeGptCaller {
  return async (prompt: BuiltPregnancyPrompt) => {
    if (prompt.sectionId === broken) return { text: '죄송합니다. JSON이 아니라 그냥 문장이에요.', finishReason: 'stop' };
    return { text: JSON.stringify(validSectionPayload(prompt.sectionId)), finishReason: 'stop' };
  };
}
function makeEmptyCaller(empty: PregnancyNarrativeSectionId): PregnancyNarrativeGptCaller {
  return async (prompt: BuiltPregnancyPrompt) => {
    if (prompt.sectionId === empty) return { text: '', finishReason: 'stop' };
    return { text: JSON.stringify(validSectionPayload(prompt.sectionId)), finishReason: 'stop' };
  };
}
function makeLengthCaller(lengthy: PregnancyNarrativeSectionId): PregnancyNarrativeGptCaller {
  return async (prompt: BuiltPregnancyPrompt) => ({
    text: JSON.stringify(validSectionPayload(prompt.sectionId)),
    finishReason: prompt.sectionId === lengthy ? 'length' : 'stop',
  });
}
// mechanism 1차엔 invented(계산 안 된 신살 "도화") 위반, REPAIR_MODE면 clean.
function makeRepairCaller(): PregnancyNarrativeGptCaller {
  return async (prompt: BuiltPregnancyPrompt) => {
    if (prompt.sectionId === 'motherChildMechanism') {
      const isRepair = prompt.user.includes('REPAIR_MODE');
      const payload = validSectionPayload('motherChildMechanism');
      if (!isRepair) payload.motherChildMechanism.body += ' 두 사람 사이에는 도화 기운이 함께 보입니다.';
      return { text: JSON.stringify(payload), finishReason: 'stop' };
    }
    return { text: JSON.stringify(validSectionPayload(prompt.sectionId)), finishReason: 'stop' };
  };
}

// ============================================================
// P9-1 happy path
// ============================================================
describe('P9-1 generatePregnancyNarrativeReport — happy path', () => {
  it('valid mock → highCount 0, 결정적3+LLM7 채워짐, disclaimer, 태명 3~5, attempts 1', async () => {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeGoodCaller(), now: NOW });

    expect(res.validation.highCount).toBe(0);
    expect(res.validation.isValid).toBe(true);
    expect(res.attempts).toBe(1);
    expect(res.repairedSections.length).toBe(0);

    const r = res.report;
    // LLM 7
    expect(r.openingConnection.oneLine).toBeTruthy();
    expect(r.openingConnection.body).toBeTruthy();
    expect(r.motherChildMechanism.body).toBeTruthy();
    expect(r.motherChildMechanism.evidenceBlocks.length).toBeGreaterThan(0);
    expect(r.motherComfortRhythm.body).toBeTruthy();
    expect(r.babyEnergyAndFit.body).toBeTruthy();
    expect(r.taegyoGuide.body).toBeTruthy();
    expect(r.motherFortuneRoutine.body).toBeTruthy();
    expect(r.familySupportAndFinalMessage.body).toBeTruthy();
    expect(r.familySupportAndFinalMessage.finalMessage).toBeTruthy();
    // 결정적 3
    expect(r.motherBabyCard.title).toBeTruthy();
    expect(r.motherBabyCard.keywords.length).toBeGreaterThanOrEqual(3);
    expect(r.motherBabyCard.keywords.length).toBeLessThanOrEqual(5);
    expect(r.motherBabyCard.taegyoDirection).toBeTruthy();
    expect(r.babyNames.candidates.length).toBeGreaterThanOrEqual(3);
    expect(r.babyNames.candidates.length).toBeLessThanOrEqual(5);
    for (const c of r.babyNames.candidates) {
      expect(c.name).toBeTruthy();
      expect(c.reason).toBeTruthy();
      expect(c.elementKo).toBeTruthy();
    }
    expect(r.evidenceView.mother.dayMaster).toBeTruthy();
    expect(r.evidenceView.baby.dueDateLabel).toContain('2026');
    // disclaimer 보장
    expect(r.disclaimer).toBe(PREGNANCY_DISCLAIMER);
    expect(r.disclaimer).toContain('의료진');
  });

  it('예정시간 unknown → threeWeekBasis true / 입력 시 false', async () => {
    const a = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeGoodCaller(), now: NOW });
    expect(a.report.evidenceView.baby.threeWeekBasis).toBe(true);
    expect(a.report.evidenceView.baby.hourKnown).toBe(false);

    const b = await generatePregnancyNarrativeReport(MOM, BABY_WITH_TIME, { callGpt: makeGoodCaller(), now: NOW });
    expect(b.report.evidenceView.baby.threeWeekBasis).toBe(false);
    expect(b.report.evidenceView.baby.hourKnown).toBe(true);
  });
});

// ============================================================
// P9-2 내성
// ============================================================
describe('P9-2 generatePregnancyNarrativeReport — 내성', () => {
  it('non-JSON 섹션 → throw 없이, 빈 채, parse-failed/section-missing', async () => {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeBrokenCaller('taegyoGuide'), now: NOW });
    expect(res.report.openingConnection.body).toBeTruthy();
    expect(res.report.taegyoGuide.body).toBe('');
    const flagged = res.validation.issues.filter(i => (i.type === 'json-parse-failed' || i.type === 'section-missing') && i.sectionId === 'taegyoGuide');
    expect(flagged.length).toBeGreaterThan(0);
  });
  it('빈 문자열 섹션 → 동일 내성', async () => {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeEmptyCaller('motherComfortRhythm'), now: NOW });
    expect(res.report.motherComfortRhythm.body).toBe('');
    const flagged = res.validation.issues.filter(i => (i.type === 'json-parse-failed' || i.type === 'section-missing') && i.sectionId === 'motherComfortRhythm');
    expect(flagged.length).toBeGreaterThan(0);
  });
  it('finish=length → finish-length HIGH', async () => {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeLengthCaller('motherChildMechanism'), now: NOW });
    const len = res.validation.issues.find(i => i.type === 'finish-length' && i.sectionId === 'motherChildMechanism');
    expect(len).toBeTruthy();
    expect(res.validation.highCount).toBeGreaterThan(0);
  });
});

// ============================================================
// P9-3 repair
// ============================================================
describe('P9-3 repair', () => {
  it('repair 기본 0 → attempts 1, high 잔존', async () => {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeRepairCaller(), now: NOW });
    expect(res.attempts).toBe(1);
    expect(res.repairedSections).toHaveLength(0);
    expect(res.validation.highCount).toBeGreaterThan(0);
  });
  it('repair 1 → mechanism만 재호출, attempts 2, high 0', async () => {
    const repairCalls: PregnancyNarrativeSectionId[] = [];
    const base = makeRepairCaller();
    const tracking: PregnancyNarrativeGptCaller = async (prompt, o) => {
      if (prompt.user.includes('REPAIR_MODE')) repairCalls.push(prompt.sectionId);
      return base(prompt, o);
    };
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: tracking, now: NOW, maxRepairAttempts: 1 });
    expect(res.attempts).toBe(2);
    expect(res.repairedSections).toContain('motherChildMechanism');
    expect(res.validation.highCount).toBe(0);
    expect(new Set(repairCalls)).toEqual(new Set<PregnancyNarrativeSectionId>(['motherChildMechanism']));
  });
});

// ============================================================
// P9-3b highOnlyRepair (라이브 안전망: maxRepairAttempts 0이어도 HIGH면 1회 재생성 → 422 차단 전 마지막 기회)
// ============================================================
describe('P9-3b highOnlyRepair', () => {
  it('highOnlyRepair:true + invented HIGH → attempts 2, mechanism repaired, high 0', async () => {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, {
      callGpt: makeRepairCaller(), now: NOW, highOnlyRepair: true,
      // maxRepairAttempts 미지정(=0)이지만 highOnlyRepair가 1회 끌어올림
    });
    expect(res.attempts).toBe(2);
    expect(res.repairedSections).toContain('motherChildMechanism');
    expect(res.validation.highCount).toBe(0);
  });
  it('highOnlyRepair 미설정 + invented HIGH → 게이트 OFF, attempts 1, high 잔존', async () => {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeRepairCaller(), now: NOW });
    expect(res.attempts).toBe(1);
    expect(res.repairedSections).toHaveLength(0);
    expect(res.validation.highCount).toBeGreaterThan(0);
  });
  it('highOnlyRepair:true + HIGH 없음(happy) → 재생성 안 함, attempts 1 (지연 영향 0)', async () => {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeGoodCaller(), now: NOW, highOnlyRepair: true });
    expect(res.validation.highCount).toBe(0);
    expect(res.attempts).toBe(1);
    expect(res.repairedSections).toHaveLength(0);
  });
});

// ============================================================
// P9-4 sanitizer
// ============================================================
describe('P9-4 sanitizer', () => {
  it('의료/약/운동 처방 완화', () => {
    expect(sanitizeMedicalAdvice('영양제를 꼭 챙겨 드세요.')).not.toContain('영양제를 꼭 챙겨 드세요');
    expect(sanitizeMedicalAdvice('매일 30분 이상 걷기 운동을 하세요.')).not.toMatch(/30분 이상 걷기 운동을 하세요/);
  });
  it('성별/조산/순산 제거', () => {
    expect(sanitizeBirthHealthAndGender('아기는 아들입니다.')).not.toContain('아들입니다');
    expect(sanitizeBirthHealthAndGender('순산합니다.')).not.toContain('순산합니다');
  });
  it('출산일 결정/택일 제거', () => {
    expect(sanitizeBirthDateDetermination('이 날 낳으면 좋아요.')).not.toContain('이 날 낳으면 좋');
    expect(sanitizeBirthDateDetermination('최고의 출산일은 9월입니다.')).not.toContain('최고의 출산일');
  });
  it('엄마 탓 완화', () => {
    expect(sanitizeMotherBlame('엄마가 약해서 아이에게 안 좋아요.')).not.toContain('아이에게 안 좋');
    expect(sanitizeMotherBlame('이건 엄마 탓이에요.')).not.toContain('엄마 탓');
  });
  it('체인: 운명/반드시/영문오행 정리', () => {
    const out = applyPregnancyFinalSanitizers('이 아이는 wood 기운이고 반드시 천재 아이입니다.');
    expect(out).not.toMatch(/\bwood\b/);
    expect(out).not.toContain('반드시');
    expect(out).not.toContain('천재 아이');
  });
});

// ============================================================
// P9-5 validator — 위반 주입 시 HIGH
// ============================================================
describe('P9-5 validator HIGH', () => {
  function ctxBundlePlans() {
    const mother = calculateAnalysisOnly(MOM, NOW);
    const baby = calculateAnalysisOnly(BABY_NO_TIME, NOW);
    const bundle = composePregnancyAnalysis(mother, baby);
    const taegyoPlan = buildTaegyoPlan(bundle);
    const ctx = buildPregnancyNarrativeContext({ dueDateLabel: '2026년 9월 15일', babyTimeConfidence: 'unknown', motherTimeConfidence: 'exact', motherName: '산모' });
    const plans = buildPregnancyNarrativePlans(bundle, taegyoPlan, ctx);
    return { bundle, plans, ctx };
  }
  async function baseReport(): Promise<PregnancyNarrativeReport> {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeGoodCaller(), now: NOW });
    expect(res.validation.highCount).toBe(0);
    return JSON.parse(JSON.stringify(res.report));
  }

  it('성별 예측 주입 → gender-prediction HIGH', async () => {
    const { bundle, plans, ctx } = ctxBundlePlans();
    const report = await baseReport();
    report.babyEnergyAndFit.body += ' 아기는 딸로 보입니다.';
    const v = validatePregnancyNarrativeReport({ report, bundle, plans, ctx });
    expect(v.issues.some(i => i.type === 'gender-prediction' && i.severity === 'high')).toBe(true);
    expect(v.highCount).toBeGreaterThan(0);
  });
  it('출산일 결정 주입 → birth-date-determination-claim HIGH', async () => {
    const { bundle, plans, ctx } = ctxBundlePlans();
    const report = await baseReport();
    report.familySupportAndFinalMessage.body += ' 9월 20일에 낳으세요.';
    const v = validatePregnancyNarrativeReport({ report, bundle, plans, ctx });
    expect(v.issues.some(i => i.type === 'birth-date-determination-claim')).toBe(true);
  });
  it('조산/유산 언급 → miscarriage-or-preterm-claim HIGH', async () => {
    const { bundle, plans, ctx } = ctxBundlePlans();
    const report = await baseReport();
    report.motherComfortRhythm.body += ' 조산 위험이 있습니다.';
    const v = validatePregnancyNarrativeReport({ report, bundle, plans, ctx });
    expect(v.issues.some(i => i.type === 'miscarriage-or-preterm-claim')).toBe(true);
  });
  it('disclaimer 누락 → HIGH', async () => {
    const { bundle, plans, ctx } = ctxBundlePlans();
    const report = await baseReport();
    report.disclaimer = '';
    const v = validatePregnancyNarrativeReport({ report, bundle, plans, ctx });
    expect(v.highCount).toBeGreaterThan(0);
  });
  it('recall 보강: 공주님/철분제/출산하면 좋다/천재 단독/남아 → 각 HIGH', async () => {
    const { bundle, plans, ctx } = ctxBundlePlans();
    const cases: Array<[string, string]> = [
      ['이 아이는 공주님 기운이 가득해요.', 'gender-prediction'],
      ['아기는 남아입니다.', 'gender-prediction'],
      ['엄마는 철분제를 챙겨 드세요.', 'medical-advice-risk'],
      ['이 날 출산하면 좋아요.', 'birth-date-determination-claim'],
      ['이 아이는 천재예요.', 'fatalistic-claim'],
    ];
    for (const [inject, type] of cases) {
      const report = await baseReport();
      report.babyEnergyAndFit.body += ' ' + inject;
      const v = validatePregnancyNarrativeReport({ report, bundle, plans, ctx });
      expect(v.issues.some(i => i.type === type), `"${inject}" → ${type}`).toBe(true);
    }
  });
  it('정상 산모 표현은 오탐 없음: "산모는 여성으로서"/"엄마 같은 마음" → high 0 유지', async () => {
    const { bundle, plans, ctx } = ctxBundlePlans();
    const report = await baseReport();
    report.motherComfortRhythm.body += ' 산모는 여성으로서 엄마 같은 마음을 지니고 있어요.';
    const v = validatePregnancyNarrativeReport({ report, bundle, plans, ctx });
    expect(v.highCount).toBe(0);
  });
});

// ============================================================
// P9-6 태명 풀 결정적
// ============================================================
describe('P9-6 태명 풀', () => {
  it('selectBabyNames → 3~5개, name/element/image/reason 채움, 중복 없음', () => {
    const mother = calculateAnalysisOnly(MOM, NOW);
    const baby = calculateAnalysisOnly(BABY_NO_TIME, NOW);
    const bundle = composePregnancyAnalysis(mother, baby);
    const { candidates, prioritizedElements } = selectBabyNames(bundle);
    expect(candidates.length).toBeGreaterThanOrEqual(3);
    expect(candidates.length).toBeLessThanOrEqual(5);
    const names = candidates.map(c => c.name);
    expect(new Set(names).size).toBe(names.length); // 중복 없음
    for (const c of candidates) {
      expect(c.name).toBeTruthy();
      expect(c.image).toBeTruthy();
      expect(c.reason).toBeTruthy();
    }
    expect(prioritizedElements.length).toBeGreaterThan(0);
  });
  it('동일 입력 → 동일 결과 (결정적)', () => {
    const mother = calculateAnalysisOnly(MOM, NOW);
    const baby = calculateAnalysisOnly(BABY_NO_TIME, NOW);
    const b1 = composePregnancyAnalysis(mother, baby);
    const b2 = composePregnancyAnalysis(mother, baby);
    expect(selectBabyNames(b1).candidates.map(c => c.name)).toEqual(selectBabyNames(b2).candidates.map(c => c.name));
  });
});

// ============================================================
// P9-7 server flags / request validation / types 기본값
// ============================================================
describe('P9-7 server flags & types', () => {
  it('flag 기본 OFF', () => {
    expect(PREGNANCY_NARRATIVE_DEFAULTS.apiEnabled).toBe(false);
    expect(PREGNANCY_NARRATIVE_DEFAULTS.uiEnabled).toBe(false);
    expect(normalizePregnancyNarrativeServerFlags({}).apiEnabled).toBe(false);
    expect(normalizePregnancyNarrativeServerFlags({ PREGNANCY_NARRATIVE_API_ENABLED: 'true' }).apiEnabled).toBe(true);
    expect(normalizePregnancyNarrativeServerFlags({ PREGNANCY_NARRATIVE_API_ENABLED: 'false' }).apiEnabled).toBe(false);
  });
  it('verifySecret 정규화', () => {
    expect(normalizePregnancyNarrativeServerFlags({}).verifySecret).toBeUndefined();
    expect(normalizePregnancyNarrativeServerFlags({ PREGNANCY_NARRATIVE_VERIFY_SECRET: 'x' }).verifySecret).toBe('x');
  });
  it('repair attempts 정규화', () => {
    expect(resolveLivePregnancyRepairAttempts(undefined)).toBe(0);
    expect(resolveLivePregnancyRepairAttempts(5)).toBe(2);
    expect(resolveLivePregnancyRepairAttempts(1)).toBe(1);
    expect(resolveLivePregnancyRepairAttempts(-3)).toBe(0);
  });
  it('request body 검증', () => {
    expect(validatePregnancyNarrativeRequestBody(null).ok).toBe(false);
    expect(validatePregnancyNarrativeRequestBody({}).ok).toBe(false);
    expect(validatePregnancyNarrativeRequestBody({ momInput: { birthDate: '1995-07-06', timezone: 'Asia/Seoul' } }).ok).toBe(false);
    expect(validatePregnancyNarrativeRequestBody({
      momInput: { birthDate: '1995-07-06', timezone: 'Asia/Seoul' },
      babyDueInput: { birthDate: '2026-09-15', timezone: 'Asia/Seoul' },
    }).ok).toBe(true);
  });
  it('섹션 id 구성: LLM 7 + 결정적 3', () => {
    expect(PREGNANCY_NARRATIVE_LLM_SECTION_IDS.length).toBe(7);
    expect(PREGNANCY_NARRATIVE_DETERMINISTIC_SECTION_IDS.length).toBe(3);
  });
});

// ============================================================
// P9-8 산모 gender=female 반영
// ============================================================
describe('P9-8 산모 gender=female', () => {
  it('gender=female이 분석 input에 반영됨', () => {
    const female = calculateAnalysisOnly({ ...MOM, gender: 'female' }, NOW);
    expect(female.userContext.gender).toBe('female');
  });
  it('성별이 대운(순행/역행)에 영향 — female vs male이면 대운 흐름이 달라짐', () => {
    const female = calculateAnalysisOnly({ ...MOM, gender: 'female' }, NOW);
    const male = calculateAnalysisOnly({ ...MOM, gender: 'male' }, NOW);
    // 같은 생일이라도 성별에 따라 대운 방향이 갈리므로 fortune 전체가 달라야 한다.
    expect(JSON.stringify(female.fortune)).not.toBe(JSON.stringify(male.fortune));
  });
  it('generate 결과 bundle.mother가 female로 분석됨', async () => {
    const res = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeGoodCaller(), now: NOW });
    expect(res.bundle.mother.userContext.gender).toBe('female');
  });
  it('"산모/엄마/여성" 표현은 gender-prediction으로 오탐되지 않음', async () => {
    const mother = calculateAnalysisOnly(MOM, NOW);
    const baby = calculateAnalysisOnly(BABY_NO_TIME, NOW);
    const bundle = composePregnancyAnalysis(mother, baby);
    const taegyoPlan = buildTaegyoPlan(bundle);
    const ctx = buildPregnancyNarrativeContext({ dueDateLabel: '2026년 9월 15일', babyTimeConfidence: 'unknown', motherTimeConfidence: 'exact', motherName: '산모' });
    const plans = buildPregnancyNarrativePlans(bundle, taegyoPlan, ctx);
    const res0 = await generatePregnancyNarrativeReport(MOM, BABY_NO_TIME, { callGpt: makeGoodCaller(), now: NOW });
    const report = JSON.parse(JSON.stringify(res0.report));
    report.motherComfortRhythm.body += ' 산모는 여성으로서 엄마의 기운을 지니고 있어요.';
    const v = validatePregnancyNarrativeReport({ report, bundle, plans, ctx });
    expect(v.issues.some(i => i.type === 'gender-prediction')).toBe(false);
  });
});
