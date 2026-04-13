'use client';

import React, { useState } from 'react';

interface Reading {
  id: number;
  readingCode: string;
  orderId: string | null;
  type: string;
  inputData: unknown;
  chartData: unknown;
  resultText: string | null;
  lang: string | null;
  createdAt: string;
}

type Lang = 'ko' | 'en';

const T: Record<string, Record<Lang, string>> = {
  pageTitle: { ko: '내 사주 결과 보기', en: 'View My Reading' },
  pageDesc: { ko: '결제 시 받은 코드를 입력하세요', en: 'Enter the code you received at payment' },
  codePlaceholder: { ko: 'SAJU-2026-XXXXXX', en: 'SAJU-2026-XXXXXX' },
  codeLabel: { ko: '읽기 코드', en: 'Reading Code' },
  lookup: { ko: '조회하기', en: 'Look up' },
  notFound: { ko: '코드를 찾을 수 없습니다', en: 'Code not found' },
  notFoundDesc: { ko: '입력하신 코드가 올바른지 확인해주세요.', en: 'Please check that the code you entered is correct.' },
  loading: { ko: '조회 중...', en: 'Looking up...' },
  readingTitle: { ko: '사주 분석 결과', en: 'Saju Reading Result' },
  goHome: { ko: '홈으로', en: 'Home' },
  typeLabel: { ko: '읽기 유형', en: 'Reading type' },
  dateLabel: { ko: '생성일', en: 'Generated' },
};

function formatResultText(text: string): React.ReactElement[] {
  return text.split('\n').map((line, i) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} style={{
          fontSize: 20,
          fontWeight: 800,
          color: 'var(--primary)',
          margin: '24px 0 10px',
          fontFamily: "'Gamja Flower', 'Gowun Dodum', cursive",
        }}>
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith('# ')) {
      return (
        <h1 key={i} style={{
          fontSize: 26,
          fontWeight: 900,
          color: 'var(--primary)',
          margin: '28px 0 14px',
          fontFamily: "'Gamja Flower', 'Gowun Dodum', cursive",
        }}>
          {trimmed.slice(2)}
        </h1>
      );
    }
    if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
      return (
        <p key={i} style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          {trimmed.slice(2, -2)}
        </p>
      );
    }
    if (trimmed === '') {
      return <div key={i} style={{ height: 8 }} />;
    }
    return (
      <p key={i} style={{ color: 'rgba(245,240,232,0.85)', lineHeight: 1.75, marginBottom: 4 }}>
        {line}
      </p>
    );
  });
}

