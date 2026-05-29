// 용신 고도화 V1 diagnostic — P2 단위 테스트.
//
// 검증 원칙:
//   - diagnostic은 analyzeUsefulGod 결과를 변경하지 않는다(final invariant).
//   - 패턴 플래그/충돌/후보는 임계값 기반 일반 규칙이어야 한다(특정 케이스 하드코딩 금지).
//   - calc 용신 자체는 기존 edge fixture 단언과 동일하게 유지된다.
import { describe, it, expect } from 'vitest';
import { normalizeBirthInput } from '../calendar/normalizeBirthInput';
import { buildPrecisionContext } from '../calendar/precisionContext';
import { calculatePillars } from '../calendar/pillarCalculator';
import { analyzeTenGods } from '../analysis/tenGodAnalyzer';
import { analyzeElementStrength } from '../analysis/elementStrengthAnalyzer';
import { analyzeDayMasterStrength } from '../analysis/dayMasterStrengthAnalyzer';
import { analyzeStructure } from '../analysis/structureAnalyzer';
import { analyzeUsefulGod } from '../analysis/usefulGodAnalyzer';
import { DEFAULT_RULE_CONFIG } from '../rules/ruleConfig';
import { analyzeYongsinDiagnostic } from '../analysis/yongsinDiagnostic';

const NOW = new Date('2026-05-28T00:00:00Z');

function compute(input: any) {
  const norm = normalizeBirthInput(input, NOW);
  const pctx = buildPrecisionContext(norm, input);
  const pillars = calculatePillars(norm, DEFAULT_RULE_CONFIG, pctx.pillarOptions).pillars;
  const tenGods = analyzeTenGods(pillars);
  const elements = analyzeElementStrength(pillars);
  const dayMasterStrength = analyzeDayMasterStrength(pillars, tenGods, elements);
  const structure = analyzeStructure(pillars, tenGods, elements);
  const usefulGod = analyzeUsefulGod({ pillars, tenGods, elements, dayMasterStrength, structure });
  return { pillars, tenGods, elements, dayMasterStrength, structure, usefulGod, calculationMeta: pctx.calculationMeta };
}
function diagnose(input: any) {
  const c = compute(input);
  return {
    diag: analyzeYongsinDiagnostic({
      usefulGod: c.usefulGod, tenGods: c.tenGods, elements: c.elements,
      dayMasterStrength: c.dayMasterStrength, structure: c.structure,
      pillars: c.pillars, calculationMeta: c.calculationMeta,
    }),
    src: c,
  };
}

const daejeon = (bt: string) => ({ gender: 'female', calendarType: 'solar', birthDate: '1995-06-22', birthTime: bt, birthTimeConfidence: 'exact', timezone: 'Asia/Seoul', calculationMode: 'precision-v1', birthPlaceId: 'KR-30' });
const legacy = (date: string, time: string) => ({ gender: 'male', calendarType: 'solar', birthDate: date, birthTime: time, birthTimeConfidence: 'exact', timezone: 'Asia/Seoul', calculationMode: 'legacy' });

describe('yongsinDiagnostic — 대전 17:29 (申, 印 strong)', () => {
  const { diag } = diagnose(daejeon('17:29'));
  it('currentFinalYongsin 미러 (用水/喜木/忌火)', () => {
    expect(diag.currentFinalYongsin.primary).toBe('water');
    expect(diag.currentFinalYongsin.secondary).toBe('wood');
    expect(diag.currentFinalYongsin.unfavorable).toBe('fire');
  });
  it('insungExcess=strong, moDaMyeolJa=true', () => {
    expect(diag.patternFlags.insungExcess).toBe('strong');
    expect(diag.patternFlags.moDaMyeolJa).toBe(true);
  });
  it('drain=火, control=土', () => {
    expect(diag.drainCandidate?.element).toBe('fire');
    expect(diag.controlCandidate?.element).toBe('earth');
  });
  it('conflictFlags: final_vs_remedy + strength_method_vs_insung_excess 포함', () => {
    expect(diag.conflictFlags).toContain('final_vs_remedy');
    expect(diag.conflictFlags).toContain('strength_method_vs_insung_excess');
    expect(diag.conflictFlags).toContain('climate_vs_excess_pattern');
    expect(diag.conflictFlags).toContain('climate_vs_drain');
  });
});

describe('yongsinDiagnostic — 대전 17:30 (酉, 印 mild, 경계)', () => {
  const { diag } = diagnose(daejeon('17:30'));
  it('final 용신 불변 (用水)', () => {
    expect(diag.currentFinalYongsin.primary).toBe('water');
  });
  it('insungExcess=mild, moDaMyeolJa=true', () => {
    expect(diag.patternFlags.insungExcess).toBe('mild');
    expect(diag.patternFlags.moDaMyeolJa).toBe(true);
  });
  it('drain=火, control=土', () => {
    expect(diag.drainCandidate?.element).toBe('fire');
    expect(diag.controlCandidate?.element).toBe('earth');
  });
  it('boundarySensitivity sensitive=true + note', () => {
    expect(diag.boundarySensitivity.sensitive).toBe(true);
    expect(diag.boundarySensitivity.note).toBeTruthy();
  });
  it('mild에서도 strength_method_vs_insung_excess 켜짐 (결정 기준 명시)', () => {
    expect(diag.conflictFlags).toContain('strength_method_vs_insung_excess');
  });
});

