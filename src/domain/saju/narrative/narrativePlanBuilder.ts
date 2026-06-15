// 서사형 개인사주 — 섹션별 NarrativePlan 결정론적 빌더 (2026-05).
//
// 분석 데이터(PersonalSajuGptInput)에서 각 섹션이 반드시 본문에 흡수해야 할
// 데이터 조각(mustUseFacts), 전개 순서(requiredBeats), 스타일 예시(styleExamples),
// 피해야 할 표현(avoidRepeating)을 미리 결정해둔다.
//
// GPT는 이 plan을 받아 본문을 작성하고, validator는 mustUseFacts.matchTokens가
// 본문에 흡수됐는지 검사. 흡수되지 않으면 missing-narrative-fact로 실패 → 섹션별 repair.

import type { PersonalSajuGptInput, DayMasterStrengthAnalysis, UsefulGodAnalysis, SpecialStarInfo } from '../report/sajuReportSchema';
import type {
  NarrativePlan, NarrativeMustUseFact, NarrativePlanSet,
  NarrativeDepthOptions,
} from './narrativeTypes';
import { DEFAULT_NARRATIVE_DEPTH_OPTIONS } from './narrativeTypes';
import type { LifeSceneHint, LifeSceneSectionId, LifeSceneSource } from './lifeSceneHintBuilder';
import { ELEMENT_KO } from '../rules/elements';

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
// 2026-05 Narrative Depth v1 — 신강/신약·신살·용신 fact helpers
// 모든 helper는 feature flag on일 때만 호출됨 (default 호출 X).
// 미신적 개운법 금지, 행동·구조화·역할 중심.
// ============================================================

// ── 신강/신약 ──────────────────────────────────────────────
function strengthCoreLabel(level: DayMasterStrengthAnalysis['level']): '신강' | '중화' | '신약' {
  if (level === 'very-strong' || level === 'strong') return '신강';
  if (level === 'weak' || level === 'very-weak') return '신약';
  return '중화';
}

function strengthPlainMeaning(level: DayMasterStrengthAnalysis['level']): string {
  const core = strengthCoreLabel(level);
  if (core === '신강') {
    return '신강은 사람이 강하다는 뜻이라기보다, 자기 기준과 버티는 힘이 쉽게 꺾이지 않는 구조라는 뜻. 좋게 쓰이면 추진력·책임감으로, 과해지면 혼자 밀고 가거나 타협이 늦어지는 패턴으로 나타날 수 있음.';
  }
  if (core === '신약') {
    return '신약은 사람이 약하다는 뜻이 아니라, 사주 안에서 나를 직접 도와주는 힘이 상대적으로 부족하다는 뜻. 혼자 밀어붙이는 방식보다 좋은 정보·환경·조언·협업을 잘 붙였을 때 훨씬 안정적으로 움직이는 구조.';
  }
  return '중화에 가까운 구조는 한쪽으로 극단적으로 쏠리기보다 환경에 따라 힘의 방향이 달라지는 구조. 어떤 환경·어떤 사람과 함께하느냐에 따라 장점이 다르게 드러남.';
}

function strengthAdviceHint(level: DayMasterStrengthAnalysis['level']): { actionable: string; avoidPattern: string; activatePattern: string } {
  const core = strengthCoreLabel(level);
  if (core === '신강') {
    return {
      actionable: '책임 범위·권한을 먼저 확인하고, 역할을 나누고, 기준을 문서화하는 방식이 운을 편하게 만듦.',
      avoidPattern: '도움이 와도 혼자 끌고 가며 지치는 패턴, 결정권 없는 자리에서 책임만 떠안는 패턴.',
      activatePattern: '내가 세운 기준을 사람들과 공유하고 구조로 남기는 선택.',
    };
  }
  if (core === '신약') {
    return {
      actionable: '혼자 버티기보다 정보·조언·문서·공부·믿을 만한 사람을 통해 중심을 잡는 방식이 운을 편하게 함.',
      avoidPattern: '혼자 다 알아내고 혼자 결정하려는 패턴, 도움 요청을 미루는 패턴.',
      activatePattern: '막힐 때 상황을 정리해서 묻고 협업으로 보완하는 선택.',
    };
  }
  return {
    actionable: '환경의 결을 먼저 보고, 그 결에 맞춰 강점을 다르게 활용하는 유연함이 운을 편하게 함.',
    avoidPattern: '한 가지 방식만 고집하다 환경 변화에 늦게 대응하는 패턴.',
    activatePattern: '판이 바뀔 때 빠르게 결을 읽고 역할·접근을 조정하는 선택.',
  };
}

function strengthLifeSceneHint(level: DayMasterStrengthAnalysis['level']): { situation: string; likelyBehavior: string; innerReaction: string; externalMisunderstanding?: string; betterUse?: string } {
  const core = strengthCoreLabel(level);
  if (core === '신강') {
    return {
      situation: '업무에서 누가 결정을 미루고 책임이 흐려지는 순간',
      likelyBehavior: '"그럼 내가 정리해야지" 쪽으로 몸이 먼저 움직임',
      innerReaction: '이미 안쪽에서는 여러 번 기준을 넘었는지 판단하고 있었음',
      externalMisunderstanding: '주변은 갑자기 차가워졌다고 느낄 수 있음',
      betterUse: '기준을 말로 나누고 역할을 분명히 하면 단단함이 부담이 아니라 신뢰로 바뀜',
    };
  }
  if (core === '신약') {
    return {
      situation: '판단이 어려운 일이 몰리거나 환경이 빠르게 바뀌는 순간',
      likelyBehavior: '혼자 다 알아내려다 결정이 늦어질 수 있음',
      innerReaction: '도움을 요청해도 되는지 망설임이 길어지는 결',
      externalMisunderstanding: '주변은 조용히 처리하는 줄 알지만 실제론 정보·조언 접점이 부족한 상태',
      betterUse: '막힐 때 상황을 짧게 정리해서 묻는 습관이 운을 훨씬 편하게 만듦',
    };
  }
  return {
    situation: '환경이나 사람·역할이 바뀌는 전환 시점',
    likelyBehavior: '새 결에 맞춰 접근을 다시 조정하려는 결',
    innerReaction: '한쪽으로 단정 짓기보다 결을 더 보려는 결',
    externalMisunderstanding: '결정이 늦다고 보일 수 있지만 실제로는 결을 읽고 있음',
    betterUse: '환경별 강점을 다르게 활용하는 유연함이 가장 큰 자산',
  };
}

