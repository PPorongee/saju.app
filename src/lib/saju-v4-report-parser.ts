// GPT 응답 markdown → 섹션별 분리.
// spec §12 출력 구조를 가정하되, 헤더가 약간 달라도 키워드 매칭으로 강건하게.
//
// 입력: GPT가 반환한 markdown text (# 헤더로 6개 섹션)
// 출력: 각 섹션의 본문 텍스트 + 평범하지 않은 이유 N개 + 10문항 답 N개 + 3년 흐름 N개

export interface ParsedReport {
  summary: string;
  identityKeywords: Array<{ title: string; body: string }>;
  specialReasons: Array<{ title: string; body: string }>;
  lifeWeapons: Array<{ title: string; body: string }>;
  lifeTraps: Array<{ title: string; body: string }>;
  fortuneActivating: Array<{ title: string; body: string }>;
  fortuneBlocking: Array<{ title: string; body: string }>;
  questions: Array<{ number: number; title: string; body: string }>;
  nextThreeYears: Array<{ title: string; body: string }>;
  practicalGuide: string;
  finalMessage: string;
}

const SECTION_KEYWORDS = [
  { key: 'summary',           patterns: ['전체 요약', '요약'] },
  { key: 'identityKeywords',  patterns: ['나만의 사주 키워드', '사주 키워드', '키워드 5개'] },
  { key: 'specialReasons',    patterns: ['평범하지 않은', '특별한 이유', '이 사주가 평범'] },
  { key: 'lifeWeapons',       patterns: ['내 사주의 무기', '사주의 무기', '나의 무기'] },
  { key: 'lifeTraps',         patterns: ['내 사주의 함정', '사주의 함정', '나의 함정'] },
  { key: 'fortuneTriggers',   patterns: ['운이 살아나는 선택', '운을 막는 선택', '운 트리거'] },
  { key: 'questions',         patterns: ['질문별', '10가지 질문', '상세 풀이'] },
  { key: 'nextThreeYears',    patterns: ['앞으로 3년', '3년의 흐름', '3년간'] },
  { key: 'practicalGuide',    patterns: ['좋게 쓰는', '실용', '현실적 방법'] },
  { key: 'finalMessage',      patterns: ['마지막 한 문장', '마지막', '한 문장으로'] },
] as const;
type SectionKey = typeof SECTION_KEYWORDS[number]['key'];

export function parseSajuReport(markdown: string): ParsedReport {
  const lines = markdown.split('\n');
  const sections: Record<SectionKey, string> = {
    summary: '', identityKeywords: '', specialReasons: '',
    lifeWeapons: '', lifeTraps: '', fortuneTriggers: '',
    questions: '', nextThreeYears: '', practicalGuide: '', finalMessage: '',
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
    }
    buf.push(line);
  }
  flush();

  // fortuneTriggers 섹션 안에 ## 운이 살아나는 선택 / ## 운을 막는 선택으로 분리
  const { activating, blocking } = splitFortuneTriggers(sections.fortuneTriggers);

  return {
    summary: sections.summary,
    identityKeywords: splitNumberedItems(sections.identityKeywords),
    specialReasons: splitNumberedItems(sections.specialReasons),
    lifeWeapons: splitNumberedItems(sections.lifeWeapons),
    lifeTraps: splitNumberedItems(sections.lifeTraps),
    fortuneActivating: activating,
    fortuneBlocking: blocking,
    questions: splitNumberedQuestions(sections.questions),
    nextThreeYears: splitYearItems(sections.nextThreeYears),
    practicalGuide: sections.practicalGuide,
    finalMessage: sections.finalMessage,
  };
}

/** fortuneTriggers 본문 안에서 "운이 살아나는 선택" / "운을 막는 선택" 두 그룹 분리 */
function splitFortuneTriggers(text: string): { activating: Array<{ title: string; body: string }>; blocking: Array<{ title: string; body: string }> } {
  if (!text.trim()) return { activating: [], blocking: [] };
  // ## 운이 살아나는 선택 / ## 운을 막는 선택 같은 sub-header로 분리
  const subRe = /^#{2,3}\s+(.+?)\s*$/gm;
  const positions: Array<{ idx: number; title: string }> = [];
  let mm: RegExpExecArray | null;
  while ((mm = subRe.exec(text)) !== null) {
    positions.push({ idx: mm.index, title: mm[1] });
  }
  let actText = '';
  let blkText = '';
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    const block = text.slice(start, end);
    if (positions[i].title.includes('살아나')) actText += '\n' + block;
    else if (positions[i].title.includes('막는') || positions[i].title.includes('막힘')) blkText += '\n' + block;
  }
  if (!actText && !blkText) {
    // sub-header가 없으면 전체를 activating으로
    return { activating: splitNumberedItems(text), blocking: [] };
  }
  return {
    activating: splitNumberedItems(actText),
    blocking: splitNumberedItems(blkText),
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
