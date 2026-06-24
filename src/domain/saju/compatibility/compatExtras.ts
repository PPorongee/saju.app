// 궁합 부가 콘텐츠 (deterministic) — 함께하면 좋은 활동 + 관계 결 요약.
//
// 원칙:
//   - bundle(이미 계산된 결정론 분석)에서만 도출. GPT 창작·새 명리 생성 없음.
//   - "점수 중심 회귀 금지" 원칙(compatNarrativeTypes 주석) 존중 → 숫자 점수가 아니라
//     정성 레벨(낮음/보통/좋음/아주 좋음)로만 표현. fill은 막대 길이용 보조값.
//   - 함께 활동/음식/장소는 오행 룩업(LUCK 톤)으로, 관계가 더 채우면 좋은 오행 기준.

import type { CompatibilityAnalysisBundle, RelationshipType } from './compatibilityTypes';
import { type Element, ELEMENTS, ELEMENT_KO, STEM_ELEMENT, PRODUCES, RESTRAINS } from '../rules/elements';
import type { HeavenlyStem } from '../rules/heavenlyStems';
import type { PersonalSajuGptInput, TenGod } from '../report/sajuReportSchema';
import { TEN_GOD_CATEGORY } from '../rules/tenGods';

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
      return null; // married → 자녀운(buildChildrenFortune)
  }
}

// ============================================================
// 4) 결혼 자녀운 (신규 명리 deriver) — 두 사람 원국 기반.
//    자녀성: 남=관성, 여=식상(미상=식상). 자녀궁=시주. 강화 역학·나이(노산 포함)·터울·양육·기질.
//    안전: 자녀 수/성별/임신 단정 금지, 노산은 사실+전문의 상담 권장(공포 X).
// ============================================================
type Cat = 'self' | 'output' | 'wealth' | 'authority' | 'support';

const CHILD_TEMPERAMENT: Record<Element, string> = {
  wood: '호기심 많고 쑥쑥 자라며 새로운 걸 좋아하는 결',
  fire: '밝고 활발하고 표현이 풍부한 결',
  earth: '듬직하고 마음이 넓어 안정적인 결',
  metal: '야무지고 단단해 자기 기준이 분명한 결',
  water: '영리하고 섬세하며 속이 깊은 결',
};
const PARENT_ROLE: Record<Cat, string> = {
  output: '잘 놀아주고 감정을 읽어주는 — 정서와 표현을 채우는 역할',
  authority: '생활습관과 울타리를 잡아주는 — 규율과 틀의 역할',
  support: '가르치고 보듬는 — 교육과 정서적 안정의 역할',
  wealth: '현실적으로 뒷받침하는 — 경제와 살림의 역할',
  self: '친구처럼 함께 부대끼며 크는 — 같이 크는 역할',
};

function groupTotal(totals: Record<TenGod, number>, cat: Cat): number {
  return (Object.keys(totals) as TenGod[]).reduce((s, g) => (TEN_GOD_CATEGORY[g] === cat ? s + (totals[g] ?? 0) : s), 0);
}
function childStarCat(gender?: string): Cat {
  return gender === 'male' ? 'authority' : 'output'; // female/unknown → 식상
}
function childStarElement(dayMaster: string, cat: Cat): Element | undefined {
  const myEl = STEM_ELEMENT[dayMaster as HeavenlyStem];
  if (!myEl) return undefined;
  if (cat === 'output') return PRODUCES[myEl];
  return (Object.keys(RESTRAINS) as Element[]).find((el) => RESTRAINS[el] === myEl); // 관성: 나를 극하는 오행
}
function starLabel(total: number): string {
  return total >= 3 ? '자녀 기운이 든든한 편' : total >= 1.3 ? '자녀 기운이 보통' : '자녀 자리가 약한 편';
}

