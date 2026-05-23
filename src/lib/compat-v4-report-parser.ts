// 궁합 v4 GPT 응답 markdown 파서.
// 11개 섹션 (# 1. ~ # 11.) → 구조화된 객체.

export interface ParsedCompatReport {
  relationshipCard: string;
  archetype: string;
  overview: string;
  keywords: Array<{ title: string; body: string }>;
  attraction: string;
  conflict: string;
  fortuneActivating: Array<{ title: string; body: string }>;
  fortuneBlocking: Array<{ title: string; body: string }>;
  questions: Array<{ number: number; title: string; body: string }>;
  futureFlow: Array<{ title: string; body: string }>;
  practicalGuide: string;
  evidence: string;
}

const SECTION_KEYWORDS = [
  { key: 'relationshipCard', patterns: ['관계 원국', '관계 원국 카드', '원국 카드'] },
  { key: 'archetype',        patterns: ['이 관계의 이름', '관계의 이름'] },
  { key: 'overview',         patterns: ['한눈에 보기', '핵심 한눈'] },
  { key: 'keywords',         patterns: ['궁합 키워드', '두 사람의 궁합 키워드'] },
  { key: 'attraction',       patterns: ['끌리는 이유', '이 관계가 끌리는'] },
  { key: 'conflict',         patterns: ['부딪히는 지점', '반복해서 부딪'] },
  { key: 'choices',          patterns: ['관계를 살리는 선택', '관계를 망치는 선택', '살리는 선택', '망치는 선택'] },
  { key: 'questions',        patterns: ['10가지 질문', '질문별', '관계 유형별'] },
  { key: 'futureFlow',       patterns: ['앞으로 3년, 관계', '3년, 관계', '관계 흐름'] },
  { key: 'practicalGuide',   patterns: ['현실 전략', '잘 쓰는 현실'] },
  { key: 'evidence',         patterns: ['명리 근거'] },
] as const;
type SectionKey = typeof SECTION_KEYWORDS[number]['key'];

export function parseCompatReport(markdown: string): ParsedCompatReport {
  const lines = markdown.split('\n');
  const sections: Record<SectionKey, string> = {
    relationshipCard: '', archetype: '', overview: '', keywords: '',
    attraction: '', conflict: '', choices: '', questions: '',
    futureFlow: '', practicalGuide: '', evidence: '',
  };
  let cur: SectionKey | null = null;
  const buf: string[] = [];
  function flush() {
    if (cur) sections[cur] = (sections[cur] + '\n' + buf.join('\n')).trim();
    buf.length = 0;
  }
  for (const line of lines) {
    const m = /^#{1,2}\s+(?:\d+\.\s+)?(.+?)\s*$/.exec(line);
    if (m) {
      const heading = m[1];
      const matched = SECTION_KEYWORDS.find(s => s.patterns.some(p => heading.includes(p)));
      if (matched) {
        flush();
        cur = matched.key;
        continue;
      }
    }
    buf.push(line);
  }
  flush();

  // choices 안에서 살리는/망치는 분리
  const { activating, blocking } = splitChoices(sections.choices);

  return {
    relationshipCard: sections.relationshipCard,
    archetype: sections.archetype,
    overview: sections.overview,
    keywords: splitNumberedItems(sections.keywords),
    attraction: sections.attraction,
    conflict: sections.conflict,
    fortuneActivating: activating,
    fortuneBlocking: blocking,
    questions: splitNumberedQuestions(sections.questions),
    futureFlow: splitYearItems(sections.futureFlow),
    practicalGuide: sections.practicalGuide,
    evidence: sections.evidence,
  };
}

function splitChoices(text: string): { activating: Array<{ title: string; body: string }>; blocking: Array<{ title: string; body: string }> } {
  if (!text.trim()) return { activating: [], blocking: [] };
  const subRe = /^#{2,3}\s+(.+?)\s*$/gm;
  const positions: Array<{ idx: number; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = subRe.exec(text)) !== null) {
    positions.push({ idx: m.index, title: m[1] });
  }
  let actText = '';
  let blkText = '';
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    const block = text.slice(start, end);
    if (positions[i].title.includes('살리')) actText += '\n' + block;
    else if (positions[i].title.includes('망치') || positions[i].title.includes('막')) blkText += '\n' + block;
  }
  if (!actText && !blkText) return { activating: splitNumberedItems(text), blocking: [] };
  return {
    activating: splitNumberedItems(actText),
    blocking: splitNumberedItems(blkText),
  };
}

function splitNumberedItems(text: string): Array<{ title: string; body: string }> {
  if (!text.trim()) return [];
  const headerRe = /^#{2,}\s*\d+[.)]\s*(.+?)\s*$/gm;
  const positions: Array<{ idx: number; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(text)) !== null) {
    positions.push({ idx: m.index, title: m[1] });
  }
  if (positions.length === 0) return [{ title: '', body: text.trim() }];
  const items: Array<{ title: string; body: string }> = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    const block = text.slice(start, end);
    const bodyMatch = /^#{2,}\s*\d+[.)]\s*.+?\n([\s\S]*)$/m.exec(block);
    items.push({ title: positions[i].title.trim(), body: bodyMatch ? bodyMatch[1].trim() : '' });
  }
  return items;
}

function splitNumberedQuestions(text: string): Array<{ number: number; title: string; body: string }> {
  if (!text.trim()) return [];
  return splitNumberedItems(text).map((it, idx) => ({ number: idx + 1, title: it.title, body: it.body }));
}

function splitYearItems(text: string): Array<{ title: string; body: string }> {
  if (!text.trim()) return [];
  const headerRe = /^#{2,}\s*(20\d{2}(년|).*?)$/gm;
  const positions: Array<{ idx: number; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(text)) !== null) {
    positions.push({ idx: m.index, title: m[1].trim() });
  }
  if (positions.length === 0) {
    const items = splitNumberedItems(text);
    return items.length ? items : [{ title: '', body: text.trim() }];
  }
  const items: Array<{ title: string; body: string }> = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    const block = text.slice(start, end);
    const bodyMatch = /^#{2,}\s*.+?\n([\s\S]*)$/m.exec(block);
    items.push({ title: positions[i].title, body: bodyMatch ? bodyMatch[1].trim() : '' });
  }
  return items;
}