export default function ReadingsPage() {
  const [lang] = useState<Lang>('ko');
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'found' | 'not_found' | 'error'>('idle');
  const [reading, setReading] = useState<Reading | null>(null);

  const t = (key: string) => T[key]?.[lang] ?? key;

  const handleLookup = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setStatus('loading');
    try {
      const res = await fetch(`/api/readings?code=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      if (data.success && data.reading) {
        setReading(data.reading);
        setStatus('found');
      } else {
        setStatus('not_found');
      }
    } catch {
      setStatus('error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleLookup();
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, minHeight: '100vh' }}>
      <div className="app-container">
        <div className="inner">

          {/* Header */}
          <div style={{ textAlign: 'center', padding: '40px 0 32px' }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🔮</div>
            <h1 className="gradient-text" style={{ fontSize: 32, marginBottom: 10 }}>
              {t('pageTitle')}
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-dim)' }}>
              {t('pageDesc')}
            </p>
          </div>

          {/* Lookup form */}
          {(status === 'idle' || status === 'not_found' || status === 'error') && (
            <div className="card card-glow screen-enter" style={{ marginBottom: 20 }}>
              <label style={{
                display: 'block',
                fontSize: 13,
                color: 'var(--text-dim)',
                marginBottom: 8,
                fontWeight: 600,
                letterSpacing: '0.05em',
              }}>
                {t('codeLabel')}
              </label>
              <input
                type="text"
                value={code}
                onChange={e => setCode(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('codePlaceholder')}
                maxLength={20}
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.06)',
                  border: '1.5px solid rgba(240,199,94,0.2)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  color: 'var(--text)',
                  fontSize: 18,
                  fontFamily: 'inherit',
                  letterSpacing: '0.08em',
                  outline: 'none',
                  marginBottom: 16,
                  transition: 'border-color 0.2s',
                }}
                onFocus={e => (e.target.style.borderColor = 'rgba(240,199,94,0.5)')}
                onBlur={e => (e.target.style.borderColor = 'rgba(240,199,94,0.2)')}
              />
              <button
                className="btn btn-primary btn-full"
                onClick={handleLookup}
                disabled={!code.trim()}
                style={{ opacity: code.trim() ? 1 : 0.5 }}
              >
                {t('lookup')}
              </button>

              {status === 'not_found' && (
                <div style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: 'rgba(255,107,107,0.08)',
                  border: '1px solid rgba(255,107,107,0.2)',
                  borderRadius: 12,
                  textAlign: 'center',
                }}>
                  <p style={{ color: '#FF6B6B', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>
                    {t('notFound')}
                  </p>
                  <p style={{ color: 'rgba(255,107,107,0.7)', fontSize: 13 }}>
                    {t('notFoundDesc')}
                  </p>
                </div>
              )}

              {status === 'error' && (
                <div style={{
                  marginTop: 16,
                  padding: '12px 16px',
                  background: 'rgba(255,107,107,0.08)',
                  border: '1px solid rgba(255,107,107,0.2)',
                  borderRadius: 12,
                  textAlign: 'center',
                }}>
                  <p style={{ color: '#FF6B6B', fontSize: 14 }}>서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.</p>
                </div>
              )}
            </div>
          )}

          {/* Loading */}
          {status === 'loading' && (
            <div className="card screen-enter" style={{ textAlign: 'center', padding: '48px 24px' }}>
              <div style={{
                display: 'inline-block',
                width: 40,
                height: 40,
                border: '3px solid rgba(240,199,94,0.15)',
                borderTopColor: 'var(--primary)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
                marginBottom: 16,
              }} />
              <p style={{ color: 'var(--text-dim)' }}>{t('loading')}</p>
            </div>
          )}

          {/* Result */}
          {status === 'found' && reading && (
            <div className="screen-enter">
              {/* Meta info */}
              <div className="card" style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('typeLabel')}</span>
                  <span style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--primary)',
                    background: 'rgba(240,199,94,0.1)',
                    padding: '3px 10px',
                    borderRadius: 20,
                    border: '1px solid rgba(240,199,94,0.2)',
                  }}>
                    {reading.type}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>코드</span>
                  <span style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--text)', letterSpacing: '0.05em' }}>
                    {reading.readingCode}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>{t('dateLabel')}</span>
                  <span style={{ fontSize: 13, color: 'var(--text-dim)' }}>
                    {new Date(reading.createdAt).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>

              {/* Reading text */}
              <div className="card card-glow" style={{ padding: '28px 24px' }}>
                <h2 style={{
                  fontSize: 20,
                  fontWeight: 900,
                  color: 'var(--primary)',
                  marginBottom: 20,
                  fontFamily: "'Gamja Flower', 'Gowun Dodum', cursive",
                }}>
                  {t('readingTitle')}
                </h2>
                <div>
                  {reading.resultText
                    ? formatResultText(reading.resultText)
                    : <p style={{ color: 'var(--text-dim)' }}>결과 텍스트가 없습니다.</p>
                  }
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1 }}
                  onClick={() => {
                    setStatus('idle');
                    setCode('');
                    setReading(null);
                  }}
                >
                  다른 코드 조회
                </button>
                <button
                  onClick={() => { window.location.href = '/'; }}
                  style={{
                    flex: 1,
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(240,199,94,0.15)',
                    borderRadius: 50,
                    color: 'var(--text-dim)',
                    fontSize: 15,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {t('goHome')}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
