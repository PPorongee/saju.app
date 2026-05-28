// Edge boundary fixture — legacy vs precision-v1 관찰 리포트 (로컬 수동 dev 전용).
//
// 목적(관찰 전용, 알고리즘 수정 없음):
//   - 申/酉(신/유) 시진 경계(17:00)에 걸친 synthetic 케이스에서
//     지역별 태양시 보정이 시지/시주를 어떻게 가르는지 관찰한다.
//   - 17:29 vs 17:30 (1분 차) 가 보정 후 경계를 넘나드는지 관찰한다.
//   - legacy vs precision-v1 의 일주/오행/십성/신강신약/용신(calc fallback) 차이를 표로 출력.
//
// ⚠️ 주의:
//   - LLM/네트워크 없음. production 실행 금지(로컬에서만).
//   - synthetic "edge boundary fixture" 만 사용 — 실제 사용자/개인정보 아님. 이름 없음.
//   - 용신은 calc fallback 값(분석 엔진). 실서비스 용신은 LLM-primary 이므로 이 값과 다를 수 있음.
//   - 실행: node --import tsx scripts/edge-boundary-fixture-report.ts
import { calculateAnalysisOnly } from '../src/domain/saju/generatePersonalSajuReport';
import { prepareCalculation } from '../src/domain/saju/calendar/precisionAdjust';

const NOW = new Date('2026-05-28T00:00:00Z');

const EL_KO: Record<string, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
const el = (e: string | undefined) => (e ? (EL_KO[e] ?? e) : '-');

// 지역 슬롯: unknown / 서울 / 대전(실 fixture 지역, 17:29-17:30 split 관찰용) / 부산
const REGIONS: Array<{ key: string; placeId: string | null }> = [
  { key: 'unknown(지역없음)', placeId: null },
  { key: '서울(KR-11)', placeId: 'KR-11' },
  { key: '대전(KR-30)', placeId: 'KR-30' },
  { key: '부산(KR-26)', placeId: 'KR-26' },
];
const TIMES = ['17:29', '17:30'];

const baseInput = (birthTime: string) => ({
  gender: 'female' as const,
  calendarType: 'solar' as const,
  birthDate: '1995-06-22',
  birthTime,
  birthTimeConfidence: 'exact' as const,
  timezone: 'Asia/Seoul',
});

function pillarsOf(a: any) {
  const bc = a.birthChart;
  return { year: bc.year, month: bc.month, day: bc.day, hour: bc.hour ?? '-', dm: bc.dayMaster };
}
function elemDist(a: any) {
  const s = a.coreAnalysis.elementStrength;
  const scores = Object.entries(s.scores).map(([k, v]) => `${el(k)}${Number(v).toFixed(1)}`).join(' ');
  return { scores, strongest: (s.strongest || []).map(el).join('·'), excessive: (s.excessive || []).map(el).join('·') || '-', deficient: (s.deficient || []).map(el).join('·') || '-', coldHot: s.climate?.coldHot };
}
function tenGodTop(a: any) {
  const t = a.coreAnalysis.tenGods;
  return { strongest: (t.strongest || []).join('·'), excessive: (t.excessive || []).join('·') || '-' };
}
function strength(a: any) {
  const d = a.coreAnalysis.dayMasterStrength;
  return `${d.level} (score ${Number(d.score).toFixed(2)}, conf ${d.confidence})`;
}
function yongsin(a: any) {
  const u = a.coreAnalysis.usefulGod;
  const yong = el(u.primaryUseful?.value as string);
  const hee = u.secondaryUseful ? el(u.secondaryUseful.value as string) : '-';
  const ki = el((u.unfavorable?.[0]) as string);
  return { yong, hee, ki, conf: u.confidence, ms: u.methodScores };
}

// ── legacy 기준선 (지역 무관) ──
console.log('======================================================================');
console.log(' EDGE BOUNDARY FIXTURE — synthetic, 이름없음 / 1995-06-22 female / 申·酉(17:00) 경계');
console.log(' (용신은 calc fallback. 실서비스는 LLM-primary 라 다를 수 있음)');
console.log('======================================================================');

