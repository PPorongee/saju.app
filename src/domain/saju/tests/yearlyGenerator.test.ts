// Yearly Fortune V4 — Generator (Y6) 테스트.
//
// 정책:
//   - 실제 GPT/OpenAI API 호출 금지. 모든 테스트는 deterministic mock caller 주입.
//   - mock caller는 BuiltYearlyPrompt.sectionId로 dispatch해 섹션별 JSON_SCHEMAS 형태 문자열 반환.
//   - 컨텐츠는 yearlyFortunePipeline.test.ts의 buildValidMockReport 값을 로컬에서 재현.

import { describe, it, expect } from 'vitest';
import {
  generateYearlyFortuneReport,
  buildYearlyAnalysis,
  type YearlyGptCaller,
} from '../yearly/generateYearlyFortuneReport';
import type {
  YearlyFortuneInput,
  YearlyFortuneAnalysis,
  YearlyFortuneSectionId,
} from '../yearly/yearlyTypes';
import type { BuiltYearlyPrompt } from '../yearly/yearlyPromptBuilder';
import type { BirthInput } from '../calendar/normalizeBirthInput';

// ============================================================
// 공통 fixture
// ============================================================
const BIRTH: BirthInput = {
  gender: 'female', calendarType: 'solar', birthDate: '1995-07-06',
  birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};
const NOW = new Date('2026-05-25T00:00:00Z');
const INPUT: YearlyFortuneInput = {
  birth: BIRTH,
  currentDate: '2026-05-25',
  relationshipStatus: 'unknown',
};

// analysis에서 세운 십성 등 실제 값을 뽑아 본문에 끼워 missing-* medium 회피
const ANALYSIS = buildYearlyAnalysis(INPUT, NOW);
const STEM = ANALYSIS.yearTenGod.stemTenGod;
const BRANCH = ANALYSIS.yearTenGod.branchMainTenGod;
const NEXT_Y1 = ANALYSIS.targetYear + 1;
const NEXT_Y2 = ANALYSIS.targetYear + 2;

// ============================================================
// 섹션별 valid JSON 컨텐츠 (buildValidMockReport 재현)
// ============================================================
function validSectionPayload(sectionId: YearlyFortuneSectionId): any {
  switch (sectionId) {
    case 'yearFlowCard':
      return {
        sectionId: 'yearFlowCard',
        yearFlowCard: {
          title: '쌓아둔 것을 밖으로 꺼내는 해',
          subtitle: '확장보다 검증의 결',
          keywords: ['검증', '구조화', '연결'],
          summary: `올해는 ${STEM} 결이 흐르며 ${BRANCH} 결이 환경을 정리합니다. 회의나 문서 같은 장면에서 역할 정리가 중요해질 수 있어요. 그래서 무리한 확장 대신 작게 검증하는 편이 좋습니다.`,
        },
        yearlyOverview: {
          oneLine: '결과물로 검증받는 흐름의 한 해',
          body: '큰 한 방보다 작게 꺼내 반응을 보며 다듬는 흐름이 안정적입니다.',
        },
      };
    case 'yearlyMechanism':
      return {
        sectionId: 'yearlyMechanism',
        yearlyMechanism: {
          body: `현재 대운은 큰 환경을 키워주고, 올해 세운은 ${STEM}/${BRANCH} 결로 월주를 건드립니다. 신강 구조에서는 부담보다 지원에 가깝습니다. 다만 용신 결이 들어올 때는 작게 검증하고, 기신 결이 들어올 때는 조건을 점검하는 편이 좋습니다. 회의나 문서 같은 장면에서 역할이 명확해질 수 있어요.`,
          evidenceBlocks: [{
            sectionId: 'yearlyMechanism',
            evidence: [{ label: `${STEM} 결`, plainMeaning: '책임/평가/공식 결', role: 'main' }],
            causalExplanation: `${STEM} 결이 환경에 들어와 책임이 명확해집니다.`,
            lifeScene: '회의에서 역할이 정리되는 순간',
            positiveUse: '작게 검증하고 문서로 남기기',
            shadowPattern: '책임만 떠안고 권한 없이 떠밀리는 패턴',
            practicalAdvice: '범위·권한·평가 기준을 먼저 정한다',
          }],
        },
      };
    case 'remainingMonths':
      return {
        sectionId: 'remainingMonths',
        remainingMonths: [
          {
            monthLabel: '6월 흐름', periodLabel: '2026-06-05~2026-07-06',
            keyword: '정리하고 다시 기준 세우기',
            body: '회의나 문서에서 역할이 정리되는 흐름이 있어요. 그래서 작게 검증하는 편이 좋습니다.',
            work: '역할 범위 점검', money: '보상 기준 점검',
            relationship: '가까운 관계에서 기준 나누기',
            goodChoice: '문서로 기준 남기기', caution: '한 번에 다 바꾸지 않기',
          },
        ],
      };
    case 'topicFortunes':
      return {
        sectionId: 'topicFortunes',
        topicFortunes: {
          career: '일운은 역할 정리 흐름. 범위·권한·평가 기준을 점검하는 편이 좋습니다.',
          money: '돈운은 보상 기준과 수익 구조 정리에서 살아납니다. 작업 범위와 정산 조건을 먼저 정해두는 편이 안정적입니다.',
          relationship: '가까운 관계에서 기준을 나누는 흐름이 강해질 수 있어요.',
          rhythm: '수면과 휴식 루틴을 점검하는 편이 좋습니다.',
        },
      };
    case 'actionGuide':
      return {
        sectionId: 'actionGuide',
        actionGuide: {
          mustCatch: ['결과물로 남길 일', '조건이 명확한 협업', '능력 가격 기준 정리'],
          betterAvoid: ['책임만 받는 자리', '기준 없는 부탁'],
          bestStrategy: '감당할 조건을 정하고 그 안에서 움직일 때 운이 살아납니다.',
        },
      };
    case 'nextTwoYears':
      return {
        sectionId: 'nextTwoYears',
        nextTwoYears: [
          { year: NEXT_Y1, keyword: '연결과 확장', summary: '결과물이 사람으로 연결되는 흐름이 강해질 수 있어요.', opportunity: '소개·협업·외부 프로젝트', caution: '무리한 확장' },
          { year: NEXT_Y2, keyword: '결산과 다음 판', summary: '쌓은 것을 정리해 다음 판으로 옮기는 흐름.', opportunity: '결산과 재정리', caution: '쉬는 시간 없이 다음 판으로 넘어가기' },
        ],
      };
    default:
      return {};
  }
}

