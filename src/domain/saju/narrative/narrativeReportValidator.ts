// 서사형 개인사주 리포트 검증기.
// 카드/리스트 회귀 방지, 10가지 질문 누락 검사, 직업군 구체성 위치 검사 등.

import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type {
  NarrativeValidationIssue, NarrativeValidationResult,
} from './narrativeTypes';

interface Args {
  reportText: string;
  gptInput: PersonalSajuGptInput;
}

// 7섹션 헤더 (# 1. ~ # 7.) → narrative section id 매핑
const SECTION_IDS = [
  'openingDefinition',
  'lifeStructureNarrative',
  'repeatedPatternNarrative',
  'realityActivationNarrative',
  'futureFlowNarrative',
  'finalStrategyNarrative',
  'finalLine',
] as const;

interface SectionBlock { id: string; index: number; title: string; body: string; }

function splitSections(text: string): SectionBlock[] {
  const re = /^#\s+(\d+)\.\s+(.+)$/gm;
  const matches: Array<{ start: number; index: number; title: string }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    matches.push({ start: m.index, index: Number(m[1]), title: m[2].trim() });
  }
  const blocks: SectionBlock[] = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const body = text.slice(cur.start + cur.title.length, next ? next.start : text.length);
    if (cur.index < 1 || cur.index > 7) continue;
    blocks.push({ id: SECTION_IDS[cur.index - 1], index: cur.index, title: cur.title, body });
  }
  return blocks;
}

// ============================================================
// 항목형 표현 (카드/리스트 회귀 방지)
// ============================================================
const CHECKLIST_PATTERNS = [
  /^\s*[-*]\s*실제\s*장면\s*[:：]/m,
  /^\s*[-*]\s*더\s*강하게(?:\s*쓰는\s*방법)?\s*[:：]/m,
  /^\s*[-*]\s*그림자\s*[:：]/m,
  /^\s*[-*]\s*왜\s*생기는가\s*[:：]/m,
  /^\s*[-*]\s*벗어나는\s*방법\s*[:：]/m,
  /^\s*[-*]\s*추천\s*직업군\s*[:：]/m,
  /^\s*[-*]\s*피해야\s*할\s*환경\s*[:：]/m,
  /^\s*[-*]\s*운이\s*살아나는\s*선택\s*[:：]/m,
  /^\s*[-*]\s*운을\s*막는\s*선택\s*[:：]/m,
  // 키워드 1. 키워드 2. 같은 번호 매기기
  /^\s*키워드\s*\d+\s*[.\\]\s/m,
  /^\s*함정\s*\d+\s*[.\\]\s/m,
  /^\s*무기\s*\d+\s*[.\\]\s/m,
];

// ============================================================
// 반복 표현 (장마다 발전 안 되고 똑같이 반복되면 위반)
// ============================================================
const REPETITION_WATCH = [
  '혼자 다 감당', '도움을 요청', '결과물을 밖으로', '버티는 힘',
  '기준이 분명', '책임이 커', '돈이 새', '한 번에 끊',
  '완벽주의', '시작이 늦',
];

// ============================================================
// 10가지 질문 keyword 매핑 — 각 질문이 본문에 답이 있는지 검사
// ============================================================
const HIDDEN_QUESTIONS = [
  { qNum: 1, keywords: ['기질', '타고난', '성향'], expectIn: ['lifeStructureNarrative'] },
  { qNum: 2, keywords: ['남들이 보는', '겉모습', '겉으로', '내면', '실제 안'], expectIn: ['lifeStructureNarrative'] },
  { qNum: 3, keywords: ['반복', '패턴'], expectIn: ['repeatedPatternNarrative'] },
  { qNum: 4, keywords: ['돈', '수익', '벌'], expectIn: ['realityActivationNarrative'] },
  { qNum: 5, keywords: ['업계', '직무', '직업', '일하는'], expectIn: ['realityActivationNarrative'] },
  { qNum: 6, keywords: ['관계', '인간관계', '사람'], expectIn: ['repeatedPatternNarrative', 'realityActivationNarrative'] },
  { qNum: 7, keywords: ['연애', '결혼', '연인', '파트너'], expectIn: ['realityActivationNarrative'] },
  { qNum: 8, keywords: ['가족', '초년', '어린', '부모'], expectIn: ['lifeStructureNarrative', 'repeatedPatternNarrative'] },
  { qNum: 9, keywords: ['앞으로 3년', '내년', '올해', '2026', '2027', '2028'], expectIn: ['futureFlowNarrative'] },
  { qNum: 10, keywords: ['결국', '이렇게', '잘 쓰', '활용', '현실 전략'], expectIn: ['finalStrategyNarrative'] },
];

// ============================================================
// 일반론 / 공포 마케팅 (재사용)
// ============================================================
const GENERIC_PATTERNS = [
  /노력하면 좋아질( 것)?(입니다|이에요)/,
  /긍정적으로 생각하세요/,
  /좋은 인연이 들어옵니다/,
  /건강을 챙기세요/,
];
const FEAR_PATTERNS = [
  /이 시기를 놓치면 인생이 무너/,
  /평생 (귀인이 )?도와줍니다/,
  /앞으로 대박이 (납니|터집)/,
  /상위 1% 사주/,
];
// 미래 단정
const DETERMINISTIC_FUTURE = [
  /\b(20\d{2})에?\s*(결혼|이별|이혼|임신|사망|승진)\s*(합니다|해요|할\s*것)/,
  /\b반드시\s*(결혼|이별|이혼|임신)/,
];

// ============================================================
// 톤 검사 — 반말/유행어
// ============================================================
const TONE_BAD = [
  /\bㅋㅋ+/,
  /\b개쩐다\b/,
  /\b레전드\b/,
  /\b찐\b/,
  /\b미친\s/,
];

// ============================================================
// 메인
// ============================================================
function push(arr: NarrativeValidationIssue[], i: Omit<NarrativeValidationIssue, never>) {
  arr.push(i);
}

