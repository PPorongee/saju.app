// 서사형 GPT 응답(markdown) 파서 — 2026-05 신구조.
// 7섹션 + 옵션 미래 흐름.
//   # 1. openingDefinition           - 이 사주를 한 문장으로 말하면
//   # 2. lifeStructureNarrative      - 당신이 이런 방식으로 살아온 이유
//   # 3. repeatedPatternNarrative    - 반복해서 찾아오는 삶의 패턴
//   # 4. careerTalentNarrative       - 일과 재능
//   # 5. moneyMonetizationNarrative  - 돈과 수익화
//   # 6. relationshipLoveNarrative   - 관계와 연애
//   # 7. finalStrategyNarrative      - 결국 이 사주는 이렇게 써야 해요
// includeFutureFlow=true이면 미래 장(### 2026 / ### 2027 / ### 2028) 헤더가
// 어느 본문 섹션 안에 ### 헤더로 등장할 수 있으므로 별도 추출 처리.

export interface ParsedNarrativeReport {
  openingDefinition: string;
  lifeStructureNarrative: string;
  repeatedPatternNarrative: string;
  careerTalentNarrative: string;
  moneyMonetizationNarrative: string;
  relationshipLoveNarrative: string;
  finalStrategyNarrative: string;
  /** 옵션 — 미래 3년 장 (별 헤더 ### 20XX로 분리) */
  futureFlowNarrative?: {
    intro: string;
    years: Array<{ year: number; body: string }>;
  };
}

const SECTION_KEYS = [
  'openingDefinition',
  'lifeStructureNarrative',
  'repeatedPatternNarrative',
  'careerTalentNarrative',
  'moneyMonetizationNarrative',
  'relationshipLoveNarrative',
  'finalStrategyNarrative',
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

  // futureFlow 옵션 — 본문 어디에 ### 20XX 헤더가 있으면 별도 추출
  const futureFlow = extractFutureFlow(markdown);

  return {
    openingDefinition: sections['openingDefinition'] ?? '',
    lifeStructureNarrative: sections['lifeStructureNarrative'] ?? '',
    repeatedPatternNarrative: sections['repeatedPatternNarrative'] ?? '',
    careerTalentNarrative: sections['careerTalentNarrative'] ?? '',
    moneyMonetizationNarrative: sections['moneyMonetizationNarrative'] ?? '',
    relationshipLoveNarrative: sections['relationshipLoveNarrative'] ?? '',
    finalStrategyNarrative: sections['finalStrategyNarrative'] ?? '',
    futureFlowNarrative: futureFlow,
  };
}

/** futureFlow 별도 추출 — "# N. 앞으로 3년..." 또는 "### 20XX" 헤더로 인식 */
function extractFutureFlow(markdown: string): ParsedNarrativeReport['futureFlowNarrative'] | undefined {
  // (a) # N. 앞으로 ... 헤더가 있으면 그 섹션 본문에서 연도 추출
  const futureHeader = /^#\s+\d+\.\s+(?:앞으로|3년|미래).+$/m.exec(markdown);
  let chunk = '';
  if (futureHeader) {
    const start = futureHeader.index;
    const after = markdown.slice(start);
    const nextHeader = /\n#\s+\d+\.\s+/m.exec(after);
    chunk = nextHeader ? after.slice(0, nextHeader.index) : after;
  } else {
    // (b) ### 20XX 헤더가 본문 어딘가에 있으면 그 영역만
    const yearMatch = /^#{2,}\s*(20\d{2})/m.exec(markdown);
    if (!yearMatch) return undefined;
    chunk = markdown.slice(yearMatch.index);
  }
  return splitYearItems(chunk);
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
