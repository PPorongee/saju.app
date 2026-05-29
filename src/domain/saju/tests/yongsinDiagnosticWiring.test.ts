// P4 — yongsin diagnostic GPT input 배선 (off-by-default) 테스트.
//
// 검증:
//   - flag OFF(기본): personal gptInput에 yongsinDiagnostic 키 자체가 없음 → byte-identical.
//   - flag ON: yongsinDiagnostic 부착, currentFinalYongsin은 usefulGod와 동일(미러), 대전 drain=火/control=土.
//   - 어느 경우든 coreAnalysis.usefulGod(최종 용신)는 변하지 않음.
import { describe, it, expect, afterEach } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';

const NOW = new Date('2026-05-28T00:00:00Z');
const FLAG = 'SAJU_YONGSIN_DIAGNOSTIC';
const daejeon = (bt: string) => ({
  gender: 'female', calendarType: 'solar', birthDate: '1995-06-22', birthTime: bt,
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul', calculationMode: 'precision-v1', birthPlaceId: 'KR-30',
} as any);

afterEach(() => { delete process.env[FLAG]; });

describe('P4 wiring — flag OFF (기본)', () => {
  it('yongsinDiagnostic 키 부재 (in 연산 false)', () => {
    delete process.env[FLAG];
    const out = calculateAnalysisOnly(daejeon('17:29'), NOW);
    expect('yongsinDiagnostic' in out).toBe(false);
    expect(out.yongsinDiagnostic).toBeUndefined();
  });
  it('직렬화 JSON에 yongsinDiagnostic 문자열 미포함 (byte-identical 보장)', () => {
    delete process.env[FLAG];
    const json = JSON.stringify(calculateAnalysisOnly(daejeon('17:29'), NOW));
    expect(json).not.toContain('yongsinDiagnostic');
  });
  it('flag=false 명시도 OFF로 처리', () => {
    process.env[FLAG] = 'false';
    const out = calculateAnalysisOnly(daejeon('17:29'), NOW);
    expect('yongsinDiagnostic' in out).toBe(false);
  });
  it('flag OFF에서도 최종 용신은 用水/忌火 그대로', () => {
    delete process.env[FLAG];
    const out = calculateAnalysisOnly(daejeon('17:29'), NOW);
    expect(out.coreAnalysis.usefulGod.primaryUseful.value).toBe('water');
    expect(out.coreAnalysis.usefulGod.unfavorable[0]).toBe('fire');
  });
});

describe('P4 wiring — flag ON', () => {
  it('yongsinDiagnostic 부착', () => {
    process.env[FLAG] = 'true';
    const out = calculateAnalysisOnly(daejeon('17:29'), NOW);
    expect(out.yongsinDiagnostic).toBeDefined();
  });
  it('currentFinalYongsin은 usefulGod 미러 (최종 용신 미변경)', () => {
    process.env[FLAG] = 'true';
    const out = calculateAnalysisOnly(daejeon('17:29'), NOW);
    const ug = out.coreAnalysis.usefulGod;
    const diag = out.yongsinDiagnostic!;
    expect(diag.currentFinalYongsin.primary).toBe(ug.primaryUseful.value);
    expect(diag.currentFinalYongsin.unfavorable).toBe(ug.unfavorable[0]);
    // 용신 자체는 부착 여부와 무관하게 동일
    expect(ug.primaryUseful.value).toBe('water');
    expect(ug.unfavorable[0]).toBe('fire');
  });
  it('대전 fixture: drainCandidate=火, controlCandidate=土', () => {
    process.env[FLAG] = 'true';
    const out = calculateAnalysisOnly(daejeon('17:29'), NOW);
    const diag = out.yongsinDiagnostic!;
    expect(diag.drainCandidate?.element).toBe('fire');
    expect(diag.controlCandidate?.element).toBe('earth');
    expect(diag.patternFlags.moDaMyeolJa).toBe(true);
  });
});

describe('P4 wiring — ON/OFF 핵심 분석 동일성', () => {
  it('flag on/off에서 coreAnalysis가 동일 (diagnostic 부착만 추가, 본체 무변경)', () => {
    delete process.env[FLAG];
    const off = calculateAnalysisOnly(daejeon('17:30'), NOW);
    process.env[FLAG] = 'true';
    const on = calculateAnalysisOnly(daejeon('17:30'), NOW);
    expect(on.coreAnalysis).toEqual(off.coreAnalysis);
    expect(on.birthChart).toEqual(off.birthChart);
  });
});
