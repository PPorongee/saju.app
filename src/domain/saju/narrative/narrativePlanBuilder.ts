// 서사형 개인사주 — 섹션별 NarrativePlan 결정론적 빌더 (2026-05).
//
// 분석 데이터(PersonalSajuGptInput)에서 각 섹션이 반드시 본문에 흡수해야 할
// 데이터 조각(mustUseFacts), 전개 순서(requiredBeats), 스타일 예시(styleExamples),
// 피해야 할 표현(avoidRepeating)을 미리 결정해둔다.
//
// GPT는 이 plan을 받아 본문을 작성하고, validator는 mustUseFacts.matchTokens가
// 본문에 흡수됐는지 검사. 흡수되지 않으면 missing-narrative-fact로 실패 → 섹션별 repair.

import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type {
  NarrativePlan, NarrativeMustUseFact, NarrativePlanSet,
} from './narrativeTypes';
import type { LifeSceneHint, LifeSceneSectionId, LifeSceneSource } from './lifeSceneHintBuilder';

// ============================================================
// hint pick — (sectionId, source)로 가장 첫 hint 찾기
// ============================================================
function pickHint(
  hints: LifeSceneHint[] | undefined,
  sectionId: LifeSceneSectionId,
  source: LifeSceneSource,
): NarrativeMustUseFact['lifeSceneHint'] | undefined {
  if (!hints) return undefined;
  const found = hints.find(h => h.sectionId === sectionId && h.source === source);
  if (!found) return undefined;
  return {
    situation: found.situation,
    likelyBehavior: found.likelyBehavior,
    innerReaction: found.innerReaction,
    externalMisunderstanding: found.externalMisunderstanding,
    betterUse: found.betterUse,
  };
}

// ============================================================
// 명리 용어 → 일상어 풀이 시드
// ============================================================
const TERM_PLAIN_MEANING: Record<string, string> = {
  // 일간
  '무토': '큰 산이나 넓은 땅처럼 한 번 중심이 잡히면 쉽게 흔들리지 않으려는 기질',
  '기토': '경작지나 정원의 흙처럼 사람과 관계를 부드럽게 다듬는 기질',
  '갑목': '곧게 자라는 큰 나무처럼 추진하고 위로 뻗으려는 기질',
  '을목': '풀이나 덩굴처럼 유연하게 자라고 환경에 적응하는 기질',
  '병화': '한낮의 태양처럼 밝고 선명하게 드러내는 기질',
  '정화': '촛불이나 등불처럼 따뜻하고 섬세하게 비추는 기질',
  '경금': '단단한 금속처럼 결정하고 끊는 추진 기질',
  '신금': '날카로운 칼이나 보석처럼 세밀하고 예리한 기질',
  '임수': '큰 강이나 바다처럼 깊고 멀리 보는 흐름의 기질',
  '계수': '비나 이슬처럼 부드럽게 스며들어 자라게 하는 기질',
  // 십성
  '비견': '같은 결의 동료/자기 힘 — 독립성·경쟁심·버티는 힘',
  '겁재': '같은 결인데 더 공격적인 힘 — 추진과 충돌',
  '식신': '내가 만들어내는 결과물 — 표현·창작·꾸준함',
  '상관': '식신보다 자유롭게 표현하는 힘 — 재능·기획·말',
  '편재': '큰돈·유동성·네트워크 같은 흐름의 자원',
  '정재': '꾸준한 수입·계획적인 자원 관리',
  '편관': '강한 책임·시험·위계 — 무거운 자리',
  '정관': '안정적인 책임·직책·규칙',
  '편인': '독특한 학습·통찰·직관',
  '정인': '안정적인 학습·도움·지원자',
  // 신살
  '양인': '위기에서 밀리지 않으려는 힘',
  '괴강': '기준이 강하게 서는 기운',
  '백호': '강하고 격렬한 추진력 — 큰 변화에 노출',
  '도화': '사람을 끄는 매력·주목받는 자리',
  '홍염': '사람과 가까워지는 매력·감정의 결',
  '화개': '내면·예술·고요함을 향한 결',
  '역마': '이동·변화·확장의 흐름',
  '천을귀인': '결정적인 순간에 도와주는 사람을 만나는 결',
  '문창귀인': '학문·문서·표현이 잘 통하는 결',
  '학당귀인': '배움이 자산이 되는 결',
  '월덕귀인': '주변에서 따뜻하게 받쳐주는 결',
  '천덕귀인': '하늘의 덕처럼 위기에서 풀려나는 결',
  // 패턴
  '식상생재': '내가 만든 것이 돈으로 이어지는 흐름',
  '관인상생': '책임이 학습·통찰로 이어져 자리를 키우는 흐름',
  '재생관': '돈/자원이 책임/자리를 키우는 흐름',
  '살인상생': '강한 책임이 학습으로 풀려 자리를 만드는 흐름',
};

// ============================================================
// FutureTimingTheme → 본문 검색용 한글 키워드 (validator matchTokens 시드)
// ============================================================
const THEME_KEYWORDS: Record<string, string[]> = {
  career: ['일', '직무', '업무', '역할', '자리'],
  money: ['돈', '수익', '보상', '계약'],
  relationship: ['관계', '사람', '연결', '협업'],
  move: ['이동', '이사', '환경 변화', '생활권'],
  study: ['공부', '학습', '자격', '문서'],
  family: ['가족', '집안', '부모'],
  'self-branding': ['포트폴리오', '브랜딩', '결과물', '콘텐츠'],
  business: ['사업', '프로젝트', '독립'],
  rest: ['쉼', '회복', '정비'],
  responsibility: ['책임', '맡', '범위', '권한'],
};

