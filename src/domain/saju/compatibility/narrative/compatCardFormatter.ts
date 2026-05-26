// 궁합 narrative V4 — 카드 포매터 (deterministic, 순수 함수)
//
// 두 가지 결정적 카드 결함을 교정한다 (LLM 호출/network 없음, 사주값 hardcode 없음):
//   1) compatibilityCard.keywords 에 archetype의 "사실 문장"(예:
//      "상대가 내 결핍 또는 욕구를 본능적으로 건드리는 끌림")이 칩으로 새는 문제
//      → normalizeCompatibilityKeywords: 길이/문장끝/raw-fact 마커 기준으로 거르고,
//        compactRelationshipKeyword로 짧은 명사구를 시도, 3~5개로 정규화.
//   2) 3년 흐름(futureFlow)에서 연속 연도가 동일 theme/opportunity/caution을 갖는 문제
//      → normalizeCompatFutureFlow: 중복/근접중복일 때 index별 역할 + 관계유형 톤으로
//        deterministic하게 변주. 새 세운/명리 데이터 생성 X, 단정 예측 X.
//
// 정책: 기존 궁합 계산(compatibilityAnalyzer/archetype/layers/interaction/compatibilityTypes) 수정 금지 — import만.

import type { RelationshipYearFlow } from '../compatibilityTypes';
import type { CompatNarrativeContext } from './compatNarrativeTypes';

// ============================================================
// 키워드 정규화
// ============================================================

/** 칩으로 부적합한 길이 상한 (한글 기준 짧은 명사구). */
const MAX_KEYWORD_LEN = 12;
/** compact 시도 후 허용 상한 (head noun-phrase). */
const MAX_COMPACT_LEN = 10;

/** raw-fact 문장임을 드러내는 마커 — 포함되면 칩으로 부적합. */
const RAW_FACT_MARKERS = ['상대가', '본능적으로', '결핍', '욕구', '또는'];

/** 문장 종결형 어미 (끝에 오면 칩이 아니라 문장). */
const SENTENCE_ENDINGS = ['습니다', '습니까', '니다', '는다', '지만', '다', '요'];

/** 부족분 보충용 일반 관계 칩 풀 (사주값 아님, 일반론 칩). */
const GENERIC_CHIP_POOL = [
  '본능적 끌림',
  '속도 차이',
  '거리감',
  '감정 온도차',
  '관계 기준',
  '익숙한 낯섦',
  '묘한 긴장감',
  '닮아서 부딪힘',
];

/** 끝에 붙은 흔한 조사/연결어미를 떼어 head 명사구만 남긴다. */
function stripTrailingJosa(s: string): string {
  // 긴 어미부터 시도 (는/은 보다 하는/되는 우선)
  const tails = [
    '하는 끌림', '되는 끌림', '하는', '되는', '시키는', '만드는', '건드리는',
    '으로', '로', '에서', '에게', '에', '과', '와', '을', '를', '이', '가', '은', '는', '의',
  ];
  let out = s.trim();
  for (const t of tails) {
    if (out.endsWith(t) && out.length - t.length >= 2) {
      out = out.slice(0, out.length - t.length).trim();
      break;
    }
  }
  return out;
}

function endsWithSentenceEnding(s: string): boolean {
  const t = s.trim();
  return SENTENCE_ENDINGS.some(e => t.endsWith(e));
}

function hasRawFactMarker(s: string): boolean {
  return RAW_FACT_MARKERS.some(m => s.includes(m));
}

/**
 * 긴/문장형 키워드에서 짧은 head 명사구(≤ MAX_COMPACT_LEN)를 추출 시도.
 * - 공백 포함 시 마지막 토큰(핵심 명사) 우선 시도 → 그래도 길면 조사 제거.
 * - 추출 실패(여전히 길거나 문장형) 시 원본 trim 반환 (호출부에서 최종 reject 판단).
 */
