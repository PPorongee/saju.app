// 궁합 v4 — OpenAI 어댑터. saju-v4-gpt-caller와 같은 OpenAI 호출 패턴.
// 다만 응답 사이즈가 더 커지므로 maxTokens 기본값을 더 크게.

import 'server-only';
import OpenAI from 'openai';
import type { CompatibilityGptCaller } from '@/domain/saju/compatibility/generateCompatibilityReport';

const DEFAULT_MODEL = process.env.COMPAT_V4_GPT_MODEL ?? process.env.SAJU_V4_GPT_MODEL ?? 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = Number(process.env.COMPAT_V4_GPT_TEMPERATURE ?? '0.6');
const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.COMPAT_V4_GPT_MAX_TOKENS ?? '5500');

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const raw = process.env.OPENAI_API_KEY;
  if (!raw) throw new Error('OPENAI_API_KEY missing');
  const apiKey = raw.trim();
  if (/\s/.test(apiKey)) {
    throw new Error('OPENAI_API_KEY contains whitespace — Vercel 환경변수를 공백·줄바꿈 없이 재설정하세요.');
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

export interface CompatCallerOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export function createOpenAiCompatGptCaller(opts: CompatCallerOptions = {}): CompatibilityGptCaller {
  return async ({ system, user }) => {
    const model = opts.model ?? DEFAULT_MODEL;
    const temperature = opts.temperature ?? DEFAULT_TEMPERATURE;
    const maxTokens = opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    const res = await client().chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user',   content: user   },
      ],
    });
    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error('OpenAI returned empty response');
    return text;
  };
}
