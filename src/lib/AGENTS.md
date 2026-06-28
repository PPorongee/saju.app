<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-22 | Updated: 2026-04-05 -->

# lib

## Purpose
Core business logic library for Saju (사주) calculations, AI prompt construction, classical reference data, internationalization, and payment processing. All files are pure TypeScript with no React dependencies.

## Key Files

| File | Description |
|------|-------------|
| `saju-calc.ts` | Core Saju engine — heavenly stems (천간), earthly branches (지지), five elements (오행), Julian Day Number calculation, 십성 (10 gods), 신살 (spiritual markers), 12운성 (12 life stages), personality profiles for each day master |
| `saju-prompt.ts` | System prompt for GPT-4o-mini — defines `SAJU_SYSTEM_PROMPT` with detailed instructions for the AI persona (40-year 명리학 master), interpretation rules, and `UserData` interface |
| `saju-prompt-builder.ts` | Builds structured user prompts — takes `SajuResult` + `UserData`, computes 십성/신살/충, and generates prompt text with all Saju data for GPT-4o-mini |
| `saju-references.ts` | RAG-style reference library — ~85 classical quotes organized by 7 topics (personality, wealth, love, career, health, compatibility, timing, general) from ��천수, 자��진전, 궁통보감, 연해자평, 삼명통회 |
| `saju-ref-selector.ts` | Reference selector — picks relevant classical references based on day master and requested topics, prioritizing day-master-specific quotes |
| `lunar-solar.ts` | Lunar-to-solar calendar converter — uses pre-calculated lunar new year dates (1960-2010) with approximate offset calculation |
| `i18n.ts` | Internationalization — `Lang` type (`ko`/`en`), `T` translation dictionary (~180 keys), `t()` lookup function |
| `payment-config.ts` | Payment configuration — `BUSINESS_INFO` (company details), `PRODUCTS` array, `TOSS_CLIENT_KEY`/`TOSS_SECRET_KEY`, `OrderData` interface, `REFUND_POLICY`, `generateOrderId()` |
| `payment-provider.ts` | Abstract payment provider — `PaymentProvider` interface, `TossPaymentProvider` (active), `KakaoPayProvider` (stub), `createPaymentProvider()` factory |

## For AI Agents

### Working In This Directory
- **Domain knowledge required**: Saju (사주명리학) is Korean four-pillar astrology based on birth year/month/day/hour
- Key concepts: 천간 (heavenly stems, 10), 지지 (earthly branches, 12), 오행 (five elements: 목/화/토/금/수), 십성 (10 gods/relationships), 신살 (spiritual markers)
- `saju-calc.ts` uses Julian Day Number formula for accurate day stem/branch calculation
- `isBeforeIpchun()` handles the Korean astrological year boundary (입춘, Feb 4)
- Prompt files are very large (10K-30K tokens) — read specific sections rather than entire files
- All Korean text uses informal speech (반말) as required by the AI persona

### Testing Requirements
- Verify `calcSaju()` produces correct stems/branches for known birth dates
- Verify `lunarToSolar()` conversion accuracy for dates within 1960-2010 range
- Verify `getOhCount()` correctly tallies five element distribution
- Test prompt builder output includes all expected sections

### Common Patterns
- Arrays indexed by stem (0-9) or branch (0-11) number
- Stem names: 갑을병정무기경신임계 (CG array)
- Branch names: 자축인묘진사오미신유술해 (JJ array)
- Five elements: 목(wood) 화(fire) 토(earth) 금(metal) 수(water)
- `Record<number, ...>` maps used extensively for lookup tables

## Subdirectories

| Directory | Purpose |
|-----------|---------|
| `__tests__/` | Unit tests: `saju-calc.test.ts`, `saju-prompt-builder.test.ts`, `saju-ref-selector.test.ts`, `lunar-solar.test.ts`, `i18n.test.ts` |

## Dependencies

### External
- `@tosspayments/tosspayments-sdk` — Toss Payments SDK (used by `payment-provider.ts`)

<!-- MANUAL: -->
