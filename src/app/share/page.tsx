'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { formatLLMText } from '@/lib/format-llm';
import { CG, JJ, OH_CG, OH_JJ, getOhCount, getSipsung, get12Unsung, calcShinsal } from '@/lib/saju-calc';
// OH_CG and OH_JJ needed for yongsin calculation in share page
import type { SajuResult } from '@/lib/saju-calc';
import PillarDisplay from '@/components/ui/PillarDisplay';
import OhaengChart from '@/components/ui/OhaengChart';
import { t } from '@/lib/i18n';

interface ChartData {
  saju: SajuResult;
  user: { name?: string; year?: number; month?: number; day?: number; gender?: number; concern?: number; state?: number };
}

function ShareContent() {
  const params = useSearchParams();
  const code = params.get('code') || '';
  const [title, setTitle] = useState('');
  const [result, setResult] = useState('');
  const [chart, setChart] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);
  const lang = 'ko';

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/share?code=' + encodeURIComponent(code));
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) {
            setTitle(data.title || '사주 결과');
            setResult(data.text || '');
            if (data.chartData?.saju) setChart(data.chartData as ChartData);
            setLoading(false);
            return;
          }
        }
      } catch { /* fall through to localStorage */ }
      try {
        const raw = localStorage.getItem('saju-share-' + code);
        if (raw) {
          const data = JSON.parse(raw);
          if (!cancelled) {
            setTitle(data.title || '사주 결과');
            setResult(data.text || '');
          }
        }
      } catch { /* ignore */ }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [code]);

  if (loading) {
    return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--text)', fontSize: '16px' }}>로딩 중...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="app-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔮</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px', color: 'var(--text)' }}>결과를 찾을 수 없어요</h1>
          <p style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px', color: 'var(--text)' }}>링크가 만료되었거나 존재하지 않아요.</p>
          <a href="/" style={{ color: '#F0C75E', textDecoration: 'none', fontSize: '15px', fontWeight: 700 }}>별빛 사주 홈으로 →</a>
        </div>
      </div>
    );
  }

  const sj = chart?.saju;
  const user = chart?.user;

  const pillarDesc: Record<string, string> = {
    '시주': '자녀·말년운', '일주': '나 자신·배우자', '월주': '부모·사회운', '년주': '조상·초년운',
  };

  const pillars = sj ? [
    { key: '시주', label: t('pillarHour', lang), desc: pillarDesc['시주'], stem: sj.hStem, branch: sj.hBranch },
    { key: '일주', label: t('pillarDay', lang), desc: pillarDesc['일주'], stem: sj.dStem, branch: sj.dBranch },
    { key: '월주', label: t('pillarMonth', lang), desc: pillarDesc['월주'], stem: sj.mStem, branch: sj.mBranch },
    { key: '년주', label: t('pillarYear', lang), desc: pillarDesc['년주'], stem: sj.yStem, branch: sj.yBranch }
  ] : null;

  const sipsung = sj ? getSipsung(sj) : null;
  const sipsungMap = sipsung ? { '시주': sipsung['시간'] || '', '일주': '', '월주': sipsung['월간'] || '', '년주': sipsung['년간'] || '' } : {};
  const unsung = sj ? get12Unsung(sj) : null;
  const unsungMap = unsung ? { '시주': unsung['시지'] || '', '일주': unsung['일지'] || '', '월주': unsung['월지'] || '', '년주': unsung['년지'] || '' } : {};
  const ohCount = sj ? getOhCount(sj) : null;
  const shinsal = sj ? calcShinsal(sj) : [];

  const shinsalDisplay: Record<string, string> = {};
  const gilShin = ['천을귀인', '문창귀인', '학당귀인', '천주귀인', '복성귀인', '장성살', '천의성', '금여록', '암록'];
  const gwiin = ['천을귀인', '문창귀인', '학당귀인', '천주귀인', '복성귀인'];

  return (
    <div className="app-container" style={{ minHeight: '100vh', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '24px', paddingTop: '20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔮</div>
          <h1 className="gradient-text" style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{title}</h1>
          {user && (
            <p style={{ fontSize: '13px', color: 'var(--text)', opacity: 0.6 }}>
              {user.name && <span>{user.name} · </span>}
              {user.year}년 {user.month}월 {user.day}일생
            </p>
          )}
          <p style={{ fontSize: '12px', opacity: 0.4, color: 'var(--text)', marginTop: '4px' }}>별빛 사주 | Starlight Saju</p>
        </div>

        {/* 사주명식 */}
        {sj && pillars && (
          <>
            <div className="section-divider">{t('sajuMyeongsik', lang)}</div>
            <PillarDisplay
              pillars={pillars}
              sipsungMap={sipsungMap}
              unsungMap={unsungMap}
              dayMasterStem={sj.dStem}
              lang={lang}
            />
          </>
        )}

        {/* 신살 Badges */}
        {shinsal.length > 0 && (
          <div className="card" style={{ padding: '12px 16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px', color: 'var(--text)' }}>{t('shinsalTitle', lang)}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {shinsal.map((s, i) => {
                const isGwiin = gwiin.includes(s);
                const isGil = gilShin.includes(s);
                return (
                  <span key={i} style={{
                    display: 'inline-block', padding: '3px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 600,
                    background: isGwiin ? 'rgba(240,199,94,0.15)' : isGil ? 'rgba(110,231,183,0.12)' : 'rgba(251,191,36,0.10)',
                    border: isGwiin ? '1px solid rgba(240,199,94,0.4)' : isGil ? '1px solid rgba(110,231,183,0.3)' : '1px solid rgba(251,191,36,0.25)',
                    color: isGwiin ? '#F0C75E' : isGil ? '#6EE7B7' : '#FBBF24'
                  }}>
                    {isGwiin ? '⭐ ' : ''}{shinsalDisplay[s] || s}
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* 오행 밸런스 */}
        {ohCount && (
          <>
            <div className="section-divider">{t('ohBalance', lang)}</div>
            <OhaengChart ohCount={ohCount} lang={lang} />
          </>
        )}

        {/* 인생 에너지 흐름 */}
        {sj && unsung && (() => {
          const energyMap: Record<string, number> = {
            '절': 1, '태': 2, '양': 3, '장생': 5, '목욕': 4, '관대': 7,
            '건록': 9, '제왕': 10, '쇠': 6, '병': 4, '사': 2, '묘': 3
          };
          const stages = [unsung['년지'], unsung['월지'], unsung['일지'], unsung['시지'] || '?'];
          const labels = ['년주(초년)', '월주(청년)', '일주(중년)', '시주(말년)'];
          return (
            <>
              <div className="section-divider">{t('lifeEnergyFlow', lang)}</div>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', textAlign: 'center' }}>
                  {stages.map((s, i) => (
                    <div key={i} style={{ padding: '10px 4px', borderRadius: '12px', background: i === 2 ? 'rgba(240,199,94,0.1)' : 'rgba(255,255,255,0.03)' }}>
                      <div style={{ fontSize: '11px', color: i === 2 ? '#F0C75E' : 'var(--text-dim)', fontWeight: 700, marginBottom: '4px' }}>{labels[i]}</div>
                      <div style={{ fontSize: '20px', fontWeight: 800, color: '#7DD3FC' }}>{s === '?' ? '-' : energyMap[s] || 5}</div>
                      <div style={{ fontSize: '10px', color: 'var(--text-dim)' }}>/10</div>
                      <div style={{ fontSize: '11px', color: '#7DD3FC', marginTop: '2px' }}>{s === '?' ? '미상' : s}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

        {/* 사주 체질 (용신/기신) */}
        {sj && ohCount && (() => {
          const dayOhS = OH_CG[sj.dStem];
          const mBrOh = OH_JJ[sj.mBranch];
          const sang: Record<string, string> = { '목':'수', '화':'목', '토':'화', '금':'토', '수':'금' };
          const geuk: Record<string, string> = { '목':'금', '화':'수', '토':'목', '금':'화', '수':'토' };
          const dk = mBrOh === dayOhS || sang[dayOhS] === mBrOh;
          let tg = 0; [sj.yBranch, sj.mBranch, sj.dBranch, ...(sj.hBranch >= 0 ? [sj.hBranch] : [])].forEach(b => { if (OH_JJ[b] === dayOhS) tg++; });
          const strong = (dk ? 3 : 0) + tg * 2 >= 4;
          const ys = strong ? geuk[dayOhS] || '토' : sang[dayOhS] || '토';
          const gs = strong ? sang[dayOhS] || '토' : geuk[dayOhS] || '토';
          const ohIcon: Record<string, string> = { '목': '🌳', '화': '🔥', '토': '⛰️', '금': '⚔️', '수': '💧' };
          return (
            <>
              <div className="section-divider">{t('sajuConstitution', lang)}</div>
              <div className="card" style={{ padding: '16px' }}>
                <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: strong ? '#F0C75E' : '#7DD3FC' }}>
                    {strong ? '신강 (에너지 강한 타입)' : '신약 (에너지 부드러운 타입)'}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'rgba(110,231,183,0.08)', border: '1px solid rgba(110,231,183,0.2)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#6EE7B7', fontWeight: 700, marginBottom: '4px' }}>용신 (필요한 기운)</div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{ohIcon[ys]} {ys}</div>
                  </div>
                  <div style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '14px', padding: '12px', textAlign: 'center' }}>
                    <div style={{ fontSize: '11px', color: '#F87171', fontWeight: 700, marginBottom: '4px' }}>기신 (피할 기운)</div>
                    <div style={{ fontSize: '24px', fontWeight: 800 }}>{ohIcon[gs]} {gs}</div>
                  </div>
                </div>
              </div>
            </>
          );
        })()}

        {/* AI 해설 */}
        <div className="section-divider">{t('aiReading', lang)}</div>
        <div className="card" style={{ padding: '24px 16px' }}>
          <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(result) }} />
        </div>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginTop: '32px' }}>
          <a href="/" className="btn" style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: '50px', width: '100%', maxWidth: '360px', textAlign: 'center',
            background: 'linear-gradient(135deg, #F0C75E, #E8B030)', color: '#0A0E2A',
            fontSize: '15px', fontWeight: 800, textDecoration: 'none', border: 'none'
          }}>나도 990원에 개인 사주 보러가기 🔮</a>
          <a href="/" className="btn" style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: '50px', width: '100%', maxWidth: '360px', textAlign: 'center',
            background: 'linear-gradient(135deg, #9F7AEA, #6B46C1)', color: '#F5F0E8',
            fontSize: '15px', fontWeight: 800, textDecoration: 'none', border: 'none'
          }}>나도 990원에 2026 올해운세 보러가기 📅</a>
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div className="app-container" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--text)' }}>로딩 중...</p></div>}>
      <ShareContent />
    </Suspense>
  );
}
