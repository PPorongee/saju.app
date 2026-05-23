// 전략 레이어 — 관계 키워드, 강점, 위험, 살리는/망치는 선택.
// 분석 결과를 종합해서 GPT가 풀어쓸 수 있는 형태로 만든다.

import type {
  RelationshipKeyword, RelationshipStrengthItem, RelationshipRiskItem,
  RelationshipChoices, AttractionAnalysis, ConflictAnalysis,
  RecoveryAnalysis, StabilityAnalysis, RelationshipArchetype,
  ElementComplementAnalysis, SpousePalaceRelationAnalysis,
  TenGodInteractionAnalysis, UsefulGodInteractionAnalysis,
  RelationshipType,
} from '../compatibilityTypes';

// ============================================================
// 관계 키워드 5개
// ============================================================

interface BuildKeywordsArgs {
  attractionAnalysis: AttractionAnalysis;
  conflictAnalysis: ConflictAnalysis;
  recoveryAnalysis: RecoveryAnalysis;
  stabilityAnalysis: StabilityAnalysis;
  archetype: RelationshipArchetype;
  relationshipType: RelationshipType;
}

export function buildRelationshipKeywords(args: BuildKeywordsArgs): RelationshipKeyword[] {
  const { attractionAnalysis, conflictAnalysis, recoveryAnalysis, archetype } = args;
  const list: RelationshipKeyword[] = [];

  // 1. 끌림 키워드
  list.push({
    keyword: chemistryLabel(attractionAnalysis.initialChemistry),
    description: attractionAnalysis.whyTheyNoticeEachOther,
    evidence: attractionAnalysis.evidence.slice(0, 2),
  });

  // 2. 회복 방식
  list.push({
    keyword: '회복 방식의 결',
    description: recoveryAnalysis.likelyRecoveryPattern,
    evidence: recoveryAnalysis.evidence,
  });

  // 3. 충돌 결
  list.push({
    keyword: '반복되는 결',
    description: conflictAnalysis.repeatedPattern,
    evidence: conflictAnalysis.evidence.slice(0, 2),
  });

  // 4. 아키타입 키워드 1
  if (archetype.keywords[0]) {
    list.push({
      keyword: archetype.keywords[0],
      description: archetype.brightSide,
      evidence: archetype.evidence.slice(0, 2).map(e => e.description),
    });
  }

  // 5. 아키타입 키워드 2 (or stability)
  if (archetype.keywords[1]) {
    list.push({
      keyword: archetype.keywords[1],
      description: archetype.shadowSide,
      evidence: archetype.evidence.slice(0, 2).map(e => e.description),
    });
  }

  return list.slice(0, 5);
}

function chemistryLabel(c: AttractionAnalysis['initialChemistry']): string {
  switch (c) {
    case 'strong':    return '강한 끌림';
    case 'slow-burn': return '천천히 스며드는 끌림';
    case 'practical': return '현실 보완감 끌림';
    case 'unstable':  return '끌림과 충돌의 양면';
    case 'soft':      return '잔잔한 결의 끌림';
  }
}

// ============================================================
// 관계 강점 / 위험
// ============================================================

interface StrengthRiskArgs {
  elementComplement: ElementComplementAnalysis;
  spousePalaceRelation: SpousePalaceRelationAnalysis;
  tenGodInteraction: TenGodInteractionAnalysis;
  usefulGodInteraction: UsefulGodInteractionAnalysis;
  stabilityAnalysis: StabilityAnalysis;
  conflictAnalysis: ConflictAnalysis;
  recoveryAnalysis: RecoveryAnalysis;
  relationshipType: RelationshipType;
}

