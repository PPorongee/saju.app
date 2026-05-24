// 서사형 개인사주 — LifeSceneHint (2026-05).
//
// "해석"만 있고 "실제 장면"이 없는 리포트를 막기 위한 시드.
// 각 LifeSceneHint는 (상황 → 행동 → 내면 반응 → 외부 오해 → 더 나은 사용)을 묶어
// GPT가 본문 안에 자연스럽게 녹일 수 있도록 한다.
//
// 직접 항목 나열은 금지 — 문단 흐름 안에서 풀어쓰기.

import type {
  PersonalSajuGptInput,
  LifeWeapon, LifeTrap, IdentityKeyword, SpecialPoint,
  CareerMatch, MoneyMakingStyleItem,
} from '../report/sajuReportSchema';

export type LifeSceneSectionId =
  | 'openingDefinition'
  | 'lifeStructureNarrative'
  | 'repeatedPatternNarrative'
  | 'careerTalentNarrative'
  | 'moneyMonetizationNarrative'
  | 'relationshipLoveNarrative'
  | 'futureFlowNarrative'
  | 'finalStrategyNarrative';

export type LifeSceneSource =
  | 'identityKeyword'
  | 'specialPoint'
  | 'lifeWeapon'
  | 'lifeTrap'
  | 'careerSpecificAnalysis'
  | 'moneyMakingStyle'
  | 'relationshipPattern'
  | 'timingAnchor'
  | 'futureTimingAnalysis';

export interface LifeSceneHint {
  sectionId: LifeSceneSectionId;
  source: LifeSceneSource;
  /** 어떤 상황에서 */
  situation: string;
  /** 어떻게 행동할 가능성이 큰지 */
  likelyBehavior: string;
  /** 그 순간 안에서 일어나는 반응 */
  innerReaction: string;
  /** 주변이 오해할 가능성 */
  externalMisunderstanding?: string;
  /** 더 잘 쓰는 방향 */
  betterUse?: string;
}

// ============================================================
// trap 카테고리별 시드 장면 (생성기에 사용)
// ============================================================
const TRAP_SCENE_BY_CATEGORY: Record<string, Partial<LifeSceneHint>> = {
  'over-responsibility': {
    situation: '회의나 가족 문제에서 책임자가 애매한 상황',
    likelyBehavior: '본인이 먼저 정리하거나 수습하려 함',
    innerReaction: '처음에는 괜찮다고 생각하지만 시간이 지나며 부담이 쌓임',
    externalMisunderstanding: '주변은 이 사람이 괜찮은 줄 알고 계속 맡김',
    betterUse: '초반부터 범위와 역할을 나누는 방식',
  },
  'perfectionism': {
    situation: '결과물을 외부에 공개해야 하는 순간',
    likelyBehavior: '완벽해질 때까지 공개를 미룸',
    innerReaction: '아직 부족하다는 감각이 멈추지 않음',
    externalMisunderstanding: '주변은 진행이 느리거나 의지가 약하다고 봄',
    betterUse: '70% 단계에서 한 번 보여주고 피드백으로 다듬는 구조',
  },
  'avoidance': {
    situation: '감정이 무거운 대화를 시작해야 할 때',
    likelyBehavior: '바쁘다는 이유로 미루거나 표정으로만 표현',
    innerReaction: '안에서는 이미 많은 결론을 내림',
    externalMisunderstanding: '상대는 별일 아닌 줄 알고 같은 행동 반복',
    betterUse: '서운함이 작을 때 짧게 말하는 연습',
  },
  'relationship': {
    situation: '관계 안에서 누군가의 기준이 흐트러질 때',
    likelyBehavior: '먼저 분위기를 수습하거나 침묵으로 신호',
    innerReaction: '속에서는 거리 조절을 시작',
    externalMisunderstanding: '상대는 괜찮은 줄 알다가 갑자기 끊긴다고 느낌',
    betterUse: '초반 한 번의 부드러운 기준 정리',
  },
  'overthinking': {
    situation: '결정을 내려야 하는 시점',
    likelyBehavior: '경우의 수를 계속 검토',
    innerReaction: '결정 자체보다 빠뜨린 것이 있을까 두려움',
    externalMisunderstanding: '주변은 망설인다고 봄',
    betterUse: '70% 정보일 때 임시 결정 후 수정 가능한 구조',
  },
  'money': {
    situation: '실력을 제안서·작업으로 바꿔야 하는 순간',
    likelyBehavior: '먼저 도와주고 가격은 나중',
    innerReaction: '돈 얘기를 먼저 꺼내는 것이 어색',
    externalMisunderstanding: '상대는 무료가 당연하다고 느낌',
    betterUse: '작업 범위·기간·보상 기준을 먼저 명문화',
  },
  'career': {
    situation: '책임은 늘었는데 권한은 그대로일 때',
    likelyBehavior: '일단 떠안고 결과로 증명하려 함',
    innerReaction: '인정받고 싶은 마음과 지친다는 감각이 동시에',
    externalMisunderstanding: '조직은 능력자라고만 보고 자원을 늘리지 않음',
    betterUse: '책임 합의 단계에서 권한과 자원 범위 같이 확정',
  },
  'emotion': {
    situation: '감정이 한 번에 올라오는 순간',
    likelyBehavior: '말이 줄어들거나 자리를 피함',
    innerReaction: '나중에 천천히 정리',
    externalMisunderstanding: '상대는 거리감을 느낌',
    betterUse: '한두 문장으로 "지금 생각 정리 중"이라고 알리기',
  },
  'persistence': {
    situation: '오래 끌어온 일을 정리해야 할 시점',
    likelyBehavior: '익숙한 방식을 한 번 더 시도',
    innerReaction: '바꾸는 것이 손해처럼 느껴짐',
    externalMisunderstanding: '주변은 같은 방식이 통할 거라고 기대',
    betterUse: '소규모로 새 방식 테스트 후 확장',
  },
};

