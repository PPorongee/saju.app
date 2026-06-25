// Anti-Repeat V1 라이브 검증 (실제 GPT 호출).
//   실행: npx tsx scripts/verify-antirepeat.ts
//   - BEFORE: 기존 v4 샘플(tmp/narrative-diet-run1.txt)에 새 탐지기 → 반복 건수(무비용)
//   - AFTER : 새 코드로 fixture A·C 실제 생성 → repetitionSafe·반복 건수·전체 텍스트
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// .env.local 수동 로드 (tsx는 Next env 자동주입 X). BOM 안전 처리.
function loadEnv() {
  const p = resolve(process.cwd(), '.env.local');
  if (!existsSync(p)) return;
  const raw = readFileSync(p, 'utf8').replace(/^﻿/, '');
  for (const line of raw.split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv();

import OpenAI from 'openai';
import { findCrossSectionRepeats } from '../src/domain/saju/narrative/narrativeReportValidator';
import { generateNarrativePersonalSajuReport, type NarrativeGptCaller } from '../src/domain/saju/generatePersonalSajuReport';
import type { BirthInput } from '../src/domain/saju/calendar/normalizeBirthInput';

// server-only를 import하는 saju-v4-gpt-caller 대신, 동일 파라미터의 최소 caller를 직접 구성
// (모델/온도/토큰은 운영과 동일: gpt-4o-mini, 0.6, 섹션별 maxTokens).
function makeCaller(): NarrativeGptCaller {
  const client = new OpenAI({ apiKey: (process.env.OPENAI_API_KEY ?? '').trim() });
  const model = process.env.SAJU_V4_GPT_MODEL ?? 'gpt-4o-mini';
  const temperature = Number(process.env.SAJU_V4_GPT_TEMPERATURE ?? '0.6');
  const defMax = Number(process.env.SAJU_V4_GPT_MAX_TOKENS ?? '5500');
  return async ({ system, user }, callOpts) => {
    const res = await client.chat.completions.create({
      model, temperature, max_tokens: callOpts?.maxTokens ?? defMax,
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    });
    const text = res.choices[0]?.message?.content;
    if (!text) throw new Error('OpenAI returned empty response');
    return text;
  };
}

const NOW = new Date('2026-06-25T00:00:00Z');

function parseBlocks(text: string): Array<{ id: string; index: number; body: string }> {
  const re = /^#\s+(\d+)\.\s+(.+)$/gm;
  const ms: Array<{ start: number; index: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) ms.push({ start: m.index, index: Number(m[1]) });
  const out: Array<{ id: string; index: number; body: string }> = [];
  for (let i = 0; i < ms.length; i++) {
    const body = text.slice(ms[i].start, ms[i + 1] ? ms[i + 1].start : text.length);
    out.push({ id: `sec${ms[i].index}`, index: ms[i].index, body });
  }
  return out;
}

function reportRepeats(label: string, text: string) {
  const repeats = findCrossSectionRepeats(parseBlocks(text));
  console.log(`\n[${label}] 섹션 간 near-verbatim 재탕: ${repeats.length}건`);
  for (const r of repeats.slice(0, 6)) {
    console.log(`  · ${r.earlierId} → ${r.laterId} (유사도 ${r.sim.toFixed(2)})`);
    console.log(`      앞: ${r.earlierSentence.slice(0, 50)}`);
    console.log(`      뒤: ${r.laterSentence.slice(0, 50)}`);
  }
}

async function main() {
  // ── BEFORE: 기존 샘플 ──
  const beforePath = resolve(process.cwd(), 'tmp/narrative-diet-run1.txt');
  if (existsSync(beforePath)) {
    reportRepeats('BEFORE (tmp/narrative-diet-run1.txt, 수정 전 v4 샘플)', readFileSync(beforePath, 'utf8'));
  } else {
    console.log('[BEFORE] tmp/narrative-diet-run1.txt 없음 — 스킵');
  }

  // ── AFTER: 새 코드로 실제 생성 ──
  const caller = makeCaller();
  const fixtures: Array<{ name: string; input: BirthInput }> = [
    { name: 'A(1995-07-06 12:00 여)', input: { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' } },
    { name: 'C(2001-11-22 20:45 여)', input: { gender: 'female', calendarType: 'solar', birthDate: '2001-11-22', birthTime: '20:45', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' } },
  ];

  for (const fx of fixtures) {
    const t0 = Date.now();
    const res = await generateNarrativePersonalSajuReport(fx.input, { callGpt: caller, now: NOW });
    const dt = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n══════ AFTER · ${fx.name} (${dt}s) ══════`);
    console.log(`attempts=${res.attempts}  repairedSections=[${res.repairedSections.join(', ')}]`);
    console.log(`exposureSafe=${res.validation.exposureSafe}  repetitionSafe=${(res.validation as any).repetitionSafe}  highCount=${res.validation.highCount}`);
    reportRepeats(`AFTER · ${fx.name} · 최종 출력`, res.reportText);
    const outPath = resolve(process.cwd(), `tmp/antirepeat-after-${fx.name.slice(0, 1)}.txt`);
    writeFileSync(outPath, res.reportText, 'utf8');
    console.log(`  → 전체 텍스트 저장: ${outPath}`);
  }
}

main().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
