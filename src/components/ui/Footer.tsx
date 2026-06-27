import React from 'react';
import { BUSINESS_INFO } from '@/lib/payment-config';
import type { Lang } from '@/lib/i18n';

export default function Footer({ lang = 'ko' }: { lang?: Lang }) {
  const en = lang === 'en';
  const ls = { color: 'rgba(245,240,232,0.65)', textDecoration: 'underline' as const, textUnderlineOffset: '3px' };
  return (
    <div style={{
      padding: '7px 12px 9px',
      textAlign: 'center',
      fontSize: '8px',
      lineHeight: 1.4,
      color: 'rgba(245,240,232,0.48)',
      borderTop: '1px solid rgba(255,255,255,0.04)',
      marginTop: '8px'
    }}>
      {/* 사업자 정보 — 2줄로 압축 (법적 필수정보 유지) */}
      <div>{BUSINESS_INFO.companyName} | {en ? 'CEO' : '대표'} {BUSINESS_INFO.ceoName} | {en ? 'Biz Reg.' : '사업자등록번호'} {BUSINESS_INFO.businessNumber}</div>
      <div>{BUSINESS_INFO.address} | {BUSINESS_INFO.phone} | {BUSINESS_INFO.email}</div>
      <div style={{ marginTop: '4px', display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
        <a href={BUSINESS_INFO.termsUrl} style={ls}>{en ? 'Terms' : '이용약관'}</a>
        <a href={BUSINESS_INFO.privacyUrl} style={ls}>{en ? 'Privacy' : '개인정보처리방침'}</a>
        <a href={BUSINESS_INFO.refundUrl} style={ls}>{en ? 'Refund' : '환불정책'}</a>
        <a href="/readings" style={ls}>{en ? 'History' : '이전 결과'}</a>
      </div>
    </div>
  );
}
