// 궁합 리포트 검증기.
// 점수 사용 / 마음 단정 / 희망고문 / 조작적 조언 / 운명 단정 / 미래 단정 /
// 금지 추상어 / 중복 표현 / 관계 유형 불일치.

import type {
  CompatibilityValidationIssue, CompatibilityValidationResult,
  CompatibilityGptInput, RelationshipType,
} from '../compatibilityTypes';

interface Args {
  reportText: string;
  gptInput: CompatibilityGptInput;
}

// 섹션 헤더 # 1. ~ # 11.로 분할
interface SectionBlock { id: string; index: number; title: string; body: string; }
const SECTION_IDS = [
  'relationshipCard', 'archetype', 'overview', 'keywords',
  'attraction', 'conflict', 'choices', 'questions',
  'futureFlow', 'practicalGuide', 'evidence',
];
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
    if (cur.index < 1 || cur.index > 11) continue;
    blocks.push({ id: SECTION_IDS[cur.index - 1], index: cur.index, title: cur.title, body });
  }
  return blocks;
}

// ============================================================
// 검사 항목
// ============================================================

const SCORE_PATTERNS = [
  /\b\d{1,3}\s*점\b/, /\b\d{1,3}\s*%/, /끌림 ?지수/, /궁합 ?점수/,
  /상위\s*\d/, /총점/, /\b등급\b/,
];

const MIND_READING_PATTERNS = [
  /상대도\s*(아직)?\s*(좋아|사랑|미련)/,
  /상대\s*마음은\s*(이미|아직)/,
];

const FALSE_HOPE_PATTERNS = [
  /반드시\s*재회/, /무조건\s*다시\s*만/, /상대도\s*기다리/,
];

const MANIPULATIVE_PATTERNS = [
  /연락을\s*끊으면\s*(상대가|상대는)/,
  /일부러\s*잠수/,
  /무시하면\s*돌아/,
];

const DETERMINISTIC_FUTURE_PATTERNS = [
  /\b(20\d{2}|올해|내년|내후년)에?\s*(결혼|이별|재회|이혼|임신)\s*(합니다|해요|할\s*것)/,
  /\b반드시\s*(결혼|이별|재회|이혼)/,
];

const FEAR_PATTERNS = [
  /이\s*관계는\s*절대\s*안/, /평생\s*불행/, /운명을\s*거스/,
];

const FAKE_RARITY_PATTERNS = [
  /100년에\s*한\s*번/, /천생연분\s*확정/, /상위\s*1%\s*궁합/,
];

const VAGUE_STANDALONE = [
  '잘 맞는다', '안 맞는다', '소통이 중요', '배려가 필요', '조심해야 한',
  '좋은 기회', '관계가 변',
];

// 같은 표현이 3개 이상 섹션에 나오면 repetition issue
const REPETITION_WATCH = [
  '회복 룰', '거리감', '속도 조절', '결론내지 말', '천천히 다가가',
  '도움을 요청', '혼자 짊어', '24시간', '룰을 정하',
];

function pushIssue(
  arr: CompatibilityValidationIssue[],
  type: CompatibilityValidationIssue['type'],
  sectionId: string,
  sentence: string,
  reason: string,
  severity: CompatibilityValidationIssue['severity'],
  suggestion: string,
): void {
  arr.push({ type, sectionId, sentence: sentence.slice(0, 200), reason, severity, suggestion });
}

function checkPatterns(
  blocks: SectionBlock[],
  patterns: RegExp[],
  type: CompatibilityValidationIssue['type'],
  severity: CompatibilityValidationIssue['severity'],
  reason: string,
  suggestion: string,
  issues: CompatibilityValidationIssue[],
): void {
  for (const b of blocks) {
    const sents = b.body.split(/(?<=[.!?。])\s+/);
    for (const s of sents) {
      for (const re of patterns) {
        if (re.test(s)) {
          pushIssue(issues, type, b.id, s.trim(), reason, severity, suggestion);
          break;
        }
      }
    }
  }
}

// ============================================================
// 메인 검증
// ============================================================

