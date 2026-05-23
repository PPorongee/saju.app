// 반복 표현·반복 조언 + 중요 섹션 구체성 검사 (spec §9, §10).
// 가벼운 휴리스틱: 섹션을 # 1. ~ # 10. 헤더로 분할 → 섹션별 검사.

import type { ValidationIssue, CareerSpecificAnalysis } from './sajuReportSchema';

// 섹션 ID와 헤더 매핑 (프롬프트 출력 구조 고정)
const SECTION_IDS = [
  'summary', 'keywords', 'specialPoints', 'lifeWeapons',
  'lifeTraps', 'fortuneChoices', 'questions', 'futureThreeYears',
  'practicalGuide', 'finalMessage',
] as const;
type SectionId = typeof SECTION_IDS[number];

// 구체성 검사 적용 섹션
const STRICT_SECTIONS: ReadonlySet<SectionId> = new Set([
  'lifeWeapons', 'lifeTraps', 'fortuneChoices',
  'questions', 'futureThreeYears', 'practicalGuide',
]);

// 단독 사용 금지 추상어 — 다음 문장에 구체 예시(쉼표·또는·괄호·콜론 후 단어)가 없으면 위반
const BANNED_STANDALONE_PHRASES: Array<{ phrase: string; explain: string }> = [
  { phrase: '창의적인 일', explain: '구체 업계·업무로 풀어쓰기' },
  { phrase: '사람을 상대하는 일', explain: '구체 직무·업계로 풀어쓰기' },
  { phrase: '안정적인 직업', explain: '구체 직군으로 풀어쓰기' },
  { phrase: '사업이 잘 맞', explain: '어떤 사업 형태인지 구체화' },
  { phrase: '돈을 조심', explain: '어떤 패턴으로 돈이 새는지 구체화' },
  { phrase: '인간관계 조심', explain: '어떤 관계 패턴인지 구체화' },
  { phrase: '좋은 기회', explain: '어떤 형태의 기회인지 구체화' },
  { phrase: '변화가 생', explain: '어떤 변화인지 구체화 (이사·이직·역할 변경 등)' },
  { phrase: '성장하는 시기', explain: '어떤 영역의 성장인지 구체화' },
  { phrase: '귀인이 있', explain: '어떤 형태의 도움인지 구체화' },
  { phrase: '책임감이 있', explain: '어떤 책임감이 어디서 발휘되는지 구체화' },
  { phrase: '예민하다', explain: '어떤 자극에 예민한지 구체화' },
  { phrase: '독립적이다', explain: '어떤 결정·자리에서 독립적인지 구체화' },
];

// 자주 중복되는 핵심 표현 — 3회 이상 등장하면 reposition issue
const REPEAT_WATCH_PHRASES = [
  '혼자 다 감당', '도움을 요청', '결과물을 밖으로', '버티는 힘',
  '기준이 분명', '책임이 커', '돈이 새', '한 번에 끊',
  '완벽주의', '시작이 늦',
];

// ============================================================
// 섹션 분할
// ============================================================

interface SectionBlock {
  id: SectionId;
  index: number;            // 1~10
  title: string;
  body: string;
}

export function splitSections(reportText: string): SectionBlock[] {
  // # 1. ~ # 10. 헤더 기준으로 분할
  const re = /^#\s+(\d+)\.\s+(.+)$/gm;
  const matches: Array<{ start: number; index: number; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(reportText)) !== null) {
    matches.push({ start: m.index, index: Number(m[1]), title: m[2].trim() });
  }
  const blocks: SectionBlock[] = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const body = reportText.slice(
      cur.start + cur.title.length,
      next ? next.start : reportText.length,
    );
    const idx = cur.index;
    if (idx < 1 || idx > 10) continue;
    blocks.push({
      id: SECTION_IDS[idx - 1],
      index: idx,
      title: cur.title,
      body,
    });
  }
  return blocks;
}

// ============================================================
// 반복 검사
// ============================================================

