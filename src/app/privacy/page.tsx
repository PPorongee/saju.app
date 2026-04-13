'use client';

import { BUSINESS_INFO } from '@/lib/payment-config';

export default function PrivacyPage() {
  const B = BUSINESS_INFO;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg1)', color: 'var(--text)', padding: '20px 16px 60px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => window.history.back()} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '14px', cursor: 'pointer', padding: '8px 0', fontFamily: 'inherit' }}>← 돌아가기</button>
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>개인정보처리방침</h1>
      <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.4)', marginBottom: '32px' }}>시행일: 2026년 4월 9일</p>

      <div style={{ fontSize: '14px', lineHeight: 2, color: 'rgba(245,240,232,0.85)' }}>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>1. 총칙</h2>
        <p>{B.companyName}(이하 &quot;회사&quot;)은 「개인정보 보호법」, 「정보통신망 이용촉진 및 정보보호 등에 관한 법률」 등 관련 법령에 따라 이용자의 개인정보를 보호하고 이와 관련한 고충을 신속하게 처리하기 위하여 다음과 같이 개인정보처리방침을 수립·공개합니다.</p>
        <p>본 서비스는 별도의 회원가입 없이 이용할 수 있는 비회원 기반 서비스이며, 최소한의 정보만을 수집하여 서비스를 제공합니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>2. 수집하는 개인정보 항목</h2>
        <p>회사는 서비스 제공을 위해 다음의 정보를 수집합니다.</p>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', margin: '8px 0', fontSize: '13px' }}>
          <p><strong>사주 해석 서비스 이용 시 (필수)</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 이름 (닉네임 가능)</p>
          <p style={{ paddingLeft: '12px' }}>- 성별</p>
          <p style={{ paddingLeft: '12px' }}>- 생년월일</p>
          <p style={{ paddingLeft: '12px' }}>- 출생시간 (선택)</p>
          <p style={{ marginTop: '12px' }}><strong>결제 시 (PG사를 통해 처리)</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 결제 정보는 PG사(토스페이먼츠 등)가 직접 처리하며, 회사는 카드번호 등 민감 결제정보를 직접 수집·저장하지 않습니다.</p>
          <p style={{ paddingLeft: '12px' }}>- 주문번호, 결제금액, 결제일시, 결제상태 등 거래 기록</p>
          <p style={{ marginTop: '12px' }}><strong>서비스 이용 과정에서 자동 수집되는 정보</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 접속 IP 주소, 브라우저 종류, 접속 일시, 서비스 이용 기록</p>
        </div>
        <p>회사는 주민등록번호, 여권번호 등 고유식별정보를 수집하지 않습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>3. 수집 방법</h2>
        <p>① 서비스 이용 과정에서 이용자가 직접 입력하는 방법</p>
        <p>② 서비스 이용 과정에서 자동으로 수집되는 방법 (쿠키, 접속 로그 등)</p>
        <p>③ 결제 대행사(PG사)를 통해 전달받는 결제 관련 정보</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>4. 개인정보의 수집 및 이용 목적</h2>
        <p>회사는 수집한 개인정보를 다음의 목적으로 이용합니다.</p>
        <p style={{ paddingLeft: '12px' }}>① 사주 해석 서비스 제공: 이용자가 입력한 생년월일 등의 정보를 기반으로 사주 해석 결과를 생성·제공</p>
        <p style={{ paddingLeft: '12px' }}>② 결제 처리 및 정산: 유료 서비스의 결제 처리, 환불 처리, 거래 기록 관리</p>
        <p style={{ paddingLeft: '12px' }}>③ 서비스 개선: 서비스 이용 통계 분석, 서비스 품질 향상</p>
        <p style={{ paddingLeft: '12px' }}>④ 고객 문의 응대: 이용자 문의사항 및 불만 처리</p>
        <p style={{ paddingLeft: '12px' }}>⑤ 법적 의무 이행: 관계 법령에 따른 의무 이행 및 분쟁 대응</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>5. 개인정보의 보유 및 이용기간</h2>
        <p>회사는 개인정보 수집 및 이용 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 다만, 관계 법령에 의해 보존할 필요가 있는 경우 아래와 같이 일정 기간 보관합니다.</p>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', margin: '8px 0', fontSize: '13px' }}>
          <p><strong>관계 법령에 따른 보존</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래법)</p>
          <p style={{ paddingLeft: '12px' }}>- 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래법)</p>
          <p style={{ paddingLeft: '12px' }}>- 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래법)</p>
          <p style={{ paddingLeft: '12px' }}>- 웹사이트 방문 기록: 3개월 (통신비밀보호법)</p>
          <p style={{ marginTop: '12px' }}><strong>서비스 자체 보유기간</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 사주 해석을 위해 입력한 개인정보 (이름, 생년월일 등): 결제일로부터 1년</p>
          <p style={{ paddingLeft: '12px' }}>- 결제/거래 기록: 결제일로부터 5년</p>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>6. 개인정보의 제3자 제공</h2>
        <p>회사는 원칙적으로 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다만, 다음의 경우에는 예외로 합니다.</p>
        <p style={{ paddingLeft: '12px' }}>① 이용자가 사전에 동의한 경우</p>
        <p style={{ paddingLeft: '12px' }}>② 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>7. 개인정보 처리위탁</h2>
        <p>회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리를 위탁하고 있습니다.</p>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', margin: '8px 0', fontSize: '13px' }}>
          <p><strong>결제 처리</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 수탁업체: 토스페이먼츠㈜</p>
          <p style={{ paddingLeft: '12px' }}>- 위탁 업무: 결제 처리 및 정산</p>
          <p style={{ marginTop: '12px' }}><strong>AI 해석 서비스</strong></p>
          <p style={{ paddingLeft: '12px' }}>- 수탁업체: OpenAI</p>
          <p style={{ paddingLeft: '12px' }}>- 위탁 업무: 사주 해석 결과 생성을 위한 AI 처리</p>
          <p style={{ paddingLeft: '12px' }}>- 전달 정보: 이름(닉네임 가능), 생년월일, 성별, 출생시간</p>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>8. 개인정보의 국외이전</h2>
        <p>회사는 AI 기반 사주 해석 결과 생성을 위해 이용자의 일부 정보를 해외 서비스 제공자에게 전달할 수 있습니다.</p>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', margin: '8px 0', fontSize: '13px' }}>
          <p>- 이전받는 자: OpenAI (미국)</p>
          <p>- 이전 항목: 이름(닉네임 가능), 생년월일, 성별, 출생시간</p>
          <p>- 이전 목적: AI 기반 사주 해석 결과 생성</p>
          <p>- 이전 방법: 네트워크를 통한 전송</p>
          <p>- 보유 및 이용기간: AI 처리 완료 즉시 삭제 (OpenAI 데이터 보존 정책에 따라 최대 30일)</p>
        </div>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>9. 개인정보의 파기 절차 및 방법</h2>
        <p>① 파기 절차: 수집 목적이 달성되거나 보유기간이 경과한 개인정보는 지체 없이 파기합니다.</p>
        <p>② 파기 방법:</p>
        <p style={{ paddingLeft: '12px' }}>- 전자적 파일: 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</p>
        <p style={{ paddingLeft: '12px' }}>- 종이 문서: 분쇄기로 분쇄하거나 소각</p>
        <p>③ 본 서비스는 비회원 기반입니다. 결제 완료 후 사주 해석 결과는 재열람을 위해 서버 데이터베이스에 저장됩니다. 보유기간은 결제일로부터 1년이며, 기간 경과 후 자동 파기됩니다. 브라우저 로컬 저장소에도 편의를 위해 일부 정보가 저장되며, 이용자는 브라우저 데이터 삭제를 통해 직접 파기할 수 있습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>10. 정보주체의 권리와 행사 방법</h2>
        <p>이용자(정보주체)는 다음과 같은 권리를 행사할 수 있습니다.</p>
        <p style={{ paddingLeft: '12px' }}>① 개인정보 열람 요구</p>
        <p style={{ paddingLeft: '12px' }}>② 오류 등이 있을 경우 정정 요구</p>
        <p style={{ paddingLeft: '12px' }}>③ 삭제 요구</p>
        <p style={{ paddingLeft: '12px' }}>④ 처리정지 요구</p>
        <p>위 권리 행사는 아래 고객센터를 통해 요청하실 수 있으며, 회사는 지체 없이 조치하겠습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>11. 쿠키 및 접속 로그, 분석도구</h2>
        <p>① 회사는 서비스 이용 편의를 위해 쿠키(Cookie) 및 로컬 저장소(localStorage)를 사용할 수 있습니다.</p>
        <p>② 쿠키는 이용자의 브라우저 설정을 통해 거부할 수 있습니다. 다만, 쿠키를 거부하는 경우 서비스 이용에 일부 제한이 있을 수 있습니다.</p>
        <p>③ 회사는 서비스 이용 현황 분석을 위해 웹 분석 도구를 사용할 수 있으며, 이를 통해 수집되는 정보는 개인을 식별하지 않는 통계 목적으로만 활용됩니다.</p>
        <p>④ 쿠키 설정 거부 방법:</p>
        <p style={{ paddingLeft: '12px' }}>- Chrome: 설정 → 개인정보 및 보안 → 쿠키 및 기타 사이트 데이터</p>
        <p style={{ paddingLeft: '12px' }}>- Safari: 환경설정 → 개인정보 보호 → 쿠키 차단</p>
        <p style={{ paddingLeft: '12px' }}>- 기타 브라우저: 해당 브라우저의 설정 메뉴에서 쿠키 관련 설정 변경</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>12. 개인정보 보호책임자</h2>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', margin: '8px 0', fontSize: '13px' }}>
          <p>개인정보 보호책임자: {B.ceoName} (대표)</p>
          <p>이메일: {B.email}</p>
          <p>전화: {B.phone}</p>
        </div>
        <p style={{ marginTop: '8px' }}>이용자는 서비스 이용 과정에서 발생하는 모든 개인정보 보호 관련 문의, 불만, 피해구제 등을 위 담당자에게 문의할 수 있습니다.</p>
        <p>기타 개인정보 침해에 대한 신고나 상담이 필요한 경우 아래 기관에 문의하실 수 있습니다.</p>
        <p style={{ paddingLeft: '12px', fontSize: '13px' }}>- 개인정보침해신고센터: privacy.kisa.or.kr / 118</p>
        <p style={{ paddingLeft: '12px', fontSize: '13px' }}>- 개인정보분쟁조정위원회: kopico.go.kr / 1833-6972</p>
        <p style={{ paddingLeft: '12px', fontSize: '13px' }}>- 대검찰청 사이버수사과: spo.go.kr / 1301</p>
        <p style={{ paddingLeft: '12px', fontSize: '13px' }}>- 경찰청 사이버수사국: ecrm.police.go.kr / 182</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>13. 고지의 의무</h2>
        <p>본 개인정보처리방침은 법령, 정책 또는 서비스 변경사항을 반영하기 위해 수정될 수 있으며, 변경 시 서비스 내 공지를 통해 안내합니다.</p>

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