// ============================================================
// matchTokens 빌더 — 한국어 phrase에서 부분 매칭 토큰 생성
// ============================================================
function buildMatchTokens(...sources: string[]): string[] {
  const out = new Set<string>();
  for (const s of sources) {
    if (!s) continue;
    const trimmed = s.trim();
    if (!trimmed) continue;
    out.add(trimmed);
    // 공백·구두점 분리 chunk
    for (const chunk of trimmed.split(/[\s/·,()'"、]+/)) {
      if (chunk.length >= 2 && chunk.length <= 10) {
        out.add(chunk);
        // 끝에 흔한 조사·어미가 붙어 있으면 stem 변형도 추가
        if (chunk.length >= 3) {
          const last = chunk.slice(-1);
          if (/[은는이가을를의에서로와과도]/.test(last)) {
            const stem = chunk.slice(0, -1);
            if (stem.length >= 2) out.add(stem);
          }
          // ~한/~인 같은 관형형 → 어간
          if (/[한인]$/.test(chunk)) {
            const stem = chunk.slice(0, -1);
            if (stem.length >= 2) out.add(stem);
          }
        }
      }
    }
  }
  return Array.from(out);
}

function plainOf(term: string, fallback?: string): string {
  return TERM_PLAIN_MEANING[term] ?? fallback ?? `${term} 관련 결`;
}

// ============================================================
// 섹션 1 — openingDefinition
// ============================================================
function buildOpeningPlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativePlan {
  const facts: NarrativeMustUseFact[] = [];

  // top 3 identityKeywords (첫 fact에 lifeSceneHint 부착)
  input.identityKeywords.slice(0, 3).forEach((k, i) => {
    facts.push({
      id: `identity-${i}`,
      source: 'identityKeyword',
      fact: k.keyword,
      plainMeaning: k.shortDescription || k.narrativeHint || k.keyword,
      narrativeHint: '1장 도입~중반 단락 안에 자연스럽게 녹여라 (리스트 X)',
      matchTokens: buildMatchTokens(k.keyword, k.shortDescription),
      lifeSceneHint: i === 0 ? pickHint(hints, 'openingDefinition', 'identityKeyword') : undefined,
    });
  });

  // top 1~2 specialPoints (displayPriority 내림차순)
  const sortedSP = [...input.specialPoints]
    .sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0))
    .slice(0, 2);
  sortedSP.forEach((p, i) => {
    facts.push({
      id: `specialPoint-${i}`,
      source: 'specialPoint',
      fact: p.name,
      plainMeaning: plainOf(p.name, p.narrative?.coreMeaning),
      narrativeHint: '1장 마지막 단락에서 이 사주가 눈에 띄는 이유로 풀어 사용 — 용어 즉시 일상어 풀이 필수',
      matchTokens: buildMatchTokens(p.name, p.shortLabel),
      lifeSceneHint: i === 0 ? pickHint(hints, 'openingDefinition', 'specialPoint') : undefined,
    });
  });

  // dayMaster
  const dm = input.birthChart.dayMaster;
  facts.push({
    id: 'dayMaster-opening',
    source: 'dayMaster',
    fact: dm,
    plainMeaning: plainOf(dm),
    narrativeHint: '1장에서는 한 줄 언급(기질 톤 잡기). 본격 풀이는 2장에서',
    matchTokens: buildMatchTokens(dm, dm[0] ?? ''),
  });

  return {
    sectionId: 'openingDefinition',
    sectionGoal: '이 사주의 핵심을 한 문장으로 잡고, 독자가 계속 읽고 싶게 만든다.',
    topicCoverageTargets: ['oneLineDefinition', 'coreKeywords', 'outerInnerContrast', 'specialPoints'],
    mustUseFacts: facts,
    requiredBeats: [
      '이 사주를 대표하는 한 문장으로 시작한다(겉/속 결 차이나 결정 방식이 드러나야 함).',
      '그 한 문장이 실제 삶에서 어떻게 나타나는지 1~2단락 설명한다.',
      '핵심 키워드 3~5개를 문장 속에 녹인다(리스트 X).',
      'specialPoints를 일상어로 풀어준다 (예: "양인은 쉽게 말해 ...").',
      '이 힘이 장점이 되는 상황과 부담이 되는 상황을 함께 말한다.',
      '다음 장으로 자연스럽게 이어지는 문장으로 끝낸다.',
    ],
    avoidRepeating: [
      '위기에서 쉽게 꺾이지 않는',
      '안정성과 신뢰를 중시',
      '상위 1%', '희귀한 사주', '무조건 성공',
    ],
    styleExamples: {
      badExample: '이 사주는 위기에서 쉽게 꺾이지 않는 힘을 지닌 사람입니다.',
      goodExample:
        '이 사주를 한 문장으로 말하면, 겉으로는 차분해 보여도 안쪽에는 쉽게 물러서지 않는 승부심을 품은 사람에 가까워요.\n\n' +
        '평소에는 조용히 상황을 지켜보다가도, 막상 일이 꼬이거나 누군가 결정을 미루는 순간이 오면 "그럼 내가 정리해야지" 쪽으로 몸이 먼저 움직일 수 있습니다.\n\n' +
        '양인은 위기에서 밀리지 않으려는 힘이고, 괴강은 기준이 강하게 서는 기운으로 볼 수 있습니다. 다만 이 힘이 강할수록 혼자 너무 오래 버티는 패턴도 함께 생길 수 있어요.',
      transformationRule: '핵심 성향을 한 문장으로 끝내지 말고, 실제 장면과 명리 근거와 그림자까지 이어서 설명하라.',
    },
  };
}

