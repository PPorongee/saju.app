// 올해운세 "시기 포인트" — 결정론 deriver (GPT·validator 미경유).
//
// 결혼·인연·시험을 월/연 단위로 짚는다. fatalism 금지:
//   - "이때 결혼한다" 단정 X → "사주상 유리한 흐름" 톤.
//   - 배우자성: 남=재성(정/편재), 여=관성(정/편관). 미상이면 둘 다 본다.
//   - 시험/문서: 인성(정/편인). 월운 activatedTopics(연애/관계/공부)도 신호로 활용.

import type { YearlyFortuneAnalysis, YearlyRelationshipStatus } from './yearlyTypes';
import type { TenGod } from '../report/sajuReportSchema';

const WEALTH: TenGod[] = ['정재', '편재'];
const OFFICER: TenGod[] = ['정관', '편관'];
const RESOURCE: TenGod[] = ['정인', '편인'];

export interface TimingHint {
  /** 예: 결혼·관계 진전 / 새로운 인연 / 공부·시험·합격 */
  label: string;
  /** 예: ["9월", "12월", "2027년"] */
  windows: string[];
  /** 맥락 설명 (단정 X, "유리한 흐름" 톤) */
  note: string;
}
export interface YearlyTimingHints {
  relationship?: TimingHint;
  study?: TimingHint;
}

export interface TimingOpts {
  gender?: string;
  relationshipStatus?: YearlyRelationshipStatus;
  age?: number;
  studyConcern?: boolean;
}

function monthOf(startDate: string): string {
  const m = Number((startDate ?? '').slice(5, 7));
  return m >= 1 && m <= 12 ? `${m}월` : '';
}
const hasAny = (gods: (TenGod | undefined)[], set: TenGod[]) => gods.some((g) => g != null && set.includes(g));
const uniq = (arr: string[]) => Array.from(new Set(arr.filter(Boolean)));

export function buildYearlyTimingHints(a: YearlyFortuneAnalysis, opts: TimingOpts): YearlyTimingHints {
  const gender = opts.gender;
  const spouseStar = gender === 'male' ? WEALTH : gender === 'female' ? OFFICER : [...WEALTH, ...OFFICER];
  const rel = opts.relationshipStatus ?? 'unknown';
  const age = opts.age;
  const months = a.remainingMonthlyFortunes ?? [];
  const years = a.nextTwoYears ?? [];

  // ── 인연/결혼 시기 ──
  const relMonths: string[] = [];
  for (const m of months) {
    const gods = [m.monthStemTenGod, m.monthBranchTenGod, ...(m.hiddenStemTenGods ?? [])];
    const topics = m.activatedTopics ?? [];
    if (hasAny(gods, spouseStar) || topics.includes('연애') || topics.includes('관계')) {
      relMonths.push(monthOf(m.startDate));
    }
  }
  const relYears: string[] = [];
  for (const y of years) {
    const yg = y.yearTenGod;
    const gods = [yg?.stemTenGod, yg?.branchMainTenGod, ...(yg?.hiddenStemTenGods ?? [])];
    if (hasAny(gods, spouseStar)) relYears.push(`${y.year}년`);
  }
  const relWindows = uniq([...uniq(relMonths).slice(0, 4), ...relYears]);

  let relLabel: string;
  let relCore: string;
  const inMarriageAge = age !== undefined && age >= 27 && age <= 40;
  if (rel === 'single') {
    relLabel = '새로운 인연';
    relCore = '새로운 사람이 들어오거나 관계가 시작되기 좋은 흐름이에요.';
  } else if (rel === 'dating') {
    relLabel = inMarriageAge ? '결혼·관계 진전' : '관계가 깊어지는 때';
    relCore = inMarriageAge
      ? '지금 관계를 결혼까지 한 단계 진전시키기 좋은 흐름이에요.'
      : '지금 만나는 사람과 더 가까워지기 좋은 흐름이에요.';
  } else if (rel === 'married') {
    relLabel = '동반자 관계';
    relCore = '배우자와 함께 큰 결정을 내리거나 관계가 단단해지기 좋은 흐름이에요.';
  } else {
    relLabel = '인연·관계';
    relCore = '사람과의 인연이 또렷해지고 관계의 결이 강해지는 흐름이에요.';
  }
  const relationship: TimingHint = relWindows.length
    ? { label: relLabel, windows: relWindows, note: `${relCore} (정해진 일정이 아니라 사주상 유리한 결이에요.)` }
    : { label: relLabel, windows: relYears, note: `올해는 인연을 서두르기보다 결을 다지는 해예요. 다가오는 해에 관계의 흐름이 더 들어와요. (단정이 아닌 흐름이에요.)` };

  // ── 시험·문서 시기 ──
  const studyMonths: string[] = [];
  for (const m of months) {
    const gods = [m.monthStemTenGod, m.monthBranchTenGod, ...(m.hiddenStemTenGods ?? [])];
    if (hasAny(gods, RESOURCE) || (m.activatedTopics ?? []).includes('공부')) {
      studyMonths.push(monthOf(m.startDate));
    }
  }
  const studyYears: string[] = [];
  for (const y of years) {
    const yg = y.yearTenGod;
    const gods = [yg?.stemTenGod, yg?.branchMainTenGod, ...(yg?.hiddenStemTenGods ?? [])];
    if (hasAny(gods, RESOURCE)) studyYears.push(`${y.year}년`);
  }
  const studyWindows = uniq([...uniq(studyMonths).slice(0, 4), ...studyYears]);
  const examFocus = (age !== undefined && age < 30) || !!opts.studyConcern;

  let study: TimingHint | undefined;
  if (studyWindows.length) {
    study = examFocus
      ? { label: '공부·시험·합격', windows: studyWindows, note: '집중이 잘 붙고 공부·시험·합격 같은 결과를 노리기 좋은 흐름이에요. (유리한 결이지, 합격 보장은 아니에요.)' }
      : { label: '문서·자격·배움', windows: studyWindows, note: '문서·계약·자격·배움처럼 머리로 정리하는 일에 유리한 흐름이에요.' };
  }

  return { relationship, ...(study ? { study } : {}) };
}
