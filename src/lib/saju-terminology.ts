/**
 * Centralized Saju Terminology Dictionary
 *
 * Single source of truth for all user-facing technical terms.
 * Every major 명리학 term shown to users must have an entry here.
 * The LLM prompt system and UI both consume this dictionary.
 */

export interface TermEntry {
  /** Technical term in Korean */
  term: string;
  /** Technical term in Chinese characters (optional) */
  hanja?: string;
  /** Short plain-language explanation (1 line, Korean) */
  shortKo: string;
  /** Short plain-language explanation (1 line, English) */
  shortEn: string;
  /** Why this matters to the user (Korean) */
  whyKo: string;
  /** Why this matters to the user (English) */
  whyEn: string;
  /** Longer explanation for detail mode (Korean) */
  detailKo: string;
  /** Longer explanation for detail mode (English) */
  detailEn: string;
  /** Whether this concept is interpretive (vs deterministic) */
  interpretive: boolean;
  /** Doctrinal confidence: 'high' | 'medium' | 'low' */
  confidence: 'high' | 'medium' | 'low';
}

export const SAJU_TERMS: Record<string, TermEntry> = {
  격국: {
    term: '격국',
    hanja: '格局',
    shortKo: '사주의 큰 구조를 보는 기준',
    shortEn: 'The structural pattern of your birth chart',
    whyKo: '성격, 적성, 인생 방향의 큰 틀을 결정하는 기본 구조예요.',
    whyEn: 'It determines the broad framework of your personality, aptitude, and life direction.',
    detailKo: '월지(태어난 달의 지지)에 담긴 기운이 일간(나)과 어떤 관계인지에 따라 결정됩니다. 정관격, 편재격, 식신격 등 여러 유형이 있어요.',
    detailEn: 'Determined by the relationship between the month branch energy and your day master. Types include Correct Official, Partial Wealth, Eating God patterns, etc.',
    interpretive: true,
    confidence: 'medium',
  },
  용신: {
    term: '용신',
    hanja: '用神',
    shortKo: '사주의 균형을 잡아주는 핵심 요소',
    shortEn: 'The key balancing element in your chart',
    whyKo: '이 기운을 잘 활용하면 삶의 흐름이 안정되고 좋아질 수 있어요.',
    whyEn: 'Harnessing this energy can stabilize and improve your life flow.',
    detailKo: '사주에서 부족하거나 필요한 오행(목/화/토/금/수)을 보완해주는 가장 중요한 요소입니다. 억부법(강하면 억제, 약하면 도움)과 조후법(계절 균형)으로 결정해요.',
    detailEn: 'The most important element that compensates for what your chart lacks. Determined by the suppress/support method and seasonal balance method.',
    interpretive: true,
    confidence: 'medium',
  },
  기신: {
    term: '기신',
    hanja: '忌神',
    shortKo: '균형을 흐릴 수 있는 요소',
    shortEn: 'An element that may disrupt your chart\'s balance',
    whyKo: '이 기운이 강해지는 시기에는 조심하고 대비하면 좋아요.',
    whyEn: 'When this energy strengthens, it\'s wise to be cautious and prepared.',
    detailKo: '용신과 반대되는 개념으로, 사주의 균형을 깨뜨릴 수 있는 오행입니다. 나쁜 것이 아니라, 주의가 필요한 에너지예요.',
    detailEn: 'The opposite of the useful god — an element that can unbalance your chart. Not inherently bad, just energy that needs awareness.',
    interpretive: true,
    confidence: 'medium',
  },
  신강: {
    term: '신강',
    hanja: '身強',
    shortKo: '나의 기운이 비교적 강한 상태',
    shortEn: 'Your core energy is relatively strong',
    whyKo: '주도적이고 독립적인 성향이 강하며, 활동적인 삶에 유리해요.',
    whyEn: 'You tend to be proactive and independent, suited for an active life.',
    detailKo: '일간(나를 대표하는 천간)의 힘이 전체 사주에서 강한 편인 상태. 득령(제철), 득지(뿌리), 득세(도움)의 조건에 따라 판단해요.',
    detailEn: 'Your day master has strong support from the chart — in season, rooted, and aided by other elements.',
    interpretive: true,
    confidence: 'medium',
  },
  신약: {
    term: '신약',
    hanja: '身弱',
    shortKo: '나의 기운이 비교적 약한 상태',
    shortEn: 'Your core energy is relatively gentle',
    whyKo: '유연하고 섬세한 감각이 있으며, 협력과 조화가 강점이에요.',
    whyEn: 'You have flexibility and sensitivity, with cooperation and harmony as strengths.',
    detailKo: '일간의 힘이 약한 편이라 도움(인성, 비겁)이 필요한 구조. 약하다고 나쁜 것이 아니라, 도움을 받을 때 더 빛나는 유형이에요.',
    detailEn: 'Your day master needs support — not a weakness, but a type that shines brightest when aided.',
    interpretive: true,
    confidence: 'medium',
  },
  조후: {
    term: '조후',
    hanja: '調候',
    shortKo: '사주의 차갑고 뜨거운 기운의 균형',
    shortEn: 'The hot/cold energy balance in your chart',
    whyKo: '태어난 계절에 따라 필요한 기운이 달라요. 이 균형이 맞으면 삶이 순조로워요.',
    whyEn: 'The energy you need varies by birth season. When balanced, life flows smoothly.',
    detailKo: '겨울 태생은 따뜻한 화(火)가, 여름 태생은 시원한 수(水)가 필요합니다. 궁통보감에서 체계화된 이론으로, 계절과 오행의 관계를 봅니다.',
    detailEn: 'Winter births need warming fire, summer births need cooling water. Systematized in the Gungtongbogam classical text.',
    interpretive: false,
    confidence: 'high',
  },
  십성: {
    term: '십성',
    hanja: '十星',
    shortKo: '나와 다른 기운들의 관계를 나타내는 10가지 유형',
    shortEn: '10 relationship types between you and other energies',
    whyKo: '성격, 재물, 직업, 인간관계 등 삶의 다양한 영역을 이해하는 열쇠예요.',
    whyEn: 'The key to understanding personality, wealth, career, and relationships.',
    detailKo: '일간(나)을 기준으로 다른 천간/지지와의 오행 관계를 10가지로 분류합니다: 비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인.',
    detailEn: 'Classifies the five-element relationships from your day master into 10 types: Peer, Rob Wealth, Eating God, Hurting Officer, Partial/Correct Wealth, Partial/Correct Official, Partial/Correct Seal.',
    interpretive: false,
    confidence: 'high',
  },
  '12운성': {
    term: '12운성',
    hanja: '十二運星',
    shortKo: '기운의 성장-쇠퇴 12단계 주기',
    shortEn: '12-stage life cycle of energy',
    whyKo: '지금 나의 에너지가 어떤 단계인지 알 수 있어요.',
    whyEn: 'Shows what stage your energy is in right now.',
    detailKo: '장생→목욕→관대→건록→제왕→쇠→병→사→묘→절→태→양의 12단계로, 기운이 태어나서 성장하고 쇠퇴하는 순환을 나타냅니다.',
    detailEn: 'A 12-step cycle from Birth → Bathing → Crown → Prime → Peak → Decline → Illness → Death → Tomb → Extinction → Conception → Nurturing.',
    interpretive: false,
    confidence: 'high',
  },
  오행: {
    term: '오행',
    hanja: '五行',
    shortKo: '만물을 이루는 5가지 기본 에너지',
    shortEn: 'The 5 fundamental energies of nature',
    whyKo: '나의 사주에 어떤 에너지가 많고 부족한지 보여줘요.',
    whyEn: 'Shows which energies are abundant or lacking in your chart.',
    detailKo: '목(나무/성장), 화(불/열정), 토(흙/안정), 금(쇠/결단), 수(물/지혜). 이 다섯 기운의 균형이 사주 해석의 기본입니다.',
    detailEn: 'Wood (growth), Fire (passion), Earth (stability), Metal (decisiveness), Water (wisdom). The balance of these five energies is fundamental.',
    interpretive: false,
    confidence: 'high',
  },
  충: {
    term: '충',
    hanja: '沖',
    shortKo: '서로 부딪히는 에너지 — 변화의 계기',
    shortEn: 'Clashing energies — a catalyst for change',
    whyKo: '삶에 변화나 전환이 생길 수 있는 시기를 나타내요.',
    whyEn: 'Indicates periods of change or transition in life.',
    detailKo: '정반대 방향의 지지가 만나 에너지가 충돌하는 것. 6가지 충이 있으며(자오, 축미, 인신, 묘유, 진술, 사해), 변화의 계기가 됩니다.',
    detailEn: 'When opposite branches meet and energies collide. There are 6 clash pairs, each bringing catalysts for change.',
    interpretive: false,
    confidence: 'high',
  },
  합: {
    term: '합',
    hanja: '合',
    shortKo: '서로 끌어당기는 조화로운 에너지',
    shortEn: 'Harmonious energies that attract each other',
    whyKo: '사람이나 시기와의 좋은 인연, 조화를 나타내요.',
    whyEn: 'Represents good connections and harmony with people or periods.',
    detailKo: '천간합(5쌍), 육합(6쌍), 삼합(4조), 방합(4조) 등이 있으며, 서로 끌리고 화합하는 관계를 뜻합니다.',
    detailEn: 'Includes Heavenly Stem combinations, Six Harmonies, Triple Harmonies, and Directional Harmonies.',
    interpretive: false,
    confidence: 'high',
  },
  형: {
    term: '형',
    hanja: '刑',
    shortKo: '내적 갈등이나 시련을 나타내는 에너지',
    shortEn: 'Energy indicating inner conflict or trials',
    whyKo: '성장을 위한 시련으로, 이겨내면 더 강해질 수 있어요.',
    whyEn: 'A trial for growth — overcoming it makes you stronger.',
    detailKo: '지지 사이의 특수한 긴장 관계로, 인사신 삼형(배은), 축술미 삼형(지세), 자묘 상형(무례) 등이 있습니다.',
    detailEn: 'Special tension relationships between branches, including the Ungrateful Penalty, Domineering Penalty, and Disrespectful Penalty.',
    interpretive: false,
    confidence: 'high',
  },
  지장간: {
    term: '지장간',
    hanja: '支藏干',
    shortKo: '지지 안에 숨어있는 천간 에너지',
    shortEn: 'Hidden stem energies within each branch',
    whyKo: '겉으로 보이지 않는 내면의 잠재력을 나타내요.',
    whyEn: 'Represents hidden inner potential not visible on the surface.',
    detailKo: '12지지 각각에는 1~3개의 천간이 숨어있어요. 이 숨은 에너지까지 분석해야 사주의 전체 그림을 볼 수 있습니다.',
    detailEn: 'Each of the 12 branches contains 1-3 hidden stems. Analyzing these hidden energies reveals the full picture.',
    interpretive: false,
    confidence: 'high',
  },
  신살: {
    term: '신살',
    hanja: '神殺',
    shortKo: '사주에 나타나는 특별한 기운이나 성향 표시',
    shortEn: 'Special markers indicating unique tendencies in your chart',
    whyKo: '매력, 이동운, 학문운 등 독특한 특성을 알려줘요.',
    whyEn: 'Reveals unique traits like charm, travel fortune, or academic aptitude.',
    detailKo: '도화살(매력), 역마살(이동/변화), 화개살(예술/종교), 천을귀인(귀인운) 등 다양한 신살이 있어요. 삼명통회, 연해자평에서 유래합니다.',
    detailEn: 'Includes Peach Blossom (charm), Travel Star (movement), Noble Star (benefactors), etc. From classical texts Sammyeongtonghoei and Yeonhaejaepyeong.',
    interpretive: false,
    confidence: 'high',
  },
  대운: {
    term: '대운',
    hanja: '大運',
    shortKo: '10년 단위로 바뀌는 인생의 큰 흐름',
    shortEn: 'Major life cycles that change every 10 years',
    whyKo: '인생의 큰 전환점과 기회의 시기를 알 수 있어요.',
    whyEn: 'Shows major turning points and opportunity periods in life.',
    detailKo: '사주의 월주를 기준으로 10년 단위의 운의 흐름을 나타내는 것으로, 성별과 음양에 따라 순행/역행이 결정됩니다.',
    detailEn: 'Based on the month pillar, represents 10-year luck cycles. Direction (forward/backward) is determined by gender and yin/yang.',
    interpretive: true,
    confidence: 'medium',
  },
};

