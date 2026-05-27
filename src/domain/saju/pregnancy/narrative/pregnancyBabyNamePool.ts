// 임산부 모드 V4 — 태명 후보 풀 + 결정적 선정 (Phase 2)
//
// 정책:
//   - LLM이 태명을 창작하지 않음. 이 풀에서만 결정적으로 선정.
//   - 한자 작명/획수/수리 성명학 미사용 (이번 V4 1차 제외, 추후 확장).
//   - "이름 확정"처럼 말하지 않음 — "태명/이름 후보".
//   - 풀은 확장 가능 (오행별 배열에 추가만 하면 됨).

import { ELEMENT_KO, type Element } from '../../rules/elements';
import type { BabyNameCandidate } from './pregnancyNarrativeTypes';
import type { PregnancyAnalysisBundle } from './pregnancyMomBabyAnalyzer';

interface PoolEntry {
  name: string;
  image: string;  // 짧은 이미지 (운명론적이지 않게)
}

/** 오행별 "태명" 후보 풀 — 귀엽고 가볍고 부르기 쉬운 애칭 중심. 확장 가능.
 *  공식 이름/한자/획수 느낌 금지. 건강 보장처럼 들리는 태명(튼튼이 등)은 제외. */
export const BABY_NAME_POOL: Record<Element, PoolEntry[]> = {
  water: [
    { name: '물방울', image: '동글동글 맑은 물방울' },
    { name: '몽글이', image: '몽글몽글 부드러운 결' },
    { name: '달콩이', image: '달처럼 은은한 콩알' },
    { name: '조약이', image: '냇가의 동그란 조약돌' },
    { name: '구름이', image: '둥실 떠가는 구름' },
  ],
  wood: [
    { name: '새싹이', image: '막 돋아난 연둣빛 새싹' },
    { name: '봄봄이', image: '폴짝이는 봄기운' },
    { name: '초록이', image: '싱그러운 초록 잎' },
    { name: '잎새', image: '살랑이는 작은 잎새' },
    { name: '나무콩', image: '쑥쑥 자라는 나무 콩알' },
  ],
  fire: [
    { name: '반짝이', image: '반짝반짝 밝은 빛' },
    { name: '햇콩이', image: '햇살 머금은 콩알' },
    { name: '라라', image: '흥얼흥얼 즐거운 음' },
    { name: '빛나', image: '환하게 빛나는 기운' },
    { name: '초롱이', image: '초롱초롱한 눈빛' },
  ],
  earth: [
    { name: '복덩이', image: '품에 쏙 안기는 복스러운 아이' },
    { name: '둥둥이', image: '둥글둥글 포근한 결' },
    { name: '토리', image: '도토리처럼 야무진 아이' },
    { name: '포근이', image: '폭 안기는 포근한 결' },
    { name: '도담이', image: '도담도담 무탈한 결' },
  ],
  metal: [
    { name: '방울이', image: '맑게 울리는 작은 방울' },
    { name: '은콩이', image: '은빛 도는 콩알' },
    { name: '반디', image: '깜빡이는 작은 반딧불' },
    { name: '또랑이', image: '또랑또랑 맑은 결' },
    { name: '맑음이', image: '맑게 갠 하늘 같은 결' },
  ],
};

type ElementRole = 'mother-need' | 'baby-need' | 'connection';

function reasonFor(elementKo: string, role: ElementRole): string {
  switch (role) {
    case 'mother-need':
      return `엄마에게 도움이 되는 ${elementKo} 기운을 부드럽게 담은 태명 후보예요.`;
    case 'baby-need':
      return `아이 예정일 기준으로 옅은 ${elementKo} 기운을 살며시 더해주는 태명 후보예요.`;
    case 'connection':
      return `엄마와 아이 사이를 ${elementKo} 기운으로 부드럽게 이어주는 태명 후보예요.`;
  }
}

