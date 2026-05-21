<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-03-22 | Updated: 2026-05-22 -->

# saju

## Purpose
API route that proxies Saju reading requests to OpenAI GPT-4o-mini with streaming responses.

## Key Files

| File | Description |
|------|-------------|
| `route.ts` | POST handler — accepts `{ prompt, maxTokens, lang, type, noCache }`, streams GPT-4o-mini response back as `text/plain` |

## For AI Agents

### Working In This Directory
- Uses `openai` SDK with `process.env.OPENAI_API_KEY` (via `@/lib/env` wrapper)
- System prompts are imported from `@/lib/saju-system-prompt` (SYSTEM_KO / SYSTEM_EN) — NOT inline anymore (changed 2026-05-22 during v3.1 prompt overhaul to allow tooling scripts to share the same prompt)
- The client-side prompt builder (`@/lib/saju-prompt-builder.ts`) constructs the detailed saju prompt with hardForcedHeader + compactRules + yongsinHeaderRule
- `lang` parameter selects Korean (반말 persona) or English system prompt
- Response is a `ReadableStream` with `TextEncoder` — chunked text streaming
- Model: `gpt-4o-mini`, Temperature: `0.35` (or `0.5` on noCache retry)
- `max_tokens` from `TOKEN_LIMITS`: `default: 16000`, `translation: 8000`
- `maxDuration = 120` for Vercel serverless function timeout
- API token validation via `@/lib/api-token` (skip with `NEXT_PUBLIC_ENABLE_FREE_PREVIEW=true`)
- Rate limiting via `@/lib/rate-limit` (`RATE_LIMITS.saju`)
- Response caching via `@/lib/api-cache` (`getFromCache`/`setInCache`, 24h TTL) — invalidated when prompt text changes
- Input validation: prompt required, max 50K chars
- Error handling: 429 (rate limit), 500 (generic), with Korean/English error messages by lang

### Testing Requirements
- Requires valid `OPENAI_API_KEY` in `.env.local`
- Test with POST request containing `{ prompt: "test", lang: "ko" }`
- Verify streaming works (response arrives in chunks, not all at once)
- Manual prompt test: `npx tsx --env-file=.env.local scripts/test-v3-95-05-31-jashi.ts` (v3.1 validation harness with auto-retry)

### Common Patterns
- Streaming pattern: `for await (const chunk of stream)` → `controller.enqueue(encoder.encode(text))`

## Dependencies

### Internal
- `@/lib/saju-system-prompt` — SYSTEM_KO / SYSTEM_EN constants (Tier 1 of 3-tier prompt system)
- `@/lib/env` — `getOpenAIApiKey()`
- `@/lib/rate-limit` — `checkRateLimit`, `RATE_LIMITS`
- `@/lib/api-token` — `validateApiToken`, `shouldSkipTokenValidation`
- `@/lib/api-cache` — `getCacheKey`, `getFromCache`, `setInCache`

### External
- `openai` SDK — GPT-4o-mini chat completions with streaming

<!-- MANUAL: -->
