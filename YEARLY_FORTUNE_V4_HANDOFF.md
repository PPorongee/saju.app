# 별빛 사주 — Yearly Fortune V4 작업 인계 문서

> 이 문서 하나만 보고 새 세션에서 작업을 이어갈 수 있도록 정리했습니다.
> 작성: 2026-05-25 / 작업 디렉토리: `C:\Users\jshim\Desktop\saju-app`

---

## 0. 한 줄 요약

**올해운세(2026 세운)를 V3(SajuApp.tsx 인라인 prompt) → V4(deterministic 계산 + sectionwise LLM + sanitizer/validator)로 교체하는 작업.** 현재 **Y5(sanitizer + validator) 구현은 완료**되었고, **테스트 추가 + 검증 실행이 남아있음**.

---

## 1. 세션 재시작 시 붙여넣을 시작 명령어 (그대로 복붙)

```
@YEARLY_FORTUNE_V4_HANDOFF.md 를 읽고 마지막 상태부터 이어서 진행해 주세요.

현재 상태: Y5(yearlySanitizer + yearlyReportValidator) 구현 코드는 작성 완료. 테스트 추가 + 검증이 남아있습니다.

다음에 해야 할 일 (순서대로):
1. src/domain/saju/tests/yearlyFortunePipeline.test.ts 끝에 Y5 describe 블록 추가 (sanitizer 7개 + validator 10 high + 12 medium + 3 low + repair trigger + valid mock report)
2. npx vitest run src/domain/saju/tests/yearlyFortunePipeline.test.ts — Y2+Y3+Y4+Y5 전부 pass
3. npx vitest run src/domain/saju/tests/narrativePipeline.test.ts — 45/45 회귀 확인
4. npx tsc --noEmit — exit 0
5. Y5 완료 보고: 변경 파일, sanitizer 함수 목록, validator issue type 처리표, repair trigger 기준, 테스트 결과, typecheck 결과

준수 규칙:
- LLM 호출 절대 금지 (test 안에서)
- 개인사주 파일(src/domain/saju/narrative/*) 수정 금지
- commit/push 금지 — Y11에서 사용자 확인 후 진행
- 개인사주 sanitizer/validator 정책 약화 금지

Y6는 사용자 승인 후 진행. 먼저 Y5 완료 보고만.
```

---

## 2. 전체 phase 진행 상황

| Phase | 내용 | 상태 |
|---|---|---|
| Y0 | Legacy V3 audit (SajuApp.tsx 인라인 prompt 분석) | ✅ |
| Y1 | `yearlyTypes.ts` — 모든 type + 4개 flag | ✅ |
| Y2a | 세운 간지 + 천간/지지/지장간 십성 | ✅ |
| Y2b | 현재 대운 + 대운 십성 | ✅ |
| Y2c | 대운-세운 합·충 + 지지 합충형파해 | ✅ |
| Y2d | 세운-원국 4주 합충형파해 + 궁 영향 | ✅ |
| Y2e | 세운 오행 vs 용신/기신 + 신강/신약 부담/지원 | ✅ |
| Y2f | 남은 월운 절기 기준 계산 + 월운 십성/합충/용신활성도 | ✅ |
| Y2g | 이후 2년 요약 계산 | ✅ |
| Y3 | `yearlyEvidenceFormatter` + `yearlyPlanBuilder` | ✅ |
| Y4 | `yearlyPromptBuilder` (sectionwise + 절대규칙) | ✅ |
| Y5 | `yearlySanitizer` + `yearlyReportValidator` | ✅ |
| Y6 | `generateYearlyFortuneReport.ts` (메인 generator) | ✅ |
| Y7 | `/api/yearly-fortune/route.ts` + 서버 flag 정규화 | ✅ |
| Y8 | `scripts/verify-yearly-fixtures.mjs` (LLM-gated) + 순수 helper 테스트 | ✅ |
| Y9 | UI wiring — `YearlyV4Report.tsx` + `SajuApp.tsx` guarded branch | ✅ |
| Y10 | 회귀 + 개인사주 sanity | pending |
| Y11 | commit 준비 (stage + COMMIT_MSG.txt, push X) | pending |

