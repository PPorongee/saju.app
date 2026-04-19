'use client';

import { BUSINESS_INFO } from '@/lib/payment-config';

export default function TermsPage() {
  const B = BUSINESS_INFO;
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg1)', color: 'var(--text)', padding: '20px 16px 60px', maxWidth: '640px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <button onClick={() => { try { window.history.back(); } catch { window.location.href = '/'; } }} style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '14px', cursor: 'pointer', padding: '8px 0', minHeight: '44px', minWidth: '44px', fontFamily: 'inherit' }}>← 돌아가기</button>
      </div>

      <h1 style={{ fontSize: '22px', fontWeight: 800, marginBottom: '8px' }}>이용약관</h1>
      <p style={{ fontSize: '12px', color: 'rgba(245,240,232,0.4)', marginBottom: '32px' }}>시행일: 2026년 4월 9일</p>

      <div style={{ fontSize: '14px', lineHeight: 2, color: 'rgba(245,240,232,0.85)' }}>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제1조 (목적)</h2>
        <p>본 약관은 {B.companyName}(이하 &quot;회사&quot;)이 운영하는 별빛 사주 서비스(이하 &quot;서비스&quot;)의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제2조 (용어의 정의)</h2>
        <p>① &quot;서비스&quot;란 회사가 웹사이트 및 모바일 웹을 통해 제공하는 AI 기반 사주 해석, 궁합 분석, 운세 분석 등 온라인 디지털콘텐츠 서비스를 말합니다.</p>
        <p>② &quot;이용자&quot;란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.</p>
        <p>③ &quot;별빛(별)&quot;이란 서비스 내에서 유료 콘텐츠를 이용하기 위해 사용되는 가상 재화를 ��합니다.</p>
        <p>④ &quot;결제&quot;란 이용자가 별빛을 충전하기 위해 회사가 지정한 결제수단을 통해 대금을 지불하는 행위를 말합니다.</p>
        <p>⑤ &quot;콘텐츠&quot;란 서비스를 통해 제공되는 사주 해석 결과, 궁합 분석 결과, 운세 분석 결과 등 디지털 형태의 정보를 말합니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제3조 (약관의 효력 및 변경)</h2>
        <p>① 본 약관은 서비스 화면에 게시하거나 기타의 방법으로 이용자에게 공지함으로써 효력이 발생합니다.</p>
        <p>② 회사는 관련 법령을 위배하지 않는 범위에서 본 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 게시합니다.</p>
        <p>③ 이용자가 변경된 약관에 동의하지 않는 경우, 서비스 이용을 중단할 수 있습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제4조 (서비스의 제공 내용)</h2>
        <p>회사는 다음과 같은 서비스를 제공합니다.</p>
        <p>① AI 기반 개인 사주 해석 서��스</p>
        <p>② 궁합 분석 서비스</p>
        <p>③ 연간/월간 운세 분석 ���비스</p>
        <p>④ 기타 회사가 추가적으로 개발하거나 제휴를 통해 제공하는 서비스</p>
        <p style={{ marginTop: '8px' }}>본 서비스에서 제공하는 사주 해석 결과는 전통 명리학 이론과 AI 기술을 결합한 <strong>참고용 정보</strong>이며, 특정 결과나 효과를 보장하지 않습니다. 서비스 결과를 근거로 한 중요한 의사결정은 이용자 본인의 책임 하에 이루어져야 합니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제5조 (이용계약의 성립)</h2>
        <p>① 본 서비스는 별도의 회원가입 없이 이용할 수 있습니다.</p>
        <p>② 이용자가 서비스에 접속하여 본 약관에 동의한 후 서비스를 이용하는 시점에 이용계약이 성립됩니다.</p>
        <p>③ 유료 서비스의 경우, 이용자가 결제를 완료하고 서비스 이용에 동의한 시점에 유료 이용계약이 성립됩니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제6조 (주문 및 결제)</h2>
        <p>① 이용자는 서비스 내 &quot;별빛 충전소&quot;에서 별빛을 구매할 수 있으며, 회사가 지정한 결제수단(토스페이먼츠 등)을 통해 결제할 수 있습니다.</p>
        <p>② 결제 시 이용자는 상품명, 결제금액, 제공 방식 및 제공 시점을 확인하고 필수 동의사항에 동의하여야 합니다.</p>
        <p>③ 결제가 완료되면 주문이 확정되며, 결제 내역은 이용자에게 안내됩니��.</p>
        <p>④ 회사는 이용자의 결제 정보를 직접 저장하지 않으며, 결제 처리는 PG사(결제대행사)를 통해 이루어집니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제7조 (서비스 제공 시점)</h2>
        <p>① 별빛 충전: 결제 완료 즉시 이용자의 별빛 잔액에 반영됩니다.</p>
        <p>② 사주 해석 결과: 별빛을 사용하여 서비스를 요청한 후 즉시 웹페이지에서 확인할 수 있습니다.</p>
        <p>③ 일부 상품의 경우 결제 완료 후 24시간 이내에 제공될 수 있습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제8조 (서비스 이용 제한 및 중단)</h2>
        <p>① 회사는 다음 각 호에 해당하는 경우 서비스의 전부 또는 일부를 제한하거나 중단할 수 있습니다.</p>
        <p style={{ paddingLeft: '16px' }}>1. 서비스용 설비의 보수 등 공사로 인한 부득이한 경우</p>
        <p style={{ paddingLeft: '16px' }}>2. 이용자가 본 약관의 의무를 위반한 경우</p>
        <p style={{ paddingLeft: '16px' }}>3. 정전, 제반 설비 장애 또는 이용량의 폭주 등으로 정상적인 서비스 이용에 지장이 있는 경우</p>
        <p style={{ paddingLeft: '16px' }}>4. 기타 천재지변, 국가비상사태 등 불가항력적 사유가 있는 경우</p>
        <p>② 서비스 중단의 경우 회사는 사전에 공지합니다. 다만, 긴급한 경우 사후에 공지할 수 있습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제9조 (이용자의 의무)</h2>
        <p>이용자는 다음 행위를 하여서는 안 됩��다.</p>
        <p style={{ paddingLeft: '16px' }}>1. 타인의 정보를 도용하여 서비스를 이용하는 행위</p>
        <p style={{ paddingLeft: '16px' }}>2. 서비스를 이용하여 얻은 정보를 회사의 사전 동의 없이 상업적으로 이용하거나 제3자에게 제공하는 행위</p>
        <p style={{ paddingLeft: '16px' }}>3. 회사의 지적재산권을 침해하는 행위</p>
        <p style={{ paddingLeft: '16px' }}>4. 서비스의 운영을 방해하거나 안정성을 저해하는 행위</p>
        <p style={{ paddingLeft: '16px' }}>5. 기타 관계 법령에 위배되는 행위</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제10조 (회사의 권리 및 의무)</h2>
        <p>① 회사는 관련 법령과 본 약관이 금지하는 행위를 하지 않으며, 지속적이고 안정적으로 서비스를 제공하기 위해 노력합니다.</p>
        <p>② 회사는 이용자가 안전하게 서비스를 이용할 수 있도록 개인정보 보호를 위한 기술적·관리적 대책을 수립하여 시행합니다.</p>
        <p>③ 회사는 서비스 이용과 관련한 이용자의 불만 또는 피해구제 요청을 적절하게 처리하기 위해 노력합니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제11조 (청약철회 및 환불)</h2>
        <p>① 이용자는 서비스 제공이 개시되기 전에 청약을 철회할 수 있습니다.</p>
        <p>② 본 서비스는 「전자상거래 등에서의 소비자보호에 관한 법률」 및 「콘텐츠산업 진흥법」에 따른 디지털콘텐츠/온라인 용역에 해당하며, 서비스 제공이 개시된 이후에는 청약철회가 제한될 수 있습니다.</p>
        <p>③ 서비스 제공 개시의 기준은 다음과 같습니다.</p>
        <p style={{ paddingLeft: '16px' }}>- 결과 확인 페이지의 열람</p>
        <p style={{ paddingLeft: '16px' }}>- 해석 결과문의 전송 또는 표시</p>
        <p style={{ paddingLeft: '16px' }}>- 개별 해석의 착수</p>
        <p>④ 시스템 오류, 중복 결제 등 회사의 귀책사유로 인한 경우에는 전액 환불이 가능합니다.</p>
        <p>⑤ 환불에 관한 세부 사항은 별도의 <a href="/refund" style={{ color: 'var(--primary)', textDecoration: 'underline' }}>환불정책</a>을 따릅니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제12조 (면책조항)</h2>
        <p>① 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력적 사유로 인한 서비스 제공 불능에 대해 책임을 지지 않습니다.</p>
        <p>② 회사는 이용자의 귀책사유로 인한 서비스 이용 장애에 대해 책임을 지지 않습니다.</p>
        <p>③ 본 서비스에서 제공하는 사주 해석, 운세 분석 등의 결과는 전통 명리학 이론과 AI 기술을 활용한 참고용 정보입니다. 회사는 서비스 결과의 정확성, 완전성, 신뢰성을 보증하지 않으며, 이용자가 서비스 결과를 근거로 내린 판단이나 행동에 대해 책임을 지지 않습니다.</p>
        <p>④ 회사는 이용자가 서비스를 통해 기대하는 특정 결과나 효과를 보장하지 않습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제13조 (지적재산권)</h2>
        <p>① 서비스에 포함된 모든 콘텐츠(텍스트, 디자인, 코드, AI 생성 결과물 등)에 대한 저작권 및 지적재산권은 회사에 귀속됩니다.</p>
        <p>② 이용자는 서비스를 통해 제공받은 콘텐츠를 개인적 용도로만 이용할 수 있으며, 회사의 사전 동의 없이 복제, 배포, 전송, 출판, 방송, 기타 방법으로 이용하거나 제3자에게 제공할 수 없습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제14조 (분��� 해결)</h2>
        <p>�� 회사와 이용자 간에 발생한 분쟁에 관하여 이용자의 피해구제 신청이 있는 경우, 회사는 이를 성실히 처리합니다.</p>
        <p>② 회사와 이용자 간에 발생한 전자상거래 분쟁과 관련하여 한국소비자원, 전자거래분쟁조정위원회 등 관련 기관의 조정에 따를 수 있습니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제15조 (준거법 및 관할법원)</h2>
        <p>① 본 약관의 해석 및 서비스 이용에 관한 분쟁은 대한민국 법률에 따릅니다.</p>
        <p>② 서비스 이용으로 발생한 분쟁에 대한 소송은 회사의 본점 소재지를 관할하는 법원을 전속적 합의관할법원으로 합니다.</p>

        <h2 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', margin: '28px 0 12px' }}>제16조 (고객문의)</h2>
        <p>서비스 이용과 관련한 문의사항은 아래 연락처로 문의하여 주시기 바랍니다.</p>
        <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: '12px', padding: '16px', marginTop: '8px', fontSize: '13px', lineHeight: 2 }}>
          <p>상호: {B.companyName}</p>
          <p>대표자: {B.ceoName}</p>
          <p>사업자등록번호: {B.businessNumber}</p>
          <p>통신판매업 신고번호: {B.salesNumber}</p>
          <p>주소: {B.address}</p>
          <p>이���일: {B.email}</p>
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
