'use client';

import { useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';

function ShareContent() {
  const params = useSearchParams();
  const code = params.get('code') || '';
  const [title, setTitle] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!code) { setLoading(false); return; }
    try {
      const raw = localStorage.getItem('saju-share-' + code);
      if (raw) {
        const data = JSON.parse(raw);
        setTitle(data.title || '사주 결과');
        setResult(data.text || '');
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [code]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0A0E2A', color: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p>로딩 중...</p>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg, #0A0E2A 0%, #141850 40%, #0D1235 70%, #080B20 100%)', color: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔮</div>
          <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '12px' }}>결과를 찾을 수 없어요</h1>
          <p style={{ fontSize: '14px', opacity: 0.6, marginBottom: '8px' }}>이 링크는 결과를 저장한 기기에서만 열 수 있어요.</p>
          <p style={{ fontSize: '13px', opacity: 0.4, marginBottom: '24px' }}>다른 기기에서 보려면 결과 화면에서 직접 확인해주세요.</p>
          <a href="/" style={{ color: '#F0C75E', textDecoration: 'none', fontSize: '15px', fontWeight: 700 }}>별빛 사주 홈으로 →</a>
        </div>
      </div>
    );
  }

  const formatted = result
    .replace(/##(\d+)\.(.*?)##/g, '<h3 style="color:#F0C75E;margin:24px 0 8px;font-size:18px">$1. $2</h3>')
    .replace(/\[([^\]]+)\]/g, '<strong style="color:#F0C75E">$1</strong>')
    .replace(/\n/g, '<br/>');

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(170deg, #0A0E2A 0%, #141850 40%, #0D1235 70%, #080B20 100%)', color: '#F5F0E8', padding: '20px 16px 60px' }}>
      <div style={{ maxWidth: '640px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px', paddingTop: '20px' }}>
          <div style={{ fontSize: '36px', marginBottom: '8px' }}>🔮</div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, color: '#F0C75E', marginBottom: '4px' }}>{title}</h1>
          <p style={{ fontSize: '12px', opacity: 0.4 }}>별빛 사주 | Starlight Saju</p>
        </div>
        <div style={{
          background: 'rgba(14,18,50,0.88)', borderRadius: '16px', padding: '24px 20px',
          border: '1px solid rgba(240,199,94,0.08)', fontSize: '15px', lineHeight: 1.8,
          color: 'rgba(245,240,232,0.85)'
        }} dangerouslySetInnerHTML={{ __html: formatted }} />
        <div style={{ textAlign: 'center', marginTop: '32px' }}>
          <a href="/" style={{
            display: 'inline-block', padding: '14px 32px', borderRadius: '50px',
            background: 'linear-gradient(135deg, #F0C75E, #E8B030)', color: '#0A0E2A',
            fontSize: '15px', fontWeight: 800, textDecoration: 'none'
          }}>나도 사주 보러가기 ✨</a>
        </div>
      </div>
    </div>
  );
}

export default function SharePage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0A0E2A', color: '#F5F0E8', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>로딩 중...</div>}>
      <ShareContent />
    </Suspense>
  );
}
