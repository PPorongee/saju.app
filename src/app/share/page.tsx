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

        {/* 목차 (TOC) - 섹션이 있으면 표시 */}
        {(() => {
          const tocMatches = result.match(/##\s*(\d+)\.\s*([^#\n]+)/g);
          if (!tocMatches || tocMatches.length < 3) return null;
          const items = tocMatches.map(m => {
            const mm = m.match(/##\s*(\d+)\.\s*(.+)/);
            return mm ? { num: mm[1], title: mm[2].replace(/##/g, '').trim() } : null;
          }).filter(Boolean) as { num: string; title: string }[];
          return (
            <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: 800, color: 'var(--primary-light)', marginBottom: '10px' }}>📋 목차</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {items.map((item, i) => (
                  <a key={i} href={`#saju-sec-${item.num}`} onClick={e => { e.preventDefault(); document.getElementById('saju-sec-' + item.num)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 10px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', textDecoration: 'none', cursor: 'pointer' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '22px', height: '22px', borderRadius: '7px', fontSize: '11px', fontWeight: 800, color: '#fff', background: 'rgba(159,122,234,0.5)' }}>{item.num}</span>
                    <span style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600 }}>{item.title}</span>
                  </a>
                ))}
              </div>
            </div>
          );
        })()}

        {/* 올해 운 에너지 레이더 차트 */}
        {(() => {
          const fMatch = result.match(/\[운세점수:\s*재물=(\d+),\s*연애=(\d+),\s*직장=(\d+),\s*건강=(\d+),\s*대인=(\d+)\]/);
          if (!fMatch) return null;
          const fScores = [parseInt(fMatch[1]), parseInt(fMatch[2]), parseInt(fMatch[3]), parseInt(fMatch[4]), parseInt(fMatch[5])];
          const fLabels = ['재물운', '연애운', '직장운', '건강운', '대인운'];
          const fIcons = ['💰', '💕', '💼', '🏥', '👥'];
          const fColors = ['#F0C75E', '#F687B3', '#7DD3FC', '#6EE7B7', '#9F7AEA'];
          const cx = 120, cy = 120, r = 90;
          const angles = fScores.map((_: number, i: number) => (Math.PI * 2 * i / 5) - Math.PI / 2);
          const toXY = (angle: number, val: number) => ({ x: cx + Math.cos(angle) * (val / 10) * r, y: cy + Math.sin(angle) * (val / 10) * r });
          const pts = fScores.map((s: number, i: number) => toXY(angles[i], s));
          const polyPoints = pts.map((p: {x: number; y: number}) => `${p.x},${p.y}`).join(' ');
          const gridLevels = [2, 4, 6, 8, 10];
          return (
            <div className="card" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ fontSize: '15px', fontWeight: 800, color: 'var(--text)', marginBottom: '12px', textAlign: 'center' }}>
                {new Date().getFullYear()} 올해 운 에너지
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <svg viewBox="0 0 240 240" width="240" height="240">
                  {gridLevels.map(lv => (
                    <polygon key={lv} points={angles.map((a: number) => { const p = toXY(a, lv); return `${p.x},${p.y}`; }).join(' ')}
                      fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
                  ))}
                  {angles.map((a: number, i: number) => {
                    const end = toXY(a, 10);
                    return <line key={i} x1={cx} y1={cy} x2={end.x} y2={end.y} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />;
                  })}
                  <polygon points={polyPoints} fill="rgba(240,199,94,0.15)" stroke="#F0C75E" strokeWidth="2" />
                  {pts.map((p: {x: number; y: number}, i: number) => (
                    <circle key={i} cx={p.x} cy={p.y} r="4" fill={fColors[i]} stroke="#fff" strokeWidth="1" />
                  ))}
                  {angles.map((a: number, i: number) => {
                    const lp = toXY(a, 12.5);
                    return (
                      <text key={i} x={lp.x} y={lp.y} textAnchor="middle" dominantBaseline="middle" fill={fColors[i]} fontSize="11" fontWeight="700">
                        {fIcons[i]} {fLabels[i]}
                      </text>
                    );
                  })}
                </svg>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '8px' }}>
                {fScores.map((s: number, i: number) => (
                  <div key={i} style={{ textAlign: 'center', minWidth: '50px' }}>
                    <div style={{ fontSize: '11px', color: fColors[i], fontWeight: 700 }}>{fIcons[i]} {fLabels[i]}</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: fColors[i] }}>{s}<span style={{ fontSize: '10px', opacity: 0.5 }}>/10</span></div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* AI 해설 + 분기별 에너지 그래프 */}
        <div className="section-divider">{t('aiReading', lang)}</div>
        {(() => {
          const qMatch = result.match(/\[에너지점수:\s*Q1=(\d+),\s*Q2=(\d+),\s*Q3=(\d+),\s*Q4=(\d+)\]/);
          if (!qMatch) {
            // 에너지 점수 없음 = 개인사주/궁합 → 단순 렌더링
            return (
              <div className="card" style={{ padding: '24px 16px' }}>
                <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(result) }} />
              </div>
            );
          }
          // 올해사주 → 에너지 그래프를 섹션3에 삽입
          const qScores = [parseInt(qMatch[1]), parseInt(qMatch[2]), parseInt(qMatch[3]), parseInt(qMatch[4])];
          const qLabels = ['1분기\n1~3월', '2분기\n4~6월', '3분기\n7~9월', '4분기\n10~12월'];
          const qColors = ['#7DD3FC', '#6EE7B7', '#F0C75E', '#F687B3'];
          const maxQ = Math.max(...qScores);

          const graphHtml = `<div style="margin:16px 0 20px;text-align:center">
            <div style="font-size:14px;font-weight:700;color:var(--text-dim);margin-bottom:12px">⚡ 분기별 에너지 그래프</div>
            <div style="display:flex;align-items:flex-end;justify-content:center;gap:12px;height:140px;margin-bottom:8px;padding:0 8px">
              ${qScores.map((score: number, i: number) => `<div style="display:flex;flex-direction:column;align-items:center;flex:1">
                <div style="font-size:18px;font-weight:900;color:${qColors[i]};margin-bottom:6px">${score}<span style="font-size:11px;opacity:0.5">/10</span></div>
                <div style="width:100%;max-width:52px;height:${Math.max(12, (score / 10) * 110)}px;background:linear-gradient(180deg,${qColors[i]},${qColors[i]}33);border-radius:10px 10px 4px 4px;${score === maxQ ? `box-shadow:0 0 16px ${qColors[i]}55;border:2px solid ${qColors[i]}` : 'border:1px solid rgba(255,255,255,0.08)'}"></div>
              </div>`).join('')}
            </div>
            <div style="display:flex;justify-content:center;gap:12px;padding:0 8px">
              ${qLabels.map((label: string, i: number) => `<div style="flex:1;text-align:center;font-size:10px;color:${qColors[i]};font-weight:600;white-space:pre-line;line-height:1.3">${label}</div>`).join('')}
            </div>
            <div style="text-align:center;margin-top:10px;font-size:11px;color:var(--text-dim)">에너지 최고 분기: <strong style="color:${qColors[qScores.indexOf(maxQ)]}">${qLabels[qScores.indexOf(maxQ)].split('\n')[0]}</strong></div>
          </div>`;

          const sec3Marker = result.match(/##\s*3[\.\s]/);
          const sec4Marker = result.match(/##\s*4[\.\s]/);
          const splitBefore = sec3Marker ? result.indexOf(sec3Marker[0]) : -1;
          const splitAfter = sec4Marker ? result.indexOf(sec4Marker[0]) : -1;
          const beforeSec3 = splitBefore > 0 ? result.slice(0, splitBefore) : '';
          const sec3Text = splitBefore > 0 && splitAfter > 0 ? result.slice(splitBefore, splitAfter) : '';
          const afterSec3 = splitAfter > 0 ? result.slice(splitAfter) : (splitBefore > 0 ? '' : result);

          const sec3Html = sec3Text ? formatLLMText(sec3Text, lang) : '';
          const insertIdx = sec3Html.indexOf('</h3>');
          const sec3Combined = insertIdx > 0
            ? sec3Html.slice(0, insertIdx + 5) + graphHtml + sec3Html.slice(insertIdx + 5)
            : sec3Html;

          return (
            <>
              {beforeSec3 && <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(beforeSec3, lang) }} />}
              {sec3Text && <div className="llm-text" dangerouslySetInnerHTML={{ __html: sec3Combined }} />}
              {afterSec3 && <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(afterSec3, lang) }} />}
            </>
          );
        })()}

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center', marginTop: '32px' }}>
          <a href="/" className="btn" style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: '50px', width: '100%', maxWidth: '360px', textAlign: 'center',
            background: 'linear-gradient(135deg, #F0C75E, #E8B030)', color: '#0A0E2A',
            fontSize: '15px', fontWeight: 800, textDecoration: 'none', border: 'none'
          }}>나도 개인 사주 보러가기 🔮</a>
          <a href="/" className="btn" style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: '50px', width: '100%', maxWidth: '360px', textAlign: 'center',
            background: 'linear-gradient(135deg, #9F7AEA, #6B46C1)', color: '#F5F0E8',
            fontSize: '15px', fontWeight: 800, textDecoration: 'none', border: 'none'
          }}>나도 {new Date().getFullYear()} 올해운세 보러가기 📅</a>
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
