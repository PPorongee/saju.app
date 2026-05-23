// 재회/이별 — 10가지 질문
// 주의: 희망고문 금지, 상대 마음 단정 금지, 집착 유도 금지.
import type { RelationshipQuestion } from '../compatibilityTypes';

export const REUNION_BREAKUP_QUESTIONS: RelationshipQuestion[] = [
  { questionNumber: 1, question: '두 사람이 처음 강하게 끌렸던 이유는 무엇인가?',
    answerGuide: 'attractionAnalysis 풀어쓰기. 과거형 회고 톤.' },
  { questionNumber: 2, question: '관계가 멀어진 핵심 원인은 무엇인가?',
    answerGuide: 'conflictAnalysis + usefulGodInteraction의 기신 자극. 단정 금지.' },
  { questionNumber: 3, question: '이별 전 반복됐을 가능성이 큰 패턴은 무엇인가?',
    answerGuide: 'conflictAnalysis.repeatedPattern. "~였을 수 있어요" 톤.' },
  { questionNumber: 4, question: '두 사람은 감정을 회복하는 방식이 어떻게 다른가?',
    answerGuide: 'recoveryAnalysis 풀어쓰기. 한쪽 악역화 금지.' },
  { questionNumber: 5, question: '다시 만나면 가장 먼저 해결해야 할 문제는 무엇인가?',
    answerGuide: 'relationshipRisks 상위 1개. 룰 합의 형태로 제시.' },
  { questionNumber: 6, question: '재회 가능성을 높이는 조건은 무엇인가?',
    answerGuide: '"확률" 단정 금지. 자기 측 변화 가능 영역으로 한정.' },
  { questionNumber: 7, question: '다시 만나도 반복될 위험이 큰 문제는 무엇인가?',
    answerGuide: 'conflictAnalysis + usefulGodInteraction 기신 자극.' },
  { questionNumber: 8, question: '지금 연락한다면 어떤 방식이 가장 덜 부담스러운가?',
    answerGuide: '관계 유형 가중치의 distanceControl 반영. 조작/집착 금지.' },
  { questionNumber: 9, question: '앞으로 3년 안에 관계가 다시 움직일 수 있는 시기는 언제인가?',
    answerGuide: 'futureFlow의 reconnect-possible 이벤트. 사건 단정 금지.' },
  { questionNumber: 10, question: '재회와 정리 중 어느 쪽이 나에게 더 건강한 선택인가?',
    answerGuide: '판단 기준 제시 (자기 변화 가능성/반복 패턴/현재 운). 일방 결론 금지.' },
];
