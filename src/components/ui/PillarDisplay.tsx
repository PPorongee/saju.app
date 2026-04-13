import React from 'react';
import { CG, JJ, CG_HANJA, JJ_HANJA, OH_CG, OH_JJ, PROFILES } from '@/lib/saju-calc';
import { t, type Lang } from '@/lib/i18n';

const OH_COLORS: Record<string, string> = { '목': '#81C784', '화': '#EF5350', '토': '#FFD54F', '금': '#E0E0E0', '수': '#64B5F6' };
const OH_EN_CAP: Record<string, string> = { '목': 'Wood', '화': 'Fire', '토': 'Earth', '금': 'Metal', '수': 'Water' };

function getElemColor(oh: string): string {
  return OH_COLORS[oh] || '#E0E0E0';
}

export interface Pillar {
  key: string;
  label: string;
  desc: string;
  stem: number;
  branch: number;
}

interface PillarDisplayProps {
  pillars: Pillar[];
  sipsungMap: Record<string, string>;
  unsungMap: Record<string, string>;
  dayMasterStem: number;
  lang: Lang;
}

/**
 * Four-pillar (사주 명식) display card.
 * Renders heaven-stem / earth-branch / sipsung / unsung for each of the four pillars.
 * Pure presentational — all computed data passed as props.
 */
export default function PillarDisplay({ pillars, sipsungMap, unsungMap, dayMasterStem, lang }: PillarDisplayProps) {
  const ds = dayMasterStem;
  const profile = PROFILES[ds];

  return (
    <div className="card">
      <div className="pillar-grid">
        {pillars.map((pp, pi) => {
          const isDay = pp.key === '일주';
          return (
            <div key={pi} className="pillar" style={isDay
              ? { border: '1.5px solid rgba(240,199,94,0.5)', borderRadius: '12px', background: 'rgba(240,199,94,0.06)', padding: '6px 2px' }
              : { border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '6px 2px' }}>
              <div className="pillar-label" style={isDay ? { color: '#F0C75E', fontWeight: 700 } : undefined}>
                {pp.label}{isDay ? ' ★' : ''}
              </div>
              <div style={{ fontSize: '9px', color: 'var(--text-dim)', marginBottom: '4px', lineHeight: 1.2 }}>{pp.desc}</div>
              {pp.stem < 0 ? (
                <>
                  <div className="stem" style={{ color: 'var(--text-dim)' }}>?</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', minHeight: '16px' }}>-</div>
                  <div className="branch" style={{ color: 'var(--text-dim)' }}>?</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-dim)', minHeight: '16px' }}>-</div>
                  <div className="elem" style={{ opacity: 0.3 }}>?</div>
                </>
              ) : (
                <>
                  <div className="stem" style={{ color: getElemColor(OH_CG[pp.stem]) }}>
                    <span style={{ fontSize: '28px' }}>{CG_HANJA[pp.stem]}</span><br />
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>{CG[pp.stem]}({lang === 'en' ? OH_EN_CAP[OH_CG[pp.stem]] : OH_CG[pp.stem]})</span>
                  </div>
                  <div style={{ fontSize: '11px', color: isDay ? 'rgba(240,199,94,0.7)' : '#C4B5FD', minHeight: '16px', fontWeight: 600 }}>
                    {isDay ? t('dayMasterBracket', lang) : (sipsungMap[pp.key] || '')}
                  </div>
                  <div className="branch" style={{ color: getElemColor(OH_JJ[pp.branch]) }}>
                    <span style={{ fontSize: '28px' }}>{JJ_HANJA[pp.branch]}</span><br />
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>{JJ[pp.branch]}({OH_JJ[pp.branch]})</span>
                  </div>
                  <div style={{ fontSize: '11px', color: '#7DD3FC', minHeight: '16px', fontWeight: 600 }}>
                    {unsungMap[pp.key] || ''}
                  </div>
                  <span className={'elem elem-' + (OH_CG[pp.stem] === '목' ? 'wood' : OH_CG[pp.stem] === '화' ? 'fire' : OH_CG[pp.stem] === '토' ? 'earth' : OH_CG[pp.stem] === '금' ? 'metal' : 'water')}>
                    {lang === 'en' ? OH_EN_CAP[OH_CG[pp.stem]] : OH_CG[pp.stem]}
                  </span>{' '}
                  <span className={'elem elem-' + (OH_JJ[pp.branch] === '목' ? 'wood' : OH_JJ[pp.branch] === '화' ? 'fire' : OH_JJ[pp.branch] === '토' ? 'earth' : OH_JJ[pp.branch] === '금' ? 'metal' : 'water')}>
                    {OH_JJ[pp.branch]}
                  </span>
                </>
              )}
            </div>
          );
        })}
      </div>
      <p style={{ textAlign: 'center', fontSize: '12px', marginTop: '8px' }}>
        {t('dayMasterLabel', lang)}: <strong style={{ color: getElemColor(OH_CG[ds]) }}>{CG[ds]} {profile.short}</strong>
      </p>
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', fontSize: '10px', marginTop: '4px', opacity: 0.5 }}>
        <span style={{ color: '#C4B5FD' }}>{t('sipsungLabel', lang)}</span>
        <span>|</span>
        <span style={{ color: '#7DD3FC' }}>{t('unsungLabel', lang)}</span>
      </div>
    </div>
  );
}