// ============================================================
// 섹션 2 — lifeStructureNarrative
// ============================================================
function buildLifeStructurePlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativePlan {
  const facts: NarrativeMustUseFact[] = [];

  // dayMaster (본격 풀이) — 일간 비유 + 내면 결 hint 부착
  const dm = input.birthChart.dayMaster;
  facts.push({
    id: 'dayMaster-structure',
    source: 'dayMaster',
    fact: dm,
    plainMeaning: plainOf(dm),
    narrativeHint: '쉬운 비유로 풀어 첫 단락에 배치 (큰 산, 곧은 나무 등)',
    matchTokens: buildMatchTokens(dm, dm[0] ?? ''),
    lifeSceneHint: pickHint(hints, 'lifeStructureNarrative', 'identityKeyword'),
  });

  // strongest elements top 2
  input.coreAnalysis.elementStrength.strongest.slice(0, 2).forEach((el, i) => {
    facts.push({
      id: `element-strong-${i}`,
      source: 'elementStrength',
      fact: `${el} 강세`,
      plainMeaning: `${el} 기운이 강하다는 건 그 결의 행동/감각이 평소보다 자주 올라온다는 뜻`,
      narrativeHint: '성격에 어떻게 나타나는지 줄글로',
      matchTokens: buildMatchTokens(el),
    });
  });

  // strongest tenGods top 2
  input.coreAnalysis.tenGods.strongest.slice(0, 2).forEach((tg, i) => {
    facts.push({
      id: `tenGod-strong-${i}`,
      source: 'tenGod',
      fact: tg,
      plainMeaning: plainOf(tg),
      narrativeHint: '용어 등장 직후 일상어 풀이 필수',
      matchTokens: buildMatchTokens(tg),
    });
  });

  // specialPoints 중 내면 카테고리(inner-depth, mental-strength, rare-structure)
  const innerSPs = input.specialPoints.filter(p =>
    ['inner-depth', 'mental-strength', 'rare-structure', 'relationship-pattern'].includes(p.category)
  ).slice(0, 2);
  innerSPs.forEach((p, i) => {
    facts.push({
      id: `inner-specialPoint-${i}`,
      source: 'specialPoint',
      fact: p.name,
      plainMeaning: plainOf(p.name, p.narrative?.coreMeaning),
      narrativeHint: '겉/속 차이를 설명할 때 근거로 사용',
      matchTokens: buildMatchTokens(p.name, p.shortLabel),
    });
  });

  // 가족·초년 흔적 (synthetic fact — 단정 없이 조건부 톤 시드)
  facts.push({
    id: 'family-early-structure',
    source: 'familyEarlyPattern',
    fact: '초년/가족 안에서의 책임 흔적',
    plainMeaning: '특정 사건 단정이 아니라, 사주 구조상 책임을 빨리 체감했을 가능성',
    narrativeHint: '"초년 흐름이나 가족 안에서의 역할이 강하게 작동했다면..." 같은 조건부 한 단락',
    matchTokens: ['가족', '초년', '어릴 때', '부모', '집안'],
  });

  return {
    sectionId: 'lifeStructureNarrative',
    sectionGoal: '왜 이 사람이 이런 방식으로 생각하고 반응하는지 설명한다.',
    topicCoverageTargets: [
      'personality', 'innerWorld', 'emotionalProcessing', 'socialMask',
      'selfProtectionPattern', 'outerInnerContrast', 'familyEarlyPattern',
    ],
    mustUseFacts: facts,
    requiredBeats: [
      '일간을 쉬운 비유로 설명한다 (예: "무토 일간은 쉽게 말하면 큰 산처럼...").',
      '강한 오행/십성이 성격에 어떻게 나타나는지 줄글로 설명한다.',
      '겉으로 보이는 모습과 실제 내면의 차이를 설명한다(반전 포인트).',
      '주변이 오해하기 쉬운 지점을 말한다.',
      '본인이 스스로 힘들어할 수 있는 지점을 말한다.',
      '초년/가족 관련 내용은 단정하지 않고 "사주 구조상 ~할 가능성"으로 조건부 표현.',
    ],
    avoidRepeating: [
      '안정성과 신뢰를 중시',
      '어린 시절부터 책임감이 강했던',
      '함정 1.', '함정 2.',
    ],
    styleExamples: {
      badExample: '이 사주는 무토 일간이라 안정성과 신뢰를 중시합니다.',
      goodExample:
        '무토 일간은 쉽게 말하면 큰 산이나 넓은 땅처럼, 한 번 중심이 잡히면 쉽게 흔들리지 않으려는 기질을 뜻합니다. 그래서 이 사주는 상황이 불안정할수록 오히려 "내가 중심을 잡아야 한다"는 감각이 올라오기 쉬워요.\n\n' +
        '다만 무토가 강하다고 해서 감정이 없는 사람이라는 뜻은 아닙니다. 오히려 속으로는 상황을 오래 곱씹고, 사람의 태도나 말투를 꽤 세밀하게 기억하는 쪽일 수 있어요.\n\n' +
        '비겁은 자기 힘·독립성·버티는 힘과 관련된 기운입니다. 이 기운이 강하면 스스로 해결하려는 힘은 커지지만, 반대로 도움을 받는 타이밍이 늦어질 수 있습니다.',
      transformationRule: '명리 용어를 말한 뒤 반드시 쉬운 뜻과 실제 반응 방식까지 연결하라.',
    },
  };
}

// ============================================================
// 섹션 3 — repeatedPatternNarrative
// ============================================================
function buildRepeatedPatternPlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativePlan {
  const facts: NarrativeMustUseFact[] = [];

  // top 2~3 lifeTraps (riskScore 내림차순) — 첫 두 trap에 hint 부착
  const sortedTraps = [...input.lifeTraps]
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 3);
  const trapHints = hints?.filter(h => h.sectionId === 'repeatedPatternNarrative' && h.source === 'lifeTrap') ?? [];
  sortedTraps.forEach((t, i) => {
    facts.push({
      id: `lifeTrap-${i}`,
      source: 'lifeTrap',
      fact: t.name,
      plainMeaning: t.patternDescription || t.realLifeScene || t.name,
      narrativeHint: '함정 이름을 직접 카드처럼 노출하지 말고 "반복되기 쉬운 패턴은 ..." 식으로 줄글로',
      matchTokens: buildMatchTokens(t.name, t.patternDescription),
      lifeSceneHint: trapHints[i] ? {
        situation: trapHints[i].situation,
        likelyBehavior: trapHints[i].likelyBehavior,
        innerReaction: trapHints[i].innerReaction,
        externalMisunderstanding: trapHints[i].externalMisunderstanding,
        betterUse: trapHints[i].betterUse,
      } : undefined,
    });
  });

  // timingAnchors top 2 (high → medium → low)
  const sortedAnchors = [...input.timingAnchors]
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 } as const;
      return (order[a.confidence] ?? 3) - (order[b.confidence] ?? 3);
    })
    .slice(0, 2);
  sortedAnchors.forEach((a, i) => {
    const yearStr = a.year ? String(a.year) : (a.age ? `약 ${a.age}세` : '');
    facts.push({
      id: `timing-${i}`,
      source: 'timingAnchor',
      fact: `${yearStr} — ${a.title}`,
      plainMeaning: a.possibleManifestations?.slice(0, 3).join('/') || a.title,
      narrativeHint: '"특히 20XX년처럼 ~한 흐름에서는" 식 가벼운 단정 금지 톤',
      matchTokens: buildMatchTokens(yearStr, a.title),
    });
  });

  // fortuneBlockingChoices top 1
  const block = input.fortuneTriggers.fortuneBlockingChoices[0];
  if (block) {
    facts.push({
      id: 'blocking-0',
      source: 'fortuneTrigger',
      fact: block.title,
      plainMeaning: block.reason || block.practicalRisk || block.title,
      narrativeHint: '벗어나는 방향을 줄글 한 단락으로 (조언 리스트 X)',
      matchTokens: buildMatchTokens(block.title, block.correction),
    });
  }

  // 관계·연애·가족 synthetic facts — V4 분석에 직접 매핑 없는 주제지만 본문에 반드시 다뤄야
  facts.push({
    id: 'relationship-pattern',
    source: 'relationshipPattern',
    fact: '인간관계에서 반복되는 결',
    plainMeaning: '편한 사람 vs 지치는 사람의 구분이 분명, 참다가 거리 조절을 시작하는 패턴',
    narrativeHint: '"관계에서는 ..." 한 단락 줄글로. 편한 사람·지치는 사람 결도 포함',
    matchTokens: ['관계에서는', '관계에서도', '인간관계', '사람과의'],
    lifeSceneHint: pickHint(hints, 'repeatedPatternNarrative', 'relationshipPattern'),
  });
  facts.push({
    id: 'love-marriage-pattern',
    source: 'relationshipPattern',
    fact: '연애·장기 관계에서 반복되는 결',
    plainMeaning: '뜨겁게 다가오는 사람보다 행동이 꾸준한 사람에게 신뢰가 열림',
    narrativeHint: '"연애나 가까운 관계에서도..." 식 한 단락. 결혼 여부 단정 금지(userContext 참고)',
    matchTokens: ['연애', '결혼', '연인', '파트너', '장기 관계', '가까운 관계'],
  });
  facts.push({
    id: 'family-early-repeated',
    source: 'familyEarlyPattern',
    fact: '가족 안에서 맡기 쉬운 역할',
    plainMeaning: '먼저 알아차리고 움직이는 사람 역할이 굳어질 가능성',
    narrativeHint: '"가족 안에서는..." 한두 문장. 단정 금지, 조건부 톤',
    matchTokens: ['가족 안에서는', '가족', '집안'],
  });

  return {
    sectionId: 'repeatedPatternNarrative',
    sectionGoal: '삶에서 반복되는 패턴을 구체적인 장면으로 보여준다.',
    topicCoverageTargets: [
      'repeatedPattern', 'workPattern', 'relationshipPattern',
      'loveMarriageStyle', 'familyEarlyPattern', 'pastTimingAnchor',
    ],
    mustUseFacts: facts,
    requiredBeats: [
      '가장 큰 반복 패턴을 하나의 문장으로 잡는다.',
      '그 패턴이 일에서 어떻게 나타나는지 보여준다.',
      '관계에서 어떻게 나타나는지 보여준다.',
      '가족/가까운 관계에서 어떻게 나타날 수 있는지 보여준다.',
      'timingAnchors를 짧게 넣는다 ("~였을 수 있어요" 톤).',
      '벗어나는 방향을 말하되 조언 리스트처럼 쓰지 않는다.',
    ],
    avoidRepeating: [
      '도움을 요청하세요',
      '조언을 구하세요',
      '혼자 다 감당하지 말고',
    ],
    styleExamples: {
      badExample: '혼자 모든 것을 감당하려는 경향이 있습니다. 도움을 요청하세요.',
      goodExample:
        '이 사주에서 반복되기 쉬운 패턴은 "처음엔 괜찮다고 생각했는데, 어느 순간 너무 많이 떠안고 있는 상태"예요.\n\n' +
        '직장에서는 남들이 놓친 일을 정리하는 사람, 관계에서는 분위기를 수습하는 사람, 가족 안에서는 먼저 알아차리고 움직이는 사람 역할을 하게 될 수 있습니다.\n\n' +
        '또 하나의 패턴은 아닌 사람을 바로 밀어내기보다, 꽤 오래 참다가 어느 순간 조용히 마음을 접는 방식으로 나타날 수 있습니다.\n\n' +
        '특히 2015년이나 2024년처럼 관계의 판이나 역할의 무게가 달라지는 흐름에서는 이 패턴이 더 선명했을 가능성이 있어요.',
      transformationRule: '함정 이름을 나열하지 말고, 일·관계·가족에서 반복되는 장면으로 풀어라.',
    },
  };
}

