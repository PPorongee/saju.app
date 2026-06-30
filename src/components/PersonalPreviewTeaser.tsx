'use client';

// 개인사주 결제 전 "미리보기(teaser)" — 호기심 자극형. (궁합 CompatPreviewTeaser와 동일 패턴)
//
// 설계(2026-06, 사용자 확정):
//   - 결제 전 GPT 호출 없음. /api/saju-v4/preview 결정론 결과(v4Resp에 이미 채워짐)만 사용.
//   - 후킹(나를 한마디로 = identityKeyword) → 실제 사실 공개(사주 원국·일간·신강신약·강한오행·용신)
//     → 첫 섹션 1개 풀 맛보기(identityKeywords 2~3개) → 나머지 결과 섹션은 호기심 티저+잠금 → 별빛 CTA.
//   - 결과(SajuV4Report)와 같은 sv4 톤. 숫자 점수·운명론 없음.

import React from 'react';
import { type Element } from '@/domain/saju/rules/elements';

interface IdentityKeyword {
  keyword: string;
  shortDescription?: string;
  displayPriority?: number;
}
export interface PersonalPreviewData {
  birthChart?: { year?: string; month?: string; day?: string; hour?: string; dayMaster?: string; isHourEstimated?: boolean };
  coreAnalysis?: {
    dayMasterStrength?: { level?: string };
    elementStrength?: { strongest?: Element[] };
    tenGods?: { strongest?: string[] };
    usefulGod?: { primaryUseful?: { type?: string; value?: string } };
  };
  identityKeywords?: IdentityKeyword[];
}

interface Props {
  preview: PersonalPreviewData | null;
  loading: boolean;
  userName: string;
  birthLine?: string;
  lang: 'ko' | 'en';
  starBalance: number;
  cost: number;
  onUnlock: () => void;
  onCharge: () => void;
}

// 결제하면 이어서 볼 섹션 — 결과(SajuV4Report) 구성과 1:1. 호기심 티저.
function lockedSections(lang: 'ko' | 'en') {
  const ko = lang !== 'en';
  return [
    { icon: '🗺', title: ko ? '내 삶의 구조' : 'Life structure', teaser: ko ? '내 사주가 어떤 판으로 짜여 있는지 한눈에.' : 'How your chart is laid out.' },
    { icon: '🔁', title: ko ? '반복되는 삶의 패턴' : 'Repeating pattern', teaser: ko ? '인생에서 자꾸 되풀이되는 장면과 이유.' : 'The scene that keeps recurring, and why.' },
    { icon: '💼', title: ko ? '직업과 재능' : 'Career & talent', teaser: ko ? '타고난 강점을 어디서 가장 잘 쓰는지.' : 'Where your strengths shine.' },
    { icon: '💰', title: ko ? '돈과 수익화' : 'Money', teaser: ko ? '내 사주가 돈을 버는 방식과 시기.' : 'How and when you make money.' },
    { icon: '💕', title: ko ? '연애와 관계' : 'Love & relationships', teaser: ko ? '끌리는 사람, 관계에서 반복되는 결.' : 'Who you attract, and your patterns.' },
    { icon: '🌠', title: ko ? '앞으로의 흐름' : 'The flow ahead', teaser: ko ? '다가오는 시기의 운의 결.' : 'The shape of the years ahead.' },
    { icon: '⭐', title: ko ? '마지막으로 드리는 전략' : 'Final strategy', teaser: ko ? '당신을 위한 핵심 한마디.' : 'One key word for you.' },
  ];
}

export default function PersonalPreviewTeaser({
  preview, loading, userName, birthLine, lang, starBalance, cost, onUnlock, onCharge,
}: Props) {
  const ko = lang !== 'en';

  const ctaCard = (
    <div className="card" style={{
      marginTop: 14, textAlign: 'center', padding: '30px 22px',
      background: 'linear-gradient(180deg, rgba(243,160,146,0.10), rgba(243,160,146,0.04))',
      border: '1px solid var(--orot-coral-faint)', borderRadius: 'var(--orot-r-lg)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--orot-ink-mute)', marginBottom: 12, fontFamily: 'var(--orot-font)' }}>
        <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{ko ? '전문가 대면 상담 ₩50,000+' : 'In-person reading ₩50,000+'}</span>
        {' → '}{ko ? 'AI 사주 해석' : 'AI Saju reading'}
      </div>
      <div style={{ fontSize: 15.5, fontWeight: 700, color: 'var(--orot-ink)', lineHeight: 1.7, marginBottom: 18, fontFamily: 'var(--orot-font)', whiteSpace: 'pre-line' }}>
        {ko ? '내 사주의 전체 해석을\n지금 바로 확인해요' : 'See your full reading\nright now'}
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
          {ko ? '사주를 풀어보는 중…' : 'Reading your chart…'}
        </div>
      </div>
    );
  }
  if (!preview?.coreAnalysis) {
    return <div style={{ marginTop: 16 }}>{ctaCard}</div>;
  }

  const bc = preview.birthChart ?? {};
  const pillars = [bc.year, bc.month, bc.day, bc.hour].filter(Boolean) as string[];
  const kws = [...(preview.identityKeywords ?? [])].sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0));
  const hookKw = kws[0];
  const tasteKws = kws.slice(0, 3);

  const locked = lockedSections(lang);

  return (
    <div className="sv4" style={{ marginTop: 4 }}>
      {/* HOOK 히어로 — 나를 한마디로 (결정론 identityKeyword) */}
      <section className="sv4-hero sv4-reveal">
        <div className="sv4-hero-glow" aria-hidden />
        <div className="sv4-hero-inner">
          {hookKw?.keyword && <h1 className="sv4-hero-title">{hookKw.keyword}</h1>}
          <p className="sv4-hero-desc">
            {(userName ? `${userName} · ` : '') + (pillars.length ? pillars.join(' · ') : (birthLine ?? ''))}
          </p>
        </div>
      </section>

      {/* 무료 맛보기 — 당신을 한마디로 (결정론 identityKeyword). 일간·신강신약·강한오행·용신 사실 카드는 미노출. */}
      {tasteKws.length > 0 && (
        <div className="card" style={{ marginTop: 14, padding: '18px 16px', background: 'linear-gradient(180deg, rgba(243,160,146,0.07), rgba(243,160,146,0.02))', border: '1px solid var(--orot-coral-faint)' }}>
          <div className="orot-eyebrow" style={{ marginBottom: 10, color: 'var(--orot-coral)' }}>
            {ko ? '무료 맛보기 · 당신을 한마디로' : 'Free taste · You in a word'}
          </div>
          {tasteKws.map((k, i) => (
            <div key={i} style={{ padding: '9px 0', borderTop: i > 0 ? '1px solid var(--orot-hair)' : 'none' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--orot-ink)', fontFamily: 'var(--orot-font)' }}>“{k.keyword}”</div>
              {k.shortDescription && (
                <div style={{ fontSize: 13, color: 'var(--orot-ink-soft)', lineHeight: 1.6, marginTop: 3, fontFamily: 'var(--orot-font)', wordBreak: 'keep-all' }}>{k.shortDescription}</div>
              )}
            </div>
          ))}
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
