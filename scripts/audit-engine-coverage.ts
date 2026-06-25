// 엔진→해설 커버리지 감사 (GPT 호출 없음, 결정론).
//   실행: npx tsx scripts/audit-engine-coverage.ts
//   계산된 명리 신호가 실제 해설 본문(tmp/antirepeat-after-A.txt)에 반영됐는지 대조.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { calculateAnalysisOnly } from '../src/domain/saju/generatePersonalSajuReport';
import type { BirthInput } from '../src/domain/saju/calendar/normalizeBirthInput';

const NOW = new Date('2026-06-25T00:00:00Z');
const A: BirthInput = { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' };

const gi: any = calculateAnalysisOnly(A, NOW);
writeFileSync(resolve(process.cwd(), 'tmp/gptinput-A.json'), JSON.stringify(gi, null, 2), 'utf8');

const narr = existsSync('tmp/antirepeat-after-A.txt') ? readFileSync('tmp/antirepeat-after-A.txt', 'utf8') : '';
const inNarr = (tok: string) => tok && narr.includes(tok);
const mark = (b: boolean) => (b ? '✅ 반영됨' : '❌ 버려짐');

function line(label: string, tokens: string[]) {
  const present = tokens.filter(inNarr);
  console.log(`  ${mark(present.length > 0)}  ${label}: [${tokens.join(', ')}]` + (present.length ? `  (나온 것: ${present.join(', ')})` : ''));
}

const core = gi.coreAnalysis ?? {};
console.log('════════ 엔진이 계산한 것 vs 해설 반영 (A: 1995-07-06 12:00 여) ════════\n');

// 1) 십성 분포 (있는 것 / 없는 것)
const tg = core.tenGods ?? {};
const totals: Record<string, number> = tg.totals ?? {};
if (Object.keys(totals).length) {
  const present = Object.entries(totals).filter(([, v]) => Number(v) > 0).map(([k]) => k);
  const absent = ['비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인'].filter(k => !(Number(totals[k]) > 0));
  console.log('[십성 분포]');
  line('보유 십성', present);
  console.log(`  ℹ️ 결핍 십성(없음): [${absent.join(', ')}] — "없는 십성"의 의미는 보통 해설에 거의 안 나옴`);
}

// 2) 오행 강약
const es = core.elementStrength ?? {};
console.log('\n[오행 강약]');
console.log('  ' + JSON.stringify(es.scores ?? es.percentages ?? es));

// 3) 신강/신약
console.log('\n[신강약]');
line('level: ' + (core.dayMasterStrength?.level ?? '?'), ['신강','신약','중화','강한','약한']);

// 4) 용신 (5관점)
const ug = core.usefulGod ?? {};
console.log('\n[용신 5관점]');
console.log('  primary=' + JSON.stringify(ug.primaryUseful) + ' favorable=' + JSON.stringify(ug.favorable) + ' unfavorable=' + JSON.stringify(ug.unfavorable));
console.log('  methodScores=' + JSON.stringify(ug.methodScores) + '  ← 5관점(조후/억부/통관/병약/격국) 점수는 계산되지만 해설엔 결론 1줄만');

// 5) 합충형파해
const cc = core.combinationsAndConflicts ?? {};
console.log('\n[합충형파해] — 계산은 풍부, 해설 반영은?');
line('합(combinations)', cc.combinations ?? []);
line('충(conflicts)', cc.conflicts ?? []);
line('형(punishments)', cc.punishments ?? []);
line('해(harms)', cc.harms ?? []);
line('파(destructions)', cc.destructions ?? []);

// 6) 신살
const stars = (core.specialStars ?? []).map((s: any) => s?.name ?? s);
console.log('\n[신살]');
line('계산된 신살 전체', stars);

// 7) specialPoints (A~I 차별화 포인트)
const sp = (gi.specialPoints ?? []).map((p: any) => p?.name ?? p);
console.log('\n[specialPoints (차별화 포인트)]');
line('계산된 포인트 전체', sp);

// 8) 대운/세운
console.log('\n[대운/세운]');
console.log('  fortune=' + JSON.stringify(gi.fortune).slice(0, 300));
line('현재 대운 관련', ['대운']);

console.log('\n→ 전체 계산 결과: tmp/gptinput-A.json (직접 열어볼 수 있음)');