// ============================================================
// 섹션 4 — careerTalentNarrative (일과 재능: 독립 장)
// ============================================================
function buildCareerTalentPlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativePlan {
  const facts: NarrativeMustUseFact[] = [];
  const c = input.careerSpecificAnalysis;

  // lifeWeapons 상위 3개 (첫 2개에 hint)
  const weaponHints = hints?.filter(h => h.sectionId === 'careerTalentNarrative' && h.source === 'lifeWeapon') ?? [];
  const sortedWeapons = [...input.lifeWeapons]
    .sort((a, b) => (b.strengthScore ?? 0) - (a.strengthScore ?? 0))
    .slice(0, 3);
  sortedWeapons.forEach((w, i) => {
    facts.push({
      id: `lifeWeapon-${i}`,
      source: 'lifeWeapon',
      fact: w.name,
      plainMeaning: w.realLifeScene || w.howToUse || w.name,
      narrativeHint: '핵심 재능 한 줄로 정리 후, 그 능력의 적용처(직업군)로 연결',
      matchTokens: buildMatchTokens(w.name, w.category),
      lifeSceneHint: weaponHints[i] ? {
        situation: weaponHints[i].situation,
        likelyBehavior: weaponHints[i].likelyBehavior,
        innerReaction: weaponHints[i].innerReaction,
        externalMisunderstanding: weaponHints[i].externalMisunderstanding,
        betterUse: weaponHints[i].betterUse,
      } : undefined,
    });
  });

  // topCareerMatches 3개 (첫 번째에 hint)
  c.topCareerMatches.slice(0, 3).forEach((match, i) => {
    const indHead = match.industry.split('/')[0]?.trim() ?? match.industry;
    facts.push({
      id: `career-${i}`,
      source: 'careerSpecificAnalysis',
      fact: `${match.industry} — ${match.roles.slice(0, 3).join(', ')}`,
      plainMeaning: match.whyFits?.[0] || match.howItShowsInLife || match.industry,
      narrativeHint: '직업군은 문장 속에 자연스럽게 (리스트 X). 산업 2개 이상',
      matchTokens: buildMatchTokens(indHead, ...match.roles),
      lifeSceneHint: i === 0 ? pickHint(hints, 'careerTalentNarrative', 'careerSpecificAnalysis') : undefined,
    });
  });

  // bestWorkStyle 2개
  c.bestWorkStyle.slice(0, 2).forEach((ws, i) => {
    facts.push({
      id: `workStyle-${i}`,
      source: 'bestWorkStyle',
      fact: ws.title,
      plainMeaning: ws.description || ws.title,
      narrativeHint: '직업군 제시 전에 "어떤 환경에서 잘 맞는지" 단락으로',
      matchTokens: buildMatchTokens(ws.title, ws.description),
    });
  });

  // avoidEnvironment 1~2개
  c.avoidCareerEnvironments.slice(0, 2).forEach((av, i) => {
    facts.push({
      id: `avoid-${i}`,
      source: 'avoidCareerEnvironment',
      fact: av.environment,
      plainMeaning: av.reason || av.environment,
      narrativeHint: '"반대로 ~한 환경에서는 쉽게 지칠 수 있어요" 한 단락',
      matchTokens: buildMatchTokens(av.environment, av.reason),
    });
  });

  // 리더십·동료·독립 (synthetic)
  facts.push({
    id: 'leadership-style',
    source: 'careerSpecificAnalysis',
    fact: '리더십 스타일',
    plainMeaning: '강하게 밀어붙이기보다 기준을 세우고 흐름을 정리하는 리더십',
    narrativeHint: '리더십 한 단락 — 잘 맞는 동료 유형도 함께',
    matchTokens: ['리더십', '리더', '이끌', '주도'],
  });
  facts.push({
    id: 'coworker-fit',
    source: 'careerSpecificAnalysis',
    fact: '같이 일하면 좋은 사람',
    plainMeaning: '감정적 의지보다 역할을 나눌 줄 알고 약속을 지키는 사람',
    narrativeHint: '"같이 일할 때 편한 사람은 ..." 한 문장',
    matchTokens: ['동료', '같이 일', '함께 일', '팀원'],
  });
  facts.push({
    id: 'independence-potential',
    source: 'careerSpecificAnalysis',
    fact: '독립/이직 가능성',
    plainMeaning: '자유롭지만 기준 없는 곳보다, 책임·권한·성과가 분명한 판이 잘 맞음 (조건부)',
    narrativeHint: '"독립이나 이직을 생각한다면..." 조건부 한 단락',
    matchTokens: ['독립', '이직', '프리랜서', '1인'],
  });

  return {
    sectionId: 'careerTalentNarrative',
    sectionGoal: '이 사주의 재능과 직업 방향을 깊게 설명한다 — 왜 그 일이 맞는지까지.',
    topicCoverageTargets: [
      'career', 'talent', 'workEnvironment', 'avoidWorkEnvironment',
      'leadershipStyle', 'coworkerFit', 'independenceOrBusinessPotential',
    ],
    suggestionTargets: [
      '결과가 보이는 환경 선택',
      '책임-권한 합의',
      '역할을 나눌 줄 아는 동료',
      '독립 시 서비스형 구조',
    ],
    mustUseFacts: facts,
    requiredBeats: [
      '이 사주의 핵심 재능을 한 줄로 정의 (lifeWeapons 흡수)',
      '그 능력이 잘 발휘되는 업무 환경 설명 (bestWorkStyle)',
      '구체 직업군을 산업 2개 이상, 직무 3개 이상 자연스럽게',
      '피해야 할 업무 환경 (avoidCareerEnvironments)',
      '리더십 스타일과 같이 일하면 좋은 동료 유형',
      '독립/이직/프리랜서 가능성을 조건부로',
      '다음 장(돈)으로 자연스럽게 이어주는 마무리',
    ],
    avoidRepeating: [
      '추천 직업군:', '피해야 할 환경:',
    ],
    styleExamples: {
      badExample: '운영 개선, 프로세스, SCM 분야에서 두각을 나타냅니다.',
      goodExample:
        '이 사주의 재능은 단순히 성실하다는 말로 끝나지 않습니다. 더 정확히 말하면, 복잡하게 얽힌 상황에서 기준을 세우고, 흐름이 막힌 지점을 찾아내고, 다시 굴러가게 만드는 능력에 가깝습니다.\n\n' +
        '그래서 운영 개선, 프로세스 관리, SCM, 프로젝트 매니징, PM, 서비스 기획, 전략기획 같은 역할이 잘 맞을 수 있어요. 공통점은 "흐름이 막힌 것을 정리해서 다시 움직이게 만드는 일"입니다.\n\n' +
        '반대로 결과물보다 눈치·보고가 더 중요한 조직, 책임은 많은데 권한은 적은 자리에서는 쉽게 지칠 수 있습니다. 리더십도 강하게 밀어붙이는 방식보다 기준을 세우고 흐름을 정리하는 방식이 더 잘 맞아요.',
      transformationRule: '직업군을 말하기 전 반드시 핵심 능력을 설명하고, 직업군은 그 능력의 적용처로 제시하라.',
    },
  };
}