describe('yongsinDiagnostic — negative (印 낮은 일반 신약)', () => {
  // C16: 1979-06-06 — 여름·신약·用水지만 印 거의 0 (財多身弱). 대전과 대조.
  const { diag, src } = diagnose(legacy('1979-06-06', '06:00'));
  it('印 합 < 3.0 → insungExcess=null, moDaMyeolJa=false', () => {
    const insung = (src.tenGods.totals['정인'] ?? 0) + (src.tenGods.totals['편인'] ?? 0);
    expect(insung).toBeLessThan(3.0);
    expect(diag.patternFlags.insungExcess).toBeNull();
    expect(diag.patternFlags.moDaMyeolJa).toBe(false);
  });
  it('drain/control 후보 없음, climate_vs_excess_pattern 없음', () => {
    expect(diag.drainCandidate).toBeNull();
    expect(diag.controlCandidate).toBeNull();
    expect(diag.conflictFlags).not.toContain('climate_vs_excess_pattern');
  });
});

describe('yongsinDiagnostic — bigeop 과다', () => {
  // C12: 1987-05-05 — 比劫 합 ≥ 3.5, 印 정상.
  const { diag } = diagnose(legacy('1987-05-05', '00:30'));
  it('bigeopExcess=true, insungExcess=null, moDaMyeolJa=false', () => {
    expect(diag.patternFlags.bigeopExcess).toBe(true);
    expect(diag.patternFlags.insungExcess).toBeNull();
    expect(diag.patternFlags.moDaMyeolJa).toBe(false);
  });
});

describe('yongsinDiagnostic — 印 strong 이나 신강 (dmWeak 게이트)', () => {
  // J3: 1990-09-25 — 印 strong(금) 인데 balanced/신강 → 母多滅子 아님.
  const { diag } = diagnose(legacy('1990-09-25', '18:00'));
  it('insungExcess=strong, but moDaMyeolJa=false (신약 아님)', () => {
    expect(diag.patternFlags.insungExcess).toBe('strong');
    expect(diag.patternFlags.moDaMyeolJa).toBe(false);
  });
});

describe('yongsinDiagnostic — climate_vs_excess positive 보강 (비-대전, 가을)', () => {
  // 1972-09-30 — 갑목·유월(가을)·신약·印過多·엔진 최종용신=印(水).
  // 대전(여름)과 다른 계절에서도 climate_vs_excess_pattern/final_vs_remedy가 켜짐을
  // 확인 → 플래그가 "여름 특정"이 아니라 印 패턴 기반 일반 규칙임을 입증.
  const { diag } = diagnose(legacy('1972-09-30', '16:00'));
  it('insungExcess 비-null + moDaMyeolJa=true', () => {
    expect(diag.patternFlags.insungExcess).not.toBeNull();
    expect(diag.patternFlags.moDaMyeolJa).toBe(true);
  });
  it('최종 용신=印(水), conflictFlags에 climate_vs_excess_pattern + final_vs_remedy', () => {
    expect(diag.currentFinalYongsin.primary).toBe('water');
    expect(diag.conflictFlags).toContain('climate_vs_excess_pattern');
    expect(diag.conflictFlags).toContain('final_vs_remedy');
  });
});

describe('yongsinDiagnostic — 비-목 일간 positive (element-agnostic 일반성)', () => {
  // climate_vs_excess_pattern / final_vs_remedy 가 목일간·대전(印=水)에 과적합되지 않았음을
  // 서로 다른 일간 오행 + 서로 다른 印 오행 + 서로 다른 用神으로 입증.
  // (synthetic, calc-only, 하드코딩 아님 — scan으로 발굴한 일반 케이스)

  // 수 일간(임수)·인월·신약 → 印(金) 과다 → 用金. drain=木 / control=火.
  const water = diagnose(legacy('1961-02-18', '02:00')).diag;
  it('수 일간: 用金(印=金) + moDa + climate_vs_excess + final_vs_remedy', () => {
    expect(water.currentFinalYongsin.primary).toBe('metal');
    expect(water.patternFlags.moDaMyeolJa).toBe(true);
    expect(water.patternFlags.insungExcess).not.toBeNull();
    expect(water.conflictFlags).toContain('climate_vs_excess_pattern');
    expect(water.conflictFlags).toContain('final_vs_remedy');
  });

  // 화 일간(병화)·진월·신약 → 印(木) 과다 → 用木. drain=土 / control=金.
  const fire = diagnose(legacy('1962-04-18', '14:00')).diag;
  it('화 일간: 用木(印=木) + moDa + climate_vs_excess + final_vs_remedy', () => {
    expect(fire.currentFinalYongsin.primary).toBe('wood');
    expect(fire.patternFlags.moDaMyeolJa).toBe(true);
    expect(fire.conflictFlags).toContain('climate_vs_excess_pattern');
    expect(fire.conflictFlags).toContain('final_vs_remedy');
  });
});

describe('yongsinDiagnostic — final invariant', () => {
  it('analyzeYongsinDiagnostic 호출이 usefulGod 객체를 변경하지 않음', () => {
    const c = compute(daejeon('17:29'));
    const before = JSON.parse(JSON.stringify(c.usefulGod));
    analyzeYongsinDiagnostic({
      usefulGod: c.usefulGod, tenGods: c.tenGods, elements: c.elements,
      dayMasterStrength: c.dayMasterStrength, structure: c.structure,
      pillars: c.pillars, calculationMeta: c.calculationMeta,
    });
    expect(c.usefulGod).toEqual(before);
  });
  it('calc 용신은 기존 edge fixture 단언과 동일 (用水/忌火)', () => {
    const c = compute(daejeon('17:29'));
    expect(c.usefulGod.primaryUseful.value).toBe('water');
    expect(c.usefulGod.unfavorable[0]).toBe('fire');
  });
});
