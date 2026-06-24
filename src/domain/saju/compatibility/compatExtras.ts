// 궁합 부가 콘텐츠 (deterministic) — 함께하면 좋은 활동 + 관계 결 요약.
//
// 원칙:
//   - bundle(이미 계산된 결정론 분석)에서만 도출. GPT 창작·새 명리 생성 없음.
//   - "점수 중심 회귀 금지" 원칙(compatNarrativeTypes 주석) 존중 → 숫자 점수가 아니라
//     정성 레벨(낮음/보통/좋음/아주 좋음)로만 표현. fill은 막대 길이용 보조값.
//   - 함께 활동/음식/장소는 오행 룩업(LUCK 톤)으로, 관계가 더 채우면 좋은 오행 기준.

import type { CompatibilityAnalysisBundle, RelationshipType } from './compatibilityTypes';
import { type Element, ELEMENT_KO, STEM_ELEMENT } from '../rules/elements';
import type { HeavenlyStem } from '../rules/heavenlyStems';

// ============================================================
// 0) 일간(천간) 기질 — 두 사람의 기질 카드용 (표준 10천간)
// ============================================================
export const STEM_TEMPERAMENT: Record<HeavenlyStem, string> = {
  갑: '곧고 추진력 있는, 앞장서는 기질',
  을: '유연하고 끈기 있는, 부드럽게 파고드는 기질',
  병: '밝고 표현이 시원한, 분위기를 데우는 기질',
  정: '은은하고 섬세한, 깊게 몰입하는 기질',
  무: '듬직하고 품이 넓은, 중심을 잡아주는 기질',
  기: '꼼꼼하고 현실적인, 조용히 챙기는 기질',
  경: '결단력 있고 강단진, 직진하는 기질',
  신: '예리하고 단정한, 완성도를 챙기는 기질',
  임: '넓고 자유로운, 흐름을 타는 기질',
  계: '차분하고 깊은, 속으로 읽어내는 기질',
};

export interface PersonTrait {
  name: string;
  /** 예: 갑목 */
  dayMasterKo: string;
  temperament: string;
}

export function buildPersonTrait(name: string, dayMaster: string): PersonTrait {
  const stem = dayMaster as HeavenlyStem;
  const el = STEM_ELEMENT[stem];
  return {
    name,
    dayMasterKo: el ? `${dayMaster}${ELEMENT_KO[el]}` : dayMaster,
    temperament: STEM_TEMPERAMENT[stem] ?? '',
  };
}

// ============================================================
// 1) 오행별 "둘이 함께하면 좋은" 활동/음식/장소
// ============================================================
export interface ElementShared {
  activities: string[];
  foods: string[];
  places: string[];
}

export const SHARED_BY_ELEMENT: Record<Element, ElementShared> = {
  wood: {
    activities: ['숲길·등산 함께 걷기', '수목원·식물원 나들이', '같이 새 계획 세우기'],
    foods: ['제철 나물·샐러드', '비빔밥', '갓 내린 차'],
    places: ['공원', '나무 많은 산책로', '동네 책방'],
  },
  fire: {
    activities: ['함께 운동·클래스 다니기', '공연·페스티벌 가기', '캠프파이어·불멍'],
    foods: ['화로구이·바베큐', '약간 매운 음식', '따뜻한 음료'],
    places: ['햇살 좋은 카페', '공연장', '활기찬 거리'],
  },
  earth: {
    activities: ['집밥 같이 해먹기', '베이킹·도자기 클래스', '동네 한 바퀴 산책'],
    foods: ['든든한 한 그릇', '구황작물(고구마·감자)', '한정식'],
    places: ['아늑한 집', '작은 정원', '편한 동네'],
  },
  metal: {
    activities: ['전시·미술관 데이트', '같이 정리·미니멀 정돈', '드라이브'],
    foods: ['깔끔한 코스 요리', '흰살 생선', '견과·담백한 간식'],
    places: ['정돈된 갤러리', '모던한 카페', '깔끔한 공간'],
  },
  water: {
    activities: ['바다·강가 여행', '아쿠아리움 구경', '온천·스파에서 쉬기'],
    foods: ['해산물', '국물 요리', '물·차 충분히'],
    places: ['바닷가', '강변', '조용한 북카페'],
  },
};

export interface SharedActivities {
  elements: Element[];
  elementsKo: string[];
  activities: string[];
  foods: string[];
  places: string[];
  /** 근거를 녹인 한 줄 도입 */
  intro: string;
}