for (const t of TIMES) {
  const lg = calculateAnalysisOnly({ ...baseInput(t), calculationMode: 'legacy' } as any, NOW);
  const p = pillarsOf(lg); const e = elemDist(lg); const tg = tenGodTop(lg); const y = yongsin(lg);
  console.log(`\n[LEGACY ${t}] (지역 무관)`);
  console.log(`  기둥: 년 ${p.year} / 월 ${p.month} / 일 ${p.day} / 시 ${p.hour}  (일간 ${p.dm})`);
  console.log(`  오행: ${e.scores}  | 최강 ${e.strongest} | 과다 ${e.excessive} | 부족 ${e.deficient} | 한열 ${e.coldHot}`);
  console.log(`  십성: 최강 ${tg.strongest} | 과다 ${tg.excessive}`);
  console.log(`  신강신약: ${strength(lg)}`);
  console.log(`  용신 ${y.yong} / 희신 ${y.hee} / 기신 ${y.ki} (conf ${y.conf})`);
}

// ── precision-v1: 지역 × 시각 ──
for (const t of TIMES) {
  const lg = calculateAnalysisOnly({ ...baseInput(t), calculationMode: 'legacy' } as any, NOW);
  const lp = pillarsOf(lg);
  for (const r of REGIONS) {
    // 태양시 보정 메타 (보정 전/후 clock 노출)
    const [hh, mm] = t.split(':').map(Number);
    const prep = prepareCalculation({
      mode: 'precision-v1', solarYear: 1995, solarMonth: 6, solarDay: 22,
      hour: hh, minute: mm, birthTimeConfidence: 'exact', birthPlaceId: r.placeId,
    });
    const meta = prep.calculationMeta as any;
    const ac = prep.adjustedClock;
    const acStr = ac ? `${String(ac.hour).padStart(2, '0')}:${String(ac.minute).padStart(2, '0')} (${ac.year}-${ac.month}-${ac.day})` : 'null';

    const pr = calculateAnalysisOnly({ ...baseInput(t), calculationMode: 'precision-v1', birthPlaceId: r.placeId ?? undefined } as any, NOW);
    const p = pillarsOf(pr); const e = elemDist(pr); const tg = tenGodTop(pr); const y = yongsin(pr);

    const hourChanged = (lp.hour !== p.hour);
    const dayChanged = (lp.day !== p.day);
    console.log(`\n[PRECISION ${t} · ${r.key}]`);
    console.log(`  보정 전→후: ${t} → ${acStr}  | adj ${meta.solarTimeAdjustmentMinutes}분 | utcOffset ${meta.utcOffsetMinutes} | dst ${meta.dstApplied} | zi ${meta.ziHourPolicy} | placePrec ${meta.birthPlacePrecision}`);
    console.log(`  기둥: 년 ${p.year} / 월 ${p.month} / 일 ${p.day} / 시 ${p.hour}  (일간 ${p.dm})`);
    console.log(`  시주 변화(vs legacy ${lp.hour}): ${hourChanged ? `★ ${lp.hour} → ${p.hour}` : '동일'}  | 일주 변화: ${dayChanged ? `★ ${lp.day} → ${p.day}` : '동일'}`);
    console.log(`  오행: ${e.scores}  | 최강 ${e.strongest} | 과다 ${e.excessive} | 부족 ${e.deficient} | 한열 ${e.coldHot}`);
    console.log(`  십성: 최강 ${tg.strongest} | 과다 ${tg.excessive}`);
    console.log(`  신강신약: ${strength(pr)}`);
    console.log(`  용신 ${y.yong} / 희신 ${y.hee} / 기신 ${y.ki} (conf ${y.conf}) | method[climate ${y.ms.climate} strength ${y.ms.strength} structure ${y.ms.structure}]`);
    if (meta.warnings?.length) console.log(`  warnings: ${meta.warnings.join(' | ')}`);
  }
}
console.log('\n──── 끝 ────');
process.exit(0);
