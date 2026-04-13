'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[error.tsx]', error);
  }, [error]);

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(170deg, #0A0E2A 0%, #141850 40%, #0D1235 70%, #080B20 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        fontFamily: "'Gowun Dodum', 'Noto Sans KR', sans-serif",
        color: '#F5F0E8',
        textAlign: 'center',
      }}
    >
      <div style={{ fontSize: '3.5rem', marginBottom: '20px' }}>🌌</div>

      <h1
        style={{
          fontSize: '1.6rem',
          fontWeight: 800,
          color: '#F0C75E',
          marginBottom: '12px',
          letterSpacing: '-0.02em',
        }}
      >
        별빛이 잠시 끊겼어
      </h1>

      <p
        style={{
          fontSize: '1rem',
          color: 'rgba(245,240,232,0.6)',
          marginBottom: '8px',
          lineHeight: 1.6,
        }}
      >
        우주의 흐름이 잠깐 멈춘 것 같아.
      </p>
      <p
        style={{
          fontSize: '0.85rem',
          color: 'rgba(245,240,232,0.35)',
          marginBottom: '40px',
        }}
      >
        The stars lost their way for a moment.
      </p>

      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
        <button
          onClick={() => reset()}
          style={{
            padding: '13px 32px',
            background: 'linear-gradient(135deg, #F0C75E, #FFD080)',
            color: '#0A0E2A',
            border: 'none',
            borderRadius: '24px',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: "'Gowun Dodum', 'Noto Sans KR', sans-serif",
          }}
        >
          다시 시도
        </button>

        <a
          href="/"
          style={{
            padding: '13px 32px',
            background: 'rgba(240,199,94,0.12)',
            color: '#F0C75E',
            border: '1px solid rgba(240,199,94,0.3)',
            borderRadius: '24px',
            fontSize: '1rem',
            fontWeight: 600,
            cursor: 'pointer',
            textDecoration: 'none',
            fontFamily: "'Gowun Dodum', 'Noto Sans KR', sans-serif",
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          홈으로
        </a>
      </div>
    </div>
  );
}
