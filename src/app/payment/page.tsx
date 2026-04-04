'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PRODUCTS, BUSINESS_INFO, REFUND_POLICY, TOSS_CLIENT_KEY, generateOrderId } from '@/lib/payment-config';
import { TossPaymentProvider } from '@/lib/payment-provider';

const product = PRODUCTS[0];

export default function PaymentPage() {
  const router = useRouter();
  const [checks, setChecks] = useState({ c1: false, c2: false, c3: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const allChecked = checks.c1 && checks.c2 && checks.c3;

  function toggleAll(val: boolean) {
    setChecks({ c1: val, c2: val, c3: val });
  }

  function toggle(key: keyof typeof checks) {
    setChecks(prev => ({ ...prev, [key]: !prev[key] }));
  }

  async function handlePay() {
    if (!allChecked || loading) return;
    setLoading(true);
    setError('');
    try {
      const orderId = generateOrderId();
      const provider = new TossPaymentProvider(TOSS_CLIENT_KEY);
      await provider.requestPayment({
        orderId,
        amount: product.price,
        orderName: product.name,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : '결제 중 오류가 발생했습니다.';
      setError(msg);
      setLoading(false);
    }
  }

  const priceFormatted = product.price.toLocaleString('ko-KR');

  return (
    <div style={{ position: 'relative', zIndex: 1 }}>
      <div className="payment-page screen-enter">
        {/* Header */}
        <div className="payment-header">
          <button
            onClick={() => router.back()}
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '50%',
              width: 40,
              height: 40,
              minWidth: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: 18,
              flexShrink: 0,
            }}
            aria-label="뒤로 가기"
          >
            ←
          </button>
          <h1>결제하기</h1>
        </div>

        {/* Product card */}
        <div className="payment-card">
          <h2>{product.name}</h2>
          <div className="payment-price">
            {priceFormatted}<span className="won">원</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">제공 방식</span>
            <span className="payment-info-value">{product.deliveryMethod}</span>
          </div>
          <div className="payment-info-row">
            <span className="payment-info-label">제공 시점</span>
            <span className="payment-info-value">{product.deliveryTime}</span>
          </div>
          <p className="payment-desc">{product.description}</p>
        </div>

        {/* Refund policy */}
        <div className="payment-refund">
          <h3>환불 정책</h3>
          <ul>
            {REFUND_POLICY.map((text, i) => (
              <li key={i}>{text}</li>
            ))}
          </ul>
        </div>

        {/* Checkboxes */}
        <div className="payment-card payment-checkbox-group">
          {/* All agree */}
          <div
            className="payment-checkbox payment-checkbox-all"
            onClick={() => toggleAll(!allChecked)}
          >
            <input
              type="checkbox"
              id="check-all"
              checked={allChecked}
              onChange={e => toggleAll(e.target.checked)}
              onClick={e => e.stopPropagation()}
            />
            <label htmlFor="check-all">전체 동의</label>
          </div>

          <div className="payment-checkbox" onClick={() => toggle('c1')}>
            <input
              type="checkbox"
              id="check1"
              checked={checks.c1}
              onChange={() => toggle('c1')}
              onClick={e => e.stopPropagation()}
            />
            <label htmlFor="check1">
              상품명, 결제금액, 제공 방식 및 제공 시점을 확인했습니다.
            </label>
          </div>

          <div className="payment-checkbox" onClick={() => toggle('c2')}>
            <input
              type="checkbox"
              id="check2"
              checked={checks.c2}
              onChange={() => toggle('c2')}
              onClick={e => e.stopPropagation()}
            />
            <label htmlFor="check2">
              본 서비스는 디지털콘텐츠/온라인 용역으로서 서비스 제공이 개시된 이후 청약철회 또는 환불이 제한될 수 있음을 확인했습니다.
            </label>
          </div>

          <div className="payment-checkbox" onClick={() => toggle('c3')}>
            <input
              type="checkbox"
              id="check3"
              checked={checks.c3}
              onChange={() => toggle('c3')}
              onClick={e => e.stopPropagation()}
            />
            <label htmlFor="check3">
              <a
                href={BUSINESS_INFO.termsUrl}
                style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}
                onClick={e => e.stopPropagation()}
              >
                이용약관
              </a>
              {' 및 '}
              <a
                href={BUSINESS_INFO.privacyUrl}
                style={{ color: 'var(--primary)', textDecoration: 'underline', textUnderlineOffset: 2 }}
                onClick={e => e.stopPropagation()}
              >
                개인정보처리방침
              </a>
              에 동의합니다.
            </label>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            background: 'rgba(255,107,107,0.12)',
            border: '1px solid rgba(255,107,107,0.3)',
            borderRadius: 'var(--radius-sm)',
            padding: '12px 16px',
            marginBottom: 16,
            fontSize: 13,
            color: '#FC8181',
            lineHeight: 1.5,
          }}>
            {error}
          </div>
        )}

        {/* Pay button */}
        <button
          className="payment-btn"
          disabled={!allChecked || loading}
          onClick={handlePay}
        >
          {loading ? '처리 중...' : `${priceFormatted}원 결제하기`}
        </button>

        <p className="payment-notice">
          결제 완료 시 주문이 확정되며, 상품에 따라 서비스가 즉시 제공될 수 있습니다.
        </p>

        {/* Footer */}
        <div className="payment-footer">
          <div>{BUSINESS_INFO.companyName} | 대표 {BUSINESS_INFO.ceoName}</div>
          <div>사업자등록번호 {BUSINESS_INFO.businessNumber} | 통신판매업신고 {BUSINESS_INFO.salesNumber}</div>
          <div>{BUSINESS_INFO.address}</div>
          <div>고객센터 {BUSINESS_INFO.phone} | {BUSINESS_INFO.email}</div>
          <div className="payment-footer-links">
            <a href={BUSINESS_INFO.termsUrl}>이용약관</a>
            <a href={BUSINESS_INFO.privacyUrl}>개인정보처리방침</a>
            <a href={BUSINESS_INFO.refundUrl}>환불정책</a>
          </div>
        </div>
      </div>
    </div>
  );
}