export function buildRelationshipStrengths(args: StrengthRiskArgs): RelationshipStrengthItem[] {
  const { elementComplement, spousePalaceRelation, usefulGodInteraction, tenGodInteraction } = args;
  const out: RelationshipStrengthItem[] = [];

  if (elementComplement.mutualComplement === 'strong' || elementComplement.mutualComplement === 'moderate') {
    out.push({
      title: '서로의 빈자리를 채우는 보완',
      evidence: ['오행 보완 ' + elementComplement.mutualComplement],
      lifeScene: '같이 있을 때 평소보다 균형감이 생기고, 결정도 한쪽으로 치우치지 않는 결이에요.',
    });
  }
  if (spousePalaceRelation.relationTypes.includes('six-harmony') ||
      spousePalaceRelation.relationTypes.includes('three-harmony')) {
    out.push({
      title: '같이 있을 때 자연스럽게 자리잡히는 분위기',
      evidence: ['일지 합'],
      lifeScene: '큰 합의 없이도 일상 리듬이 맞춰지는 편이라, 사소한 시간이 편안하게 흐릅니다.',
    });
  }
  if (usefulGodInteraction.aUsefulTouchedByB.length > 0) {
    out.push({
      title: 'B가 A에게 보완감을 주는 결',
      evidence: ['B가 A 용신/희신을 보완'],
      lifeScene: 'A가 평소 결핍감을 느끼는 영역에서 B가 자연스럽게 채워주는 장면이 자주 생겨요.',
    });
  }
  if (usefulGodInteraction.bUsefulTouchedByA.length > 0) {
    out.push({
      title: 'A가 B에게 보완감을 주는 결',
      evidence: ['A가 B 용신/희신을 보완'],
      lifeScene: 'B가 평소 결핍감을 느끼는 영역에서 A가 자연스럽게 채워주는 장면이 자주 생겨요.',
    });
  }
  if (tenGodInteraction.attractionPoints.length > 0) {
    out.push({
      title: '서로에게 매력으로 보이는 결',
      evidence: tenGodInteraction.evidence.slice(0, 2),
      lifeScene: tenGodInteraction.attractionPoints[0],
    });
  }

  return out.slice(0, 4);
}

export function buildRelationshipRisks(args: StrengthRiskArgs): RelationshipRiskItem[] {
  const { conflictAnalysis, recoveryAnalysis, usefulGodInteraction, elementComplement, spousePalaceRelation } = args;
  const out: RelationshipRiskItem[] = [];

  if (spousePalaceRelation.relationTypes.includes('conflict')) {
    out.push({
      title: '같은 자리에서 반복되는 충돌',
      evidence: ['일지 충'],
      likelyScene: '같은 영역에서 같은 결로 부딪히는 일이 일정 주기로 돌아오는 결.',
      prevention: '갈등이 시작될 때 "이 주제는 회복 룰을 먼저 정한 뒤 이야기하자"고 멈추는 신호 만들기.',
    });
  }
  if (recoveryAnalysis.whatAUsuallyNeeds !== recoveryAnalysis.whatBUsuallyNeeds) {
    out.push({
      title: '회복 방식 차이로 인한 어긋남',
      evidence: ['회복 프로필 불일치'],
      likelyScene: '한쪽은 바로 풀고 싶어 하고, 다른 쪽은 시간이 필요해 거리감이 생기는 결.',
      prevention: recoveryAnalysis.bestRecoveryRule,
    });
  }
  if (usefulGodInteraction.aUnfavorableTriggeredByB.length > 0 ||
      usefulGodInteraction.bUnfavorableTriggeredByA.length > 0) {
    out.push({
      title: '상대의 결이 내 약한 부분을 자극',
      evidence: ['기신 자극'],
      likelyScene: '평소보다 더 예민하게 반응하게 되는 영역이 가까이 있을 때 두드러질 수 있어요.',
      prevention: '자극되는 주제를 미리 명시하고, 같은 주제는 회복 룰 안에서만 이야기하기.',
    });
  }
  if (elementComplement.mutualComplement === 'one-sided') {
    out.push({
      title: '한쪽이 일방적으로 채워주는 구조',
      evidence: ['보완 일방성'],
      likelyScene: '편한 쪽은 익숙해지고, 채우는 쪽은 점점 피로가 쌓이는 결.',
      prevention: '채워주는 영역을 명시하고, 다른 영역에서 역할을 분담하기.',
    });
  }
  if (conflictAnalysis.mainConflictTriggers.length >= 4) {
    out.push({
      title: '갈등 트리거가 많은 결',
      evidence: ['갈등 트리거 ' + conflictAnalysis.mainConflictTriggers.length + '개'],
      likelyScene: '룰 없이 흘러가면 작은 갈등이 자주 발생할 수 있어요.',
      prevention: '주제별 룰(연락·돈·약속·집안일 등)을 1개씩 합의해두기.',
    });
  }

  return out.slice(0, 4);
}

// ============================================================
// 관계를 살리는 선택 / 망치는 선택
// ============================================================

interface ChoicesArgs {
  archetype: RelationshipArchetype;
  conflictAnalysis: ConflictAnalysis;
  recoveryAnalysis: RecoveryAnalysis;
  stabilityAnalysis: StabilityAnalysis;
  relationshipType: RelationshipType;
}

