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
// 서사형 V4(2026-05 hotfix) — 10000으로 올렸더니 응답 생성에 60s+ 소요되어
// Vercel maxDuration=90s 안에서 timeout 빈발. 5500으로 축소.
// gpt-4o-mini 출력 속도 ~150 token/s 기준: 5500 token = ~37s. repair 1회 추가해도 ~75s 이내.
const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.SAJU_V4_GPT_MAX_TOKENS ?? '5500');

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const raw = process.env.OPENAI_API_KEY;
  if (!raw) throw new Error('OPENAI_API_KEY missing');
  const apiKey = raw.trim();
  // Vercel 환경변수에 가운데 공백/개행이 섞이면 OpenAI SDK가 HTTP 헤더 invalid로 거부.
  // 정상 키는 공백 없음 — 명확한 에러로 즉시 진단.
  if (/\s/.test(apiKey)) {
    throw new Error('OPENAI_API_KEY contains whitespace — Vercel 환경변수를 공백·줄바꿈 없이 재설정하세요.');
  }
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
