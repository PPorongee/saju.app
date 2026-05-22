// 통합 테스트 — gptInput JSON + prompt 빌드 + 메인 함수 (GPT stub).

import { describe, it, expect } from 'vitest';
import { normalizeBirthInput, type BirthInput } from '../calendar/normalizeBirthInput';
import { calculatePillars } from '../calendar/pillarCalculator';
import { analyzeTenGods } from '../analysis/tenGodAnalyzer';
import { analyzeElementStrength } from '../analysis/elementStrengthAnalyzer';
import { analyzeDayMasterStrength } from '../analysis/dayMasterStrengthAnalyzer';
import { analyzeStructure } from '../analysis/structureAnalyzer';
import { analyzeUsefulGod } from '../analysis/usefulGodAnalyzer';
import { analyzeSpecialStars } from '../analysis/specialStarAnalyzer';
import { analyzeCombinationsAndConflicts } from '../analysis/combinationConflictAnalyzer';
import { calculateFortuneCycles } from '../calendar/fortuneCycleCalculator';
import { analyzeFortuneFlow } from '../analysis/fortuneFlowAnalyzer';
import { detectSpecialPoints } from '../specialPoints/specialPointDetector';
import { buildPersonalSajuGptInput } from '../report/gptInputBuilder';
import { buildPersonalSajuPrompt } from '../report/personalSajuPromptBuilder';
import { buildContextGuard } from '../report/contextGuard';
import { DEFAULT_RULE_CONFIG } from '../rules/ruleConfig';
import { generatePersonalSajuReport } from '../generatePersonalSajuReport';
import { analyzeLifeTopics } from '../analysis/lifeTopicAnalyzer';

const CASE_1995: BirthInput = {
  gender: 'female', calendarType: 'solar',
  birthDate: '1995-07-06', birthTime: '12:00',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
  relationshipStatus: 'single',
  hasChildren: false,
  occupation: '디자이너',
  currentConcerns: ['career', 'money'],
};

function buildFull(now: Date = new Date('2026-05-22')) {
  const n = normalizeBirthInput(CASE_1995, now);
  const r = calculatePillars(n);
  const tg = analyzeTenGods(r.pillars);
  const es = analyzeElementStrength(r.pillars);
  const dm = analyzeDayMasterStrength(r.pillars, tg, es);
  const st = analyzeStructure(r.pillars, tg, es);
  const ug = analyzeUsefulGod({ pillars: r.pillars, tenGods: tg, elements: es, dayMasterStrength: dm, structure: st });
  const ss = analyzeSpecialStars(r.pillars);
  const cc = analyzeCombinationsAndConflicts(r.pillars);
  const fc = calculateFortuneCycles(n, r.pillars, now.getFullYear());
  const ff = analyzeFortuneFlow({ pillars: r.pillars, cycles: fc, usefulGod: ug, tenGods: tg });
  const sp = detectSpecialPoints({
    pillars: r.pillars, tenGods: tg, elements: es,
    dayMasterStrength: dm, structure: st, usefulGod: ug,
    specialStars: ss, fortune: ff, hourUnknown: n.hourUnknown,
  });
  return { n, r, tg, es, dm, st, ug, ss, cc, fc, ff, sp };
}

describe('analyzeCombinationsAndConflicts — 95년 케이스', () => {
  const { cc } = buildFull();
  it('충/형/파/해 배열 반환', () => {
    expect(Array.isArray(cc.conflicts)).toBe(true);
    expect(Array.isArray(cc.combinations)).toBe(true);
  });
  // 95년 사주 지지: 해/오/술/오 — 오오 자형 + 인오술 삼합(인 없음→불성립) + 묘술합(묘 없음)
  it('오오 자형 detect', () => {
    expect(cc.punishments).toContain('오오 자형');
  });
});

describe('lifeTopicAnalyzer — 10문항 매핑', () => {
  const { r, tg, es, dm, st, ug, ss, sp, ff } = buildFull();
  const topics = analyzeLifeTopics({
    pillars: r.pillars, tenGods: tg, elements: es,
    dayMasterStrength: dm, structure: st, usefulGod: ug,
    specialStars: ss, specialPoints: sp, fortune: ff,
  });
  it('정확히 10문항', () => {
    expect(topics).toHaveLength(10);
    expect(topics.map(t => t.questionNumber)).toEqual([1,2,3,4,5,6,7,8,9,10]);
  });
  it('각 문항에 evidenceSummary가 1개 이상', () => {
    for (const t of topics) expect(t.evidenceSummary.length).toBeGreaterThan(0);
  });
});