// ============================================================
// 섹션 5 — moneyMonetizationNarrative (돈과 수익화: 독립 장)
// ============================================================
function buildMoneyMonetizationPlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativePlan {
  const facts: NarrativeMustUseFact[] = [];
  const c = input.careerSpecificAnalysis;

  // moneyMakingStyle 2~3개
  c.moneyMakingStyle.slice(0, 3).forEach((m, i) => {
    facts.push({
      id: `money-${i}`,
      source: 'moneyMakingStyle',
      fact: m.title,
      plainMeaning: m.description || m.title,
      narrativeHint: '"돈이 붙는 방식은 ..." 식 줄글로. 투자/거래/타이밍 톤 금지',
      matchTokens: buildMatchTokens(m.title, m.description),
      lifeSceneHint: i === 0 ? pickHint(hints, 'moneyMonetizationNarrative', 'moneyMakingStyle') : undefined,
    });
  });

  // 돈 새는 패턴 (synthetic)
  facts.push({
    id: 'money-leak',
    source: 'moneyMakingStyle',
    fact: '돈이 새는 패턴',
    plainMeaning: '능력을 자연스럽게 써주는데 서비스/상품/계약 범위로 만들지 않아 보상이 약해짐',
    narrativeHint: '"반대로 돈이 새는 패턴은 ..." 한 단락',
    matchTokens: ['돈이 새', '무료로', '능력을', '서비스로'],
  });

  // 수익 구조 유형 (synthetic)
  facts.push({
    id: 'monetization-style',
    source: 'moneyMakingStyle',
    fact: '월급형/전문성형/프로젝트형/사업형 성향',
    plainMeaning: '책임·역할이 분명하고 기준이 성과로 인정되는 자리에서 만족도가 올라감',
    narrativeHint: '본인 성향에 가까운 수익 구조 1~2개를 줄글로 권장',
    matchTokens: ['월급형', '전문성형', '프로젝트형', '사업형', '수익화', '컨설팅', '강의'],
  });

  // 가격표·계약·정산 (synthetic)
  facts.push({
    id: 'pricing-contract',
    source: 'moneyMakingStyle',
    fact: '가격표·작업 범위·정산 기준',
    plainMeaning: '잘하는 것을 유료 구조로 바꾸려면 가격·범위·결과물 형태를 먼저 정해야 함',
    narrativeHint: '구체 조언: 가격, 작업 범위, 보상 기준 명문화',
    matchTokens: ['가격', '계약', '정산', '작업 범위', '보상 기준'],
  });

  // 상품화 (synthetic)
  facts.push({
    id: 'productization',
    source: 'moneyMakingStyle',
    fact: '능력을 상품화하는 방식',
    plainMeaning: '제안서·포트폴리오·템플릿·교육 콘텐츠처럼 결과물이 외부에서 확인 가능해야 함',
    narrativeHint: '예시 형태(제안서/포트폴리오/템플릿/콘텐츠/컨설팅) 자연스럽게 나열',
    matchTokens: ['포트폴리오', '제안서', '템플릿', '콘텐츠', '결과물'],
  });

  // 프리랜서/1인 사업 (synthetic, 조건부)
  facts.push({
    id: 'freelance-business',
    source: 'careerSpecificAnalysis',
    fact: '프리랜서/1인 사업 권장 구조',
    plainMeaning: '감각만으로 승부하는 방식보다 문제 정리해주는 서비스형 구조가 안정적',
    narrativeHint: '"만약 프리랜서나 1인 사업을 생각한다면..." 조건부 한 단락',
    matchTokens: ['프리랜서', '1인', '서비스형', '사업'],
  });

  return {
    sectionId: 'moneyMonetizationNarrative',
    sectionGoal: '재물운을 좋다/나쁘다가 아니라 돈이 붙는 구조와 새는 패턴으로 설명한다.',
    topicCoverageTargets: [
      'moneyStyle', 'monetizationStyle', 'moneyLeakPattern',
      'pricingAndContractAdvice', 'productizationAdvice',
    ],
    suggestionTargets: [
      '가격표 만들기',
      '작업 범위·정산 기준 명문화',
      '능력의 상품화 (포트폴리오·콘텐츠·컨설팅)',
      '작은 단위 검증 → 반복 가능 수익',
    ],
    mustUseFacts: facts,
    requiredBeats: [
      '돈이 붙는 방식을 한 단락',
      '돈이 새는 패턴을 한 단락',
      '월급형/전문성형/프로젝트형/사업형 중 어떤 성향에 가까운지',
      '가격표·작업 범위·정산 기준 같은 운영 조언',
      '능력을 상품화하는 구체 방식',
      '프리랜서/1인 사업은 조건부로',
    ],
    avoidRepeating: [
      '시장 타이밍에 맞춰 거래', '가격 흐름을 보고 매매', '트레이딩이 잘 맞', '주식 투자에 적합',
    ],
    styleExamples: {
      badExample: '시장 변화와 가격 흐름을 보고 타이밍에 맞춰 거래하는 방식이 잘 맞습니다.',
      goodExample:
        '이 사주는 돈이 한 번에 크게 터지는 방식보다, 신뢰와 기준이 쌓이면서 점점 커지는 구조가 더 잘 맞습니다.\n\n' +
        '반대로 돈이 새는 패턴은 능력을 너무 자연스럽게 써주는 데서 시작될 수 있습니다. 남이 막힌 일을 풀어주고, 정리해주고, 기준을 잡아주는데 정작 그걸 서비스나 상품, 계약 범위로 만들지 않으면 실력은 쓰이지만 보상은 약해질 수 있어요.\n\n' +
        '그래서 이 사주는 "잘하는 것"을 "유료로 제공되는 구조"로 바꾸는 감각이 중요합니다. 예를 들면 업무 프로세스 정리, 실무 강의, 컨설팅, 체크리스트나 템플릿 판매, 교육 콘텐츠처럼 내가 정리한 기준이 상품이 되는 방식이 좋습니다.',
      transformationRule: '돈은 수익화 구조·계약 기준 중심으로. 투자/거래/시장 타이밍 표현은 절대 금지.',
    },
  };
}

