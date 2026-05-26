<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-05-25 -->

# yearly

## Purpose

Deterministic 올해운세(2026 세운) engine isolated from personal saju pipeline. Core principle: LLM writes prose only; all input analysis (Y2a–Y2g), evidence formatting, validation, and section repair are code-driven and testable.

## Module Map

| File | Role |
|------|------|
| `yearlyTypes.ts` | Type definitions: `YearlyFortuneInput`, `YearlyFortuneAnalysis` (Y2a–Y2g results), `YearlyFortuneReport` (final output), server flags, validation result |
| `yearlyAnalysisBuilder.ts` | Y2a–Y2g deterministic calculations: year ten-god, current daewoon, daewoon-sewoon interaction, sewoon-natal pillar interaction, element strength, remaining months, next-two-year summary |
| `yearlyEvidenceFormatter.ts` | Y3: fact owner labeling (who computed each evidence: calc/analysis/prompt); feeds into `YearlyMechanismSection.evidenceBlocks` |
| `yearlyPlanBuilder.ts` | Y3: builds 7 `YearlyPlan` objects mapping analysis → prompt sections (`yearFlowCard`, `yearlyOverview`, `yearlyMechanism`, etc.); defines `YEARLY_LLM_SECTION_IDS` |
| `yearlyPromptBuilder.ts` | Y4: sectionwise `BuiltYearlyPrompt` construction; injects `ABSOLUTE_RULES` (deterministic constraints on tone/scope/language); JSON schema per section |
| `yearlySanitizer.ts` | Deterministic text cleanup: remove deterministic-future claims, medical/fear/financial risks, unsupported context (배우자궁 preserved), English element keys, validator log leaks |
| `yearlyReportValidator.ts` | Y5: validates `YearlyFortuneReport` against 25 issue types (10 high, 12 medium, 3 low); computes `repairTargets`, `shouldRepair`, `isValid` |
| `generateYearlyFortuneReport.ts` | Y6: composer. Input → `buildYearlyAnalysis` (Y2a–Y2g) → `buildYearlyPlans` (Y3) → `buildYearlyPromptsAll` (Y4) → sectionwise LLM calls (injected `callGpt`) → parse+sanitize → assemble → validate → bounded sectionwise repair loop |
| `yearlyServerFlags.ts` | Y7: pure normalization helpers — flag registry, depth option resolution, repair attempt clamping [0,2], request body validation |

## Dataflow

```
YearlyFortuneInput (birth, currentDate, targetYear?, relationshipStatus?, hasChildren?)
    ↓
buildYearlyAnalysis(input, now?)
    • Normalize birth via isBeforeIpchun() → Y2a–Y2g calculations
    • Basis: now (대운/normalization), currentDate (세운/월운)
    ↓
buildYearlyPlans(analysis)
    • Deterministic: map analysis → 7 plans
    ↓
buildYearlyPromptsAll(plans, context)
    • Per YEARLY_LLM_SECTION_IDS, inject ABSOLUTE_RULES
    • JSON schema per section
    ↓
Sectionwise LLM (injected callGpt)
    • Parse JSON → YearlyFortuneReport fields
    ↓
applyYearlyFinalSanitizers(text, context)
    • Deterministic cleanup (7 types + log leak)
    ↓
validateYearlyReport(report, analysis, input)
    • Count high/medium/low issues
    • Decide repairTargets & shouldRepair
    ↓
If shouldRepair && attempts < maxRepairAttempts:
    buildYearlyRepairPrompt(repairTargets, report, issues)
    → callGpt → re-parse → re-sanitize → re-validate (loop)
    ↓
Assemble final YearlyFortuneReport
    • evidenceView deterministic (no LLM)
    ↓ 
Return GenerateYearlyResult { analysis, plans, report, validation, attempts, repairedSections }
```

## Server Endpoint

`/api/yearly-fortune` (POST, nodejs runtime, maxDuration 90)

**Request body:**
```json
{
  "input": { "birth": {...}, "currentDate": "YYYY-MM-DD", "relationshipStatus?": "...", "hasChildren?": true },
  "depthOptions?": { "useEvidenceNarrative": bool, "useMonthlyFlow": bool, "useNextTwoYears": bool },
  "maxRepairAttempts?": 0|1|2
}
```

**Response status codes:**
- 200: success
- 400: `invalid_json` or `invalid_input`
- 403: `forbidden` (verifySecret mismatch)
- 500: `generation_failed` (exception)
- 503: `yearly_api_disabled` (feature flag off)