const WEAPON_SCENE_BY_CATEGORY: Record<string, Partial<LifeSceneHint>> = {
  judgment: {
    situation: '여러 의견이 갈리는 회의',
    likelyBehavior: '한두 마디로 흐름을 정리',
    innerReaction: '결정이 늦어지는 것을 답답해함',
    betterUse: '근거를 짧게 같이 보여주는 방식',
  },
  expression: {
    situation: '복잡한 내용을 외부에 설명해야 할 때',
    likelyBehavior: '구조화하여 쉽게 전달',
    innerReaction: '듣는 사람의 이해 흐름이 보임',
    betterUse: '결과물(문서·콘텐츠)로 남겨 자산화',
  },
  money: {
    situation: '자원과 흐름을 다뤄야 하는 순간',
    likelyBehavior: '큰 그림과 작은 단위를 함께 봄',
    betterUse: '월·분기 단위 정산 구조 마련',
  },
  relationship: {
    situation: '갈등이 있는 자리에서',
    likelyBehavior: '서로의 입장을 정리해 균형 잡음',
    betterUse: '중재 후 결과를 짧게 기록으로 남기기',
  },
  leadership: {
    situation: '리더가 빠진 자리',
    likelyBehavior: '자연스럽게 진행을 떠맡음',
    innerReaction: '책임은 받되 권한도 받았는지 확인하고 싶어함',
    betterUse: '초반에 권한 범위 합의 후 진행',
  },
  persistence: {
    situation: '장기 프로젝트의 후반',
    likelyBehavior: '꾸준한 페이스로 완수',
    betterUse: '중간 결과물을 가시화해 동력 유지',
  },
  learning: {
    situation: '새 분야에 진입해야 할 때',
    likelyBehavior: '체계적으로 학습 경로를 설계',
    betterUse: '학습 결과를 콘텐츠/포트폴리오로 변환',
  },
  creativity: {
    situation: '새로운 안이 필요한 자리',
    likelyBehavior: '기존 틀과 다른 시도를 제안',
    betterUse: '실험 단위를 작게 잡아 검증',
  },
  career: {
    situation: '커리어 전환 시점',
    likelyBehavior: '경험을 구조로 묶어 다음 자리로',
    betterUse: '경력을 한 페이지 스토리로 정리',
  },
};

function pickFirst<T>(xs: T[]): T | undefined { return xs[0]; }

