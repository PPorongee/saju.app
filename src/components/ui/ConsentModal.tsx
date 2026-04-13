import React from 'react';
import type { Lang } from '@/lib/i18n';

interface ConsentModalProps {
  lang: Lang;
  onAccept: () => void;
  onDecline: () => void;
}

/**
 * Privacy/storage consent overlay shown on first visit.
 * Rendered only after hydration when no prior consent is stored.
 * All state is owned by the parent (SajuApp); this component is purely presentational.
 */
export default function ConsentModal({ lang, onAccept, onDecline }: ConsentModalProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99999,
      background: 'rgba(10,14,42,0.95)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: 'rgba(20,24,80,0.95)', borderRadius: '20px',
        border: '1px solid rgba(240,199,94,0.3)', padding: '32px 24px',
        maxWidth: '360px', width: '100%', textAlign: 'center',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔮</div>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#F0C75E', marginBottom: '12px' }}>
          {lang === 'en' ? 'Welcome to Starlight Saju!' : '별빛 사주에 오신 것을 환영합니다!'}
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--text-dim)', lineHeight: 1.7, marginBottom: '16px' }}>
          {lang === 'en'
            ? 'To generate your personalized reading, your name, birth date, gender, and selected concerns are processed by AI (OpenAI, USA). Payment is handled by Toss Payments. Results are stored on our server for retrieval. See our Privacy Policy for details.'
            : '맞춤형 사주 해석을 위해 이름, 생년월일, 성별, 선택한 고민 항목이 AI(미국 OpenAI)로 전송되어 처리됩니다. 결제는 토스페이먼츠가 처리합니다. 결과는 재열람을 위해 서버에 저장됩니다.'}
        </p>
        <p style={{ fontSize: '11px', color: 'rgba(245,240,232,0.4)', lineHeight: 1.5, marginBottom: '20px' }}>
          {lang === 'en'
            ? 'We use local storage to remember your preferences. You can delete your data anytime.'
            : '환경설정 저장을 위해 로컬 저장소를 사용합니다. 데이터는 언제든 삭제할 수 있습니다.'}
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button type="button" style={{
            padding: '14px 36px', borderRadius: '50px', border: 'none',
            background: 'linear-gradient(135deg, #F0C75E, #E8B030)', color: '#0A0E2A',
            fontSize: '16px', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit',
            minHeight: '48px', touchAction: 'manipulation',
          }} onClick={onAccept}>
            {lang === 'en' ? 'Accept' : '동의'}
          </button>
          <button type="button" style={{
            padding: '14px 36px', borderRadius: '50px',
            border: '1px solid rgba(255,255,255,0.3)', background: 'transparent',
            color: 'var(--text-dim)', fontSize: '16px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            minHeight: '48px', touchAction: 'manipulation',
          }} onClick={onDecline}>
            {lang === 'en' ? 'Decline' : '거절'}
          </button>
        </div>
      </div>
    </div>
  );
}