describe('buildPersonalSajuGptInput — JSON 스키마 적합', () => {
  const all = buildFull();
  const json = buildPersonalSajuGptInput({
    userContext: all.n.context,
    birthTimeConfidence: 'exact',
    ruleConfig: DEFAULT_RULE_CONFIG,
    pillars: all.r.pillars,
    tenGods: all.tg, elements: all.es,
    dayMasterStrength: all.dm, usefulGod: all.ug,
    combinationsAndConflicts: all.cc,
    specialStars: all.ss, specialPoints: all.sp,
    fortune: all.ff,
  });

  it('birthChart 4기둥 한글 문자열', () => {
    expect(json.birthChart.year).toBe('을해');
    expect(json.birthChart.month).toBe('임오');
    expect(json.birthChart.day).toBe('무술');
    expect(json.birthChart.hour).toBe('무오');
    expect(json.birthChart.dayMaster).toBe('무');
  });
  it('userContext에 occupation/currentConcerns 보존', () => {
    expect(json.userContext.occupation).toBe('디자이너');
    expect(json.userContext.currentConcerns).toEqual(['career', 'money']);
  });
  it('coreAnalysis.usefulGod.primaryUseful = water', () => {
    expect(json.coreAnalysis.usefulGod.primaryUseful.value).toBe('water');
  });
  it('constraints 모든 boolean true', () => {
    expect(Object.values(json.constraints).every(v => v === true)).toBe(true);
  });
  it('JSON 직렬화 가능 (순환 참조 없음)', () => {
    expect(() => JSON.stringify(json)).not.toThrow();
  });
});

describe('buildPersonalSajuPrompt — 시스템/유저 프롬프트', () => {
  const all = buildFull();
  const json = buildPersonalSajuGptInput({
    userContext: all.n.context,
    birthTimeConfidence: 'exact',
    ruleConfig: DEFAULT_RULE_CONFIG,
    pillars: all.r.pillars,
    tenGods: all.tg, elements: all.es,
    dayMasterStrength: all.dm, usefulGod: all.ug,
    combinationsAndConflicts: all.cc,
    specialStars: all.ss, specialPoints: all.sp,
    fortune: all.ff,
  });
  const guard = buildContextGuard(all.n.context, all.n.hourUnknown);
  const p = buildPersonalSajuPrompt({ input: json, contextGuard: guard });

  it('system에 절대 규칙·문체 규칙·금지 문장 포함', () => {
    expect(p.system).toContain('절대 규칙');
    expect(p.system).toContain('금지 문장');
    expect(p.system).toContain('estimatedPer10000');
  });
  it('user에 입력 JSON 포함', () => {
    expect(p.user).toContain('"birthChart"');
    expect(p.user).toContain('"specialPoints"');
  });
  it('contextGuard restricted가 system에 주입됨', () => {
    expect(p.system).toContain('컨텍스트 제한');
  });
});

describe('generatePersonalSajuReport — 메인 함수 (GPT stub)', () => {
  const stubReport = '# 전체 요약\n무토 일간이 한여름에 났다. 용신은 수.\n\n# 이 사주가 평범하지 않은 이유\n양인+괴강의 승부형 구조.';
  it('GPT stub 응답이 그대로 reportText로', async () => {
    const result = await generatePersonalSajuReport(CASE_1995, {
      callGpt: async () => stubReport,
      now: new Date('2026-05-22'),
    });
    expect(result.reportText).toBe(stubReport);
    expect(result.attempts).toBe(1);
    expect(result.validation.isValid).toBe(true);
    expect(result.gptInput.birthChart.dayMaster).toBe('무');
    expect(result.gptInput.coreAnalysis.usefulGod.primaryUseful.value).toBe('water');
  });
  it('금칙 문장이 응답에 있으면 validation isValid=false', async () => {
    const badReport = '# 전체 요약\n노력하면 좋아질 것입니다.';
    const result = await generatePersonalSajuReport(CASE_1995, {
      callGpt: async () => badReport,
      now: new Date('2026-05-22'),
      maxRepairAttempts: 0,
    });
    expect(result.validation.isValid).toBe(false);
    expect(result.validation.issues.some(i => i.type === 'generic')).toBe(true);
  });
});
