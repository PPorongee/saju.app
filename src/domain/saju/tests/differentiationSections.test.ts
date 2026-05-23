// 차별화 4섹션 (IdentityKeyword / LifeWeapon / LifeTrap / FortuneTrigger) 통합 검증.
// 95년 7월 6일 오시 케이스로 4 analyzer가 그럴듯한 결과 내놓는지.

import { describe, it, expect } from 'vitest';
import { normalizeBirthInput, type BirthInput } from '../calendar/normalizeBirthInput';
import { calculatePillars } from '../calendar/pillarCalculator';
import { analyzeTenGods } from '../analysis/tenGodAnalyzer';
import { analyzeElementStrength } from '../analysis/elementStrengthAnalyzer';
import { analyzeDayMasterStrength } from '../analysis/dayMasterStrengthAnalyzer';
import { analyzeStructure } from '../analysis/structureAnalyzer';
import { analyzeUsefulGod } from '../analysis/usefulGodAnalyzer';
import { analyzeSpecialStars } from '../analysis/specialStarAnalyzer';
import { calculateFortuneCycles } from '../calendar/fortuneCycleCalculator';
import { analyzeFortuneFlow } from '../analysis/fortuneFlowAnalyzer';
import { detectSpecialPoints } from '../specialPoints/specialPointDetector';
import { generateIdentityKeywords } from '../analysis/identityKeywordsGenerator';
import { detectLifeWeapons } from '../analysis/lifeWeaponsDetector';
import { detectLifeTraps } from '../analysis/lifeTrapsDetector';
import { analyzeFortuneTriggers } from '../analysis/fortuneTriggersAnalyzer';

const CASE: BirthInput = {
  gender: 'female', calendarType: 'solar',
  birthDate: '1995-07-06', birthTime: '12:00',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
  relationshipStatus: 'single', hasChildren: false,
  occupation: '디자이너', currentConcerns: ['career', 'money'],
};

function full() {
  const now = new Date('2026-05-22');
  const n = normalizeBirthInput(CASE, now);
  const r = calculatePillars(n);
  const tg = analyzeTenGods(r.pillars);
  const es = analyzeElementStrength(r.pillars);
  const dm = analyzeDayMasterStrength(r.pillars, tg, es);
  const st = analyzeStructure(r.pillars, tg, es);
  const ug = analyzeUsefulGod({ pillars: r.pillars, tenGods: tg, elements: es, dayMasterStrength: dm, structure: st });
  const ss = analyzeSpecialStars(r.pillars);
  const fc = calculateFortuneCycles(n, r.pillars, now.getFullYear());
  const ff = analyzeFortuneFlow({ pillars: r.pillars, cycles: fc, usefulGod: ug, tenGods: tg });
  const sp = detectSpecialPoints({
    pillars: r.pillars, tenGods: tg, elements: es,
    dayMasterStrength: dm, structure: st, usefulGod: ug,
    specialStars: ss, fortune: ff, hourUnknown: n.hourUnknown,
  });
  const ik = generateIdentityKeywords({
    pillars: r.pillars, tenGods: tg, elements: es,
    dayMasterStrength: dm, structure: st, usefulGod: ug, specialPoints: sp,
  });
  const lw = detectLifeWeapons({
    pillars: r.pillars, tenGods: tg, elements: es,
    dayMasterStrength: dm, usefulGod: ug, specialPoints: sp, fortune: ff,
  });
  const lt = detectLifeTraps({
    pillars: r.pillars, tenGods: tg, elements: es,
    dayMasterStrength: dm, usefulGod: ug, specialPoints: sp, fortune: ff,
    userContext: n.context,
  });
  const ft = analyzeFortuneTriggers({
    pillars: r.pillars, tenGods: tg, elements: es,
    usefulGod: ug, specialPoints: sp,
    lifeWeapons: lw, lifeTraps: lt, fortune: ff,
  });
  return { ik, lw, lt, ft };
}

describe('identityKeywords — 95년 케이스', () => {
  const { ik } = full();
  it('정확히 5개 (또는 5개 이하)', () => {
    expect(ik.length).toBeGreaterThan(0);
    expect(ik.length).toBeLessThanOrEqual(5);
  });
  it('displayPriority 내림차순', () => {
    for (let i = 1; i < ik.length; i++) {
      expect(ik[i - 1].displayPriority).toBeGreaterThanOrEqual(ik[i].displayPriority);
    }
  });
  it('각 키워드는 evidence·narrativeHint 가짐', () => {
    for (const k of ik) {
      expect(k.keyword.length).toBeGreaterThan(0);
      expect(k.evidence.length).toBeGreaterThan(0);
      expect(k.narrativeHint.length).toBeGreaterThan(0);
    }
  });
  it('승부형(strongSurvival)이 있어서 "쉽게 꺾이지 않는" 키워드 포함', () => {
    const has = ik.some(k => k.keyword.includes('꺾이지') || k.keyword.includes('버티'));
    expect(has).toBe(true);
  });
});

describe('lifeWeapons — 95년 케이스', () => {
  const { lw } = full();
  it('1~5개, 강도 내림차순', () => {
    expect(lw.length).toBeGreaterThan(0);
    expect(lw.length).toBeLessThanOrEqual(5);
    for (let i = 1; i < lw.length; i++) {
      expect(lw[i - 1].strengthScore).toBeGreaterThanOrEqual(lw[i].strengthScore);
    }
  });
  it('각 무기는 howToUse + caution 둘 다 가짐', () => {
    for (const w of lw) {
      expect(w.howToUse.length).toBeGreaterThan(0);
      expect(w.caution.length).toBeGreaterThan(0);
    }
  });
  it('승부형 → 버티는 힘 무기 포함', () => {
    const has = lw.some(w => w.name.includes('버티') || w.name.includes('승부'));
    expect(has).toBe(true);
  });
});

describe('lifeTraps — 95년 케이스', () => {
  const { lt } = full();
  it('1~5개', () => {
    expect(lt.length).toBeGreaterThan(0);
    expect(lt.length).toBeLessThanOrEqual(5);
  });
  it('각 함정은 escapeStrategy 가짐', () => {
    for (const t of lt) {
      expect(t.escapeStrategy.length).toBeGreaterThan(0);
    }
  });
  it('신강 + 비겁 강 → "혼자 다 감당" 함정 포함', () => {
    const has = lt.some(t => t.name.includes('혼자'));
    expect(has).toBe(true);
  });
});

describe('fortuneTriggers — 95년 케이스', () => {
  const { ft } = full();
  it('activating + blocking choices 둘 다 1개 이상', () => {
    expect(ft.fortuneActivatingChoices.length).toBeGreaterThan(0);
    expect(ft.fortuneBlockingChoices.length).toBeGreaterThan(0);
  });
  it('activating choice 중 용신(수) 관련 항목 포함', () => {
    const hasWater = ft.fortuneActivatingChoices.some(c =>
      c.title.includes('water') || c.title.includes('수') ||
      c.reason.includes('water') || c.reason.includes('수')
    );
    expect(hasWater).toBe(true);
  });
  it('blocking choice 중 기신(토) 또는 lifeTrap 관련 포함', () => {
    const hasKi = ft.fortuneBlockingChoices.some(c =>
      c.title.includes('earth') || c.title.includes('토') || c.relatedTo === 'lifeTrap'
    );
    expect(hasKi).toBe(true);
  });
  it('최대 6개 제한', () => {
    expect(ft.fortuneActivatingChoices.length).toBeLessThanOrEqual(6);
    expect(ft.fortuneBlockingChoices.length).toBeLessThanOrEqual(6);
  });
});
