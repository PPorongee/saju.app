// 궁합 리포트 Content Ledger — 11개 섹션.
// GPT가 섹션 역할을 침범하지 못하게 한다.

import type { ContentLedgerEntry, LedgerSectionId } from '../../report/sajuReportSchema';

// 궁합 전용 섹션 id (개인사주 ledger와 키 분리)
export type CompatibilitySectionId =
  | 'relationshipCard' | 'archetype' | 'overview' | 'keywords'
  | 'attraction' | 'conflict' | 'choices' | 'questions'
  | 'futureFlow' | 'practicalGuide' | 'evidence';

// 호환: 개인사주 LedgerSectionId과 다른 키지만 같은 ContentLedgerEntry 형태 사용
// sectionId 필드는 string으로 자유, 단 LedgerSectionId 타입은 좁아서 캐스팅.
export function buildCompatibilityContentLedger(): ContentLedgerEntry[] {
  // 타입 시스템상 LedgerSectionId 좁아 캐스팅이 필요한 것을 회피하기 위해
  // 각 entry를 만들 때 sectionId를 string으로 받는 헬퍼 사용
  const entries: ContentLedgerEntry[] = [];

  push(entries, 'relationshipCard',
    '두 사람의 팩트 요약',
    ['A/B 일간', 'A/B 일주', '현재 대운', '관계 유형', '핵심 끌림 포인트', '핵심 충돌 포인트'],
    ['긴 해석', '행동 전략'],
    [],
    '두 사람의 기본 정보');

  push(entries, 'archetype',
    'SNS 공유용 관계 이름',
    ['관계 이름', '관계 키워드', '밝은 면', '그림자', '이 관계를 살리는 한 가지'],
    ['점수', '희소성 단정', '운명 확정 표현'],
    [],
    '이 관계를 한 문장으로 정의');

  push(entries, 'overview',
    '관계 전체 예고편',
    ['관계 작동 방식', '가장 큰 끌림', '가장 큰 충돌', '핵심 조언 한 줄'],
    ['10문항 상세 답변 미리 말하기', '연도별 상세 흐름'],
    ['아키타입 섹션의 결론 문장을 그대로 반복 금지'],
    '이 관계는 어떤 구조인가');

  push(entries, 'keywords',
    '관계 분위기 키워드',
    ['관계 키워드 5개', '각 2~3문장 짧은 설명'],
    ['장황한 조언', '연도별 운'],
    ['overview의 결론을 그대로 반복 금지'],
    '이 관계를 설명하는 키워드');

  push(entries, 'attraction',
    '끌림 구조 분석',
    ['왜 신경 쓰이는지', '어떤 점이 매력인지', '어떤 욕구를 건드리는지', '끌림의 그림자'],
    ['상대 마음 단정', '운명의 상대 표현'],
    ['키워드 섹션의 라벨을 그대로 반복 금지'],
    '왜 서로 신경 쓰이는가');

  push(entries, 'conflict',
    '반복 충돌 분석',
    ['싸움의 시작점', '서운함의 패턴', '감정 표현 차이', '회복 방식 차이', '관계 유형별 현실 갈등'],
    ['이별/관계 종결 단정', '한쪽 악역화'],
    ['끌림 섹션의 그림자 문장을 거의 그대로 반복 금지'],
    '어디서 반복적으로 어긋나는가');

  push(entries, 'choices',
    '관계 행동 전략 — 살리는 선택 / 망치는 선택',
    ['관계 유형별 실제 행동', '대화법', '거리감 조절', '돈/책임/역할 조율', '회복 룰'],
    ['성격 설명 반복', '추상적 조언'],
    ['충돌 섹션의 원인 설명을 그대로 반복 금지'],
    '무엇을 해야 하는가');

  push(entries, 'questions',
    '관계 유형별 상세 답변',
    ['relationshipType에 맞는 질문 답변만', '돈·일·감정·미래 별 구체 풀이'],
    ['다른 관계 유형의 질문 섞기', '앞 섹션 문장 복붙'],
    ['앞 섹션의 결론 문장을 같은 표현으로 반복 금지'],
    '관계 유형별 궁금증 해결');

  push(entries, 'futureFlow',
    '관계 타이밍',
    ['연도별 관계 주제', '가까워지는 시기', '조율이 필요한 시기', '전환 가능성'],
    ['결혼/이별/재회 단정', '연도별 사건 단정'],
    ['9번 미래 문항에서 한 결론을 그대로 반복 금지'],
    '언제 관계 주제가 강해지는가');

  push(entries, 'practicalGuide',
    '현실 전략 체크리스트',
    ['대화', '거리감', '돈/책임', '갈등 회복', '장기 유지'],
    ['앞 내용 장황한 반복', '새로운 명리 해석 추가'],
    ['choices 섹션 행동 리스트를 같은 문장으로 반복 금지'],
    '이 관계를 어떻게 잘 쓸 것인가');

  push(entries, 'evidence',
    '명리 근거',
    ['A/B 원국', '일간 관계', '일지 관계', '오행 보완', '십성 상호작용', '용신/기신 상호작용', '합충형파해', '대운/세운'],
    ['감성 문장'],
    [],
    '해석의 근거');

  return entries;
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
    sectionId: id as LedgerSectionId, // 궁합 전용 id는 LedgerSectionId 타입 범위 밖이지만 GPT 입력에서는 자유 문자열 — 런타임에 문제 없음.
    primaryPurpose: purpose,
    allowedTopics: allowed,
    forbiddenTopics: forbidden,
    mustNotRepeatFromPreviousSections: mustNotRepeat,
    keyMessage,
  });
}
