// 관계 유형 → 질문 세트 디스패처.

import type { RelationshipQuestion, RelationshipType } from '../compatibilityTypes';
import { DATING_QUESTIONS } from './datingQuestions';
import { MARRIED_QUESTIONS } from './marriedQuestions';
import { FRIENDSHIP_QUESTIONS } from './friendshipQuestions';
import { COWORKER_QUESTIONS } from './coworkerQuestions';
import { REUNION_BREAKUP_QUESTIONS } from './reunionBreakupQuestions';
import { CRUSH_QUESTIONS } from './crushQuestions';

export function buildRelationshipQuestions(type: RelationshipType): RelationshipQuestion[] {
  switch (type) {
    case 'dating':              return DATING_QUESTIONS;
    case 'married':             return MARRIED_QUESTIONS;
    case 'friendship':          return FRIENDSHIP_QUESTIONS;
    case 'coworker':            return COWORKER_QUESTIONS;
    case 'reunion_or_breakup':  return REUNION_BREAKUP_QUESTIONS;
    case 'crush_or_something':  return CRUSH_QUESTIONS;
  }
}
