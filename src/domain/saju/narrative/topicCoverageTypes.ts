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
  | 'pastTimingAnchor'
  // 일·재능 (4장)
  | 'career'
  | 'talent'
  | 'workEnvironment'
  | 'avoidWorkEnvironment'
  | 'leadershipStyle'
  | 'coworkerFit'
  | 'independenceOrBusinessPotential'
  // 돈·수익화 (5장)
  | 'moneyStyle'
  | 'monetizationStyle'
  | 'moneyLeakPattern'
  | 'pricingAndContractAdvice'
  | 'productizationAdvice'
  // 관계·연애 (6장)
  | 'loveStyle'
  | 'marriageLongTermStyle'
  | 'heartOpeningPattern'
  | 'heartClosingPattern'
  | 'conflictPattern'
  // 타이밍·미래·전략
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
  pastTimingAnchor: [/\b20\d{2}년?/, '시기에는', '그때는', '그 무렵', '그 시기'],

  // 일·재능
  career: ['직업', '직무', '업계', '커리어'],
  talent: ['재능', '능력', '실력', '강점'],
  workEnvironment: ['업무 환경', '일하는 환경', '환경에서 잘', '조직 환경'],
  avoidWorkEnvironment: ['피해야 할', '지칠 수', '맞지 않', '쉽게 지'],
  leadershipStyle: ['리더십', '리더', '이끌', '주도하'],
  coworkerFit: ['동료', '같이 일', '함께 일', '팀원'],
  independenceOrBusinessPotential: ['프리랜서', '독립', '사업', '컨설팅', '1인', '나만의'],

  // 돈·수익화
  moneyStyle: ['돈은', '수익', '보상', '돈이 붙', '돈의 흐름'],
  monetizationStyle: ['수익화', '월급형', '전문성형', '프로젝트형', '사업형', '컨설팅', '강의', '교육 콘텐츠'],
  moneyLeakPattern: ['돈이 새', '무료로', '서비스로 만들지', '능력만 쓰고'],
  pricingAndContractAdvice: ['가격', '계약', '정산', '작업 범위', '보상 기준'],
  productizationAdvice: ['상품', '템플릿', '제안서', '포트폴리오', '결과물'],

  // 관계·연애
  loveStyle: ['연애', '연인', '마음이 열', '신뢰가 열', '뜨겁게'],
  marriageLongTermStyle: ['결혼', '장기 관계', '오래 가는', '역할 분담', '생활의 기준'],
  heartOpeningPattern: ['마음이 열', '신뢰가 열', '믿을 만한', '행동이 꾸준', '약속을 지'],
  heartClosingPattern: ['마음이 닫', '거리 조절', '신뢰가 깎', '서운'],
  conflictPattern: ['갈등', '서운', '오해', '말다툼'],

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
  'workEnvironment',
  'avoidWorkEnvironment',
  'moneyStyle',
  'monetizationStyle',
  'moneyLeakPattern',
  'pricingAndContractAdvice',
  'relationshipStyle',
  'loveStyle',
  'heartOpeningPattern',
  'heartClosingPattern',
  'familyEarlyPattern',
  'practicalStrategy',
];

// ============================================================
// 마지막 한 문장 후보 (스타일 시드 — GPT에 그대로 복사하지 말고 톤·구조 모방)
// ============================================================
// R1 (2026-06): 기존 후보 5개가 전부 "혼자 버티기 vs 기준·역할 나누기"로 수렴 →
//   특정 사주형(신강·양인)에만 맞는 결론을 모든 차트에 강제했다. 중립 톤 시드로 교체.
//   ※ 이건 "그대로 복사 금지" 시드일 뿐 — 실제 마지막 문장은 각 사주의 일간/신살/대운에서 와야 함.
export const FINAL_LINE_CANDIDATES: string[] = [
  '결국 이 사주는 타고난 결을 억지로 바꾸는 게 아니라, 그 결을 어디에 쓸지 정할 때 가장 잘 풀립니다.',
  '이 사주의 답은 더 애쓰는 데 있지 않고, 자기 결이 살아나는 자리와 사람을 고르는 데 있습니다.',
  '당신의 운은 자신을 증명하려 할 때보다, 이미 가진 결을 제대로 쓰는 자리에 설 때 트입니다.',
  '이 사주는 빠르게 가는 것보다 자기 속도를 지킬 때 멀리 가는 구조입니다.',
  '결국 중요한 건 무엇을 더 갖추느냐가 아니라, 지금 가진 결을 어떤 자리에서 쓰느냐입니다.',
];
