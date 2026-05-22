// Phase 2 게이트 — 95년 7월 6일 오시 케이스 (을해 임오 무술 무오, 일간 무토).
// 십성·오행·신강신약 결과의 명리적 정합성을 검증.

import { describe, it, expect } from 'vitest';
import { normalizeBirthInput, type BirthInput } from '../calendar/normalizeBirthInput';
import { calculatePillars } from '../calendar/pillarCalculator';
import { analyzeTenGods } from '../analysis/tenGodAnalyzer';
import { analyzeElementStrength } from '../analysis/elementStrengthAnalyzer';
import { analyzeDayMasterStrength } from '../analysis/dayMasterStrengthAnalyzer';
import { calcTenGod } from '../rules/tenGods';

const CASE_1995: BirthInput = {
  gender: 'female',
  calendarType: 'solar',
  birthDate: '1995-07-06',
  birthTime: '12:00',
  birthTimeConfidence: 'exact',
  timezone: 'Asia/Seoul',
};

describe('rules/tenGods — calcTenGod 기본', () => {
  // 일간 무토 기준 — spec 정합 검증
  it('무 → 무 = 비견', () => expect(calcTenGod('무', '무')).toBe('비견'));
  it('무 → 기 = 겁재', () => expect(calcTenGod('무', '기')).toBe('겁재'));
  it('무 → 경 = 식신 (토생금, 양양)',     () => expect(calcTenGod('무', '경')).toBe('식신'));
  it('무 → 신 = 상관 (토생금, 양음)',     () => expect(calcTenGod('무', '신')).toBe('상관'));
  it('무 → 임 = 편재 (토극수, 양양)',     () => expect(calcTenGod('무', '임')).toBe('편재'));
  it('무 → 계 = 정재 (토극수, 양음)',     () => expect(calcTenGod('무', '계')).toBe('정재'));
  it('무 → 갑 = 편관 (목극토, 양양)',     () => expect(calcTenGod('무', '갑')).toBe('편관'));
  it('무 → 을 = 정관 (목극토, 양음)',     () => expect(calcTenGod('무', '을')).toBe('정관'));
  it('무 → 병 = 편인 (화생토, 양양)',     () => expect(calcTenGod('무', '병')).toBe('편인'));
  it('무 → 정 = 정인 (화생토, 양음)',     () => expect(calcTenGod('무', '정')).toBe('정인'));
});

describe('analysis/tenGodAnalyzer — 95년 케이스', () => {
  const r = calculatePillars(normalizeBirthInput(CASE_1995));
  const tg = analyzeTenGods(r.pillars);

  it('년간 을 → 정관', () => {
    const yearStem = tg.visible.find(v => v.position === 'yearStem');
    expect(yearStem?.tenGod).toBe('정관');
  });
  it('월간 임 → 편재', () => {
    const ms = tg.visible.find(v => v.position === 'monthStem');
    expect(ms?.tenGod).toBe('편재');
  });
  it('시간 무 → 비견', () => {
    const hs = tg.visible.find(v => v.position === 'hourStem');
    expect(hs?.tenGod).toBe('비견');
  });
  it('hidden — 월지 오의 지장간(정·기) → 정인·겁재', () => {
    const monthHidden = tg.hidden.filter(h => h.position === 'monthBranch');
    const tenGods = monthHidden.map(h => h.tenGod);
    expect(tenGods).toContain('정인');
    expect(tenGods).toContain('겁재');
  });
  it('totals 모든 10십성이 키로 존재', () => {
    expect(Object.keys(tg.totals)).toHaveLength(10);
  });
});

describe('analysis/elementStrengthAnalyzer — 95년 케이스 (한여름 무토)', () => {
  const r = calculatePillars(normalizeBirthInput(CASE_1995));
  const es = analyzeElementStrength(r.pillars);

  it('월지 오 — 여름 → coldHot=hot 또는 too-hot', () => {
    expect(['hot', 'too-hot']).toContain(es.climate.coldHot);
  });
  it('수(water) 점수가 화(fire)보다 훨씬 작아야 함 (조후상 수 필요)', () => {
    expect(es.scores.water).toBeLessThan(es.scores.fire);
  });
  it('토(earth) — 일간 본기 + 일지 술(본기 무) → strongest 후보', () => {
    expect(es.scores.earth).toBeGreaterThan(0);
  });
  it('reasons 비어있지 않음', () => {
    expect(es.reasons.length).toBeGreaterThan(0);
  });
});

describe('analysis/dayMasterStrengthAnalyzer — 95년 케이스', () => {
  const r = calculatePillars(normalizeBirthInput(CASE_1995));
  const tg = analyzeTenGods(r.pillars);
  const es = analyzeElementStrength(r.pillars);
  const dm = analyzeDayMasterStrength(r.pillars, tg, es);

  it('월령 오(火)가 일간 무(土) 생함 → 인성 왕 support 인정', () => {
    const hit = dm.supportFactors.some(s => s.includes('인성 왕'));
    expect(hit).toBe(true);
  });
  it('일지 술(본기 무) → 일간 본근 support 인정', () => {
    const hit = dm.supportFactors.some(s => s.includes('일간 본근'));
    expect(hit).toBe(true);
  });
  it('time hour 무 → 비견 support 가산 인정', () => {
    const hit = dm.supportFactors.some(s => s.includes('비견'));
    expect(hit).toBe(true);
  });
  it('total score > 0 — 신강 또는 중화', () => {
    expect(dm.score).toBeGreaterThan(0);
  });
  it('level이 5레벨 중 하나', () => {
    expect(['very-strong','strong','balanced','weak','very-weak']).toContain(dm.level);
  });
  it('conclusion에 일간·총점·레벨 모두 포함', () => {
    expect(dm.conclusion).toContain('무');
    expect(dm.conclusion).toMatch(/\d/);
  });
});