---

## 2.5 2026-05-25 Autopilot Session Summary

**What was completed (Y6–Y9 + R1/R2 review + R3 fixes):**
- Y6: `generateYearlyFortuneReport.ts` + `buildYearlyAnalysis` composer (261 vitest cases) + mock caller injection pattern
- Y6: `lib/saju-v4-yearly-gpt-caller.ts` real OpenAI caller
- Y7: `/api/yearly-fortune/route.ts` endpoint (POST, nodejs, 90s) + flag normalization
- Y7: `yearlyServerFlags.ts` pure helpers (flag normalize, depth resolve, repair clamp [0,2], request validate)
- Y7: 27 vitest cases covering flag/depth/request validation
- R1 findings: HIGH-1 depthOptions inert (Phase-2 defer), HIGH-2 targetYear desync (removed from route), MED maxRepairAttempts unbounded (clamp [0,2] applied)
- R2 findings: Content-Length > 32KiB → 413, validation payload filtered (isValid/highCount/mediumCount only)
- R3 fixes: year||0 fallback, hasChildren typed in input, early-break candidate for repair convergence
- Y8: `scripts/verify-yearly-fixtures.mjs` HTTP-based (not TS import) + pure helper test suite
- Y9: `components/YearlyV4Report.tsx` (responsive grid, accordion, evidence debug panel) + `SajuApp.tsx` branch @4254 gated by `NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED`
- Legacy v3 path unchanged (kept for rollback safety)

**What remains (Y10, Y11):**
- Y10: full regression (`npm test`), 개인사주 sanity sweep (narrativePipeline 45/45 green)
- Y11: `git add src/domain/saju/yearly src/app/api/yearly-fortune src/lib/saju-v4-yearly-gpt-caller.ts src/components/YearlyV4Report.tsx`, write `.omc/YEARLY_V4_COMMIT_MSG.txt` (user runs git commit/push)

**Deferred items (Phase-2):**
- depthOptions consumption (validator depth-awareness, product section-gating)
- targetYear route re-wiring (needs broader depth/section changes)
- global→yearlyMechanism repair attribution (sanitizer/validator safety net sufficient for now)

---

## 3. 핵심 파일 위치

### Y1~Y4 (이미 완료, 수정 금지)
```
src/domain/saju/yearly/yearlyTypes.ts                  # 모든 type + ValidationResult 확장 (Y5에서)
src/domain/saju/yearly/yearlyAnalysisBuilder.ts        # Y2a~Y2g deterministic
src/domain/saju/yearly/yearlyEvidenceFormatter.ts      # Y3 — fact owner 분리
src/domain/saju/yearly/yearlyPlanBuilder.ts            # Y3 — 7개 plan
src/domain/saju/yearly/yearlyPromptBuilder.ts          # Y4 — sectionwise prompt + ABSOLUTE_RULES
```

### Y5 (방금 작성됨, 테스트 미작성)
```
src/domain/saju/yearly/yearlySanitizer.ts              # 신규
src/domain/saju/yearly/yearlyReportValidator.ts        # 신규
src/domain/saju/yearly/yearlyTypes.ts                  # YearlyValidationResult에 highCount/mediumCount/lowCount/sectionIssues/repairTargets/shouldRepair 필드 추가됨
```

### 테스트
```
src/domain/saju/tests/yearlyFortunePipeline.test.ts    # Y2~Y4 테스트 187개. Y5 describe 추가 필요.
src/domain/saju/tests/narrativePipeline.test.ts        # 개인사주 회귀 45/45 — 절대 깨지면 안 됨
```

### 개인사주 (수정 절대 금지)
```
src/domain/saju/narrative/*                            # narrativeSanitizer/Validator/PromptBuilder 등 — 재사용 OK, 수정 X
```

---

## 4. Y5에서 방금 작성한 코드 요약

### 4.1 `yearlySanitizer.ts` — export 함수

