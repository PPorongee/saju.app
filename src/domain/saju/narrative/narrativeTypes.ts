// 서사형(narrative) 개인사주 리포트 타입.
// 기존 카드형 PersonalSajuReport와 별개. 8섹션 구조 (사주원국 + 6 narrative + 명리근거).

import type { ReportValidationResult } from '../report/sajuReportSchema';

export type NarrativeSectionId =
  | 'birthChartCard' | 'openingDefinition' | 'lifeStructureNarrative'
  | 'repeatedPatternNarrative' | 'realityActivationNarrative'
  | 'futureFlowNarrative' | 'finalStrategyNarrative' | 'evidenceView';

export interface NarrativeBirthChartCard {
  pillars: string;             // "을해년 임오월 무술일 무오시"
  dayMaster: string;           // "무토"
  currentDaewoon: string;      // "병술"
  coreKeywords: string[];      // 3~5 짧은 단어
  usefulGodSummary?: string;   // "용신 수 (조후) / 기신 토"
}

export interface NarrativeSection {
  title: string;
  body: string;
  absorbedFrom: string[];      // 어떤 기존 데이터 소스를 흡수했는지 (감사용)
}

export interface NarrativeFutureSection extends NarrativeSection {
  yearlyFlow: Array<{ year: number; body: string }>;
}

export interface NarrativePersonalSajuReport {
  birthChartCard: NarrativeBirthChartCard;
  openingDefinition: NarrativeSection;          // "이 사주를 한 문장으로 말하면"
  lifeStructureNarrative: NarrativeSection;    // "당신이 이런 방식으로 살아온 이유"
  repeatedPatternNarrative: NarrativeSection;  // "반복해서 찾아오는 삶의 패턴"
  realityActivationNarrative: NarrativeSection;// "일·돈·관계에서 운이 살아나는 방식"
  futureFlowNarrative: NarrativeFutureSection; // "앞으로 3년, 어떤 판이 열릴까"
  finalStrategyNarrative: NarrativeSection;    // "결국 이 사주는 이렇게 써야 해요"
  evidenceView: {                              // "명리 근거 보기"
    title: string;
    data: unknown;                             // 원국·십성·오행 등 raw
  };
  validation: ReportValidationResult;
}

// Validator 결과
export interface NarrativeValidationIssue {
  type:
    | 'checklist-overuse'        // 항목형 표현 남발
    | 'repeated-theme-no-development' // 같은 주제 반복만, 발전 없음
    | 'narrative-flow-break'     // 갑자기 카드/리스트로 튐
    | 'hidden-question-uncovered' // 10가지 질문 중 누락된 답
    | 'concreteness-misplaced'   // 구체성이 잘못된 섹션에
    | 'generic'                  // 일반론
    | 'context-conflict'         // 사용자 상태 충돌
    | 'invented-claim'           // JSON에 없는 명리 정보
    | 'fake-rarity'              // 허위 희소성
    | 'tone-broken';             // 친근 존댓말 위반
  sectionId: string;
  sentence: string;
  reason: string;
  severity: 'low' | 'medium' | 'high';
  suggestion: string;
}

export interface NarrativeValidationResult {
  isValid: boolean;
  issues: NarrativeValidationIssue[];
}
