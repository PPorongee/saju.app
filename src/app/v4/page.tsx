'use client';

// /v4 베타 라우트 — 메인 SajuApp을 version='v4'로 호출.
// 디자인·저장·결제·intro·입력·로딩·teaser 모두 v3와 100% 동일.
// 차이: saju mode에서 (1) 질문 v4 spec (혼인/자녀/직업/관심사),
// (2) GPT 호출 /api/saju-v4, (3) 결과에 차별화 4섹션 카드 추가.

import SajuApp from '@/components/SajuApp';

export default function V4Page() {
  return <SajuApp version="v4" />;
}