| 함수 | 역할 |
|---|---|
| `sanitizeDeterministicFuture(text)` | 반드시/무조건/100%/틀림없이/꼭/필연적/분명히 + 단정 사건 → 가능성 톤 |
| `sanitizeMedicalAdvice(text)` | 위장병/우울증/질병/치료/약물/진단 → 생활 리듬/수면/회복 톤 |
| `sanitizeFearBased(text)` | 사고/사망/파산/이혼 확정/실패 확정/무너집니다/큰일 → 조정/주의 톤 |
| `sanitizeYearlyFinancialAdviceRisk(text)` | 매수/매도/시세/수익률/레버리지/시장 타이밍/코인/주식/단기 투자/트레이딩/큰돈 굴 → 보상 기준/계약 범위/수익 구조 (개인사주 `sanitizeFinancialAdviceRisk` 재사용 + yearly 보강) |
| `sanitizeYearlyUnsupportedUserContext(text, ctx)` | relationshipStatus + hasChildren 정책. **"배우자궁"은 보존** (narrativeSanitizer 기존 정책 그대로). 개인사주 `sanitizeUnsupportedUserContext` 재사용 |
| `sanitizeEnglishElementKeys(text)` | wood/fire/earth/metal/water → 목/화/토/금/수 |
| `sanitizeValidatorLogLeak(text)` | (extra) plan id, fact id, issue type, mustUseFact, computedEvidence, sectionId, validation, validator, repair mode, JSON schema 노출 제거 |
| `applyYearlyFinalSanitizers(text, ctx)` | 명세 §8 순서: 1.영문→한글 2.context 3.financial 4.medical 5.fear 6.deterministic 7.(extra) log leak 8.공백/구두점 정리 |

```ts
export interface YearlySanitizeContext {
  relationshipStatus: YearlyRelationshipStatus;
  hasChildren: boolean | 'unknown';
}
```

### 4.2 `yearlyReportValidator.ts` — issue 처리표

| Severity | issue type | 검사 대상 / 트리거 |
|---|---|---|
| HIGH | `english-element-key-leak` | 전체 보고 텍스트에 wood/fire/earth/metal/water 등장 |
| HIGH | `deterministic-future-claim` | 반드시/무조건/100%/틀림없이/필연적/분명히/꼭 헤어집니다/올해 망합니다/이직합니다 등 |
| HIGH | `financial-advice-risk` | topicFortunes.money/career + remainingMonths.money + nextTwoYears.summary에 매수/매도/시세/수익률/레버리지/시장·투자·거래 타이밍/코인/주식/단기 투자/트레이딩/큰돈 굴 |
| HIGH | `medical-advice-risk` | topicFortunes.rhythm + remainingMonths.body에 위장병/우울증/질병/발병/중병/위독/진단/치료/약물/처방 |
| HIGH | `fear-based-claim` | 사망/파산/사고가 납니다/사고 위험/위독/이혼 확정/실패 확정/무너집니다/큰일 납니다 |
| HIGH | `unsupported-user-context` | relationshipStatus !== 'married' 인데 아내/남편/배우자(궁 제외)/기혼자/부부/결혼 생활. hasChildren !== true 인데 자녀/아들/딸/아이가/자식이 |
| HIGH | `invented-evidence` | (a) "X-Y 합/충/형/파/해" 패턴이 plan.matchTokens + analysis 토큰에 없음 (b) 천을귀인/도화/역마/화개/양인/괴강/백호/홍염 언급이 analysis.specialStarsActivated에 없음 |
| HIGH | `section-missing` | yearFlowCard.title / yearlyOverview.oneLine / yearlyMechanism.body / remainingMonths[] / topicFortunes 4영역 / actionGuide.mustCatch+bestStrategy / nextTwoYears[] 누락. **evidenceView는 deterministic 이므로 제외** |
| HIGH | `cross-section-leak` | yearFlowCard.summary가 600자+이며 월별 풀이 / remainingMonths가 "이후 2년/내년" 언급 / nextTwoYears가 "N월" 풀이 / actionGuide.bestStrategy가 "N월에" 단정 |
| HIGH | `validator-log-output` | (yfc/ym/rm/tf/ag/nty/ev)-* / 모든 25 issue type 이름 / mustUseFacts / computedEvidence / ABSOLUTE_RULES / sectionId / validation / validator / issue type / high severity / medium issue·severity / repair mode / JSON schema |
| MEDIUM | `missing-year-ten-god-interpretation` | yearFlowCard.summary + yearlyMechanism.body에 analysis.yearTenGod의 stem/branch 십성 미언급 |
| MEDIUM | `missing-daewoon-sewoon-link` | yearlyMechanism.body에 "대운" 미언급 |
| MEDIUM | `missing-useful-god-link` | yearlyMechanism.body에 용신/희신/기신/중립 미언급 |
| MEDIUM | `missing-monthly-guidance` | remainingMonths.length === 0 |
| MEDIUM | `missing-action-guide` | actionGuide.mustCatch 또는 betterAvoid 비어있음 |
| MEDIUM | `missing-next-two-years` | nextTwoYears.length !== 2 |
| MEDIUM | `generic-yearly-overview` | yearlyOverview.oneLine 12자 미만 또는 "평범한 해/평이한 한 해/좋은 해/나쁜 해/특별한 것이 없/항상 긍정" |
| MEDIUM | `weak-evidence-to-narrative` | evidenceBlocks 비거나, block의 6단계 (causalExplanation/lifeScene/positiveUse/shadowPattern/practicalAdvice) 일부 누락 |
| MEDIUM | `special-star-too-shallow` | analysis.specialStarsActivated에 있는 star가 본문에 단어만 등장하고 plainMeaning/yearlyMeaning 토큰 미언급 |
| MEDIUM | `missing-life-scene` | yearlyMechanism.body에 장면/상황/현실에서/환경/회의/점심/메시지/문서/역할/일정/순간 미언급 |
| MEDIUM | `missing-palace-impact` | yearlyMechanism.body에 년주/월주/일주/시주/배우자궁/궁 미언급 |
| MEDIUM | `missing-strength-impact` | yearlyMechanism.body에 신강/신약/중화 미언급 |
| LOW | `weak-transition` | yearlyMechanism.body에 그래서/다만/대신/한편/이럴 때/또한/반대로/결국/이렇게 미언급 |
| LOW | `minor-repetition` | yearlyMechanism.body의 한글 3-6자 토큰이 4회+ 반복 |
| LOW | `tone-too-dry` | yearlyMechanism.body에 좋습니다/좋아요/편합니다/편해요/살아납니다/어울립니다/괜찮습니다/있습니다/할 수 있어요 미언급 |

