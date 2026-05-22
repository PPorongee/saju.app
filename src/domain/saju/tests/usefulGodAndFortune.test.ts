// Phase 2 최종 게이트: 용신 + 대운 + 세운 — 95년 7월 6일 오시 케이스.
// ★ 이 테스트가 통과해야 사용자가 지적한 "용신 수→화 오판" 회귀 방지.

import { describe, it, expect } from 'vitest';
import { normalizeBirthInput, type BirthInput } from '../calendar/normalizeBirthInput';
import { calculatePillars } from '../calendar/pillarCalculator';
import { analyzeTenGods } from '../analysis/tenGodAnalyzer';
import { analyzeElementStrength } from '../analysis/elementStrengthAnalyzer';
import { analyzeDayMasterStrength } from '../analysis/dayMasterStrengthAnalyzer';
import { analyzeStructure } from '../analysis/structureAnalyzer';
import { analyzeUsefulGod } from '../analysis/usefulGodAnalyzer';
import { calculateFortuneCycles, yearToPillar } from '../calendar/fortuneCycleCalculator';
import { analyzeFortuneFlow } from '../analysis/fortuneFlowAnalyzer';

const CASE_1995: BirthInput = {
  gender: 'female', calendarType: 'solar',
  birthDate: '1995-07-06', birthTime: '12:00',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};

function buildAll(now: Date = new Date('2026-05-22')) {
  const n = normalizeBirthInput(CASE_1995, now);
  const r = calculatePillars(n);
  const tg = analyzeTenGods(r.pillars);
  const es = analyzeElementStrength(r.pillars);
  const dm = analyzeDayMasterStrength(r.pillars, tg, es);
  const st = analyzeStructure(r.pillars, tg, es);
  const ug = analyzeUsefulGod({ pillars: r.pillars, tenGods: tg, elements: es, dayMasterStrength: dm, structure: st });
  const fc = calculateFortuneCycles(n, r.pillars, now.getFullYear());
  const ff = analyzeFortuneFlow({ pillars: r.pillars, cycles: fc, usefulGod: ug, tenGods: tg });
  return { n, r, tg, es, dm, st, ug, fc, ff };
}

describe('★ usefulGod — 95년 무토 한여름 → 용신=수 (사용자 지적 케이스)', () => {
  const { ug } = buildAll();

  it('primaryUseful는 water (수)', () => {
    expect(ug.primaryUseful.type).toBe('element');
    expect(ug.primaryUseful.value).toBe('water');
  });

  it('unfavorable에 fire 또는 earth가 포함되어야 함', () => {
    expect(['fire', 'earth']).toContain(ug.unfavorable[0]);
  });

  it('reasons에 climate 항목이 "여름 → 水 조후" 포함', () => {
    const climateLine = ug.reasons.find(r => r.startsWith('[climate]'));
    expect(climateLine).toBeTruthy();
    expect(climateLine).toContain('水 조후');
  });

  it('confidence가 high 또는 medium (5관점 합의)', () => {
    expect(['high', 'medium']).toContain(ug.confidence);
  });

  it('methodScores 5개 모두 채워짐', () => {
    expect(Object.keys(ug.methodScores)).toHaveLength(5);
  });
});

describe('yearToPillar (세운 변환) — 알려진 연도 검증', () => {
  it('1984 = 갑자', () => expect(yearToPillar(1984)).toEqual({ stem: '갑', branch: '자' }));
  it('1995 = 을해', () => expect(yearToPillar(1995)).toEqual({ stem: '을', branch: '해' }));
  it('2026 = 병오', () => expect(yearToPillar(2026)).toEqual({ stem: '병', branch: '오' }));
  it('2024 = 갑진', () => expect(yearToPillar(2024)).toEqual({ stem: '갑', branch: '진' }));
});

describe('fortuneCycleCalculator — 95년 여자 (음간년 → 음녀 = 순행)', () => {
  const { fc } = buildAll();

  it('isForward = true (을년 여자 → 순행)', () => {
    expect(fc.isForward).toBe(true);
  });

  it('첫 대운 시작 나이가 0~10 사이', () => {
    expect(fc.firstDaewoonStartAge).toBeGreaterThan(0);
    expect(fc.firstDaewoonStartAge).toBeLessThan(11);
  });

  it('대운 8개 생성', () => {
    expect(fc.daewoonList).toHaveLength(8);
  });

  it('순행 → 월주 임오 다음 = 계미 → 갑신 → ...', () => {
    // 첫 대운은 월주 다음 갑자. 임오 → 계미
    expect(fc.daewoonList[0].pillarKo).toBe('계미');
    expect(fc.daewoonList[1].pillarKo).toBe('갑신');
  });

  it('현재 대운에 startAge ≤ ageNow', () => {
    expect(fc.currentDaewoon.startAge).toBeLessThanOrEqual(31);
  });

  it('향후 3년 = 2026(병오), 2027(정미), 2028(무신)', () => {
    expect(fc.nextThreeYears.map(s => s.year)).toEqual([2026, 2027, 2028]);
    expect(fc.nextThreeYears.map(s => s.pillarKo)).toEqual(['병오', '정미', '무신']);
  });
});

describe('fortuneFlowAnalyzer — 95년 케이스', () => {
  const { ff } = buildAll();

  it('currentDaewoon pillar + theme + relationToChart 채워짐', () => {
    expect(ff.currentDaewoon.pillar).toMatch(/[갑을병정무기경신임계][자축인묘진사오미신유술해]/);
    expect(ff.currentDaewoon.theme).toBeTruthy();
    expect(ff.currentDaewoon.relationToChart.length).toBeGreaterThan(0);
  });

  it('nextThreeYears 각각 risks/opportunities 가능 (배열 존재)', () => {
    expect(ff.nextThreeYears).toHaveLength(3);
    for (const y of ff.nextThreeYears) {
      expect(Array.isArray(y.risks)).toBe(true);
      expect(Array.isArray(y.opportunities)).toBe(true);
    }
  });

  it('2026 병오년 — 병화 천간 → 무토 일간 기준 편인. theme에 "편인" 포함', () => {
    const y2026 = ff.nextThreeYears.find(y => y.year === 2026)!;
    expect(y2026.theme).toContain('편인');
  });
});
