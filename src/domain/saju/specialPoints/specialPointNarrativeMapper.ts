// SpecialPoint narrative 매핑 — 카탈로그 템플릿 + 사주 컨텍스트 → 최종 narrative.

import type { SpecialPoint } from '../report/sajuReportSchema';
import { SPECIAL_POINT_TITLE_TEMPLATES, type SpecialPointTemplate } from './specialPointCatalog';

export interface NarrativeContext {
  templateKey: keyof typeof SPECIAL_POINT_TITLE_TEMPLATES;
  /** 카탈로그 외 보조 evidence 텍스트 (예: 어느 자리에 있는지) */
  evidenceDescription?: string;
  /** 강도 — narrative 길이·뉘앙스 조정에 사용 가능 */
  strengthScore: number;
  /** 활성화 조건 (대운·세운) */
  activatedBy?: string[];
  /** 약해지는 조건 */
  weakenedBy?: string[];
}

/** template + context → SpecialPoint.narrative + activatedBy/weakenedBy 채움 */
export function buildNarrative(ctx: NarrativeContext): Pick<SpecialPoint, 'narrative' | 'activatedBy' | 'weakenedBy'> {
  const tpl: SpecialPointTemplate = SPECIAL_POINT_TITLE_TEMPLATES[ctx.templateKey];
  if (!tpl) throw new Error(`unknown specialPoint template: ${ctx.templateKey}`);

  return {
    narrative: { ...tpl.narrative },
    activatedBy: ctx.activatedBy ?? [],
    weakenedBy: ctx.weakenedBy ?? [],
  };
}
