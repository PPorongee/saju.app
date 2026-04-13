'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[global-error.tsx]', error);
  }, [error]);

  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>오류 | 별빛 사주</title>
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          minHeight: '100vh',
          background: '#0A0E2A',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
          color: '#F5F0E8',
          textAlign: 'center',
        }}
      >
        <div style={{ padding: '40px 20px' }}>
          <div style={{ fontSize: '3rem', marginBottom: '16px' }}>🌌</div>

          <h1
            style={{
              fontSize: '1.4rem',
              fontWeight: 700,
              color: '#F0C75E',
              marginBottom: '12px',
            }}
          >
            별빛 사주에 오류가 발생했어
          </h1>

          <p
            style={{
              fontSize: '0.9rem',
              color: 'rgba(245,240,232,0.5)',
              marginBottom: '32px',
            }}
          >
            An unexpected error occurred. / 잠시 후 다시 시도해줘.
          </p>

          <button
            onClick={() => reset()}
            style={{
              padding: '12px 32px',
              background: '#F0C75E',
              color: '#0A0E2A',
              border: 'none',
              borderRadius: '24px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            다시 시도
          </button>
        </div>
      </body>
    </html>
  );
}