### 4.3 `YearlyValidationResult` 확장 필드 (yearlyTypes.ts에 추가됨)

```ts
export interface YearlyValidationResult {
  isValid: boolean;                              // highCount===0 && mediumCount<12
  issues: YearlyValidationIssue[];
  highCount: number;
  mediumCount: number;
  lowCount: number;
  sectionIssues: Record<string, YearlyValidationIssue[]>;  // sectionId/'global' → issues
  repairTargets: YearlyFortuneSectionId[];                 // high 1+ 섹션 OR medium 2+ 섹션
  shouldRepair: boolean;                                   // highCount>0 OR mediumCount>=6
}
```

### 4.4 repair trigger 기준

| 기준 | 값 | 효과 |
|---|---:|---|
| `MEDIUM_REPAIR_THRESHOLD` | 2 | 같은 섹션 medium 2개 이상이면 해당 섹션 repair |
| `MEDIUM_GLOBAL_THRESHOLD` | 6 | 전체 medium 6+면 `shouldRepair=true` |
| `MEDIUM_INVALID_THRESHOLD` | 12 | 전체 medium 12+면 `isValid=false` |
| global high → yearlyMechanism | — | global high는 yearlyMechanism repair로 redirect |

---

## 5. Y5 다음 작업 (테스트 추가) — 구체 가이드

### 5.1 `src/domain/saju/tests/yearlyFortunePipeline.test.ts` 끝에 추가할 describe 블록

기존 helper `buildAnalysisForFixture(0)` + `buildYearlyPlans(analysis)` 재사용. 다음 import 추가:

