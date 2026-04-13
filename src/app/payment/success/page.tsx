'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

interface ConfirmResult {
  success: boolean;
  orderId?: string;
  amount?: number;
  method?: string;
  approvedAt?: string;
  readingCode?: string;
  error?: string;
  warning?: string;
}

function ReadingCodeBox({ readingCode }: { readingCode: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(readingCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: 320,
      background: 'rgba(240,199,94,0.08)',
      border: '1.5px solid rgba(240,199,94,0.3)',
      borderRadius: 16,
      padding: '16px 20px',
      marginBottom: 20,
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 13, color: 'rgba(245,240,232,0.5)', marginBottom: 6 }}>
        📋 읽기 코드
      </div>
      <div style={{
        fontSize: 20,
        fontWeight: 800,
        color: 'var(--primary)',
        letterSpacing: '0.08em',
        fontFamily: 'monospace',
        marginBottom: 8,
      }}>
        {readingCode}
      </div>
      <div style={{ fontSize: 12, color: 'rgba(245,240,232,0.45)', marginBottom: 12 }}>
        이 코드를 저장하세요. 나중에 결과를 다시 볼 수 있습니다.
      </div>
      <button
        onClick={handleCopy}
        style={{
          background: copied ? 'rgba(80,200,120,0.15)' : 'rgba(240,199,94,0.12)',
          border: `1px solid ${copied ? 'rgba(80,200,120,0.4)' : 'rgba(240,199,94,0.25)'}`,
          borderRadius: 20,
          color: copied ? '#50C878' : 'var(--primary)',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          padding: '6px 18px',
          fontFamily: 'inherit',
          transition: 'all 0.2s',
        }}
      >
        {copied ? '✓ 복사됨' : '코드 복사'}
      </button>
    </div>
  );
}

function PaymentSuccessContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [result, setResult] = useState<ConfirmResult | null>(null);

  const paymentKey = searchParams.get('paymentKey') || '';
  const orderId = searchParams.get('orderId') || '';
  const amount = Number(searchParams.get('amount') || '0');

  useEffect(() => {
    if (!paymentKey || !orderId || !amount) {
      setStatus('error');
      setResult({ success: false, error: '결제 정보가 올바르지 않습니다.' });
      return;
    }

    fetch('/api/payment/confirm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paymentKey, orderId, amount }),
    })
      .then(res => res.json())
      .then((data: ConfirmResult) => {
        if (data.success) {
          setResult(data);
          setStatus('success');
        } else {
          setResult(data);
          setStatus('error');
        }
      })
      .catch(() => {
        setResult({ success: false, error: '서버 오류가 발생했습니다.' });
        setStatus('error');
      });
  }, [paymentKey, orderId, amount]);

  if (status === 'loading') {
    return (
      <div className="payment-result screen-enter">
        <div style={{ fontSize: 48, marginBottom: 20 }}>
          <span style={{
            display: 'inline-block',
            width: 48,
            height: 48,
            border: '4px solid rgba(240,199,94,0.15)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
        <h1>결제 확인 중...</h1>
        <p>잠시만 기다려주세요.</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="payment-result screen-enter">
        <div className="payment-result-icon">❌</div>
        <h1>결제 확인 실패</h1>
        <p>{result?.error || '결제 확인 중 오류가 발생했습니다.'}</p>
        <button
          className="btn btn-primary btn-full"
          onClick={() => router.push('/payment')}
          style={{ maxWidth: 320 }}
        >
          다시 시도하기
        </button>
      </div>
    );
  }

  const amountFormatted = (result?.amount ?? amount).toLocaleString('ko-KR');
  const approvedAt = result?.approvedAt
    ? new Date(result.approvedAt).toLocaleString('ko-KR')
    : '';

  return (
    <div className="payment-result screen-enter">
      <div className="payment-result-icon">✅</div>
      <h1>결제 완료</h1>
      <p>결제가 성공적으로 완료되었습니다.<br />이제 사주 결과를 확인하실 수 있습니다.</p>

      <div className="payment-result-summary">
        <div className="payment-info-row">
          <span className="payment-info-label">주문번호</span>
          <span className="payment-info-value" style={{ fontSize: 12, wordBreak: 'break-all' }}>
            {result?.orderId || orderId}
          </span>
        </div>
        <div className="payment-info-row">
          <span className="payment-info-label">결제금액</span>
          <span className="payment-info-value" style={{ color: 'var(--primary)', fontWeight: 800 }}>
            {amountFormatted}원
          </span>
        </div>
        {result?.method && (
          <div className="payment-info-row">
            <span className="payment-info-label">결제수단</span>
            <span className="payment-info-value">{result.method}</span>
          </div>
        )}
        {approvedAt && (
          <div className="payment-info-row">
            <span className="payment-info-label">결제일시</span>
            <span className="payment-info-value">{approvedAt}</span>
          </div>
        )}
      </div>

      {result?.warning && (
        <div style={{
          width: '100%',
          maxWidth: 320,
          background: 'rgba(234,179,8,0.08)',
          border: '1.5px solid rgba(234,179,8,0.3)',
          borderRadius: 12,
          padding: '12px 16px',
          marginBottom: 16,
          fontSize: 13,
          color: 'rgba(245,240,232,0.7)',
          textAlign: 'left',
        }}>
          <span style={{ color: '#EAB308', fontWeight: 700, marginRight: 6 }}>주의</span>
          {result.warning}
        </div>
      )}

      {result?.readingCode && (
        <ReadingCodeBox readingCode={result.readingCode} />
      )}

      <button
        className="btn btn-primary btn-full"
        onClick={() => router.push('/?returnOrderId=' + (result?.orderId || orderId) + (result?.readingCode ? '&readingCode=' + result.readingCode : ''))}
        style={{ maxWidth: 320, marginBottom: 12 }}
      >
        사주 결과 보기
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
        }}
      >
        홈으로 돌아가기
      </button>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <Suspense fallback={
        <div className="payment-result">
          <h1 style={{ color: 'var(--text)' }}>로딩 중...</h1>
        </div>
      }>
        <PaymentSuccessContent />
      </Suspense>
    </div>
  );
}