// ============================================================
// 섹션 6 — relationshipLoveNarrative (관계와 연애: 독립 장)
// ============================================================
function buildRelationshipLovePlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativePlan {
  const facts: NarrativeMustUseFact[] = [];
  const relHints = hints?.filter(h => h.sectionId === 'relationshipLoveNarrative') ?? [];

  // 인간관계 스타일 (synthetic)
  facts.push({
    id: 'relationship-style',
    source: 'relationshipPattern',
    fact: '인간관계 스타일',
    plainMeaning: '말의 빈도보다 행동의 일관성으로 신뢰를 본다',
    narrativeHint: '도입 한 단락으로 관계 스타일 핵심',
    matchTokens: ['관계에서', '행동의 일관성', '말보다 행동', '신뢰'],
  });

  // 편한 사람 (synthetic)
  facts.push({
    id: 'easy-people',
    source: 'relationshipPattern',
    fact: '편한 사람 유형',
    plainMeaning: '말과 행동이 일치하고 약속을 지키며 책임을 나눌 줄 아는 사람',
    narrativeHint: '"당신에게 편한 사람은 ..." 식 한두 문장',
    matchTokens: ['편한 사람', '약속을 지', '행동이 꾸준', '책임을 나'],
    lifeSceneHint: relHints[0] ? {
      situation: relHints[0].situation, likelyBehavior: relHints[0].likelyBehavior,
      innerReaction: relHints[0].innerReaction,
      externalMisunderstanding: relHints[0].externalMisunderstanding, betterUse: relHints[0].betterUse,
    } : undefined,
  });

  // 지치는 사람 (synthetic)
  facts.push({
    id: 'draining-people',
    source: 'relationshipPattern',
    fact: '지치는 사람 유형',
    plainMeaning: '말은 많은데 행동이 따르지 않고 기준 없이 부탁만 쌓는 사람',
    narrativeHint: '"반대로 지치는 사람은 ..." 식 한두 문장',
    matchTokens: ['지치는 사람', '말은 많', '기준 없이', '감정적으로 기'],
  });

  // 마음이 열리는 방식 (synthetic)
  facts.push({
    id: 'heart-opening',
    source: 'relationshipPattern',
    fact: '연애에서 마음이 열리는 방식',
    plainMeaning: '뜨겁게 다가오는 사람보다 생활 리듬이 안정적이고 말·행동이 맞는 사람',
    narrativeHint: '연애 단락 도입',
    matchTokens: ['마음이 열', '신뢰가 열', '뜨겁게', '생활 리듬', '믿을 만한'],
  });

  // 마음이 닫히는 방식 (synthetic)
  facts.push({
    id: 'heart-closing',
    source: 'relationshipPattern',
    fact: '마음이 닫히는 방식',
    plainMeaning: '서운함을 바로 말하지 않고 쌓아두다 신뢰가 깎이는 장면',
    narrativeHint: '"가까운 관계에서 조심해야 할 점은 ..." 한 단락',
    matchTokens: ['마음이 닫', '서운', '거리 조절', '신뢰가 깎'],
    lifeSceneHint: relHints[1] ? {
      situation: relHints[1].situation, likelyBehavior: relHints[1].likelyBehavior,
      innerReaction: relHints[1].innerReaction,
      externalMisunderstanding: relHints[1].externalMisunderstanding, betterUse: relHints[1].betterUse,
    } : undefined,
  });

  // 결혼/장기 관계 (synthetic, 조건부)
  facts.push({
    id: 'marriage-long-term',
    source: 'relationshipPattern',
    fact: '장기 관계/결혼 조건',
    plainMeaning: '다정함만큼 역할 분담·생활 기준·갈등 해소 방식의 합의가 중요',
    narrativeHint: '"장기 관계나 결혼을 생각한다면..." 조건부 단락 (relationshipStatus 반영)',
    matchTokens: ['장기 관계', '결혼', '역할 분담', '생활의 기준', '오래 가는'],
  });

  // 갈등 패턴 (synthetic)
  facts.push({
    id: 'conflict-pattern',
    source: 'relationshipPattern',
    fact: '갈등이 생기는 방식',
    plainMeaning: '오래 보고 오래 참다가 어느 순간 조용히 마음을 닫는 쪽',
    narrativeHint: '갈등 신호와 회복 가이드 함께',
    matchTokens: ['갈등', '서운함', '오래 참', '조용히 마음'],
  });

  // userContext
  facts.push({
    id: 'relationship-context',
    source: 'userContext',
    fact: `relationshipStatus=${input.userContext.relationshipStatus}`,
    plainMeaning:
      input.userContext.relationshipStatus === 'married' ? '기혼자 — 새 인연/배우자 표현 단정 주의' :
      input.userContext.relationshipStatus === 'single' ? '미혼 — 결혼 단정 금지' :
      '관계 상태 unknown — 일반 관계 결로',
    narrativeHint: 'userContext 위반 금지 (배우자/남편/아내/자녀와 등)',
    matchTokens: ['관계'],
  });

  return {
    sectionId: 'relationshipLoveNarrative',
    sectionGoal: '나의 관계 스타일과 연애/장기 관계 패턴을 깊게 설명한다.',
    topicCoverageTargets: [
      'relationshipStyle', 'loveStyle', 'marriageLongTermStyle',
      'heartOpeningPattern', 'heartClosingPattern', 'conflictPattern',
    ],
    suggestionTargets: [
      '서운함이 작을 때 신호 보내기',
      '약속을 지키는 사람에 시간 두기',
      '장기 관계는 역할 분담·생활 기준 합의',
    ],
    mustUseFacts: facts,
    requiredBeats: [
      '인간관계 스타일 한 단락 도입',
      '편한 사람 유형',
      '지치는 사람 유형',
      '연애에서 마음이 열리는 방식',
      '마음이 닫히는 방식',
      '장기 관계/결혼 조건 (조건부, 단정 금지)',
      '갈등 생기는 방식과 회복 가이드',
    ],
    avoidRepeating: [
      '소통이 중요합니다', '서로를 이해해야', '배우자', '남편', '아내',
    ],
    styleExamples: {
      badExample: '인간관계에서는 소통이 중요합니다.',
      goodExample:
        '관계에서 이 사주는 말보다 행동의 일관성을 더 중요하게 볼 가능성이 큽니다. 누가 얼마나 다정한 말을 하는지보다, 실제로 약속을 지키는지, 힘든 순간에 태도가 달라지지 않는지를 더 오래 봅니다.\n\n' +
        '연애에서도 처음부터 뜨겁게 다가오는 사람보다, 생활 리듬이 안정적이고 말과 행동이 맞는 사람에게 마음이 열리기 쉬워요.\n\n' +
        '다만 가까운 관계에서 조심해야 할 점은 서운함을 바로 말하지 않고 쌓아둘 수 있다는 것입니다. 비슷한 장면이 반복되면 어느 순간 마음이 조용히 닫힐 수 있어요. 상대는 그때서야 문제가 생겼다고 느끼지만, 본인 입장에서는 이미 오래전부터 신호를 보내고 있었을 가능성이 큽니다.',
      transformationRule: '관계는 다정함이 아니라 신뢰 형성·열림/닫힘 방식으로 풀어라. userContext 단정 금지.',
    },
  };
}