/** 관계가 더 채우면 좋은 오행(elementComplement) 기준으로 함께 활동을 고른다. */
export function buildSharedActivities(bundle: CompatibilityAnalysisBundle): SharedActivities | null {
  const ec = bundle.elementComplement;
  const need = Array.from(new Set([...(ec?.aNeedsFromB ?? []), ...(ec?.bNeedsFromA ?? [])]));
  const els = need.slice(0, 2);
  if (els.length === 0) return null;

  const pick = (key: keyof ElementShared, cap: number) =>
    Array.from(new Set(els.flatMap((e) => SHARED_BY_ELEMENT[e][key]))).slice(0, cap);

  const elementsKo = els.map((e) => ELEMENT_KO[e]);
  const intro =
    `두 사람 사이엔 ${elementsKo.join('·')} 기운을 함께 쌓을 때 균형이 잘 잡혀요. ` +
    `서로에게 부족하기 쉬운 결이라, 같이 이런 걸 즐기면 관계에 생기가 돌아요.`;

  return {
    elements: els,
    elementsKo,
    activities: pick('activities', 4),
    foods: pick('foods', 3),
    places: pick('places', 3),
    intro,
  };
}

// ============================================================
// 2) 관계 결 요약 (정성 레벨 — 숫자 점수 아님)
// ============================================================
export type RelationLevel = '낮음' | '보통' | '좋음' | '아주 좋음';

export interface RelationGauge {
  key: 'chemistry' | 'stability' | 'recovery' | 'growth';
  label: string;
  level: RelationLevel;
  /** 막대 길이용(0~100) — 표시용 보조, 사용자에겐 숫자 노출 안 함 */
  fill: number;
  note: string;
}

function levelOf(fill: number): RelationLevel {
  if (fill >= 85) return '아주 좋음';
  if (fill >= 70) return '좋음';
  if (fill >= 55) return '보통';
  return '낮음';
}
const clamp = (n: number) => Math.max(40, Math.min(95, Math.round(n)));

export function buildRelationGauges(bundle: CompatibilityAnalysisBundle): RelationGauge[] {
  // 끌림 — initialChemistry enum 기반
  const chemMap: Record<string, number> = { strong: 90, soft: 80, practical: 74, 'slow-burn': 64, unstable: 56 };
  const chemistry = clamp(chemMap[bundle.attractionAnalysis?.initialChemistry ?? 'soft'] ?? 72);

  // 안정 — 합(combinations)은 +, 충/형/파/해는 −
  const cc = bundle.combinationConflicts;
  const combos = cc?.combinations?.length ?? 0;
  const frictions =
    (cc?.conflicts?.length ?? 0) + (cc?.punishments?.length ?? 0) +
    (cc?.destructions?.length ?? 0) + (cc?.harms?.length ?? 0);
  const stability = clamp(70 + combos * 6 - frictions * 5);

  // 회복 — 최선의 화해룰이 잡히면 +, 회복 스타일 엇갈림/충돌 많으면 −
  const hasRule = !!bundle.recoveryAnalysis?.bestRecoveryRule?.trim();
  const recovery = clamp(72 + (hasRule ? 8 : 0) - frictions * 3);

  // 성장 — 오행 보완 강도
  const growthMap: Record<string, number> = { strong: 90, moderate: 74, weak: 58, 'one-sided': 52 };
  const growth = clamp(growthMap[bundle.elementComplement?.mutualComplement ?? 'moderate'] ?? 70);

  const mk = (key: RelationGauge['key'], label: string, fill: number, note: string): RelationGauge => ({
    key, label, level: levelOf(fill), fill, note,
  });

  return [
    mk('chemistry', '끌림', chemistry, '처음 서로에게 끌리는 힘'),
    mk('stability', '안정', stability, '일상에서 편안하게 맞물리는 정도'),
    mk('recovery', '회복', recovery, '부딪힌 뒤 다시 가까워지는 힘'),
    mk('growth', '성장', growth, '서로의 부족한 결을 채워주는 정도'),
  ];
}

// ============================================================
// 3) 관계 유형별 보너스 섹션 (deterministic, bundle 평문 기반)
//    married(자녀운)은 별도 deriver에서 — 여기선 null.
//    body는 ## 헤더 + 문단 마크다운. 본문 A/B는 UI에서 이름 치환.
// ============================================================
export interface BonusSection {
  eyebrow: string;
  title: string;
  body: string;
}

const j = (a: (string | undefined)[]) => a.filter(Boolean).join(' ');