**Server flags (env):**
- `YEARLY_FORTUNE_API_ENABLED` ('true'|'false') — route returns 503 if false
- `YEARLY_FORTUNE_VERIFY_SECRET` (string|undefined) — if set, enforces `x-yearly-verify-secret` header
- `SAJU_YEARLY_DEPTH` ('on'|'off') — default for depth options; body overrides
- `NEXT_PUBLIC_YEARLY_FORTUNE_UI_ENABLED` ('true'|'false', client-readable) — SajuApp.tsx shows v4 or v3 legacy

## Key Invariants & Gotchas

### No LLM in Unit Tests
- All `.test.ts` files inject a deterministic mock `callGpt` (returns fixed JSON)
- Real LLM call only in `scripts/verify-yearly-fixtures.mjs` (gated by `RUN_LLM_INTEGRATION_TESTS=true`)
- Caller (`generateYearlyFortuneReport`) is server-only; never import in tests or client code

### evidenceView is Deterministic
Built from `analysis` via `formatYearlyEvidence()` — no LLM, no sanitizer. Safe to return to client for debugging.

### depthOptions Accepted But Not Yet Consumed (Phase-2 Deferred)
- Route accepts & normalizes `body.depthOptions` and `SAJU_YEARLY_DEPTH` env
- Generator stores in `GenerateYearlyOptions`
- **Not used**: validator depth-awareness, product depth-gating, section filtering
- Current behavior: always full report (functional, no blocker)

### targetYear Override Not Exposed via Route (HIGH-2 Fix)
- Route intentionally **does not** pass `body.targetYear` to generator
- Reason: would desync 월운/대운 from `currentDate`
- `buildYearlyAnalysis(input)` still accepts `targetYear` param for tests
- Phase-2: re-wire route if needed with broader depth/section changes

### Repair Loop Bounded
- `maxRepairAttempts` clamped [0, 2] via `clampYearlyRepairAttempts()`
- `repairTargets`: sections with high 1+ OR medium 2+ (per-section threshold)
- Early-break: if `repairedSections` unchanged round-over-round (Phase-2 enhancement)

### 배우자궁 Preservation
- Sanitizer does **not** block "배우자궁" (spousal palace) as unsupported context
- Inherits personal-saju policy: 궁 names are명리 terms, not user context
- Validator honors this: "궁" pattern match is evidence, not leak

## Test Entry Points

| File | Coverage |
|------|----------|
| `src/domain/saju/tests/yearlyFortunePipeline.test.ts` | Y2a–Y2g (125 tests), Y3–Y4 (39 tests), Y5 sanitizer/validator (200+ tests) — 261+ total |
| `src/domain/saju/tests/yearlyGenerator.test.ts` | Y6 integration: mock caller, sectionwise gen, repair loop |
| `src/domain/saju/tests/yearlyServerFlags.test.ts` | Y7 helpers: flag normalization, depth resolution, request validation |
| `src/domain/saju/tests/yearlyVerifyHelpers.test.ts` | Helper utilities (no LLM) |
| `scripts/verify-yearly-fixtures.mjs` | Live LLM smoke test (gated by `RUN_LLM_INTEGRATION_TESTS=true`) |

**Run:**
```bash
npx vitest run src/domain/saju/tests/yearlyFortunePipeline.test.ts
npx vitest run src/domain/saju/tests/narrativePipeline.test.ts  # 45/45 regression gate
npx tsc --noEmit
```

## For AI Agents

### Working In This Directory
- Saju domain knowledge required (용신, 대운, 세운, 십성, 신살, 합충)
- All functions are pure TS except `callGpt` (injected external)
- Follow "Y2a–Y2g → analyze → plan → prompt → sanitize → validate → repair" pattern
- Mirror `generatePersonalSajuReport.ts` sectionwise structure
- Always compose evidence blocks with `{ label, plainMeaning, role }` triples

### Modification Policy
- **Never modify**: `narrative/*`, `generatePersonalSajuReport.ts`
- **Safe to extend**: add new evidence types, plan sections, issue types (with tests)
- **Preserve invariants**: 배우자궁, sanitizer thresholds, validator thresholds, repair bounds

### Common Patterns
- Evidence tagging: `{ label: "합", from: "대운", to: "세운" }` → formatter adds plainMeaning
- Interaction kinds: '합' (connection), '충' (shift), '형' (friction), '파' (leak), '해' (minor)
- Sanitizer chaining: each type is independent; `applyYearlyFinalSanitizers()` calls all in order
- Validator partitioning: `partitionIssues(issues)` splits by sectionId for targeted repair

<!-- MANUAL: -->