// ============================================================
// 섹션 5 — futureFlowNarrative (연도별 fact 분리)
// ============================================================
function buildFutureFlowPlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativePlan {
  const facts: NarrativeMustUseFact[] = [];

  input.futureTimingAnalysis.years.forEach((y, i) => {
    const themeKeys = y.strongestThemes.flatMap(t => THEME_KEYWORDS[t] ?? []);
    facts.push({
      id: `year-${y.year}`,
      source: 'futureTimingAnalysis',
      fact: `${y.year}년 — ${y.headline} (테마: ${y.strongestThemes.join(', ')})`,
      plainMeaning:
        `핵심: ${y.headline}. ` +
        (y.possibleEvents?.slice(0, 2).join(' / ') || '') +
        (y.bestActions?.length ? ` 잡아야 할 것: ${y.bestActions.slice(0, 2).join(', ')}.` : '') +
        (y.avoidActions?.length ? ` 조심할 것: ${y.avoidActions.slice(0, 2).join(', ')}.` : ''),
      narrativeHint: `### ${y.year} 헤더로 분리. 핵심 주제, 생길 수 있는 사건 유형, 잡아야 할 것, 조심할 것, 전년/다음 연도와의 차이를 줄글로`,
      matchTokens: buildMatchTokens(String(y.year), y.headline, ...themeKeys),
      lifeSceneHint: i === 0 ? pickHint(hints, 'futureFlowNarrative', 'futureTimingAnalysis') : undefined,
    });
  });

  return {
    sectionId: 'futureFlowNarrative',
    sectionGoal: '앞으로 3년의 흐름을 연도별로 다르게 보여준다.',
    topicCoverageTargets: ['futureThreeYears', 'career', 'moneyStyle', 'relationshipStyle', 'practicalStrategy'],
    mustUseFacts: facts,
    requiredBeats: [
      '3년 전체 흐름을 먼저 한 단락으로 잡는다(짧게).',
      '각 연도는 서로 다른 역할을 가져야 한다(축적/연결/드러남 같이).',
      '각 연도마다 생길 수 있는 사건 유형을 제시한다 (단정 금지).',
      '각 연도마다 잡아야 할 것과 조심할 것을 줄글로 설명한다.',
      '미래 사건은 "~로 나타날 수 있어요" 톤.',
    ],
    avoidRepeating: [
      '학습과 자격이 누적되는 해',
      '기회/주의/행동',
    ],
    styleExamples: {
      badExample: '2026년은 학습과 자격이 누적되는 해입니다. 2027년에도 학습과 자격이 누적됩니다.',
      goodExample:
        '### 2026\n2026년은 공부나 자격, 문서, 전문성처럼 "내 실력을 증명할 수 있는 형태"가 중요해지는 해에 가까워요. 단순히 뭔가를 배우는 것에서 끝나면 아깝고, 배운 것을 자격증, 포트폴리오, 강의안, 콘텐츠처럼 밖에서 확인 가능한 형태로 남기는 것이 좋습니다.\n\n' +
        '### 2027\n2027년은 2026년에 쌓은 것을 사람이나 기회와 연결하는 흐름이 강해질 수 있습니다. 혼자 준비만 하는 것보다, 소개를 받거나 협업을 제안하거나 작은 프로젝트에 들어가는 식으로 외부 접점을 만드는 것이 중요해요.\n\n' +
        '### 2028\n2028년은 그동안 쌓은 결과물이 더 선명하게 드러나는 시기로 볼 수 있습니다. 이 시기에는 역할 변경, 프로젝트 확대, 일하는 환경 변화처럼 "내가 어떤 판에서 일할지"가 달라질 수 있어요.',
      transformationRule: '각 연도가 비슷하게 보이면 실패다. 축적/연결/드러남처럼 역할을 나누어 설명하라.',
    },
  };
}

