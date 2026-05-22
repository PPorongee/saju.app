// 격국 + 신살 — 95년 7월 6일 오시 케이스 검증.

import { describe, it, expect } from 'vitest';
import { normalizeBirthInput, type BirthInput } from '../calendar/normalizeBirthInput';
import { calculatePillars } from '../calendar/pillarCalculator';
import { analyzeTenGods } from '../analysis/tenGodAnalyzer';
import { analyzeElementStrength } from '../analysis/elementStrengthAnalyzer';
import { analyzeStructure } from '../analysis/structureAnalyzer';
import { analyzeSpecialStars } from '../analysis/specialStarAnalyzer';

const CASE_1995: BirthInput = {
  gender: 'female', calendarType: 'solar',
  birthDate: '1995-07-06', birthTime: '12:00',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};

describe('analysis/structureAnalyzer — 95년 케이스 (월지 오, 본기 정 → 정인격)', () => {
  const r = calculatePillars(normalizeBirthInput(CASE_1995));
  const tg = analyzeTenGods(r.pillars);
  const es = analyzeElementStrength(r.pillars);
  const st = analyzeStructure(r.pillars, tg, es);

  it('격 이름이 정인격 — 월지 오의 본기 정(화) → 일간 무토 입장에서 정인', () => {
    expect(st.name).toBe('정인격');
    expect(st.primary).toBe('정인');
    expect(st.source).toBe('monthBranchPrimary');
  });

  it('근거 notes 포함', () => {
    expect(st.notes.length).toBeGreaterThan(0);
    expect(st.notes[0]).toContain('월지');
  });
});

describe('analysis/specialStarAnalyzer — 95년 케이스 (일간 무토)', () => {
  const r = calculatePillars(normalizeBirthInput(CASE_1995));
  const stars = analyzeSpecialStars(r.pillars);
  const names = stars.map(s => s.name);

  it('천을귀인 — 무토 일간의 천을은 축·미. 사주에 축/미 없음 → 없어야 함', () => {
    expect(names).not.toContain('천을귀인');
  });

  it('홍염살 — 무토 일간의 홍염은 진. 사주에 진 없음 → 없어야 함', () => {
    expect(names).not.toContain('홍염');
  });

  it('양인 — 무토 일간의 양인은 오. 월지·시지 모두 오 → 있어야 함', () => {
    expect(names).toContain('양인');
    const yangin = stars.find(s => s.name === '양인')!;
    expect(yangin.positions.length).toBeGreaterThanOrEqual(2);
  });

  it('도화 — 년지 해(亥) → 해묘미 → 도화 자. 일지 술(戌) → 인오술 → 도화 묘. 사주에 자·묘 없음 → 없어야 함', () => {
    expect(names).not.toContain('도화');
  });

  it('역마 — 년지 해 → 해묘미 → 역마 사. 일지 술 → 인오술 → 역마 신. 사주에 사·신 없음 → 없어야 함', () => {
    expect(names).not.toContain('역마');
  });

  it('화개 — 년지 해 → 해묘미 → 화개 미. 일지 술 → 인오술 → 화개 술. 일지가 술 → 있어야 함', () => {
    expect(names).toContain('화개');
    const hwagae = stars.find(s => s.name === '화개')!;
    expect(hwagae.positions).toContain('일지');
  });

  it('괴강 — 무술 일주 → 괴강 포함', () => {
    expect(names).toContain('괴강');
  });

  it('백호 — 무진 일주가 아님 → 없어야 함', () => {
    expect(names).not.toContain('백호');
  });

  it('각 신살은 strengthScore와 interpretationHint를 가짐', () => {
    for (const s of stars) {
      expect(s.strengthScore).toBeGreaterThan(0);
      expect(s.interpretationHint.length).toBeGreaterThan(0);
    }
  });
});
