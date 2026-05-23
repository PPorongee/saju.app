// Content Ledger — 섹션별 역할/허용/금지/중복 방지 키 정의.
// 프롬프트에 함께 전달해서 GPT가 섹션 역할을 침범하지 못하게 한다.

import type {
  ContentLedger, ContentLedgerEntry,
  IdentityKeyword, SpecialPoint, LifeWeapon, LifeTrap,
  FortuneTriggerAnalysis, CareerSpecificAnalysis,
  FutureTimingAnalysis,
} from './sajuReportSchema';

interface Args {
  identityKeywords: IdentityKeyword[];
  specialPoints: SpecialPoint[];
  lifeWeapons: LifeWeapon[];
  lifeTraps: LifeTrap[];
  fortuneTriggers: FortuneTriggerAnalysis;
  careerSpecificAnalysis: CareerSpecificAnalysis;
  futureTimingAnalysis: FutureTimingAnalysis;
}

export function buildContentLedger(args: Args): ContentLedger {
  const entries: ContentLedgerEntry[] = [];

  entries.push({
    sectionId: 'summary',
    primaryPurpose: '리포트 전체의 예고편 — 핵심 방향, 가장 큰 강점·주의점 1개씩, 직업/돈/흐름 한 줄 힌트',
    allowedTopics: [
      '이 사주의 핵심 방향', '가장 큰 강점 1개', '가장 큰 주의점 1개',
      '직업/돈 방향 한 줄 힌트', '앞으로 흐름 한 줄 힌트',
    ],
    forbiddenTopics: [
      '직업군 세부 추천 (4번·7번 섹션 소관)',
      '돈 버는 방식 상세 (7번 소관)',
      '3년 연도별 분석 (8번 소관)',
      '함정 상세 설명 (5번 소관)',
    ],
    mustNotRepeatFromPreviousSections: [],
    keyMessage: '이 사주를 한 호흡으로 요약',
  });

  entries.push({
    sectionId: 'keywords',
    primaryPurpose: '자기이해용 라벨 — 사용자를 설명하는 정체성 키워드',
    allowedTopics: ['성향 라벨', '짧은 생활 장면', '자기이해 설명'],
    forbiddenTopics: ['직업군 추천', '연도별 운', '구체 행동 전략', '긴 조언'],
    mustNotRepeatFromPreviousSections: ['전체 요약에서 이미 쓴 표현 그대로 반복 금지'],
    keyMessage: '이 사람을 설명하는 사주적 키워드',
  });

  entries.push({
    sectionId: 'specialPoints',
    primaryPurpose: '이 사주가 눈에 띄는 구조 설명',
    allowedTopics: ['특별 구조', '체감되는 이유', '잘 쓰면 좋은 점', '과하면 생기는 그림자'],
    forbiddenTopics: [
      '직업군 목록 (4번·7번 소관)',
      '장기 행동 전략 (6번·9번 소관)',
      '돈 버는 방식 상세 (7번 소관)',
      '10문항 답변 전체를 미리 말하기',
    ],
    mustNotRepeatFromPreviousSections: ['키워드 섹션의 라벨을 그대로 다시 나열 금지'],
    keyMessage: '왜 이 사주가 눈에 띄는가',
  });

  entries.push({
    sectionId: 'lifeWeapons',
    primaryPurpose: '현실에서 써먹을 수 있는 강점 — 직무·환경·활용법',
    allowedTopics: [
      '강점이 발휘되는 실제 장면', '잘 맞는 직무', '잘 맞는 일하는 환경',
      '더 강하게 쓰는 방법', '과하게 쓰면 생기는 그림자',
    ],
    forbiddenTopics: [
      '사주의 특별함 다시 설명',
      '인생 전반의 성격 설명 반복',
      '앞으로 3년 운세 설명 (8번 소관)',
    ],
    mustNotRepeatFromPreviousSections: ['특별 포인트 섹션의 결론 문장을 다시 반복 금지'],
    keyMessage: '어디서 잘 쓰이는가',
  });

  entries.push({
    sectionId: 'lifeTraps',
    primaryPurpose: '반복되는 문제 패턴 — 원인·장면·타이밍·피해야 할 환경·벗어나는 방법',
    allowedTopics: [
      '왜 이 패턴이 생기는지', '실제 장면', '피해야 할 환경',
      '패턴이 강해지는 타이밍 앵커', '벗어나는 방법',
    ],
    forbiddenTopics: [
      '무기 섹션의 장점 반복',
      '운 선택 섹션의 행동 리스트 반복',
      '3년 흐름 상세 설명 (8번 소관)',
    ],
    mustNotRepeatFromPreviousSections: ['무기 섹션의 그림자 문장을 거의 그대로 반복 금지'],
    keyMessage: '어디서 꼬이는가',
  });

  entries.push({
    sectionId: 'fortuneChoices',
    primaryPurpose: '구체 행동 전략 — 지금부터 할 행동 / 줄여야 할 행동',
    allowedTopics: [
      '지금 할 수 있는 행동', '피해야 할 반복 행동',
      '수익화 행동', '관계 행동', '일하는 방식 조정',
    ],
    forbiddenTopics: [
      '성격 설명 반복',
      '함정의 원인 반복',
      '직업군 추천 장황하게 반복',
    ],
    mustNotRepeatFromPreviousSections: ['함정 섹션의 escapeStrategy 문장을 그대로 다시 쓰기 금지'],
    keyMessage: '무엇을 해야 하는가',
  });

  entries.push({
    sectionId: 'questions',
    primaryPurpose: '주제별 상세 답변 — 돈/직업/관계/미래/반복 패턴 깊게',
    allowedTopics: [
      '각 질문에 맞는 상세 풀이',
      '돈 문항: 수익화 방식 (moneyMakingStyle 배열 기반)',
      '직업 문항: 업계·직무·조직 환경 (careerSpecificAnalysis 배열 기반)',
      '반복 패턴 문항: 타이밍 앵커',
      '미래 문항: 앞으로 3년 흐름의 핵심',
    ],
    forbiddenTopics: [
      '앞 섹션 문장 복붙',
      '같은 조언 반복',
      '앞에서 이미 한 설명을 다시 길게 풀기',
    ],
    mustNotRepeatFromPreviousSections: [
      '무기 섹션과 직업 문항에서 같은 직무·업계 단어를 거의 동일 문장으로 반복 금지',
      '함정 섹션과 반복 패턴 문항에서 같은 결론을 같은 표현으로 반복 금지',
    ],
    keyMessage: '주제별로 어떻게 나타나는가',
  });

  entries.push({
    sectionId: 'futureThreeYears',
    primaryPurpose: '시기별 전략 — 연도별 키워드, 사건 유형, 잡아야 할 것, 피해야 할 것',
    allowedTopics: [
      '연도별 핵심 키워드 (futureTimingAnalysis.years 기반)',
      '생길 수 있는 사건 유형',
      '직업/돈/관계/이동/공부/가족 중 영향이 큰 영역',
      '잡아야 할 것', '피해야 할 것',
    ],
    forbiddenTopics: [
      '성격 설명 반복',
      '직업군 추천 반복',
      '무기/함정 설명 반복',
    ],
    mustNotRepeatFromPreviousSections: ['9번 문항(앞으로 3년)에서 이미 한 결론을 같은 표현으로 다시 쓰기 금지'],
    keyMessage: '언제 강해지는가',
  });

  entries.push({
    sectionId: 'practicalGuide',
    primaryPurpose: '최종 실행 체크리스트 — 일·돈·관계·멘탈·선택 기준',
    allowedTopics: ['일', '돈', '관계', '멘탈', '선택 기준'],
    forbiddenTopics: [
      '앞 내용을 다시 장황하게 설명',
      '새로운 사주 해석 추가',
      '이미 나온 조언을 같은 표현으로 반복',
    ],
    mustNotRepeatFromPreviousSections: [
      '운 선택 섹션의 행동 리스트를 거의 그대로 반복 금지',
      '직업 문항의 업계 추천을 같은 단어로 다시 나열 금지',
    ],
    keyMessage: '지금부터 어떻게 적용할 것인가',
  });

  return entries;
}
