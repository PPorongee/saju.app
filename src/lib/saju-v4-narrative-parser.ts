// 서사형 GPT 응답(markdown) 파서 — 7섹션 (# 1. ~ # 7.).
// 각 섹션은 줄글 본문. 5번 섹션만 연도별 sub-header(### 2026 등) 분리.

export interface ParsedNarrativeReport {
  openingDefinition: string;          // # 1
  lifeStructureNarrative: string;     // # 2
  repeatedPatternNarrative: string;   // # 3
  realityActivationNarrative: string; // # 4
  futureFlowNarrative: {              // # 5
    intro: string;                    // 연도 헤더 전 본문
    years: Array<{ year: number; body: string }>;
  };
  finalStrategyNarrative: string;     // # 6
  finalLine: string;                  // # 7
}

const SECTION_KEYS = [
  'openingDefinition',
  'lifeStructureNarrative',
  'repeatedPatternNarrative',
  'realityActivationNarrative',
  'futureFlowNarrative',
  'finalStrategyNarrative',
  'finalLine',
] as const;

export function parseNarrativeReport(markdown: string): ParsedNarrativeReport {
  const sections: Record<string, string> = Object.fromEntries(SECTION_KEYS.map(k => [k, '']));
  const re = /^#\s+(\d+)\.\s+(.+)$/gm;
  const matches: Array<{ start: number; idx: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(markdown)) !== null) {
    matches.push({ start: m.index, idx: Number(m[1]) });
  }
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    if (cur.idx < 1 || cur.idx > 7) continue;
    const headerEnd = markdown.indexOf('\n', cur.start);
    const bodyStart = headerEnd >= 0 ? headerEnd + 1 : cur.start;
    const bodyEnd = next ? next.start : markdown.length;
    const body = markdown.slice(bodyStart, bodyEnd).trim();
    sections[SECTION_KEYS[cur.idx - 1]] = body;
  }

  // 5번 — 연도별 분리
  const futureRaw = sections['futureFlowNarrative'] ?? '';
  const futureFlowNarrative = splitYearItems(futureRaw);

  return {
    openingDefinition: sections['openingDefinition'] ?? '',
    lifeStructureNarrative: sections['lifeStructureNarrative'] ?? '',
    repeatedPatternNarrative: sections['repeatedPatternNarrative'] ?? '',
    realityActivationNarrative: sections['realityActivationNarrative'] ?? '',
    futureFlowNarrative,
    finalStrategyNarrative: sections['finalStrategyNarrative'] ?? '',
    finalLine: sections['finalLine'] ?? '',
  };
}

function splitYearItems(text: string): ParsedNarrativeReport['futureFlowNarrative'] {
  if (!text.trim()) return { intro: '', years: [] };
  const headerRe = /^#{2,}\s*(20\d{2})/gm;
  const positions: Array<{ idx: number; year: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = headerRe.exec(text)) !== null) {
    positions.push({ idx: m.index, year: Number(m[1]) });
  }
  if (positions.length === 0) return { intro: text.trim(), years: [] };
  const intro = text.slice(0, positions[0].idx).trim();
  const years: Array<{ year: number; body: string }> = [];
  for (let i = 0; i < positions.length; i++) {
    const start = positions[i].idx;
    const end = i + 1 < positions.length ? positions[i + 1].idx : text.length;
    const block = text.slice(start, end);
    const headerEnd = block.indexOf('\n');
    const body = headerEnd >= 0 ? block.slice(headerEnd + 1).trim() : '';
    years.push({ year: positions[i].year, body });
  }
  return { intro, years };
}
