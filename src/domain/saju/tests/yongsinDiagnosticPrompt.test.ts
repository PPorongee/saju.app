// P5 — yongsin diagnostic 프롬프트 배선 테스트.
//
// 검증:
//   - flag OFF: narrative 프롬프트에 진단 지침 없음, raw yongsinDiagnostic 미노출, byte-identical 유지.
//   - flag ON: "최종 용신 변경 금지" 지침 포함, drain/control 보조 후보 설명, 기신 겹침 시 단정 금지.
//   - flag ON: raw 진단(내부 conflictFlag 이름 등)은 JSON 덤프에 노출되지 않음(curated만).
//   - 최종 용신(usefulGod)은 어느 경우든 用水로 불변.
import { describe, it, expect, afterEach } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { normalizeBirthInput } from '../calendar/normalizeBirthInput';
import { buildContextGuard } from '../report/contextGuard';
import { buildTopicCoverageMap } from '../narrative/topicCoverageBuilder';
import { buildLifeSceneHints } from '../narrative/lifeSceneHintBuilder';
import { buildNarrativePlans } from '../narrative/narrativePlanBuilder';
import { DEFAULT_NARRATIVE_DEPTH_OPTIONS } from '../narrative/narrativeTypes';
import {
  buildSectionPrompt, buildNarrativePersonalSajuPrompt, renderYongsinDiagnosticGuidance,
} from '../narrative/narrativePromptBuilder';
import type { YongsinDiagnostic } from '../analysis/yongsinDiagnostic';

const NOW = new Date('2026-05-28T00:00:00Z');
const FLAG = 'SAJU_YONGSIN_DIAGNOSTIC';
const daejeon = () => ({
  gender: 'female', calendarType: 'solar', birthDate: '1995-06-22', birthTime: '17:29',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul', calculationMode: 'precision-v1', birthPlaceId: 'KR-30',
} as any);

function setup(flagOn: boolean) {
  if (flagOn) process.env[FLAG] = 'true'; else delete process.env[FLAG];
  const input = calculateAnalysisOnly(daejeon(), NOW);
  const topicCoverageMap = buildTopicCoverageMap(input);
  const lifeSceneHints = buildLifeSceneHints(input);
  const narrativePlans = buildNarrativePlans(input, lifeSceneHints, {
    includeFutureFlow: false, depthOptions: DEFAULT_NARRATIVE_DEPTH_OPTIONS,
  });
  const normalized = normalizeBirthInput(daejeon(), NOW);
  const contextGuard = buildContextGuard(normalized.context, normalized.hourUnknown);
  const full = buildNarrativePersonalSajuPrompt({ input, contextGuard, narrativePlans, topicCoverageMap });
  const section = buildSectionPrompt({
    plan: narrativePlans[0], headerIndex: 1, input, contextGuard,
    allPlans: narrativePlans, topicCoverageMap,
  });
  return { input, full, section };
}

afterEach(() => { delete process.env[FLAG]; });

const MARKER = '[보조 용신 진단';

describe('P5 prompt — renderYongsinDiagnosticGuidance (단위)', () => {
  const diag = {
    currentFinalYongsin: { primary: 'water', unfavorable: 'fire', confidence: 'high' },
    patternFlags: { insungExcess: 'strong', bigeopExcess: false, moDaMyeolJa: true },
    climateCandidate: null,
    strengthCandidate: [],
    structureCandidate: null,
    excessPatternCandidate: null,
    drainCandidate: { element: 'fire', perspective: 'drain', rationale: 'x', conflictsWithFinal: true },
    controlCandidate: { element: 'earth', perspective: 'control', rationale: 'y', conflictsWithFinal: false },
    alternativeCandidates: [],
    conflictFlags: ['final_vs_remedy', 'climate_vs_drain'],
    boundarySensitivity: { sensitive: true, note: 'n' },
    confidenceNotes: [],
  } as unknown as YongsinDiagnostic;
  const text = renderYongsinDiagnosticGuidance(diag);

  it('최종 용신 변경 금지 + 보조 후보 명시', () => {
    expect(text).toContain('최종 용신');
    expect(text).toContain('변경');
    expect(text).toContain('보조');
    expect(text).toContain('수'); // primary 한글
  });
  it('drain(火)이 기신과 겹치면 단정 금지 지침 포함', () => {
    expect(text).toContain('화');
    expect(text).toContain('단정');
  });
  it('control(土) 보조 후보 + 금지 표현 안내 포함', () => {
    expect(text).toContain('토');
    expect(text).toContain('금지 표현');
  });
});

describe('P5 prompt — flag OFF (무영향)', () => {
  it('진단 지침 미포함 (full + section system)', () => {
    const { input, full, section } = setup(false);
    expect('yongsinDiagnostic' in input).toBe(false);
    expect(full.system).not.toContain(MARKER);
    expect(section.system).not.toContain(MARKER);
  });
  it('JSON 덤프에 yongsinDiagnostic 미포함', () => {
    const { section, full } = setup(false);
    expect(section.user).not.toContain('yongsinDiagnostic');
    expect(full.user).not.toContain('yongsinDiagnostic');
  });
});

describe('P5 prompt — flag ON', () => {
  it('진단 지침 포함 + 최종 용신(수) 명시 (full + section)', () => {
    const { full, section } = setup(true);
    expect(full.system).toContain(MARKER);
    expect(full.system).toContain('최종 용신');
    expect(section.system).toContain(MARKER);
    expect(section.system).toContain('수');
  });
  it('raw 진단(내부 flag 이름)은 JSON 덤프에 노출 안 됨 (curated만)', () => {
    const { section } = setup(true);
    // top-level yongsinDiagnostic 키 자체가 JSON에서 제거됨
    expect(section.user).not.toContain('"yongsinDiagnostic"');
    // 내부 conflictFlag 이름이 raw로 새지 않음
    expect(section.user).not.toContain('climate_vs_excess_pattern');
    expect(section.user).not.toContain('conflictFlags');
  });
  it('drain=火/control=土 보조 후보가 지침에 등장', () => {
    const { full } = setup(true);
    expect(full.system).toContain('배출/표현 후보');
    expect(full.system).toContain('제어/현실화 후보');
  });
  it('최종 용신은 用水로 불변 (지침 추가와 무관)', () => {
    const { input } = setup(true);
    expect(input.coreAnalysis.usefulGod.primaryUseful.value).toBe('water');
    expect(input.yongsinDiagnostic?.currentFinalYongsin.primary).toBe('water');
  });
});
