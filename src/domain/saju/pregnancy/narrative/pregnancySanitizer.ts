// 임산부 모드 V4 — Sanitizer (Phase 5)
//
// 역할:
//   - LLM이 ABSOLUTE_RULES를 일부 어겼을 때 사용자 노출 전에 텍스트 단위로 안전화.
//   - 의료/출산 민감 issue(medical/birth-risk/gender/birth-date/child-personality/mother-blame/
//     fatalism/english/validator-log)를 사후 한 번 더 막는다.
//   - 각 sanitizer는 단일 책임. text → text.
//   - 단어 치환만 한다. 새 명리 요소를 만들지 않는다.
//   - 고정 안내문(PREGNANCY_DISCLAIMER) 보장은 ensurePregnancyDisclaimer + 리포트 필드로 이중 보장.
//
// 주의: sanitizer는 best-effort 방어선이고, 최종 게이트는 validator(highCount 0).

import { PREGNANCY_DISCLAIMER } from './pregnancyNarrativeTypes';

// ============================================================
// 1) sanitizeMedicalAdvice — 의료/건강/약/영양/치료/병원대체 → 정서·생활 톤
// ============================================================
export function sanitizeMedicalAdvice(text: string): string {
  let out = text;
  // 병원/의사 대체 표현
  out = out.replace(/(?:병원|의사|의료진)\s*(?:말|판단|진료)?\s*(?:대신|보다)\s*[가-힣\s]*?사주[가-힣\s]*?(?:따르|믿|보)(?:세요|면\s*됩니다|는\s*게\s*좋아요)/g, '건강·분만에 관한 판단은 반드시 담당 의료진의 안내를 따르세요');
  out = out.replace(/(?:병원|의사|의료진)\s*(?:에)?\s*가지\s*말고/g, '의료진의 안내를 따르되');
  // 약/영양제/치료 처방
  out = out.replace(/(?:영양제|약|보약|한약)\s*(?:을|를)?\s*(?:꼭|반드시)?\s*(?:챙겨\s*)?(?:드세요|먹(?:어요|으세요|는\s*게\s*좋아요)|복용하세요)/g, '몸과 마음을 편안하게 돌보세요');
  out = out.replace(/(?:치료|처방|진단)(?:을|를)?\s*(?:받(?:으세요|는\s*게\s*좋아요)|해야\s*합니다)/g, '관련 부분은 담당 의료진과 상의하세요');
  // 식단/운동 처방
  out = out.replace(/(?:매일|하루)\s*\d+\s*(?:분|시간)\s*(?:이상\s*)?(?:걷기|운동|산책)\s*(?:운동\s*)?(?:을|를)?\s*(?:하세요|해야\s*합니다)/g, '무리하지 않는 선에서 가볍게 몸을 움직여 보세요');
  return out;
}

// ============================================================
// 2) sanitizeBirthHealthAndGender — 태아 건강/조산/유산/분만위험/성별 예측 제거
// ============================================================
export function sanitizeBirthHealthAndGender(text: string): string {
  let out = text;
  // 건강/순산/난산 단정
  out = out.replace(/(?:아기|아이|태아)(?:는|가)?\s*(?:반드시|틀림없이|분명히)?\s*건강(?:하게)?\s*(?:태어(?:납니다|날\s*거예요)|자랍니다)/g, '아이에 대한 건강은 담당 의료진의 안내를 따라주세요');
  out = out.replace(/순산(?:합니다|할\s*거예요|하게\s*됩니다|입니다)/g, '분만에 관한 부분은 담당 의료진과 상의하세요');
  out = out.replace(/난산(?:합니다|할\s*거예요|이\s*예상됩니다|입니다)/g, '분만에 관한 부분은 담당 의료진과 상의하세요');
  out = out.replace(/출산(?:이)?\s*(?:힘들|어렵|위험)(?:습니다|어요|을\s*수)/g, '분만에 관한 부분은 담당 의료진과 상의하세요');
  // 조산/유산
  out = out.replace(/(?:조산|유산|早産|流産)\s*(?:위험|가능성|우려)?(?:가\s*있습니다|이\s*있습니다|할\s*수\s*있습니다|합니다)?/g, '관련 건강 사항은 담당 의료진의 안내를 따르세요');
  out = out.replace(/(?:조산|유산)(?:이|가)?\s*(?:걱정|우려)(?:됩니다|돼요)/g, '관련 건강 사항은 담당 의료진의 안내를 따르세요');
  // 성별 예측 (명시 + 암시: 남아/여아, 공주님/왕자님)
  out = out.replace(/(?:아기|아이|태아)(?:는|가)?\s*(?:아마)?\s*(?:아들|딸|남자아이|여자아이|남아|여아)(?:입니다|일\s*거예요|예요|이에요|로\s*보입니다)/g, '성별은 사주로 알 수 없는 부분이에요');
  out = out.replace(/성별(?:은|이)?\s*[가-힣\s]*?(?:아들|딸|남아|여아)[가-힣\s]*?(?:입니다|예요|로\s*보입니다)/g, '성별은 사주로 알 수 없는 부분이에요');
  out = out.replace(/공주님?|왕자님?/g, '아이');
  return out;
}

