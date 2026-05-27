// Module 12 — 대운(大運)·세운(歲運) 계산.
//
// 대운:
//   방향 — 양남·음녀 = 순행, 음남·양녀 = 역행 (年干 음양 기준)
//   시작 나이 — 순행: 다음 절기까지 일수 / 3 / 역행: 이전 절기까지 일수 / 3
//   주기 — 10년. 천간/지지는 月柱 기준 +1 (순행) 또는 -1 (역행).
//
// 세운 — 매년 60갑자 1칸씩 진행. (year - 4) % 60.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript');

import type { NormalizedBirth } from './normalizeBirthInput';
import type { FourPillars } from './pillarCalculator';
import {
  stemByIndex, stemIndex, stemYinYang,
  HANJA_TO_STEM, type HeavenlyStem,
} from '../rules/heavenlyStems';
import {
  branchByIndex, branchIndex,
  HANJA_TO_BRANCH, type EarthlyBranch,
} from '../rules/earthlyBranches';
import { STEM_ELEMENT, BRANCH_ELEMENT } from '../rules/elements';
import { HIDDEN_STEMS } from '../rules/hiddenStems';
import { toSolarDate } from './solarLunarConverter';
import type { CivilDateTime } from './solarTimeCorrector';

export interface DaewoonPillar {
  index: number;        // 1번째, 2번째 ...
  startAge: number;     // 만 나이
  endAge: number;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  pillarKo: string;     // 예: '갑신'
}

export interface SewoonYearPillar {
  year: number;
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  pillarKo: string;
}

export interface FortuneCycleResult {
  isForward: boolean;
  firstDaewoonStartAge: number;   // 첫 대운 시작 만 나이 (소수점 1자리)
  daewoonList: DaewoonPillar[];   // 8주기(80년) 정도까지
  currentDaewoon: DaewoonPillar;
  nextThreeYears: SewoonYearPillar[];
}

export function calculateFortuneCycles(
  input: NormalizedBirth,
  pillars: FourPillars,
  currentYear: number = new Date().getFullYear(),
  precisionClock?: CivilDateTime,
): FortuneCycleResult {
  // 1. 방향 (성별 ⊕ 年干 음양 — precision 무관)
  const yearYy = stemYinYang(pillars.year.stem);
  const isForward =
    (yearYy === 'yang' && input.context.gender === 'male') ||
    (yearYy === 'yin' && input.context.gender === 'female');

  // 2. 시작 나이 — 출생 시점 → 가장 가까운 절기까지 일수.
  //    precisionClock(보정 양력 벽시계)이 있으면 보정 시각 기준, 없으면 legacy(원본) byte-identical.
  const solar = precisionClock
    ? { year: precisionClock.year, month: precisionClock.month, day: precisionClock.day }
    : toSolarDate(input.inputCalendar, input.year, input.month, input.day, input.isLeapMonth);
  const hour = precisionClock ? precisionClock.hour : (input.hour ?? 12);
  const minute = precisionClock ? precisionClock.minute : input.minute;
  const days = daysToBoundary(solar.year, solar.month, solar.day, hour, minute, isForward);
  // 3일 = 1년. 1일 = 4개월. 1시간 = 5일.
  const firstStartAge = Math.round((days / 3) * 10) / 10;

  // 3. 대운 리스트 — 월주 기준 +1 (순행) / -1 (역행), 10년 주기, 8주기
  const monthStemIdx = stemIndex(pillars.month.stem);
  const monthBranchIdx = branchIndex(pillars.month.branch);
  const daewoonList: DaewoonPillar[] = [];
  for (let i = 1; i <= 8; i++) {
    const offset = isForward ? i : -i;
    const stem = stemByIndex(monthStemIdx + offset);
    const branch = branchByIndex(monthBranchIdx + offset);
    const startAge = firstStartAge + (i - 1) * 10;
    daewoonList.push({
      index: i,
      startAge,
      endAge: startAge + 9.9,
      stem, branch,
      pillarKo: stem + branch,
    });
  }

  // 4. 현재 대운 (만 나이 기준)
  const ageNow = currentYear - input.year;
  const current = daewoonList.find(d => ageNow >= d.startAge && ageNow < d.endAge + 0.1) ?? daewoonList[0];

  // 5. 향후 3년 세운 (현재 연도 포함)
  const nextThreeYears: SewoonYearPillar[] = [];
  for (let i = 0; i < 3; i++) {
    const y = currentYear + i;
    nextThreeYears.push({ year: y, ...yearToPillar(y), pillarKo: yearToPillar(y).stem + yearToPillar(y).branch });
  }

  return {
    isForward,
    firstDaewoonStartAge: firstStartAge,
    daewoonList,
    currentDaewoon: current,
    nextThreeYears,
  };
}

// ============================================================
// 절기 경계까지 일수 계산
// ============================================================

function daysToBoundary(
  year: number, month: number, day: number, hour: number, minute: number,
  forward: boolean,
): number {
  // lunar-javascript JieQi table에서 이 출생시각 이후/이전 가장 가까운 12절 노드까지의 일수
  const JIE = ['立春', '惊蛰', '清明', '立夏', '芒种', '小暑', '立秋', '白露', '寒露', '立冬', '大雪', '小寒'];
  const candidates: number[] = []; // epoch ms 배열
  for (const y of [year - 1, year, year + 1]) {
    const table = Solar.fromYmd(y, 1, 1).getLunar().getJieQiTable();
    for (const name of JIE) {
      const s = table[name];
      if (!s) continue;
      const epoch = Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour() - 9, s.getMinute(), s.getSecond());
      candidates.push(epoch);
    }
  }
  const birthEpoch = Date.UTC(year, month - 1, day, hour - 9, minute);

  if (forward) {
    // 출생 이후 가장 가까운 절기
    const next = candidates.filter(e => e > birthEpoch).sort((a, b) => a - b)[0];
    return (next - birthEpoch) / (1000 * 60 * 60 * 24);
  } else {
    const prev = candidates.filter(e => e <= birthEpoch).sort((a, b) => b - a)[0];
    return (birthEpoch - prev) / (1000 * 60 * 60 * 24);
  }
}

// ============================================================
// 연도 → 60갑자 (세운)
// ============================================================

export function yearToPillar(year: number): { stem: HeavenlyStem; branch: EarthlyBranch } {
  // 1984년 = 갑자년 기준. (year - 4) % 60 = 60갑자 인덱스.
  const idx = ((year - 4) % 60 + 60) % 60;
  return {
    stem: stemByIndex(idx % 10),
    branch: branchByIndex(idx % 12),
  };
}

// 외부 의존성 안 쓰는 unused warning 제거용
void HANJA_TO_STEM; void HANJA_TO_BRANCH; void STEM_ELEMENT; void BRANCH_ELEMENT; void HIDDEN_STEMS;
