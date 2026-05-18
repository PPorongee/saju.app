/**
 * 이서은 사주(1995-07-06 11:49)로 실제 GPT-4o-mini 호출 테스트
 *
 * 실행: npx tsx --env-file=.env.local scripts/test-gpt-eseo.ts
 */

import OpenAI from 'openai';
import * as fs from 'node:fs';
import { calcSaju, getOhCount } from '../src/lib/saju-calc';
import { buildSajuPrompts } from '../src/lib/saju-prompt-builder';
import { SAJU_SYSTEM_PROMPT } from '../src/lib/saju-prompt';
import { getOpenAIApiKey } from '../src/lib/env';
import type { UserData } from '../src/lib/saju-prompt';

async function main() {
  const sj = calcSaju(1995, 7, 6, 6);
  const oh = getOhCount(sj);
  const user: UserData = {
    name: '이서은', gender: 'f',
    year: 1995, month: 7, day: 6, hour: 6,
    concern: 1, state: 1, personality: [0, 1, 0], relationship: 0, wantToKnow: 1,
  };

  const prompts = buildSajuPrompts(sj, oh, user);
  console.log(`Prompts built. Lengths: [${prompts.map(p => p.length).join(', ')}]`);

  const apiKey = getOpenAIApiKey();
  const openai = new OpenAI({ apiKey });

  const partNames = ['Part 1 (1-4)', 'Part 2 (5-8)', 'Part 3 (9-12)'];
  const results: string[] = [];
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < 3; i++) {
    console.log(`Calling GPT-4o-mini for ${partNames[i]}...`);
    const start = Date.now();
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SAJU_SYSTEM_PROMPT },
        { role: 'user', content: prompts[i] },
      ],
      temperature: 0.8,
    });
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    const out = resp.choices[0].message.content || '';
    const inTok = resp.usage?.prompt_tokens || 0;
    const outTok = resp.usage?.completion_tokens || 0;
    totalInput += inTok;
    totalOutput += outTok;
    console.log(`  ${partNames[i]} done in ${elapsed}s. Tokens: in=${inTok}, out=${outTok}`);
    results.push(out);
  }

  const combined = results.join('\n\n');
  fs.writeFileSync('eseo-gpt-result-FULL.txt', combined, 'utf8');

  const cost = (totalInput * 0.150 + totalOutput * 0.600) / 1_000_000;
  console.log(`\n=== TOTAL ===`);
  console.log(`Input: ${totalInput} tokens, Output: ${totalOutput} tokens`);
  console.log(`Cost: $${cost.toFixed(5)} (~${(cost * 1400).toFixed(1)}원)`);
  console.log(`Saved to eseo-gpt-result-FULL.txt (${combined.length} chars)`);
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
