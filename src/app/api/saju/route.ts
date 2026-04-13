import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { getOpenAIApiKey } from '@/lib/env';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';
import { validateApiToken, shouldSkipTokenValidation } from '@/lib/api-token';
import { getCacheKey, getFromCache, setInCache } from '@/lib/api-cache';

// Vercel serverless function max duration (seconds)
export const maxDuration = 60;

const SYSTEM_KO = '너는 적천수(滴天髓)와 자평진전(子平眞詮)을 달달 외우고, 궁통보감(窮通寶鑑)으로 조후를 잡는 40년 경력의 명리학 대가야. 연해자평과 삼명통회까지 섭렵한 정통 명리가. 해설할 때 반드시 고전 원문을 인용하면서 권위를 보여줘. 모든 문장을 반말로만 써. 존댓말 절대 금지. 비유를 많이 써서 읽는 재미가 있게. 해석의 여지가 있을 때는 긍정적으로 해석해. 각 섹션을 길고 풍부하게 빠짐없이 완성해. 절대 중간에 끊지 마. 짧게 쓰면 안 돼 — 각 섹션 최소 20줄 이상!';
const SYSTEM_EN = 'You are a world-class Saju (Korean Four Pillars astrology) master with 40 years of experience. Write EVERYTHING in English. Use warm, casual, friendly tone. Use vivid metaphors. When in doubt, interpret positively. Complete every section fully. Never stop mid-sentence.';

// Token limits by request type
const TOKEN_LIMITS: Record<string, number> = {
  translation: 8000,
  default: 8000,
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
    const { prompt, maxTokens, lang, type } = await req.json();

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

    // Cache check — use prompt hash as key
    // Use hash of full prompt to avoid collisions between Part 1/Part 2
    const promptHash = Array.from(prompt).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0).toString(36);
    const cacheKey = getCacheKey({ promptHash, lang, type: type || 'default', model: 'gpt-4o-mini' });
    const cached = getFromCache(cacheKey);
    if (cached) {
      return new Response(cached, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Cache': 'HIT' },
      });
    }

    // Deterministic seed from prompt content for same-input consistency
    const seedHash = Array.from(prompt.slice(0, 200)).reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0);

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      stream: true,
      temperature: 0.55,
      max_tokens: resolvedMaxTokens,
      seed: Math.abs(seedHash),
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
