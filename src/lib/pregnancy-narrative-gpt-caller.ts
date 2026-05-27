// 임산부 모드 V4 — GptCaller (OpenAI Chat Completions 어댑터).
//
// generatePregnancyNarrativeReport가 사용하는 PregnancyNarrativeGptCaller 구현.
// 섹션별 JSON 출력 — response_format: json_object 강제.
// 모델 default = PREGNANCY_V4_GPT_MODEL ?? SAJU_V4_GPT_MODEL ?? 'gpt-4o-mini' (env override).
// 반환 { text, finishReason } — generator가 finish=length(잘림)를 HIGH로 감지.
//
// 주의: 이 파일은 테스트에서 import 되지 않는다 (실제 OpenAI 호출 포함).

import 'server-only';
import OpenAI from 'openai';
import type { PregnancyNarrativeGptCaller } from '@/domain/saju/pregnancy/narrative/generatePregnancyNarrativeReport';

const DEFAULT_MODEL =
  process.env.PREGNANCY_V4_GPT_MODEL ?? process.env.SAJU_V4_GPT_MODEL ?? 'gpt-4o-mini';
const _envTemperature = Number(process.env.PREGNANCY_V4_GPT_TEMPERATURE);
const DEFAULT_TEMPERATURE = Number.isFinite(_envTemperature) ? _envTemperature : 0.6;
const _envMaxTokens = Number(process.env.PREGNANCY_NARRATIVE_GPT_MAX_TOKENS);
const DEFAULT_MAX_OUTPUT_TOKENS =
  Number.isFinite(_envMaxTokens) && _envMaxTokens > 0 ? _envMaxTokens : 2000;

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

export interface PregnancyNarrativeCallerOptions {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export function createOpenAiPregnancyNarrativeGptCaller(
  opts: PregnancyNarrativeCallerOptions = {},
): PregnancyNarrativeGptCaller {
  return async (prompt, callOpts) => {
    const model = opts.model ?? DEFAULT_MODEL;
    const temperature = opts.temperature ?? DEFAULT_TEMPERATURE;
    const maxTokens = callOpts?.maxTokens ?? opts.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS;
    const res = await client().chat.completions.create(
      {
        model,
        temperature,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: prompt.system },
          { role: 'user', content: prompt.user },
        ],
      },
      // per-call 60s + 재시도 0 (compat/yearly와 동일 정책).
      { timeout: 60_000, maxRetries: 0 },
    );
    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error('OpenAI returned empty response');
    return { text, finishReason: res.choices[0]?.finish_reason };
  };
}