export function validateCompatibilityReport({ reportText, gptInput }: Args): CompatibilityValidationResult {
  const blocks = splitSections(reportText);
  const issues: CompatibilityValidationIssue[] = [];

  // 1. 점수 사용
  checkPatterns(blocks, SCORE_PATTERNS, 'score-used', 'high',
    '점수·등급·퍼센트는 궁합 리포트에서 사용 금지',
    '"점수" 대신 관계 아키타입과 키워드로 표현', issues);

  // 2. 마음 단정
  checkPatterns(blocks, MIND_READING_PATTERNS, 'mind-reading', 'high',
    '상대 마음을 단정하는 표현',
    '"~할 가능성이 있어요" 같은 표현으로 바꿀 것', issues);

  // 3. 희망고문 (재회/이별일 때만 high)
  const fhSeverity: CompatibilityValidationIssue['severity'] =
    gptInput.relationshipType === 'reunion_or_breakup' ? 'high' : 'medium';
  checkPatterns(blocks, FALSE_HOPE_PATTERNS, 'false-hope', fhSeverity,
    '재회 희망고문성 표현',
    '"자기 측에서 점검할 영역" 형식으로 한정', issues);

  // 4. 조작적 조언
  checkPatterns(blocks, MANIPULATIVE_PATTERNS, 'manipulative-advice', 'high',
    '상대를 조종하려는 조언',
    '자기 행동 변화 중심 조언으로 대체', issues);

  // 5. 미래 단정
  checkPatterns(blocks, DETERMINISTIC_FUTURE_PATTERNS, 'deterministic-future', 'high',
    '미래 사건 단정 (결혼/이별/재회/임신)',
    '"주제가 강해질 수 있다" / "결정이 필요해질 수 있다" 등으로 표현', issues);

  // 6. 공포·운명론
  checkPatterns(blocks, FEAR_PATTERNS, 'fear-marketing', 'high',
    '공포·운명론 표현',
    '구조적 설명으로 대체', issues);

  // 7. 허위 희소성
  checkPatterns(blocks, FAKE_RARITY_PATTERNS, 'fake-rarity', 'medium',
    '실제 희소성처럼 들리는 표현',
    '비유로만 쓰고 즉시 현실 해석을 붙이기', issues);

  // 8. 금지 추상어 단독 사용 (구체 예시 없는 경우만)
  for (const b of blocks) {
    if (!['attraction', 'conflict', 'choices', 'questions', 'futureFlow', 'practicalGuide'].includes(b.id)) continue;
    for (const phrase of VAGUE_STANDALONE) {
      const idx = b.body.indexOf(phrase);
      if (idx < 0) continue;
      // 같은 문장 안에 구체 예시 (쉼표·"예:"·"처럼") 있으면 OK
      const sentEnd = (() => {
        const e1 = b.body.indexOf('.', idx);
        const e2 = b.body.indexOf('\n', idx);
        const c = [e1, e2].filter(x => x > 0);
        return c.length ? Math.min(...c) : b.body.length;
      })();
      const sentStart = Math.max(0, b.body.lastIndexOf('.', idx), b.body.lastIndexOf('\n', idx));
      const sentence = b.body.slice(sentStart, sentEnd).trim();
      const hasConcrete = /[,·]|또는|예를\s*들어|예:|처럼|같은/.test(sentence);
      if (!hasConcrete) {
        pushIssue(issues, 'vague-expression', b.id, sentence,
          `"${phrase}" 단독 사용 — 구체 장면·룰로 풀어쓸 것`, 'medium',
          '실제 행동·룰·장면으로 풀어쓰기');
      }
    }
  }

  // 9. 반복 표현
  for (const phrase of REPETITION_WATCH) {
    const hits = blocks.filter(b => b.body.includes(phrase)).map(b => b.id);
    if (hits.length >= 3) {
      pushIssue(issues, 'repetition', hits.join(','), phrase,
        `같은 표현이 ${hits.length}개 섹션에서 반복됨`, 'medium',
        '한 섹션은 원인 설명, 한 섹션은 실제 장면, 한 섹션은 구체 행동으로 역할 나누기');
    }
  }

  // 10. 관계 유형 불일치 — 잘못된 단어가 나오는지
  if (gptInput.relationshipType !== 'reunion_or_breakup') {
    const reword = /\b재회\b/;
    for (const b of blocks) {
      if (reword.test(b.body)) {
        pushIssue(issues, 'relationship-type-mismatch', b.id, '재회',
          '재회/이별 유형이 아닌데 "재회" 단어 사용', 'medium',
          '관계 유형에 맞는 표현으로 대체');
        break;
      }
    }
  }
  if (gptInput.relationshipType !== 'married' && gptInput.relationshipType !== 'dating') {
    // 결혼/연애 아닌데 "결혼" 권유 표현
    if (/결혼을\s*권/.test(reportText)) {
      pushIssue(issues, 'relationship-type-mismatch', 'global', '결혼 권유',
        '연애/혼인 외 유형에서 결혼 권유', 'medium', '관계 유형 가중치에 맞는 조언으로');
    }
  }

  // 11. archetype id 변조 — id가 본문에 그대로 들어 있어야 함은 아니지만 title 핵심 키워드 유지 검사
  const targetLabel = gptInput.compatibilityAnalysis.relationshipArchetype.shortLabel;
  const archetypeBlock = blocks.find(b => b.id === 'archetype');
  if (archetypeBlock && targetLabel && !archetypeBlock.body.includes(targetLabel) && !archetypeBlock.body.includes(gptInput.compatibilityAnalysis.relationshipArchetype.title.slice(0, 6))) {
    pushIssue(issues, 'archetype-mismatch', 'archetype', targetLabel,
      `relationshipArchetype shortLabel(${targetLabel})/title 핵심 단어가 archetype 섹션에 없음`,
      'medium', 'archetype.title 또는 shortLabel을 그대로 사용');
  }

  const highCount = issues.filter(i => i.severity === 'high').length;
  const mediumCount = issues.filter(i => i.severity === 'medium').length;
  const isValid = highCount === 0 && mediumCount < 5;
  return { isValid, issues };
}
