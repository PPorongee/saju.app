// GPT 응답 markdown → 섹션별 분리.
// spec §12 출력 구조를 가정하되, 헤더가 약간 달라도 키워드 매칭으로 강건하게.
//
// 입력: GPT가 반환한 markdown text (# 헤더로 6개 섹션)
// 출력: 각 섹션의 본문 텍스트 + 평범하지 않은 이유 N개 + 10문항 답 N개 + 3년 흐름 N개

export interface ParsedReport {
  summary: string;
  specialReasons: Array<{ title: string; body: string }>;
  questions: Array<{ number: number; title: string; body: string }>;
  nextThreeYears: Array<{ title: string; body: string }>;
  practicalGuide: string;
  finalMessage: string;
}

const SECTION_KEYWORDS = [
  { key: 'summary',         patterns: ['전체 요약', '요약'] },
  { key: 'specialReasons',  patterns: ['평범하지 않은', '특별한 이유', '이 사주가 평범'] },
  { key: 'questions',       patterns: ['질문별', '10가지 질문', '상세 풀이'] },
  { key: 'nextThreeYears',  patterns: ['앞으로 3년', '3년의 흐름', '3년간'] },
  { key: 'practicalGuide',  patterns: ['좋게 쓰는', '실용', '현실적 방법'] },
  { key: 'finalMessage',    patterns: ['마지막 한 문장', '마지막', '한 문장으로'] },
] as const;
type SectionKey = typeof SECTION_KEYWORDS[number]['key'];

export function parseSajuReport(markdown: string): ParsedReport {
  // # 또는 ## 헤더로 분리. lookahead로 헤더 위치만 잡고 본문은 그 사이.
  const lines = markdown.split('\n');
  const sections: Record<SectionKey, string> = {
    summary: '', specialReasons: '', questions: '',
    nextThreeYears: '', practicalGuide: '', finalMessage: '',
  };
  let currentKey: SectionKey | null = null;
  const buf: string[] = [];

  function flush() {
    if (currentKey) {
      sections[currentKey] = (sections[currentKey] + '\n' + buf.join('\n')).trim();
    }
    buf.length = 0;
  }

  for (const line of lines) {
    const m = /^#{1,2}\s+(.+?)\s*$/.exec(line);
    if (m) {
      const heading = m[1];
      const matched = SECTION_KEYWORDS.find(s => s.patterns.some(p => heading.includes(p)));
      if (matched) {
        flush();
        currentKey = matched.key;
        continue;
      }
      // 알 수 없는 # 헤더는 현재 섹션의 본문으로 (예: ## N. 제목)
    }
    buf.push(line);
  }
  flush();

  return {
    summary: sections.summary,
    specialReasons: splitNumberedItems(sections.specialReasons),
    questions: splitNumberedQuestions(sections.questions),
    nextThreeYears: splitYearItems(sections.nextThreeYears),
    practicalGuide: sections.practicalGuide,
    finalMessage: sections.finalMessage,
  };
}

/** "## 1. 제목\n본문\n## 2. 제목\n본문" → [{title, body}] */
function splitNumberedItems(text: string): Array<{ title: string; body: string }> {
  if (!text.trim()) return [];
  const parts = text.split(/\n#{2,}\s*\d+[.)]\s*/);
  // 첫 분할 결과는 첫 번째 헤더 앞 텍스트
  // 헤더 매칭으로 다시 — 더 안전: 정규식으로 모든 헤더 위치 잡기
  const headerRe = /^#{2,}\s*\d+[.)]\s*(.+?)\s*$/gm;
  const items: Array<{ title: string; body: string }> = [];
  const positions: Array<{ idx: number; title: string }> = [];
  let mm: RegExpExecArray | null;
  while ((mm = headerRe.exec(text)) !== null) {
    positions.push({ idx: mm.index, title: mm[1] });
  }
  if (positions.length === 0) {
    // 헤더 못 잡으면 전체를 하나로
    return [{ title: '', body: text.trim() }];
  }
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    const block = text.slice(start, end);
    const bodyMatch = /^#{2,}\s*\d+[.)]\s*.+?\n([\s\S]*)$/m.exec(block);
    items.push({
      title: positions[i].title.trim(),
      body: bodyMatch ? bodyMatch[1].trim() : '',
    });
  }
  void parts;
  return items;
}

/** 10문항 — "1. 나는 어떤 기질을 ..." 식 매칭 */
function splitNumberedQuestions(text: string): Array<{ number: number; title: string; body: string }> {
  if (!text.trim()) return [];
  const items = splitNumberedItems(text);
  return items.map((it, idx) => ({ number: idx + 1, title: it.title, body: it.body }));
}

/** 연도 헤더 — "## 2026" 형태 */
function splitYearItems(text: string): Array<{ title: string; body: string }> {
  if (!text.trim()) return [];
  const headerRe = /^#{2,}\s*(20\d{2}(년|).*?)$/gm;
  const positions: Array<{ idx: number; title: string }> = [];
  let mm: RegExpExecArray | null;
  while ((mm = headerRe.exec(text)) !== null) {
    positions.push({ idx: mm.index, title: mm[1].trim() });
  }
  if (positions.length === 0) {
    // 연도 헤더가 없으면 splitNumberedItems로 fallback
    const items = splitNumberedItems(text);
    return items.length > 0 ? items : [{ title: '', body: text.trim() }];
  }
  const items: Array<{ title: string; body: string }> = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    const block = text.slice(start, end);
    const bodyMatch = /^#{2,}\s*.+?\n([\s\S]*)$/m.exec(block);
    items.push({
      title: positions[i].title,
      body: bodyMatch ? bodyMatch[1].trim() : '',
    });
  }
  return items;
}
