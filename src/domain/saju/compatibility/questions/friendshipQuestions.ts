// 우정관계 — 10가지 질문
import type { RelationshipQuestion } from '../compatibilityTypes';

export const FRIENDSHIP_QUESTIONS: RelationshipQuestion[] = [
  { questionNumber: 1, question: '두 사람은 친구로서 왜 가까워졌는가?',
    answerGuide: 'attractionAnalysis + dayMasterRelation. 편안함·동질감 위주.' },
  { questionNumber: 2, question: '이 우정에서 가장 편한 부분은 무엇인가?',
    answerGuide: 'elementComplement + 일지 합. 일상 장면.' },
  { questionNumber: 3, question: '서로에게 어떤 자극과 위로를 주는가?',
    answerGuide: 'tenGodInteraction.attractionPoints 위주. 위로/자극 두 결로 분리.' },
  { questionNumber: 4, question: '서운함이 생긴다면 주로 어디서 시작되는가?',
    answerGuide: 'conflictAnalysis. 우정 특유 패턴(연락 빈도·기대치).' },
  { questionNumber: 5, question: '연락 빈도와 거리감은 잘 맞는가?',
    answerGuide: 'recoveryAnalysis + 일간 비교. 거리감 조절 룰.' },
  { questionNumber: 6, question: '함께 놀 때와 진지한 대화를 할 때의 궁합은 어떤가?',
    answerGuide: '식상·인성 비중 차이로 풀기.' },
  { questionNumber: 7, question: '둘 중 누가 더 챙기고, 누가 더 기대는가?',
    answerGuide: 'elementComplement.oneSidednessRisk. 일방성 점검.' },
  { questionNumber: 8, question: '오래 가려면 지켜야 할 선은 무엇인가?',
    answerGuide: 'stabilityAnalysis + helpfulChoices. 우정 룰.' },
  { questionNumber: 9, question: '관계가 멀어질 수 있는 시기는 어떤 흐름에서 오는가?',
    answerGuide: 'futureFlow 중 cooling/distance 이벤트.' },
  { questionNumber: 10, question: '이 우정을 좋게 유지하려면 무엇이 필요한가?',
    answerGuide: 'relationshipChoices.helpfulChoices.' },
];
