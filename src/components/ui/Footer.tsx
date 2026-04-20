import React from 'react';
import { BUSINESS_INFO } from '@/lib/payment-config';
import type { Lang } from '@/lib/i18n';

export default function Footer({ lang = 'ko' }: { lang?: Lang }) {
  const en = lang === 'en';
  const ls = { color: 'rgba(245,240,232,0.65)', textDecoration: 'underline' as const, textUnderlineOffset: '3px' };
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
      <div>{BUSINESS_INFO.companyName} | {en ? 'CEO' : '대표'} {BUSINESS_INFO.ceoName}</div>
      <div>{en ? 'Business Reg.' : '사업자등록번호'} {BUSINESS_INFO.businessNumber}</div>
      <div>{BUSINESS_INFO.address}</div>
      <div>{BUSINESS_INFO.phone} | {BUSINESS_INFO.email}</div>
      <div style={{ marginTop: '6px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
        <a href={BUSINESS_INFO.termsUrl} style={ls}>{en ? 'Terms' : '이용약관'}</a>
        <a href={BUSINESS_INFO.privacyUrl} style={ls}>{en ? 'Privacy' : '개인정보처리방침'}</a>
        <a href={BUSINESS_INFO.refundUrl} style={ls}>{en ? 'Refund' : '환불정책'}</a>
        <a href="/readings" style={ls}>{en ? 'History' : '이전 결과'}</a>
      </div>
    </div>
  );
}
