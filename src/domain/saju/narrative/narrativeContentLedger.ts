// 서사형 리포트 Content Ledger — 8섹션 (사주원국 + 6 narrative + 명리근거).
// 각 섹션의 narrativeRole, 흡수 소스, 허용/금지 주제, 중복 금지 규칙 정의.

import type { ContentLedgerEntry, LedgerSectionId } from '../report/sajuReportSchema';

export function buildNarrativeContentLedger(): ContentLedgerEntry[] {
  const e: ContentLedgerEntry[] = [];

  push(e, 'birthChartCard',
    '본문 진입 전 팩트 표지',
    ['연·월·일·시 4기둥', '일간', '현재 대운', '핵심 오행/십성', '용신 요약'],
    ['긴 해석', '직업 추천', '미래운 상세'],
    [],
    '짧은 팩트만 — 본격 해석은 다음 장부터'
  );

  push(e, 'openingDefinition',
    '독자를 끌어들이는 훅 — 사주를 한 문장/짧은 문단으로 정의',
    ['한 줄 정의', '핵심 키워드 3~5개를 문장 안에 자연스럽게', '이 사주가 눈에 띄는 짧은 이유'],
    ['직업군 상세', '3년 운세 상세', '구체 행동 전략', '체크리스트'],
    [],
    '독자가 다음 장으로 넘어가고 싶게 만드는 훅'
  );

  push(e, 'lifeStructureNarrative',
    '왜 이 사람이 이런 방식으로 생각/반응하는지 — 자기이해 장',
    ['타고난 기질', '겉으로 보이는 모습', '실제 내면', '주변이 오해하기 쉬운 부분',
     '본인이 스스로 힘들어하는 부분', '이 사주가 눈에 띄는 명리적 이유 (specialPoints 흡수)'],
    ['직업 추천 상세', '미래 연도별 분석', '최종 행동 전략'],
    ['openingDefinition의 한 줄 정의 표현 그대로 반복 금지'],
    '자기이해 — "그래서 내가 이런 식이었구나"'
  );

  push(e, 'repeatedPatternNarrative',
    '반복되는 삶의 패턴과 막히는 지점 — 공감과 검증',
    ['반복되는 일/관계/돈/감정 패턴', '왜 그런 패턴이 생기는지',
     '실제 삶의 장면', '특정 시기에 더 강했을 가능성 (timingAnchors 짧게)',
     '단정 금지 — "~였을 수 있어요" 톤'],
    ['직업군 추천 장황 설명', '최종 전략 체크리스트'],
    ['lifeStructureNarrative의 기질 설명을 같은 문장으로 반복 금지'],
    '"이건 내 얘기 같다" 공감을 만드는 장'
  );

  push(e, 'realityActivationNarrative',
    '일·돈·관계에서 이 사주가 강해지는 방식 — 현실 연결',
    ['잘 맞는 직업군 (careerSpecificAnalysis 구체 단어)',
     '잘 맞는 일하는 환경', '피해야 할 업무 환경',
     '돈이 붙는 방식 (moneyMakingStyle)', '돈이 새는 패턴',
     '편해지는 관계와 지치는 관계',
     '직업·돈·관계를 끊지 말고 한 흐름으로 이어 설명'],
    ['앞에서 설명한 기질 반복', '3년 연도별 흐름 상세'],
    ['lifeStructureNarrative에서 다룬 성격 결을 같은 표현으로 반복 금지'],
    '현실 작동 방식 — 카드 나열이 아니라 문장 속에 직업군 녹이기'
  );

  push(e, 'futureFlowNarrative',
    '앞으로 3년의 운 흐름 — 미래 기대와 준비',
    ['연도별 핵심 흐름 (futureTimingAnalysis.years)',
     '생길 수 있는 사건 유형 (단정 금지, "~로 나타날 수 있어요")',
     '직업/돈/관계/이동/공부/가족 중 커지는 주제',
     '잡아야 할 것', '피해야 할 것',
     '체크리스트보다 줄글 중심, 연도 구분은 유지'],
    ['성격 설명 반복', '직업 추천 반복'],
    ['realityActivationNarrative의 직업군 설명을 같은 단어로 반복 금지'],
    '"앞으로 어떤 판이 열리는가" 이야기'
  );

  push(e, 'finalStrategyNarrative',
    '이 사주를 어떻게 써야 하는지 결론 — 행동',
    ['일에서 어떻게 써야 하는가', '돈에서 어떻게 써야 하는가',
     '관계에서 어떻게 써야 하는가', '멘탈 관리', '선택 기준',
     '하위 소제목은 가능하면 줄이고 줄글로'],
    ['새로운 사주 해석 추가', '앞 내용 장황한 반복', '체크리스트 남발'],
    ['앞 모든 섹션의 결론을 같은 표현으로 반복 금지 — 결론은 압축이어야'],
    '결론과 행동 — "그래서 이 사주는 이렇게 써야 해요"'
  );

  push(e, 'evidenceView',
    '명리 근거 — 신뢰 보강 (접힘 영역)',
    ['원국', '십성', '오행 강약', '용신/기신', '신살', '대운/세운'],
    ['감성적 해석', '새로운 결론'],
    [],
    '근거 데이터만 — 감성 X'
  );

  return e;
}

function push(
  arr: ContentLedgerEntry[],
  id: string,
  purpose: string,
  allowed: string[],
  forbidden: string[],
  mustNotRepeat: string[],
  keyMessage: string,
): void {
  arr.push({
    sectionId: id as LedgerSectionId,
    primaryPurpose: purpose,
    allowedTopics: allowed,
    forbiddenTopics: forbidden,
    mustNotRepeatFromPreviousSections: mustNotRepeat,
    keyMessage,
  });
}
