// 안정성 레이어 — 관계 유형별 장기 안정성.

import type {
  StabilityAnalysis, ElementComplementAnalysis,
  SpousePalaceRelationAnalysis, ConflictAnalysis, RecoveryAnalysis,
  RelationshipType,
} from '../compatibilityTypes';
import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
  elementComplement: ElementComplementAnalysis;
  spousePalaceRelation: SpousePalaceRelationAnalysis;
  conflictAnalysis: ConflictAnalysis;
  recoveryAnalysis: RecoveryAnalysis;
  relationshipType: RelationshipType;
}

export function analyzeStability(args: Args): StabilityAnalysis {
  const {
    elementComplement, spousePalaceRelation,
    relationshipType, conflictAnalysis, recoveryAnalysis,
  } = args;

  const dailyCompatibility = (() => {
    if (spousePalaceRelation.relationTypes.includes('six-harmony') ||
        spousePalaceRelation.relationTypes.includes('three-harmony')) {
      return '같이 있는 시간이 자연스럽게 흐르는 결 — 큰 합의 없이도 분위기가 맞춰지는 편이에요.';
    }
    if (spousePalaceRelation.relationTypes.includes('conflict') ||
        spousePalaceRelation.relationTypes.includes('punishment')) {
      return '같이 있을 때 한쪽이 페이스를 맞춰주지 않으면 마찰이 생기기 쉬워요. 룰이 있으면 안정되는 결이에요.';
    }
    return '생활 리듬은 보통의 결 — 큰 합도, 큰 충돌도 아니라 평범한 일상에서 결이 결정됩니다.';
  })();

  const longTermRisk = (() => {
    if (elementComplement.mutualComplement === 'one-sided') {
      return '오래 가면 한쪽이 일방적으로 채워주는 구조가 굳어지기 쉬워요.';
    }
    if (recoveryAnalysis.whatAUsuallyNeeds !== recoveryAnalysis.whatBUsuallyNeeds) {
      return '회복 방식 차이가 정리되지 않으면 같은 갈등이 다른 모습으로 반복될 수 있어요.';
    }
    if (conflictAnalysis.mainConflictTriggers.length >= 4) {
      return '갈등 트리거가 많은 편 — 룰 없이 흐르면 피로가 빠르게 누적될 수 있어요.';
    }
    return '큰 위험 요소는 적은 편이지만, 익숙해진 뒤 표현이 줄면 외로움이 생길 수 있어요.';
  })();

  const relationshipTypeSpecificStability = (() => {
    switch (relationshipType) {
      case 'dating':
        return '연애로서의 안정성은 감정 표현 빈도·갈등 회복 룰 두 가지가 가장 큰 변수예요.';
      case 'married':
        return '부부로서의 안정성은 돈·생활·가족 영역에서의 합의 구조에 달려 있어요.';
      case 'friendship':
        return '우정으로서의 안정성은 거리감 룰과 연락 페이스 일치가 가장 큰 변수예요.';
      case 'coworker':
        return '동료로서의 안정성은 역할·결정권·평가 기준이 분명한가에 달려 있어요.';
      case 'reunion_or_breakup':
        return '재회 후 안정성은 이전에 반복된 갈등을 다르게 다룰 수 있는가에 달려 있어요.';
      case 'crush_or_something':
        return '아직 안정성을 말하기 이른 단계 — 속도와 부담 신호 관리가 우선이에요.';
    }
  })();

  return {
    dailyCompatibility,
    longTermRisk,
    relationshipTypeSpecificStability,
    evidence: [
      `오행 보완 ${elementComplement.mutualComplement}`,
      `일지 관계 ${spousePalaceRelation.relationTypes.join('·')}`,
      `관계 유형 ${relationshipType}`,
    ],
  };
}
