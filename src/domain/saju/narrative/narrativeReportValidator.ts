// 서사형 개인사주 리포트 검증기.
//
// 회귀 방지(카드/리스트) + 10가지 질문 누락 + 직업군 구체성 + 컨텍스트 충돌 외에
// 2026-05 V4 정보량 복원용 검사 추가:
//   - missing-required-data-source : Coverage Rule에서 정의한 필수 데이터가 본문에 흡수되지 않음
//   - underdeveloped-section       : 섹션이 너무 짧고 데이터도 빈약
//   - unexplained-technical-term   : 명리 용어 등장 + 일상어 풀이 마커 없음
//   - generic-opening              : 1장 첫 문장이 일반론 패턴
//   - weak-final-message           : 7장 마지막 한 문장이 일반론·약함
//   - yearly-flow-too-similar      : 2026/2027/2028 본문이 너무 비슷(shingle Jaccard 기준)
//   - career-recommendation-too-narrow : 4장에 업계가 한 갈래만 노출
//   - financial-advice-risk        : 투자/거래/시장 타이밍 권유 톤

import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type {
  NarrativeValidationIssue, NarrativeValidationResult,
  NarrativePlanSet,
} from './narrativeTypes';
import { buildNarrativeCoverageRequirements } from './narrativeContentLedger';
import type { TopicCoverageMap, NarrativeTopicKey } from './topicCoverageTypes';
import { TOPIC_KEYWORDS, REQUIRED_TOPICS_HARD } from './topicCoverageTypes';

interface Args {
  reportText: string;
  gptInput: PersonalSajuGptInput;
  /** 섹션별 NarrativePlan. mustUseFacts.matchTokens 흡수 여부 검사. */
  narrativePlans?: NarrativePlanSet;
  /** TopicCoverageMap. true 토픽이 본문에 흡수됐는지 검사. */
  topicCoverageMap?: TopicCoverageMap;
}

// ============================================================
// 토픽 흡수 검사 — TOPIC_KEYWORDS의 패턴 중 하나라도 매칭되면 true
// ============================================================
function topicMatched(body: string, topic: NarrativeTopicKey, gptInput: PersonalSajuGptInput): boolean {
  // 특수 케이스: coreKeywords는 identityKeyword strings로
  if (topic === 'coreKeywords') {
    let hit = 0;
    for (const k of gptInput.identityKeywords.slice(0, 5)) {
      if (k.keyword && body.includes(k.keyword)) hit++;
      else {
        // chunk match
        for (const chunk of k.keyword.split(/[\s]+/)) {
          if (chunk.length >= 2 && body.includes(chunk)) { hit++; break; }
        }
      }
    }
    return hit >= 1;
  }
  if (topic === 'specialPoints') {
    return gptInput.specialPoints.some(p => p.name && body.includes(p.name));
  }
  const patterns = TOPIC_KEYWORDS[topic] ?? [];
  for (const p of patterns) {
    if (typeof p === 'string') {
      if (body.includes(p)) return true;
    } else {
      if (p.test(body)) return true;
    }
  }
  return false;
}

// 본문에서 "실제 장면" 마커 수 — missing-life-scene 검사용
const LIFE_SCENE_MARKERS = [
  '회의', '팀', '직장', '회사', '프로젝트',
  '가족', '부모', '형제', '집안',
  '연인', '파트너', '연애', '관계에서는',
  '주말', '저녁', '출근', '퇴근', '식사 자리',
];

function countLifeSceneMarkers(text: string): number {
  let n = 0;
  for (const m of LIFE_SCENE_MARKERS) if (text.includes(m)) n++;
  return n;
}

// 섹션 id 매핑 — 2026-05: plan 순서로 동적 매핑. plan이 없으면 기본 7섹션 가정.
const DEFAULT_SECTION_IDS = [
  'openingDefinition',
  'lifeStructureNarrative',
  'repeatedPatternNarrative',
  'careerTalentNarrative',
  'moneyMonetizationNarrative',
  'relationshipLoveNarrative',
  'finalStrategyNarrative',
] as const;

interface SectionBlock { id: string; index: number; title: string; body: string; }

function splitSections(text: string, plans?: NarrativePlanSet): SectionBlock[] {
  const sectionIds: string[] = plans && plans.length > 0
    ? plans.map(p => p.sectionId)
    : [...DEFAULT_SECTION_IDS];
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
    if (cur.index < 1 || cur.index > sectionIds.length) continue;
    blocks.push({ id: sectionIds[cur.index - 1], index: cur.index, title: cur.title, body });
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
// 10가지 질문 keyword 매핑
// ============================================================
const HIDDEN_QUESTIONS = [
  { qNum: 1, keywords: ['기질', '타고난', '성향'], expectIn: ['lifeStructureNarrative'] },
  { qNum: 2, keywords: ['남들이 보는', '겉모습', '겉으로', '내면', '실제 안'], expectIn: ['lifeStructureNarrative'] },
  { qNum: 3, keywords: ['반복', '패턴'], expectIn: ['repeatedPatternNarrative'] },
  { qNum: 4, keywords: ['돈', '수익', '벌'], expectIn: ['moneyMonetizationNarrative'] },
  { qNum: 5, keywords: ['업계', '직무', '직업', '일하는'], expectIn: ['careerTalentNarrative'] },
  { qNum: 6, keywords: ['관계', '인간관계', '사람'], expectIn: ['repeatedPatternNarrative', 'relationshipLoveNarrative'] },
  { qNum: 7, keywords: ['연애', '결혼', '연인', '파트너'], expectIn: ['relationshipLoveNarrative'] },
  { qNum: 8, keywords: ['가족', '초년', '어린', '부모'], expectIn: ['lifeStructureNarrative', 'repeatedPatternNarrative'] },
  { qNum: 9, keywords: ['앞으로 3년', '내년', '올해', '2026', '2027', '2028'], expectIn: ['futureFlowNarrative'] },
  { qNum: 10, keywords: ['결국', '이렇게', '잘 쓰', '활용', '현실 전략'], expectIn: ['finalStrategyNarrative'] },
];

// ============================================================
// 일반론 / 공포 / 미래 단정 / 톤
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
const DETERMINISTIC_FUTURE = [
  /\b(20\d{2})에?\s*(결혼|이별|이혼|임신|사망|승진)\s*(합니다|해요|할\s*것)/,
  /\b반드시\s*(결혼|이별|이혼|임신)/,
];
const TONE_BAD = [
  /\bㅋㅋ+/,
  /\b개쩐다\b/,
  /\b레전드\b/,
  /\b찐\b/,
  /\b미친\s/,
];

// ============================================================
// 2026-05 추가: 1장 일반론 / 7장 약한 마무리
// ============================================================
const GENERIC_OPENING_PATTERNS = [
  /(위기|어려움|역경)에서\s*(쉽게\s*)?(꺾이지|밀리지|무너지지)\s*않/,
  /안정성과\s*신뢰를?\s*중시/,
  /(긍정적|행복한|성공적)인?\s*(사람|삶|결과)을?\s*(가진|만들)/,
  /이\s*사주는\s*매우\s*(특별|희귀)/,
  /(상위\s*1\s*%|희소한)\s*사주/,
  /강한\s*사람입니다\.?\s*$/,
];

const WEAK_FINAL_PATTERNS = [
  /긍정적인?\s*결과를?\s*가져올/,
  /행복한\s*삶을?\s*살(게|아갈)/,
  /잘\s*살아갈\s*수\s*있/,
  /협업을?\s*통해\s*더\s*나은\s*결과/,
  /항상\s*최선을?\s*다하면/,
  /노력하면\s*좋은?\s*결과/,
  /^.{0,40}$/, // 너무 짧은 마무리(40자 미만)는 별도 weak로 잡음
];

// ============================================================
// 2026-05 추가: 명리 용어 + 풀이 마커
// ============================================================
const TECHNICAL_TERMS = [
  '무토','기토','갑목','을목','병화','정화','경금','신금','임수','계수',
  '비견','겁재','식신','상관','편재','정재','편관','정관','편인','정인',
  '용신','기신','희신','구신','한신','지장간','일간','월령',
  '양인','괴강','백호','도화','홍염','화개','역마',
  '천을귀인','문창귀인','월덕귀인','천덕귀인','학당귀인','태극귀인',
  '삼합','육합','반합','형','충','파','해',
  '식상생재','관인상생','재생관','살인상생',
];
const EXPLAIN_MARKERS = [
  '쉽게', '말하면', '풀면', '풀어', '처럼', '비유', '뜻',
  '의미', '라는 건', '이라는 건', '라고 보', '라고 할',
  '에 가까', '와 비슷', '같은 기운', '같은 힘',
  '란 ', '이란 ', '에 해당',
];

// ============================================================
// 2026-05 추가: 투자/거래 권유 톤
// ============================================================
const FINANCIAL_RISK_PATTERNS = [
  /시장.{0,8}(타이밍|가격\s*흐름)/,
  /(가격\s*흐름|시장\s*변동)을?\s*보고\s*(거래|매매|투자)/,
  /(거래|매매)\s*타이밍을?\s*(맞춰|보고)/,
  /트레이딩이?\s*(잘\s*맞|적합)/,
  /주식.{0,5}(투자에\s*적합|이\s*잘\s*맞)/,
  /빠른\s*수익을?\s*노리/,
  /가격\s*흐름을?\s*보고\s*타이밍/,
];

// ============================================================
// 유틸 — 데이터 소스 토큰 추출 / 본문 흡수 카운트
// ============================================================
function nonEmpty(...xs: Array<string | undefined | null>): string[] {
  return xs.filter((x): x is string => typeof x === 'string' && x.trim().length > 0);
}

function getDataSourceTokens(gptInput: PersonalSajuGptInput, key: string): string[] {
  const c = gptInput.careerSpecificAnalysis;
  switch (key) {
    case 'identityKeywords':
      return gptInput.identityKeywords.map(k => k.keyword);
    case 'specialPoints':
      return gptInput.specialPoints.flatMap(p => nonEmpty(p.name, p.shortLabel));
    case 'dayMaster':
      return nonEmpty(gptInput.birthChart.dayMaster);
    case 'elementStrength': {
      const tokens: string[] = [];
      for (const el of gptInput.coreAnalysis.elementStrength.strongest) tokens.push(el);
      for (const el of gptInput.coreAnalysis.elementStrength.weakest) tokens.push(el);
      return tokens;
    }
    case 'tenGods': {
      const tg = gptInput.coreAnalysis.tenGods;
      return Array.from(new Set([...tg.visible.map(v => v.tenGod), ...tg.strongest]));
    }
    case 'lifeTraps':
      return gptInput.lifeTraps.flatMap(t => nonEmpty(t.name, t.category));
    case 'timingAnchors':
      return gptInput.timingAnchors.map(a => String(a.year ?? a.age ?? '')).filter(Boolean);
    case 'combinationsAndConflicts': {
      const cc = gptInput.coreAnalysis.combinationsAndConflicts;
      return [...cc.combinations, ...cc.conflicts, ...cc.punishments, ...cc.harms, ...cc.destructions];
    }
    case 'lifeWeapons':
      return gptInput.lifeWeapons.flatMap(w => nonEmpty(w.name, w.category));
    case 'careerSpecificAnalysis.topCareerMatches':
      return c.topCareerMatches.flatMap(m => [...m.roles, m.industry.split('/')[0]?.trim() ?? m.industry]);
    case 'careerSpecificAnalysis.bestWorkStyle':
      return c.bestWorkStyle.map(s => s.title);
    case 'careerSpecificAnalysis.avoidCareerEnvironments':
      return c.avoidCareerEnvironments.map(a => a.environment);
    case 'careerSpecificAnalysis.moneyMakingStyle':
      return c.moneyMakingStyle.map(m => m.title);
    case 'futureTimingAnalysis.years':
      return gptInput.futureTimingAnalysis.years.map(y => String(y.year));
    case 'fortuneTriggers':
    case 'fortuneTriggers.fortuneActivatingChoices':
    case 'fortuneTriggers.fortuneBlockingChoices': {
      const ft = gptInput.fortuneTriggers;
      const list = key === 'fortuneTriggers.fortuneBlockingChoices' ? ft.fortuneBlockingChoices
        : key === 'fortuneTriggers.fortuneActivatingChoices' ? ft.fortuneActivatingChoices
        : [...ft.fortuneActivatingChoices, ...ft.fortuneBlockingChoices];
      return list.map(c => c.title);
    }
    default:
      return [];
  }
}

/** 토큰 중 본문에 부분 포함된 개수 (소문자 정규화 없음 — 한글 그대로) */
function countAbsorbed(body: string, tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let n = 0;
  const seen = new Set<string>();
  for (const t of tokens) {
    if (!t || seen.has(t)) continue;
    seen.add(t);
    // 토큰이 짧을 때(2자 미만) 오탐 방지
    if (t.length < 2) continue;
    if (body.includes(t)) n++;
  }
  return n;
}

/** 부분 흡수 판정 — 토큰의 핵심 명사 chunk 단위로도 추가 점수 */
function countAbsorbedLoose(body: string, tokens: string[]): number {
  let strict = countAbsorbed(body, tokens);
  if (strict >= 2) return strict;
  // loose: 토큰을 공백/슬래시로 쪼개서 2자 이상 chunk가 본문에 있으면 추가 0.5점씩
  const seen = new Set<string>();
  let loose = 0;
  for (const t of tokens) {
    for (const chunk of t.split(/[\s/·,()]+/)) {
      if (chunk.length < 2) continue;
      if (seen.has(chunk)) continue;
      seen.add(chunk);
      if (body.includes(chunk)) loose += 1;
    }
  }
  return strict + loose / 2;
}

// ============================================================
// shingle Jaccard — 연도별 본문 유사도
// ============================================================
function shingles(text: string, n = 5): Set<string> {
  const s = text.replace(/\s+/g, '');
  const set = new Set<string>();
  for (let i = 0; i + n <= s.length; i++) set.add(s.slice(i, i + n));
  return set;
}
function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}

/** futureFlowNarrative 본문에서 연도별 블록 분리 */
function splitYearBlocks(body: string): Array<{ year: number; body: string }> {
  const re = /^#{2,}\s*(20\d{2})/gm;
  const matches: Array<{ start: number; year: number }> = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    matches.push({ start: m.index, year: Number(m[1]) });
  }
  const out: Array<{ year: number; body: string }> = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const block = body.slice(cur.start, next ? next.start : body.length);
    // 헤더 줄 제거
    const headerEnd = block.indexOf('\n');
    const text = headerEnd >= 0 ? block.slice(headerEnd + 1) : '';
    out.push({ year: cur.year, body: text });
  }
  return out;
}

// ============================================================
// 명리 용어 풀이 마커 근접 검사
// ============================================================
function hasNearbyExplanation(body: string, term: string): boolean {
  let pos = body.indexOf(term);
  while (pos !== -1) {
    const windowStart = Math.max(0, pos - 60);
    const windowEnd   = Math.min(body.length, pos + term.length + 100);
    const window = body.slice(windowStart, windowEnd);
    if (EXPLAIN_MARKERS.some(mk => window.includes(mk))) return true;
    pos = body.indexOf(term, pos + term.length);
  }
  return false;
}

// ============================================================
// 메인
// ============================================================
function pushIssue(arr: NarrativeValidationIssue[], i: NarrativeValidationIssue) {
  arr.push(i);
}