// ── 대표 신살 선정 + 깊이 풀이 ─────────────────────────────
const STAR_DEEP_MEANING: Record<string, { plain: string; sceneSeed: string; advice: string; cautionTone?: string }> = {
  '천을귀인': {
    plain: '결정적인 순간에 도움·정보·조언이 붙기 쉬운 결. 도움은 가만히 있어도 무조건 오는 것이 아니라, 상황을 정리해서 말할 때 더 잘 연결됨.',
    sceneSeed: '막힌 일이 생겼을 때 혼자 버티지 않고 짧게 정리해서 믿을 만한 사람에게 묻는 장면',
    advice: '구조화해서 묻는 습관을 들이면 운이 훨씬 편하게 흐름.',
    cautionTone: '"무조건 도움 받음"·"천운" 같은 과장 금지',
  },
  '문창귀인': {
    plain: '학문·문서·표현이 잘 통하는 결. 머리에 있는 것을 문서·자료·결과물로 만들었을 때 인정으로 이어지는 결.',
    sceneSeed: '아이디어를 머릿속에만 두지 않고 문서·강의안·콘텐츠로 남기는 장면',
    advice: '말로만 끝내지 말고 결과물로 남기는 습관이 운을 살림.',
  },
  '학당귀인': {
    plain: '배움이 자산이 되는 결. 단순 공부가 아니라 배운 것을 자기 기준으로 정리할 때 진짜 자산이 됨.',
    sceneSeed: '새로 배운 것을 자기 언어로 정리해 다른 사람에게 풀어주는 장면',
    advice: '배움을 정리·전달까지 가져가면 보상으로 이어짐.',
  },
  '월덕귀인': {
    plain: '주변에서 따뜻하게 받쳐주는 결. 관계의 결을 망가뜨리지 않으면 위기에서 풀려나는 힘이 됨.',
    sceneSeed: '오래 알고 지낸 사람들이 결정적 순간에 자연스럽게 받쳐주는 장면',
    advice: '관계의 결을 깨지 않는 선택이 운을 편하게 함.',
  },
  '천덕귀인': {
    plain: '하늘의 덕처럼 위기에서 풀려나는 결. 결정적 순간 한 발 늦지 않는 흐름.',
    sceneSeed: '벼랑 끝에서 예상치 못한 도움이나 풀림이 들어오는 장면',
    advice: '바른 선택을 누적하면 위기에서 풀림이 잘 들어옴.',
  },
  '양인': {
    plain: '위기에서 물러서지 않으려는 힘. 평소에는 조용해 보여도 결정적인 순간에 단호해질 수 있음.',
    sceneSeed: '책임이 흐려지거나 기준이 무너지는 장면에서 단호하게 정리에 들어가는 결',
    advice: '가까운 관계에서는 마음이 닫히기 전에 기준을 말로 나누는 것이 중요.',
    cautionTone: '"백호라서 사고" 같은 공포 해석 금지',
  },
  '괴강': {
    plain: '기준이 강하게 서는 기운. 한 번 기준이 서면 쉽게 흔들리지 않음.',
    sceneSeed: '여러 사람의 의견이 흩어질 때 결국 본인이 기준을 잡아 끌고 가는 장면',
    advice: '단단함을 부담이 아닌 신뢰로 바꾸려면 기준을 공유하고 문서로 남기는 것이 중요.',
  },
  '백호': {
    plain: '강하고 격렬한 추진력. 큰 변화에 노출되는 결.',
    sceneSeed: '판이 한 번 크게 바뀌는 시점에 정면으로 부딪히는 장면',
    advice: '강한 추진력은 방향을 정하고 쓰면 큰 결과로 이어지지만, 방향 없이 쓰면 소모가 큼.',
    cautionTone: '"백호=사고/불행" 식 단정 금지',
  },
  '도화': {
    plain: '사람을 끄는 매력·주목받는 자리. 억지로 눈에 띄려 하지 않아도 분위기로 기억되는 힘.',
    sceneSeed: '특별히 애쓰지 않아도 사람들의 시선이 모이는 장면',
    advice: '모든 관계에 반응하려 하기보다 오래 남길 관계를 고르는 감각이 필요.',
  },
  '홍염': {
    plain: '사람과 가까워지는 매력·감정의 결. 가까이 다가오는 사람이 많아짐.',
    sceneSeed: '말 한마디·태도 하나로 상대의 마음이 가까워지는 장면',
    advice: '가까운 거리에서 신호를 더 받기 쉬우니, 관계의 결을 본인이 먼저 정리하는 습관이 중요.',
  },
  '화개': {
    plain: '내면·예술·고요함을 향한 결. 혼자 정리하고 몰입할 때 깊어짐.',
    sceneSeed: '사람들과 떨어져 혼자 생각을 숙성시키고 결과물로 남기는 장면',
    advice: '바로 드러나는 힘보다 결과물로 남기는 힘이 큼 — 결과물을 외부에서 확인 가능한 형태로 정리하는 것이 운을 살림.',
  },
  '역마': {
    plain: '이동·변화·확장의 흐름. 한 자리에 묶이지 않고 움직일 때 자기 결이 더 잘 살아남.',
    sceneSeed: '환경·자리·접점을 바꾸는 선택이 일·관계의 결을 풀어주는 장면',
    advice: '이동·환경 변화를 도망이 아니라 구조의 변경으로 활용하면 운이 편해짐.',
  },
};

interface RepresentativeStar {
  star: SpecialStarInfo;
  priority: number; // 낮을수록 우선 (1 = 최우선)
  reason: string;
}

/**
 * 대표 신살 1~3개 선정.
 * 우선순위 (낮은 수가 우선):
 *   1 — lifeWeapons 또는 lifeTraps의 name과 부분 일치 (성향/패턴과 직접 연결)
 *   2 — interpretationHint가 충분히 있음 (해석이 가능한 신살)
 *   3 — strengthScore 높음
 *   4 — 그 외
 */
function pickRepresentativeStars(input: PersonalSajuGptInput): RepresentativeStar[] {
  const stars = input.coreAnalysis.specialStars;
  if (!stars || stars.length === 0) return [];

  const weaponNames = (input.lifeWeapons ?? []).map(w => w.name);
  const trapNames = (input.lifeTraps ?? []).map(t => t.name);
  const archetypeRelated = new Set<string>();
  for (const w of weaponNames) for (const k of Object.keys(STAR_DEEP_MEANING)) if (w.includes(k)) archetypeRelated.add(k);
  for (const t of trapNames) for (const k of Object.keys(STAR_DEEP_MEANING)) if (t.includes(k)) archetypeRelated.add(k);

  const scored: RepresentativeStar[] = stars.map(s => {
    if (archetypeRelated.has(s.name)) return { star: s, priority: 1, reason: 'archetype/lifeWeapons·lifeTraps와 직접 연결' };
    if (s.interpretationHint && s.interpretationHint.trim().length >= 6) return { star: s, priority: 2, reason: 'interpretationHint 충분' };
    if ((s.strengthScore ?? 0) >= 60) return { star: s, priority: 3, reason: 'strengthScore 높음' };
    return { star: s, priority: 4, reason: '기타' };
  });

  // 우선순위 → strengthScore 내림차순으로 정렬, 최대 3개
  scored.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (b.star.strengthScore ?? 0) - (a.star.strengthScore ?? 0);
  });

  return scored.slice(0, 3);
}