// ============================================================
// 섹션 6 — finalStrategyNarrative
// ============================================================
function buildFinalStrategyPlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativePlan {
  const facts: NarrativeMustUseFact[] = [];

  // top 2 activating choices (첫 번째에 hint)
  input.fortuneTriggers.fortuneActivatingChoices.slice(0, 2).forEach((a, i) => {
    facts.push({
      id: `activating-${i}`,
      source: 'fortuneTrigger',
      fact: a.title,
      plainMeaning: a.reason || a.practicalAction || a.title,
      narrativeHint: '결론 본문에 행동 가이드로 자연스럽게',
      matchTokens: buildMatchTokens(a.title, a.practicalAction),
      lifeSceneHint: i === 0 ? pickHint(hints, 'finalStrategyNarrative', 'identityKeyword') : undefined,
    });
  });

  // top 2 blocking choices
  input.fortuneTriggers.fortuneBlockingChoices.slice(0, 2).forEach((b, i) => {
    facts.push({
      id: `blocking-final-${i}`,
      source: 'fortuneTrigger',
      fact: b.title,
      plainMeaning: b.correction || b.reason || b.title,
      narrativeHint: '결론 본문에 "이건 피하는 게 좋다" 톤으로',
      matchTokens: buildMatchTokens(b.title, b.correction),
    });
  });

  // lifeWeapons 요약 1개
  const topWeapon = [...input.lifeWeapons].sort((a, b) => (b.strengthScore ?? 0) - (a.strengthScore ?? 0))[0];
  if (topWeapon) {
    facts.push({
      id: 'weapon-summary',
      source: 'lifeWeapon',
      fact: topWeapon.name,
      plainMeaning: topWeapon.howToUse || topWeapon.realLifeScene || topWeapon.name,
      narrativeHint: '핵심 사용법으로 한 번 더 언급(앞 장 표현 그대로 반복 X)',
      matchTokens: buildMatchTokens(topWeapon.name, topWeapon.category),
    });
  }

  // lifeTraps 요약 1개
  const topTrap = [...input.lifeTraps].sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))[0];
  if (topTrap) {
    facts.push({
      id: 'trap-summary',
      source: 'lifeTrap',
      fact: topTrap.name,
      plainMeaning: topTrap.escapeStrategy || topTrap.patternDescription || topTrap.name,
      narrativeHint: '어떻게 풀어내는지 결론적으로',
      matchTokens: buildMatchTokens(topTrap.name, topTrap.category),
    });
  }

  return {
    sectionId: 'finalStrategyNarrative',
    sectionGoal: '이 사주를 어떻게 써야 하는지 결론을 낸다.',
    topicCoverageTargets: ['practicalStrategy', 'career', 'moneyStyle', 'relationshipStyle', 'loveMarriageStyle'],
    mustUseFacts: facts,
    requiredBeats: [
      '이 사주의 핵심 사용법을 한 단락으로 정리한다.',
      '일에서의 사용법을 말한다 (책임 범위·권한 결).',
      '돈에서의 사용법을 말한다 (작업 범위·보상 기준 결).',
      '관계에서의 사용법을 말한다 (초반 기준 말하기 결).',
      '멘탈/선택 기준을 말한다.',
      '마지막 한 문장은 기억에 남게 쓴다 (저장하고 싶은 한 문장).',
    ],
    avoidRepeating: [
      '협업을 통해 더 나은 결과',
      '긍정적인 결과를 가져올',
      '행복한 삶을 살게',
    ],
    styleExamples: {
      badExample: '자기 기준을 자산으로 삼고, 협업을 통해 더 나은 결과를 만들어가는 것이 이 사주의 핵심입니다.',
      goodExample:
        '결국 이 사주는 혼자 끝까지 버티는 힘이 있지만, 그 힘을 계속 혼자 쓰면 운이 막힌 것처럼 느껴질 수 있어요. 그래서 가장 중요한 건 "내가 다 해야 한다"에서 "내가 기준을 잡고, 역할을 나눈다"로 넘어가는 것입니다.\n\n' +
        '일에서는 책임을 맡기 전에 범위와 권한을 먼저 확인하는 게 좋습니다.\n\n' +
        '돈에서는 무료로 해주던 능력을 계속 흘려보내지 않는 게 중요합니다. 작은 일이라도 작업 범위, 기간, 보상 기준을 먼저 정해야 합니다.\n\n' +
        '이 사주는 무조건 더 강해져야 좋아지는 사주가 아니에요. 이미 강한 부분은 충분히 강합니다. 이제는 그 힘을 어디까지 쓰고, 어디서 나눌지를 정할 때 운이 훨씬 편하게 흐릅니다.',
      transformationRule: '결론은 요약이 아니라 사주의 사용법이어야 한다. 마지막 문장은 저장하고 싶을 만큼 선명해야 한다.',
    },
  };
}

// ============================================================
// 메인 — 7~8개 plan 빌드 (2026-05: 일/돈/관계 분리, futureFlow는 옵션)
// ============================================================
export interface BuildNarrativePlansOptions {
  /** 앞으로 3년 장 포함 여부 (기본 false — 별도 기능으로 분리 가능) */
  includeFutureFlow?: boolean;
}

export function buildNarrativePlans(
  input: PersonalSajuGptInput,
  lifeSceneHints?: LifeSceneHint[],
  options: BuildNarrativePlansOptions = {},
): NarrativePlanSet {
  const plans: NarrativePlanSet = [
    buildOpeningPlan(input, lifeSceneHints),
    buildLifeStructurePlan(input, lifeSceneHints),
    buildRepeatedPatternPlan(input, lifeSceneHints),
    buildCareerTalentPlan(input, lifeSceneHints),
    buildMoneyMonetizationPlan(input, lifeSceneHints),
    buildRelationshipLovePlan(input, lifeSceneHints),
  ];
  if (options.includeFutureFlow) {
    plans.push(buildFutureFlowPlan(input, lifeSceneHints));
  }
  plans.push(buildFinalStrategyPlan(input, lifeSceneHints));
  return plans;
}