export function validateNarrativeReport({ reportText, gptInput, narrativePlans, topicCoverageMap }: Args): NarrativeValidationResult {
  const blocks = splitSections(reportText, narrativePlans);
  const byId = new Map(blocks.map(b => [b.id, b]));
  const coverage = buildNarrativeCoverageRequirements();
  const issues: NarrativeValidationIssue[] = [];

  // ─────────────────────────────────────────────
  // 0. NarrativePlan.mustUseFacts — matchTokens 흡수 검사
  //    각 fact는 matchTokens 중 하나라도 본문에 포함되면 통과.
  //    빠지면 missing-narrative-fact로 실패 (섹션별 repair 시드).
  // ─────────────────────────────────────────────
  if (narrativePlans && narrativePlans.length > 0) {
    for (const plan of narrativePlans) {
      const block = byId.get(plan.sectionId);
      if (!block) continue;
      for (const fact of plan.mustUseFacts) {
        if (!fact.matchTokens || fact.matchTokens.length === 0) continue;
        const matched = fact.matchTokens.some(t => t.length >= 2 && block.body.includes(t));
        if (!matched) {
          pushIssue(issues, {
            type: 'missing-narrative-fact', sectionId: plan.sectionId,
            sentence: `[${fact.id}/${fact.source}] ${fact.fact}`,
            reason: `${plan.sectionId} 섹션에 mustUseFact "${fact.fact}" 흡수되지 않음 (matchTokens=${fact.matchTokens.slice(0, 4).join('|')})`,
            severity: 'medium',
            suggestion: `${fact.narrativeHint} — 쉬운 풀이: "${fact.plainMeaning}"`,
          });
        }
      }
    }
  }

  // ─────────────────────────────────────────────
  // 1. 항목형 표현 남발
  // ─────────────────────────────────────────────
  for (const b of blocks) {
    let hits = 0;
    for (const pat of CHECKLIST_PATTERNS) if (pat.test(b.body)) hits++;
    if (hits >= 2) {
      pushIssue(issues, {
        type: 'checklist-overuse', sectionId: b.id, sentence: b.title,
        reason: `섹션에 항목형 표현(실제 장면:, 추천 직업군:, 키워드 N. 등)이 ${hits}개 — 줄글로 재작성`,
        severity: 'medium',
        suggestion: '문장 속에 자연스럽게 녹이고, 별표·번호·콜론 헤더는 줄여라',
      });
    }
  }

  // ─────────────────────────────────────────────
  // 2. 반복 watchlist
  // ─────────────────────────────────────────────
  for (const phrase of REPETITION_WATCH) {
    const hits = blocks.filter(b => b.body.includes(phrase)).map(b => b.id);
    if (hits.length >= 4) {
      pushIssue(issues, {
        type: 'repeated-theme-no-development', sectionId: hits.join(','),
        sentence: phrase,
        reason: `"${phrase}"가 ${hits.length}개 섹션에서 같은 표현으로 반복됨 — 장마다 발전시켜야`,
        severity: 'medium',
        suggestion: '원인 → 그림자 → 현실 적용 → 결론 순으로 관점 바꾸기',
      });
    }
  }

  // ─────────────────────────────────────────────
  // 3. 10가지 질문 누락
  // ─────────────────────────────────────────────
  for (const q of HIDDEN_QUESTIONS) {
    const targetBlocks = blocks.filter(b => q.expectIn.includes(b.id));
    if (targetBlocks.length === 0) continue;
    const combined = targetBlocks.map(b => b.body).join(' ');
    const hit = q.keywords.some(k => combined.includes(k));
    if (!hit) {
      pushIssue(issues, {
        type: 'hidden-question-uncovered', sectionId: q.expectIn.join(','),
        sentence: `Q${q.qNum}`,
        reason: `10가지 숨은 질문 #${q.qNum}의 키워드(${q.keywords.join('/')})가 본문에 없음`,
        severity: 'medium',
        suggestion: `${q.expectIn.join(' 또는 ')} 섹션에 해당 답을 자연스럽게 녹이기`,
      });
    }
  }

  // ─────────────────────────────────────────────
  // 4. Coverage Rule — missing-required-data-source
  // ─────────────────────────────────────────────
  for (const req of coverage) {
    const block = byId.get(req.sectionId);
    if (!block) continue;
    for (const sourceKey of req.requiredDataSources) {
      const tokens = getDataSourceTokens(gptInput, sourceKey);
      if (tokens.length === 0) continue; // 사용자에게 해당 데이터가 비어 있으면 skip
      const absorbed = countAbsorbedLoose(block.body, tokens);
      // 토큰 풀이 작으면 1개 흡수만으로도 OK, 풍부하면 2개 이상 필요
      const required = tokens.length >= 4 ? 2 : 1;
      if (absorbed < required) {
        pushIssue(issues, {
          type: 'missing-required-data-source', sectionId: req.sectionId,
          sentence: sourceKey,
          reason: `${req.sectionId} 섹션이 ${sourceKey} 데이터를 본문에 충분히 흡수하지 않음 (흡수=${absorbed.toFixed(1)}/요구=${required}, 사용 가능 토큰 ${tokens.length}개)`,
          severity: 'medium',
          suggestion: `${sourceKey}에서 핵심 내용을 줄글로 자연스럽게 흡수`,
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  // 5. forbiddenShortcuts (Coverage Rule)
  // ─────────────────────────────────────────────
  for (const req of coverage) {
    const block = byId.get(req.sectionId);
    if (!block) continue;
    for (const shortcut of req.forbiddenShortcuts) {
      if (block.body.includes(shortcut)) {
        pushIssue(issues, {
          type: 'checklist-overuse', sectionId: req.sectionId,
          sentence: shortcut,
          reason: `${req.sectionId}에 사용 금지 손쉬운 표현 "${shortcut}" 등장 — 줄글로 재작성`,
          severity: 'medium',
          suggestion: `해당 표현을 제거하고 줄글로 풀어쓰기`,
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  // 6. underdeveloped-section — 본문 너무 짧음
  // ─────────────────────────────────────────────
  const MIN_BODY_LEN: Record<string, number> = {
    openingDefinition: 350,
    lifeStructureNarrative: 600,
    repeatedPatternNarrative: 600,
    // 2026-05: 일/돈/관계 독립 장 — 각 600자 이상 권장
    careerTalentNarrative: 700,
    moneyMonetizationNarrative: 600,
    relationshipLoveNarrative: 600,
    futureFlowNarrative: 500,
    finalStrategyNarrative: 600,
  };
  for (const b of blocks) {
    const compactLen = b.body.replace(/\s+/g, '').length;
    const min = MIN_BODY_LEN[b.id];
    if (typeof min === 'number' && compactLen < min) {
      pushIssue(issues, {
        type: 'underdeveloped-section', sectionId: b.id,
        sentence: b.title,
        reason: `섹션 본문이 너무 압축됨 (공백 제외 ${compactLen}자, 권장 ${min}자 이상) — Coverage 요소를 충분히 풀어쓰지 못함`,
        severity: 'medium',
        suggestion: `Coverage Rule의 requiredNarrativeElements를 줄글로 자연스럽게 풀어 보강 (체크리스트 X)`,
      });
    }
  }

  // ─────────────────────────────────────────────
  // 7. unexplained-technical-term
  // ─────────────────────────────────────────────
  for (const term of TECHNICAL_TERMS) {
    if (!reportText.includes(term)) continue;
    // 본문 어디에서 처음 나오는 섹션 찾기 → 그 섹션 본문에서 풀이 마커 존재 여부
    let explained = false;
    for (const b of blocks) {
      if (b.body.includes(term)) {
        if (hasNearbyExplanation(b.body, term)) { explained = true; break; }
      }
    }
    if (!explained) {
      pushIssue(issues, {
        type: 'unexplained-technical-term', sectionId: 'global',
        sentence: term,
        reason: `명리 용어 "${term}"이 본문에 등장하지만 일상어 풀이(쉽게/처럼/비유/뜻/라는 건 등)가 가까이 없음`,
        severity: 'medium',
        suggestion: `"${term}"을 처음 쓸 때 "쉽게 말하면 …처럼" 같은 짧은 비유로 풀어주기`,
      });
    }
  }

  // ─────────────────────────────────────────────
  // 8. generic-opening — 1장 첫 문장 검사
  // ─────────────────────────────────────────────
  const opening = byId.get('openingDefinition');
  if (opening) {
    const firstSentence = (opening.body.match(/[^\n.!?]+[.!?]?/)?.[0] ?? '').trim();
    for (const pat of GENERIC_OPENING_PATTERNS) {
      if (pat.test(firstSentence) || pat.test(opening.body.slice(0, 200))) {
        pushIssue(issues, {
          type: 'generic-opening', sectionId: 'openingDefinition',
          sentence: firstSentence.slice(0, 80),
          reason: `1장 첫 문장이 일반론 패턴(${pat}) — 누구에게나 적용 가능한 표현`,
          // 2026-05 audit: 품질 issue로 분류 (사용자 노출 구조 오류 아님). high → medium.
          severity: 'medium',
          suggestion: '겉/속 결 차이, 결정 방식, 사람을 대하는 자세 중 하나가 드러나도록 구체화',
        });
        break;
      }
    }
  }

  // ─────────────────────────────────────────────
  // 9. weak-final-message — 7장 마지막 한 문장
  // ─────────────────────────────────────────────
  // 2026-05: finalLine은 별도 섹션이 아니라 finalStrategyNarrative 본문 마지막에 포함됨.
  const finalStrategyForLine = byId.get('finalStrategyNarrative');
  if (finalStrategyForLine) {
    const trimmedBody = finalStrategyForLine.body.trim();
    // 본문 마지막 한 문장 추출 (마침표/물음표 기준)
    const sentences = trimmedBody.split(/(?<=[.!?])\s+/).filter(Boolean);
    const lastSentence = sentences[sentences.length - 1] ?? trimmedBody;
    const trimmed = lastSentence.trim();
    for (const pat of WEAK_FINAL_PATTERNS) {
      if (pat.test(trimmed)) {
        pushIssue(issues, {
          type: 'weak-final-message', sectionId: 'finalStrategyNarrative',
          sentence: trimmed.slice(0, 80),
          reason: `7장 마무리가 약함/일반론 (${pat})`,
          // 2026-05 audit: 품질 issue. high → medium.
          severity: 'medium',
          suggestion: '사주의 핵심 사용법을 응축한 한 문장으로 (저장하고 싶은 한 문장)',
        });
        break;
      }
    }
  }

  // ─────────────────────────────────────────────
  // 10. yearly-flow-too-similar — 연도별 본문 유사도
  // ─────────────────────────────────────────────
  const future = byId.get('futureFlowNarrative');
  if (future) {
    const years = splitYearBlocks(future.body);
    const yearSet = new Set(years.map(y => y.year));
    if (years.length < 3) {
      pushIssue(issues, {
        type: 'concreteness-misplaced', sectionId: 'futureFlowNarrative',
        sentence: '앞으로 3년',
        reason: `연도 블록 ${years.length}개 — futureTimingAnalysis.years 3개 모두 ### 연도 헤더로 분리하기`,
        severity: 'medium',
        suggestion: '각 연도를 ### 20XX 형태로 구분하여 본문 작성',
      });
    } else {
      const shingleSets = years.map(y => ({ year: y.year, set: shingles(y.body, 6) }));
      for (let i = 0; i < shingleSets.length; i++) {
        for (let j = i + 1; j < shingleSets.length; j++) {
          const sim = jaccard(shingleSets[i].set, shingleSets[j].set);
          if (sim >= 0.32) {
            pushIssue(issues, {
              type: 'yearly-flow-too-similar', sectionId: 'futureFlowNarrative',
              sentence: `${shingleSets[i].year} vs ${shingleSets[j].year}`,
              reason: `${shingleSets[i].year}년과 ${shingleSets[j].year}년 본문 유사도가 너무 높음 (shingle Jaccard ${sim.toFixed(2)}≥0.32)`,
              severity: 'medium',
              suggestion: '각 연도의 핵심 주제·생길 수 있는 사건·잡아야 할 것·조심할 것을 명확히 다르게 풀어쓰기',
            });
          }
        }
      }
    }
    // 활용 토큰 부족 (기존 concreteness-misplaced 유지)
    if (yearSet.size < gptInput.futureTimingAnalysis.years.length) {
      const missing = gptInput.futureTimingAnalysis.years
        .filter(y => !yearSet.has(y.year))
        .map(y => y.year);
      if (missing.length > 0) {
        pushIssue(issues, {
          type: 'missing-required-data-source', sectionId: 'futureFlowNarrative',
          sentence: missing.join(','),
          reason: `futureTimingAnalysis에 있는 연도 ${missing.join('/')}가 본문에 헤더로 등장하지 않음`,
          severity: 'medium',
          suggestion: '각 연도(### 20XX) 헤더를 만들고 핵심 주제를 줄글로',
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  // 11. career-recommendation-too-narrow & 기존 concreteness-misplaced
  // ─────────────────────────────────────────────
  // 2026-05: 직업/업계 검사는 careerTalentNarrative 섹션 기준
  const careerSection = byId.get('careerTalentNarrative');
  if (careerSection) {
    const careerWords = new Set<string>();
    const industries = new Set<string>();
    for (const c of gptInput.careerSpecificAnalysis.topCareerMatches) {
      const indHead = c.industry.split('/')[0]?.trim() ?? c.industry;
      industries.add(indHead);
      careerWords.add(indHead);
      for (const r of c.roles) careerWords.add(r);
    }
    let found = 0;
    for (const w of careerWords) if (w && careerSection.body.includes(w)) found++;
    if (found < 3) {
      pushIssue(issues, {
        type: 'career-section-too-thin', sectionId: 'careerTalentNarrative',
        sentence: '일과 재능 섹션',
        reason: `직업/업계 단어가 ${found}개로 부족 (3개 이상 필요) — careerSpecificAnalysis에서 가져와 문장에 녹이기`,
        severity: 'medium',
        suggestion: '"서비스 기획, PM, 컨설팅처럼 ..." 형식으로 자연스럽게',
      });
    }
    let industryHit = 0;
    for (const ind of industries) if (ind && careerSection.body.includes(ind)) industryHit++;
    if (industries.size >= 2 && industryHit <= 1) {
      pushIssue(issues, {
        type: 'career-recommendation-too-narrow', sectionId: 'careerTalentNarrative',
        sentence: '직업군 범위',
        reason: `직업 분야가 한 갈래만 노출됨 (가용 산업 ${industries.size}개 중 ${industryHit}개) — 핵심 능력 → 환경 → 여러 갈래 → 피할 환경 흐름으로 보강 필요`,
        severity: 'medium',
        suggestion: 'careerSpecificAnalysis.topCareerMatches에 있는 다른 산업/직무도 문장 속에 녹이고, 공통 핵심 능력으로 묶어 설명',
      });
    }
    // 환경/리더십/동료/독립 — 4개 키워드 중 2개 이상 보이는지
    const careerKeywords = ['환경', '리더십', '동료', '같이 일', '독립', '프리랜서', '이직'];
    const hitKw = careerKeywords.filter(k => careerSection.body.includes(k)).length;
    if (hitKw < 2) {
      pushIssue(issues, {
        type: 'career-section-too-thin', sectionId: 'careerTalentNarrative',
        sentence: '환경·리더십·동료·독립',
        reason: `일·재능 섹션에 환경/리더십/동료/독립 관련 단어가 ${hitKw}개로 부족 (2개 이상 필요)`,
        severity: 'medium',
        suggestion: '잘 맞는 업무 환경, 리더십 스타일, 같이 일하면 좋은 동료, 독립 가능성을 줄글로 보강',
      });
    }
  }

  // 2026-05: 돈/수익화 thin 검사
  const moneySection = byId.get('moneyMonetizationNarrative');
  if (moneySection) {
    const moneyMustHave = ['돈이 붙', '돈이 새', '수익', '가격', '계약', '범위', '상품', '포트폴리오', '컨설팅', '강의', '월급', '프로젝트', '사업'];
    const moneyHits = moneyMustHave.filter(k => moneySection.body.includes(k)).length;
    if (moneyHits < 5) {
      pushIssue(issues, {
        type: 'money-section-too-thin', sectionId: 'moneyMonetizationNarrative',
        sentence: '돈·수익화 섹션',
        reason: `돈/수익화 섹션에 핵심 키워드(돈이 붙/새, 가격, 계약, 상품, 포트폴리오, 컨설팅 등) ${moneyHits}개로 부족 (5개 이상 권장)`,
        severity: 'medium',
        suggestion: '돈이 붙는 방식, 새는 패턴, 수익화 구조(월급/전문성/프로젝트/사업), 가격표·작업 범위·정산 기준, 상품화 형태를 줄글로',
      });
    }
  }

  // 2026-05: 관계/연애 thin 검사
  const relSection = byId.get('relationshipLoveNarrative');
  if (relSection) {
    const relMustHave = ['편한 사람', '지치는', '마음이 열', '마음이 닫', '신뢰', '약속을 지', '서운', '갈등', '장기 관계'];
    const relHits = relMustHave.filter(k => relSection.body.includes(k)).length;
    if (relHits < 4) {
      pushIssue(issues, {
        type: 'relationship-section-too-thin', sectionId: 'relationshipLoveNarrative',
        sentence: '관계·연애 섹션',
        reason: `관계/연애 섹션에 핵심 키워드(편한 사람, 지치는, 마음이 열/닫, 신뢰, 서운, 갈등 등) ${relHits}개로 부족 (4개 이상 권장)`,
        severity: 'medium',
        suggestion: '편한 사람/지치는 사람 유형, 마음이 열리는·닫히는 방식, 신뢰 형성, 갈등 패턴, 장기 관계 조건을 줄글로',
      });
    }
  }

  // 2026-05: suggestion-coverage — 핵심 장에 "어떻게 하면 좋다" 가이드가 있는지
  const SUGGESTION_MARKERS = ['좋습니다', '필요합니다', '먼저 정', '먼저 확인', '연습', '먼저 보여', '먼저 말', '권장', '추천하'];
  const CRITICAL_SECTIONS = ['careerTalentNarrative', 'moneyMonetizationNarrative', 'relationshipLoveNarrative', 'finalStrategyNarrative'];
  for (const sid of CRITICAL_SECTIONS) {
    const block = byId.get(sid);
    if (!block) continue;
    const hits = SUGGESTION_MARKERS.filter(m => block.body.includes(m)).length;
    if (hits < 2) {
      pushIssue(issues, {
        type: 'suggestion-coverage-missing', sectionId: sid,
        sentence: sid,
        reason: `${sid} 섹션에 구체 제안/조언 마커가 ${hits}개로 부족 (2개 이상 필요) — 설명만 있고 적용 가이드가 약함`,
        severity: 'medium',
        suggestion: '"~하는 게 좋습니다", "~를 먼저 확인해야 합니다", "~ 연습이 필요합니다" 같은 가이드 문장을 자연스럽게',
      });
    }
  }

  // ─────────────────────────────────────────────
  // 12. financial-advice-risk
  // ─────────────────────────────────────────────
  for (const pat of FINANCIAL_RISK_PATTERNS) {
    const m = reportText.match(pat);
    if (m) {
      pushIssue(issues, {
        type: 'financial-advice-risk', sectionId: 'moneyMonetizationNarrative',
        sentence: m[0],
        reason: `투자/거래/시장 타이밍 권유처럼 들리는 표현 — moneyMakingStyle은 수익화 구조·보상 방식으로 바꿔야`,
        severity: 'high',
        suggestion: '작은 단위 검증, 작업 범위/보상 기준, 결과물 기반 보상으로 표현 재작성',
      });
    }
  }

  // ─────────────────────────────────────────────
  // 13. 일반론·공포·미래 단정·톤 (기존)
  // ─────────────────────────────────────────────
  for (const pat of GENERIC_PATTERNS) {
    const m = reportText.match(pat);
    if (m) {
      // 2026-05 audit: 일반론은 품질 issue. high → medium.
      pushIssue(issues, { type: 'generic', sectionId: 'global', sentence: m[0], reason: '일반론 표현', severity: 'medium', suggestion: '구체적 결로 재작성' });
    }
  }
  for (const pat of FEAR_PATTERNS) {
    const m = reportText.match(pat);
    if (m) {
      pushIssue(issues, { type: 'invented-claim', sectionId: 'global', sentence: m[0], reason: '공포·운명 단정', severity: 'high', suggestion: '구조적 설명으로 대체' });
    }
  }
  for (const pat of DETERMINISTIC_FUTURE) {
    const m = reportText.match(pat);
    if (m) {
      pushIssue(issues, { type: 'invented-claim', sectionId: 'global', sentence: m[0], reason: '미래 사건 단정', severity: 'high', suggestion: '"~할 수 있어요"로 완화' });
    }
  }
  for (const pat of TONE_BAD) {
    const m = reportText.match(pat);
    if (m) {
      pushIssue(issues, { type: 'tone-broken', sectionId: 'global', sentence: m[0], reason: '유행어/밈 — 친근하되 가볍지 않은 톤 위반', severity: 'low', suggestion: '제거 또는 일반 표현으로' });
    }
  }

  // ─────────────────────────────────────────────
  // 14. 컨텍스트 충돌
  // ─────────────────────────────────────────────
  const ctx = gptInput.userContext;
  if (ctx.relationshipStatus === 'married' && /새로운 인연이? (들어|찾아)/.test(reportText)) {
    pushIssue(issues, { type: 'context-conflict', sectionId: 'global', sentence: '새로운 인연', reason: '기혼자에게 새 인연 표현', severity: 'high', suggestion: '제거' });
  }
  if (ctx.age >= 50 && /(수능|첫 취업)/.test(reportText)) {
    pushIssue(issues, { type: 'context-conflict', sectionId: 'global', sentence: '수능/첫 취업', reason: '50세 이상에게 수능/첫 취업', severity: 'high', suggestion: '제거' });
  }

  // ─────────────────────────────────────────────
  // 15. 신살 hallucination
  // ─────────────────────────────────────────────
  const KNOWN_SHINSAL = ['천을귀인','문창귀인','학당귀인','월덕귀인','천덕귀인','태극귀인','괴강','양인','백호','도화','홍염','화개','역마'];
  const allowedStarNames = new Set(gptInput.coreAnalysis.specialStars.map(s => s.name));
  for (const name of KNOWN_SHINSAL) {
    if (reportText.includes(name) && !allowedStarNames.has(name)) {
      pushIssue(issues, { type: 'invented-claim', sectionId: 'global', sentence: name,
        reason: `JSON specialStars에 없는 신살(${name})이 본문에 등장`, severity: 'medium',
        suggestion: '제거 또는 JSON에 있는 신살로 대체' });
    }
  }

  // ─────────────────────────────────────────────
  // 16. missing-topic-coverage — TopicCoverageMap 필수 토픽이 본문에 없으면 fail
  // ─────────────────────────────────────────────
  if (topicCoverageMap) {
    const checkedTopics = new Set<NarrativeTopicKey>();
    // (a) REQUIRED_TOPICS_HARD는 무조건 검사 (map에서 false여도 무시 안 함)
    for (const topic of REQUIRED_TOPICS_HARD) {
      checkedTopics.add(topic);
      if (!topicMatched(reportText, topic, gptInput)) {
        pushIssue(issues, {
          type: 'missing-topic-coverage', sectionId: 'global',
          sentence: topic,
          reason: `필수 토픽 "${topic}"이 본문 어디에도 흡수되지 않음`,
          // 2026-05 audit: 본문 어디에도 안 흡수 = 품질 coverage 부족. 사용자 노출 leak 아님. high → medium.
          severity: 'medium',
          suggestion: `해당 토픽을 가장 자연스러운 섹션에 줄글로 녹여라 (섹션 추가 X, 본문 안에)`,
        });
      }
    }
    // (b) topicCoverageMap에서 true인 나머지 토픽
    for (const [key, required] of Object.entries(topicCoverageMap) as [NarrativeTopicKey, boolean][]) {
      if (!required || checkedTopics.has(key)) continue;
      if (!topicMatched(reportText, key, gptInput)) {
        pushIssue(issues, {
          type: 'missing-topic-coverage', sectionId: 'global',
          sentence: key,
          reason: `TopicCoverageMap의 "${key}"가 본문에 흡수되지 않음`,
          severity: 'medium',
          suggestion: `해당 토픽을 가장 자연스러운 섹션에 줄글로 녹여라`,
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  // 17. missing-life-scene — 본문 전체에 실제 장면 마커 < 3개면 fail
  // ─────────────────────────────────────────────
  const sceneCount = countLifeSceneMarkers(reportText);
  if (sceneCount < 3) {
    pushIssue(issues, {
      type: 'missing-life-scene', sectionId: 'global',
      sentence: `life-scene-markers=${sceneCount}`,
      reason: `해석은 있는데 실제 삶의 장면(회의/가족/연인/직장 등) 마커가 ${sceneCount}개로 부족 (3개 이상 필요)`,
      severity: 'medium',
      suggestion: 'NarrativePlan의 lifeSceneHint를 줄글 흐름 안에 자연스럽게 녹여라',
    });
  }

  // ─────────────────────────────────────────────
  // 18. relationship-topic-missing / family-early-topic-missing
  // ─────────────────────────────────────────────
  if (!topicMatched(reportText, 'relationshipStyle', gptInput)
      && !topicMatched(reportText, 'loveMarriageStyle', gptInput)
      && !topicMatched(reportText, 'relationshipPattern', gptInput)) {
    pushIssue(issues, {
      type: 'relationship-topic-missing', sectionId: 'global',
      sentence: 'relationship/love',
      reason: '개인사주 본문에 관계/연애/장기 관계 스타일이 전혀 없음 — 궁합 기능이 따로 있어도 개인사주는 "나의 관계 스타일"이 필요',
      // 2026-05 audit: 단순 coverage 부족은 품질 issue. high → medium.
      // (섹션 자체가 비어있거나 다른 섹션이 침범한 경우는 cross-section-leak/final-section-missing이 high로 별도 잡음)
      severity: 'medium',
      suggestion: '4장 또는 3장에 "관계에서는 ..." / "연애나 가까운 관계에서도 ..." 한 단락 줄글로',
    });
  }
  if (!topicMatched(reportText, 'familyEarlyPattern', gptInput)) {
    pushIssue(issues, {
      type: 'family-early-topic-missing', sectionId: 'global',
      sentence: 'family/early',
      reason: '가족/초년 흐름이 전혀 없음. 단정 없이 조건부로라도 한 단락 필요',
      severity: 'medium',
      suggestion: '2장 또는 3장에 "초년 흐름이나 가족 안에서의 역할이 강했다면 ..." 식 조건부 단락',
    });
  }

  // ─────────────────────────────────────────────
  // 19. unsupported-user-context — userContext에 없는 정보 단정
  // ─────────────────────────────────────────────
  const uctx = gptInput.userContext;
  if (uctx.relationshipStatus !== 'married') {
    // 2026-05 audit 확장: 부부/기혼자/결혼한 상태 추가. "배우자"는 "배우자궁" 명리용어 제외.
    const forbidExact = ['결혼한 사용자', '결혼한 상태', '남편', '아내', '결혼 생활', '신혼', '기혼자', '부부'];
    for (const w of forbidExact) {
      if (reportText.includes(w)) {
        pushIssue(issues, {
          type: 'unsupported-user-context', sectionId: 'global',
          sentence: w,
          reason: `userContext.relationshipStatus=${uctx.relationshipStatus}인데 "${w}" 표현 사용 — 기혼 단정 금지`,
          severity: 'high',
          suggestion: '"장기 관계를 생각한다면" / "가까운 관계에서는" / "연애나 결혼으로 이어질 관계에서는" 조건부 표현으로',
        });
      }
    }
    // "배우자"는 "배우자궁" 제외하고 본문에서 잡음
    const spouseRe = /배우자(?!궁)/;
    if (spouseRe.test(reportText)) {
      pushIssue(issues, {
        type: 'unsupported-user-context', sectionId: 'global',
        sentence: '배우자',
        reason: `userContext.relationshipStatus=${uctx.relationshipStatus}인데 "배우자" 단정 표현 사용 (배우자궁 명리용어 제외)`,
        severity: 'high',
        suggestion: '"장기적인 관계의 상대" / "연인·파트너를 생각한다면" 조건부로',
      });
    }
  }
  if (uctx.hasChildren !== true) {
    // 2026-05 audit 확장: "자녀"·"아이" 단독 단정 표현도 추가 (단, 명리용어 풀이는 제외)
    const forbid = ['자녀와', '아이와', '자녀 양육', '자녀 교육', '자녀를', '자녀가', '자녀의'];
    for (const w of forbid) {
      if (reportText.includes(w)) {
        pushIssue(issues, {
          type: 'unsupported-user-context', sectionId: 'global',
          sentence: w,
          reason: `userContext.hasChildren=${String(uctx.hasChildren)}인데 "${w}" 표현 사용 — 자녀 보유 단정 금지`,
          severity: 'high',
          suggestion: '"후배·제자·돌봄이 필요한 대상" / "장기적으로 책임지는 대상" 조건부로',
        });
      }
    }
  }

  // ─────────────────────────────────────────────
  // 20. cross-section / future / final / english-key leak (2026-05 stabilize)
  // ─────────────────────────────────────────────
  const hasFuturePlan = !!narrativePlans?.some(p => p.sectionId === 'futureFlowNarrative');

  // future-leak — plan에 futureFlow 없는데 미래 콘텐츠가 본문에 등장
  if (!hasFuturePlan) {
    // 2026-05 강화: "향후 3년 / 다음 3년 / 미래 흐름 / 세운" 추가.
    // \b는 한국어에 안 통하므로 한글 패턴에서 제거. 숫자 시작 패턴만 \b 유지.
    const futureMarkerRe = /\b202[6-9]년|\b203\d년|앞으로\s*3년|향후\s*3년|다음\s*3년|미래\s*흐름|올해\s*하반기|세운(?!이라는|을\s*뜻)/;
    for (const b of blocks) {
      if (b.id === 'futureFlowNarrative') continue;
      const m = b.body.match(futureMarkerRe);
      if (m) {
        pushIssue(issues, {
          type: 'future-leak', sectionId: b.id,
          sentence: m[0],
          reason: `${b.id} 본문에 미래 표현 "${m[0]}" 등장 — plan에 futureFlow가 없는데 GPT가 자발적으로 미래 단어 사용`,
          severity: 'high',
          suggestion: '해당 섹션에서 미래 연도/타임라인 제거. 본문은 현재·과거·일반 가이드만',
        });
      }
    }
  }

  // cross-section leak — money 본문에 결론조, relationship 본문에 결론조
  const moneyBlock = byId.get('moneyMonetizationNarrative');
  if (moneyBlock) {
    const finalLikeInMoney = /결국\s*이\s*사주는|사주의\s*사용법|핵심\s*사용법|마지막으로\s*당부/;
    const m = moneyBlock.body.match(finalLikeInMoney);
    if (m) {
      pushIssue(issues, {
        type: 'cross-section-leak', sectionId: 'moneyMonetizationNarrative',
        sentence: m[0],
        reason: `5장(돈) 본문에 결론조 "${m[0]}" 침범 — 결론은 마지막 섹션에서`,
        severity: 'high',
        suggestion: '결론 톤 문장을 제거하고 돈/수익화 주제로 한정',
      });
    }
  }
  const relBlock = byId.get('relationshipLoveNarrative');
  if (relBlock) {
    const finalLikeInRel = /결국\s*이\s*사주는|사주의\s*사용법|핵심\s*사용법|마지막으로\s*당부|이\s*사주를\s*어떻게\s*써야/;
    const m = relBlock.body.match(finalLikeInRel);
    if (m) {
      pushIssue(issues, {
        type: 'cross-section-leak', sectionId: 'relationshipLoveNarrative',
        sentence: m[0],
        reason: `6장(관계) 본문에 결론조 "${m[0]}" 침범 — 결론은 마지막 섹션에서`,
        severity: 'high',
        suggestion: '결론 톤 문장을 제거하고 관계/연애 주제로 한정',
      });
    }
  }

  // final-section-missing — 결론 본문이 비었거나 너무 짧음
  const finalBlock = byId.get('finalStrategyNarrative');
  const finalCompactLen = finalBlock ? finalBlock.body.replace(/\s+/g, '').length : 0;
  if (finalCompactLen < 200) {
    pushIssue(issues, {
      type: 'final-section-missing', sectionId: 'finalStrategyNarrative',
      sentence: `compactLen=${finalCompactLen}`,
      reason: `결론 섹션(finalStrategyNarrative)이 비어있거나 너무 짧음 — 헤더 누락 또는 다른 섹션에 결론이 흡수된 가능성`,
      severity: 'high',
      suggestion: 'plan의 마지막 헤더 번호로 결론 섹션 본문 작성 (앞 섹션에 결론 침범 금지)',
    });
  }

  // english-element-key-leak — 본문에 wood/fire/earth/metal/water 단독 단어 등장
  const englishKeyRe = /\b(wood|fire|earth|metal|water)\b/i;
  const fullMatch = reportText.match(englishKeyRe);
  if (fullMatch) {
    pushIssue(issues, {
      type: 'english-element-key-leak', sectionId: 'global',
      sentence: fullMatch[0],
      reason: `본문에 영문 오행 키 "${fullMatch[0]}" 노출 — 반드시 한글(목/화/토/금/수)로`,
      severity: 'high',
      suggestion: `"${fullMatch[0]}"를 한글 오행으로 치환`,
    });
  }

  // ─────────────────────────────────────────────
  // 종합 — 2026-05 stabilize: cross-leak 등이 high로 잡히면 repair 발동
  // medium 임계 강화 22 → 12
  // ─────────────────────────────────────────────
  const high = issues.filter(i => i.severity === 'high').length;
  const medium = issues.filter(i => i.severity === 'medium').length;
  return {
    isValid: high === 0 && medium < 12,
    issues,
  };
}

// ============================================================
// 외부 공개 헬퍼 — 섹션별 repair flow에서 실패 섹션 목록 추출용
// ============================================================
export function collectFailingSectionsFromIssues(
  issues: NarrativeValidationIssue[],
): Set<string> {
  const out = new Set<string>();
  // 섹션 단위로 격리 가능한 이슈 타입 (global은 제외)
  const SECTIONAL_TYPES = new Set([
    'missing-narrative-fact',
    'missing-required-data-source',
    'underdeveloped-section',
    'checklist-overuse',
    'concreteness-misplaced',
    'yearly-flow-too-similar',
    'career-recommendation-too-narrow',
    'generic-opening',
    'weak-final-message',
    'hidden-question-uncovered',
    // 2026-05
    'career-section-too-thin',
    'money-section-too-thin',
    'relationship-section-too-thin',
    'suggestion-coverage-missing',
  ]);
  for (const iss of issues) {
    if (!SECTIONAL_TYPES.has(iss.type)) continue;
    // sectionId가 "a,b" 콤마 결합 형태일 수 있음 → 각각 추가
    for (const sid of String(iss.sectionId).split(',')) {
      const trimmed = sid.trim();
      if (!trimmed || trimmed === 'global') continue;
      // finalLine은 7번 섹션 — 따로 표시
      out.add(trimmed);
    }
  }
  return out;
}