// ── 용신·기신 → 행동 조언 시드 ────────────────────────────
function usefulGodPlainMeaning(u: UsefulGodAnalysis): string {
  const primaryStr = u.primaryUseful ? `${String(u.primaryUseful.value)}(${u.primaryUseful.type === 'element' ? '오행' : '십성'})` : '주요 균형 결';
  const favorables = u.favorable && u.favorable.length > 0 ? u.favorable.slice(0, 3).map(String).join('·') : '';
  const unfavorables = u.unfavorable && u.unfavorable.length > 0 ? u.unfavorable.slice(0, 3).map(String).join('·') : '';
  const parts: string[] = [];
  parts.push(`용신은 이 사주를 편하게 살려주는 방향 — 주요하게는 ${primaryStr}.`);
  if (favorables) parts.push(`함께 도와주는 결(희신): ${favorables}.`);
  if (unfavorables) parts.push(`반대로 과해지면 운이 막히는 결(기신): ${unfavorables}.`);
  parts.push('이 방향은 물건·색상·방향 같은 미신적 개운법이 아니라, 그 결의 행동·환경·구조를 생활에 더 붙이는 방식으로 푸는 것이 핵심.');
  return parts.join(' ');
}

function usefulGodAdviceHint(u: UsefulGodAnalysis): { actionable: string; avoidPattern: string; activatePattern: string } {
  const favorables = u.favorable && u.favorable.length > 0 ? u.favorable.slice(0, 2).map(String).join('·') : '';
  const unfavorables = u.unfavorable && u.unfavorable.length > 0 ? u.unfavorable.slice(0, 2).map(String).join('·') : '';
  return {
    actionable: favorables
      ? `${favorables} 결의 환경·습관·관계를 생활에 더 자주 붙이는 선택이 운을 편하게 만듦.`
      : '이 사주를 편하게 만드는 결을 생활에 더 자주 붙이는 선택이 운을 살림.',
    avoidPattern: unfavorables
      ? `${unfavorables} 결이 과해지는 환경·반응·습관을 오래 끌고 가지 않는 것이 중요.`
      : '과해진 결을 그대로 끌고 가는 패턴을 피해야 함.',
    activatePattern: '용신/기신을 "물건"이 아니라 "행동의 결"로 바꿔 생활 속 선택으로 적용.',
  };
}

// ── 개운 방향 (synthetic — 신강/신약 + 용신 종합) ──────────
function buildGaewoonDirectionFact(input: PersonalSajuGptInput): NarrativeMustUseFact {
  const dm = input.coreAnalysis.dayMasterStrength;
  const ug = input.coreAnalysis.usefulGod;
  const core = strengthCoreLabel(dm.level);
  const ugSummary = usefulGodPlainMeaning(ug);
  const strengthFlavor = core === '신강'
    ? '이미 강한 힘을 더 키우는 쪽이 아니라, 그 힘을 어디까지 쓰고 어디서 나눌지 정하는 쪽이 개운 방향.'
    : core === '신약'
      ? '혼자 버티는 힘을 키우는 쪽이 아니라, 좋은 정보·환경·협업을 잘 붙여 중심을 잡는 쪽이 개운 방향.'
      : '한쪽으로 힘을 몰지 않고 환경의 결을 빠르게 읽어 강점을 다르게 활용하는 쪽이 개운 방향.';
  return {
    id: 'gaewoon-direction',
    source: 'gaewoonDirection',
    fact: `개운 방향 (신강/신약=${core}, 용신=${ug.primaryUseful ? String(ug.primaryUseful.value) : '균형'})`,
    plainMeaning: `${strengthFlavor} ${ugSummary}`,
    narrativeHint: '결론 본문 안에 "이 사주의 개운 방향은 ..." 단락 1개로 자연스럽게. 별도 헤더 X. 부적·색상·방향 같은 미신적 개운법 금지. 행동·구조화·역할 분담·문서화 중심으로.',
    matchTokens: ['개운', '운을 편하게', '운이 살아나', '운을 막는'],
    adviceHint: {
      actionable: '용신 결을 생활 속 행동·습관·환경·관계로 자주 붙이고, 기신 결이 과해지지 않도록 선택을 다듬는 방식.',
      avoidPattern: '부적·색상·방향 맹신, "특정 물건을 사면 운이 좋아진다" 식의 미신적 표현.',
      activatePattern: '책임을 혼자 떠안지 않고 역할·권한·보상 기준을 문서화하고 나누는 선택.',
    },
  };
}

// ── 운이 열리는 방식 (opening 짧은 시드, 2~3문장) ─────────
function buildLuckOpeningConditionFact(input: PersonalSajuGptInput): NarrativeMustUseFact {
  const core = strengthCoreLabel(input.coreAnalysis.dayMasterStrength.level);
  const seed = core === '신강'
    ? '이 사주의 운은 더 강하게 버틸 때 열리는 구조가 아니라, 이미 강한 힘을 혼자 쓰지 않고 구조로 바꿀 때 살아남.'
    : core === '신약'
      ? '이 사주의 운은 혼자 다 알아내려 할 때보다, 좋은 정보·환경·협업을 잘 붙여 중심을 잡을 때 살아남.'
      : '이 사주의 운은 한쪽 방식만 고집할 때보다, 환경의 결에 따라 강점을 유연하게 바꿀 때 살아남.';
  return {
    id: 'luck-opening-condition',
    source: 'luckOpeningCondition',
    fact: '운이 열리는 방식 (한 줄 정의 후반 짧은 시드)',
    plainMeaning: seed,
    narrativeHint: '1장 마지막 단락에서 2~3문장으로만 짧게. 구체 개운법·행동 조언은 절대 여기서 풀지 말고 결론(finalStrategyNarrative)으로 미룸.',
    matchTokens: ['운이 열리', '운이 살아나', '구조로 바꿀', '구조로 바꾸', '구조로 정리'],
    adviceHint: {
      actionable: '짧은 마무리만. 결론 섹션에서 구체화.',
    },
  };
}

// ============================================================
// R1 (2026-06): chart-derived 관계/돈 fact 빌더
// 합성(차트 무관) mustUseFacts 대체 — 실제 십성·신살·신강약에서만 문장을 만든다.
// 근거가 없으면 해당 fact를 push하지 않는다("근거 없으면 말하지 않는다").
// ============================================================
function tgSum(input: PersonalSajuGptInput, names: string[]): number {
  const t = (input.coreAnalysis.tenGods?.totals ?? {}) as Record<string, number>;
  return names.reduce((a, n) => a + (Number(t[n]) || 0), 0);
}
function starSet(input: PersonalSajuGptInput): Set<string> {
  return new Set((input.coreAnalysis.specialStars ?? []).map(s => s.name));
}

