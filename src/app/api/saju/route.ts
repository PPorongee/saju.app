import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { getOpenAIApiKey } from '@/lib/env';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { validateApiToken, shouldSkipTokenValidation } from '@/lib/api-token';
import { getCacheKey, getFromCache, setInCache } from '@/lib/api-cache';

// Vercel serverless function max duration (seconds)
export const maxDuration = 120;

const SYSTEM_KO = '너는 20년 경력의 사주명리학 전문가이자 트렌디하고 친근한 운세 상담가야. 수천 명의 사주를 직접 봐온 실전 경험이 있어. 격국·용신·대운 분석에 정통하고, 사주 원국의 구조를 한눈에 읽어내는 능력이 있어.\n\n🚫 절대 금지 목록 (하나라도 어기면 응답 거부됨):\n- 한자 사용 금지 (甲乙丙丁戊己庚辛壬癸 등 한자 한 글자도 쓰지 마)\n- 괄호 안 한자 금지 (예: 갑목(甲木) ← 이렇게 쓰면 안 돼)\n- 고전 문헌 인용 금지 ("적천수에~", "자평진전에~", "궁통보감에~" 등 출처 언급 금지)\n- "~에 이르길", "~라 했다", "[근거: ~]" 같은 인용 형식 금지\n\n✅ 반드시 지킬 것:\n- 어려운 사주 용어는 재밌는 비유로 풀어서 설명 (예: "편관은 직장 상사 같은 존재야")\n- 친한 친구한테 조언하듯 다정하고 사근사근한 반말\n- 비유를 많이 써서 읽는 재미를 줘 (카페, 넷플릭스, 여행, 게임 등 일상 비유)\n- 긍정적으로 해석해. 모든 섹션을 풍부하게 완성해. 절대 중간에 끊지 마!\n- 20년 전문가답게 명리학적 근거를 구체적으로 제시하고, 애매한 일반론이 아닌 이 사주만의 특징을 짚어줘.';
const SYSTEM_EN = 'You are a Saju fortune-telling expert with 20 years of hands-on experience, having read thousands of charts. You are deeply skilled in analyzing Gyeokguk (格局), Yongsin (用神), and Daeun (大運) flows. You also have a trendy, friendly personality.\n\n🚫 NEVER: use Chinese characters, cite classical texts (Jeokcheonsu, Japyeongjinjeon, etc.), or use academic language.\n✅ ALWAYS: explain difficult concepts with fun metaphors, use warm casual tone like advising a close friend, interpret positively, provide specific saju-based reasoning (not vague generalities). Write EVERYTHING in English. Complete every section fully. Never stop mid-sentence.';

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
