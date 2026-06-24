'use client';

// 올해운세 결제 전 "미리보기(teaser)" — 호기심 자극형. (궁합/개인사주와 동일 패턴)
//
// 설계(2026-06, 사용자 확정):
//   - 결제 전 GPT 호출 없음. /api/yearly-fortune/preview 결정론 결과만 사용.
//   - 후킹(올해의 결) → 실제 사실(세운·올해 십성·올해 기운·현재 대운)
//     → 첫 섹션 풀 맛보기(올해 핵심 흐름) → 결과 섹션 호기심 티저+잠금 → 별빛 CTA.
//   - 결과(YearlyV4Report)와 같은 sv4 톤. 숫자 점수·운명론 없음.

import React from 'react';

export interface YearlyPreviewData {
  targetYear?: number;
  targetYearGanji?: { stem?: string; branch?: string; display?: string };
  yearTenGod?: { stemTenGod?: string; plainMeaning?: string };
  yearElementEffect?: { element?: string; relationToUsefulGod?: string; label?: string; plainMeaning?: string; lifeSceneHint?: string };
  strengthImpact?: { natalStrength?: string; yearlyEffect?: string; plainMeaning?: string };
  currentDaewoonPillar?: string;
}

interface Props {
  preview: YearlyPreviewData | null;
  loading: boolean;
  userName: string;
  lang: 'ko' | 'en';
  starBalance: number;
  cost: number;
  onUnlock: () => void;
  onCharge: () => void;
}

function lockedSections(lang: 'ko' | 'en') {
  const ko = lang !== 'en';
  return [
    { icon: '🌙', title: ko ? '올해 운이 움직이는 방식' : 'How the year moves', teaser: ko ? '올해 운이 어떤 원리로 들어오는지.' : 'The mechanism of your year.' },
    { icon: '📅', title: ko ? '남은 올해 월별 흐름' : 'Month-by-month', teaser: ko ? '남은 달마다 달라지는 결과 타이밍.' : 'How each remaining month shifts.' },
    { icon: '🔀', title: ko ? '일·돈·관계·리듬의 변화' : 'Work·money·love·rhythm', teaser: ko ? '영역마다 올해 들어오는 변화.' : "This year's changes by area." },
    { icon: '🧭', title: ko ? '올해의 선택 가이드' : "This year's choices", teaser: ko ? '무엇을 잡고 무엇을 놓을지.' : 'What to grab, what to let go.' },
    { icon: '🌠', title: ko ? '이후 2년 큰 흐름' : 'Next 2 years', teaser: ko ? '올해가 내년·후년으로 어떻게 이어지는지.' : 'How this year carries forward.' },
    { icon: '⭐', title: ko ? '사주가 말하는 올해의 큰 운' : 'Your big fortune', teaser: ko ? '올해를 관통하는 한마디.' : 'The headline of your year.' },
  ];
}