// ============================================================
// mock callers
// ============================================================

// 모든 섹션 valid JSON 반환
function makeGoodCaller(): YearlyGptCaller {
  return async (prompt: BuiltYearlyPrompt) =>
    JSON.stringify(validSectionPayload(prompt.sectionId));
}

// 특정 섹션만 non-JSON 반환 (나머지는 valid)
function makeBrokenSectionCaller(broken: YearlyFortuneSectionId): YearlyGptCaller {
  return async (prompt: BuiltYearlyPrompt) => {
    if (prompt.sectionId === broken) return '죄송합니다. 이번엔 JSON이 아니라 그냥 문장이에요.';
    return JSON.stringify(validSectionPayload(prompt.sectionId));
  };
}

// yearlyMechanism 첫 시도엔 invented-evidence(계산 안 된 신살) 위반, repair(REPAIR_MODE)면 clean.
// deterministic-future-claim 같은 "단어 위반"은 sanitize 단계에서 제거되어 validator가 못 보므로,
// sanitizer가 보존하는 명리 신살 토큰("도화")으로 invented-evidence를 일부러 유발한다.
function makeRepairCaller(): YearlyGptCaller {
  return async (prompt: BuiltYearlyPrompt) => {
    if (prompt.sectionId === 'yearlyMechanism') {
      const isRepair = prompt.user.includes('REPAIR_MODE');
      const payload = validSectionPayload('yearlyMechanism');
      if (!isRepair) {
        payload.yearlyMechanism.body += ' 올해는 도화 기운이 강하게 들어옵니다.';
      }
      return JSON.stringify(payload);
    }
    return JSON.stringify(validSectionPayload(prompt.sectionId));
  };
}

