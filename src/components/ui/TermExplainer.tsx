'use client';

import React, { useState } from 'react';
import { SAJU_TERMS, getTermExplanation, type TermEntry } from '@/lib/saju-terminology';
import type { Lang } from '@/lib/i18n';

/**
 * Inline term explainer — shows a small ⓘ icon next to a term.
 * Tapping it toggles a compact explanation panel below.
 * Mobile-friendly: no hover-only tooltips.
 */
export function TermExplainer({ termKey, lang }: { termKey: string; lang: Lang }) {
  const [open, setOpen] = useState(false);
  const entry = SAJU_TERMS[termKey];
  if (!entry) return null;

  const short = lang === 'en' ? entry.shortEn : entry.shortKo;
  const detail = lang === 'en' ? entry.detailEn : entry.detailKo; // used in expanded view
  const why = lang === 'en' ? entry.whyEn : entry.whyKo;

  return (
    <span style={{ position: 'relative', display: 'inline' }}>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open); }}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: 'rgba(240,199,94,0.6)', fontSize: '12px', padding: '0 2px',
          verticalAlign: 'super', lineHeight: 1,
        }}
        aria-label={lang === 'en' ? `${entry.term} explanation` : `${entry.term} 설명`}
        aria-expanded={open}
        aria-controls={`term-${termKey}`}
      >
        ⓘ
      </button>
      {open && (
        <span id={`term-${termKey}`} role="region" style={{
          display: 'block',
          background: 'rgba(20,24,80,0.95)',
          border: '1px solid rgba(240,199,94,0.3)',
          borderRadius: '12px',
          padding: '10px 14px',
          marginTop: '6px',
          fontSize: '12px',
          lineHeight: 1.6,
          color: 'rgba(245,240,232,0.85)',
          maxWidth: '300px',
        }}>
          <strong style={{ color: '#F0C75E' }}>{entry.term}{entry.hanja ? ` (${entry.hanja})` : ''}</strong>
          <br />{short}
          <br /><span style={{ opacity: 0.7, fontSize: '11px' }}>{detail}</span>
          <br /><span style={{ opacity: 0.5, fontSize: '11px' }}>{why}</span>
        </span>
      )}
    </span>
  );
}

/**
 * Section explanation block — shows a compact explanation paragraph
 * below a section title. Always visible, no toggle needed.
 */
export function SectionExplainer({ text }: { text: string }) {
  return (
    <p style={{
      fontSize: '12px',
      color: 'rgba(245,240,232,0.5)',
      lineHeight: 1.6,
      margin: '4px 0 8px',
      padding: '0 4px',
    }}>
      {text}
    </p>
  );
}

/**
 * 12운성 stage explanations for the life energy chart.
 */
export const UNSUNG_EXPLAIN: Record<string, { ko: string; en: string }> = {
  '장생': { ko: '새로운 시작의 에너지, 성장의 씨앗', en: 'Energy of new beginnings, seeds of growth' },
  '목욕': { ko: '변화와 정화의 시기, 불안정하지만 성장 중', en: 'Period of change and purification' },
  '관대': { ko: '성장이 가속되는 시기, 자신감 상승', en: 'Accelerating growth, rising confidence' },
  '건록': { ko: '역량이 최고조에 달하는 안정기', en: 'Peak capability and stability' },
  '제왕': { ko: '에너지가 정점에 달하는 최전성기', en: 'Absolute peak of energy and power' },
  '쇠': { ko: '정점을 지나 서서히 내려오는 시기', en: 'Gradual decline from the peak' },
  '병': { ko: '에너지가 약해지는 시기, 쉼이 필요', en: 'Weakening energy, rest needed' },
  '사': { ko: '한 사이클이 마무리되는 시기', en: 'A cycle coming to its end' },
  '묘': { ko: '에너지가 저장되는 잠복기', en: 'Latent period, energy stored away' },
  '절': { ko: '완전한 전환점, 새 시작 직전', en: 'Complete turning point, just before rebirth' },
  '태': { ko: '새 가능성이 잉태되는 시기', en: 'New possibilities being conceived' },
  '양': { ko: '새 에너지가 자라나는 준비 단계', en: 'New energy growing, preparation stage' },
};

/**
 * 오행 balance interpretation helper.
 * Returns a short Korean/English explanation for a given element's relative strength.
 */
export function getOhInterpretation(element: string, count: number, total: number, lang: Lang): string {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  const name = lang === 'en'
    ? { '목': 'Wood', '화': 'Fire', '토': 'Earth', '금': 'Metal', '수': 'Water' }[element] || element
    : element;

  if (pct >= 35) {
    return lang === 'en'
      ? `${name} is strong — this energy naturally dominates your chart.`
      : `${name}(이/가) 강해요 — 이 기운이 사주에서 자연스럽게 두드러져요.`;
  }
  if (pct <= 5) {
    return lang === 'en'
      ? `${name} is minimal — you may benefit from activities that nurture this energy.`
      : `${name}(이/가) 부족해요 — 이 기운을 보충하는 활동이 도움될 수 있어요.`;
  }
  return '';
}

/**
 * 신강/신약 plain-language explanation.
 */
export function getSingangExplanation(isStrong: boolean, lang: Lang): string {
  if (isStrong) {
    return lang === 'en'
      ? 'Your day master is strong — you have natural self-confidence and independence. You thrive when channeling energy outward through action and leadership.'
      : '일간의 힘이 강한 사주예요. 자기 주관이 뚜렷하고 독립적인 성향이 있어요. 에너지를 밖으로 발산할 때 빛나는 타입이에요.';
  }
  return lang === 'en'
    ? 'Your day master is gentle — you have natural adaptability and receptiveness. You thrive through cooperation and drawing support from your environment.'
    : '일간의 힘이 부드러운 사주예요. 적응력이 뛰어나고 주변 환경의 도움을 잘 활용해요. 협력하며 함께할 때 빛나는 타입이에요.';
}

/**
 * 신살 section explanation text.
 */
export function getShinsalExplanation(lang: Lang): string {
  return lang === 'en'
    ? 'Shinsal are special markers in your chart that highlight unique talents, tendencies, or life themes. ⭐ stars indicate "noble helpers" (귀인) — people or energies that naturally support you.'
    : '신살은 사주에서 특별한 재능, 성향, 인생 테마를 알려주는 표시예요. ⭐ 표시는 \'귀인(貴人)\' — 당신을 자연스럽게 돕는 사람이나 에너지를 의미해요.';
}
