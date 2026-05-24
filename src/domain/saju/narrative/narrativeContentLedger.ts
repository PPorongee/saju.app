// 서사형 리포트 Content Ledger — 8섹션 (사주원국 + 6 narrative + 명리근거).
// 각 섹션의 narrativeRole, 흡수 소스, 허용/금지 주제, 중복 금지 규칙 정의.

import type { ContentLedgerEntry, LedgerSectionId } from '../report/sajuReportSchema';
import type { NarrativeCoverageRequirement } from './narrativeTypes';

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

  push(e, 'careerTalentNarrative',
    '일과 재능 — 어떤 역할에서 실력이 살아나는가 (독립 장)',
    ['핵심 재능 (lifeWeapons)', '잘 맞는 역할/직무', '잘 맞는 조직 환경 (bestWorkStyle)',
     '피해야 할 업무 환경 (avoidCareerEnvironments)', '리더십 스타일',
     '같이 일하면 좋은 동료', '이직/독립/프리랜서 가능성',
     '구체 직업군 (3개 이상, 산업 2개 이상)', '왜 그 일이 맞는지 핵심 능력과 연결'],
    ['돈 상세', '관계/연애 상세', '미래 3년'],
    ['lifeStructureNarrative의 기질 설명을 같은 표현으로 반복 금지'],
    '재능과 일 — 직업군을 나열하지 말고 핵심 능력의 적용처로 풀어쓰기'
  );

  push(e, 'moneyMonetizationNarrative',
    '돈과 수익화 — 어떤 방식으로 돈이 붙는가 (독립 장)',
    ['돈이 붙는 방식 (moneyMakingStyle)', '돈이 새는 패턴',
     '월급형/전문성형/프로젝트형/사업형 성향', '프리랜서·1인 사업 가능성',
     '가격표/계약/정산 기준', '능력을 상품화하는 방식',
     '피해야 할 돈 패턴 (계약 없이 능력 흘려보내기 등)'],
    ['직업군 상세 (4장 영역)', '관계/연애 (6장 영역)',
     '투자/거래/시장 타이밍 권유 표현 절대 금지'],
    ['careerTalentNarrative의 직업군 설명을 같은 표현으로 반복 금지'],
    '돈 — 수익화 구조·보상 방식·계약 기준 중심. 투자 조언처럼 들리면 실패'
  );

  push(e, 'relationshipLoveNarrative',
    '관계와 연애 — 어떤 사람에게 마음이 열리고 닫히는가 (독립 장)',
    ['인간관계 스타일', '편한 사람 유형 / 지치는 사람 유형',
     '연애에서 마음이 열리는 방식', '마음이 닫히는 방식',
     '결혼/장기 관계에서 중요한 조건', '갈등이 생기는 방식',
     '잘 맞는 관계 운영법', '단정 금지 (relationshipStatus 반영)'],
    ['직업/돈 상세', '미래 3년'],
    ['repeatedPatternNarrative의 관계 패턴을 같은 표현으로 반복 금지 — 여긴 스타일'],
    '관계와 연애 — 마음의 결, 신뢰가 만들어지는 방식 중심'
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

// ============================================================
// Coverage Rule — 각 장이 반드시 흡수해야 할 V4 데이터/서사 요소
// 분량(글자 수)을 강제하지 않고 "무엇이 빠지면 안 되는지"만 강제.
// validator가 이 규칙을 보고 missing-required-data-source / underdeveloped-section 판정.
// ============================================================
export function buildNarrativeCoverageRequirements(): NarrativeCoverageRequirement[] {
  return [
    {
      sectionId: 'openingDefinition',
      requiredDataSources: [
        'identityKeywords',
        'specialPoints',
        'dayMaster',
      ],
      requiredNarrativeElements: [
        '한 줄 정의(너무 일반적이지 않게)',
        '핵심 키워드 3~5개를 문장 안에 자연스럽게',
        '이 사주가 눈에 띄는 짧은 이유(가장 강한 specialPoint 1~2개 흡수)',
        '겉과 속의 결 차이가 드러나는 도입',
      ],
      optionalNarrativeElements: [
        '대표 십성/오행을 일상어로 한 줄 풀이',
      ],
      forbiddenShortcuts: [
        '위기에서 쉽게 꺾이지 않는 힘',
        '안정성과 신뢰를 중시하는',
        '강한 사람입니다',
        '특별한 사주를 타고난',
        '상위 1%',
        '키워드 1.', '키워드 2.',
      ],
    },
    {
      sectionId: 'lifeStructureNarrative',
      requiredDataSources: [
        'dayMaster',
        'elementStrength',
        'tenGods',
        'specialPoints',
      ],
      requiredNarrativeElements: [
        '일간을 쉬운 비유로 풀이(예: 무토 → 큰 산/넓은 땅)',
        '강한 오행/십성이 성격에 어떻게 나타나는지',
        '겉으로 보이는 모습과 실제 내면의 차이',
        '주변이 오해하기 쉬운 부분',
        '본인이 스스로 힘들어할 가능성',
      ],
      optionalNarrativeElements: [
        '지장간/숨은 결의 가벼운 비유 풀이',
        '초년·가족 흔적(단정 금지, "~였을 가능성")',
      ],
      forbiddenShortcuts: [
        '어린 시절부터 책임감이 강했던',
        '특별한 재능을 가지고 태어난',
        '함정 1.', '함정 2.',
        '실제 장면:', '벗어나는 방법:',
      ],
    },
    {
      sectionId: 'repeatedPatternNarrative',
      requiredDataSources: [
        'lifeTraps',
        'timingAnchors',
        'combinationsAndConflicts',
      ],
      requiredNarrativeElements: [
        '반복되는 핵심 패턴 2가지 이상을 이야기처럼',
        '일·관계·가족·돈 중 최소 2개 영역에서 어떻게 나타나는지',
        '특정 시기(timingAnchors)는 "~였을 수 있어요" 톤으로 짧게',
        '"당신이 나쁘다"가 아니라 "이 구조가 이렇게 작동한다"',
      ],
      optionalNarrativeElements: [
        '벗어나는 방향(체크리스트 X, 줄글)',
      ],
      forbiddenShortcuts: [
        '2015년에 반드시',
        '2024년에 무조건',
        '조언을 구하세요',
        '도움을 요청하세요',
      ],
    },
    {
      sectionId: 'careerTalentNarrative',
      requiredDataSources: [
        'lifeWeapons',
        'careerSpecificAnalysis.topCareerMatches',
        'careerSpecificAnalysis.bestWorkStyle',
        'careerSpecificAnalysis.avoidCareerEnvironments',
      ],
      requiredNarrativeElements: [
        '핵심 재능(이 사주의 강점) 한 줄',
        '그 능력이 잘 발휘되는 업무 환경',
        '구체 직업군 3개 이상 자연스럽게(문장 속에, 산업 2개 이상)',
        '피해야 할 업무 환경 한두 가지',
        '리더십 스타일',
        '같이 일하면 좋은 사람 유형',
        '이직/독립/프리랜서 가능성 조건부 언급',
      ],
      optionalNarrativeElements: [
        '결과로 인정받는 환경 vs 보고/눈치 중심 환경',
      ],
      forbiddenShortcuts: [
        '추천 직업군:',
        '피해야 할 환경:',
      ],
    },
    {
      sectionId: 'moneyMonetizationNarrative',
      requiredDataSources: [
        'careerSpecificAnalysis.moneyMakingStyle',
        'lifeWeapons',
      ],
      requiredNarrativeElements: [
        '돈이 붙는 방식 (월급형/전문성형/프로젝트형/사업형 중 어디에 가까운지)',
        '돈이 새는 패턴 (능력 무료 제공, 계약 부재 등)',
        '수익화 방식 (서비스/상품/콘텐츠/컨설팅 등 구체)',
        '가격표·작업 범위·정산 기준 같은 운영 가이드',
        '프리랜서/1인 사업 가능성 조건부',
      ],
      optionalNarrativeElements: [
        '작은 단위 검증 → 반복 가능한 수익 구조',
      ],
      forbiddenShortcuts: [
        '시장 타이밍에 맞춰 거래',
        '가격 흐름을 보고 매매',
        '트레이딩이 잘 맞',
        '주식 투자에 적합',
        '빠른 수익을 노리',
      ],
    },
    {
      sectionId: 'relationshipLoveNarrative',
      requiredDataSources: [
        'relationshipPattern',
        'userContext',
      ],
      requiredNarrativeElements: [
        '인간관계 스타일 (편한 사람 vs 지치는 사람)',
        '연애에서 마음이 열리는 방식',
        '마음이 닫히는 방식',
        '장기 관계/결혼에서 중요한 조건 (단정 금지)',
        '갈등이 생기는 방식',
        '잘 맞는 관계 운영법 (서운함 작을 때 신호 등)',
      ],
      optionalNarrativeElements: [
        '말의 빈도보다 행동의 일관성 결',
      ],
      forbiddenShortcuts: [
        '소통이 중요합니다',
        '서로를 이해해야',
      ],
    },
    {
      sectionId: 'futureFlowNarrative',
      requiredDataSources: [
        'futureTimingAnalysis.years',
        'fortuneTriggers',
      ],
      requiredNarrativeElements: [
        '각 연도(20XX)의 핵심 주제가 명확히 다름',
        '연도마다 실제로 생길 수 있는 사건 유형',
        '연도마다 잡아야 할 것과 조심할 것',
        '전년도/다음 연도와의 차이가 본문에서 드러남',
      ],
      optionalNarrativeElements: [
        '도입/마무리 한 단락(3년 흐름 요약)',
      ],
      forbiddenShortcuts: [
        '기회/주의/행동',
        '학습과 자격이 누적되는 해',
        '학습과 자격이 누적됩니다',
      ],
    },
    {
      sectionId: 'finalStrategyNarrative',
      requiredDataSources: [
        'fortuneTriggers.fortuneActivatingChoices',
        'fortuneTriggers.fortuneBlockingChoices',
        'lifeWeapons',
        'lifeTraps',
      ],
      requiredNarrativeElements: [
        '앞 장들을 결론으로 압축(반복 X)',
        '일·돈·관계·멘탈·선택 기준이 자연스럽게 들어감',
        '마지막 한 문장은 저장하고 싶을 정도로 기억에 남게',
      ],
      optionalNarrativeElements: [
        '선택 기준(어떤 자리/관계에 OK를 할지)',
      ],
      forbiddenShortcuts: [
        '긍정적인 결과를 가져올',
        '행복한 삶을 살게',
        '잘 살아갈 수 있을',
        '협업을 통해 더 나은 결과',
        '항상 최선을 다하면',
      ],
    },
  ];
}
