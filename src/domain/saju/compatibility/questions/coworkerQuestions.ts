// 동료사이 — 10가지 질문
import type { RelationshipQuestion } from '../compatibilityTypes';

export const COWORKER_QUESTIONS: RelationshipQuestion[] = [
  { questionNumber: 1, question: '두 사람은 같이 일할 때 어떤 시너지가 나는가?',
    answerGuide: 'elementComplement + 일간 생극. 일하는 결.' },
  { questionNumber: 2, question: '역할을 어떻게 나눌 때 가장 효율적인가?',
    answerGuide: '두 사람의 일간 오행과 강한 십성으로 역할 할당.' },
  { questionNumber: 3, question: '누가 기획, 실행, 조율, 마무리에 강한가?',
    answerGuide: 'A/B 각각 식상·관성·재성·인성 비중으로 역할 매핑.' },
  { questionNumber: 4, question: '의사결정 방식은 잘 맞는가?',
    answerGuide: '비겁·관성 차이. 결정 속도/기준 일치 여부.' },
  { questionNumber: 5, question: '갈등이 생기면 주로 어떤 문제에서 시작되는가?',
    answerGuide: 'conflictAnalysis. 일정·결정권·평가 영역 중심.' },
  { questionNumber: 6, question: '돈, 성과, 책임 배분에서 조심할 점은 무엇인가?',
    answerGuide: '재성·관성 비중과 합충 결과. 돈 분배 룰.' },
  { questionNumber: 7, question: '상사-부하, 동료, 파트너 중 어떤 관계가 가장 맞는가?',
    answerGuide: 'dayMasterRelation.balance로 판단. 일방성 위주.' },
  { questionNumber: 8, question: '함께 하면 성과가 커지는 일은 무엇인가?',
    answerGuide: 'relationshipStrengths의 보완 결로 풀기.' },
  { questionNumber: 9, question: '함께 하면 피해야 할 일하는 방식은 무엇인가?',
    answerGuide: 'relationshipRisks. 책임 모호/일방성 위주.' },
  { questionNumber: 10, question: '앞으로 3년간 같이 일한다면 어떤 시기를 조심해야 하는가?',
    answerGuide: 'futureFlow의 turning-point/cooling 이벤트 위주.' },
];
