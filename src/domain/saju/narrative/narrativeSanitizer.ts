// narrative output sanitizer (2026-05 stabilize 연장).
// GPT 응답에 남은 영문 오행 키와 미래 단어를 deterministic하게 제거/치환.
// 코드 블록 ``` 내부는 보호.

const ELEMENT_KO: Record<string, string> = {
  wood: '목', fire: '화', earth: '토', metal: '금', water: '수',
};

// 주의: 한국어 문자는 \b(word boundary)에 잡히지 않으므로 \b 제거.
// 영문/숫자 경계가 필요한 패턴(예: 연도)만 \b 유지.
const FUTURE_LEAK_PATTERNS: RegExp[] = [
  /앞으로\s*3년/g,
  /향후\s*3년/g,
  /다음\s*3년/g,
  /미래\s*흐름/g,
  /세운(?!이라는|을\s*뜻)/g, // 세운 자체 단어. "세운이라는/뜻"같은 풀이형은 통과
  /\b\d{4}년(?:\s*상반기|\s*하반기)?/g, // 2026년 / 2027년 등 (숫자 시작이라 \b OK)
];

// ============================================================
// 영문 오행 키 → 한글 치환
// 코드 블록(```...```) 내부는 건드리지 않음.
// ============================================================
export function sanitizeNarrativeText(text: string): string {
  return mapOutsideCodeBlocks(text, body => {
    let out = body;
    for (const [eng, ko] of Object.entries(ELEMENT_KO)) {
      // 단어 경계 + 대소문자 무관
      const re = new RegExp(`\\b${eng}\\b`, 'gi');
      out = out.replace(re, ko);
    }
    return out;
  });
}

// ============================================================
// 미래 단어 leak 제거 — 패턴이 들어있는 문장 단위 삭제
// 너무 공격적이지 않게: 패턴이 들어있는 "한 문장"(마침표·물음표·줄바꿈 기준)만 삭제
// ============================================================
export function stripFutureLeaks(text: string): string {
  return mapOutsideCodeBlocks(text, body => {
    // 문장 분할: . ! ? 또는 두 줄 이상 줄바꿈
    const parts = body.split(/(?<=[.!?])\s+|\n{2,}/);
    const kept = parts.filter(s => {
      for (const re of FUTURE_LEAK_PATTERNS) {
        re.lastIndex = 0;
        if (re.test(s)) return false;
      }
      return true;
    });
    return kept.join(' ');
  });
}

// ============================================================
// 최종 deterministic fallback — sanitize + future strip 동시 적용
// repair 이후에도 high가 남으면 이 fallback으로 사용자 노출 직전 한 번 더 정리.
// ============================================================
export function applyFinalSanitizers(text: string, opts: { stripFuture: boolean }): string {
  let out = sanitizeNarrativeText(text);
  if (opts.stripFuture) out = stripFutureLeaks(out);
  return out;
}

// ============================================================
// 코드 블록 외부에서만 변환 적용 (코드 블록 내부는 원형 유지)
// ============================================================
function mapOutsideCodeBlocks(text: string, fn: (body: string) => string): string {
  const re = /```[\s\S]*?```/g;
  let last = 0;
  let out = '';
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    out += fn(text.slice(last, m.index));
    out += m[0];
    last = m.index + m[0].length;
  }
  out += fn(text.slice(last));
  return out;
}
