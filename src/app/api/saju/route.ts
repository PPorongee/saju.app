import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { getOpenAIApiKey } from '@/lib/env';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { validateApiToken, shouldSkipTokenValidation } from '@/lib/api-token';
import { getCacheKey, getFromCache, setInCache } from '@/lib/api-cache';
import { SYSTEM_KO, SYSTEM_EN } from '@/lib/saju-system-prompt';

// Vercel serverless function max duration (seconds)
export const maxDuration = 120;

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
