// 별빛 사주 — StarShareCard (2026-05).
// SNS 공유용 카드 컴포넌트. HTML/CSS 기반, html2canvas로 PNG 다운로드 가능.
// 디자인: 미니멀 딥네이비/인디고 + 1개 포인트 컬러. 텍스트 가독성 최우선.

'use client';

import { useRef, useState } from 'react';

export interface StarShareCardProps {
  serviceName: string;
  label: string;
  titleLead: string;
  archetypeTitle: string;
  shortDescription: string;
  brightSide: string;
  shadowSide: string;
  keywords: string[];
  hashtag?: string;
  theme?: 'midnight' | 'starlight';
  ratio?: 'feed' | 'story'; // feed=4:5(1080x1350), story=9:16(1080x1920)
}

const THEMES = {
  midnight: {
    bg: 'radial-gradient(circle at top, rgba(255,255,255,0.08), transparent 35%), linear-gradient(180deg, #0B1020 0%, #171C35 100%)',
    textPrimary: '#F8FAFC',
    textSecondary: '#CBD5E1',
    accent: '#F6D58A',
    border: 'rgba(255,255,255,0.16)',
    eyebrow: '#C4B5FD',
  },
  starlight: {
    bg: 'radial-gradient(circle at top, rgba(255,255,255,0.14), transparent 38%), linear-gradient(180deg, #1E1B4B 0%, #312E81 100%)',
    textPrimary: '#FAF6E9',
    textSecondary: '#D8D2C2',
    accent: '#C4B5FD',
    border: 'rgba(255,255,255,0.22)',
    eyebrow: '#F6D58A',
  },
} as const;

const RATIOS = {
  feed: { w: 1080, h: 1350 },
  story: { w: 1080, h: 1920 },
} as const;

export function StarShareCard(props: StarShareCardProps) {
  const theme = THEMES[props.theme ?? 'midnight'];
  const ratio = RATIOS[props.ratio ?? 'feed'];
  // 화면 미리보기는 width 100% (max 360), aspect-ratio로 유지
  return (
    <div
      data-star-share-card
      style={{
        width: '100%',
        maxWidth: 360,
        aspectRatio: `${ratio.w} / ${ratio.h}`,
        margin: '0 auto',
        background: theme.bg,
        borderRadius: 28,
        border: `1px solid ${theme.border}`,
        boxShadow: '0 20px 60px rgba(0,0,0,0.35)',
        padding: '28px 24px',
        display: 'flex',
        flexDirection: 'column',
        color: theme.textPrimary,
        fontFamily: 'var(--orot-font, system-ui), -apple-system, Segoe UI, Roboto, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* 상단 — 서비스명 + 라벨 */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
        <div style={{ fontSize: 12, letterSpacing: '0.12em', color: theme.textSecondary, fontWeight: 600 }}>
          ✦ {props.serviceName}
        </div>
        <div style={{ fontSize: 11, letterSpacing: '0.18em', color: theme.eyebrow, fontWeight: 700, textTransform: 'uppercase' }}>
          {props.label}
        </div>
      </div>

      {/* 중앙 — 타이틀 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '12px 4px' }}>
        <div style={{ fontSize: 14, color: theme.textSecondary, marginBottom: 12, fontWeight: 500 }}>
          {props.titleLead}
        </div>
        <h1 style={{
          fontSize: 24, fontWeight: 800, color: theme.accent,
          margin: '0 0 16px', letterSpacing: '-0.02em', lineHeight: 1.3,
          wordBreak: 'keep-all',
        }}>
          {props.archetypeTitle}
        </h1>
        <p style={{
          fontSize: 13, color: theme.textPrimary, opacity: 0.92,
          margin: 0, lineHeight: 1.65, fontWeight: 400,
          maxWidth: '92%', wordBreak: 'keep-all',
          display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>
          {props.shortDescription}
        </p>
      </div>

      {/* bright / shadow */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 10 }}>
          <div style={{ fontSize: 11, color: theme.eyebrow, fontWeight: 700, marginBottom: 4, letterSpacing: '0.05em' }}>
            ✦ 이 별이 빛나는 순간
          </div>
          <div style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 1.55, wordBreak: 'keep-all', opacity: 0.95 }}>
            {props.brightSide}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 11, color: theme.textSecondary, fontWeight: 700, marginBottom: 4, letterSpacing: '0.05em' }}>
            ⌖ 이 별이 지치는 순간
          </div>
          <div style={{ fontSize: 12, color: theme.textPrimary, lineHeight: 1.55, wordBreak: 'keep-all', opacity: 0.85 }}>
            {props.shadowSide}
          </div>
        </div>
      </div>

      {/* keywords */}
      <div style={{ borderTop: `1px solid ${theme.border}`, paddingTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
        {props.keywords.map((kw, i) => (
          <span
            key={i}
            style={{
              fontSize: 11, fontWeight: 600, color: theme.textPrimary,
              padding: '4px 10px', borderRadius: 999,
              border: `1px solid ${theme.border}`,
              background: 'rgba(255,255,255,0.04)',
              wordBreak: 'keep-all',
            }}
          >{kw}</span>
        ))}
      </div>

      {/* hashtag */}
      <div style={{ textAlign: 'center', marginTop: 12, fontSize: 11, color: theme.textSecondary, fontWeight: 600, letterSpacing: '0.05em' }}>
        {props.hashtag ?? '#별빛사주'}
      </div>

      {/* 미니 별 장식 — 우상단 한 점만 */}
      <div aria-hidden style={{ position: 'absolute', top: 18, right: 22, width: 4, height: 4, borderRadius: 999, background: theme.accent, opacity: 0.7, boxShadow: `0 0 8px ${theme.accent}` }} />
    </div>
  );
}

// ============================================================
// 다운로드 버튼 (html2canvas로 PNG 저장)
// ============================================================
export function StarShareCardWithDownload(props: StarShareCardProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState(false);

  async function downloadPng() {
    if (!wrapperRef.current || busy) return;
    setBusy(true);
    try {
      // 동적 import — 클라이언트에서만 로드
      const html2canvas = (await import('html2canvas')).default;
      const target = wrapperRef.current.querySelector('[data-star-share-card]') as HTMLElement | null;
      if (!target) throw new Error('card root not found');
      const canvas = await html2canvas(target, {
        backgroundColor: null,
        scale: 3, // 1080px+ 해상도
        useCORS: true,
        logging: false,
      });
      const dataUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = 'byeolbit-saju-star-card.png';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (e) {
      console.error('[StarShareCard download]', e);
      alert('카드 저장에 실패했어. 다시 시도해줘.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div ref={wrapperRef} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <StarShareCard {...props} />
      <button
        type="button"
        onClick={downloadPng}
        disabled={busy}
        className="orot-btn orot-btn--ghost"
        style={{
          padding: '10px 22px',
          borderRadius: 999,
          fontSize: 13, fontWeight: 700,
          cursor: busy ? 'wait' : 'pointer',
          opacity: busy ? 0.6 : 1,
        }}
      >
        {busy ? '저장 중…' : '내 별 카드 저장하기'}
      </button>
    </div>
  );
}
