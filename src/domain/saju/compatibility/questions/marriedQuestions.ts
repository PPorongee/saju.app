// 혼인관계 — 10가지 질문
import type { RelationshipQuestion } from '../compatibilityTypes';

export const MARRIED_QUESTIONS: RelationshipQuestion[] = [
  { questionNumber: 1, question: '두 사람은 부부로서 어떤 구조를 가진 관계인가?',
    answerGuide: 'archetype 요약 + dayMasterRelation 풀어쓰기. 역할 구조 중심.' },
  { questionNumber: 2, question: '결혼 후 더 강해진 장점은 무엇인가?',
    answerGuide: 'relationshipStrengths 중 일상 안정/보완 관련. 현실 장면으로.' },
  { questionNumber: 3, question: '결혼 후 반복되기 쉬운 갈등 패턴은 무엇인가?',
    answerGuide: 'conflictAnalysis.repeatedPattern. 생활/돈/가족 영역 중심.' },
  { questionNumber: 4, question: '돈과 생활 방식은 어떻게 맞춰야 하는가?',
    answerGuide: '돈·생활 룰 합의 방법. 두 사람의 재성 비중 차이 반영.' },
  { questionNumber: 5, question: '집안일, 책임, 가족 문제에서 어디서 부딪히는가?',
    answerGuide: '관성 비중과 책임 분담 패턴. 한쪽 떠안기 경고.' },
  { questionNumber: 6, question: '서로가 정서적으로 원하는 안정감은 무엇인가?',
    answerGuide: '인성 강약과 회복 방식 차이로 풀기.' },
  { questionNumber: 7, question: '싸운 뒤 회복 방식은 잘 맞는가?',
    answerGuide: 'recoveryAnalysis 풀어쓰기. 회복 룰 제시.' },
  { questionNumber: 8, question: '이 관계에서 한쪽이 과하게 떠안는 역할은 없는가?',
    answerGuide: 'elementComplement.oneSidednessRisk. 책임 분담 점검.' },
  { questionNumber: 9, question: '앞으로 3년 동안 부부 관계에서 커지는 주제는 무엇인가?',
    answerGuide: 'futureFlow 핵심 — 결혼 후 영역(돈·가족·이사)별 흐름.' },
  { questionNumber: 10, question: '이 결혼을 더 안정적으로 쓰기 위한 현실 전략은 무엇인가?',
    answerGuide: 'relationshipChoices.helpfulChoices. 현실 체크리스트.' },
];
