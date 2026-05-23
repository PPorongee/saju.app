import SajuApp from '@/components/SajuApp';

// 메인 페이지 — version='v4' 활성화로 사주 모드가 v4 동작 (결정론 명리 + 차별화 4섹션 + GPT 해석).
// 다른 모드(궁합/올해운세/태교)는 v3 그대로 (isV4 분기가 saju mode만 영향).
export default function Home() {
  return <SajuApp version="v4" />;
}