export function buildBonusSection(
  bundle: CompatibilityAnalysisBundle,
  relationshipType: RelationshipType,
): BonusSection | null {
  const at = bundle.attractionAnalysis;
  const cf = bundle.conflictAnalysis;
  const rc = bundle.recoveryAnalysis;
  const st = bundle.stabilityAnalysis;
  const ec = bundle.elementComplement;
  const tg = bundle.tenGodInteraction;
  const trig = (cf?.mainConflictTriggers ?? []).slice(0, 3);
  const press = (tg?.pressurePoints ?? []).slice(0, 2);
  const need = Array.from(new Set([...(ec?.aNeedsFromB ?? []), ...(ec?.bNeedsFromA ?? [])]))
    .map((e) => ELEMENT_KO[e]).filter(Boolean).join('·');

  switch (relationshipType) {
    case 'dating': {
      const lines = [
        '## 결혼까지 가면 잘 맞을까',
        j([st?.relationshipTypeSpecificStability || st?.dailyCompatibility,
          need && `오래 볼수록 ${need} 기운을 서로 채워주는 결이라, 같이 살아갈수록 균형이 잡히는 사이예요.`]),
        '',
        '## 결혼 전 넘어야 할 산',
        j([st?.longTermRisk, cf?.repeatedPattern]),
        rc?.bestRecoveryRule ? `\n결혼을 진지하게 본다면, ${rc.bestRecoveryRule}` : '',
      ];
      return { eyebrow: '연애 → 결혼', title: '결혼하면 어떨까', body: lines.join('\n').trim() };
    }
    case 'crush_or_something': {
      const pace = at?.initialChemistry === 'strong'
        ? '눈치싸움 길게 끌지 마요. 이 조합은 직진이 의외로 잘 먹혀요.'
        : at?.initialChemistry === 'slow-burn'
          ? '들이대면 도망가는 결이에요. 자주, 가볍게, 천천히 — 그게 정답이에요.'
          : '한 번에 훅 들어가기보다, 공통 관심사로 자연스럽게 거리부터 좁히는 게 유리해요.';
      const lines = [
        '## 솔직히, 이렇게 다가가야 먹혀요',
        j([at?.whyTheyNoticeEachOther, (at?.mainAttraction ?? []).slice(0, 2).join(' ')]),
        pace,
        '',
        '## 네가 자꾸 식게 만드는 포인트 (팩폭)',
        '냉정하게 말하면, 이런 행동이 다 된 분위기를 깨요 —',
        ...(trig.length ? trig.map((t) => `- ${t}`) : press.map((t) => `- ${t}`)),
        cf?.emotionalMismatch ? `\n특히 ${cf.emotionalMismatch} 이 지점은, 상대가 말 안 해도 속으로 식고 있을 수 있어요.` : '',
      ];
      return { eyebrow: '짝사랑·썸', title: '다가가는 법 & 내가 망치는 포인트', body: lines.join('\n').trim() };
    }
    case 'friendship': {
      const lines = [
        '## 이 우정이 오래가려면',
        j([st?.dailyCompatibility, rc?.bestRecoveryRule && `틀어져도 ${rc.bestRecoveryRule}`]),
        '',
        '## 이 친구가 네 인생에 주는 것',
        j([(at?.mainAttraction ?? []).slice(0, 2).join(' '),
          need && `네게 부족하기 쉬운 ${need} 기운을 옆에서 채워주는 친구예요.`]),
        '',
        '## 살짝 배려하면 더 편해지는 점',
        j(['비난이 아니라 결의 차이일 뿐이에요.', cf?.emotionalMismatch, '이 부분만 서로 살피면 훨씬 오래가요.']),
      ];
      return { eyebrow: '친구', title: '이 우정의 결', body: lines.join('\n').trim() };
    }
    case 'coworker': {
      const lines = [
        '## 이해관계(돈·평가)에서 조심할 결',
        j([st?.longTermRisk, trig.length ? trig.map((t) => t).join(', ') + ' 같은 지점에서 특히 어긋나기 쉬워요.' : cf?.repeatedPattern]),
        '',
        '## 이 동료를 내 편으로 만드는 법',
        j([(tg?.attractionPoints ?? []).slice(0, 2).join(' '),
          rc?.whatBUsuallyNeeds && `이 사람은 ${rc.whatBUsuallyNeeds} 그 결을 채워줄 때 마음을 열어요.`,
          need && `${need} 쪽으로 도움을 주고받으면 신뢰가 빨리 쌓여요.`]),
      ];
      return { eyebrow: '동료', title: '협업 & 내 편 만들기', body: lines.join('\n').trim() };
    }
    case 'reunion_or_breakup': {
      const lines = [
        '## 다시 만나면 달라질까',
        j([cf?.repeatedPattern && `예전에 부딪히던 결(${cf.repeatedPattern})은 그냥 두면 다시 나올 여지가 있어요.`,
          '다만 정해진 결말은 없어요 — 무엇을 바꾸느냐에 달려 있어요.']),
        '',
        '## 다시 가까워지고 싶다면',
        j([rc?.bestRecoveryRule && `핵심은 ${rc.bestRecoveryRule}`,
          rc?.whatAUsuallyNeeds && `한 사람은 ${rc.whatAUsuallyNeeds}`,
          rc?.whatBUsuallyNeeds && `다른 한 사람은 ${rc.whatBUsuallyNeeds} — 이걸 먼저 헤아려주면 문이 열려요.`]),
      ];
      return { eyebrow: '재회·이별', title: '다시 만난다면', body: lines.join('\n').trim() };
    }
    default:
      return null; // married → 자녀운(별도 deriver)
  }
}