function checkRepetition(blocks: SectionBlock[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // 1) 같은 watchlist 표현이 3개 이상 섹션에서 등장하면 medium
  for (const phrase of REPEAT_WATCH_PHRASES) {
    const hits: string[] = [];
    for (const b of blocks) {
      if (b.body.includes(phrase)) hits.push(b.id);
    }
    if (hits.length >= 3) {
      issues.push({
        type: 'repetition',
        sentence: phrase,
        reason: `같은 표현이 ${hits.length}개 섹션(${hits.join(', ')})에서 반복됨 — 관점·표현을 다르게 풀어쓸 것`,
        severity: 'medium',
        sectionId: hits.join(','),
      });
    }
  }

  // 2) 한 섹션 본문과 다른 섹션 본문에서 동일 문장(15자 이상) 매칭
  const sentenceMap = new Map<string, string[]>(); // 문장 → 섹션 IDs
  for (const b of blocks) {
    const sents = b.body.split(/(?<=[.!?。])\s+/).map(s => s.trim()).filter(s => s.length >= 15);
    for (const s of sents) {
      const key = s.replace(/\s+/g, ' ').slice(0, 80);
      const arr = sentenceMap.get(key) ?? [];
      if (!arr.includes(b.id)) arr.push(b.id);
      sentenceMap.set(key, arr);
    }
  }
  for (const [sent, sections] of sentenceMap) {
    if (sections.length >= 2) {
      issues.push({
        type: 'repetition',
        sentence: sent,
        reason: `같은 문장이 ${sections.length}개 섹션(${sections.join(', ')})에서 반복됨 — 표현 바꾸기 필요`,
        severity: 'high',
        sectionId: sections.join(','),
      });
    }
  }

  return issues;
}

// ============================================================
// 금지 추상어 단독 사용 검사
// ============================================================

function checkBannedVague(blocks: SectionBlock[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  for (const b of blocks) {
    if (!STRICT_SECTIONS.has(b.id)) continue;
    for (const { phrase, explain } of BANNED_STANDALONE_PHRASES) {
      const idx = b.body.indexOf(phrase);
      if (idx < 0) continue;
      // 같은 문장 안에 구체 예시 기호가 있으면 OK
      const sentStart = Math.max(0, b.body.lastIndexOf('.', idx), b.body.lastIndexOf('\n', idx));
      const sentEnd = (() => {
        const e1 = b.body.indexOf('.', idx);
        const e2 = b.body.indexOf('\n', idx);
        const candidates = [e1, e2].filter(x => x > 0);
        return candidates.length ? Math.min(...candidates) : b.body.length;
      })();
      const sentence = b.body.slice(sentStart, sentEnd).trim();
      const hasConcrete = /[,，·]|또는|예를 들어|예:|처럼|같은/.test(sentence);
      if (!hasConcrete) {
        issues.push({
          type: 'banned-vague-standalone',
          sentence,
          reason: `"${phrase}" 단독 사용 — ${explain}`,
          severity: 'medium',
          sectionId: b.id,
        });
      }
    }
  }
  return issues;
}

// ============================================================
// 중요 섹션 구체성 검사
// ============================================================

interface SpecCheckArgs {
  blocks: SectionBlock[];
  career: CareerSpecificAnalysis;
}

function checkSectionQuality({ blocks, career }: SpecCheckArgs): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // careerSpecificAnalysis에 등록된 업계 단어 set
  const industryWords = new Set<string>();
  for (const c of career.topCareerMatches) {
    for (const role of c.roles) industryWords.add(role);
    industryWords.add(c.industry.split('/')[0]?.trim() ?? c.industry);
  }
  for (const c of career.conditionalCareerMatches) {
    for (const role of c.roles) industryWords.add(role);
  }

  for (const b of blocks) {
    // 무기 섹션 — 잘 맞는 직무·환경 언급 있어야
    if (b.id === 'lifeWeapons') {
      let found = 0;
      for (const w of industryWords) if (b.body.includes(w)) found++;
      if (found < 2) {
        issues.push({
          type: 'lacks-specificity',
          sentence: '내가 잘 쓰면 강해지는 무기',
          reason: '무기 섹션에 구체 직무·업계 단어가 2개 미만 — careerSpecificAnalysis에서 가져와 녹일 것',
          severity: 'medium',
          sectionId: b.id,
        });
      }
    }

    // 함정 섹션 — 실제 장면 + 벗어나는 방법 있어야
    if (b.id === 'lifeTraps') {
      const hasScene = /실제|장면|상황|예를|때|예: |처럼/.test(b.body);
      const hasEscape = /방법|루틴|먼저|기준|확보|점검|공유|만들/.test(b.body);
      if (!hasScene || !hasEscape) {
        issues.push({
          type: 'lacks-specificity',
          sentence: '반복해서 빠지기 쉬운 함정',
          reason: `함정 섹션에 ${!hasScene ? '실제 장면' : ''}${!hasScene && !hasEscape ? ' + ' : ''}${!hasEscape ? '벗어나는 방법' : ''}이 부족`,
          severity: 'medium',
          sectionId: b.id,
        });
      }
    }

    // 운 선택 — 행동 동사 ≥ 4
    if (b.id === 'fortuneChoices') {
      const actionVerbs = (b.body.match(/(만들기|시도|공개|확보|정리|점검|줄이|늘리|연결|먼저|시작|마감|정하기|붙이기)/g) ?? []).length;
      if (actionVerbs < 4) {
        issues.push({
          type: 'lacks-specificity',
          sentence: '운 살리는/막는 선택',
          reason: `구체 행동 동사가 부족 (${actionVerbs}개) — 실행 가능한 동작으로 풀어쓸 것`,
          severity: 'medium',
          sectionId: b.id,
        });
      }
    }

    // 10문항 — 4번/5번/9번에 구체 직업·돈·연도
    if (b.id === 'questions') {
      // 4번 돈
      const q4 = extractQuestion(b.body, 4);
      if (q4) {
        const moneyKinds = (q4.match(/(콘텐츠|성과|월급|거래|전문성|네트워크|1인 브랜드|프로젝트|반복 판매|자산)/g) ?? []).length;
        if (moneyKinds < 2) {
          issues.push({
            type: 'lacks-specificity',
            sentence: '10문항 #4 (돈)',
            reason: '돈 문항에 수익화 방식이 2개 미만 — moneyMakingStyle 배열에서 가져올 것',
            severity: 'medium',
            sectionId: b.id,
          });
        }
      }
      // 5번 직업
      const q5 = extractQuestion(b.body, 5);
      if (q5) {
        let foundIndustry = 0;
        for (const w of industryWords) if (q5.includes(w)) foundIndustry++;
        if (foundIndustry < 3) {
          issues.push({
            type: 'lacks-specificity',
            sentence: '10문항 #5 (직업)',
            reason: `직업 문항에 구체 업계·직무가 3개 미만 (${foundIndustry}개) — topCareerMatches에서 가져올 것`,
            severity: 'medium',
            sectionId: b.id,
          });
        }
      }
      // 9번 3년 — 연도 토큰
      const q9 = extractQuestion(b.body, 9);
      if (q9) {
        const yearTokens = (q9.match(/20\d{2}/g) ?? []).length;
        if (yearTokens < 2) {
          issues.push({
            type: 'lacks-specificity',
            sentence: '10문항 #9 (3년)',
            reason: '3년 문항에 연도 표기(20XX)가 2개 미만',
            severity: 'low',
            sectionId: b.id,
          });
        }
      }
    }

    // 3년 흐름 섹션 — 각 연도가 본문에 있어야
    if (b.id === 'futureThreeYears') {
      const yearTokens = (b.body.match(/20\d{2}/g) ?? []);
      if (yearTokens.length < 3) {
        issues.push({
          type: 'lacks-specificity',
          sentence: '앞으로 3년 흐름',
          reason: '연도 표기(20XX)가 3개 미만 — futureTimingAnalysis.years 모두 다룰 것',
          severity: 'medium',
          sectionId: b.id,
        });
      }
    }
  }

  return issues;
}

function extractQuestion(questionsBody: string, n: number): string | null {
  const re = new RegExp(`###\\s*${n}\\.[\\s\\S]*?(?=###\\s*\\d+\\.|$)`, 'm');
  const m = questionsBody.match(re);
  return m ? m[0] : null;
}

// ============================================================
// 공개 API
// ============================================================

export function checkRepetitionAndQuality(args: {
  reportText: string;
  careerSpecificAnalysis: CareerSpecificAnalysis;
}): ValidationIssue[] {
  const blocks = splitSections(args.reportText);
  return [
    ...checkRepetition(blocks),
    ...checkBannedVague(blocks),
    ...checkSectionQuality({ blocks, career: args.careerSpecificAnalysis }),
  ];
}
