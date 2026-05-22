// 천간 (天干) — 10개. 사주팔자의 위(天) 글자.

export const HEAVENLY_STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'] as const;
export type HeavenlyStem = typeof HEAVENLY_STEMS[number];

export type YinYang = 'yin' | 'yang';

export function stemByIndex(i: number): HeavenlyStem {
  return HEAVENLY_STEMS[((i % 10) + 10) % 10];
}

export function stemIndex(s: HeavenlyStem): number {
  return HEAVENLY_STEMS.indexOf(s);
}

/** 한자 → 한글 (lunar-javascript 출력 호환) */
export const HANJA_TO_STEM: Record<string, HeavenlyStem> = {
  甲: '갑', 乙: '을', 丙: '병', 丁: '정', 戊: '무',
  己: '기', 庚: '경', 辛: '신', 壬: '임', 癸: '계',
};

/** 음양 — 짝수 index = 양, 홀수 = 음 */
export function stemYinYang(s: HeavenlyStem): YinYang {
  return stemIndex(s) % 2 === 0 ? 'yang' : 'yin';
}

// 년간 → 인월의 월간 — 五虎遁訣
export const YEAR_STEM_TO_INWOL_STEM: Record<HeavenlyStem, HeavenlyStem> = {
  갑: '병', 기: '병',
  을: '무', 경: '무',
  병: '경', 신: '경',
  정: '임', 임: '임',
  무: '갑', 계: '갑',
};

// 일간 → 자시 시간 천간 — 五鼠遁訣
export const DAY_STEM_TO_JASI_STEM: Record<HeavenlyStem, HeavenlyStem> = {
  갑: '갑', 기: '갑',
  을: '병', 경: '병',
  병: '무', 신: '무',
  정: '경', 임: '경',
  무: '임', 계: '임',
};