/**
 * Get a term explanation for user display.
 * Returns null if the term is not in the dictionary (fail-safe: no unexplained jargon).
 */
export function getTermExplanation(termKey: string, lang: 'ko' | 'en' = 'ko'): {
  term: string;
  short: string;
  why: string;
  detail: string;
  interpretive: boolean;
  confidence: string;
} | null {
  const entry = SAJU_TERMS[termKey];
  if (!entry) return null;
  return {
    term: entry.term,
    short: lang === 'en' ? entry.shortEn : entry.shortKo,
    why: lang === 'en' ? entry.whyEn : entry.whyKo,
    detail: lang === 'en' ? entry.detailEn : entry.detailKo,
    interpretive: entry.interpretive,
    confidence: entry.confidence,
  };
}

/**
 * Generate a terminology guide block for injection into the LLM prompt.
 * This ensures the LLM always pairs technical terms with plain explanations.
 */
export function getTerminologyPromptBlock(lang: 'ko' | 'en' = 'ko'): string {
  const isKo = lang === 'ko';
  let block = isKo
    ? '=== 전문 용어 설명 규칙 (필수!) ===\n'
    : '=== Technical Term Explanation Rules (MUST follow!) ===\n';

  block += isKo
    ? '사주 전문 용어를 사용할 때는 반드시 쉬운 설명을 함께 써줘.\n'
    : 'When using Saju technical terms, ALWAYS include a plain explanation.\n';

  block += isKo
    ? '형식: "격국(사주의 큰 구조)은..." 또는 "용신, 즉 균형을 잡아주는 핵심 요소는..."\n\n'
    : 'Format: "Gyeokguk (your chart\'s structural pattern) is..." or "Yongsin, the key balancing element, is..."\n\n';

  block += isKo ? '주요 용어 쉬운 설명:\n' : 'Key term explanations:\n';

  for (const [key, entry] of Object.entries(SAJU_TERMS)) {
    const short = isKo ? entry.shortKo : entry.shortEn;
    block += `- ${entry.term}(${entry.hanja || ''}): ${short}\n`;
  }

  block += isKo
    ? '\n처음 등장할 때 반드시 괄호 안에 쉬운 설명을 넣고, 이후에는 용어만 써도 돼.\n'
    : '\nOn first use, always include the easy explanation in parentheses. After that, the term alone is fine.\n';

  block += isKo
    ? '해석적 개념(격국, 용신, 신강/신약, 대운)은 "~으로 보여" "~경향이 있어" 형태로 표현해.\n\n'
    : 'Interpretive concepts (Gyeokguk, Yongsin, etc.) should use "appears to be" or "tends to" framing.\n\n';

  return block;
}