// ============================================================
// 메인 — 6~10개 정도의 hint를 섹션별로 분배
// ============================================================
export function buildLifeSceneHints(input: PersonalSajuGptInput): LifeSceneHint[] {
  const hints: LifeSceneHint[] = [];

  // 1) openingDefinition — 가장 강한 identityKeyword + specialPoint
  const topKw: IdentityKeyword | undefined = input.identityKeywords[0];
  if (topKw) {
    hints.push({
      sectionId: 'openingDefinition',
      source: 'identityKeyword',
      situation: '평소엔 조용하다가 결정해야 하는 순간',
      likelyBehavior: '한 박자 뒤에 자기 기준으로 정리',
      innerReaction: '겉으론 차분, 안쪽에선 이미 판단이 빠르게 진행',
      externalMisunderstanding: '주변은 신중하거나 무던하다고 봄',
    });
  }
  const topSP: SpecialPoint | undefined = [...input.specialPoints]
    .sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0))[0];
  if (topSP) {
    hints.push({
      sectionId: 'openingDefinition',
      source: 'specialPoint',
      situation: '판이 흐트러지거나 누군가 결정을 미루는 순간',
      likelyBehavior: '"이건 이렇게 가야 한다" 쪽으로 빠르게 움직임',
      innerReaction: '평소엔 잠재돼 있지만 위기에서 단단하게 올라옴',
      betterUse: '이 힘을 혼자 쓰지 말고 역할 분담의 기준선으로',
    });
  }

  // 2) lifeStructureNarrative — 일간 + 강한 십성 기반 내면
  hints.push({
    sectionId: 'lifeStructureNarrative',
    source: 'identityKeyword',
    situation: '사람의 말투·태도가 살짝 어긋난 순간',
    likelyBehavior: '겉으로 반응하지 않고 속에서 곱씹음',
    innerReaction: '시간이 지나도 잘 잊히지 않음',
    externalMisunderstanding: '상대는 별일 아닌 줄 알다가 갑자기 거리감을 느낌',
    betterUse: '작은 서운함이 쌓이기 전 짧게 표현',
  });

  // 3) repeatedPatternNarrative — 상위 1~2 lifeTrap
  const sortedTraps: LifeTrap[] = [...input.lifeTraps]
    .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
    .slice(0, 2);
  for (const t of sortedTraps) {
    const seed = TRAP_SCENE_BY_CATEGORY[t.category];
    if (seed) {
      hints.push({
        sectionId: 'repeatedPatternNarrative',
        source: 'lifeTrap',
        situation: seed.situation ?? t.realLifeScene ?? '반복 패턴이 발동하는 순간',
        likelyBehavior: seed.likelyBehavior ?? t.patternDescription ?? '익숙한 방식 반복',
        innerReaction: seed.innerReaction ?? '처음엔 괜찮다가 점점 부담',
        externalMisunderstanding: seed.externalMisunderstanding,
        betterUse: seed.betterUse ?? t.escapeStrategy,
      });
    }
  }
  // 가족 장면 1개 (familyEarlyPattern 커버리지)
  hints.push({
    sectionId: 'repeatedPatternNarrative',
    source: 'relationshipPattern',
    situation: '가족 안에서 책임이 모이는 자리',
    likelyBehavior: '먼저 알아차리고 움직이는 역할',
    innerReaction: '당연한 몫으로 굳어지는 게 답답함',
    betterUse: '맡기 전 역할·범위 한 번 짚기',
  });
  // 연애·결혼 장면 1개 (loveMarriageStyle 커버리지)
  hints.push({
    sectionId: 'repeatedPatternNarrative',
    source: 'relationshipPattern',
    situation: '연애·가까운 관계 초반',
    likelyBehavior: '요구가 많은 사람처럼 보이지 않으려 참음',
    innerReaction: '상대의 말과 행동이 맞는지 계속 관찰',
    externalMisunderstanding: '상대는 별일 아니라고 생각',
    betterUse: '작은 기준은 그때그때 부드럽게 말하기',
  });

  // 4) careerTalentNarrative — lifeWeapon + career (일과 재능 독립 장)
  const sortedWeapons: LifeWeapon[] = [...input.lifeWeapons]
    .sort((a, b) => (b.strengthScore ?? 0) - (a.strengthScore ?? 0))
    .slice(0, 2);
  for (const w of sortedWeapons) {
    const seed = WEAPON_SCENE_BY_CATEGORY[w.category];
    if (seed) {
      hints.push({
        sectionId: 'careerTalentNarrative',
        source: 'lifeWeapon',
        situation: seed.situation ?? w.realLifeScene ?? '능력이 발휘되는 순간',
        likelyBehavior: seed.likelyBehavior ?? w.howToUse ?? '자연스럽게 정리',
        innerReaction: seed.innerReaction ?? '여기서는 내가 도움 된다는 감각',
        betterUse: seed.betterUse ?? w.howToUse,
      });
    }
  }
  const topCareer: CareerMatch | undefined = pickFirst(input.careerSpecificAnalysis.topCareerMatches);
  if (topCareer) {
    hints.push({
      sectionId: 'careerTalentNarrative',
      source: 'careerSpecificAnalysis',
      situation: '흐름이 막혀 누군가 정리해야 하는 자리',
      likelyBehavior: '병목을 찾고 다음 단계로 굴림',
      innerReaction: '여기서는 내가 가장 잘 쓰일 수 있다는 확신',
      betterUse: '결과를 외부에서 확인 가능한 형태로 남기기',
    });
  }

  // 5) moneyMonetizationNarrative — 돈/수익화 독립 장
  const topMoney: MoneyMakingStyleItem | undefined = pickFirst(input.careerSpecificAnalysis.moneyMakingStyle);
  if (topMoney) {
    hints.push({
      sectionId: 'moneyMonetizationNarrative',
      source: 'moneyMakingStyle',
      situation: '실력을 외부에 제안해야 할 때',
      likelyBehavior: '먼저 도와주고 가격은 나중에 얘기',
      innerReaction: '돈 얘기를 먼저 꺼내는 것이 어색',
      externalMisunderstanding: '상대는 무료가 당연하다고 느낌',
      betterUse: '작업 범위·기간·보상 기준을 먼저 명문화',
    });
  }
  hints.push({
    sectionId: 'moneyMonetizationNarrative',
    source: 'moneyMakingStyle',
    situation: '능력을 한 번에 크게 굴리고 싶은 유혹',
    likelyBehavior: '작은 단위로 검증하고 반복 가능한 구조 만들기',
    innerReaction: '큰 한방보다 신뢰가 쌓이는 흐름이 더 편함',
    betterUse: '검증된 작은 상품을 점진 확장',
  });

  // 6) relationshipLoveNarrative — 관계/연애 독립 장
  hints.push({
    sectionId: 'relationshipLoveNarrative',
    source: 'relationshipPattern',
    situation: '관계 초반 신뢰 형성 시점',
    likelyBehavior: '뜨거운 말보다 행동의 일관성을 본다',
    innerReaction: '말과 행동이 맞는지 오래 관찰',
    betterUse: '약속을 지키는 사람을 시간 두고 가까이',
  });
  hints.push({
    sectionId: 'relationshipLoveNarrative',
    source: 'relationshipPattern',
    situation: '서운함이 작게 쌓이는 순간',
    likelyBehavior: '한번 더 참고 신호를 안 줌',
    innerReaction: '안에서는 기준선이 깎이는 게 보임',
    externalMisunderstanding: '상대는 별일 아니라고 느낌',
    betterUse: '마음이 닫히기 전 짧게 신호',
  });

  // 5) futureFlowNarrative — 첫 연도 시나리오
  const firstYear = input.futureTimingAnalysis.years[0];
  if (firstYear) {
    hints.push({
      sectionId: 'futureFlowNarrative',
      source: 'futureTimingAnalysis',
      situation: `${firstYear.year}년에 흐름이 바뀌는 자리`,
      likelyBehavior: '쌓아둔 것을 외부에서 확인 가능한 형태로 정리',
      innerReaction: '이제 보여줘도 된다는 신호처럼 느낄 수 있음',
      betterUse: '자격·포트폴리오·콘텐츠처럼 남는 형태로',
    });
  }

  // 6) finalStrategyNarrative — 결론 장면
  hints.push({
    sectionId: 'finalStrategyNarrative',
    source: 'identityKeyword',
    situation: '"내가 다 해야지" 감각이 다시 올라오는 순간',
    likelyBehavior: '범위와 권한을 먼저 확인',
    innerReaction: '책임을 잘 지는 만큼 조건도 챙길 줄 알게 됨',
    betterUse: '능력을 흘려보내지 않고 구조로 만드는 감각',
  });

  return hints;
}