export function buildChildrenFortune(
  a: PersonalSajuGptInput,
  b: PersonalSajuGptInput,
  genderA: string | undefined,
  genderB: string | undefined,
  bundle: CompatibilityAnalysisBundle,
): BonusSection {
  const aCat = childStarCat(genderA);
  const bCat = childStarCat(genderB);
  const aEl = childStarElement(a.birthChart.dayMaster, aCat);
  const bEl = childStarElement(b.birthChart.dayMaster, bCat);
  const aTotal = groupTotal(a.coreAnalysis.tenGods.totals, aCat);
  const bTotal = groupTotal(b.coreAnalysis.tenGods.totals, bCat);
  const bStrong = b.coreAnalysis.elementStrength.strongest ?? [];
  const aStrong = a.coreAnalysis.elementStrength.strongest ?? [];

  // 강화 역학: 약한 쪽을 상대가 받쳐주는가
  const reinforce: string[] = [];
  if (aTotal < 1.3 && aEl && bStrong.includes(aEl)) {
    reinforce.push(`A는 자녀 자리가 약한 편인데, B의 단단한 ${ELEMENT_KO[aEl]} 기운이 이를 받쳐줘서 만나서 보완되는 결이에요.`);
  }
  if (bTotal < 1.3 && bEl && aStrong.includes(bEl)) {
    reinforce.push(`B는 자녀 자리가 약한 편인데, A의 ${ELEMENT_KO[bEl]} 기운이 그 부분을 채워줘요.`);
  }

  // 나이 / 노산
  const ageA = a.userContext?.age ?? 0;
  const ageB = b.userContext?.age ?? 0;
  const femaleAges = [genderA === 'female' ? ageA : null, genderB === 'female' ? ageB : null].filter((x): x is number => x != null);
  const femaleAge = femaleAges.length ? Math.min(...femaleAges) : undefined;
  let timing: string;
  if (femaleAge !== undefined && femaleAge >= 40) {
    timing = `여성 나이 기준 만 40세를 넘기면 의학적으로는 노산 구간이에요. 사주의 자녀 기운과는 별개로, 몸의 준비와 전문의 상담을 가장 앞에 두는 게 좋아요. 계획이 있다면 미루지 않는 편이 현실적으로 수월합니다.`;
  } else if (femaleAge !== undefined && femaleAge >= 36) {
    timing = `여성 나이로 보면 시기적으로 너무 미루지 않는 편이 수월한 구간이에요. 준비가 됐다면 흐름을 타 두는 걸 권해요.`;
  } else {
    timing = `나이 면에서는 조급할 필요는 없어요. 두 사람의 자리가 안정될 때 자연스럽게 흐름을 보면 좋아요.`;
  }

  // 터울
  const tul = (aTotal + bTotal) >= 4
    ? '자녀 기운이 받쳐주는 편이라, 원한다면 터울을 촘촘히 둬도 무리가 적어요.'
    : (femaleAge !== undefined && femaleAge >= 38)
      ? '시기상 한 명에게 집중하거나, 터울을 너무 길게 끌지 않는 편이 현실적이에요.'
      : '터울은 넉넉히 두고 한 명씩 충분히 품는 쪽이 두 사람 리듬에 더 맞아요.';

  // 아이 기질 — 두 사람 합산 강한 오행
  const sumScore: Record<Element, number> = { wood: 0, fire: 0, earth: 0, metal: 0, water: 0 };
  for (const el of ELEMENTS) {
    sumScore[el] = (a.coreAnalysis.elementStrength.scores?.[el] ?? 0) + (b.coreAnalysis.elementStrength.scores?.[el] ?? 0);
  }
  const childEl = ELEMENTS.reduce((m, el) => (sumScore[el] > sumScore[m] ? el : m), ELEMENTS[0]);

  // 양육 분담
  const aRole = PARENT_ROLE[(TEN_GOD_CATEGORY[a.coreAnalysis.tenGods.strongest?.[0]] as Cat) ?? 'support'];
  const bRole = PARENT_ROLE[(TEN_GOD_CATEGORY[b.coreAnalysis.tenGods.strongest?.[0]] as Cat) ?? 'support'];

  const hourNote = (!a.birthChart.hour || !b.birthChart.hour)
    ? ' (출생시간을 모르면 자녀궁 해석은 큰 결만 봐요.)'
    : '';

  const lines = [
    '## 아이를 가지면 좋은 시기',
    timing,
    '',
    '## 두 사람의 자녀 기운',
    `A는 ${starLabel(aTotal)}, B는 ${starLabel(bTotal)}이에요.${hourNote}`,
    ...(reinforce.length ? ['', ...reinforce] : ['', '서로의 자녀 기운이 무난하게 맞물려, 한쪽으로 치우치지 않는 결이에요.']),
    '',
    '## 아이 기질은 이런 결이에요',
    `두 사람의 기운을 합쳐 보면, 아이는 ${CHILD_TEMPERAMENT[childEl]}로 자랄 가능성이 커요. (정해진 게 아니라 경향이에요.)`,
    '',
    '## 양육은 이렇게 나누면 잘 맞아요',
    `A는 ${aRole}, B는 ${bRole}이에요. 서로 다른 결이라 한 명에게 몰리지 않게 나누면 편해요.`,
    '',
    '## 터울은',
    tul,
    '',
    '## 아이가 생기면 두 사람은',
    j([
      bundle.stabilityAnalysis?.dailyCompatibility,
      '아이를 중심으로 생활 리듬이 다시 맞춰지면서, 둘만의 시간은 줄지만 같은 곳을 보는 힘은 커지는 결이에요.',
    ]),
    '',
    '사주는 아이의 수나 성별을 정하는 게 아니라, 두 사람이 부모로서 어떤 결인지를 보는 거예요.',
  ];
  return { eyebrow: '결혼 · 자녀운', title: '두 사람의 자녀운', body: lines.join('\n').trim() };
}

