/**
 * v4 결정론 엔진(src/domain/saju)으로 사주팔자를 계산해 v3 `SajuResult` 모양으로 반환하는 어댑터.
 *
 * 왜 존재하나:
 *   - 화면 사주판/오행차트/십성은 v3 `SajuResult`(숫자 인덱스) 형태를 기대한다.
 *   - 엔진 통합으로 "계산은 v4(정확한 절기), 표시 코드는 그대로" 를 달성하려고
 *     v4 결과를 v3 모양으로 변환한다. 호출부에서 calcSaju → calcSajuV4 로 바꾸기만 하면 됨.
 *
 * v3 calcSaju 대비 차이:
 *   - 연·월·일주: v4의 lunar-javascript 실제 절기 계산 사용 → 절기/입춘 "당일생"만 v3와 달라지고
 *     (v4가 정답), 그 외 모든 날짜는 v3와 동일. 일주는 검증상 100% 동일.
 *   - 시주: v3와 동일한 시두법(시지 인덱스 입력 모델 유지). 일간(dStem)이 v3와 동일하므로 결과도 동일.
 *
 * 시각 처리: UI는 시각을 "시지 인덱스(0~11)"로만 갖는다. 연·월·일주 절기 판정은
 *   정오(12:00) 고정으로 계산한다 — v3의 날짜-only 동작에 가장 근접하면서 야자시 일주 시프트
 *   같은 별도 교리 결정을 이 단계에서 끌어들이지 않기 위함(검증도 정오 기준으로 수행됨).
 *
 * 무거운 lunar-javascript를 끌어오므로 호출부에서 동적 import 하여 홈 초기 번들을 보호한다.
 */
import type { SajuResult } from './saju-calc';
import { CG, JJ } from './saju-calc';
import { normalizeBirthInput, type BirthInput } from '@/domain/saju/calendar/normalizeBirthInput';
import { calculatePillars } from '@/domain/saju/calendar/pillarCalculator';

const pad = (n: number) => String(n).padStart(2, '0');
// 시두법(時頭法): 일간 그룹 → 자시 천간 시작. v3 saju-calc.ts와 동일.
const HOUR_START_STEMS = [0, 2, 4, 6, 8];

/**
 * v4 엔진으로 연·월·일·시주를 계산해 v3 SajuResult로 반환.
 * @param y 양력 연도
 * @param m 양력 월(1~12)
 * @param d 양력 일(1~31)
 * @param hourIdx 시지 인덱스(0=자 ~ 11=해). 시간 미상은 -1.
 */
export function calcSajuV4(y: number, m: number, d: number, hourIdx: number): SajuResult {
  const input: BirthInput = {
    gender: 'unknown',
    calendarType: 'solar',
    birthDate: `${y}-${pad(m)}-${pad(d)}`,
    birthTime: '12:00',
    birthTimeConfidence: 'exact',
    timezone: 'Asia/Seoul',
  };
  const { pillars } = calculatePillars(normalizeBirthInput(input));

  const yStem = CG.indexOf(pillars.year.stem);
  const yBranch = JJ.indexOf(pillars.year.branch);
  const mStem = CG.indexOf(pillars.month.stem);
  const mBranch = JJ.indexOf(pillars.month.branch);
  const dStem = CG.indexOf(pillars.day.stem);
  const dBranch = JJ.indexOf(pillars.day.branch);

  // 시주: v3와 동일한 시두법. hourIdx<0이면 시간 미상.
  let hStem = -1;
  let hBranch = -1;
  if (hourIdx >= 0) {
    hBranch = hourIdx;
    hStem = (HOUR_START_STEMS[dStem % 5] + hBranch) % 10;
  }

  // sajuMonthIdx: 인월(mBranch=2)이 0. v3 규약과 동일.
  const sajuMonthIdx = (mBranch - 2 + 12) % 12;
  // sajuYear: y 또는 y-1(입춘 전). v4 연지로 판정 (연속 연도는 지지가 다름).
  const sajuYear = ((y - 4) % 12 + 12) % 12 === yBranch ? y : y - 1;

  return { yStem, yBranch, mStem, mBranch, dStem, dBranch, hStem, hBranch, sajuYear, sajuMonthIdx };
}
