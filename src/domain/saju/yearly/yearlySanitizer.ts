// Yearly Fortune V4 — Sanitizer (Y5)
//
// 역할:
//   - LLM이 ABSOLUTE_RULES를 일부 어겼을 때 사용자 노출 전에 텍스트 단위로 안전화.
//   - validator가 잡는 "blocking" issue (financial/medical/deterministic 등)를 사후 한 번 더 막는다.
//   - 각 sanitizer는 단일 책임. text → text.
//   - applyYearlyFinalSanitizers는 추천 순서(스펙 §8)로 체인 실행.
//
// 정합:
//   - 단어 치환만 한다. 새 명리 요소를 만들지 않는다.
//   - 개인사주 narrativeSanitizer의 안정화된 함수(sanitizeFinancialAdviceRisk,
//     sanitizeUnsupportedUserContext)를 재사용하되, 개인사주 정책 자체는 변경 없음.
//   - 명리 용어 "배우자궁"은 항상 보존.

import type { YearlyRelationshipStatus } from './yearlyTypes';
import {
  sanitizeFinancialAdviceRisk as sanitizeFinancialAdviceRiskBase,
  sanitizeUnsupportedUserContext as sanitizeUnsupportedUserContextBase,
} from '../narrative/narrativeSanitizer';

export interface YearlySanitizeContext {
  relationshipStatus: YearlyRelationshipStatus;
  /** 자녀 유무 (미상은 'unknown'). 미상/false면 자녀 단정 차단. */
  hasChildren: boolean | 'unknown';
}

// ============================================================
// 1) sanitizeDeterministicFuture — 단정 미래 → 가능성 톤
// ============================================================
export function sanitizeDeterministicFuture(text: string): string {
  let out = text;

  // 단정 사건 패턴 (구체 동사) — 먼저 안전 톤으로 치환
  out = out.replace(/반드시\s*(이직|결혼|이혼|승진|당첨|합격|성공|실패)(?:합니다|한다|할\s*것입니다)/g, '$1 신호가 생길 수 있어요');
  out = out.replace(/무조건\s*(성공|성공합니다|성공한다)/g, '성과로 이어질 가능성이 커질 수 있어요');
  out = out.replace(/100\s*%\s*(돈이?\s*들어옵니다?|성공합니다?)/g, '수익 구조가 정리될 가능성이 커질 수 있어요');
  out = out.replace(/틀림없이\s*(결혼|이혼|이직|성공)(?:합니다|한다)/g, '$1 관련 변화 신호가 강해질 수 있어요');
  out = out.replace(/꼭\s*헤어집니다?/g, '관계 결의 변화가 강해질 수 있어요');
  out = out.replace(/반드시\s*사고가\s*납니다?/g, '예상치 못한 변수가 생길 수 있으니 조건을 확인하는 편이 좋습니다');
  out = out.replace(/올해\s*망합니다?/g, '올해는 무리한 선택을 피하는 편이 더 안정적입니다');
  out = out.replace(/대박납니다?/g, '결과가 더 잘 드러날 수 있어요');
  out = out.replace(/연애운이\s*폭발(합니다?|해요)?/g, '관계 결의 변화 흐름이 강해질 수 있어요');
  out = out.replace(/(돈|재물|큰돈)이\s*크게\s*들어옵니다?/g, '수익 구조 정리 흐름이 생길 수 있어요');
  out = out.replace(/(돈|재물)이\s*들어옵니다?/g, '보상 기준이 정리될 수 있어요');

  // 일반 단정 부사어 — 안전하게 제거 (의미 손실 적음)
  out = out.replace(/반드시\s*/g, '');
  out = out.replace(/무조건\s*/g, '');
  out = out.replace(/100\s*%\s*/g, '대체로 ');
  out = out.replace(/틀림없이\s*/g, '');
  out = out.replace(/필연적으로\s*/g, '');
  out = out.replace(/분명히\s*/g, '');
  out = out.replace(/꼭\s+(?=[가-힣])/g, '');

  return out;
}