// ============================================================
// 3) sanitizeBirthDateDetermination — 출산일 결정/추천/택일 제거
// ============================================================
export function sanitizeBirthDateDetermination(text: string): string {
  let out = text;
  out = out.replace(/(?:이|그|해당)\s*날(?:짜)?\s*(?:에)?\s*낳으(?:면|시면)\s*(?:좋|나쁘|안\s*좋)[가-힣]*/g, '출산일은 담당 의료진의 판단을 우선해 주세요');
  out = out.replace(/(?:최고의|가장\s*좋은|최적의)\s*출산일/g, '출산일에 대한 참고 정보');
  out = out.replace(/(?:이|그|해당)\s*날(?:짜)?(?:은|는)\s*(?:피하|피해야)[가-힣]*/g, '출산일은 담당 의료진의 판단을 우선해 주세요');
  out = out.replace(/택일(?:을|를)?\s*(?:해\s*드립니다|추천(?:합니다|해\s*드립니다)|해드릴게요)?/g, '출산일은 담당 의료진과 상의하세요');
  out = out.replace(/(?:\d{1,2}월\s*\d{1,2}일|며칠)에\s*낳(?:으세요|는\s*게\s*좋아요|아야\s*합니다)/g, '출산일은 담당 의료진의 판단을 우선해 주세요');
  return out;
}

// ============================================================
// 4) sanitizeDeterministicChildPersonality — 아이 성격/운명 단정 → 예정일 기준 결
// ============================================================
export function sanitizeDeterministicChildPersonality(text: string): string {
  let out = text;
  out = out.replace(/(?:이|그)\s*아(?:이|기)는?\s*(?:반드시|틀림없이|분명히|꼭)\s*([가-힣\s]+?)(?:한\s*)?성격(?:입니다|이에요|이\s*됩니다|으로\s*자랍니다)/g, '출생예정일 기준으로 보면 $1 결이 보일 수 있어요');
  out = out.replace(/(?:이|그)\s*아(?:이|기)는?\s*커서\s*(?:반드시|틀림없이)?\s*([가-힣\s]+?)(?:가|이)\s*(?:됩니다|될\s*것입니다|돼요)/g, '출생예정일 기준으로 보면 그런 결의 가능성도 보여요');
  out = out.replace(/(?:천재|영재|대박)\s*(?:아이|아기|사주)(?:입니다|예요|네요)?/g, '고유한 결을 지닌 아이로 보여요');
  return out;
}

// ============================================================
// 5) sanitizeMotherBlame — 엄마 탓으로 들리는 표현 완화
// ============================================================
export function sanitizeMotherBlame(text: string): string {
  let out = text;
  out = out.replace(/엄마(?:가|의\s*기운이|때문에)\s*[가-힣\s]*?(?:아이|아기)(?:에게|한테)\s*(?:안\s*좋|나쁘|해롭|악영향)[가-힣]*/g, '엄마가 편안할수록 아이에게도 그 편안함이 전해져요');
  out = out.replace(/엄마\s*탓(?:입니다|이에요|으로)/g, '누구의 탓도 아니에요');
  out = out.replace(/엄마가\s*(?:잘못|부족)(?:해서|하면)\s*[가-힣\s]*?(?:아이|아기)[가-힣\s]*?(?:힘들|나쁘)[가-힣]*/g, '엄마가 자신을 먼저 돌보는 것이 아이에게도 도움이 돼요');
  return out;
}

// ============================================================
// 6) sanitizeFatalism — 운명/반드시/무조건/100%
// ============================================================
export function sanitizeFatalism(text: string): string {
  let out = text;
  out = out.replace(/운명(?:적인|의)?\s*(?:입니다|이에요)/g, '하나의 흐름으로 볼 수 있어요');
  out = out.replace(/전생(?:부터)?(?:의)?\s*인연(?:입니다|이에요)?/g, '귀한 인연');
  out = out.replace(/아(?:기|이)가\s*엄마를\s*(?:선택했|골랐)[가-힣]*/g, '엄마에게 다가오는');
  out = out.replace(/반드시\s*/g, '');
  out = out.replace(/무조건\s*/g, '');
  out = out.replace(/틀림없이\s*/g, '');
  out = out.replace(/필연적으로\s*/g, '');
  out = out.replace(/100\s*%\s*/g, '대체로 ');
  return out;
}

