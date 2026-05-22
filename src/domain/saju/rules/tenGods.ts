// 십성 (十星) — 일간 기준 다른 천간의 관계.
//
// 정의:
//   같은 오행 + 같은 음양     → 비견(比肩)
//   같은 오행 + 다른 음양     → 겁재(劫財)
//   내가 생하는 오행 + 같은 음양 → 식신(食神)
//   내가 생하는 오행 + 다른 음양 → 상관(傷官)
//   내가 극하는 오행 + 같은 음양 → 편재(偏財)
//   내가 극하는 오행 + 다른 음양 → 정재(正財)
//   나를 극하는 오행 + 같은 음양 → 편관(偏官)
//   나를 극하는 오행 + 다른 음양 → 정관(正官)
//   나를 생하는 오행 + 같은 음양 → 편인(偏印)
//   나를 생하는 오행 + 다른 음양 → 정인(正印)

import type { HeavenlyStem } from './heavenlyStems';
import { stemYinYang } from './heavenlyStems';
import { STEM_ELEMENT, PRODUCES, RESTRAINS } from './elements';
import type { TenGod } from '../report/sajuReportSchema';

export function calcTenGod(dayMaster: HeavenlyStem, target: HeavenlyStem): TenGod {
  const myEl = STEM_ELEMENT[dayMaster];
  const myYy = stemYinYang(dayMaster);
  const tEl = STEM_ELEMENT[target];
  const tYy = stemYinYang(target);
  const sameYy = myYy === tYy;

  if (tEl === myEl)              return sameYy ? '비견' : '겁재';
  if (PRODUCES[myEl] === tEl)    return sameYy ? '식신' : '상관';
  if (RESTRAINS[myEl] === tEl)   return sameYy ? '편재' : '정재';
  if (RESTRAINS[tEl] === myEl)   return sameYy ? '편관' : '정관';
  if (PRODUCES[tEl] === myEl)    return sameYy ? '편인' : '정인';
  throw new Error(`calcTenGod unreachable: ${dayMaster} → ${target}`);
}

export const ALL_TEN_GODS: TenGod[] = [
  '비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인',
];

/** TenGod → 카테고리 (오행 강약 분석에서 묶어쓰기 위한 그룹핑) */
export const TEN_GOD_CATEGORY: Record<TenGod, 'self' | 'output' | 'wealth' | 'authority' | 'support'> = {
  비견: 'self',     겁재: 'self',
  식신: 'output',   상관: 'output',
  편재: 'wealth',   정재: 'wealth',
  편관: 'authority', 정관: 'authority',
  편인: 'support',  정인: 'support',
};