export function compactRelationshipKeyword(kw: string): string {
  let s = (kw ?? '').trim();
  if (s.length === 0) return s;

  // 조사/연결어미 제거 (예: "...본능적으로 건드리는 끌림" → 마지막 토큰 "끌림")
  // 공백이 있으면 마지막 명사 토큰을 우선 후보로.
  if (s.includes(' ')) {
    const tokens = s.split(/\s+/).filter(Boolean);
    const last = stripTrailingJosa(tokens[tokens.length - 1]);
    if (last.length >= 2 && last.length <= MAX_COMPACT_LEN && !endsWithSentenceEnding(last)) {
      return last;
    }
  }

  // 단일 토큰이거나 마지막 토큰 추출 실패 → 조사 제거만 시도
  const stripped = stripTrailingJosa(s);
  return stripped.length > 0 ? stripped : s;
}

/** 칩으로 적합한지 (정규화 이후 최종 검사). */
function isValidChip(s: string): boolean {
  const t = s.trim();
  if (t.length === 0) return false;
  if (t.length > MAX_KEYWORD_LEN) return false;
  if (endsWithSentenceEnding(t)) return false;
  if (hasRawFactMarker(t)) return false;
  return true;
}

/**
 * archetype 키워드 배열을 카드 칩용으로 정규화.
 * - 각 키워드: trim → (길거나 문장형/raw-fact면) compact 시도 → 최종 reject 판단.
 * - dedupe, 3~5개 유지. <3 이면 focus.primaryConcerns(compact) + generic 풀로 보충. 5 초과 금지.
 */
export function normalizeCompatibilityKeywords(
  keywords: string[],
  focus?: { primaryConcerns: string[] },
): string[] {
  const out: string[] = [];
  const seen = new Set<string>();

  const tryAdd = (raw: string): void => {
    if (out.length >= 5) return;
    const trimmed = (raw ?? '').trim();
    if (trimmed.length === 0) return;

    let candidate = trimmed;
    // 이미 칩으로 적합하면 그대로 사용 (예: "피로 누적" — 짧은 명사구는 compact 안 함).
    // 부적합(길거나 문장형/raw-fact)일 때만 compact 시도.
    if (!isValidChip(trimmed)) {
      candidate = compactRelationshipKeyword(trimmed);
    }
    if (!isValidChip(candidate)) return;
    if (seen.has(candidate)) return;
    seen.add(candidate);
    out.push(candidate);
  };

  for (const kw of Array.isArray(keywords) ? keywords : []) {
    tryAdd(kw);
  }

  // 부족분 보충: focus.primaryConcerns → generic 풀
  if (out.length < 3 && focus?.primaryConcerns) {
    for (const c of focus.primaryConcerns) {
      if (out.length >= 5) break;
      tryAdd(c);
      if (out.length >= 3) break;
    }
  }
  if (out.length < 3) {
    for (const g of GENERIC_CHIP_POOL) {
      if (out.length >= 5) break;
      if (!seen.has(g)) {
        seen.add(g);
        out.push(g);
      }
      if (out.length >= 3) break;
    }
  }

  return out.slice(0, 5);
}

// ============================================================
// 3년 흐름 정규화 (중복 연도 변주)
// ============================================================

/** index별 역할 라벨 (0/1/2). */
const YEAR_ROLE_THEMES = [
  '관계 패턴을 확인하는 해',
  '역할과 거리감을 조정하는 해',
  '관계의 방향을 정리하는 해',
];

