// 충돌 레이어 — 반복적으로 어디서 어긋나는가.

import type {
  ConflictAnalysis, SpousePalaceRelationAnalysis,
  TenGodInteractionAnalysis, UsefulGodInteractionAnalysis,
  RelationshipType,
} from '../compatibilityTypes';
import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
  spousePalaceRelation: SpousePalaceRelationAnalysis;
  tenGodInteraction: TenGodInteractionAnalysis;
  usefulGodInteraction: UsefulGodInteractionAnalysis;
  relationshipType: RelationshipType;
}

export function analyzeConflict(args: Args): ConflictAnalysis {
  const {
    spousePalaceRelation, tenGodInteraction, usefulGodInteraction,
    relationshipType, personA, personB,
  } = args;

  const triggers: string[] = [];
  const evidence: string[] = [];

  if (spousePalaceRelation.relationTypes.includes('conflict')) {
    triggers.push(relationshipTypePhraseForPalaceConflict(relationshipType));
    evidence.push('일지 충');
  }
  if (spousePalaceRelation.relationTypes.includes('punishment')) {
    triggers.push('말투·반복되는 디테일에서 미묘하게 서로의 예민한 결을 건드리는 패턴');
    evidence.push('일지 형');
  }
  if (spousePalaceRelation.relationTypes.includes('harm')) {
    triggers.push('기대 어긋남과 사소한 서운함이 표현되지 않은 채 누적되는 결');
    evidence.push('일지 해');
  }
  if (spousePalaceRelation.relationTypes.includes('destruction')) {
    triggers.push('계획·약속의 사소한 균열이 반복되는 결');
    evidence.push('일지 파');
  }

  // 십성 압박 포인트
  for (const pt of tenGodInteraction.pressurePoints.slice(0, 2)) triggers.push(pt);

  // 기신 자극
  if (usefulGodInteraction.aUnfavorableTriggeredByB.length > 0) {
    triggers.push('A 입장에서 상대가 가까이 있을 때 약한 결이 자극되는 결');
    evidence.push('A 기신 자극');
  }
  if (usefulGodInteraction.bUnfavorableTriggeredByA.length > 0) {
    triggers.push('B 입장에서 상대가 가까이 있을 때 약한 결이 자극되는 결');
    evidence.push('B 기신 자극');
  }

  // 표현 속도 차이 — 일간 오행 차이로 간단 추정 (식상 비중)
  const aOut = personA.coreAnalysis.tenGods.totals['식신'] + personA.coreAnalysis.tenGods.totals['상관'];
  const bOut = personB.coreAnalysis.tenGods.totals['식신'] + personB.coreAnalysis.tenGods.totals['상관'];
  const emotionalMismatch = (() => {
    if (Math.abs(aOut - bOut) >= 1.5) {
      const fast = aOut > bOut ? 'A' : 'B';
      const slow = aOut > bOut ? 'B' : 'A';
      return `${fast}는 감정·표현을 바로 꺼내는 편, ${slow}는 천천히 정리해서 말하는 편 — 같은 사건도 표현 속도가 달라 마찰이 생기기 쉬워요.`;
    }
    return '표현 속도는 비슷한 편이라, 같은 결로 부딪힐 가능성이 더 큽니다.';
  })();

  // 회복 방식 차이 — 인성 vs 비겁 비중
  const aSup = personA.coreAnalysis.tenGods.totals['정인'] + personA.coreAnalysis.tenGods.totals['편인'];
  const bSup = personB.coreAnalysis.tenGods.totals['정인'] + personB.coreAnalysis.tenGods.totals['편인'];
  const recoveryStyleMismatch = (() => {
    if (Math.abs(aSup - bSup) >= 1.2) {
      const slowSide = aSup > bSup ? 'A' : 'B';
      const fastSide = aSup > bSup ? 'B' : 'A';
      return `${slowSide}는 시간을 두고 혼자 정리해야 풀리는 편, ${fastSide}는 바로 대화로 확인해야 안심하는 편 — 싸운 직후 행동 방향이 어긋나기 쉬워요.`;
    }
    return '회복 방식은 비슷한 편이지만, 그만큼 한쪽이 닫아버리면 같이 닫혀버리는 결도 있어요.';
  })();

  const repeatedPattern = pickRepeatedPattern(relationshipType, spousePalaceRelation);

  return {
    mainConflictTriggers: dedupe(triggers).slice(0, 5),
    repeatedPattern,
    emotionalMismatch,
    recoveryStyleMismatch,
    evidence,
  };
}

function relationshipTypePhraseForPalaceConflict(t: RelationshipType): string {
  switch (t) {
    case 'dating':
      return '연락·표현·속도 같은 감정 영역에서 충돌이 잦은 결';
    case 'married':
      return '생활 리듬·돈·집안일·가족 같은 현실 영역에서 충돌이 잦은 결';
    case 'friendship':
      return '거리감·연락 빈도·기대치에서 서로 어긋날 때 마찰이 생기는 결';
    case 'coworker':
      return '의사결정·역할 분담·성과 평가에서 충돌이 잦은 결';
    case 'reunion_or_breakup':
      return '이전에 부딪혔던 같은 영역이 다시 자극되기 쉬운 결';
    case 'crush_or_something':
      return '속도·표현 방식의 차이가 빨리 부담으로 나타나기 쉬운 결';
  }
}

function pickRepeatedPattern(t: RelationshipType, palace: SpousePalaceRelationAnalysis): string {
  const isHigh = palace.intensity === 'high';
  switch (t) {
    case 'dating':
      return isHigh
        ? '"표현·속도·확인"의 세 갈래에서 같은 결로 부딪히는 패턴이 반복될 수 있어요.'
        : '서로의 작은 표현 차이를 그냥 넘어가다가 갑자기 한 번에 터지는 패턴이 생길 수 있어요.';
    case 'married':
      return isHigh
        ? '생활·돈·가족 영역에서 같은 충돌이 다른 모습으로 반복되기 쉬워요.'
        : '큰 갈등은 적어도 익숙함에 따른 표현 부족이 누적되는 패턴이 생길 수 있어요.';
    case 'friendship':
      return '연락 빈도·기대치 차이에서 시작된 서운함이 정기적으로 돌아오는 결이 있어요.';
    case 'coworker':
      return '결정 방식·일정 관리·평가 기준이 같은 결로 자주 부딪힐 수 있어요.';
    case 'reunion_or_breakup':
      return '이전에 멀어진 그 결이 다시 만나도 그대로 반복될 위험이 있어요.';
    case 'crush_or_something':
      return '한쪽이 다가가고 한쪽이 멈칫하는 패턴이 반복되어 흐지부지될 수 있어요.';
  }
}

function dedupe<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }
