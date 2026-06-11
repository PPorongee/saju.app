// convergenceGuard 모듈 단위테스트 (Safety Net V1 — item 3 blocker 설계)
// 탐지기 + 근거 인식(evidence-aware) helper가 올바로 동작하는지. 전부 GREEN.
import { describe, it, expect } from 'vitest';
import {
  findConvergencePhrases, sharedConvergencePhrases, sharedExactStrings,
  unjustifiedSharedPhrases, isConvergencePhraseJustified, extractChartSignals,
  CONVERGENCE_PHRASES, type ChartSignals,
} from '../narrative/convergenceGuard';

describe('convergenceGuard — 탐지기(단위)', () => {
  it('알려진 생활코치 문장을 잡아낸다', () => {
    const t = '이 사주는 혼자 버티는 힘이 있지만, 내가 기준을 잡고 역할을 나눌 때 운이 열립니다. 관계에서는 말보다 행동의 일관성을 봅니다.';
    const ids = findConvergencePhrases(t);
    expect(ids).toContain('lone-endurance');
    expect(ids).toContain('set-standard-divide-role');
    expect(ids).toContain('action-over-words');
  });

  it('차트 고유 문장(신살·십성 근거)에는 반응하지 않는다', () => {
    const t = '천을귀인이 받쳐주는 구조라 결정적 순간에 사람이 돕고, 역마가 뚜렷해 생활권이 실제로 바뀝니다.';
    expect(findConvergencePhrases(t)).toEqual([]);
  });

  it('정규식은 non-global(상태 없음)이라 재호출 안전', () => {
    for (const p of CONVERGENCE_PHRASES) expect(p.re.global).toBe(false);
    const t = '작업 범위와 보상 기준을 정하라';
    expect(findConvergencePhrases(t)).toContain('scope-and-reward');
    expect(findConvergencePhrases(t)).toContain('scope-and-reward');
  });

  it('sharedConvergencePhrases: 모든 텍스트 공통 문구만 / 하나라도 빠지면 제외', () => {
    expect(sharedConvergencePhrases([
      '혼자 버티고 축적형', '축적형이라 혼자 버티는 힘', '축적형 + 혼자 버티는',
    ]).sort()).toEqual(['accumulation-type', 'lone-endurance']);
    expect(sharedConvergencePhrases(['혼자 버티는 힘', '혼자 버티는 힘', '고유 문장만'])).toEqual([]);
  });

  it('sharedExactStrings: 모든 그룹 공통 정확-일치 문자열', () => {
    expect(sharedExactStrings([['x', 'y'], ['y', 'z'], ['y', 'w']])).toEqual(['y']);
    expect(sharedExactStrings([['x'], ['y'], ['z']])).toEqual([]);
  });
});

describe('convergenceGuard — 근거 인식(evidence-aware) helper', () => {
  const strongYangin: ChartSignals = {
    strongDM: true, weakDM: false, jae: 2.1, jeongJae: 0.3, pyeonJae: 1.8, sikSang: 0.5,
    insung: 1.8, gwan: 1, hasYangin: true, hasGoegang: true, hasNoble: false, hasYeokma: false, hasReversal: false,
  };
  const weakInsung: ChartSignals = {
    strongDM: false, weakDM: true, jae: 0.3, jeongJae: 0.2, pyeonJae: 0.1, sikSang: 0.3,
    insung: 3.3, gwan: 1, hasYangin: false, hasGoegang: false, hasNoble: false, hasYeokma: false, hasReversal: true,
  };

  it('"버티는 힘"은 신강+양인/괴강일 때만 정당화', () => {
    expect(isConvergencePhraseJustified('lone-endurance', strongYangin)).toBe(true);
    expect(isConvergencePhraseJustified('lone-endurance', weakInsung)).toBe(false);
  });
  it('"겉/속 반전"은 천간-지장간 대조 있을 때만', () => {
    expect(isConvergencePhraseJustified('outer-calm-inner', weakInsung)).toBe(true);  // reversal=true
    expect(isConvergencePhraseJustified('outer-calm-inner', strongYangin)).toBe(false);
  });
  it('"축적형"은 정재 우위(재성 있음)일 때만 — 편재 우위엔 불허', () => {
    expect(isConvergencePhraseJustified('accumulation-type', strongYangin)).toBe(false); // 편재>정재
    const jeongDom: ChartSignals = { ...strongYangin, jeongJae: 1.8, pyeonJae: 0.3 };
    expect(isConvergencePhraseJustified('accumulation-type', jeongDom)).toBe(true);
  });
  it('"문서·계약"은 인성 강할 때만 / "상품화"는 식상 강할 때만', () => {
    expect(isConvergencePhraseJustified('document-contract', weakInsung)).toBe(true);  // insung 3.3
    expect(isConvergencePhraseJustified('document-contract', strongYangin)).toBe(true); // insung 1.8 >=1.5
    expect(isConvergencePhraseJustified('commoditize-standard', weakInsung)).toBe(false);
  });
  it('나이/생활코치 산물은 어떤 차트도 정당화 못 함', () => {
    for (const id of ['asset-after-40', 'lay-the-board', 'set-standard-divide-role', 'scope-and-reward', 'numbers-contracts', 'no-standard-favor', 'free-labor']) {
      expect(isConvergencePhraseJustified(id, strongYangin)).toBe(false);
      expect(isConvergencePhraseJustified(id, weakInsung)).toBe(false);
    }
  });

  it('unjustifiedSharedPhrases: 한 차트라도 근거 없으면 검출(정당화된 차트만 면제)', () => {
    // "버티는 힘"이 셋 다 등장하지만 strong만 정당화 → weak 둘이 근거 없음 → 검출
    const entries = [
      { text: '혼자 버티는 힘', signals: strongYangin },
      { text: '혼자 버티는 힘', signals: weakInsung },
      { text: '혼자 버티는 힘', signals: weakInsung },
    ];
    expect(unjustifiedSharedPhrases(entries)).toContain('lone-endurance');
    // 셋 다 정당화되면 면제(우연 일치로 통과)
    const allJust = entries.map(() => ({ text: '혼자 버티는 힘', signals: strongYangin }));
    expect(unjustifiedSharedPhrases(allJust)).toEqual([]);
  });

  it('extractChartSignals: coreAnalysis에서 신호를 결정론으로 뽑는다', () => {
    const gpt = {
      coreAnalysis: {
        dayMasterStrength: { level: 'very-weak' },
        tenGods: { totals: { 정인: 1.74, 편인: 1.24, 상관: 1.0, 편재: 0.48 } },
        specialStars: [{ name: '천을귀인' }, { name: '역마' }, { name: '양인' }],
      },
      specialPoints: [{ name: '천간-지장간 대조' }],
    };
    const s = extractChartSignals(gpt);
    expect(s.weakDM).toBe(true);
    expect(s.strongDM).toBe(false);
    expect(s.insung).toBeCloseTo(2.98);
    expect(s.hasNoble).toBe(true);
    expect(s.hasYeokma).toBe(true);
    expect(s.hasReversal).toBe(true);
  });
});
