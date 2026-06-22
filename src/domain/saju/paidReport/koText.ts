// Paid Report — 한국어 텍스트 위생: 조사(이/가, 으로/로) 자동 선택 + 소스 텍스트의 영문 오행 한글화.
// 결정론·순수.

const EN_TO_KO: Record<string, string> = { wood: '목', fire: '화', earth: '토', metal: '금', water: '수' };
const EN_ELEMENT_RE = /\b(wood|fire|earth|metal|water)\b/gi;

/** 소스 분석 텍스트에 남은 영문 오행(wood/fire/earth/metal/water)을 한글(목/화/토/금/수)로 치환. */
export function koElements(text: string): string {
  if (!text) return text;
  return text.replace(EN_ELEMENT_RE, (m) => EN_TO_KO[m.toLowerCase()] ?? m);
}

/** 마지막 글자의 받침 코드(0=받침 없음, 8=ㄹ받침). 한글 음절이 아니면 -1. */
function lastBatchim(word: string): number {
  const w = (word ?? '').trim();
  if (!w) return -1;
  const c = w.charCodeAt(w.length - 1);
  if (c < 0xac00 || c > 0xd7a3) return -1;
  return (c - 0xac00) % 28;
}

/** "<word>이"/"<word>가" — 받침 있으면 이, 없으면 가. 비한글이면 "(이)가" 보수적 표기. */
export function iGa(word: string): string {
  const b = lastBatchim(word);
  if (b === -1) return `${word}(이)가`;
  return `${word}${b === 0 ? '가' : '이'}`;
}

/** "<word>으로"/"<word>로" — 받침 없음 또는 ㄹ받침이면 로, 그 외 으로. */
export function euRo(word: string): string {
  const b = lastBatchim(word);
  if (b === -1) return `${word}(으)로`;
  return `${word}${b === 0 || b === 8 ? '로' : '으로'}`;
}
