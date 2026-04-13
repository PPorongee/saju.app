import { CG, JJ, OH_CG, OH_ICON } from './saju-calc';

export interface DailyFortune {
  date: string;
  dayStem: string;
  dayBranch: string;
  element: string;
  elementIcon: string;
  fortune: string;
  luckyColor: string;
  luckyDirection: string;
  score: number;
}

function getTodayDayPillar(): { stem: number; branch: number } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth() + 1;
  const d = now.getDate();
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  return { stem: (jdn + 9) % 10, branch: (jdn + 1) % 12 };
}

const FORTUNES_KO = [
  '오늘은 새로운 시작에 좋은 날이에요',
  '차분하게 계획을 세우면 좋은 결과가 있어요',
  '주변 사람과의 대화에서 좋은 기운을 받을 수 있어요',
  '금전적으로 신중한 판단이 필요한 날이에요',
  '건강에 특별히 신경 쓰면 좋은 하루예요',
  '창의적인 아이디어가 떠오르는 날이에요',
  '인내심을 가지면 큰 보상이 따라와요',
  '새로운 만남이 행운을 가져올 수 있어요',
  '오늘은 쉬어가며 에너지를 충전하세요',
  '결단력이 필요한 중요한 순간이 올 수 있어요',
];

const FORTUNES_EN = [
  'A great day for new beginnings',
  'Calm planning brings good results today',
  'Good energy from conversations with people around you',
  'Financial prudence is needed today',
  'Pay special attention to your health today',
  'Creative ideas will come naturally today',
  'Patience brings great rewards',
  'New encounters may bring luck',
  'Take time to rest and recharge today',
  'An important decision moment may arise',
];

const COLORS_KO = ['파란색', '빨간색', '노란색', '흰색', '검정색', '초록색', '보라색', '주황색', '분홍색', '하늘색'];
const COLORS_EN = ['Blue', 'Red', 'Yellow', 'White', 'Black', 'Green', 'Purple', 'Orange', 'Pink', 'Sky blue'];
const DIRS_KO = ['동쪽', '서쪽', '남쪽', '북쪽', '동남쪽', '서남쪽', '동북쪽', '서북쪽'];
const DIRS_EN = ['East', 'West', 'South', 'North', 'Southeast', 'Southwest', 'Northeast', 'Northwest'];

export function getDailyFortune(lang: string = 'ko'): DailyFortune {
  const { stem, branch } = getTodayDayPillar();
  const element = OH_CG[stem];
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  const fIdx = (stem * 3 + branch * 7) % 10;
  const cIdx = (stem + branch) % 10;
  const dIdx = (stem * 2 + branch) % 8;
  const score = (stem + branch) % 5 + 1;

  return {
    date: dateStr,
    dayStem: CG[stem],
    dayBranch: JJ[branch],
    element,
    elementIcon: OH_ICON[element] || '✨',
    fortune: lang === 'en' ? FORTUNES_EN[fIdx] : FORTUNES_KO[fIdx],
    luckyColor: lang === 'en' ? COLORS_EN[cIdx] : COLORS_KO[cIdx],
    luckyDirection: lang === 'en' ? DIRS_EN[dIdx] : DIRS_KO[dIdx],
    score,
  };
}