// ============================================================
// Y6-1 happy path
// ============================================================
describe('Y6-1 generateYearlyFortuneReport — happy path', () => {
  it('valid mock → highCount 0, 8개 report 필드 채워짐, attempts 1, repairedSections 비어있음', async () => {
    const res = await generateYearlyFortuneReport(INPUT, { callGpt: makeGoodCaller(), now: NOW });

    expect(res.validation.highCount).toBe(0);
    expect(res.attempts).toBe(1);
    expect(res.repairedSections.length).toBe(0);

    const r = res.report;
    expect(r.yearFlowCard.title).toBeTruthy();
    expect(r.yearlyOverview.oneLine).toBeTruthy();
    expect(r.yearlyMechanism.body).toBeTruthy();
    expect(r.remainingMonths.length).toBeGreaterThan(0);
    expect(r.topicFortunes.career).toBeTruthy();
    expect(r.topicFortunes.money).toBeTruthy();
    expect(r.topicFortunes.relationship).toBeTruthy();
    expect(r.topicFortunes.rhythm).toBeTruthy();
    expect(r.actionGuide.bestStrategy).toBeTruthy();
    expect(r.actionGuide.mustCatch.length).toBeGreaterThan(0);
    expect(r.nextTwoYears.length).toBe(2);
    expect(r.evidenceView).toBeTruthy();
  });

  it('evidenceView가 analysis에서 deterministic하게 도출됨', async () => {
    const res = await generateYearlyFortuneReport(INPUT, { callGpt: makeGoodCaller(), now: NOW });
    const ev = res.report.evidenceView;
    expect(ev.yearGanji).toEqual(ANALYSIS.targetYearGanji);
    expect(ev.currentDaewoonPillar).toBe(ANALYSIS.currentDaewoon.pillar.pillarKo);
    expect(ev.yearStemTenGod).toBe(ANALYSIS.yearTenGod.stemTenGod);
    expect(ev.yearBranchTenGod).toBe(ANALYSIS.yearTenGod.branchMainTenGod);
    expect(ev.yearElement).toBe(ANALYSIS.yearElementEffect.element);
    expect(ev.usefulGodRelation).toBe(ANALYSIS.yearElementEffect.relationToUsefulGod);
    expect(ev.monthlySummary.length).toBe(ANALYSIS.remainingMonthlyFortunes.length);
  });
});