// ============================================================
// 5) 애착·관계 스타일 (십성 기반) — 두 사람 각각 + 만남의 결.
//    가장 강한 십성의 카테고리(Cat)로 애착 결을 도출. 연애형 관계면 "연애 결",
//    그 외(친구·동료)면 "관계 결"로 라벨만 바꿈. fatalism/단정 없음.
// ============================================================
interface AttachmentStyle {
  /** 예: 자립형 */
  label: string;
  /** 사람을 설명하는 결 */
  desc: string;
  /** 가까운 사이에서 드러나는 결 */
  inRelation: string;
  /** 이 사람에게 채워주면 좋은 것 */
  needs: string;
}
const ATTACHMENT_BY_CAT: Record<Cat, AttachmentStyle> = {
  self: {
    label: '자립형',
    desc: '혼자서도 단단하고 자기 페이스가 분명한',
    inRelation: '가까워져도 자기 공간이 필요해서, 너무 밀착하면 부담스러워해요',
    needs: '믿고 기다려주는 여백',
  },
  output: {
    label: '표현형',
    desc: '마음을 솔직하게 드러내는',
    inRelation: '좋으면 티가 나고, 반응이 없으면 서운함을 금세 느껴요',
    needs: '표현에 표현으로 답해주는 반응',
  },
  wealth: {
    label: '헌신형',
    desc: '챙겨주고 함께 누리는 걸 좋아하는',
    inRelation: '뭔가 해주면서 마음을 표현하는 편이에요',
    needs: '그 마음을 당연하게 여기지 않고 알아주는 인정',
  },
  authority: {
    label: '책임형',
    desc: '진중하고 한번 맺으면 끝까지 가는',
    inRelation: '신뢰와 약속을 중요하게 여기고, 가벼운 태도를 싫어해요',
    needs: '일관되고 예측 가능한 태도',
  },
  support: {
    label: '안정추구형',
    desc: '보살핌과 정서적 안정 속에서 편안해지는',
    inRelation: '따뜻하게 받아주면 마음을 활짝 열고, 차가우면 깊이 위축돼요',
    needs: '다정하고 안정적인 보살핌',
  },
};

function catOf(input: PersonalSajuGptInput): Cat {
  const strongest = input.coreAnalysis.tenGods.strongest?.[0];
  return (TEN_GOD_CATEGORY[strongest] as Cat) ?? 'support';
}

const ROMANTIC_TYPES: RelationshipType[] = ['dating', 'married', 'crush_or_something', 'reunion_or_breakup'];

export function buildAttachmentStyles(
  a: PersonalSajuGptInput,
  b: PersonalSajuGptInput,
  relationshipType: RelationshipType,
): BonusSection {
  const aCat = catOf(a);
  const bCat = catOf(b);
  const A = ATTACHMENT_BY_CAT[aCat];
  const B = ATTACHMENT_BY_CAT[bCat];
  const romantic = ROMANTIC_TYPES.includes(relationshipType);
  const ctx = romantic ? '연애 결' : '관계 결';

  const meet = aCat === bCat
    ? `둘 다 ${A.label}이라 서로를 깊이 이해해요. 다만 같은 결이라, 둘 다 ${A.needs}을 바라다 보면 누구 하나 먼저 내어주기 어려울 수 있어요. 번갈아 맞춰주기로 정해두면 한결 편해져요.`
    : `${A.label}과 ${B.label}이 만난 결이에요. A에겐 ${A.needs}을, B에겐 ${B.needs}을 — 서로 원하는 지점이 다르다는 걸 알면 어긋남이 확 줄어요.`;

  const lines = [
    `## A의 ${ctx}`,
    `A는 ${A.label}이에요. ${A.desc} 사람이라, ${A.inRelation}.`,
    '',
    `## B의 ${ctx}`,
    `B는 ${B.label}이에요. ${B.desc} 사람이라, ${B.inRelation}.`,
    '',
    '## 둘이 만나면',
    meet,
  ];
  return {
    eyebrow: '애착·관계 스타일',
    title: romantic ? '두 사람의 연애 결' : '두 사람의 관계 결',
    body: lines.join('\n').trim(),
  };
}

