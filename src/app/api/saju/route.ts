import OpenAI from 'openai';
import { NextRequest } from 'next/server';
import { SAJU_SYSTEM_PROMPT, SAJU_SYSTEM_PROMPT_EN } from '@/lib/saju-prompt';

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('OPENAI_API_KEY is not set');
      return new Response('서버 설정 오류: API 키가 설정되지 않았습니다.', { status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
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

    const systemPrompt = lang === 'en' ? SAJU_SYSTEM_PROMPT_EN : SAJU_SYSTEM_PROMPT;

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
  } catch (err) {
    console.error('API route error:', err);
    return new Response('AI 서비스 연결에 실패했어. 잠시 후 다시 시도해줘!', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}
