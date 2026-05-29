// evidenceView notation gloss / usefulGodRelation label helper 단위 테스트.
import { describe, it, expect } from 'vitest';
import { formatSajuNotationGloss, glossSajuNotations, usefulGodRelationLabel } from '@/components/evidence/notationGloss';

describe('formatSajuNotationGloss — known notation 한글 병기', () => {
  it('천간합/육합(XX합화Z): 원문 유지 + 합 설명', () => {
    const g = formatSajuNotationGloss('을경합화금');
    expect(g.startsWith('을경합화금')).toBe(true);
    expect(g).toContain('을·경');
    expect(g).toContain('금 기운');
    expect(g).toContain('합');
  });
  it('지지 육합도 동일 패턴', () => {
    expect(formatSajuNotationGloss('자축합화토')).toContain('토 기운');
  });
  it('반합: XX 반합 → 글자 병기 + 반합 설명', () => {
    const g = formatSajuNotationGloss('인오 반합');
    expect(g).toContain('인·오');
    expect(g).toContain('반합');
  });
  it('삼합/방합(국): 크게 합쳐지는 작용', () => {
    expect(formatSajuNotationGloss('인오술 화국')).toContain('크게 합쳐');
    expect(formatSajuNotationGloss('인묘진 동방 목국')).toContain('크게 합쳐');
  });
  it('해묘미 목국: 국으로 처리(해(harm) 오인 금지)', () => {
    const g = formatSajuNotationGloss('해묘미 목국');
    expect(g).toContain('크게 합쳐');
    expect(g).not.toContain('엇갈리며');
  });
  it('형: 긴장/고집', () => {
    expect(formatSajuNotationGloss('인사신 지세지형')).toContain('형');
    expect(formatSajuNotationGloss('인사신 지세지형')).toContain('긴장');
    expect(formatSajuNotationGloss('해해 자형')).toContain('긴장'); // 해+형 → 형 우선
  });
  it('충/파/해: 완곡 설명', () => {
    expect(formatSajuNotationGloss('자오충')).toContain('부딪');
    expect(formatSajuNotationGloss('인해파')).toContain('어긋');
    expect(formatSajuNotationGloss('자미해')).toContain('엇갈');
  });
  it('공포/단정 표현 없음', () => {
    const all = ['을경합화금', '인오 반합', '인사신 지세지형', '자오충', '인해파', '자미해']
      .map(formatSajuNotationGloss).join(' ');
    for (const bad of ['나쁘', '깨진', '망한', '망함', '파멸']) expect(all).not.toContain(bad);
  });
  it('unknown notation은 원문 유지(fallback)', () => {
    expect(formatSajuNotationGloss('완전모르는표기')).toBe('완전모르는표기');
  });
  it('빈 입력 안전', () => {
    expect(formatSajuNotationGloss('')).toBe('');
    expect(formatSajuNotationGloss(undefined as any)).toBe('');
  });
  it('glossSajuNotations: 배열 매핑', () => {
    const r = glossSajuNotations(['을경합화금', '자오충']);
    expect(r).toHaveLength(2);
    expect(r[0]).toContain('합');
    expect(r[1]).toContain('부딪');
  });
});

describe('usefulGodRelationLabel — enum → 한글 label', () => {
  it('알려진 값', () => {
    expect(usefulGodRelationLabel('useful')).toContain('힘이 되는');
    expect(usefulGodRelationLabel('favorable')).toContain('도움');
    expect(usefulGodRelationLabel('unfavorable')).toContain('부담');
    expect(usefulGodRelationLabel('neutral')).toContain('중립');
  });
  it('미인식/빈 값 fallback', () => {
    expect(usefulGodRelationLabel('weird')).toBe('해석 보조 정보');
    expect(usefulGodRelationLabel(undefined)).toBe('해석 보조 정보');
    expect(usefulGodRelationLabel(null)).toBe('해석 보조 정보');
  });
  it('enum 원문 노출 안 됨', () => {
    for (const v of ['useful', 'favorable', 'unfavorable', 'neutral']) {
      expect(usefulGodRelationLabel(v)).not.toBe(v);
    }
  });
});