// ============================================================
// 6b) sanitizeAwkwardPhrasing — 신뢰도 떨어뜨리는 어색한 표현 교정
//     · 오행 + "결과" → 오행 + "기운"  (예: "화 결과" → "화 기운")
//     · "옅기 쉬운" → "약하게 흐르기 쉬운"
//     · "강한 편의 기운" → "기운이 강한 편"
// ============================================================
export function sanitizeAwkwardPhrasing(text: string): string {
  let out = text;
  // 오행 단독 토큰(앞이 공백/괄호/문장부호일 때) + 결과 → 기운. "변화 결과" 오탐 방지.
  out = out.replace(/(^|[\s(>·,])([목화토금수])\s*결과(?![가-힣])/g, '$1$2 기운');
  out = out.replace(/옅기\s*쉬운/g, '약하게 흐르기 쉬운');
  out = out.replace(/강한\s*편의\s*기운/g, '기운이 강한 편');
  out = out.replace(/여린\s*편의\s*기운/g, '기운이 여린 편');
  // 막연한 일반론 → 덜 진부한 표현 (의미 손실 최소)
  out = out.replace(/긍정적인?\s*에너지/g, '밝은 기운');
  return out;
}

// ============================================================
// 7) sanitizeEnglishElementKeys
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
// 8) sanitizeValidatorLogLeak — 내부 토큰 제거
// ============================================================
export function sanitizeValidatorLogLeak(text: string): string {
  let out = text;
  // fact id 접두사 (oc-/mech-/comf-/baby-/tg-/fr-/fam-)
  out = out.replace(/\[(oc|mech|comf|baby|tg|fr|fam)-[a-zA-Z0-9가-힣\-_]+\]\s*/g, '');
  out = out.replace(/\b(oc|mech|comf|baby|tg|fr|fam)-[a-zA-Z0-9\-_]+/g, '');
  // sectionId 값
  out = out.replace(/\b(motherBabyCard|openingConnection|motherChildMechanism|motherComfortRhythm|babyEnergyAndFit|taegyoGuide|motherFortuneRoutine|familySupportAndFinalMessage|babyNames|evidenceView)\b/g, '');
  // 내부 schema 토큰
  out = out.replace(/\bmustUseFacts?\b/g, '');
  out = out.replace(/\bcomputedEvidence\b/g, '');
  out = out.replace(/\bABSOLUTE_RULES\b/g, '');
  out = out.replace(/\bsectionId\b/g, '');
  out = out.replace(/\bownerSection\b/g, '');
  out = out.replace(/\bmatchTokens?\b/g, '');
  out = out.replace(/\bevidenceBlocks?\b/g, '');
  out = out.replace(/\bfinalMessage\b/g, '');
  out = out.replace(/\bvalidator\b/gi, '');
  out = out.replace(/\bvalidation\b/gi, '');
  out = out.replace(/\bREPAIR_MODE\b/g, '');
  out = out.replace(/\bJSON\s+schema\b/gi, '');
  return out;
}

// ============================================================
// applyPregnancyFinalSanitizers — 권장 순서 체인
//   english → medical → birth/gender → birthdate → child-personality → mother-blame → fatalism → logleak → whitespace
// ============================================================
export function applyPregnancyFinalSanitizers(text: string): string {
  let out = text;
  out = sanitizeEnglishElementKeys(out);
  out = sanitizeMedicalAdvice(out);
  out = sanitizeBirthHealthAndGender(out);
  out = sanitizeBirthDateDetermination(out);
  out = sanitizeDeterministicChildPersonality(out);
  out = sanitizeMotherBlame(out);
  out = sanitizeFatalism(out);
  out = sanitizeAwkwardPhrasing(out);
  out = sanitizeValidatorLogLeak(out);
  out = out.replace(/[ \t]{2,}/g, ' ').replace(/ +([,.!?])/g, '$1').replace(/\n{3,}/g, '\n\n');
  return out.trim();
}

// ============================================================
// ensurePregnancyDisclaimer — 고정 안내문 보장 (리포트 disclaimer 필드용)
// ============================================================
export function ensurePregnancyDisclaimer(disclaimer?: string): string {
  const d = (disclaimer ?? '').trim();
  return d.includes('출생예정일 기준') && d.includes('의료진') ? d : PREGNANCY_DISCLAIMER;
}