// ============================================================
// 6) 돈·생활 합 (재성 기반) — 두 사람의 재성 강약 + 합쳐졌을 때의 결.
// ============================================================
function wealthDesc(total: number): string {
  return total >= 3
    ? '재물 감각이 또렷하고 현실을 단단히 챙기는'
    : total >= 1.3
      ? '돈과 마음의 균형을 잡는'
      : '돈보다 의미와 마음을 앞에 두는';
}

export function buildMoneyLifeFit(
  a: PersonalSajuGptInput,
  b: PersonalSajuGptInput,
  bundle: CompatibilityAnalysisBundle,
): BonusSection {
  const aw = groupTotal(a.coreAnalysis.tenGods.totals, 'wealth');
  const bw = groupTotal(b.coreAnalysis.tenGods.totals, 'wealth');
  const strong = (t: number) => t >= 3;
  const weak = (t: number) => t < 1.3;

  let fit: string;
  if (strong(aw) && strong(bw)) {
    fit = '둘 다 현실 감각이 좋아 모으는 힘은 강해요. 다만 씀씀이 주도권을 놓고 부딪히기 쉬우니, 큰 지출은 같이 정하기로 미리 약속해두면 잡음이 줄어요.';
  } else if (weak(aw) && weak(bw)) {
    fit = '둘 다 돈보다 마음·경험을 앞에 둬서 함께 있으면 따뜻하지만, 현실적인 관리에선 빈틈이 생기기 쉬워요. 한 명이 살림·예산 담당을 맡아두면 한결 편해져요.';
  } else {
    fit = '한 사람은 관리하고 한 사람은 누리는 쪽이라, 역할을 나누면 의외로 잘 굴러가요. 관리하는 쪽이 답답해하지 않게, 누리는 쪽도 큰 그림은 같이 챙겨주세요.';
  }

  const lines = [
    '## 돈을 대하는 결',
    `A는 ${wealthDesc(aw)} 편, B는 ${wealthDesc(bw)} 편이에요.`,
    '',
    '## 둘이 살림·돈을 합치면',
    fit,
    '',
    '## 생활 리듬은',
    j([
      bundle.stabilityAnalysis?.dailyCompatibility,
      '돈 이야기를 미루지 않고 가볍게 자주 나누는 습관 하나가, 이 부분에선 제일 큰 안전장치예요.',
    ]),
  ];
  return { eyebrow: '돈·생활 합', title: '돈과 살림의 결', body: lines.join('\n').trim() };
}

// ============================================================
// 7) 관계의 다음 단계 (type-adaptive) — "트랜지션" 관점.
//    유형별 보너스(bonus)가 '지금의 깊은 분석'이라면, 여기선 '한 단계 앞'을 본다.
//    단정/운명론 없음("정해진 답 없음"을 명시). bundle 평문만 사용.
// ============================================================
/** 선택지/키워드 텍스트의 앞쪽 [태그] 제거. */
function cleanTag(s?: string): string {
  return (s ?? '').replace(/^\s*\[[^\]]*\]\s*/, '').trim();
}

// 엔진이 계산한 구체 선택지(relationshipChoices)·강점(relationshipStrengths)을
// '다음 단계' 플레이북으로. 보너스/본문에서 쓰지 않는 소스라 중복 없이 카드를 두껍게 만든다.
// 초기 단계(썸 등)에 덜 맞는 '싸움·회복' 테마는 뒤로 미뤄 관련도를 높인다.
function nextStepPlaybook(bundle: CompatibilityAnalysisBundle): string[] {
  const choices = bundle.relationshipChoices;
  const out: string[] = [];
  const isRecovery = (s: string) => /싸운|싸움|회복|화해/.test(s);

  const dosAll = Array.from(new Set(
    (choices?.helpfulChoices ?? []).map((c) => cleanTag(c.practicalAction || c.title)).filter(Boolean),
  ));
  const dos = [...dosAll.filter((d) => !isRecovery(d)), ...dosAll.filter((d) => isRecovery(d))].slice(0, 2);
  if (dos.length) out.push('## 이렇게 해보면 더 단단해져요', ...dos.map((d) => `- ${d}`));

  const harms = (choices?.harmfulChoices ?? []).filter((h) => cleanTag(h.title));
  const harm = harms.find((h) => !isRecovery(h.title)) ?? harms[0];
  if (harm) {
    const t = cleanTag(harm.title);
    const fix = cleanTag(harm.correction);
    out.push('', '## 이건 오히려 멀어지게 해요', fix ? `- ${t} → 대신 ${fix}` : `- ${t}`);
  }

  const stItem = (bundle.relationshipStrengths ?? [])[0];
  if (stItem?.lifeScene) {
    out.push('', '## 이미 둘이 가진 강점', j([stItem.title ? `${stItem.title} —` : '', stItem.lifeScene]));
  }
  return out;
}