export function validateNarrativeReport({ reportText, gptInput }: Args): NarrativeValidationResult {
  const blocks = splitSections(reportText);
  const issues: NarrativeValidationIssue[] = [];

  // 1. 항목형 표현 남발 — 섹션당 2개 이상이면 위반
  for (const b of blocks) {
    let hits = 0;
    for (const pat of CHECKLIST_PATTERNS) if (pat.test(b.body)) hits++;
    if (hits >= 2) {
      push(issues, {
        type: 'checklist-overuse', sectionId: b.id,
        sentence: b.title,
        reason: `섹션에 항목형 표현(실제 장면:, 추천 직업군:, 키워드 N. 등)이 ${hits}개 — 줄글로 재작성`,
        severity: 'medium',
        suggestion: '문장 속에 자연스럽게 녹이고, 별표·번호·콜론 헤더는 줄여라',
      });
    }
  }

  // 2. 반복 watchlist — 4개 이상 섹션에서 동일 표현이면 위반
  for (const phrase of REPETITION_WATCH) {
    const hits = blocks.filter(b => b.body.includes(phrase)).map(b => b.id);
    if (hits.length >= 4) {
      push(issues, {
        type: 'repeated-theme-no-development', sectionId: hits.join(','),
        sentence: phrase,
        reason: `"${phrase}"가 ${hits.length}개 섹션에서 같은 표현으로 반복됨 — 장마다 발전시켜야`,
        severity: 'medium',
        suggestion: '원인 → 그림자 → 현실 적용 → 결론 순으로 관점 바꾸기',
      });
    }
  }

  // 3. 10가지 질문 누락 검사
  for (const q of HIDDEN_QUESTIONS) {
    const targetBlocks = blocks.filter(b => q.expectIn.includes(b.id));
    if (targetBlocks.length === 0) continue;
    const combined = targetBlocks.map(b => b.body).join(' ');
    const hit = q.keywords.some(k => combined.includes(k));
    if (!hit) {
      push(issues, {
        type: 'hidden-question-uncovered', sectionId: q.expectIn.join(','),
        sentence: `Q${q.qNum}`,
        reason: `10가지 숨은 질문 #${q.qNum}의 키워드(${q.keywords.join('/')})가 본문에 없음`,
        severity: 'medium',
        suggestion: `${q.expectIn.join(' 또는 ')} 섹션에 해당 답을 자연스럽게 녹이기`,
      });
    }
  }

  // 4. 직업군 구체성 위치 — realityActivationNarrative(4번)에 careerSpecificAnalysis의 단어 ≥3개
  const reality = blocks.find(b => b.id === 'realityActivationNarrative');
  if (reality) {
    const careerWords = new Set<string>();
    for (const c of gptInput.careerSpecificAnalysis.topCareerMatches) {
      careerWords.add(c.industry.split('/')[0]?.trim() ?? c.industry);
      for (const r of c.roles) careerWords.add(r);
    }
    let found = 0;
    for (const w of careerWords) if (reality.body.includes(w)) found++;
    if (found < 3) {
      push(issues, {
        type: 'concreteness-misplaced', sectionId: 'realityActivationNarrative',
        sentence: '일·돈·관계 섹션',
        reason: `직업/업계 단어가 ${found}개로 부족 (3개 이상 필요) — careerSpecificAnalysis에서 가져와 문장에 녹이기`,
        severity: 'medium',
        suggestion: '"서비스 기획, PM, 컨설팅처럼 ..." 형식으로 자연스럽게',
      });
    }
  }

  // 5. 미래 섹션 — 연도 토큰 ≥3 (각 연도 다뤘는지)
  const future = blocks.find(b => b.id === 'futureFlowNarrative');
  if (future) {
    const years = (future.body.match(/20\d{2}/g) ?? []);
    if (years.length < 3) {
      push(issues, {
        type: 'concreteness-misplaced', sectionId: 'futureFlowNarrative',
        sentence: '앞으로 3년',
        reason: `연도 표기 ${years.length}개 — futureTimingAnalysis.years 3개 모두 다루기`,
        severity: 'medium',
        suggestion: '각 연도(20XX)를 짧게라도 본문에 포함',
      });
    }
  }

  // 6. 일반론·공포·미래 단정·톤 — 전체 텍스트에서
  for (const pat of GENERIC_PATTERNS) {
    const m = reportText.match(pat);
    if (m) {
      push(issues, { type: 'generic', sectionId: 'global', sentence: m[0], reason: '일반론 표현', severity: 'high', suggestion: '구체적 결로 재작성' });
    }
  }
  for (const pat of FEAR_PATTERNS) {
    const m = reportText.match(pat);
    if (m) {
      push(issues, { type: 'invented-claim', sectionId: 'global', sentence: m[0], reason: '공포·운명 단정', severity: 'high', suggestion: '구조적 설명으로 대체' });
    }
  }
  for (const pat of DETERMINISTIC_FUTURE) {
    const m = reportText.match(pat);
    if (m) {
      push(issues, { type: 'invented-claim', sectionId: 'global', sentence: m[0], reason: '미래 사건 단정', severity: 'high', suggestion: '"~할 수 있어요"로 완화' });
    }
  }
  for (const pat of TONE_BAD) {
    const m = reportText.match(pat);
    if (m) {
      push(issues, { type: 'tone-broken', sectionId: 'global', sentence: m[0], reason: '유행어/밈 — 친근하되 가볍지 않은 톤 위반', severity: 'low', suggestion: '제거 또는 일반 표현으로' });
    }
  }

  // 7. 컨텍스트 충돌 — 기혼/자녀/나이 (기존 filter와 동일 패턴)
  const ctx = gptInput.userContext;
  if (ctx.relationshipStatus === 'married' && /새로운 인연이? (들어|찾아)/.test(reportText)) {
    push(issues, { type: 'context-conflict', sectionId: 'global', sentence: '새로운 인연', reason: '기혼자에게 새 인연 표현', severity: 'high', suggestion: '제거' });
  }
  if (ctx.age >= 50 && /(수능|첫 취업)/.test(reportText)) {
    push(issues, { type: 'context-conflict', sectionId: 'global', sentence: '수능/첫 취업', reason: '50세 이상에게 수능/첫 취업', severity: 'high', suggestion: '제거' });
  }

  // 8. 신살 hallucination — JSON specialStars에 없는 신살명이 본문에 나오면
  const KNOWN_SHINSAL = ['천을귀인','문창귀인','학당귀인','월덕귀인','천덕귀인','태극귀인','괴강','양인','백호','도화','홍염','화개','역마'];
  const allowedStarNames = new Set(gptInput.coreAnalysis.specialStars.map(s => s.name));
  for (const name of KNOWN_SHINSAL) {
    if (reportText.includes(name) && !allowedStarNames.has(name)) {
      push(issues, { type: 'invented-claim', sectionId: 'global', sentence: name,
        reason: `JSON specialStars에 없는 신살(${name})이 본문에 등장`, severity: 'medium',
        suggestion: '제거 또는 JSON에 있는 신살로 대체' });
    }
  }

  const high = issues.filter(i => i.severity === 'high').length;
  const medium = issues.filter(i => i.severity === 'medium').length;
  return {
    isValid: high === 0 && medium < 5,
    issues,
  };
}
