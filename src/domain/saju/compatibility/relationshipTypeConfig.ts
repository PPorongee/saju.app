// 관계 유형별 가중치 — 같은 명리 구조라도 해석 초점이 달라짐.
// 가중치는 0~1 스케일.

import type { RelationshipType, RelationshipTypeWeight } from './compatibilityTypes';

export const RELATIONSHIP_TYPE_WEIGHTS: Record<RelationshipType, RelationshipTypeWeight> = {
  dating: {
    relationshipType: 'dating',
    label: '연애중',
    description: '서로에게 끌림이 있고, 감정·표현·갈등 회복 방식이 관계 지속에 큰 영향을 주는 시기',
    priority: {
      attraction: 0.9,
      emotionalExpression: 0.9,
      dailyCompatibility: 0.5,
      moneyAndResponsibility: 0.4,
      communicationStyle: 0.9,
      conflictRecovery: 0.85,
      timing: 0.6,
      longTermStability: 0.7,
      roleDivision: 0.3,
      distanceControl: 0.6,
      repeatedPattern: 0.5,
    },
  },
  married: {
    relationshipType: 'married',
    label: '혼인관계',
    description: '생활·돈·책임·가족 등 현실 영역이 관계 안정성을 결정',
    priority: {
      attraction: 0.4,
      emotionalExpression: 0.6,
      dailyCompatibility: 0.95,
      moneyAndResponsibility: 0.95,
      communicationStyle: 0.8,
      conflictRecovery: 0.9,
      timing: 0.7,
      longTermStability: 0.95,
      roleDivision: 0.8,
      distanceControl: 0.5,
      repeatedPattern: 0.7,
    },
  },
  friendship: {
    relationshipType: 'friendship',
    label: '우정관계',
    description: '거리감과 의리, 편안한 자극과 위로가 핵심',
    priority: {
      attraction: 0.2,
      emotionalExpression: 0.6,
      dailyCompatibility: 0.5,
      moneyAndResponsibility: 0.3,
      communicationStyle: 0.85,
      conflictRecovery: 0.7,
      timing: 0.4,
      longTermStability: 0.85,
      roleDivision: 0.3,
      distanceControl: 0.9,
      repeatedPattern: 0.4,
    },
  },
  coworker: {
    relationshipType: 'coworker',
    label: '동료사이',
    description: '역할 분담·성과·책임·돈 배분이 가장 큰 변수',
    priority: {
      attraction: 0.1,
      emotionalExpression: 0.3,
      dailyCompatibility: 0.5,
      moneyAndResponsibility: 0.9,
      communicationStyle: 0.85,
      conflictRecovery: 0.6,
      timing: 0.5,
      longTermStability: 0.6,
      roleDivision: 0.95,
      distanceControl: 0.5,
      repeatedPattern: 0.3,
    },
  },
  reunion_or_breakup: {
    relationshipType: 'reunion_or_breakup',
    label: '재회/이별',
    description: '반복 패턴·회복 가능성·타이밍이 결정적',
    priority: {
      attraction: 0.4,
      emotionalExpression: 0.8,
      dailyCompatibility: 0.5,
      moneyAndResponsibility: 0.4,
      communicationStyle: 0.7,
      conflictRecovery: 0.95,
      timing: 0.9,
      longTermStability: 0.6,
      roleDivision: 0.3,
      distanceControl: 0.7,
      repeatedPattern: 0.95,
    },
  },
  crush_or_something: {
    relationshipType: 'crush_or_something',
    label: '짝사랑/썸',
    description: '끌림·속도·거리 조절·부담 포인트가 핵심',
    priority: {
      attraction: 0.9,
      emotionalExpression: 0.6,
      dailyCompatibility: 0.3,
      moneyAndResponsibility: 0.2,
      communicationStyle: 0.7,
      conflictRecovery: 0.3,
      timing: 0.85,
      longTermStability: 0.4,
      roleDivision: 0.2,
      distanceControl: 0.9,
      repeatedPattern: 0.4,
    },
  },
};

export function getRelationshipWeight(type: RelationshipType): RelationshipTypeWeight {
  return RELATIONSHIP_TYPE_WEIGHTS[type];
}