// ============================================================
// 2) sanitizeMedicalAdvice — 의학 진단/질병/치료/약물 → 생활 리듬 톤
// ============================================================
export function sanitizeMedicalAdvice(text: string): string {
  let out = text;
  out = out.replace(/위장병이?\s*생깁니다?/g, '생활 리듬이 무너지지 않게 관리하는 편이 좋습니다');
  out = out.replace(/우울증이?\s*옵니다?/g, '생각 과부하가 커지기 전에 휴식 루틴을 점검하는 편이 좋습니다');
  out = out.replace(/질병을?\s*조심하세요?/g, '몸의 신호를 무시하지 않는 편이 좋습니다');
  out = out.replace(/약을?\s*먹어야\s*합니다?/g, '수면과 휴식 루틴을 정리하는 것이 좋습니다');
  out = out.replace(/치료가?\s*필요합니다?/g, '컨디션을 살펴보는 것이 좋습니다');
  out = out.replace(/진단을?\s*받아야\s*합니다?/g, '컨디션을 살펴보는 편이 좋습니다');

  // 단독 단어 (남은 잔여 표현)
  out = out.replace(/(중병|위독)/g, '몸의 부담');
  out = out.replace(/(질병|발병)/g, '몸의 신호');
  out = out.replace(/(진단|처방)/g, '점검');
  out = out.replace(/(치료|약물)/g, '회복 루틴');
  return out;
}

// ============================================================
// 3) sanitizeFearBased — 공포 조장 → 조정/주의 톤
// ============================================================
export function sanitizeFearBased(text: string): string {
  let out = text;
  out = out.replace(/사고가\s*납니다?/g, '예상치 못한 변수가 생길 수 있어요');
  out = out.replace(/사고\s*위험/g, '예상치 못한 변수');
  out = out.replace(/큰\s*사고/g, '큰 흔들림');
  out = out.replace(/이혼\s*확정/g, '관계 결의 큰 변화가 생길 수 있어요');
  out = out.replace(/실패\s*확정/g, '결과가 기대와 다를 수 있어요');
  out = out.replace(/무너집니다?/g, '부담이 커질 수 있으니 조정이 필요합니다');
  out = out.replace(/큰일\s*납니다?/g, '변화가 커질 수 있으니 조건을 확인하는 것이 좋습니다');
  out = out.replace(/파산[가-힣을를이가에]*/g, '재정 부담');
  out = out.replace(/사망[가-힣을를이가에]*/g, '큰 변화');
  out = out.replace(/위독[가-힣을를이가에]*/g, '주의가 필요한');
  // 단독 "사고" / "사망" — 명사 단독은 부담 톤
  out = out.replace(/사고(?=[을를이가에도와과]|\s|$|\.|,)/g, '예상치 못한 변수');
  return out;
}

// ============================================================
// 4) sanitizeYearlyFinancialAdviceRisk — 투자 조언 차단
// ============================================================
// 개인사주 sanitizer 재사용 + yearly 전용 추가 키워드 보강
export function sanitizeYearlyFinancialAdviceRisk(text: string): string {
  let out = sanitizeFinancialAdviceRiskBase(text);
  // yearly 전용 — 명세 §5 키워드
  out = out.replace(/매수[가-힣을를이가에]*/g, '보상 기준 점검');
  out = out.replace(/매도[가-힣을를이가에]*/g, '수익 구조 점검');
  out = out.replace(/시세[가-힣을를이가에]*/g, '시장 흐름 점검');
  out = out.replace(/수익률[가-힣을를이가에]*/g, '수익 구조');
  out = out.replace(/레버리지[가-힣을를이가에]*/g, '무리한 확장 대신 조건 점검');
  out = out.replace(/(시장|투자|거래)\s*타이밍/g, '흐름 점검');
  out = out.replace(/(코인|주식)[가-힣을를이가에]*/g, '');
  out = out.replace(/단기\s*투자/g, '작은 단위 검증');
  out = out.replace(/트레이딩/g, '');
  out = out.replace(/큰돈을?\s*굴린[가-힣]*/g, '수익 구조를 정리합니다');
  out = out.replace(/가격\s*흐름을?\s*보고\s*들어[가-힣]*/g, '수익 구조를 정리합니다');
  out = out.replace(/거래로\s*돈을?\s*법니다?/g, '계약 범위를 정리하는 방식이 안정적입니다');
  out = out.replace(/가격\s*흐름을?\s*보고\s*거래[가-힣]*/g, '수익 구조 정리');
  // 공백 정리 (2칸 이상 → 1)
  out = out.replace(/[ \t]{2,}/g, ' ');
  return out;
}

