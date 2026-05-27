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

/** 오행별 태명 후보 풀 — 확장 가능. (시드: 사용자 제공 목록) */
export const BABY_NAME_POOL: Record<Element, PoolEntry[]> = {
  water: [
    { name: '이슬', image: '맑게 맺히는 물방울' },
    { name: '하윤', image: '부드럽게 흐르는 물결' },
    { name: '루아', image: '잔잔한 물빛' },
    { name: '물결', image: '천천히 번지는 물결' },
    { name: '하람', image: '깊고 차분한 물' },
  ],
  wood: [
    { name: '새봄', image: '새로 돋는 봄의 새싹' },
    { name: '초록', image: '싱그러운 잎의 빛' },
    { name: '나린', image: '하늘에서 내린 나무' },
    { name: '로운', image: '곧게 자라는 결' },
    { name: '다온', image: '좋은 기운이 다 오는 숲' },
  ],
  fire: [
    { name: '하리', image: '환하게 번지는 햇살' },
    { name: '라온', image: '즐겁고 따뜻한 빛' },
    { name: '햇살', image: '포근한 아침 햇살' },
    { name: '소율', image: '맑게 퍼지는 온기' },
    { name: '아린', image: '맑고 또렷한 빛' },
  ],
  earth: [
    { name: '도담', image: '단단하고 야무진 땅' },
    { name: '단아', image: '차분하고 단정한 결' },
    { name: '온유', image: '따뜻하고 부드러운 흙' },
    { name: '다솜', image: '포근히 품는 마음' },
    { name: '하온', image: '편안하고 따뜻한 자리' },
  ],
  metal: [
    { name: '서율', image: '맑고 단정한 결' },
    { name: '윤슬', image: '햇빛에 반짝이는 물비늘' },
    { name: '하린', image: '맑게 빛나는 기운' },
    { name: '서안', image: '고요하고 정돈된 빛' },
    { name: '은우', image: '은은하게 빛나는 결' },
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
