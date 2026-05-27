// Precision V1 — legacy vs precision-v1 diff 리포트 (로컬 수동 dev 전용).
//   - LLM/네트워크 없음. production 실행 금지(로컬에서만).
//   - synthetic fixture만 사용 — 실제 사용자/개인정보 데이터 절대 금지.
//   - 실행: node --import tsx scripts/precision-diff-report.ts
//   - 차이 원인 label: solar-time-adjustment | zi-hour-policy | dst-offset | timezone | lunar-leap | no-diff
import { calculateAnalysisOnly } from '../src/domain/saju/generatePersonalSajuReport';

const NOW = new Date('2026-05-27T00:00:00Z');

const FIXTURES = [
  { label: '서울 정오(보정으로 시주 영향 적음)', input: { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' }, placeId: 'KR-11' },
  { label: '서울 11:10 (보정 -32 → 시진 경계)', input: { gender: 'male', calendarType: 'solar', birthDate: '2001-04-10', birthTime: '11:10', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' }, placeId: 'KR-11' },
  { label: '23:30 자시 경계 (지역 unknown)', input: { gender: 'female', calendarType: 'solar', birthDate: '1990-03-15', birthTime: '23:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' }, placeId: null },
  { label: '00:10 자시 (지역 known 서울)', input: { gender: 'male', calendarType: 'solar', birthDate: '1988-11-20', birthTime: '00:10', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' }, placeId: 'KR-11' },
  { label: '해외 LA 11:50 (DST/경도)', input: { gender: 'female', calendarType: 'solar', birthDate: '1992-07-01', birthTime: '11:50', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' }, placeId: 'US-LAX' },
  { label: '시간 unknown', input: { gender: 'male', calendarType: 'solar', birthDate: '1979-09-09', birthTimeConfidence: 'unknown', timezone: 'Asia/Seoul' }, placeId: 'KR-26' },
  { label: '음력 윤달 (지역 known 부산)', input: { gender: 'female', calendarType: 'lunar', isLeapMonth: false, birthDate: '1985-08-21', birthTime: '07:40', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' }, placeId: 'KR-26' },
];

function pillarStr(bc) {
  return `년 ${bc.year} / 월 ${bc.month} / 일 ${bc.day} / 시 ${bc.hour ?? '-'} (일간 ${bc.dayMaster})`;
}

/** 변경 원인 label 분류 (휴리스틱: meta + 입력 + 변경 필드). */
function classifyCauses(fx: any, m: any, changed: string[], legacyHour: string): string[] {
  if (changed.length === 0) return ['no-diff'];
  const causes: string[] = [];
  const isZiRange = typeof fx.input.birthTime === 'string' && /^23:/.test(fx.input.birthTime);
  if (isZiRange && (changed.includes('day') || changed.includes('dayMaster'))) causes.push('zi-hour-policy');
  if (m?.solarTimeAdjustmentApplied && m?.solarTimeAdjustmentMinutes !== 0) causes.push('solar-time-adjustment');
  if (m?.dstApplied) causes.push('dst-offset');
  if (m?.timeZoneId && m.timeZoneId !== 'Asia/Seoul') causes.push('timezone');
  if (fx.input.calendarType === 'lunar') causes.push('lunar-leap');
  void legacyHour;
  return causes.length ? causes : ['solar-time-adjustment'];
}

const causeTally: Record<string, number> = {};
let diffCount = 0, sameCount = 0;
for (const fx of FIXTURES) {
  const legacy = calculateAnalysisOnly({ ...fx.input } as any, NOW);
  const precision = calculateAnalysisOnly({ ...fx.input, calculationMode: 'precision-v1', birthPlaceId: fx.placeId ?? undefined } as any, NOW);
  const lc = legacy.birthChart as any, pc = precision.birthChart as any;
  const fields = ['year', 'month', 'day', 'hour', 'dayMaster'];
  const changed = fields.filter(f => (lc[f] ?? '-') !== (pc[f] ?? '-'));
  const m = precision.calculationMeta as any;
  const causes = classifyCauses(fx, m, changed, lc.hour);
  console.log(`\n==== ${fx.label} ====`);
  console.log(`  legacy   : ${pillarStr(lc)}`);
  console.log(`  precision: ${pillarStr(pc)}`);
  if (changed.length === 0) { console.log('  → 차이 없음'); sameCount++; }
  else { console.log(`  → 변경된 기둥: ${changed.join(', ')}`); diffCount++; }
  console.log(`  원인: ${causes.join(', ')}`);
  console.log(`  meta: ver=${m?.calculationVersion} place=${m?.birthPlacePrecision}/${m?.birthPlaceId ?? '-'} tz=${m?.timeZoneId} off=${m?.utcOffsetMinutes} dst=${m?.dstApplied} adj=${m?.solarTimeAdjustmentApplied ? m?.solarTimeAdjustmentMinutes : 'none'} zi=${m?.ziHourPolicy}`);
  if (m?.warnings?.length) console.log(`  warnings: ${m.warnings.join(' | ')}`);
  for (const c of causes) causeTally[c] = (causeTally[c] ?? 0) + 1;
}
console.log(`\n──── 요약: 차이 ${diffCount}건 / 동일 ${sameCount}건 ────`);
console.log('원인별 케이스 수:', Object.entries(causeTally).map(([k, v]) => `${k}=${v}`).join(', '));
process.exit(0);