/** 관계·연애 섹션 — 도화/홍염·화개 신살 + 성별별 인연 십성 + 신강약에서 chart fact 생성. */
function buildRelationshipChartFacts(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativeMustUseFact[] {
  const facts: NarrativeMustUseFact[] = [];
  const relHints = hints?.filter(h => h.sectionId === 'relationshipLoveNarrative') ?? [];
  const stars = starSet(input);
  const has = (re: RegExp) => [...stars].some(s => re.test(s));
  const female = input.userContext.gender === 'female';
  const core = strengthCoreLabel(input.coreAnalysis.dayMasterStrength.level);
  const relGod = female ? tgSum(input, ['정관', '편관']) : tgSum(input, ['정재', '편재']);

  // 1) 끌림/거리 결 — 도화·홍염(매력) vs 화개(거리·몰입). 둘 다 없으면 신강약 기반 기본 결.
  if (has(/도화|홍염/)) {
    facts.push({
      id: 'rel-charm', source: 'specialStar',
      fact: '도화·홍염 계열 — 사람을 끄는 매력',
      plainMeaning: '특별히 애쓰지 않아도 다가오는 사람이 많은 편이라, 모든 신호에 반응하기보다 오래 남길 관계를 고르는 감각이 중요한 결.',
      narrativeHint: '관계 도입을 이 매력의 결로 시작 (신살 이름은 즉시 일상어로 풀이)',
      matchTokens: ['매력', '끌리', '다가오는 사람', '도화', '홍염'],
      lifeSceneHint: relHints[0] ? {
        situation: relHints[0].situation, likelyBehavior: relHints[0].likelyBehavior,
        innerReaction: relHints[0].innerReaction,
        externalMisunderstanding: relHints[0].externalMisunderstanding, betterUse: relHints[0].betterUse,
      } : undefined,
    });
  } else if (has(/화개/)) {
    facts.push({
      id: 'rel-solitude', source: 'specialStar',
      fact: '화개 — 관계에서 거리·정리 시간이 필요한 결',
      plainMeaning: '가까워질수록 혼자 정리할 시간이 필요한 편. 거리감이 차가움이 아니라 관계를 깊게 가져가기 위한 결.',
      narrativeHint: '관계 도입을 거리·몰입의 결로',
      matchTokens: ['거리', '혼자 정리', '화개', '몰입'],
    });
  }

  // 2) 인연 십성 결 (성별별 — 女 관성 / 男 재성)
  if (relGod >= 1.5) {
    facts.push({
      id: 'rel-bond', source: 'tenGod',
      fact: female ? '관성(책임·공식) 인연 기운이 또렷' : '재성(현실 인연) 기운이 또렷',
      plainMeaning: female
        ? '책임과 약속이 분명한 관계에 마음이 가는 결. 분위기보다 관계의 틀이 잡힐 때 안정됨.'
        : '현실 조건과 생활이 맞는 인연에 마음이 가는 결. 분위기보다 함께 굴러가는 그림이 보일 때 깊어짐.',
      narrativeHint: '인연의 결을 십성 근거로 — 용어는 즉시 일상어',
      matchTokens: female ? ['책임', '약속', '관계의 틀'] : ['현실', '생활', '함께'],
    });
  } else {
    facts.push({
      id: 'rel-bond-weak', source: 'tenGod',
      fact: female ? '관성(인연) 기운이 강하진 않음' : '재성(인연) 기운이 강하진 않음',
      plainMeaning: female
        ? '여성 사주에서 관계·결혼을 끌어오는 기운이 두드러지진 않아, 한눈에 타오르기보다 시간을 두고 신뢰가 쌓일 때 가까워지는 결.'
        : '남성 사주에서 현실 인연을 끌어오는 기운이 두드러지진 않아, 분위기보다 생활이 맞물릴 때 천천히 깊어지는 결.',
      narrativeHint: '천천히 깊어지는 결로 (인연운 약함을 단점이 아니라 결로)',
      matchTokens: female ? ['시간을 두고', '신뢰가 쌓', '천천히'] : ['생활이', '천천히', '깊어지'],
    });
  }

  // 3) 신강약 → 관계 거리·마음 열고 닫힘 결
  facts.push({
    id: 'rel-distance', source: 'dayMasterStrength',
    fact: `${core} — 가까운 관계에서의 거리 결`,
    plainMeaning: core === '신강'
      ? '관계에서 자기 기준이 분명한 편이라 상대가 거리감을 느낄 수 있음. 마음이 닫히기 전에 먼저 말로 풀면 단단함이 신뢰로 바뀌는 결.'
      : core === '신약'
        ? '가까운 사람의 결에 영향을 크게 받는 편. 휘둘림이 아니라, 믿을 사람을 고르는 기준을 자기 안에 먼저 둘 때 마음이 편해지는 결.'
        : '상대와 환경에 따라 관계의 결이 달라지는 편이라, 누구와 함께하느냐에 따라 다른 강점이 나오는 결.',
    narrativeHint: '마음이 열리고 닫히는 방식을 신강약 근거로 (열림/닫힘 둘 다)',
    matchTokens: [core, '거리', '신뢰', '마음'],
    lifeSceneHint: relHints[1] ? {
      situation: relHints[1].situation, likelyBehavior: relHints[1].likelyBehavior,
      innerReaction: relHints[1].innerReaction,
      externalMisunderstanding: relHints[1].externalMisunderstanding, betterUse: relHints[1].betterUse,
    } : undefined,
  });

  // 4) userContext 안전망 (혼인/자녀 단정 방지) — 동일 컨텍스트면 동일해도 됨(차트 수렴 아님).
  facts.push({
    id: 'relationship-context', source: 'userContext',
    fact: `relationshipStatus=${input.userContext.relationshipStatus}`,
    plainMeaning:
      input.userContext.relationshipStatus === 'married' ? '기혼자 — 새 인연/배우자 표현 단정 주의' :
      input.userContext.relationshipStatus === 'single' ? '미혼 — 결혼 단정 금지' :
      '관계 상태 unknown — 일반 관계 결로',
    narrativeHint: 'userContext 위반 금지 (배우자/남편/아내/자녀와 등)',
    matchTokens: ['관계'],
  });

  return facts;
}

/** 돈·수익화 섹션 — 재성(편재/정재) 구조 + 식상생재 + 신강약에서 chart fact 생성. */
function buildMoneyChartFacts(input: PersonalSajuGptInput): NarrativeMustUseFact[] {
  const facts: NarrativeMustUseFact[] = [];
  const jeongJae = tgSum(input, ['정재']);
  const pyeonJae = tgSum(input, ['편재']);
  const jae = jeongJae + pyeonJae;
  const sikSang = tgSum(input, ['식신', '상관']);
  const insung = tgSum(input, ['정인', '편인']);
  const core = strengthCoreLabel(input.coreAnalysis.dayMasterStrength.level);

  // 1) 재성 구조 — 돈이 붙는 "형태"
  if (pyeonJae > jeongJae && pyeonJae >= 1.5) {
    facts.push({
      id: 'money-jae-shape', source: 'tenGod',
      fact: '편재 우위 — 변동·확장형 돈 기운',
      plainMeaning: '기회·거래·사람을 통해 크게 움직이는 돈의 결. 한자리 고정보다 판을 키우는 쪽에서 살아나되, 들어온 만큼 새기도 쉬워 기준이 필요한 결.',
      narrativeHint: '"돈이 붙는 방식은 ..." 편재 결로. 투자/매매 권유 톤 금지',
      matchTokens: ['편재', '기회', '거래', '확장'],
    });
  } else if (jeongJae >= pyeonJae && jeongJae >= 1) {
    facts.push({
      id: 'money-jae-shape', source: 'tenGod',
      fact: '정재 우위 — 고정·축적형 돈 기운',
      plainMeaning: '꾸준한 수입과 계획적인 관리로 천천히 쌓이는 돈의 결. 한 번에 크게보다 시간이 붙을수록 단단해지는 쪽.',
      narrativeHint: '"돈이 붙는 방식은 ..." 정재 결로',
      matchTokens: ['정재', '꾸준한 수입', '관리', '쌓이'],
    });
  } else {
    facts.push({
      id: 'money-jae-weak', source: 'tenGod',
      fact: '재성이 약한 구조 — 돈을 "형태"로 묶어야 남음',
      plainMeaning: '돈 기운 자체가 강하진 않아, 돈을 바로 좇기보다 자격·전문성·결과물·계약 같은 형태로 묶을 때 남는 결. 형태가 없으면 실력은 쓰이는데 보상이 약해지기 쉬움.',
      narrativeHint: '"돈이 붙는 방식은 ..." 재성 약 → 형태화 결로 (단정적 빈곤 단정 금지)',
      matchTokens: ['자격', '전문성', '결과물', '형태'],
    });
  }

  // 2) 식상생재 — 만든 것이 돈으로 이어지는 흐름 (신호 있을 때만)
  if (sikSang >= 1.5 && jae >= 1) {
    facts.push({
      id: 'money-siksang-jae', source: 'tenGod',
      fact: '식상생재 — 만든 것이 돈으로 이어지는 흐름',
      plainMeaning: '표현·기획·결과물(식상)이 돈(재성)으로 이어지는 결. 내가 만든 것을 외부에서 확인 가능한 형태로 남길 때 수익으로 연결됨.',
      narrativeHint: '식상생재 흐름을 한 단락으로',
      matchTokens: ['식상생재', '만든 것', '결과물', '수익'],
    });
  } else if (insung >= 2) {
    facts.push({
      id: 'money-insung', source: 'tenGod',
      fact: '인성 강 — 자격·전문성이 수입의 축',
      plainMeaning: '배움·자격·전문성(인성)이 돈의 통로가 되는 결. 자격·콘텐츠·전문 분야처럼 "검증된 형태"로 묶을수록 수입이 안정됨.',
      narrativeHint: '인성 → 자격·전문성 수익 결로',
      matchTokens: ['자격', '전문성', '인성', '수입'],
    });
  }

  // 3) 신강약 → 돈을 쥐는 방식
  facts.push({
    id: 'money-strength', source: 'dayMasterStrength',
    fact: `${core} — 돈을 쥐고 가는 방식`,
    plainMeaning: core === '신강'
      ? '재성을 직접 굴리는 힘이 있는 편 — 다만 추진이 과하면 한 번에 벌이려다 새기 쉬워, 규모를 키우기 전에 구조를 먼저 잡는 쪽이 안정적.'
      : core === '신약'
        ? '돈을 혼자 크게 굴리기보다, 검증된 구조·사람·계약에 얹어 천천히 키울 때 안정적인 결.'
        : '환경에 따라 돈을 쥐는 방식이 달라지는 편이라, 판의 결을 보고 방식을 바꾸는 유연함이 자산.',
    narrativeHint: '"돈이 새는 패턴"을 신강약 결로 (투자 권유 금지)',
    matchTokens: [core, '구조', '돈'],
  });

  return facts;
}

// ============================================================
// 섹션 1 — openingDefinition
// ============================================================
function buildOpeningPlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[], depth: NarrativeDepthOptions = DEFAULT_NARRATIVE_DEPTH_OPTIONS): NarrativePlan {
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

  // 2026-05 Depth v1: 운이 열리는 방식 짧은 시드 (flag on일 때만, 2~3문장 제한)
  if (depth.useSajuOpeningLuckCondition) {
    facts.push(buildLuckOpeningConditionFact(input));
  }

  const requiredBeats: string[] = [
    '이 사주를 대표하는 한 문장으로 시작한다(겉/속 결 차이나 결정 방식이 드러나야 함).',
    '그 한 문장이 실제 삶에서 어떻게 나타나는지 1~2단락 설명한다.',
    '핵심 키워드 3~5개를 문장 속에 녹인다(리스트 X).',
    'specialPoints를 일상어로 풀어준다 (예: "양인은 쉽게 말해 ...").',
    '이 힘이 장점이 되는 상황과 부담이 되는 상황을 함께 말한다.',
  ];
  if (depth.useSajuOpeningLuckCondition) {
    requiredBeats.push('마지막 단락에서 2~3문장 이하로 "운이 열리는 방식"을 짧게만 시드. 구체 개운법은 결론 섹션에서 다룸.');
  }
  requiredBeats.push('다음 장으로 자연스럽게 이어지는 문장으로 끝낸다.');

  return {
    sectionId: 'openingDefinition',
    sectionGoal: '이 사주의 핵심을 한 문장으로 잡고, 독자가 계속 읽고 싶게 만든다.',
    topicCoverageTargets: ['oneLineDefinition', 'coreKeywords', 'outerInnerContrast', 'specialPoints'],
    mustUseFacts: facts,
    requiredBeats,
    avoidRepeating: [
      '위기에서 쉽게 꺾이지 않는',
      '안정성과 신뢰를 중시',
      '상위 1%', '희귀한 사주', '무조건 성공',
    ],
    styleExamples: {
      badExample: '이 사주는 위기에서 쉽게 꺾이지 않는 힘을 지닌 사람입니다.',
      // R1: 특정 사주형(양인·괴강·혼자버티기) 예시 제거 — 톤/구조만 안내. 내용은 mustUseFacts에서.
      goodExample:
        '[톤·구조 예시일 뿐, 문장을 복사하지 말 것. 실제 내용은 이 plan의 mustUseFacts(일간·키워드·specialPoints)에서만 가져온다.]\n\n' +
        '이 사주를 한 문장으로 말하면 → 이 사주의 대표 키워드 결을 한 문장으로 잡는다(겉/속 차이나 결정 방식이 드러나게).\n\n' +
        '→ 그 한 문장이 실제 삶에서 어떻게 나타나는지 한두 장면으로 보여준다. specialPoints 용어가 나오면 바로 쉬운 말로 풀고, 이 힘이 장점이 되는 상황과 부담이 되는 상황을 함께 말한 뒤 다음 장으로 자연스럽게 넘긴다.',
      transformationRule: '핵심 성향을 한 문장으로 끝내지 말고, 그 사주의 실제 분석값(일간·신살·키워드)에 근거한 장면과 그림자까지 이어서 설명하라. 다른 사주에도 들어맞을 일반 문장 금지.',
    },
  };
}

