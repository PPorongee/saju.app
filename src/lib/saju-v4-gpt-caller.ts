// v4 GptCaller — OpenAI Chat Completions 어댑터.
//
// domain/saju/generatePersonalSajuReport 가 사용하는 GptCaller 인터페이스를 구현.
// 모델 default = gpt-4o-mini (env로 override 가능).
//
// 비스트림 응답. UI streaming은 추후 슬라이스에서 별도 처리.

import 'server-only';
import OpenAI from 'openai';
import type { GptCaller } from '@/domain/saju/generatePersonalSajuReport';

const DEFAULT_MODEL = process.env.SAJU_V4_GPT_MODEL ?? 'gpt-4o-mini';
const DEFAULT_TEMPERATURE = Number(process.env.SAJU_V4_GPT_TEMPERATURE ?? '0.6');
const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.SAJU_V4_GPT_MAX_TOKENS ?? '4000');

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY missing');
  _client = new OpenAI({ apiKey });
  return _client;
}

export interface CallerOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export function createOpenAiGptCaller(opts: CallerOptions = {}): GptCaller {
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