/**
 * 엄마 필요 오행 / 아이 부족 오행 / 연결 오행을 우선순위로 결정적 선정.
 * 3~5개 반환. LLM 호출 없음.
 */
export function selectBabyNames(
  bundle: PregnancyAnalysisBundle,
  opts: { min?: number; max?: number } = {},
): { candidates: BabyNameCandidate[]; prioritizedElements: Element[] } {
  const min = opts.min ?? 3;
  const max = opts.max ?? 5;

  const motherUseful = bundle.mother.coreAnalysis.usefulGod.primaryUseful;
  const motherFavorable = bundle.mother.coreAnalysis.usefulGod.favorable;
  const babyDeficient = (bundle.baby.coreAnalysis.elementStrength.deficient ?? []) as Element[];
  const connectionEls = bundle.elementComplement.motherNeedsFromBaby;

  // (element, role) 우선순위 — 앞쪽이 더 우선
  const ranked: Array<{ el: Element; role: ElementRole }> = [];
  const seen = new Set<Element>();
  const push = (el: Element | undefined, role: ElementRole) => {
    if (!el || seen.has(el)) return;
    if (!BABY_NAME_POOL[el]) return;
    seen.add(el);
    ranked.push({ el, role });
  };

  // 1) 엄마 용신(오행일 때만)
  if (motherUseful.type === 'element') push(motherUseful.value as Element, 'mother-need');
  // 2) 엄마-아이 연결 오행
  connectionEls.forEach(el => push(el, 'connection'));
  // 3) 엄마 희신(오행)
  motherFavorable.forEach(v => { if (typeof v === 'string' && isElement(v)) push(v as Element, 'mother-need'); });
  // 4) 아이 예정일 부족 오행
  babyDeficient.forEach(el => push(el, 'baby-need'));

  // 후보가 하나도 없으면 (이론상 드묾) 엄마 강한 오행으로 폴백
  if (ranked.length === 0) {
    const momStrong = (bundle.mother.coreAnalysis.elementStrength.strongest ?? []) as Element[];
    momStrong.forEach(el => push(el, 'connection'));
  }
  // 그래도 없으면 수→목 순 폴백 (풀 보장)
  if (ranked.length === 0) push('water', 'connection');

  // 각 오행 풀에서 이름을 라운드로빈으로 뽑아 max까지
  const candidates: BabyNameCandidate[] = [];
  const usedNames = new Set<string>();
  let idx = 0;
  while (candidates.length < max && ranked.length > 0) {
    const cursor = ranked[idx % ranked.length];
    const pool = BABY_NAME_POOL[cursor.el];
    const pick = pool.find(p => !usedNames.has(p.name));
    if (pick) {
      usedNames.add(pick.name);
      candidates.push({
        name: pick.name,
        element: cursor.el,
        elementKo: ELEMENT_KO[cursor.el],
        image: pick.image,
        reason: reasonFor(ELEMENT_KO[cursor.el], cursor.role),
      });
    }
    idx++;
    // 모든 풀 소진 방지: 한 바퀴 돌아 더 못 뽑으면 종료
    if (idx > ranked.length * 6) break;
  }

  // min 미달 시 첫 오행 풀에서 추가 (가능하면)
  if (candidates.length < min && ranked.length > 0) {
    for (const r of ranked) {
      for (const p of BABY_NAME_POOL[r.el]) {
        if (candidates.length >= min) break;
        if (!usedNames.has(p.name)) {
          usedNames.add(p.name);
          candidates.push({
            name: p.name, element: r.el, elementKo: ELEMENT_KO[r.el],
            image: p.image, reason: reasonFor(ELEMENT_KO[r.el], r.role),
          });
        }
      }
      if (candidates.length >= min) break;
    }
  }

  const prioritizedElements = Array.from(new Set(candidates.map(c => c.element)));
  return { candidates, prioritizedElements };
}

function isElement(v: string): v is Element {
  return v === 'wood' || v === 'fire' || v === 'earth' || v === 'metal' || v === 'water';
}
