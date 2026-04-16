'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { formatLLMText } from '@/lib/format-llm';
import { CG, JJ, OH_CG, OH_JJ, getOhCount, getSipsung, get12Unsung, calcShinsal } from '@/lib/saju-calc';
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