/** 관계유형별 톤 (theme 뒤에 덧붙일 짧은 관점 + opportunity/caution 변주 소스). */
const TYPE_TONE: Record<string, { tone: string[]; opp: string[]; caution: string[] }> = {
  dating: {
    tone: ['관계 안정', '표현 방식', '생활 리듬'],
    opp: ['감정을 솔직하게 맞춰볼 시기', '표현 방식을 다듬어볼 시기', '생활 리듬을 맞춰갈 시기'],
    caution: ['속도 차이로 어긋날 수 있음', '표현 방식 차이를 방치하기 쉬움', '익숙함에 기대 소홀해질 수 있음'],
  },
  married: {
    tone: ['생활 구조', '역할 분담', '책임 조율'],
    opp: ['생활 구조를 함께 점검할 시기', '역할 분담을 조정할 시기', '장기 방향을 합의할 시기'],
    caution: ['생활 리듬 차이가 쌓일 수 있음', '역할 부담이 한쪽에 쏠릴 수 있음', '갈등을 미루기 쉬움'],
  },
  friendship: {
    tone: ['편한 거리', '기대치 조절', '서운함 관리'],
    opp: ['편한 거리를 다시 맞춰볼 시기', '기대치를 조정할 시기', '관계 결을 정리할 시기'],
    caution: ['거리감 차이로 서운할 수 있음', '기대 차이를 방치하기 쉬움', '연락 빈도로 어긋날 수 있음'],
  },
  coworker: {
    tone: ['업무 속도', '역할 분담', '의사결정'],
    opp: ['업무 호흡을 맞춰볼 시기', '역할 분담을 정리할 시기', '협업 방향을 합의할 시기'],
    caution: ['속도 차이로 충돌할 수 있음', '책임 경계가 흐려질 수 있음', '의사결정이 미뤄질 수 있음'],
  },
  reunion_or_breakup: {
    tone: ['반복 문제 확인', '재회 조건', '정리 기준'],
    opp: ['반복되던 문제를 확인할 시기', '재회 조건을 점검할 시기', '관계 방향을 정리할 시기'],
    caution: ['같은 갈등이 되풀이될 수 있음', '감정과 현실을 혼동하기 쉬움', '결정을 미루기 쉬움'],
  },
  crush_or_something: {
    tone: ['접근 속도', '신호 해석', '관계명 정리'],
    opp: ['접근 속도를 맞춰볼 시기', '신호를 차분히 읽어볼 시기', '관계의 결을 정리할 시기'],
    caution: ['신호를 오해하기 쉬움', '서두르면 부담될 수 있음', '확신을 강요하기 쉬움'],
  },
};

const DEFAULT_TONE = TYPE_TONE.dating;

/** 두 흐름 항목이 동일/근접중복인지 (theme/opportunity/caution 기준). */
function isNearDuplicate(a: RelationshipYearFlow, b: RelationshipYearFlow): boolean {
  const norm = (s: string) => (s ?? '').trim();
  return (
    norm(a.theme) === norm(b.theme) &&
    norm(a.opportunity) === norm(b.opportunity) &&
    norm(a.caution) === norm(b.caution)
  );
}

/**
 * 3년 흐름에서 연속 중복 연도를 deterministic하게 변주.
 * - 이미 모두 distinct면 그대로 반환 (year/원본 보존).
 * - 중복 존재 시: 전 항목을 index별 역할 + 관계유형 톤 템플릿으로 재도출.
 *   year는 원본 유지, 단정 예측/점수 없음, 카드용 짧은 문장.
 */
export function normalizeCompatFutureFlow(
  flow: RelationshipYearFlow[],
  ctx: CompatNarrativeContext,
): RelationshipYearFlow[] {
  const src = Array.isArray(flow) ? flow : [];
  if (src.length === 0) return [];

  // 연속 중복 존재 여부 확인
  let hasDup = false;
  for (let i = 1; i < src.length; i++) {
    if (isNearDuplicate(src[i], src[i - 1])) {
      hasDup = true;
      break;
    }
  }
  if (!hasDup) return src;

  const tone = TYPE_TONE[ctx?.relationshipType] ?? DEFAULT_TONE;

  return src.map((y, i) => {
    const roleIdx = i % YEAR_ROLE_THEMES.length;
    const role = YEAR_ROLE_THEMES[roleIdx];
    const toneWord = tone.tone[roleIdx % tone.tone.length];
    return {
      ...y,
      theme: `${role} (${toneWord})`,
      opportunity: tone.opp[roleIdx % tone.opp.length],
      caution: tone.caution[roleIdx % tone.caution.length],
    };
  });
}
