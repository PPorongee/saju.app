import React from 'react';
import { OH_ICON } from '@/lib/saju-calc';
import type { Lang } from '@/lib/i18n';
import { getOhInterpretation } from '@/components/ui/TermExplainer';

const OH_EN_CAP: Record<string, string> = { '목': 'Wood', '화': 'Fire', '토': 'Earth', '금': 'Metal', '수': 'Water' };
const OH_COLORS: Record<string, string> = { '목': '#22C55E', '화': '#EF4444', '토': '#EAB308', '금': '#94A3B8', '수': '#3B82F6' };

function getElemClass(oh: string): string {
  const map: Record<string, string> = { '목': 'wood', '화': 'fire', '토': 'earth', '금': 'metal', '수': 'water' };
  return map[oh] || 'earth';
}

interface OhaengChartProps {
  ohCount: Record<string, number>;
  lang: Lang;
}

/**
 * Five-elements (오행) balance display: vertical bar chart + horizontal bar rows.
 * Pure presentational — receives computed ohCount and lang, renders nothing else.
 */
export default function OhaengChart({ ohCount, lang }: OhaengChartProps) {
  const ohKeys = ['목', '화', '토', '금', '수'];
  let total = 0;
  ohKeys.forEach(k => { total += ohCount[k]; });
  if (total === 0) total = 1;

  return (
    <div className="card">
      {/* Vertical bar chart */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end', height: '80px', margin: '8px 0' }}>
        {ohKeys.map(k => (
          <div key={k} style={{ flex: 1, textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', height: '100%' }}>
            <div style={{ fontSize: '12px', color: OH_COLORS[k], fontWeight: 700, marginBottom: '4px' }}>{ohCount[k]}</div>
            <div style={{
              height: Math.max(8, (ohCount[k] / total) * 60) + 'px',
              background: OH_COLORS[k], borderRadius: '4px 4px 0 0',
              transition: 'height 0.5s'
            }} />
            <div style={{ fontSize: '11px', marginTop: '4px', color: 'var(--text-dim)' }}>{OH_ICON[k]} {lang === 'en' ? OH_EN_CAP[k] : k}</div>
          </div>
        ))}
      </div>
      {/* Horizontal bar rows */}
      <div className="bar-chart" style={{ marginTop: '8px' }}>
        {ohKeys.map(k => {
          const pct = Math.round(ohCount[k] / total * 100);
          const interp = getOhInterpretation(k, ohCount[k], total, lang);
          return (
            <div key={k} className="bar-row">
              <div className="bar-label">{OH_ICON[k]} {lang === 'en' ? OH_EN_CAP[k] : k}</div>
              <div className="bar-track">
                <div className={'bar-fill ' + getElemClass(k)} style={{ width: pct + '%' }}>
                  {ohCount[k]}
                </div>
              </div>
              {interp && <div style={{ fontSize: '11px', color: 'rgba(245,240,232,0.45)', marginTop: '2px', paddingLeft: '4px' }}>{interp}</div>}
            </div>
          );
        })}
      </div>
      <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.4)', marginTop: '10px', lineHeight: 1.5, padding: '0 4px' }}>
        {lang === 'en'
          ? 'This chart shows the balance of five elements in your birth chart. A balanced distribution is ideal, but imbalances reveal unique strengths and growth areas.'
          : '사주의 다섯 가지 기운(오행) 분포를 보여줘요. 균형이 이상적이지만, 편중은 고유한 강점과 성장 포인트를 알려줘요.'}
      </p>
    </div>
  );
}
