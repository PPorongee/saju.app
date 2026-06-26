// 올해운세 — 건강 결 (결정론, GPT 0회)
//
// 전통 명리 건강론: 오행 균형상 약한(결핍) 오행에 대응하는 장부 계통이 예민할 수 있다.
//   목→간·담 / 화→심·소장 / 토→비·위(소화기) / 금→폐·대장 / 수→신장·방광(비뇨기)
// 올해 세운 오행이 그 약한 오행을 극(克)하면(상극) 그 해엔 더 눌릴 수 있어 가중 표시.
//
// ⚠️ 안전 원칙 (유료 서비스):
//   - 진단/병명/예측 금지("질환에 걸린다", "위장병" 등 X). "예민할 수 있다" 경향만.
//   - 생활 돌봄(식사·수면·수분·휴식) 중심. UI에 의학 면책 한 줄 필수.
//   - 약한(결핍) 오행이 없으면 빈 배열 → 카드 자체가 안 뜸(과한 건강 경고 방지).

import type { Element } from '../rules/elements';
import { ELEMENT_KO, RESTRAINS } from '../rules/elements';
import type { ElementStrengthAnalysis } from '../report/sajuReportSchema';
import type { YearlyHealthHint } from './yearlyTypes';

const ORGAN_BY_ELEMENT: Record<Element, { organ: string; care: string }> = {
  wood:  { organ: '간·담(눈·근육)',     care: '과로와 늦은 음주를 줄이고 충분히 쉬며 눈도 자주 쉬어주면 좋아요' },
  fire:  { organ: '심장·소장(순환)',     care: '과한 흥분과 수면 부족을 피하고 규칙적인 수면으로 심장을 편하게 해주면 좋아요' },
  earth: { organ: '소화기(비·위)',       care: '규칙적인 식사와 따뜻한 음식으로 챙기고 과식·찬 음식을 피하면 좋아요' },
  metal: { organ: '호흡기·대장(폐)',     care: '자주 환기하고 건조함을 피하며 수분과 규칙적인 배변 리듬을 챙기면 좋아요' },
  water: { organ: '신장·방광(비뇨기)',   care: '수분을 충분히 마시고 하체를 따뜻하게, 과로 없이 푹 쉬어주면 좋아요' },
};

/**
 * 올해 살펴볼 건강 결.
 * @param elementStrength 원국 오행 강약 분석
 * @param yearElement 올해 세운 오행 (영문 Element)
 */
export function buildYearlyHealthHints(
  elementStrength: ElementStrengthAnalysis,
  yearElement: Element,
): YearlyHealthHint[] {
  const weak = (elementStrength.deficient ?? []).slice(0, 2); // 과하지 않게 최대 2개
  const yearControls = RESTRAINS[yearElement]; // 올해 기운이 극하는 오행

  return weak.map((el) => {
    const info = ORGAN_BY_ELEMENT[el];
    const ko = ELEMENT_KO[el];
    const aggravated = yearControls === el;
    const lead = `${ko} 기운이 약한 편이라 ${info.organ} 계통이 예민할 수 있어요.`;
    const yearPart = aggravated
      ? ' 특히 올해는 들어오는 기운이 그쪽을 누르는 흐름이라 평소보다 더 신경 쓰면 좋아요.'
      : '';
    return {
      element: ko,
      organ: info.organ,
      aggravatedByYear: aggravated,
      note: `${lead}${yearPart} ${info.care}.`,
    };
  });
}