// ============================================================
// 섹션 2 — lifeStructureNarrative
// ============================================================
function buildLifeStructurePlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[], depth: NarrativeDepthOptions = DEFAULT_NARRATIVE_DEPTH_OPTIONS): NarrativePlan {
  const facts: NarrativeMustUseFact[] = [];

  // dayMaster (본격 풀이) — 일간 비유 + 내면 결 hint 부착
  const dm = input.birthChart.dayMaster;
  facts.push({
    id: 'dayMaster-structure',
    source: 'dayMaster',
    fact: dm,
    plainMeaning: plainOf(dm),
    narrativeHint: '이 fact의 plainMeaning을 그대로 첫 단락 비유로 사용. prompt 본문의 다른 일간 예시(큰 산/넓은 땅 등)를 카피해 적용 금지.',
    matchTokens: buildMatchTokens(dm, dm[0] ?? ''),
    lifeSceneHint: pickHint(hints, 'lifeStructureNarrative', 'identityKeyword'),
  });

  // strongest elements top 2
  // R1-fix (2026-06): elementStrength.strongest는 영문 키(wood/water…). fact/plainMeaning/matchTokens
  //   모두 한글 오행(목/화/토/금/수)으로 변환해야 함 — sanitizer가 본문을 한글로 바꾸므로 영문
  //   matchToken은 영구 매칭 실패 → 매 생성 medium 이슈 → 불필요한 repair 유발.
  input.coreAnalysis.elementStrength.strongest.slice(0, 2).forEach((el, i) => {
    const elKo = ELEMENT_KO[el] ?? el;
    facts.push({
      id: `element-strong-${i}`,
      source: 'elementStrength',
      fact: `${elKo} 강세`,
      plainMeaning: `${elKo} 기운이 강하다는 건 그 결의 행동/감각이 평소보다 자주 올라온다는 뜻`,
      narrativeHint: '성격에 어떻게 나타나는지 줄글로',
      matchTokens: buildMatchTokens(elKo),
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

  // 2026-05 Depth v1: 신강/신약 fact + 대표 신살 fact (flag on일 때만)
  if (depth.useEvidenceNarrativeBlocks) {
    const dms = input.coreAnalysis.dayMasterStrength;
    const core = strengthCoreLabel(dms.level);
    facts.push({
      id: 'dayMasterStrength',
      source: 'dayMasterStrength',
      fact: `${core} (level=${dms.level})`,
      plainMeaning: strengthPlainMeaning(dms.level),
      narrativeHint:
        `일간 비유 뒤 단락에서 "${core}은(는) ..." 식으로 짧게 풀어 1~2문장 안에 흡수. ` +
        `반드시 일간 비유와 묶어 "원인(${core} 구조) → 결과(성향) → 현실 장면 → 조언" 흐름으로. ` +
        '운명론적 단정("강하다"=좋다 / "약하다"=나쁘다) 금지. 사주 구조 설명으로만.',
      // R1: '버티는 힘'/'도와주는 힘' 같은 고정 토큰을 모든 차트에 강제하면 수렴하므로 제거.
      //     core(신강/신약/중화)만 흡수 토큰으로 — 실제 풀이는 chart 신호에서.
      matchTokens: [core, '구조'],
      lifeSceneHint: strengthLifeSceneHint(dms.level),
      adviceHint: strengthAdviceHint(dms.level),
    });

    // 대표 신살 1~3개 (선정 기준은 pickRepresentativeStars 주석 참고)
    const repStars = pickRepresentativeStars(input);
    repStars.forEach((rs, i) => {
      const meaning = STAR_DEEP_MEANING[rs.star.name];
      const plainBase = meaning?.plain ?? (rs.star.interpretationHint || plainOf(rs.star.name));
      const sceneSeed = meaning?.sceneSeed ?? '';
      const adviceBase = meaning?.advice ?? '';
      facts.push({
        id: `representative-star-${i}`,
        source: 'specialStar',
        fact: `${rs.star.name} (대표 신살, 선정사유=${rs.reason})`,
        plainMeaning: plainBase,
        narrativeHint:
          `신살 이름만 나열하지 말고 "${rs.star.name}은(는) ..." 식으로 즉시 일상어로 풀이. ` +
          `반드시 다른 명리 근거(일간/신강신약/십성 중 하나)와 묶어 해석. ` +
          `${meaning?.cautionTone ? meaning.cautionTone + '. ' : ''}` +
          '단순 단어 언급으로 끝나면 special-star-too-shallow medium issue.',
        matchTokens: [rs.star.name],
        lifeSceneHint: sceneSeed ? {
          situation: sceneSeed,
          likelyBehavior: '이 결이 자연스럽게 작동하는 행동 방식',
          innerReaction: '안쪽에서는 이미 결이 잡혀 있는 상태',
          betterUse: adviceBase,
        } : undefined,
        adviceHint: {
          actionable: adviceBase || '이 신살의 결을 자기 강점으로 자연스럽게 활용.',
          avoidPattern: meaning?.cautionTone ? `${meaning.cautionTone}, 공포·운명 단정으로 풀지 않음.` : undefined,
        },
      });
    });
  }

  // 가족·초년 흔적 (synthetic fact — 단정 없이 조건부 톤 시드)
  facts.push({
    id: 'family-early-structure',
    source: 'familyEarlyPattern',
    fact: '초년/가족 안에서의 책임 흔적',
    plainMeaning: '특정 사건 단정이 아니라, 사주 구조상 책임을 빨리 체감했을 가능성',
    narrativeHint: '"초년 흐름이나 가족 안에서의 역할이 강하게 작동했다면..." 같은 조건부 한 단락',
    matchTokens: ['가족', '초년', '어릴 때', '부모', '집안'],
  });

  const requiredBeats: string[] = [
    '일간을 쉬운 비유로 설명한다 (이 plan의 dayMaster fact plainMeaning을 그대로 사용. 다른 일간 비유 카피 금지).',
  ];
  if (depth.useEvidenceNarrativeBlocks) {
    requiredBeats.push(
      '신강/신약/중화 구조를 1~2문장으로 풀어 일간 설명과 묶어 흡수 (운명론 단정 금지, 사주 구조 설명으로만).',
    );
  }
  requiredBeats.push(
    '강한 오행/십성이 성격에 어떻게 나타나는지 줄글로 설명한다.',
  );
  if (depth.useEvidenceNarrativeBlocks) {
    requiredBeats.push(
      '대표 신살 1~3개를 일간/신강신약/십성과 묶어 깊이 풀이 — 단어 나열 금지, 반드시 현실 장면이나 조언으로 연결.',
    );
  }
  requiredBeats.push(
    '겉으로 보이는 모습과 실제 내면의 차이를 설명한다(반전 포인트).',
    '주변이 오해하기 쉬운 지점을 말한다.',
    '본인이 스스로 힘들어할 수 있는 지점을 말한다.',
    '초년/가족 관련 내용은 단정하지 않고 "사주 구조상 ~할 가능성"으로 조건부 표현.',
  );

  return {
    sectionId: 'lifeStructureNarrative',
    sectionGoal: '왜 이 사람이 이런 방식으로 생각하고 반응하는지 설명한다.',
    topicCoverageTargets: [
      'personality', 'innerWorld', 'emotionalProcessing', 'socialMask',
      'selfProtectionPattern', 'outerInnerContrast', 'familyEarlyPattern',
    ],
    mustUseFacts: facts,
    requiredBeats,
    avoidRepeating: [
      '안정성과 신뢰를 중시',
      '어린 시절부터 책임감이 강했던',
      '함정 1.', '함정 2.',
    ],
    styleExamples: {
      badExample: '이 사주는 강한 일간이라 안정성과 신뢰를 중시합니다.',
      // R1: 고정 페르소나(겉차분/비겁 버티는 힘) 제거 — 풀이 "방법"만 안내, 내용은 mustUseFacts에서.
      goodExample:
        '[톤·구조 예시. 문장 복사 금지. 일간 비유는 이 plan의 dayMaster fact plainMeaning만 사용한다.]\n\n' +
        '먼저 일간을 그 plan의 비유로 설명한다(다른 일간 비유 카피 금지).\n\n' +
        '→ 강한 오행/십성과 신강약 구조가 성격에 어떻게 나타나는지 줄글로 풀고, 명리 용어가 나오면 바로 쉬운 뜻과 실제 반응 방식까지 연결한다. 겉으로 보이는 모습과 실제 내면의 차이, 주변이 오해하기 쉬운 지점을 그 사주의 근거로 말한다.',
      transformationRule: '명리 용어를 말한 뒤 반드시 쉬운 뜻과 실제 반응 방식까지 연결하라. 일간 비유는 plan dayMaster fact plainMeaning만 사용. 다른 사주에도 맞는 일반 성격 묘사 금지.',
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

  // R1: 합성 관계/연애/가족 fact 3개 제거 (모든 차트 동일 문장이라 수렴 유발).
  //   반복 패턴은 chart-derived lifeTraps + timingAnchors + blockingChoices에서만 도출한다.
  //   관계·연애 결은 6장(relationshipLove)에서 chart 신호로 다룬다.

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
      // R1: 고정 패턴 예시(떠안기/조용히 마음 접기) 제거 — 풀이 방법만. 패턴 내용은 lifeTraps에서.
      goodExample:
        '[톤·구조 예시. 문장 복사 금지. 반복 패턴 내용은 이 plan의 lifeTraps/timingAnchors fact에서만 가져온다.]\n\n' +
        '가장 큰 반복 패턴을 한 문장으로 잡는다(함정 이름을 카드처럼 나열하지 말고 줄글로).\n\n' +
        '→ 그 패턴이 일에서, 그리고 가까운 관계에서 각각 어떤 장면으로 나타나는지 보여준다. timingAnchors가 있으면 "~였을 수 있어요" 톤으로 짧게 얹고, 벗어나는 방향을 조언 리스트가 아니라 한 단락 줄글로 푼다.',
      transformationRule: '함정 이름을 나열하지 말고, 그 사주의 lifeTraps 근거로 일·관계에서 반복되는 장면을 풀어라.',
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

  // 리더십 — R1: 신강약 기반으로 차별화 (고정 "기준을 세우고 흐름을 정리" 제거).
  facts.push({
    id: 'leadership-style',
    source: 'careerSpecificAnalysis',
    fact: '리더십 스타일',
    plainMeaning: strengthCoreLabel(input.coreAnalysis.dayMasterStrength.level) === '신강'
      ? '앞에서 끌고 가며 결정을 빠르게 내리는 추진형 리더십 — 속도가 강점이되 혼자 떠안지 않도록 권한을 나눌 때 더 단단해지는 결.'
      : '직접 밀어붙이기보다 사람·정보·근거를 엮어 판을 정리하는 조율형 리더십 — 신뢰를 쌓아 움직이게 하는 쪽.',
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
      // R1: 고정 재능 예시(기준 세우고 흐름 정리) 제거 — 구조만. 재능·직업군은 lifeWeapons/careerMatches에서.
      goodExample:
        '[톤·구조 예시. 문장 복사 금지. 재능·직업군은 이 plan의 lifeWeapons/careerSpecificAnalysis fact에서만.]\n\n' +
        '이 사주의 핵심 재능을 한 줄로 정의한다(그 사주의 lifeWeapons 근거로).\n\n' +
        '→ 그 능력이 잘 발휘되는 업무 환경을 설명하고, 구체 직업군을 산업 2개·직무 3개 이상 문장 속에 자연스럽게 녹인다(리스트 X). 반대로 쉽게 지치는 환경도 그 사주의 근거로 말한 뒤, 다음 장(돈)으로 넘긴다.',
      transformationRule: '직업군을 말하기 전 반드시 그 사주의 핵심 능력을 설명하고, 직업군은 그 능력의 적용처로 제시하라.',
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

  // R1: 합성(차트 무관) 돈 fact 5개 제거 → 재성/식상생재/신강약 기반 chart fact로 교체.
  //   "돈이 새는 패턴/작업 범위·보상 기준/무료로 해주던/상품화" 고정 문장은 더 이상 강제하지 않는다.
  //   (운영 조언은 requiredBeats가 안내하되, 돈의 "결" 판정은 차트에서만 온다.)
  facts.push(...buildMoneyChartFacts(input));

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
      // R1: 고정 돈 예시(축적형/작업 범위/상품화) 제거 — 구조만. 돈의 결은 재성/식상생재 fact에서.
      goodExample:
        '[톤·구조 예시. 문장 복사 금지. 돈이 붙는/새는 결은 이 plan의 재성·식상생재·moneyMakingStyle fact에서만.]\n\n' +
        '돈이 붙는 방식을 그 사주의 재성 구조(편재/정재/재성 약)로 한 단락 푼다.\n\n' +
        '→ 돈이 새는 패턴을 그 사주의 결로 한 단락, 어떤 수익 형태가 맞는지 한 단락. 투자·거래·시장 타이밍 권유 표현은 절대 금지하고, 수익화 구조·계약 조건 중심으로만.',
      transformationRule: '돈은 그 사주의 재성 구조에서 도출한 수익화 결 중심으로. 투자/거래/시장 타이밍 표현은 절대 금지. 다른 사주에도 맞는 일반 돈 조언 금지.',
    },
  };
}

// ============================================================
// 섹션 6 — relationshipLoveNarrative (관계와 연애: 독립 장)
// ============================================================
function buildRelationshipLovePlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[]): NarrativePlan {
  // R1: 합성 관계 fact 7개(말보다 행동 일관성/기준 없이 부탁/역할 분담 등) 제거 →
  //   도화·홍염·화개 신살 + 성별별 인연 십성(女관성/男재성) + 신강약 기반 chart fact로 교체.
  //   근거 없는 관계 결은 말하지 않고, 매력·거리·인연·열림닫힘을 차트에서만 도출한다.
  const facts: NarrativeMustUseFact[] = buildRelationshipChartFacts(input, hints);

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
      // R1: 고정 관계 예시(말보다 행동 일관성/서운함 쌓기) 제거 — 구조만. 관계 결은 신살·인연 십성·신강약 fact에서.
      goodExample:
        '[톤·구조 예시. 문장 복사 금지. 관계 결은 이 plan의 도화·홍염·화개 신살, 인연 십성, 신강약 fact에서만.]\n\n' +
        '관계 스타일을 그 사주의 매력 신살(도화·홍염) 또는 거리 신살(화개)로 도입한다.\n\n' +
        '→ 어떤 사람과 편하고 어떤 사람에게 지치는지, 연애에서 마음이 열리고 닫히는 방식을 인연 십성·신강약 근거로 푼다. userContext(혼인/자녀)를 단정하지 말 것.',
      transformationRule: '관계는 다정함이 아니라 그 사주의 신살·인연 십성·신강약에서 도출한 신뢰·열림/닫힘 방식으로 풀어라. 다른 사주에도 맞는 일반 관계 묘사 금지. userContext 단정 금지.',
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
function buildFinalStrategyPlan(input: PersonalSajuGptInput, hints?: LifeSceneHint[], depth: NarrativeDepthOptions = DEFAULT_NARRATIVE_DEPTH_OPTIONS): NarrativePlan {
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

  // 2026-05 Depth v1: 용신/기신 행동 조언 fact (Evidence flag) + 개운 방향 fact (Gaewoon flag)
  if (depth.useEvidenceNarrativeBlocks) {
    const ug = input.coreAnalysis.usefulGod;
    facts.push({
      id: 'useful-god-advice',
      source: 'usefulGod',
      fact: `용신=${ug.primaryUseful ? String(ug.primaryUseful.value) : '균형'}, 희신=${(ug.favorable ?? []).slice(0, 2).map(String).join('·') || '-'}, 기신=${(ug.unfavorable ?? []).slice(0, 2).map(String).join('·') || '-'}`,
      plainMeaning: usefulGodPlainMeaning(ug),
      narrativeHint:
        '용신/기신을 명리 용어로만 끝내지 말고, 결론 본문에서 "용신은 이 사주를 편하게 살려주는 방향, 기신은 과해지면 운이 막히는 결" 식으로 풀어, 그 결을 어떤 행동·환경·선택으로 적용할지로 연결. ' +
        '미신적 개운법(부적·색상·방향) 절대 금지. 행동·구조화·역할 중심.',
      matchTokens: ['용신', '기신', '편하게 살려', '과해지면', '도와주는 결'],
      adviceHint: usefulGodAdviceHint(ug),
    });
  }
  if (depth.useFinalGaewoonDirection) {
    facts.push(buildGaewoonDirectionFact(input));
  }

  const requiredBeats: string[] = [
    '이 사주의 핵심 사용법을 한 단락으로 정리한다.',
    '일에서의 사용법을 말한다 (책임 범위·권한 결).',
    '돈에서의 사용법을 말한다 (작업 범위·보상 기준 결).',
    '관계에서의 사용법을 말한다 (초반 기준 말하기 결).',
    '멘탈/선택 기준을 말한다.',
  ];
  if (depth.useEvidenceNarrativeBlocks) {
    requiredBeats.push(
      '용신/기신을 명리 용어로만 끝내지 말고, 그 결을 어떤 행동·환경·선택으로 적용할지(행동 조언)로 연결.',
    );
  }
  if (depth.useFinalGaewoonDirection) {
    requiredBeats.push(
      '"이 사주의 개운 방향" 단락 1개 — 부적/색상/방향 같은 미신 개운법 금지, 행동·구조화·역할 분담·문서화 중심.',
      '운을 막는 선택 1~2개와 운을 살리는 선택 1~2개를 줄글로 자연스럽게.',
    );
  }
  requiredBeats.push('마지막 한 문장은 기억에 남게 쓴다 (저장하고 싶은 한 문장).');

  return {
    sectionId: 'finalStrategyNarrative',
    sectionGoal: '이 사주를 어떻게 써야 하는지 결론을 낸다.',
    topicCoverageTargets: ['practicalStrategy', 'career', 'moneyStyle', 'relationshipStyle', 'loveMarriageStyle'],
    mustUseFacts: facts,
    requiredBeats,
    avoidRepeating: [
      '협업을 통해 더 나은 결과',
      '긍정적인 결과를 가져올',
      '행복한 삶을 살게',
    ],
    styleExamples: {
      badExample: '자기 기준을 자산으로 삼고, 협업을 통해 더 나은 결과를 만들어가는 것이 이 사주의 핵심입니다.',
      // R1: 고정 결론(혼자 버티기→기준 잡고 역할 나누기/작업 범위·보상) 제거 — 구조만.
      //   결론은 그 사주의 fortuneTriggers·lifeWeapons·용신에서 도출. 마지막 문장도 그 사주에서만.
      goodExample:
        '[톤·구조 예시. 문장 복사 금지. 결론 내용은 이 plan의 fortuneTriggers·lifeWeapons·용신 fact에서만.]\n\n' +
        '이 사주의 핵심 사용법을 한 단락으로 정리한다(그 사주의 무기·운을 살리는 선택 근거로).\n\n' +
        '→ 일·돈·관계에서의 사용법을 그 사주의 결로 각각 한 줄씩, 운을 막는 선택과 살리는 선택을 줄글로. 마지막 한 문장은 그 사주의 일간/신살/대운에서 나온, 저장하고 싶을 만큼 선명한 문장으로 닫는다(일반론 금지).',
      transformationRule: '결론은 요약이 아니라 그 사주의 사용법이어야 한다. 마지막 문장은 그 사주의 분석값에서 나와야 하고, 다른 사주에도 들어맞는 일반 결론 금지.',
    },
  };
}

// ============================================================
// 메인 — 7~8개 plan 빌드 (2026-05: 일/돈/관계 분리, futureFlow는 옵션)
// ============================================================
export interface BuildNarrativePlansOptions {
  /** 앞으로 3년 장 포함 여부 (기본 false — 별도 기능으로 분리 가능) */
  includeFutureFlow?: boolean;
  /**
   * 2026-05 Narrative Depth v1 — 명리 구조 깊이 (신강/신약·신살·용신·개운 방향).
   * 미지정 시 모두 false (안정화 v0 plan 그대로 — rollback 안전망).
   */
  depthOptions?: NarrativeDepthOptions;
}

export function buildNarrativePlans(
  input: PersonalSajuGptInput,
  lifeSceneHints?: LifeSceneHint[],
  options: BuildNarrativePlansOptions = {},
): NarrativePlanSet {
  const depth = options.depthOptions ?? DEFAULT_NARRATIVE_DEPTH_OPTIONS;
  const plans: NarrativePlanSet = [
    buildOpeningPlan(input, lifeSceneHints, depth),
    buildLifeStructurePlan(input, lifeSceneHints, depth),
    buildRepeatedPatternPlan(input, lifeSceneHints),
    buildCareerTalentPlan(input, lifeSceneHints),
    buildMoneyMonetizationPlan(input, lifeSceneHints),
    buildRelationshipLovePlan(input, lifeSceneHints),
  ];
  if (options.includeFutureFlow) {
    plans.push(buildFutureFlowPlan(input, lifeSceneHints));
  }
  plans.push(buildFinalStrategyPlan(input, lifeSceneHints, depth));
  return plans;
}
