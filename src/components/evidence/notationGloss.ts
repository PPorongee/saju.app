// EvidenceView 사용자 친화 정리 — UI 렌더 레벨 helper (API/schema/도메인 데이터 무관).
//
// 목적:
//   - 궁합 "명리 근거 보기"의 팔자 notation(을경합화금/인오 반합/지세지형 등)에 한글 gloss 병기.
//   - 올해운세 usefulGodRelation enum을 사용자 친화 label로 변환.
// 원칙:
//   - notation 원문은 숨기지 않고 유지 + 설명 병기 (근거 보기 전문성 유지).
//   - 모르는 표기는 깨지지 않게 원문 그대로 fallback.
//   - 공포/단정("나쁘다/깨진다/망한다") 금지 — 긴장/조율/작용/이어짐/부딪힘으로 완곡하게.

const EL_GLOSS: Record<string, string> = { 목: '목', 화: '화', 토: '토', 금: '금', 수: '수' };

/**
 * 팔자 notation 1건 → "원문 — 한글 설명" 병기.
 * 합화/반합/삼합·방합(국)/형/충/파/해 패턴을 일반화 매칭. 미인식 표기는 원문 유지.
 * 검사 순서 주의: '국'(삼합/방합)을 형·충·파·해보다 먼저 걸러 "해묘미 목국"의 '해' 오인 방지.
 */
export function formatSajuNotationGloss(raw: string): string {
  const r = (raw ?? '').trim();
  if (!r) return r;

  // 천간합 / 지지 육합: XX합화Z (을경합화금, 자축합화토)
  const hap = r.match(/^(.)(.)합화([목화토금수])$/);
  if (hap) return `${r} — ${hap[1]}·${hap[2]}이(가) 만나 ${EL_GLOSS[hap[3]] ?? hap[3]} 기운으로 이어지는 합`;

  // 반합: XX 반합 (인오 반합)
  if (r.includes('반합')) {
    const pair = r.replace('반합', '').trim().split('').filter(Boolean).join('·');
    return `${r} — ${pair}가 만나 그 기운이 일부 모이는 반합`;
  }

  // 삼합·방합: ...목국/화국/토국/금국/수국 (인오술 화국, 인묘진 동방 목국)
  if (/[목화토금수]국$/.test(r)) return `${r} — 여러 글자가 모여 한 기운으로 크게 합쳐지는 작용`;

  // 형 (지세지형/자형/무례지형 등) — '국'·'합' 이후, '충/파/해'보다 먼저
  if (r.includes('형')) return `${r} — 비슷하거나 얽힌 기운이 겹치며 긴장·고집이 생길 수 있는 형`;
  // 충
  if (r.includes('충')) return `${r} — 두 기운이 정면으로 부딪히며 변화가 커지는 충`;
  // 파
  if (r.includes('파')) return `${r} — 기운이 어긋나며 흐트러질 수 있는 파`;
  // 해
  if (r.includes('해')) return `${r} — 기운이 서로 엇갈리며 빗겨가는 해`;

  // 미인식 표기 — 원문 유지 (전문 표기 그대로)
  return r;
}

/** notation 배열 → gloss 배열 (UI에서 줄 단위 렌더용). */
export function glossSajuNotations(list: readonly string[]): string[] {
  return (list ?? []).map(formatSajuNotationGloss);
}

// ============================================================
// 올해운세 usefulGodRelation enum → 사용자 친화 label
// (yearlyTypes.UsefulGodRelation = 'useful' | 'favorable' | 'unfavorable' | 'neutral')
// ============================================================

const USEFUL_GOD_RELATION_LABEL: Record<string, string> = {
  useful: '용신에 직접 힘이 되는 흐름',
  favorable: '도움이 되는 흐름',
  unfavorable: '과해지면 부담이 될 수 있는 흐름',
  neutral: '중립적인 흐름',
};

/** usefulGodRelation 값 → 한글 label. 미인식 값은 보수적으로 "해석 보조 정보". */
export function usefulGodRelationLabel(value: string | undefined | null): string {
  if (!value) return '해석 보조 정보';
  return USEFUL_GOD_RELATION_LABEL[value] ?? '해석 보조 정보';
}
