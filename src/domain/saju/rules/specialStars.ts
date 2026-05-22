// 신살 (神煞) — 일간 또는 년지 기준 특수 위치 표.
// spec §9-2의 귀인·매력·이동·승부성 등 핵심 신살.

import type { HeavenlyStem } from './heavenlyStems';
import type { EarthlyBranch } from './earthlyBranches';

// 천을귀인 — 일간 → 지지 2개
export const CHEONEUL: Record<HeavenlyStem, EarthlyBranch[]> = {
  갑: ['축', '미'], 무: ['축', '미'], 경: ['축', '미'],
  을: ['신', '자'], 기: ['신', '자'],
  병: ['해', '유'], 정: ['해', '유'],
  임: ['사', '묘'], 계: ['사', '묘'],
  신: ['인', '오'],
};

// 문창귀인 — 일간 → 지지 1개
export const MUNCHANG: Record<HeavenlyStem, EarthlyBranch> = {
  갑: '사', 을: '오', 병: '신', 무: '신',
  정: '유', 기: '유', 경: '해', 신: '자',
  임: '인', 계: '묘',
};

// 학당귀인 — 자평진전 기준
export const HAKDANG: Record<HeavenlyStem, EarthlyBranch> = {
  갑: '해', 을: '오', 병: '인', 무: '인',
  정: '유', 기: '유', 경: '사', 신: '자',
  임: '신', 계: '묘',
};

// 양인 — 일간(양간 중심). 음간은 일파별 차이가 커 보수적으로 양간만.
export const YANGIN: Partial<Record<HeavenlyStem, EarthlyBranch>> = {
  갑: '묘', 병: '오', 무: '오', 경: '유', 임: '자',
};

// 홍염살 — 일간 → 지지
export const HONGYEOM: Record<HeavenlyStem, EarthlyBranch> = {
  갑: '오', 을: '사', 병: '인', 정: '미',
  무: '진', 기: '진', 경: '술', 신: '유',
  임: '자', 계: '신',
};

// 도화 — 년지/일지의 삼합 첫글자에 대응하는 지지 (子午卯酉 중 하나)
//   인오술 → 묘 / 신자진 → 유 / 사유축 → 오 / 해묘미 → 자
export function doHwaFor(baseBranch: EarthlyBranch): EarthlyBranch {
  if (['인', '오', '술'].includes(baseBranch)) return '묘';
  if (['신', '자', '진'].includes(baseBranch)) return '유';
  if (['사', '유', '축'].includes(baseBranch)) return '오';
  return '자'; // 해묘미
}

// 역마 — 년지/일지의 삼합 첫글자의 충
//   신자진 → 인 / 인오술 → 신 / 사유축 → 해 / 해묘미 → 사
export function yeokMaFor(baseBranch: EarthlyBranch): EarthlyBranch {
  if (['신', '자', '진'].includes(baseBranch)) return '인';
  if (['인', '오', '술'].includes(baseBranch)) return '신';
  if (['사', '유', '축'].includes(baseBranch)) return '해';
  return '사'; // 해묘미
}

// 화개 — 년지/일지의 삼합 끝글자
//   신자진 → 진 / 인오술 → 술 / 사유축 → 축 / 해묘미 → 미
export function hwaGaeFor(baseBranch: EarthlyBranch): EarthlyBranch {
  if (['신', '자', '진'].includes(baseBranch)) return '진';
  if (['인', '오', '술'].includes(baseBranch)) return '술';
  if (['사', '유', '축'].includes(baseBranch)) return '축';
  return '미'; // 해묘미
}

// 괴강 — 일주(천간+지지) 4가지
export const GOEGANG_PILLARS = new Set(['경진', '임진', '무술', '경술']);

// 백호 — 일주 7가지
export const BAEKHO_PILLARS = new Set(['무진', '정축', '병술', '을미', '갑진', '계축', '임술']);