```ts
import {
  sanitizeDeterministicFuture,
  sanitizeMedicalAdvice,
  sanitizeFearBased,
  sanitizeYearlyFinancialAdviceRisk,
  sanitizeYearlyUnsupportedUserContext,
  sanitizeEnglishElementKeys,
  sanitizeValidatorLogLeak,
  applyYearlyFinalSanitizers,
  type YearlySanitizeContext,
} from '../yearly/yearlySanitizer';
import {
  validateYearlyReport,
  partitionIssues,
  type YearlyValidatorInput,
  type YearlyValidatorContext,
} from '../yearly/yearlyReportValidator';
import type { YearlyFortuneReport, RemainingMonthSection, NextTwoYearSection } from '../yearly/yearlyTypes';
```

### 5.2 작성할 테스트 그룹 (스펙 §16 모두 커버)

- **Y5-1 sanitizer 단위 변환**
  - `sanitizeDeterministicFuture`: "반드시 이직합니다" → "이직 신호가 생길 수 있어요"; "무조건 성공" softening; "100% 돈이 들어옵니다" softening; "올해 망합니다" softening
  - `sanitizeMedicalAdvice`: "위장병이 생깁니다" / "우울증이 옵니다" / "치료가 필요합니다" → 생활 리듬 표현
  - `sanitizeFearBased`: "사고가 납니다" / "파산" / "큰일 납니다" → 조정/주의 표현
  - `sanitizeYearlyFinancialAdviceRisk`: 매수/매도/시세/수익률/레버리지/시장 타이밍/큰돈 굴/단기 투자 모두 사라지거나 안전 표현으로
  - `sanitizeYearlyUnsupportedUserContext`: relationshipStatus='unknown' 일 때 "아내/남편/배우자" 차단 + **"배우자궁"은 보존** + 자녀 차단
  - `sanitizeEnglishElementKeys`: wood→목, fire→화 등
- **Y5-2 applyYearlyFinalSanitizers 통합**: 모든 위험 표현이 섞인 문단을 통과시킨 후 위 키워드들이 전부 사라지는지
- **Y5-3 validator HIGH 10개**: 각 issue type을 트리거하는 mock report로 한 번씩 검출 확인
- **Y5-4 validator MEDIUM 12개**: 각각 트리거 확인 + invalid 기준(mediumCount<12) 확인
- **Y5-5 validator LOW 3개**: weak-transition/minor-repetition/tone-too-dry
- **Y5-6 cross-section-leak**: yearFlowCard 600자+월별 풀이 / remainingMonths "이후 2년" / nextTwoYears "N월" / actionGuide "N월에 반드시"
- **Y5-7 invented-evidence**: 없는 신살(천을귀인) 언급 / 없는 합충 label 언급
- **Y5-8 validator-log-output**: "validation" / "mustUseFacts" / "yfc-ganji" / "JSON schema" 본문 노출
- **Y5-9 repair trigger**: high 1+ → shouldRepair=true + repairTargets에 해당 섹션 포함 / medium 2+ 같은 섹션 → repairTargets / low만 있으면 shouldRepair=false
- **Y5-10 valid mock report**: high 0 + medium <6 → isValid=true && shouldRepair=false
- **Y5-11 배우자궁 보존**: yearlyMechanism.body에 "배우자궁이 흔들리는" 같은 명리 표현은 unsupported-user-context로 잡히면 안 됨

### 5.3 valid mock report helper 패턴

