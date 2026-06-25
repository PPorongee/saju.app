// 올해운세 엔진→출력 커버리지 감사 (실제 GPT).
//   실행: node --env-file=.env.local --import tsx scripts/yearly-audit.ts [A|B|C]
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import OpenAI from 'openai';
import { generateYearlyFortuneReport } from '../src/domain/saju/yearly/generateYearlyFortuneReport';

const client = new OpenAI({ apiKey: (process.env.OPENAI_API_KEY ?? '').trim() });
const caller = async (prompt: any, callOpts: any) => {
  const res = await client.chat.completions.create({
    model: process.env.SAJU_V4_GPT_MODEL ?? 'gpt-4o-mini', temperature: 0.6,
    max_tokens: callOpts?.maxTokens ?? 2200, response_format: { type: 'json_object' },
    messages: [{ role: 'system', content: prompt.system }, { role: 'user', content: prompt.user }],
  }, { timeout: 60_000, maxRetries: 0 });
  const text = res.choices[0]?.message?.content;
  if (!text) throw new Error('empty');
  return text;
};

const FIXTURES: Record<string, any> = {
  A: { birth: { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' }, currentDate: '2026-05-25', relationshipStatus: 'unknown' },
};
const which = (process.argv[2] ?? 'A').toUpperCase();

// report에서 사람이 읽는 string만 깊이 수집
function collectText(o: any, out: string[] = []): string[] {
  if (o == null) return out;
  if (typeof o === 'string') { if (o.trim()) out.push(o); return out; }
  if (Array.isArray(o)) { for (const x of o) collectText(x, out); return out; }
  if (typeof o === 'object') { for (const k of Object.keys(o)) collectText(o[k], out); return out; }
  return out;
}

(async () => {
  const res: any = await generateYearlyFortuneReport(FIXTURES[which], { callGpt: caller, maxRepairAttempts: 0 });
  const text = collectText(res.report).join('\n');
  const outPath = resolve(process.cwd(), `tmp/yearly-audit-${which}.txt`);
  writeFileSync(outPath, text, 'utf8');

  console.log(`\n저장: ${outPath} (${text.replace(/\s/g, '').length}자)\n`);
  console.log('=== 명리 신호가 출력 본문에 등장하나 (올해운세 A) ===');
  const has = (k: string) => (text.match(new RegExp(k, 'g')) || []).length;
  const sigs = ['세운', '대운', '월운', '십성', '정관', '편관', '식신', '상관', '편재', '정재', '편인', '정인', '비견', '겁재',
    '합', '충', '형', '용신', '기신', '오행', '목 기운', '화 기운', '토 기운', '금 기운', '수 기운', '간지', '병오', '병술'];
  for (const s of sigs) { const n = has(s); if (n > 0) console.log(`  ${s}: ${n}`); }
  console.log('\n(위에 안 뜬 신호 = 출력에 0회)');
})().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
