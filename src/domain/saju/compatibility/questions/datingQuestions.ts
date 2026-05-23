// 연애중 — 10가지 질문
import type { RelationshipQuestion } from '../compatibilityTypes';

export const DATING_QUESTIONS: RelationshipQuestion[] = [
  { questionNumber: 1, question: '두 사람은 왜 서로에게 끌렸는가?',
    answerGuide: 'attractionAnalysis 결과를 풀어쓰기. 일지·오행보완·십성 매력 포인트 결합. 운명 단정 금지.' },
  { questionNumber: 2, question: '연애 초반에 가장 강하게 느꼈을 매력은 무엇인가?',
    answerGuide: 'tenGodInteraction.attractionPoints 중심. 첫인상 장면을 구체적으로.' },
  { questionNumber: 3, question: '이 관계에서 가장 잘 맞는 부분은 무엇인가?',
    answerGuide: 'relationshipStrengths 배열 중 상위 1~2개. 일상 장면으로 풀기.' },
  { questionNumber: 4, question: '반복해서 싸우기 쉬운 지점은 무엇인가?',
    answerGuide: 'conflictAnalysis.repeatedPattern + mainConflictTriggers. 어느 한쪽 악역화 금지.' },
  { questionNumber: 5, question: '연락, 표현, 애정 확인 방식은 잘 맞는가?',
    answerGuide: 'conflictAnalysis.emotionalMismatch + recoveryAnalysis. 표현 속도 차이 구체화.' },
  { questionNumber: 6, question: '갈등이 생겼을 때 누가 어떻게 회피하거나 밀어붙이는가?',
    answerGuide: 'recoveryAnalysis.whatAUsuallyNeeds / whatBUsuallyNeeds 풀어쓰기. 단정 금지.' },
  { questionNumber: 7, question: '오래 만나려면 반드시 맞춰야 할 생활 리듬은 무엇인가?',
    answerGuide: 'stabilityAnalysis.dailyCompatibility + 관계 유형 가중치 반영.' },
  { questionNumber: 8, question: '결혼까지 생각한다면 가장 먼저 확인해야 할 것은 무엇인가?',
    answerGuide: '돈·생활·가족 영역의 현실 룰. 결혼 단정 금지, "확인해볼 영역" 형식.' },
  { questionNumber: 9, question: '앞으로 3년 동안 관계의 흐름은 어떻게 바뀌는가?',
    answerGuide: 'futureFlow 배열 핵심 요약. 사건 단정 금지.' },
  { questionNumber: 10, question: '이 연애를 좋게 오래 끌고 가려면 무엇을 해야 하는가?',
    answerGuide: 'relationshipChoices.helpfulChoices 핵심 + archetype.keyAdvice.' },
];