```ts
function buildValidMockReport(analysis: YearlyFortuneAnalysis): YearlyFortuneReport {
  const stem = analysis.yearTenGod.stemTenGod;
  const branch = analysis.yearTenGod.branchMainTenGod;
  const palace = '월주'; // analysis.natalSewoonInteractions에서 하나 골라도 OK
  return {
    yearFlowCard: {
      title: '쌓아둔 것을 밖으로 꺼내는 해',
      subtitle: '확장보다 검증의 결',
      keywords: ['검증', '구조화', '연결'],
      summary: `올해는 ${stem} 결이 흐르며 ${branch} 결이 환경을 정리합니다. 회의나 문서 같은 장면에서 역할 정리가 중요해질 수 있어요. 그래서 무리한 확장 대신 작게 검증하는 편이 좋습니다.`,
    },
    yearlyOverview: {
      oneLine: '결과물로 검증받는 해',
      body: '큰 한 방보다 작게 꺼내 반응을 보며 다듬는 흐름이 안정적입니다.',
    },
    yearlyMechanism: {
      body: `현재 대운은 큰 환경을 키워주고, 올해 세운은 ${stem}/${branch} 결로 ${palace}를 건드립니다. 신강 구조에서는 부담보다 지원에 가깝습니다. 다만 용신 결이 들어올 때는 작게 검증하고, 기신 결이 들어올 때는 조건을 점검하는 편이 좋습니다. 회의나 문서 같은 장면에서 역할이 명확해질 수 있어요.`,
      evidenceBlocks: [{
        sectionId: 'yearlyMechanism',
        evidence: [{ label: `${stem} 결`, plainMeaning: '책임/평가/공식 결', role: 'main' }],
        causalExplanation: `${stem} 결이 환경에 들어와 책임이 명확해집니다.`,
        lifeScene: '회의에서 역할이 정리되는 순간',
        positiveUse: '작게 검증하고 문서로 남기기',
        shadowPattern: '책임만 떠안고 권한 없이 떠밀리는 패턴',
        practicalAdvice: '범위·권한·평가 기준을 먼저 정한다',
      }],
    },
    remainingMonths: [
      { monthLabel: '6월 흐름', periodLabel: '2026-06-05~2026-07-06', keyword: '정리하고 다시 기준 세우기', body: '회의나 문서에서 역할이 정리되는 흐름이 있어요. 그래서 작게 검증하는 편이 좋습니다.', work: '역할 범위 점검', money: '보상 기준 점검', relationship: '가까운 관계에서 기준 나누기', goodChoice: '문서로 기준 남기기', caution: '한 번에 다 바꾸지 않기' },
    ] as RemainingMonthSection[],
    topicFortunes: {
      career: '일운은 역할 정리 흐름. 범위·권한·평가 기준을 점검하는 편이 좋습니다.',
      money: '돈운은 보상 기준과 수익 구조 정리에서 살아납니다. 작업 범위와 정산 조건을 먼저 정해두는 편이 안정적입니다.',
      relationship: '가까운 관계에서 기준을 나누는 흐름이 강해질 수 있어요.',
      rhythm: '수면과 휴식 루틴을 점검하는 편이 좋습니다.',
    },
    actionGuide: {
      mustCatch: ['결과물로 남길 일', '조건이 명확한 협업', '능력 가격 기준 정리'],
      betterAvoid: ['책임만 받는 자리', '기준 없는 부탁'],
      bestStrategy: '감당할 조건을 정하고 그 안에서 움직일 때 운이 살아납니다.',
    },
    nextTwoYears: [
      { year: analysis.targetYear + 1, keyword: '연결과 확장', summary: '결과물이 사람으로 연결되는 흐름이 강해질 수 있어요.', opportunity: '소개·협업·외부 프로젝트', caution: '무리한 확장' },
      { year: analysis.targetYear + 2, keyword: '결산과 다음 판', summary: '쌓은 것을 정리해 다음 판으로 옮기는 흐름.', opportunity: '결산과 재투자 (수익 구조 정리)', caution: '쉬는 시간 없이 다음 판으로 넘어가기' },
    ] as NextTwoYearSection[],
    evidenceView: {
      yearGanji: analysis.targetYearGanji,
      currentDaewoonPillar: analysis.currentDaewoon.pillar.pillarKo,
      yearStemTenGod: analysis.yearTenGod.stemTenGod,
      yearBranchTenGod: analysis.yearTenGod.branchMainTenGod,
      yearElement: analysis.yearElementEffect.element,
      usefulGodRelation: analysis.yearElementEffect.relationToUsefulGod,
      natalSewoonInteractions: [],
      daewoonSewoonInteractions: [],
      monthlySummary: [],
      activatedSpecialStars: [],
    },
  };
}
```

이 mock은 검증 통과를 위한 최소 합격선. **palace/십성/대운/신강/용신/장면/전환어/소프트 톤** 모두 한 번씩 포함되어야 medium 0~5개 수준에 머물 수 있음.

---

