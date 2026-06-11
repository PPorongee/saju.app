// Analysis-to-Narrative Traceability (Safety Net V1 — item 1·2)
// "엔진이 세 사주를 실제로 다르게 잡고, 각 차트의 고유 신호가 plan/gptInput에 들어간다"를 잠근다.
// 전부 GREEN이어야 정상(차트가 구분되고 자기 신호를 가짐). GPT 호출 0.
import { describe, it, expect } from 'vitest';
import { coreOf, gptOf, plansOf, allForcedText } from './_abcFixtures';

describe('1) coreAnalysis 차이 — 세 사주는 분석값이 다르다', () => {
  const A = coreOf('A'), B = coreOf('B'), C = coreOf('C');

  it('A: 갑목 / 신약 / 편인 dominant / 학당·홍염·도화', () => {
    expect(A.dayMaster).toContain('갑');
    expect(A.level).toBe('weak');
    expect(A.dominantTenGod).toBe('편인');
    expect([...A.stars].some(s => /학당|홍염|도화/.test(s))).toBe(true);
    // B의 양인·괴강형과 구분
    expect(A.stars.has('양인')).toBe(false);
    expect(A.stars.has('괴강')).toBe(false);
  });

  it('B: 무토 / 신강 / 편재 dominant / 양인·화개·괴강', () => {
    expect(B.dayMaster).toContain('무');
    expect(B.level).toBe('strong');
    expect(B.dominantTenGod).toBe('편재');
    expect(B.stars.has('양인')).toBe(true);
    expect(B.stars.has('괴강')).toBe(true);
  });

  it('C: 임수 / 매우신약 / 인성·상관 / 천을귀인·역마·백호', () => {
    expect(C.dayMaster).toContain('임');
    expect(C.level).toBe('very-weak');
    expect(['정인', '편인', '상관'].includes(C.dominantTenGod)).toBe(true);
    expect(C.stars.has('천을귀인')).toBe(true);
    expect(C.stars.has('역마')).toBe(true);
  });

  it('일간·신강도·dominant 십성이 셋 다 서로 다르다', () => {
    expect(new Set([A.dayMaster, B.dayMaster, C.dayMaster]).size).toBe(3);
    expect(new Set([A.level, B.level, C.level]).size).toBe(3);
    expect(new Set([A.dominantTenGod, B.dominantTenGod, C.dominantTenGod]).size).toBe(3);
  });
});

describe('2) narrative plan/gptInput에 각 차트 고유 신호가 들어간다 (GPT 호출 전)', () => {
  it('A plan: 일간 갑 + 편인(인성) 신호가 강제 fact에 들어감', () => {
    const txt = allForcedText(plansOf('A'));
    expect(txt).toContain('갑');
    expect(/편인|인성/.test(txt)).toBe(true);
    // 주: A plan 텍스트에도 "양인"이 새어든다(lifeTrap plainMeaning에 "인성+양인" 하드코딩).
    //     이는 교차오염 증상 — sameAgeDifferentiationGuard의 evidence-aware 가드가 잡는다.
  });

  it('B plan: 일간 무 + 편재(재성) 신호가 강제 fact에 들어감', () => {
    const txt = allForcedText(plansOf('B'));
    expect(txt).toContain('무');
    expect(/편재|재성/.test(txt)).toBe(true);
  });

  it('C plan: 일간 임 + 상관/인성 신호가 강제 fact에 들어감', () => {
    const txt = allForcedText(plansOf('C'));
    expect(txt).toContain('임');
    expect(/상관|인성|정인|편인/.test(txt)).toBe(true);
  });

  it('gptInput.coreAnalysis에 각 차트의 대표 신살이 실제로 존재(엔진은 차별점을 갖고 있음)', () => {
    const stars = (id: 'A' | 'B' | 'C') =>
      new Set<string>((gptOf(id).coreAnalysis?.specialStars ?? []).map((s: any) => String(s?.name ?? s)));
    expect([...stars('A')].some(s => /도화|홍염|학당/.test(s))).toBe(true);
    expect(stars('B').has('괴강')).toBe(true);
    expect(stars('C').has('천을귀인') && stars('C').has('역마')).toBe(true);
  });
});