export function buildNextStep(
  bundle: CompatibilityAnalysisBundle,
  relationshipType: RelationshipType,
): BonusSection | null {
  const at = bundle.attractionAnalysis;
  const st = bundle.stabilityAnalysis;
  const rc = bundle.recoveryAnalysis;
  const chem = at?.initialChemistry;

  let title: string;
  const opening: string[] = [];

  switch (relationshipType) {
    case 'crush_or_something': {
      title = '썸에서 연애로 가려면';
      const signal = chem === 'strong'
        ? '이미 불씨는 있어요. 지금 필요한 건 용기보다 타이밍이에요 — 둘만 있는 자리를 한 번 만들면 관계가 빠르게 정리돼요.'
        : chem === 'slow-burn'
          ? '천천히 데워지는 결이라, 조급해하면 오히려 늦어져요. 자주 보는 사이부터 자연스럽게 만들어 두는 게 정답에 가까워요.'
          : chem === 'unstable'
            ? '끌림은 분명한데 온도 차가 들쭉날쭉한 결이에요. 밀당보다 한결같은 페이스가 이 관계를 안정시켜요.'
            : '아직은 탐색 단계예요. 고백을 서두르기보다, 공통의 시간과 경험을 쌓는 게 연애로 가는 가장 빠른 길이에요.';
      opening.push('## 지금 어디쯤일까', signal);
      break;
    }
    case 'dating': {
      title = '함께 사는 단계로 간다면';
      opening.push('## 같이 살아본다는 것',
        j([st?.relationshipTypeSpecificStability || st?.dailyCompatibility,
          '같이 사는 건 설렘보다 리듬의 문제예요. 짧은 동행(여행이나 살아보기)으로 생활 패턴을 미리 겹쳐보면, 큰 결정이 한결 쉬워져요.']));
      if (st?.longTermRisk) opening.push('', '## 미리 맞춰두면 좋은 것', st.longTermRisk);
      break;
    }
    case 'married': {
      title = '권태기를 지혜롭게 지나는 법';
      opening.push('## 오래 본 사이의 고비',
        j([st?.longTermRisk || st?.dailyCompatibility,
          '익숙함이 무심함으로 굳는 순간이 가장 위험해요. 큰 이벤트보다 작은 다정함의 빈도가 이 시기를 가릅니다.']));
      if (rc?.bestRecoveryRule) {
        opening.push('', '## 다시 가까워지는 스위치',
          j([`둘에겐 ${rc.bestRecoveryRule}`, '새로운 걸 같이 시작해보는 것도 권태의 좋은 해독제예요.']));
      }
      break;
    }
    case 'friendship': {
      title = '친구, 그 이상도 될까';
      opening.push('## 솔직한 가능성',
        j([(chem === 'strong' || chem === 'soft')
          ? '서로에게 끌리는 결이 분명히 있어요. 다만 선을 넘는 순간 친구로는 못 돌아갈 수 있다는 것도 같이 생각해야 해요.'
          : '지금은 편한 친구의 결이 더 강해요. 무리해서 관계를 바꾸기보다, 이 편안함을 지키는 게 더 이득일 수 있어요.',
          '정해진 답은 없어요 — 잃을 것과 얻을 것을 저울에 올려보는 게 먼저예요.']));
      break;
    }
    case 'coworker': {
      title = '동료에서 진짜 내 편으로';
      opening.push('## 업무를 넘어서려면',
        j([st?.dailyCompatibility,
          '일로 만난 사이가 깊어지려면, 평가나 경쟁이 끼지 않는 자리에서 한 번쯤 사람 대 사람으로 만나는 시간이 필요해요.']));
      break;
    }
    case 'reunion_or_breakup': {
      title = '여기서 어디로 갈까';
      opening.push('## 다시 시작하든, 정리하든',
        j([rc?.bestRecoveryRule && `다시 본다면 핵심은 ${rc.bestRecoveryRule}`,
          '무엇을 택하든, 예전과 같은 방식이면 같은 결말이 와요. 달라질 한 가지를 먼저 정하는 게 진짜 시작이에요.']));
      break;
    }
    default:
      return null;
  }

  const playbook = nextStepPlaybook(bundle);
  const body = [...opening, ...(playbook.length ? ['', ...playbook] : [])].join('\n').trim();
  return { eyebrow: '다음 단계', title, body };
}
