// 결과 영어화 — 번역 레이어.
//
// 정책(사용자 선택): 생성된 한국어 사주 결과를 lang='en'일 때 GPT로 영어 번역해 보여준다.
// 4개 기능(개인사주/궁합/올해운세/태교) 공통으로 쓰는 순수 번역 헬퍼.
//   - 마크다운 구조(## 헤더, 줄바꿈)와 의미를 보존한다. 내용 추가/삭제 금지.
//   - 사주 용어는 영어 + (한자/로마자) 병기로 자연스럽게.
//   - 친근한 2인칭 톤 유지.
//   - 실패/빈 응답 시 원문(한국어)을 그대로 반환 — never throws (영어 안 나와도 깨지지 않게).

import type { GptCaller } from '../generatePersonalSajuReport';

// 사주 용어 영어 대응(프롬프트 주입용 글로서리) — 일관성 확보.
const GLOSSARY = `- 일간 → Day Master (日干)
- 신강/신약 → strong / weak Day Master
- 용신 → Useful God (用神, yongsin), 희신 → Helpful God (喜神), 기신 → Unfavorable Element (忌神)
- 십성 → Ten Gods; 비겁 → Peers (比劫), 식상 → Output (食傷), 재성 → Wealth (財星), 관성 → Authority (官星), 인성 → Resource (印星)
- 오행 → Five Elements; 목/화/토/금/수 → Wood / Fire / Earth / Metal / Water
- 대운 → Major Luck Cycle (大運), 세운 → Annual Luck (歲運)
- 신살: 천을귀인 → Cheoneul Gwiin (天乙貴人, noble-helper star), 도화 → Dohwa (桃花, charm star), 홍염 → Hongyeom (紅艶), 역마 → Yeokma (驛馬, travel star), 화개 → Hwagae (華蓋), 양인 → Yangin (羊刃), 괴강 → Goegang (魁罡), 백호 → Baekho (白虎)
- 군겁쟁재 → competition over wealth (群劫爭財)`;

const SYSTEM_PROMPT = `You are a professional translator for "별빛 사주 (Starlight Saju)", a Korean Four Pillars (saju / myeongri) astrology service. Translate the given Korean reading into natural, warm, fluent English.

Rules (absolute):
1. Translate ALL Korean prose into English. Keep the casual, encouraging second-person voice (use "you / your").
2. Preserve markdown/structure exactly: keep "##" / "#" headers, blank lines, bullet markers, and line breaks in the same positions. Translate header text too.
3. Keep meaning faithful — do NOT add, remove, or invent content. No new claims.
4. Saju terms: render in English with the original term in parentheses on first mention, then English thereafter. Use this glossary for consistency:
${GLOSSARY}
5. Years (e.g. 2026년 → 2026), numbers, and proper nouns stay as-is.
6. Output ONLY the translated text. No preamble, no notes, no code fences.`;

/** 마크다운/줄글 한 덩어리를 영어로 번역. 실패 시 원문 반환. */
export async function translateMarkdownToEnglish(
  koText: string,
  callGpt: GptCaller,
): Promise<string> {
  const text = (koText ?? '').trim();
  if (!text) return koText;
  try {
    const out = await callGpt({
      system: SYSTEM_PROMPT,
      user: `Translate the following Korean saju reading into English. Keep all markdown structure.\n\n${text}`,
    });
    const trimmed = (out ?? '').trim();
    // 너무 짧으면(번역 실패/거부) 원문 유지.
    return trimmed.length >= Math.min(20, Math.floor(text.length * 0.2)) ? trimmed : koText;
  } catch {
    return koText;
  }
}

/**
 * 짧은 문자열 여러 개를 한 번의 호출로 영어 번역(섹션 제목·prose 본문·카드 verdict 등).
 * key→영문 JSON으로 받는다. 파싱 실패/누락 키는 원문 유지. never throws.
 */
export async function translateStringsToEnglish(
  koMap: Record<string, string>,
  callGpt: GptCaller,
): Promise<Record<string, string>> {
  const entries = Object.entries(koMap).filter(([, v]) => typeof v === 'string' && v.trim());
  if (entries.length === 0) return { ...koMap };
  const input: Record<string, string> = {};
  for (const [k, v] of entries) input[k] = v;

  try {
    const out = await callGpt({
      system: `${SYSTEM_PROMPT}\n\nThis time the input is a JSON object of {key: "<Korean text>"}. Translate every value into English following the rules. Return STRICT JSON of the same keys: {"<key>": "<English>", ...}. Output only the JSON object.`,
      user: JSON.stringify(input, null, 2),
    });
    const parsed = parseJsonObject(out);
    if (!parsed) return { ...koMap };
    const result: Record<string, string> = { ...koMap };
    for (const k of Object.keys(input)) {
      const v = parsed[k];
      if (typeof v === 'string' && v.trim()) result[k] = v.trim();
    }
    return result;
  } catch {
    return { ...koMap };
  }
}

function parseJsonObject(raw: string): Record<string, string> | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  try {
    const parsed = JSON.parse(text.slice(first, last + 1));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) if (typeof v === 'string') out[k] = v;
    return out;
  } catch {
    return null;
  }
}