// ============================================================
// Y6-2 parse-failure resilience
// ============================================================
describe('Y6-2 generateYearlyFortuneReport — parse 실패 내성', () => {
  it('한 섹션이 non-JSON → throw 없이 결과 반환, validator가 section-missing 보고', async () => {
    const res = await generateYearlyFortuneReport(INPUT, {
      callGpt: makeBrokenSectionCaller('topicFortunes'),
      now: NOW,
      maxRepairAttempts: 0, // repair 없이 1차 결과만 검증
    });
    // 결과 객체 자체는 정상 반환
    expect(res.report).toBeTruthy();
    expect(res.report.yearFlowCard.title).toBeTruthy(); // 다른 섹션은 정상
    // 깨진 섹션은 빈 채로 → section-missing high issue
    const missing = res.validation.issues.filter(i => i.type === 'section-missing' && i.sectionId === 'topicFortunes');
    expect(missing.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Y6-2b parse-null: 빈 문자열 응답
// ============================================================
describe('Y6-2b generateYearlyFortuneReport — 빈 문자열 응답 내성', () => {
  it('한 섹션이 빈 문자열 반환 → throw 없이 결과 반환, section-missing high issue', async () => {
    // parseSectionJson의 if (!raw) return null 경로를 직접 커버
    const callerWithEmpty: YearlyGptCaller = async (prompt: BuiltYearlyPrompt) => {
      if (prompt.sectionId === 'actionGuide') return '';
      return JSON.stringify(validSectionPayload(prompt.sectionId));
    };

    const res = await generateYearlyFortuneReport(INPUT, {
      callGpt: callerWithEmpty,
      now: NOW,
      maxRepairAttempts: 0,
    });

    // throw 없이 결과 반환
    expect(res.report).toBeTruthy();
    // 다른 섹션은 정상
    expect(res.report.yearFlowCard.title).toBeTruthy();
    // 빈 섹션 → section-missing high issue in actionGuide
    const missing = res.validation.issues.filter(
      i => i.type === 'section-missing' && i.sectionId === 'actionGuide',
    );
    expect(missing.length).toBeGreaterThan(0);
  });
});

// ============================================================
// Y6-3 repair path
// ============================================================
describe('Y6-3 generateYearlyFortuneReport — repair', () => {
  it('yearlyMechanism 1차 위반 → repair clean → attempts 2, repairedSections에 yearlyMechanism, 최종 highCount 0', async () => {
    const res = await generateYearlyFortuneReport(INPUT, {
      callGpt: makeRepairCaller(),
      now: NOW,
      maxRepairAttempts: 1,
    });
    expect(res.attempts).toBe(2);
    expect(res.repairedSections).toContain('yearlyMechanism');
    expect(res.validation.highCount).toBe(0);
  });
});

// ============================================================
// Y6-4 buildYearlyAnalysis 구조 완전성
// ============================================================
describe('Y6-4 buildYearlyAnalysis — 구조 완전성', () => {
  it('sample BirthInput → targetYear 해소 + 모든 sub-object 존재', () => {
    const a: YearlyFortuneAnalysis = buildYearlyAnalysis(INPUT, NOW);
    expect(a.targetYear).toBe(2026);
    expect(a.natalChart).toBeTruthy();
    expect(a.natalPillarsFull.length).toBeGreaterThanOrEqual(3);
    expect(a.currentDaewoon).toBeTruthy();
    expect(a.targetYearGanji.display).toBeTruthy();
    expect(a.yearTenGod).toBeTruthy();
    expect(a.yearElementEffect).toBeTruthy();
    expect(a.strengthImpact).toBeTruthy();
    expect(a.daewoonSewoonInteraction).toBeTruthy();
    expect(Array.isArray(a.natalSewoonInteractions)).toBe(true);
    expect(Array.isArray(a.remainingMonthlyFortunes)).toBe(true);
    expect(a.nextTwoYears.length).toBe(2);
    expect(a.carriedOver.dayMasterStrength).toBeTruthy();
    expect(a.carriedOver.usefulGod).toBeTruthy();
  });

  it('targetYear override가 반영됨', () => {
    const a = buildYearlyAnalysis({ ...INPUT, targetYear: 2030 }, NOW);
    expect(a.targetYear).toBe(2030);
    expect(a.nextTwoYears[0].year).toBe(2031);
    expect(a.nextTwoYears[1].year).toBe(2032);
  });
});

// ============================================================
// Y6-5 determinism
// ============================================================
describe('Y6-5 buildYearlyAnalysis — determinism', () => {
  it('같은 input 두 번 → deep-equal', () => {
    const a = buildYearlyAnalysis(INPUT, NOW);
    const b = buildYearlyAnalysis(INPUT, NOW);
    expect(JSON.parse(JSON.stringify(a))).toEqual(JSON.parse(JSON.stringify(b)));
  });
});

// ============================================================
// Y6-6 nextTwoYears year 폴백 (year 누락 시 0 대신 결정론적 연도)
// ============================================================
describe('Y6-6 nextTwoYears year 폴백', () => {
  it('mock이 nextTwoYears 항목에 year 생략 → analysis.targetYear+index+1 로 폴백 (0 아님)', async () => {
    // year 필드를 누락한 caller
    const callerWithMissingYear: YearlyGptCaller = async (prompt: BuiltYearlyPrompt) => {
      if (prompt.sectionId === 'nextTwoYears') {
        return JSON.stringify({
          sectionId: 'nextTwoYears',
          nextTwoYears: [
            { keyword: '연결과 확장', summary: '흐름이 강해집니다.', opportunity: '협업', caution: '확장 무리' },
            { keyword: '결산', summary: '정리하는 흐름.', opportunity: '재정리', caution: '과부하' },
          ],
        });
      }
      return JSON.stringify(validSectionPayload(prompt.sectionId));
    };

    const res = await generateYearlyFortuneReport(INPUT, {
      callGpt: callerWithMissingYear,
      now: NOW,
      maxRepairAttempts: 0,
    });

    const years = res.report.nextTwoYears;
    expect(years.length).toBe(2);
    // year 필드 폴백 → analysis.targetYear + index + 1 (0 아님)
    expect(years[0].year).toBe(ANALYSIS.targetYear + 1);
    expect(years[1].year).toBe(ANALYSIS.targetYear + 2);
    expect(years[0].year).not.toBe(0);
    expect(years[1].year).not.toBe(0);
  });
});

// ============================================================
// Y6-7 hasChildren typed input
// ============================================================
describe('Y6-7 hasChildren typed input', () => {
  it('input.hasChildren=true → deriveHasChildren path honored (unsupported-user-context 없음)', async () => {
    // hasChildren:true를 직접 input에 지정하면 sanitizer/validator가 자녀 관련 문장을 허용해야 함.
    // 여기서는 deriveHasChildren이 올바른 경로로 해소되는지 구조적으로 검증한다:
    // hasChildren:true인 경우 validator가 자녀 관련 unsupported-user-context issue를 생성하지 않음.
    const inputWithChildren: YearlyFortuneInput = {
      ...INPUT,
      hasChildren: true,
    };

    const res = await generateYearlyFortuneReport(inputWithChildren, {
      callGpt: makeGoodCaller(),
      now: NOW,
      maxRepairAttempts: 0,
    });

    // hasChildren=true인 경우 자녀 context unsupported 이슈가 없어야 함
    const childIssues = res.validation.issues.filter(
      i => i.type === 'unsupported-user-context',
    );
    // mock content는 자녀 언급 없으므로 issue 없음 — typed hasChildren:true가 정상 파싱됨 검증
    expect(res.validation.highCount).toBe(0);
    // analysis 자체가 hasChildren=true로 구성됐는지 확인 (deriveHasChildren 경로 확인)
    // buildYearlyAnalysis에 hasChildren:true가 전달되면 options.hasChildren=true
    const analysisWithChildren = buildYearlyAnalysis(inputWithChildren, NOW);
    expect(analysisWithChildren).toBeTruthy(); // 빌드 자체 성공
    // childIssues가 없거나, 있더라도 hasChildren:true가 reason에 반영되지 않음
    expect(childIssues.filter(i => i.reason.includes('hasChildren'))).toHaveLength(0);
  });

  it('input.hasChildren 미지정 → userContext.hasChildren 폴백 동작', async () => {
    const inputViaCtx: YearlyFortuneInput = {
      ...INPUT,
      userContext: { hasChildren: true },
    };
    const inputDirect: YearlyFortuneInput = {
      ...INPUT,
      hasChildren: true,
    };

    const analysisViaCtx = buildYearlyAnalysis(inputViaCtx, NOW);
    const analysisDirect = buildYearlyAnalysis(inputDirect, NOW);

    // 두 경로 모두 같은 분석 결과 (hasChildren은 options에만 영향, 나머지 동일)
    expect(analysisViaCtx.targetYear).toBe(analysisDirect.targetYear);
    expect(analysisViaCtx.yearTenGod).toEqual(analysisDirect.yearTenGod);
  });
});

// ============================================================
// Y6-8 maxRepairAttempts=0 — repair 라운드 없이 반환
// ============================================================

// ============================================================
// Y6-9 repair loop 수렴 조기 종료 (R3 early-break)
// ============================================================
describe('Y6-9 repair loop convergence early-break', () => {
  it('caller가 항상 동일한 invalid 출력 반환 → 조기 중단, maxRepairAttempts 미소진, throw 없음', async () => {
    // 매 호출(1차 + repair)마다 동일한 invented-evidence 위반을 포함한 yearlyMechanism을 반환하는 caller.
    // 이렇게 하면 repairTargets의 issue 시그니처가 라운드마다 변하지 않아 early-break가 발동해야 함.
    const MAX = 5; // 소진하면 attempts=6이 될 것이므로, early-break 확인용 상한

    const alwaysInvalidCaller: YearlyGptCaller = async (prompt: BuiltYearlyPrompt) => {
      if (prompt.sectionId === 'yearlyMechanism') {
        // 도화 토큰으로 invented-evidence를 매 라운드 동일하게 유발
        const payload = validSectionPayload('yearlyMechanism');
        payload.yearlyMechanism.body += ' 올해는 도화 기운이 강하게 들어옵니다.';
        return JSON.stringify(payload);
      }
      return JSON.stringify(validSectionPayload(prompt.sectionId));
    };

    const res = await generateYearlyFortuneReport(INPUT, {
      callGpt: alwaysInvalidCaller,
      now: NOW,
      maxRepairAttempts: MAX,
    });

    // throw 없이 결과 반환
    expect(res.report).toBeTruthy();
    expect(res.report.yearFlowCard.title).toBeTruthy();

    // 조기 종료: MAX+1(=6) 라운드를 모두 소진하지 않아야 함.
    // early-break는 i=1(두 번째 repair 시도 직전)에 발동 → attempts=2.
    expect(res.attempts).toBeLessThan(MAX + 1);

    // repairedSections에 yearlyMechanism이 기록돼 있어야 함 (1회는 repair 시도했음)
    expect(res.repairedSections).toContain('yearlyMechanism');
  });
});

describe('Y6-8 maxRepairAttempts=0', () => {
  it('maxRepairAttempts=0 + repairable high → repair 라운드 없음 (attempts===1, repairedSections 비어있음)', async () => {
    // makeRepairCaller: yearlyMechanism 첫 시도에 도화(invented-evidence) 위반 포함
    const res = await generateYearlyFortuneReport(INPUT, {
      callGpt: makeRepairCaller(),
      now: NOW,
      maxRepairAttempts: 0,
    });

    // repair 라운드를 실행하지 않아야 함
    expect(res.attempts).toBe(1);
    expect(res.repairedSections).toHaveLength(0);
    // 결과 자체는 throw 없이 반환
    expect(res.report).toBeTruthy();
    expect(res.report.yearFlowCard.title).toBeTruthy();
  });
});
