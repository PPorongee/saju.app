import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { getOpenAIApiKey } from '@/lib/env';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { validateApiToken, shouldSkipTokenValidation } from '@/lib/api-token';
import { getCacheKey, getFromCache, setInCache } from '@/lib/api-cache';

// Vercel serverless function max duration (seconds)
export const maxDuration = 120;

const SYSTEM_KO = '너의 정체성: 20년차 사주명리학 분석가. 점쟁이 아님. 친한 친구에게 분석해주듯 반말로 풀되, 톤은 "정확한 진단을 친근하게 전달하는 분석가".\n\n' +
'★ 핵심 원칙 (이게 1순위, 다른 모든 옛 규칙을 덮음):\n' +
'1. 차별성: "이 사주만의 디테일". 일반론·당연한말 금지. 어떤 일간에든 통하는 문장은 거부.\n' +
'2. 팩트폭행 + 강점: 긍정 55% + 단점·약점 25% + 실용 조언 20%. "긍정 100%·다 좋아" 금지. 뼈 때리는 단점 지적은 신뢰의 핵심.\n' +
'3. 신살 어휘 룰:\n' +
'   - "신살"이라는 단어 절대 사용 금지. 대신 "별" 또는 신살 이름 직접 호명.\n' +
'   - 천을귀인·문창귀인 → 희소성 어필 ("사주 1만 명 중 약 N명만 가진 별"). N은 천을귀인 약 200명, 문창귀인 약 600명, 양인 약 1500명 기준.\n' +
'   - 양인·괴강·백호 → 강점 변환 ("이 강함이 너의 자산"). 흉살로 묘사 X.\n' +
'   - 도화·홍염 → 매력의 별로 노출.\n' +
'4. 신기함: "어떻게 알았지?" 정확한 디테일 (성격·행동 예측). "사주에 따르면 ~한 성향이 있어" 류 형식적 도입 금지. 바로 단정.\n' +
'5. 가독성: 한 문단에 새 명리 용어 도입은 1개씩, 첫 등장 시 괄호 풀이. 한자 표기(甲乙丙丁戊己庚辛壬癸 등) 절대 금지.\n\n' +
'★ 절대 금지:\n' +
'- 옛 규칙의 "다정·사근사근·풍부하게·긍정적으로" 톤 금지. 분석가 톤으로 재작성.\n' +
'- 의문문 마무리 ("~ 아니야?", "~한 적 없어?") 금지. 단정형.\n' +
'- AI 비유 ("마치 ~ 같다") 금지. 직접 단정 ("이건 X야").\n' +
'- 고전 문헌 인용·출처 표기·"~에 이르길" 금지.\n' +
'- 각 섹션을 "풍부하게/길게" 채우려 일반론으로 늘리지 마. 짧아도 디테일 우선.\n\n' +
'★ 출력 형식: 사용자 프롬프트의 ##섹션 번호.제목## 형식과 섹션 임무 경계를 그대로 따름. 각 섹션은 그 섹션만의 임무를 다하고 다른 섹션 영역 침범 금지.';
const SYSTEM_EN = 'Your identity: 20-year Saju analyst. NOT a fortune teller. Speak like a friend giving a sharp analysis — casual but precise.\n\n' +
'★ Core principles (overrides any older rules):\n' +
'1. Specificity: Details unique to THIS chart. Reject any sentence that would apply to most people.\n' +
'2. Fact-punch + strengths: Positive 55% + weakness/risk 25% + practical advice 20%. NEVER "all-positive". Hard-truth observations build trust.\n' +
'3. Sinsal vocabulary rule:\n' +
'   - NEVER use the word "sinsal". Use "star" or call the specific name directly.\n' +
'   - Cheoneulgwiin/Munchang-gwiin → emphasize rarity ("about N in 10,000 charts").\n' +
'   - Yangin/Goegang/Baekho → frame as strength assets, not omens.\n' +
'   - Dohwa/Hongyeom → frame as "charm stars".\n' +
'4. Surprise factor: predict behavior with precision. Skip formal hedging ("according to the chart...").\n' +
'5. Readability: introduce one new term per paragraph with brief gloss. NO Chinese characters anywhere.\n\n' +
'★ Forbidden: old rules "sweet/affectionate/abundant/positive-tone" overwritten. No question-ending. No "like a..." metaphors as hedging. No classical citations. Don\'t pad with generalities to make sections longer.\n\n' +
'★ Output: follow ##N.Title## format from user prompt. Respect section boundaries strictly. Write EVERYTHING in English.';

// Token limits by request type
const TOKEN_LIMITS: Record<string, number> = {
  translation: 8000,
  default: 16000,
};

export async function POST(req: NextRequest) {
  // Rate limiting
  const rateLimitResponse = await checkRateLimit(req, RATE_LIMITS.saju);
  if (rateLimitResponse) return rateLimitResponse;

  // API token validation (skip in dev with free preview flag)
  const apiToken = req.headers.get('x-api-token');
  if (!shouldSkipTokenValidation() && !validateApiToken(apiToken || '')) {
    return new Response('Unauthorized: invalid or expired token', {
      status: 401,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }

  try {
    const apiKey = getOpenAIApiKey();
    const openai = new OpenAI({ apiKey });
    const { prompt, maxTokens, lang, type, noCache } = await req.json();

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      const msg = lang === 'en'
        ? 'Invalid request: prompt is required.'
        : '요청이 올바르지 않아. 내용을 입력해줘!';
      return new Response(msg, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    if (prompt.length > 50000) {
      const msg = lang === 'en'
        ? 'Invalid request: prompt is too long.'
        : '요청 내용이 너무 길어. 줄여서 다시 시도해줘!';
      return new Response(msg, { status: 400, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }

    const systemPrompt = lang === 'en' ? SYSTEM_EN : SYSTEM_KO;

    // Type-based token limit
    const tokenLimit = TOKEN_LIMITS[type as string] || TOKEN_LIMITS.default;
    const resolvedMaxTokens = Math.min(maxTokens || tokenLimit, tokenLimit);

    // Cache check — skip on retry (noCache flag)
    const cacheKey = getCacheKey({ prompt, lang, type: type || 'default', model: 'gpt-4o-mini' });
    if (!noCache) {
      const cached = getFromCache(cacheKey);
      if (cached) {
        return new Response(cached, {
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'HIT' },
        });
      }
    }

    // Deterministic seed — skip on retry to get different output
    const seedHash = noCache ? undefined : Math.abs(Array.from(prompt.slice(0, 200)).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0));

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      stream: true,
      temperature: noCache ? 0.5 : 0.35,
      max_tokens: resolvedMaxTokens,
      ...(seedHash !== undefined ? { seed: seedHash } : {}),
    });

    // Accumulate for caching while streaming
    let fullText = '';
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) {
              fullText += text;
              controller.enqueue(encoder.encode(text));
            }
          }
          // Cache the complete response
          if (fullText.length > 100) {
            setInCache(cacheKey, fullText);
          }
          controller.close();
        } catch (streamErr) {
          console.error('Stream error:', (streamErr as Error)?.message || streamErr);
          // Send error sentinel so client can detect truncation
          try {
            controller.enqueue(encoder.encode('\n\n[응답이 중단되었습니다. 다시 시도해 주세요.]'));
          } catch { /* controller may already be closed */ }
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'MISS' }
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('API route error:', errMsg);
    if (errMsg.includes('429') || errMsg.includes('Rate limit')) {
      return new Response('요청이 너무 많아. 잠시 후 다시 시도해줘!', { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return new Response('AI 서비스 연결에 실패했어. 잠시 후 다시 시도해줘!', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