// ============================================================
// 5) sanitizeYearlyUnsupportedUserContext — relationship + hasChildren 정책
// ============================================================
// 개인사주 sanitizer 재사용 — "배우자궁"은 항상 보존됨 (narrativeSanitizer 정책)
export function sanitizeYearlyUnsupportedUserContext(
  text: string,
  ctx: YearlySanitizeContext,
): string {
  // narrativeSanitizer는 "married"가 아닐 때 차단. yearly에서는 unknown/single/dating/divorced 모두 차단 정책.
  const base = sanitizeUnsupportedUserContextBase(text, {
    relationshipStatus: ctx.relationshipStatus, // narrativeSanitizer가 'married' 만 허용 → 동일 정책
    hasChildren: ctx.hasChildren,
  });
  return base;
}

// ============================================================
// 6) sanitizeEnglishElementKeys — wood/fire/earth/metal/water → 한글
// ============================================================
export function sanitizeEnglishElementKeys(text: string): string {
  let out = text;
  out = out.replace(/\bwood\b/gi,  '목');
  out = out.replace(/\bfire\b/gi,  '화');
  out = out.replace(/\bearth\b/gi, '토');
  out = out.replace(/\bmetal\b/gi, '금');
  out = out.replace(/\bwater\b/gi, '수');
  return out;
}

// ============================================================
// (extra) sanitizeValidatorLogLeak — 내부 토큰 제거
// 명세 §13: validation/validator/issue type/mustUseFact/computedEvidence/sectionId/repair mode/JSON schema
// ============================================================
export function sanitizeValidatorLogLeak(text: string): string {
  let out = text;
  // plan/fact id (yfc-/ym-/rm-/tf-/ag-/nty-/ev-)
  out = out.replace(/\[(yfc|ym|rm|tf|ag|nty|ev)-[a-zA-Z0-9가-힣\-_]+\]\s*/g, '');
  out = out.replace(/\b(yfc|ym|rm|tf|ag|nty|ev)-[a-zA-Z0-9\-_]+/g, '');
  // validator issue type (특정 dash-id 패턴만)
  out = out.replace(/\b(english-element-key-leak|unsupported-user-context|financial-advice-risk|medical-advice-risk|deterministic-future-claim|fear-based-claim|invented-evidence|section-missing|cross-section-leak|validator-log-output|missing-year-ten-god-interpretation|missing-daewoon-sewoon-link|missing-useful-god-link|missing-monthly-guidance|missing-action-guide|missing-next-two-years|generic-yearly-overview|weak-evidence-to-narrative|special-star-too-shallow|missing-life-scene|missing-palace-impact|missing-strength-impact|weak-transition|minor-repetition|tone-too-dry)\b/g, '');
  // 사용자 본문 노출 금지 키워드 (명세 §13)
  out = out.replace(/\bmustUseFacts?\b/g, '');
  out = out.replace(/\bcomputedEvidence\b/g, '');
  out = out.replace(/\bABSOLUTE_RULES\b/g, '');
  out = out.replace(/\bsectionId\b/g, '');
  out = out.replace(/\bvalidator\b/gi, '');
  out = out.replace(/\bvalidation\b/gi, '');
  out = out.replace(/\bissue\s+type\b/gi, '');
  out = out.replace(/\bhigh\s+severity\b/gi, '');
  out = out.replace(/\bmedium\s+(?:issue|severity)\b/gi, '');
  out = out.replace(/\brepair\s+mode\b/gi, '');
  out = out.replace(/\bJSON\s+schema\b/gi, '');
  return out;
}

// ============================================================
// applyYearlyFinalSanitizers — 명세 §8 추천 순서
// ============================================================
export function applyYearlyFinalSanitizers(
  text: string,
  ctx: YearlySanitizeContext,
): string {
  let out = text;
  // 1) english element keys → 한글
  out = sanitizeEnglishElementKeys(out);
  // 2) unsupported user context (배우자/자녀 등)
  out = sanitizeYearlyUnsupportedUserContext(out, ctx);
  // 3) financial advice risk
  out = sanitizeYearlyFinancialAdviceRisk(out);
  // 4) medical advice
  out = sanitizeMedicalAdvice(out);
  // 5) fear based
  out = sanitizeFearBased(out);
  // 6) deterministic future
  out = sanitizeDeterministicFuture(out);
  // (extra) validator log leak — 내부 토큰 노출 차단
  out = sanitizeValidatorLogLeak(out);
  // 공백/구두점 정리
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.!?])/g, '$1').replace(/\n{3,}/g, '\n\n');
  return out;
}