## 6. 절대 규칙 (모든 phase 공통)

- **LLM 호출 절대 금지** — 모든 test는 deterministic. 실제 GPT는 Y8의 `scripts/verify-yearly-fixtures.mjs`에서 `RUN_LLM_INTEGRATION_TESTS=true` 일 때만.
- **개인사주 파일 수정 금지** — `src/domain/saju/narrative/*`, `src/domain/saju/generatePersonalSajuReport.ts` 등. 함수 import 재사용은 OK.
- **회귀 필수** — `narrativePipeline.test.ts` 45/45 항상 유지.
- **commit/push 금지** — Y11에서 사용자 명시 승인 후에만.
- **개인사주 sanitizer/validator 정책 약화 금지** — narrativeSanitizer의 "배우자궁 보존" 같은 기존 정책 그대로.
- **computedEvidence 외 명리 요소 추가 금지** — 모든 prompt/sanitizer/validator가 mustUseFacts 기반.

---

## 7. 현재 실행 가능한 명령어

```powershell
# 디렉토리 이동
cd C:\Users\jshim\Desktop\saju-app

# Yearly 전체 테스트 (Y2 125 + Y3 16 + Y4 23 = 164. Y5 추가하면 ~190)
npx vitest run src/domain/saju/tests/yearlyFortunePipeline.test.ts

# 개인사주 회귀 (45/45 유지 필수)
npx vitest run src/domain/saju/tests/narrativePipeline.test.ts

# typecheck (exit 0 필수)
npx tsc --noEmit

# 전체 test (시간 오래 걸림)
npm test

# 두 yearly + narrative 한꺼번에
npx vitest run src/domain/saju/tests/yearlyFortunePipeline.test.ts src/domain/saju/tests/narrativePipeline.test.ts
```

---

## 8. 진행 중인 background process / 잔여 정리

확인 명령:
```powershell
Get-Process | Where-Object {$_.Name -in @('node','npm','vercel','npx')} | Format-Table -AutoSize
```

만약 vercel telemetry 잔여 프로세스 보이면:
```powershell
Stop-Process -Id <PID> -Force
```

---

## 9. Phase별 task list (현 상태)

| TaskID | 내용 | 상태 |
|---:|---|---|
| 79 | Y1: yearlyTypes.ts | completed |
| 80 | Y2a | completed |
| 81 | Y2b | completed |
| 82 | Y2c | completed |
| 83 | Y2d | completed |
| 84 | Y2e | completed |
| 85 | Y2f | completed |
| 86 | Y2g | completed |
| 87 | Y3 | completed |
| 88 | Y4 | completed |
| **89** | **Y5** | **in_progress** (코드 작성 완료 / 테스트 미작성) |
| 90 | Y6 generator | pending |
| 91 | Y7 endpoint | pending |
| 92 | Y8 verify script + LLM | pending |
| 93 | Y9 UI wiring | pending |
| 94 | Y10 회귀 sanity | pending |
| 95 | Y11 commit 준비 | pending |

---

## 10. CLAUDE.md 핵심 메모 (project root에 있음)

- production: https://www.starlight-saju.com / Vercel: https://saju-app-snowy.vercel.app
- 사주 계산 핵심: `src/lib/saju-calc.ts` (입춘 boundary `isBeforeIpchun()`)
- 용신 cache invariant: `src/lib/saju-prompt-builder.ts` — 캐시 키 변경 시 모든 returning user 용신이 재롤됨
- Streaming API: `src/app/api/saju/route.ts` — `text/plain` ReadableStream
- Payment: 포춘빈 (197-56-00903), Toss Payments, 990원
- UI state machine: `SajuApp.tsx` (~3,760 lines) — `currentScreen` (0-9) + `appMode` ('saju'|'compat'|'pregnancy'|'yearly')
- Windows PowerShell trap: `.env.local` 쓸 때 `Set-Content -Encoding utf8` 절대 X (BOM 붙음). `-Encoding ascii` 사용.

---

**문서 끝.** 이 한 장만 있으면 새 세션에서 §1의 명령어 복붙 → 곧장 Y5 테스트 작성으로 들어갈 수 있습니다.
