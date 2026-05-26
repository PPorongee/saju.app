// 궁합 narrative V4 — Sanitizer (Phase 4)
//
// 역할:
//   - LLM이 ABSOLUTE_RULES를 일부 어겼을 때 사용자 노출 전에 텍스트 단위로 안전화.
//   - validator가 잡는 high issue(relationship-fatalism / deterministic / context /
//     english key / validator-log)를 사후 한 번 더 막는다.
//   - 각 sanitizer는 단일 책임. text → text.
//   - applyCompatFinalSanitizers는 권장 순서로 체인 실행
//     (english → context → fatalism → deterministic → logleak → whitespace).
//
// 정합:
//   - 단어 치환만 한다. 새 명리 요소를 만들지 않는다.
//   - 개인사주 narrativeSanitizer.sanitizeUnsupportedUserContext를 재사용하되
//     개인사주 정책(배우자궁 보존) 자체는 변경하지 않는다.
//   - 명리 용어 "배우자궁"은 항상 보존.

import type { RelationshipType } from '../compatibilityTypes';
import { sanitizeUnsupportedUserContext as sanitizeUnsupportedUserContextBase } from '../../narrative/narrativeSanitizer';

export interface CompatSanitizeContext {
  relationshipType: RelationshipType;
  /** 관계 상태(선택). 'married'가 아니면 배우자 단정 차단. */
  relationshipStatus?: string;
  /** 자녀 유무(미상은 'unknown'). 미상/false면 자녀 단정 차단. */
  hasChildren?: boolean | 'unknown';
}

// ============================================================
// 1) sanitizeRelationshipFatalism — 운명/관계 단정 + 상대 마음 단정 → 가능성/조건/선택기준
// ============================================================
export function sanitizeRelationshipFatalism(text: string): string {
  let out = text;

  // ── 문장형 단정 (먼저 안전 톤으로 치환) ──
  // 반드시/무조건 헤어집니다 / 이별합니다
  out = out.replace(/(?:반드시|무조건|틀림없이)\s*(?:헤어집니다|헤어진다|이별합니다|이별한다)/g, '관계 결의 변화가 강해질 수 있어요');
  // 절대 안 맞습니다
  out = out.replace(/절대\s*안\s*맞(?:습니다|아요|는다)/g, '맞춰갈 부분이 큰 관계일 수 있어요');
  // 무조건 재회합니다
  out = out.replace(/(?:반드시|무조건|틀림없이)\s*(?:재회합니다|재회한다|다시\s*만납니다)/g, '다시 가까워질 가능성도 열려 있어요');
  // 이 사람은 운명입니다 / 운명적인 상대입니다
  out = out.replace(/(?:이\s*사람은|상대는|두\s*사람은)\s*운명입니다/g, '강하게 연결되는 흐름일 수 있어요');
  out = out.replace(/운명(?:적인|의)\s*(?:상대|만남|짝)(?:입니다|이에요)?/g, '강하게 연결되는 흐름');
  out = out.replace(/천생연분입니다/g, '잘 맞는 결이 많은 관계일 수 있어요');
  // 바람납니다 / 이혼합니다 (관계 단정 사건)
  out = out.replace(/바람(?:이?\s*)?(?:납니다|난다|핍니다)/g, '관계 신뢰를 점검할 신호가 생길 수 있어요');
  out = out.replace(/(?:반드시|무조건|틀림없이)?\s*이혼합니다/g, '관계 결의 큰 변화 가능성을 살필 수 있어요');

  // ── 상대 마음 단정 (mind-reading) ──
  // 상대는 당신을 좋아하지 않습니다 / 좋아합니다
  out = out.replace(/상대는?\s*(?:당신을|너를)?\s*좋아하지\s*않(?:습니다|아요|는다)/g, '상대의 마음은 단정하기 어렵습니다');
  out = out.replace(/상대는?\s*(?:당신을|너를)?\s*(?:분명히|확실히)?\s*좋아합니다/g, '상대의 마음은 단정하기 어렵습니다');
  // 상대는 반드시 돌아옵니다
  out = out.replace(/상대는?\s*(?:반드시|무조건|틀림없이)\s*돌아옵니다/g, '상대의 선택은 단정하기 어렵습니다');
  // 일반 mind-reading: "상대는 ~합니다" 단정 (마음/생각/감정류)
  out = out.replace(/상대는?\s*(?:속으로|마음속으로|분명히|확실히)\s*[가-힣]+(?:합니다|해요|한다)/g, '상대의 마음은 단정하기 어렵습니다');

  // ── 남은 일반 단정 부사어 (의미 손실 적게 제거) ──
  out = out.replace(/반드시\s*/g, '');
  out = out.replace(/무조건\s*/g, '');
  out = out.replace(/틀림없이\s*/g, '');
  out = out.replace(/필연적으로\s*/g, '');
  out = out.replace(/100\s*%\s*/g, '대체로 ');

  return out;
}

