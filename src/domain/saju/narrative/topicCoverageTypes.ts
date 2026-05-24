// 서사형 개인사주 — TopicCoverageMap (2026-05).
//
// 섹션 수를 늘리지 않고, 본문 안에서 "다뤄야 할 주제"가 자연스럽게 녹았는지 검사하기 위한 맵.
// builder가 분석 데이터를 보고 어떤 주제가 required인지 결정하면,
// validator가 본문에서 그 주제들이 실제 흡수됐는지 검사한다.

export type NarrativeTopicKey =
  | 'oneLineDefinition'
  | 'coreKeywords'
  | 'outerInnerContrast'
  | 'specialPoints'
  // 기질·내면
  | 'personality'
  | 'innerWorld'
  | 'emotionalProcessing'
  | 'socialMask'
  | 'selfProtectionPattern'
  // 반복 패턴·관계
  | 'repeatedPattern'
  | 'workPattern'
  | 'relationshipPattern'
  | 'relationshipStyle'
  | 'loveMarriageStyle'
  | 'familyEarlyPattern'
  // 현실 작동
  | 'career'
  | 'workEnvironment'
  | 'avoidWorkEnvironment'
  | 'moneyStyle'
  | 'moneyLeakPattern'
  | 'independenceOrBusinessPotential'
  // 타이밍·미래·전략
  | 'pastTimingAnchor'
  | 'futureThreeYears'
  | 'practicalStrategy';

/** true=본문에 반드시 흡수, false=skip (데이터 없거나 컨텍스트상 부적합) */
export type TopicCoverageMap = Record<NarrativeTopicKey, boolean>;

// ============================================================
// 각 토픽이 본문에 흡수됐는지 검사할 키워드 (validator 사용)
// 정규식 또는 문자열 — 하나라도 매칭되면 흡수된 것으로 본다.
// ============================================================
export const TOPIC_KEYWORDS: Record<NarrativeTopicKey, Array<string | RegExp>> = {
  oneLineDefinition: ['한 문장으로', '한문장으로', '한 마디로'],
  coreKeywords: [], // identityKeywords의 matchTokens로 별도 검사
  outerInnerContrast: ['겉으로', '겉모습', '안쪽', '안쪽에는', '실제 내면', '겉과 속', '드러내지 않'],
  specialPoints: [], // plan.mustUseFacts의 specialPoint matchTokens로 별도 검사

  personality: ['성격', '기질', '성향', '결'],
  innerWorld: ['속으로', '내면', '내심', '마음속', '안에서는'],
  emotionalProcessing: ['감정', '곱씹', '오래 기억', '참다', '참고'],
  socialMask: ['주변에서는', '주변에서 보', '남들이 보', '겉으로는'],
  selfProtectionPattern: ['거리 조절', '기준선', '선을 넘', '거리를'],

  repeatedPattern: ['반복', '패턴'],
  workPattern: ['직장에서', '회사에서', '업무에서', '일에서는', '직장이나', '직무에서'],
  relationshipPattern: ['관계에서는', '관계에서도', '인간관계', '사람과의'],
  relationshipStyle: ['관계', '편한 사람', '지치는 사람', '관계 스타일'],
  loveMarriageStyle: ['연애', '결혼', '연인', '파트너', '장기 관계', '가까운 관계'],
  familyEarlyPattern: ['가족', '초년', '어릴 때', '부모', '집안', '어렸을 때', '어린 시절'],

  career: ['직업', '직무', '업계', '커리어'],
  workEnvironment: ['업무 환경', '일하는 환경', '환경에서 잘', '조직 환경'],
  avoidWorkEnvironment: ['피해야 할', '지칠 수', '맞지 않', '쉽게 지'],
  moneyStyle: ['돈은', '수익', '보상', '돈이 붙', '돈의 흐름'],
  moneyLeakPattern: ['돈이 새', '무료로', '서비스로 만들지', '능력만 쓰고'],
  independenceOrBusinessPotential: ['프리랜서', '독립', '사업', '컨설팅', '1인', '나만의'],

  pastTimingAnchor: [/\b20\d{2}년?/, '시기에는', '그때는', '그 무렵', '그 시기'],
  futureThreeYears: [/\b202[6-9]/, '앞으로 3년', '내년', '올해'],
  practicalStrategy: ['결국', '핵심은', '사용법', '쓸 때', '쓰는 방향'],
};

// ============================================================
// "프리미엄 리포트로서 반드시 있어야 하는" 핵심 토픽들 (Validator 강제)
// ============================================================
export const REQUIRED_TOPICS_HARD: NarrativeTopicKey[] = [
  'outerInnerContrast',
  'specialPoints',
  'repeatedPattern',
  'career',
  'moneyStyle',
  'relationshipStyle',
  'loveMarriageStyle',
  'familyEarlyPattern',
  'pastTimingAnchor',
  'futureThreeYears',
  'practicalStrategy',
];

// ============================================================
// 마지막 한 문장 후보 (스타일 시드 — GPT에 그대로 복사하지 말고 톤·구조 모방)
// ============================================================
export const FINAL_LINE_CANDIDATES: string[] = [
  '이 사주는 더 강해져야 좋아지는 사주가 아니라, 이미 강한 힘을 어디까지 쓰고 어디서 나눌지 배울 때 좋아지는 사주입니다.',
  '당신의 운은 혼자 버틸 때보다, 기준을 세우고 사람들과 역할을 나눌 때 더 크게 열립니다.',
  '이 사주의 핵심은 끝까지 버티는 힘이 아니라, 그 힘을 오래 쓸 수 있게 나누는 지혜입니다.',
  '이미 충분히 강한 사람에게 필요한 건 더 큰 책임이 아니라, 그 책임을 오래 감당할 수 있는 구조입니다.',
  '이 사주는 혼자 버티는 힘보다, 기준을 세우고 함께 굴러가게 만드는 힘을 배울 때 더 크게 열립니다.',
];