export function buildRelationshipChoices(args: ChoicesArgs): RelationshipChoices {
  const { archetype, recoveryAnalysis, relationshipType } = args;

  const helpfulChoices: RelationshipChoices['helpfulChoices'] = [];
  const harmfulChoices: RelationshipChoices['harmfulChoices'] = [];

  // 1. 아키타입 핵심 조언
  helpfulChoices.push({
    title: archetype.keyAdvice.split('—')[0]?.trim() || archetype.keyAdvice,
    reason: `[${archetype.shortLabel}] ${archetype.summary}`,
    practicalAction: archetype.keyAdvice,
  });

  // 2. 회복 룰
  helpfulChoices.push({
    title: '갈등 뒤 회복 룰 정해두기',
    reason: recoveryAnalysis.likelyRecoveryPattern,
    practicalAction: recoveryAnalysis.bestRecoveryRule,
  });

  // 3. 관계 유형별 액션
  helpfulChoices.push(...typeSpecificHelpful(relationshipType));

  // 망치는 선택
  harmfulChoices.push({
    title: '싸운 직후 결론내기',
    reason: '감정이 가장 높은 시점에 내린 결정은 회복이 어렵습니다.',
    correction: '24시간 룰을 정해두고, 그 시간 안에는 큰 결정·확인 메시지를 미루기.',
  });
  harmfulChoices.push(...typeSpecificHarmful(relationshipType));
  harmfulChoices.push({
    title: archetype.shadowSide.split('.')[0],
    reason: archetype.shadowSide,
    correction: archetype.keyAdvice,
  });

  return {
    helpfulChoices: helpfulChoices.slice(0, 6),
    harmfulChoices: harmfulChoices.slice(0, 6),
  };
}

function typeSpecificHelpful(t: RelationshipType): RelationshipChoices['helpfulChoices'] {
  switch (t) {
    case 'dating': return [
      { title: '주 1회 "관계 점검 메시지" 보내기', reason: '평소 표현 빈도와 관계 안정성이 비례하는 결', practicalAction: '"이번 주 어땠어"처럼 가벼운 한 줄 메시지 정기화' },
    ];
    case 'married': return [
      { title: '돈·집안일·가족 룰 분기마다 점검', reason: '현실 영역이 부부 안정성의 가장 큰 변수', practicalAction: '3개월에 한 번 30분, 돈·역할·일정 3가지만 재합의' },
    ];
    case 'friendship': return [
      { title: '연락 부담 없는 페이스 정하기', reason: '우정은 빈도 합의가 중요한 결', practicalAction: '"답장 없어도 괜찮은 메시지" 형식을 약속해두기' },
    ];
    case 'coworker': return [
      { title: '결정권·금전·기한을 글로 정리', reason: '동료 관계는 역할 모호함이 가장 큰 위험', practicalAction: '공동 작업 시작 시점에 책임·기한·수익 배분을 글로 1장' },
    ];
    case 'reunion_or_breakup': return [
      { title: '재회 전 반복 패턴 점검 대화', reason: '같은 결로 멀어졌을 가능성이 큰 관계', practicalAction: '"전에 어떤 점에서 막혔나" 솔직히 정리한 뒤 만나기' },
    ];
    case 'crush_or_something': return [
      { title: '연락 빈도를 일정 페이스로 유지', reason: '빠르게 가까워지면 부담이 커지는 결', practicalAction: '하루 1~2번 짧은 메시지 페이스로 시작' },
    ];
  }
}

function typeSpecificHarmful(t: RelationshipType): RelationshipChoices['harmfulChoices'] {
  switch (t) {
    case 'dating': return [
      { title: '확인 메시지 폭주', reason: '불안에 따른 잦은 확인은 상대에게 압박으로 전달됨', correction: '"한 번 묻고 24시간 기다리기" 룰을 스스로 정해두기' },
    ];
    case 'married': return [
      { title: '돈·가족 문제를 감정이 격할 때 꺼내기', reason: '현실 주제는 감정 상태에 따라 결과가 달라짐', correction: '돈·가족 주제는 별도의 시간·자리에서만 다루기' },
    ];
    case 'friendship': return [
      { title: '서운함을 묵히기', reason: '우정은 작은 서운함이 가장 자주 멀어지게 만드는 결', correction: '서운함은 24시간 안에 부드럽게 한 문장으로 표현' },
    ];
    case 'coworker': return [
      { title: '책임을 명확히 정하지 않고 시작', reason: '책임 모호함이 갈등의 가장 큰 시작점', correction: '시작 전 책임·기한·수익 배분을 글로 합의' },
    ];
    case 'reunion_or_breakup': return [
      { title: '감정만 확인하고 패턴 점검은 미루기', reason: '같은 이유로 다시 멀어질 위험', correction: '감정 확인과 패턴 점검을 같이 진행' },
    ];
    case 'crush_or_something': return [
      { title: '빠른 고백·잦은 만남 제안으로 부담주기', reason: '아직 정의되지 않은 관계는 부담 신호에 민감함', correction: '상대가 먼저 다음 만남을 잡을 여지를 주기' },
    ];
  }
}
