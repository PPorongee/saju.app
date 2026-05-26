// 일회용 로컬 샘플 생성기 (commit 대상 아님).
// /api/compat-narrative를 거치지 않고 generateCompatNarrativeReport를 직접 호출,
// 실제 LLM이 생성한 궁합 줄글을 "사용자에게 보일 최종 형태" markdown으로 tmp/에 저장.
// production caller 설정 복제 (model/temp/json_object/timeout60s/maxRetries0, repair 0).
// 실행: node --env-file=.env.local --import tsx scripts/compat-narrative-sample.ts
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { generateCompatNarrativeReport } from '../src/domain/saju/compatibility/narrative/generateCompatNarrativeReport';
import { RELATIONSHIP_TYPE_KO } from '../src/domain/saju/compatibility/compatibilityTypes';

const key = (process.env.OPENAI_API_KEY ?? '').trim();
if (!key) { console.error('OPENAI_API_KEY 없음 (.env.local)'); process.exit(1); }
const client = new OpenAI({ apiKey: key });

// 섹션별 finishReason 수집 (finish=length 감지용)
let finishLog: Array<{ section: string; finish?: string; len: number; parseOk: boolean }> = [];

const caller = async (prompt: any, callOpts: any) => {
  const res = await client.chat.completions.create(
    {
      model: process.env.COMPAT_V4_GPT_MODEL ?? process.env.SAJU_V4_GPT_MODEL ?? 'gpt-4o-mini',
      temperature: 0.6,
      max_tokens: callOpts?.maxTokens ?? 1500,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: prompt.system },
        { role: 'user', content: prompt.user },
      ],
    },
    { timeout: 60_000, maxRetries: 0 },
  );
  const text = res.choices[0]?.message?.content ?? '';
  const finish = res.choices[0]?.finish_reason;
  let parseOk = false;
  try { JSON.parse(text.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()); parseOk = true; } catch {}
  finishLog.push({ section: String(prompt.sectionId), finish, len: text.length, parseOk });
  return { text, finishReason: finish };
};

const A = { name: 'A', gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' };
const B = { name: 'B', gender: 'male', calendarType: 'solar', birthDate: '1988-03-15', birthTime: '03:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' };

const SAMPLES: Array<{ type: any; file: string }> = [
  { type: 'dating', file: 'compat-narrative-sample-dating.md' },
  { type: 'reunion_or_breakup', file: 'compat-narrative-sample-reunion.md' },
  { type: 'crush_or_something', file: 'compat-narrative-sample-crush.md' },
];

function mdEscape(s: string) { return (s ?? '').trim(); }

function renderMarkdown(type: string, result: any): string {
  const r = result.report;
  const ff = result.futureFlow ?? [];
  const L: string[] = [];
  L.push(`# 궁합 — ${RELATIONSHIP_TYPE_KO[type] ?? type}`);
  L.push('');
  L.push(`> **${mdEscape(r.compatibilityCard?.title)}**`);
  if (r.compatibilityCard?.snsPhrase) L.push(`> ${mdEscape(r.compatibilityCard.snsPhrase)}`);
  L.push('');
  if (r.compatibilityCard?.keywords?.length) L.push(`**키워드:** ${r.compatibilityCard.keywords.join(' · ')}`);
  L.push('');
  L.push(`## 두 사람의 관계를 한 문장으로 말하면`);
  if (r.relationshipOverview?.oneLine) L.push(`*${mdEscape(r.relationshipOverview.oneLine)}*`);
  L.push('');
  L.push(mdEscape(r.relationshipOverview?.body));
  L.push('');
  L.push(`## 이 관계가 이렇게 느껴지는 이유`);
  L.push(mdEscape(r.relationshipMechanism?.body));
  L.push('');
  L.push(`## 서로에게 끌리는 지점과 엇갈리는 지점`);
  L.push(mdEscape(r.attractionAndFriction?.body));
  L.push('');
  L.push(`## 현실에서 반복되기 쉬운 관계 패턴`);
  L.push(mdEscape(r.repeatedPattern?.body));
  L.push('');
  L.push(`## 이 관계를 좋게 쓰는 방법`);
  L.push(mdEscape(r.relationshipGuide?.body));
  L.push('');
  L.push(`## 관계 유형별 마지막 조언`);
  L.push(mdEscape(r.finalAdvice?.body));
  L.push('');
  if (ff.length) {
    L.push(`## 이후 3년 흐름 (요약)`);
    for (const y of ff) L.push(`- **${y.year}** — ${mdEscape(y.theme)}${y.opportunity ? ` · 기회: ${mdEscape(y.opportunity)}` : ''}${y.caution ? ` · 주의: ${mdEscape(y.caution)}` : ''}`);
    L.push('');
  }
  return L.join('\n');
}

(async () => {
  const tmpDir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
  for (const s of SAMPLES) {
    finishLog = [];
    const t0 = Date.now();
    let result: any;
    try {
      result = await generateCompatNarrativeReport(A as any, B as any, s.type, { callGpt: caller, maxRepairAttempts: 0 });
    } catch (e: any) {
      console.log(`\n[${s.type}] FATAL after ${((Date.now() - t0) / 1000).toFixed(1)}s: ${e?.message ?? e}`);
      continue;
    }
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    const r = result.report; const v = result.validation;
    const secs: Record<string, any> = {
      relationshipOverview: r.relationshipOverview?.body, relationshipMechanism: r.relationshipMechanism?.body,
      attractionAndFriction: r.attractionAndFriction?.body, repeatedPattern: r.repeatedPattern?.body,
      relationshipGuide: r.relationshipGuide?.body, finalAdvice: r.finalAdvice?.body,
    };
    const empties = Object.keys(secs).filter(k => !secs[k] || !String(secs[k]).trim());
    const allStop = finishLog.every(f => f.finish === 'stop');
    const texts = [r.compatibilityCard?.title, r.compatibilityCard?.snsPhrase, ...(r.compatibilityCard?.keywords || []),
      r.relationshipOverview?.oneLine, ...Object.values(secs)].filter(Boolean).join('\n');
    const leak = /mustUseFacts|computedEvidence|sectionId|ABSOLUTE_RULES|JSON\s*schema|\bvalidator\b|\b(ro|mech|af|rp|rg|fa|cc)-[a-z0-9]/i.test(texts);
    const score = /\d+\s*점|상위\s*\d+\s*%|궁합\s*\d+/.test(texts);
    const fatal = /반드시\s*헤어|무조건\s*재회|운명입니다|상대는\s*반드시\s*돌아|절대\s*안\s*맞|바람납니다|이혼합니다/.test(texts);
    const md = renderMarkdown(s.type, result);
    const fp = path.join(tmpDir, s.file);
    fs.writeFileSync(fp, md, 'utf8');
    console.log(`\n================ [${s.type}] ================`);
    console.log(`success: yes | time: ${dt}s | attempts: ${result.attempts}`);
    console.log(`high: ${v.highCount} | medium: ${v.mediumCount} | low: ${v.lowCount}`);
    console.log(`empties: [${empties}]`);
    console.log(`finish=stop(all): ${allStop} | sections: ${finishLog.map(f => `${f.section.slice(0, 8)}:${f.finish}/${f.len}`).join(', ')}`);
    console.log(`leak: ${leak} | score: ${score} | fatalism: ${fatal}`);
    console.log(`saved: ${fp} (${md.length} chars)`);
  }
  process.exit(0);
})();
