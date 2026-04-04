'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BUSINESS_INFO } from '@/lib/payment-config';

function PaymentFailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const code = searchParams.get('code') || '';
  const message = searchParams.get('message') || '결제에 실패했습니다.';
  const orderId = searchParams.get('orderId') || '';

  return (
    <div className="payment-result screen-enter">
      <div className="payment-result-icon">❌</div>
      <h1>결제 실패</h1>
      <p>{message}</p>

      {(code || orderId) && (
        <div className="payment-result-summary" style={{ marginBottom: 24 }}>
          {code && (
            <div className="payment-info-row">
              <span className="payment-info-label">오류 코드</span>
              <span className="payment-info-value" style={{ fontSize: 12, color: '#FC8181' }}>
                {code}
              </span>
            </div>
          )}
          {orderId && (
            <div className="payment-info-row">
              <span className="payment-info-label">주문번호</span>
              <span className="payment-info-value" style={{ fontSize: 12, wordBreak: 'break-all' }}>
                {orderId}
              </span>
            </div>
          )}
        </div>
      )}

      <button
        className="btn btn-primary btn-full"
        onClick={() => router.push('/payment')}
        style={{ maxWidth: 320, marginBottom: 12 }}
      >
        다시 시도하기
      </button>

      <button
        onClick={() => router.push('/')}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(245,240,232,0.4)',
          fontSize: 13,
          cursor: 'pointer',
          padding: '8px',
          marginBottom: 32,
        }}
      >
        홈으로 돌아가기
      </button>

      <div style={{
        fontSize: 12,
        color: 'rgba(245,240,232,0.35)',
        textAlign: 'center',
        lineHeight: 1.8,
        borderTop: '1px solid rgba(255,255,255,0.06)',
        paddingTop: 20,
        width: '100%',
      }}>
        <div>결제 문의: {BUSINESS_INFO.phone}</div>
        <div>{BUSINESS_INFO.email}</div>
      </div>
    </div>
  );
}

export default function PaymentFailPage() {
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <Suspense fallback={
        <div className="payment-result">
          <h1 style={{ color: 'var(--text)' }}>로딩 중...</h1>
        </div>
      }>
        <PaymentFailContent />
      </Suspense>
    </div>
  );
}
