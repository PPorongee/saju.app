'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { formatLLMText } from '@/lib/format-llm';

function ShareContent() {
  const params = useSearchParams();
  const code = params.get('code') || '';
  const [title, setTitle] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);

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
          <p style={{ fontSize: '13px', opacity: 0.4, marginBottom: '24px', color: 'var(--text)' }}>다시 공유 링크를 생성해주세요.</p>
          <a href="/" style={{ color: '#F0C75E', textDecoration: 'none', fontSize: '15px', fontWeight: 700 }}>별빛 사주 홈으로 →</a>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ minHeight: '100vh', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', paddingTop: '20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔮</div>
          <h1 className="gradient-text" style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{title}</h1>
          <p style={{ fontSize: '12px', opacity: 0.4, color: 'var(--text)' }}>별빛 사주 | Starlight Saju</p>
        </div>
        <div className="card" style={{ padding: '24px 16px' }}>
          <div className="llm-text" dangerouslySetInnerHTML={{ __html: formatLLMText(result) }} />
        </div>
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a href="/" className="btn" style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: '50px',
            background: 'linear-gradient(135deg, #F0C75E, #E8B030)', color: '#0A0E2A',
            fontSize: '15px', fontWeight: 800, textDecoration: 'none', border: 'none'
          }}>나도 사주 보러가기 ✨</a>
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
