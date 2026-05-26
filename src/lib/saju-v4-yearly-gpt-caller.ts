// v4 Yearly GptCaller — OpenAI Chat Completions 어댑터 (올해운세 전용).
//
// domain/saju/yearly/generateYearlyFortuneReport 가 사용하는 YearlyGptCaller 구현.
// 섹션별 JSON 출력 — response_format: json_object 로 강제.
// 모델 default = gpt-4o-mini (env로 override 가능).
//
// 주의: 이 파일은 테스트에서 import 되지 않는다 (실제 OpenAI 호출 포함).
//       generator는 항상 주입형 caller를 받으므로 테스트는 mock caller만 쓴다.

import 'server-only';
import OpenAI from 'openai';
import type { YearlyGptCaller } from '@/domain/saju/yearly/generateYearlyFortuneReport';

const DEFAULT_MODEL = process.env.SAJU_V4_GPT_MODEL ?? 'gpt-4o-mini';
// Number.isFinite 가드: 환경변수가 비어있거나 NaN이면 fallback 사용.
const _envTemperature = Number(process.env.SAJU_V4_GPT_TEMPERATURE);
const DEFAULT_TEMPERATURE = Number.isFinite(_envTemperature) ? _envTemperature : 0.6;
// 섹션별 호출이라 call-level maxTokens(plan.maxTokens)를 우선 사용. 미지정 시 fallback.
const _envMaxTokens = Number(process.env.SAJU_YEARLY_GPT_MAX_TOKENS);
const DEFAULT_MAX_OUTPUT_TOKENS = Number.isFinite(_envMaxTokens) && _envMaxTokens > 0 ? _envMaxTokens : 2200;

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (_client) return _client;
  const raw = process.env.OPENAI_API_KEY;
  if (!raw) throw new Error('OPENAI_API_KEY missing');
  const apiKey = raw.trim();
  // Vercel 환경변수에 가운데 공백/개행이 섞이면 OpenAI SDK가 HTTP 헤더 invalid로 거부.
  if (/\s/.test(apiKey)) {
    throw new Error('OPENAI_API_KEY contains whitespace — Vercel 환경변수를 공백·줄바꿈 없이 재설정하세요.');
  }
  _client = new OpenAI({ apiKey });
  return _client;
}

export interface YearlyCallerOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

/**
 * 올해운세 섹션별 생성용 caller. 호출마다 maxTokens override 가능.
 * generator가 BuiltYearlyPrompt(system/user)를 넘기고, JSON 한 덩어리를 받는다.
 */
export function createOpenAiYearlyGptCaller(opts: YearlyCallerOptions = {}): YearlyGptCaller {
  return async (prompt, callOpts) => {
    const model = opts.model ?? DEFAULT_MODEL;
    const temperature = opts.temperature ?? DEFAULT_TEMPERATURE;
    const maxTokens = callOpts?.maxTokens ?? opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    const res = await client().chat.completions.create({
      model,
      temperature,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user',   content: prompt.user   },
      ],
    });
    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error('OpenAI returned empty response');
    return text;
  };
}
