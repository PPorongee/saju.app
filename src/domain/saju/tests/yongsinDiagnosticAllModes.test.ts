// All-mode yongsin diagnostic 배선 테스트 (yearly/compat/pregnancy, off-by-default).
//
// 검증:
//   - 각 모드 별도 flag OFF(기본) → prompt에 진단 지침 없음, raw 미노출 (기존 동작 무변경).
//   - flag ON → 해당 모드 prompt.system에 curated 지침 + 모드별 안전라인 포함.
//   - 개인사주 flag와 독립 (개인사주 flag 미설정이어도 모드 flag로 동작).
//   - raw diagnostic/internal key는 prompt 어디에도 노출되지 않음.
import { describe, it, expect, afterEach } from 'vitest';
import { generateYearlyFortuneReport } from '../yearly/generateYearlyFortuneReport';
import { generateCompatibilityReport } from '../compatibility/generateCompatibilityReport';
import { generatePregnancyNarrativeReport } from '../pregnancy/narrative/generatePregnancyNarrativeReport';

const NOW = new Date('2026-05-28T00:00:00Z');
const FLAGS = ['SAJU_YONGSIN_DIAGNOSTIC', 'SAJU_YONGSIN_DIAGNOSTIC_YEARLY', 'SAJU_YONGSIN_DIAGNOSTIC_COMPAT', 'SAJU_YONGSIN_DIAGNOSTIC_PREGNANCY'];
afterEach(() => { for (const f of FLAGS) delete process.env[f]; });

const A = { gender: 'female', calendarType: 'solar', birthDate: '1995-06-22', birthTime: '17:29', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul', calculationMode: 'precision-v1', birthPlaceId: 'KR-30' } as any;
const B = { gender: 'male', calendarType: 'solar', birthDate: '1988-03-15', birthTime: '03:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' } as any;
const BABY = { gender: 'unknown', calendarType: 'solar', birthDate: '2026-09-01', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' } as any;

const MARKER = '[보조 용신 진단';
const RAW = ['yongsinDiagnostic', 'conflictFlags', 'climate_vs_excess_pattern', 'insungExcess', 'moDaMyeolJa', 'currentFinalYongsin'];
const rawLeak = (s: string) => RAW.filter(k => s.includes(k));

// ── yearly ──
async function runYearly() {
  const systems: string[] = []; const users: string[] = [];
  await generateYearlyFortuneReport(
    { birth: A, currentDate: '2026-05-25', relationshipStatus: 'unknown' } as any,
    { callGpt: async (p: any) => { systems.push(p.system); users.push(p.user); return '{}'; }, maxRepairAttempts: 0, now: NOW },
  );
  return { systems, users };
}
describe('all-mode — yearly', () => {
  it('flag OFF: 지침 없음 + raw 미노출', async () => {
    const { systems, users } = await runYearly();
    expect(systems.some(s => s.includes(MARKER))).toBe(false);
    expect(users.flatMap(rawLeak)).toEqual([]);
  });
  it('flag ON: 지침 + (올해운세) 라인 포함, raw 미노출', async () => {
    process.env.SAJU_YONGSIN_DIAGNOSTIC_YEARLY = 'true';
    const { systems, users } = await runYearly();
    expect(systems.some(s => s.includes(MARKER))).toBe(true);
    expect(systems.some(s => s.includes('(올해운세)'))).toBe(true);
    expect(systems.some(s => s.includes('최종 용신'))).toBe(true);
    expect(users.flatMap(rawLeak)).toEqual([]);
  });
});

// ── compat ──
async function runCompat() {
  const systems: string[] = []; const users: string[] = [];
  await generateCompatibilityReport(A, B, 'dating' as any, {
    callGpt: async (p: any) => { systems.push(p.system); users.push(p.user); return ''; }, maxRepairAttempts: 0, now: NOW,
  });
  return { systems, users };
}
describe('all-mode — compat', () => {
  it('flag OFF: 지침 없음 + raw 미노출', async () => {
    const { systems, users } = await runCompat();
    expect(systems.some(s => s.includes(MARKER))).toBe(false);
    expect(users.flatMap(rawLeak)).toEqual([]);
  });
  it('flag ON: A/B 분리 지침 + (궁합) 라인, raw 미노출', async () => {
    process.env.SAJU_YONGSIN_DIAGNOSTIC_COMPAT = 'true';
    const { systems, users } = await runCompat();
    expect(systems.some(s => s.includes(MARKER))).toBe(true);
    expect(systems.some(s => s.includes('(궁합)'))).toBe(true);
    expect(systems.some(s => s.includes('A(첫 번째 사람)'))).toBe(true);
    expect(systems.some(s => s.includes('B(두 번째 사람)'))).toBe(true);
    expect(users.flatMap(rawLeak)).toEqual([]);
  });
});

// ── pregnancy ──
async function runPregnancy() {
  const systems: string[] = []; const users: string[] = [];
  await generatePregnancyNarrativeReport(A, BABY, {
    callGpt: async (p: any) => { systems.push(p.system); users.push(p.user); return { text: '{}', finishReason: 'stop' }; },
    maxRepairAttempts: 0, now: NOW,
  } as any);
  return { systems, users };
}
describe('all-mode — pregnancy', () => {
  it('flag OFF: 지침 없음 + raw 미노출', async () => {
    const { systems, users } = await runPregnancy();
    expect(systems.some(s => s.includes(MARKER))).toBe(false);
    expect(users.flatMap(rawLeak)).toEqual([]);
  });
  it('flag ON: 엄마(母) 지침 + (태교) 라인, raw 미노출', async () => {
    process.env.SAJU_YONGSIN_DIAGNOSTIC_PREGNANCY = 'true';
    const { systems, users } = await runPregnancy();
    expect(systems.some(s => s.includes(MARKER))).toBe(true);
    expect(systems.some(s => s.includes('(태교)'))).toBe(true);
    expect(systems.some(s => s.includes('엄마(母)'))).toBe(true);
    expect(users.flatMap(rawLeak)).toEqual([]);
  });
});
