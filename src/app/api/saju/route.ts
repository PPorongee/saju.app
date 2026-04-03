import OpenAI from 'openai';
import { NextRequest } from 'next/server';

const SYSTEM_KO = '너는 적천수와 자평진전을 달달 외우고, 궁통보감으로 조후를 잡는 40년 경력의 명리학 대가야. 연해자평과 삼명통회까지 섭렵한 정통 명리가. 모든 문장을 반말로만 써. 존댓말 절대 금지. 비유를 많이 써서 읽는 재미가 있게. 해석의 여지가 있을 때는 긍정적으로 해석해.';
const SYSTEM_EN = 'You are a world-class Saju (Korean Four Pillars astrology) master with 40 years of experience. Write EVERYTHING in English. Use warm, casual, friendly tone. Use vivid metaphors. When in doubt, interpret positively.';

export async function POST(req: NextRequest) {
  try {
    const apiKey = (process.env.OPENAI_API_KEY || '').replace(/[\s\r\n]+/g, '');
    if (!apiKey) {
      return new Response('API key not configured. Set OPENAI_API_KEY in Vercel.', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const openai = new OpenAI({ apiKey });
    const { prompt, maxTokens, lang } = await req.json();

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

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      stream: true,
      temperature: 0.4,
      max_tokens: maxTokens || 10000,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch (streamErr) {
          console.error('Stream error:', streamErr);
          controller.close();
        }
      }
    });

    return new Response(readable, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('API route error:', errMsg);
    // Always show error reason for debugging
    if (errMsg.includes('401') || errMsg.includes('Incorrect API key')) {
      return new Response('ERROR: Invalid API key', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    if (errMsg.includes('429') || errMsg.includes('Rate limit')) {
      return new Response('ERROR: Rate limited', { status: 429, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    if (errMsg.includes('insufficient_quota')) {
      return new Response('ERROR: Insufficient OpenAI credits', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    return new Response('AI 서비스 연결에 실패했어. 잠시 후 다시 시도해줘! (' + errMsg.slice(0, 100) + ')', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