// ============================================================
// 2) sanitizeDeterministicRelationshipPrediction — 결혼/이혼/재회/이별 단정 → 가능성/신호
//    sanitizeRelationshipFatalism 이후 남은 "X합니다/할 것입니다" 단정을 부드럽게.
// ============================================================
export function sanitizeDeterministicRelationshipPrediction(text: string): string {
  let out = text;

  out = out.replace(/결혼(?:하게\s*)?(?:합니다|한다|할\s*것입니다|할\s*거예요|해요)/g, '결혼으로 이어질 가능성이 생길 수 있어요');
  out = out.replace(/이혼(?:하게\s*)?(?:합니다|한다|할\s*것입니다|할\s*거예요|해요)/g, '관계 결의 큰 변화 신호가 생길 수 있어요');
  out = out.replace(/재회(?:하게\s*)?(?:합니다|한다|할\s*것입니다|할\s*거예요|해요)/g, '다시 가까워질 가능성이 생길 수 있어요');
  out = out.replace(/(?:헤어지게\s*됩니다|헤어질\s*것입니다|이별하게\s*됩니다|이별할\s*것입니다)/g, '관계 결의 변화 신호가 생길 수 있어요');
  out = out.replace(/헤어집니다(?!\s*다)/g, '관계 결의 변화 신호가 생길 수 있어요');

  return out;
}

// ============================================================
// 3) sanitizeUnsupportedUserContext — 개인사주 base 재사용 (배우자궁 보존)
//    relationshipStatus가 married가 아니면 배우자/아내/남편 단정 차단,
//    hasChildren이 true가 아니면 자녀 단정 차단. "배우자궁"은 보존.
// ============================================================
export function sanitizeUnsupportedUserContext(text: string, ctx: CompatSanitizeContext): string {
  return sanitizeUnsupportedUserContextBase(text, {
    relationshipStatus: ctx.relationshipStatus ?? '',
    hasChildren: ctx.hasChildren ?? 'unknown',
  });
}

// ============================================================
// 4) sanitizeEnglishElementKeys — wood/fire/earth/metal/water → 한글
// ============================================================
export function sanitizeEnglishElementKeys(text: string): string {
  let out = text;
  out = out.replace(/\bwood\b/gi, '목');
  out = out.replace(/\bfire\b/gi, '화');
  out = out.replace(/\bearth\b/gi, '토');
  out = out.replace(/\bmetal\b/gi, '금');
  out = out.replace(/\bwater\b/gi, '수');
  return out;
}

// ============================================================
// 5) sanitizeValidatorLogLeak — 내부 fact id / sectionId / issue name / 내부 schema 토큰 제거
// ============================================================
export function sanitizeValidatorLogLeak(text: string): string {
  let out = text;
  // fact id 접두사 (ro-/mech-/af-/rp-/rg-/fa-/cc-)
  out = out.replace(/\[(ro|mech|af|rp|rg|fa|cc)-[a-zA-Z0-9가-힣\-_]+\]\s*/g, '');
  out = out.replace(/\b(ro|mech|af|rp|rg|fa|cc)-[a-zA-Z0-9\-_]+/g, '');
  // sectionId 값 (LLM 섹션 id가 본문에 새는 경우)
  out = out.replace(/\b(relationshipOverview|relationshipMechanism|attractionAndFriction|repeatedPattern|relationshipGuide|finalAdvice|compatibilityCard|evidenceView)\b/g, '');
  // validator issue type (dash-id 패턴)
  out = out.replace(/\b(section-missing|cross-section-leak|unsupported-user-context|deterministic-future-claim|fear-based-claim|relationship-fatalism|invented-evidence|validator-log-output|score-leak|json-parse-failed|finish-length|relationship-type-focus-missing|weak-evidence-to-narrative|generic-advice|repeated-content|missing-life-scene|weak-final-advice|mechanism-too-shallow|attraction-friction-too-separated|qna-interest-not-absorbed)\b/g, '');
  // 내부 schema/검증 토큰
  out = out.replace(/\bmustUseFacts?\b/g, '');
  out = out.replace(/\bcomputedEvidence\b/g, '');
  out = out.replace(/\bABSOLUTE_RULES\b/g, '');
  out = out.replace(/\bsectionId\b/g, '');
  out = out.replace(/\bownerSection\b/g, '');
  out = out.replace(/\bmatchTokens?\b/g, '');
  out = out.replace(/\bevidenceBlocks?\b/g, '');
  out = out.replace(/\bvalidator\b/gi, '');
  out = out.replace(/\bvalidation\b/gi, '');
  out = out.replace(/\bissue\s+type\b/gi, '');
  out = out.replace(/\bREPAIR_MODE\b/g, '');
  out = out.replace(/\bJSON\s+schema\b/gi, '');
  return out;
}

// ============================================================
// applyCompatFinalSanitizers — 권장 순서로 체인
//   english → context → fatalism → deterministic → logleak → whitespace
// ============================================================
export function applyCompatFinalSanitizers(text: string, ctx: CompatSanitizeContext): string {
  let out = text;
  // 1) english element keys → 한글
  out = sanitizeEnglishElementKeys(out);
  // 2) unsupported user context (배우자/자녀 등 — 배우자궁 보존)
  out = sanitizeUnsupportedUserContext(out, ctx);
  // 3) relationship fatalism (운명·관계 단정·상대 마음)
  out = sanitizeRelationshipFatalism(out);
  // 4) deterministic relationship prediction (결혼/이혼/재회/이별)
  out = sanitizeDeterministicRelationshipPrediction(out);
  // 5) validator log leak (내부 토큰 제거)
  out = sanitizeValidatorLogLeak(out);
  // 6) 공백/구두점 정리
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.!?])/g, '$1').replace(/\n{3,}/g, '\n\n');
  return out;
}
