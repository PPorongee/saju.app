'use client';

import { BUSINESS_INFO } from '@/lib/payment-config';

export default function RefundPage() {
  const B = BUSINESS_INFO;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg1)', color: 'var(--text)', padding: '20px 16px 60px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '14px', cursor: 'pointer', padding: '8px 0', fontFamily: 'inherit' }}>← 돌아가기</button>
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>환불정책</h1>
      <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.4)', marginBottom: '24px' }}>시행일: [시행일자]</p>

      {/* 요약 박스 */}
      <div style={{ background: 'linear-gradient(135deg, rgba(240,199,94,0.1), rgba(255,208,128,0.05))', border: '1px solid rgba(240,199,94,0.25)', borderRadius: '16px', padding: '20px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--primary)', margin: '0 0 12px 0' }}>환불정책 요약</h3>
        <div style={{ fontSize: '13px', lineHeight: 1.8, color: 'rgba(245,240,232,0.8)' }}>
          <p>• 서비스 제공 전(결과 미열람): <strong style={{ color: 'var(--text)' }}>환불 가능</strong></p>
          <p>• 서비스 제공 후(결과 열람 완료): <strong style={{ color: 'var(--text)' }}>환불 제한</strong></p>
          <p>• 시스템 오류 / 중복 결제: <strong style={{ color: 'var(--text)' }}>전액 환불</strong></p>
          <p>• 환불 문의: {B.email}</p>
        </div>
      </div>

      <div style={{ fontSize: '14px', lineHeight: 2, color: 'rgba(245,240,232,0.85)' }}>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>1. 환불정책 개요</h2>
        <p>{B.companyName}(이하 &quot;회사&quot;)이 제공하는 별빛 사주 서비스(이하 &quot;서비스&quot;)는 온라인 디지털콘텐츠/온라인 용역 성격의 서비스입니다.</p>
        <p>본 환불정책은 「전자상거래 등에서의 소비자보호에 관한 법률」 및 「콘텐츠산업 진흥법」 등 관련 법령에 따라 수립되었으며, 이용자의 합리적인 권익 보호를 위해 운영됩니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>2. 상품 유형 및 특성</h2>
        <p>본 서비스에서 제공하는 상품은 다음과 같습니다.</p>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', margin: '8px 0', fontSize: '13px' }}>
          <p><strong>별빛 충전 상품</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 서비스 내에서 사용 가능한 가상 재화(별빛)를 충전하는 상품</p>
          <p style={{ paddingLeft: '12px' }}>- 결제 완료 즉시 별빛이 충전됩니다</p>
          <p style={{ marginTop: '12px' }}><strong>이용 가능 서비스</strong></p>
          <p style={{ paddingLeft: '12px' }}>- AI 사주 해석 (⭐10)</p>
          <p style={{ paddingLeft: '12px' }}>- 궁합 분석 (⭐5)</p>
          <p style={{ paddingLeft: '12px' }}>- 올해 운세 (⭐10)</p>
        </div>
        <p>모든 서비스는 결제 후 즉시 또는 개별 요청에 따라 제공이 시작되는 디지털콘텐츠입니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>3. 서비스 제공 개시 전 환불</h2>
        <p>다음의 경우 환불이 가능합니다.</p>
        <p style={{ paddingLeft: '12px' }}>① 결제 후 별빛을 사용하지 않은 경우</p>
        <p style={{ paddingLeft: '12px' }}>② 별빛을 사용하였으나 서비스 결과를 아직 열람하지 않은 경우</p>
        <p style={{ paddingLeft: '12px' }}>③ 결제 후 서비스 이용을 시작하지 않은 경우</p>
        <p style={{ marginTop: '8px' }}>위 경우에 해당하면, 결제일로부터 7일 이내에 환불을 요청하실 수 있으며, 결제 금액 전액을 환불받으실 수 있습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>4. 서비스 제공 개시 후 환불 제한</h2>
        <p>본 서비스는 디지털콘텐츠/온라인 용역의 특성상, 서비스 제공이 개시된 이후에는 「전자상거래 등에서의 소비자보호에 관한 법률」 제17조 및 「콘텐츠산업 진흥법」에 따라 청약철회 및 환불이 제한될 수 있습니다.</p>
        <p style={{ marginTop: '8px' }}><strong>서비스 제공 개시로 판단하는 기준:</strong></p>
        <p style={{ paddingLeft: '12px' }}>• 사주 해석 결과 확인 페이지를 열람한 경우</p>
        <p style={{ paddingLeft: '12px' }}>• 해석 결과문이 화면에 표시되거나 전송된 경우</p>
        <p style={{ paddingLeft: '12px' }}>• 개별 해석이 착수(AI 분석 요청이 시작)된 경우</p>
        <p style={{ paddingLeft: '12px' }}>• 충전된 별빛을 사용하여 서비스를 요청한 경우</p>
        <p style={{ marginTop: '8px' }}>위 기준 중 하나라도 해당하는 경우, 서비스 제공이 개시된 것으로 판단하며 환불이 제한될 수 있습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>5. 회사 귀책사유에 의한 환불</h2>
        <p>다음의 경우에는 서비스 제공 개시 여부와 관계없이 환불이 가능합니다.</p>
        <p style={{ paddingLeft: '12px' }}>① <strong>시스템 오류:</strong> 기술적 문제로 서비스가 정상적으로 제공되지 않은 경우</p>
        <p style={{ paddingLeft: '12px' }}>② <strong>중복 결제:</strong> 동일 상품에 대해 중복으로 결제가 이루어진 경우</p>
        <p style={{ paddingLeft: '12px' }}>③ <strong>서비스 미제공:</strong> 결제가 완료되었으나 서비스가 제공되지 않은 경우</p>
        <p style={{ paddingLeft: '12px' }}>④ <strong>기타 회사 귀책사유:</strong> 회사의 과실로 인해 이용자에게 피해가 발생한 경우</p>
        <p style={{ marginTop: '8px' }}>위 사유에 해당하는 경우, 결제 금액 전액을 환불해 드립니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>6. 환불 요청 방법</h2>
        <p>환불을 원하시는 경우 아래 방법으로 요청해 주세요.</p>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', margin: '8px 0', fontSize: '13px' }}>
          <p><strong>환불 요청 채널</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 이메일: {B.email}</p>
          <p style={{ paddingLeft: '12px' }}>- 전화: {B.phone}</p>
          <p style={{ paddingLeft: '12px' }}>- [환불 접수 채널]</p>
          <p style={{ marginTop: '12px' }}><strong>환불 요청 시 필요한 정보</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 결제일시</p>
          <p style={{ paddingLeft: '12px' }}>- 결제금액</p>
          <p style={{ paddingLeft: '12px' }}>- 결제수단</p>
          <p style={{ paddingLeft: '12px' }}>- 환불 사유</p>
          <p style={{ paddingLeft: '12px' }}>- 연락처 (회신받으실 이메일 또는 전화번호)</p>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>7. 환불 처리 기간</h2>
        <p>① 환불 요청 접수 후 [환불 처리 기간] 이내에 처리합니다.</p>
        <p>② 환불 승인 후 실제 금액이 반영되는 시점은 결제수단에 따라 다를 수 있습니다.</p>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', margin: '8px 0', fontSize: '13px' }}>
          <p><strong>결제수단별 환불 반영 시점 (예상)</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 신용카드: 결제 취소 후 3~7 영업일 (카드사에 따라 상이)</p>
          <p style={{ paddingLeft: '12px' }}>- 체크카드: 결제 취소 후 3~5 영업일</p>
          <p style={{ paddingLeft: '12px' }}>- 계좌이체: 환불 처리 후 1~3 영업일</p>
          <p style={{ paddingLeft: '12px' }}>- 간편결제 (토스페이 등): 결제 취소 후 즉시~3 영업일</p>
        </div>
        <p>※ 위 기간은 결제대행사 및 금융기관의 처리 일정에 따라 변동될 수 있습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>8. 기타 안내</h2>
        <p>① 본 환불정책에서 정하지 않은 사항은 「전자상거래 등에서의 소비자보호에 관한 법률」 등 관련 법령에 따릅니다.</p>
        <p>② 본 환불정책은 법령 변경 또는 서비스 운영 정책 변경에 따라 수정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.</p>
        <p>③ 환불과 관련하여 추가 문의사항이 있으시면 아래 고객센터로 연락해 주세요.</p>

        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', marginTop: '20px', fontSize: '13px', lineHeight: 2 }}>
          <p><strong>문의처</strong></p>
          <p>상호: {B.companyName}</p>
          <p>대표자: {B.ceoName}</p>
          <p>사업자등록번호: {B.businessNumber}</p>
          <p>이메일: {B.email}</p>
          <p>전화: {B.phone}</p>
        </div>

      </div>

      <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.06)', fontSize: '11px', color: 'rgba(245,240,232,0.25)', lineHeight: 1.8, textAlign: 'center' }}>
        <p>© {new Date().getFullYear()} {B.companyName}. All rights reserved.</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '8px' }}>
          <a href="/terms" style={{ color: 'rgba(245,240,232,0.4)', textDecoration: 'underline' }}>이용약관</a>
          <a href="/privacy" style={{ color: 'rgba(245,240,232,0.4)', textDecoration: 'underline' }}>개인정보처리방침</a>
          <a href="/refund" style={{ color: 'rgba(245,240,232,0.4)', textDecoration: 'underline' }}>환불정책</a>
        </div>
      </div>
    </div>
  );
}
