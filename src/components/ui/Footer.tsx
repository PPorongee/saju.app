import React from 'react';
import { BUSINESS_INFO } from '@/lib/payment-config';

/**
 * Presentational footer with business registration information.
 * Always rendered; receives no dynamic props — all data comes from BUSINESS_INFO.
 */
export default function Footer() {
  return (
    <div style={{
      padding: '24px 16px 40px',
      textAlign: 'center',
      fontSize: '11px',
      lineHeight: 1.8,
      color: 'rgba(245,240,232,0.55)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      marginTop: '32px'
    }}>
      <div>{BUSINESS_INFO.companyName} | 대표 {BUSINESS_INFO.ceoName}</div>
      <div>사업자등록번호 {BUSINESS_INFO.businessNumber}</div>
      <div>{BUSINESS_INFO.address}</div>
      <div>{BUSINESS_INFO.phone} | {BUSINESS_INFO.email}</div>
      <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <a href={BUSINESS_INFO.termsUrl} style={{ color: 'rgba(245,240,232,0.65)', textDecoration: 'none' }}>이용약관</a>
        <a href={BUSINESS_INFO.privacyUrl} style={{ color: 'rgba(245,240,232,0.65)', textDecoration: 'none' }}>개인정보처리방침</a>
        <a href={BUSINESS_INFO.refundUrl} style={{ color: 'rgba(245,240,232,0.65)', textDecoration: 'none' }}>환불정책</a>
        <a href="/readings" style={{ color: 'rgba(245,240,232,0.65)', textDecoration: 'none' }}>이전 결과</a>
      </div>
    </div>
  );
}
