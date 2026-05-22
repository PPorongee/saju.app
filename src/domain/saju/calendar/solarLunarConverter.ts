// Module 2: 양력 ↔ 음력 변환
// lunar-javascript 위의 도메인 wrapper. 윤달 지원.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar, Lunar } = require('lunar-javascript');

export interface SolarDate {
  year: number;
  month: number;
  day: number;
}

export interface LunarDate {
  year: number;
  month: number;        // 1~12. 윤달이면 isLeapMonth=true와 함께.
  day: number;
  isLeapMonth: boolean;
}

/** 음력 → 양력 변환 */
export function lunarToSolar(input: LunarDate): SolarDate {
  // lunar-javascript: 윤달은 month를 음수로 표기 (-month)
  const monthArg = input.isLeapMonth ? -input.month : input.month;
  const lunar = Lunar.fromYmd(input.year, monthArg, input.day);
  const solar = lunar.getSolar();
  return {
    year: solar.getYear(),
    month: solar.getMonth(),
    day: solar.getDay(),
  };
}

/** 양력 → 음력 변환 */
export function solarToLunar(input: SolarDate): LunarDate {
  const solar = Solar.fromYmd(input.year, input.month, input.day);
  const lunar = solar.getLunar();
  const rawMonth = lunar.getMonth();
  return {
    year: lunar.getYear(),
    month: Math.abs(rawMonth),
    day: lunar.getDay(),
    isLeapMonth: rawMonth < 0,
  };
}

/** 정규화된 BirthInput을 받아 항상 양력 SolarDate로 반환 */
export function toSolarDate(
  inputCalendar: 'solar' | 'lunar',
  year: number,
  month: number,
  day: number,
  isLeapMonth: boolean,
): SolarDate {
  if (inputCalendar === 'solar') return { year, month, day };
  return lunarToSolar({ year, month, day, isLeapMonth });
}
