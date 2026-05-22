// SpecialPoint Detector — 95년 7월 6일 오시 케이스 검증.
//
// 기대: 양인(승부형) + 화개(몰입형) + 괴강(승부형) + 반전 구조 후보 + 운의 활성화 후보.

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
import { scoreSpecialPoint } from '../specialPoints/specialPointScorer';

const CASE_1995: BirthInput = {
  gender: 'female', calendarType: 'solar',
  birthDate: '1995-07-06', birthTime: '12:00',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
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
  const fc = calculateFortuneCycles(n, r.pillars, now.getFullYear());
  const ff = analyzeFortuneFlow({ pillars: r.pillars, cycles: fc, usefulGod: ug, tenGods: tg });
  const points = detectSpecialPoints({
    pillars: r.pillars, tenGods: tg, elements: es,
    dayMasterStrength: dm, structure: st, usefulGod: ug,
    specialStars: ss, fortune: ff,
    hourUnknown: n.hourUnknown,
  });
  return { points };
}

describe('specialPointScorer — 점수 계산', () => {
  it('기본 +20, 일지 +20, 월령 +15 = 55 → noticeable', () => {
    const r = scoreSpecialPoint({ base: true, dayBranch: true, monthBranch: true });
    expect(r.score).toBe(55);
    expect(r.grade).toBe('noticeable');
    expect(r.shouldDisplay).toBe(true);
  });
  it('signature 등급 (80+)', () => {
    const r = scoreSpecialPoint({ base: true, monthOrDayPillar: true, dayBranch: true, usefulGodLink: true, supportingFactors: 1 });
    expect(r.grade).toBe('signature');
    expect(r.score).toBeGreaterThanOrEqual(80);
  });
  it('hourUnknown -20', () => {
    const r = scoreSpecialPoint({ base: true, monthOrDayPillar: true, dayBranch: true, hourUnknown: true });
    expect(r.score).toBe(40);
    expect(r.shouldDisplay).toBe(false);
  });
  it('과한 supportingFactors는 최대 3으로 클램프', () => {
    const r1 = scoreSpecialPoint({ base: true, supportingFactors: 5 });
    const r2 = scoreSpecialPoint({ base: true, supportingFactors: 3 });
    expect(r1.score).toBe(r2.score);
  });
});

describe('specialPointDetector — 95년 케이스', () => {
  const { points } = buildFull();

  it('최대 5개', () => {
    expect(points.length).toBeLessThanOrEqual(5);
  });
  it('strengthScore 50 이상만 포함', () => {
    for (const p of points) expect(p.strengthScore).toBeGreaterThanOrEqual(50);
  });
  it('displayPriority 내림차순 정렬', () => {
    for (let i = 1; i < points.length; i++) {
      expect(points[i - 1].displayPriority).toBeGreaterThanOrEqual(points[i].displayPriority);
    }
  });

  it('estimatedPer10000은 모두 null (정성 표현 정책)', () => {
    for (const p of points) expect(p.rarity.estimatedPer10000).toBeNull();
  });

  it('narrative 5요소가 모두 채워짐', () => {
    for (const p of points) {
      expect(p.narrative.coreMeaning.length).toBeGreaterThan(0);
      expect(p.narrative.whySpecial.length).toBeGreaterThan(0);
      expect(p.narrative.lifeScene.length).toBeGreaterThan(0);
      expect(p.narrative.goodUse.length).toBeGreaterThan(0);
      expect(p.narrative.shadowSide.length).toBeGreaterThan(0);
    }
  });

  it('각 SpecialPoint는 evidence를 가짐', () => {
    for (const p of points) {
      expect(p.evidence.length).toBeGreaterThan(0);
    }
  });

  it('승부형(strongSurvival)이 포함되어야 함 — 양인+괴강 모두 적중', () => {
    const ids = points.map(p => p.id);
    expect(ids).toContain('strongSurvival');
  });

  it('반전형(innerOuterContrast)이 후보 — 천간 정관/편재 vs 지장간 식상/재성 차이', () => {
    // 천간: 을(정관)·임(편재)·무(비견)·무(비견)
    // 지장간 다양 → 둘 다 active
    const ids = points.map(p => p.id);
    expect(ids).toContain('innerOuterContrast');
  });
});