export default function YearlyPreviewTeaser({
  preview, loading, userName, lang, starBalance, cost, onUnlock, onCharge,
}: Props) {
  const ko = lang !== 'en';

  const ctaCard = (
    <div className="card" style={{
      marginTop: 14, textAlign: 'center', padding: '30px 22px',
      background: 'linear-gradient(180deg, rgba(243,160,146,0.10), rgba(243,160,146,0.04))',
      border: '1px solid var(--orot-coral-faint)', borderRadius: 'var(--orot-r-lg)',
    }}>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--orot-ink)', lineHeight: 1.7, marginBottom: 18, fontFamily: 'var(--orot-font)', whiteSpace: 'pre-line' }}>
        {ko ? '2026년 전체 흐름을\n지금 바로 확인해요' : 'See your full 2026\nright now'}
      </div>
      <div style={{ marginBottom: 18 }}>
        <span style={{ fontSize: 29, fontWeight: 700, color: 'var(--orot-coral)', fontFamily: 'var(--orot-font)' }}>⭐ {cost} {ko ? '별빛' : 'Stars'}</span>
        <div style={{ fontSize: 13, color: 'var(--orot-ink-mute)', marginTop: 6, fontFamily: 'var(--orot-font)' }}>
          {ko ? '보유 별빛: ' : 'Your balance: '}⭐ {starBalance}{ko ? '개' : ''}
        </div>
      </div>
      {starBalance >= cost ? (
        <button className="paywall-cta" style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16 }} onClick={onUnlock}>
          {ko ? `별빛 ${cost}개로 전체 열기 ⭐` : `Unlock with ${cost} Stars ⭐`}
        </button>
      ) : (
        <button className="paywall-cta" style={{ display: 'block', width: '100%', textAlign: 'center', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 16, background: 'linear-gradient(135deg, #F59E0B, #EF4444)' }} onClick={onCharge}>
          {ko ? '별빛이 부족해요! 충전하러 가기 ⭐' : 'Not enough stars! Go charge ⭐'}
        </button>
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="card" style={{ marginTop: 16, textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 28, marginBottom: 10 }}>✦</div>
        <div style={{ fontSize: 14, color: 'var(--orot-ink-mute)', fontFamily: 'var(--orot-font)' }}>
          {ko ? '올해 운의 흐름을 짚어보는 중…' : 'Mapping your year…'}
        </div>
      </div>
    );
  }
  if (!preview?.yearElementEffect) {
    return <div style={{ marginTop: 16 }}>{ctaCard}</div>;
  }

  const ganji = preview.targetYearGanji?.display ?? '';
  const yr = preview.targetYear ?? 2026;
  const yee = preview.yearElementEffect ?? {};
  const si = preview.strengthImpact ?? {};
  const tenGod = preview.yearTenGod?.stemTenGod ?? '';
  const rel = yee.relationToUsefulGod;

  const hook = rel === 'useful'
    ? (ko ? '올해는 나를 받쳐주는 해예요' : 'A year that supports you')
    : rel === 'unfavorable'
      ? (ko ? '올해는 나를 단련시키는 해예요' : 'A year that tests you')
      : (ko ? '2026, 흐름이 바뀌는 해' : '2026, a year of change');

  const energyVal = yee.element
    ? `${yee.element}${ko ? ' 기운' : ''} · ${rel === 'useful' ? (ko ? '용신 결' : 'useful') : rel === 'unfavorable' ? (ko ? '기신 결' : 'caution') : (ko ? '중립' : 'neutral')}`
    : (yee.label ?? '—');

  const facts: { label: string; value: string }[] = [];
  if (ganji) facts.push({ label: ko ? `${yr} 세운` : `${yr}`, value: `${ganji}${ko ? '년' : ''}` });
  if (tenGod) facts.push({ label: ko ? '올해 십성' : 'Year ten-god', value: tenGod });
  facts.push({ label: ko ? '올해 기운' : "Year's energy", value: energyVal });
  if (preview.currentDaewoonPillar) facts.push({ label: ko ? '현재 대운' : 'Current luck cycle', value: preview.currentDaewoonPillar });

  const tasteBody = [yee.plainMeaning, si.plainMeaning].filter(Boolean).join(' ');
  const locked = lockedSections(lang);

  return (
    <div className="sv4" style={{ marginTop: 4 }}>
      {/* HOOK 히어로 — 올해의 결 */}
      <section className="sv4-hero sv4-reveal">
        <div className="sv4-hero-glow" aria-hidden />
        <div className="sv4-hero-inner">
          <div className="sv4-hero-eyebrow">
            <span aria-hidden>✦</span>
            <span>{ko ? `${yr} 나의 한 해 · 미리보기` : `My ${yr} · Preview`}</span>
          </div>
          <h1 className="sv4-hero-title">{hook}</h1>
          <p className="sv4-hero-desc">
            {(userName ? `${userName} · ` : '') + `${yr} ${ganji}${ko ? '년' : ''}`}
          </p>
        </div>
      </section>

      {/* 사실 공개 — "진짜 내 사주다" 증명 */}
      <div className="card" style={{ marginTop: 14, padding: '18px 16px' }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--orot-coral)', marginBottom: 12, fontFamily: 'var(--orot-font)' }}>
          {ko ? '✓ 올해 운, 이미 분석을 마쳤어요' : '✓ Your year is already analyzed'}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {facts.map((f, i) => (
            <div key={i} style={{ borderRadius: 12, border: '1px solid var(--orot-hair)', background: 'rgba(255,255,255,0.02)', padding: '12px 14px' }}>
              <div style={{ fontSize: 11.5, color: 'var(--orot-ink-mute)', marginBottom: 4, fontFamily: 'var(--orot-font)' }}>{f.label}</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--orot-ink)', fontFamily: 'var(--orot-font)', wordBreak: 'keep-all' }}>{f.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 무료 맛보기 — 올해 핵심 흐름 (결정론) */}
      {tasteBody && (
        <div className="card" style={{ marginTop: 12, padding: '18px 16px', background: 'linear-gradient(180deg, rgba(243,160,146,0.07), rgba(243,160,146,0.02))', border: '1px solid var(--orot-coral-faint)' }}>
          <div className="orot-eyebrow" style={{ marginBottom: 8, color: 'var(--orot-coral)' }}>
            {ko ? '무료 맛보기' : 'Free taste'}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--orot-ink)', marginBottom: 8, fontFamily: 'var(--orot-font)' }}>
            {ko ? '올해의 핵심 흐름' : "Your year's core flow"}
          </div>
          <p style={{ fontSize: 15, lineHeight: 1.85, color: 'var(--orot-ink)', margin: 0, fontFamily: 'var(--orot-font)', wordBreak: 'keep-all' }}>
            {tasteBody}
          </p>
        </div>
      )}

      {/* 잠긴 섹션 — 호기심 티저 */}
      <div className="section-divider">{ko ? '별빛으로 열면 이어서 볼 내용' : 'Unlock to continue'}</div>
      <div className="card" style={{ padding: '8px 14px' }}>
        {locked.map((s, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'flex-start', gap: 11, padding: '13px 2px',
            borderBottom: i < locked.length - 1 ? '1px solid var(--orot-hair)' : 'none',
          }}>
            <span style={{ fontSize: 19, flexShrink: 0, marginTop: 1, opacity: 0.85 }}>{s.icon}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5, fontWeight: 700, color: 'var(--orot-ink)', fontFamily: 'var(--orot-font)' }}>{s.title}</div>
              <div style={{ fontSize: 13, color: 'var(--orot-ink-mute)', lineHeight: 1.55, marginTop: 3, fontFamily: 'var(--orot-font)', wordBreak: 'keep-all' }}>{s.teaser}</div>
            </div>
            <span style={{ fontSize: 15, flexShrink: 0, marginTop: 2, opacity: 0.5 }}>🔒</span>
          </div>
        ))}
      </div>

      {/* 별빛 CTA */}
      {ctaCard}
    </div>
  );
}
