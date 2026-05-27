// Precision V1 — Phase 3: solarTimeCorrector 단위 테스트 (calculatePillars 미연결).
import { describe, it, expect } from 'vitest';
import { computeSolarTimeCorrection } from '../calendar/solarTimeCorrector';

function calc(civil: { year: number; month: number; day: number; hour: number; minute: number }, tz: string, lng: number, apply = true) {
  return computeSolarTimeCorrection({ civil, ianaTimeZone: tz, longitude: lng, applyCorrection: apply });
}

describe('P3 solarTimeCorrector — 보정분', () => {
  it('서울: offset 540, 보정 ≈ -32분', () => {
    const r = calc({ year: 1995, month: 7, day: 6, hour: 12, minute: 0 }, 'Asia/Seoul', 126.9780);
    expect(r.valid).toBe(true);
    expect(r.utcOffsetMinutes).toBe(540);
    expect(r.solarTimeAdjustmentMinutes).toBe(-32);
    expect(r.solarTimeAdjustmentApplied).toBe(true);
    // 12:00 - 32 = 11:28
    expect(r.correctedClock).toMatchObject({ hour: 11, minute: 28 });
  });
  it('도쿄: offset 540, 보정 ≈ +19분', () => {
    const r = calc({ year: 1990, month: 3, day: 15, hour: 9, minute: 0 }, 'Asia/Tokyo', 139.6503);
    expect(r.utcOffsetMinutes).toBe(540);
    expect(r.solarTimeAdjustmentMinutes).toBe(19);
    expect(r.correctedClock).toMatchObject({ hour: 9, minute: 19 });
  });
});

describe('P3 DST/offset (luxon tzdata)', () => {
  it('LA 여름(PDT) offset -420 / 겨울(PST) -480', () => {
    const summer = calc({ year: 2026, month: 7, day: 1, hour: 12, minute: 0 }, 'America/Los_Angeles', -118.2437);
    expect(summer.utcOffsetMinutes).toBe(-420);
    expect(summer.dstApplied).toBe(true);
    const winter = calc({ year: 2026, month: 1, day: 1, hour: 12, minute: 0 }, 'America/Los_Angeles', -118.2437);
    expect(winter.utcOffsetMinutes).toBe(-480);
    expect(winter.dstApplied).toBe(false);
  });
  it('NY 여름(EDT) -240 / 겨울(EST) -300', () => {
    expect(calc({ year: 2026, month: 7, day: 1, hour: 12, minute: 0 }, 'America/New_York', -74.0060).utcOffsetMinutes).toBe(-240);
    expect(calc({ year: 2026, month: 1, day: 1, hour: 12, minute: 0 }, 'America/New_York', -74.0060).utcOffsetMinutes).toBe(-300);
  });
  it('London 여름(BST) +60 / 겨울(GMT) 0', () => {
    expect(calc({ year: 2026, month: 7, day: 1, hour: 12, minute: 0 }, 'Europe/London', -0.1278).utcOffsetMinutes).toBe(60);
    expect(calc({ year: 2026, month: 1, day: 1, hour: 12, minute: 0 }, 'Europe/London', -0.1278).utcOffsetMinutes).toBe(0);
  });
});

describe('P3 한국 historical timezone (tzdata)', () => {
  it('1988 여름 서머타임(KDT) → offset 600', () => {
    const r = calc({ year: 1988, month: 8, day: 1, hour: 12, minute: 0 }, 'Asia/Seoul', 126.9780);
    expect(r.utcOffsetMinutes).toBe(600);
    expect(r.dstApplied).toBe(true);
    // 보정 = round(507.9 - 600) = -92 → 12:00 - 92min = 10:28
    expect(r.solarTimeAdjustmentMinutes).toBe(-92);
  });
  it('pre-1961 historical 구간(1958) → 표준 540과 다른 historical offset 적용 + formula 일관', () => {
    // 주의: pre-1961 한국 offset(+8:30/+9:00 등)은 tzdata 버전에 의존 → 정확값 단정하지 않음.
    //       (이 환경 ICU는 1958-06을 +9:30=570으로 보고). historical 처리 동작 + formula 일관성만 검증.
    const r = calc({ year: 1958, month: 6, day: 1, hour: 12, minute: 0 }, 'Asia/Seoul', 126.9780);
    expect(r.valid).toBe(true);
    expect(r.utcOffsetMinutes).not.toBe(540);                        // historical offset이 실제로 적용됨
    expect(r.solarTimeAdjustmentMinutes).toBe(Math.round(126.9780 * 4 - (r.utcOffsetMinutes as number)));
  });
});

describe('P3 unknown place / 경계', () => {
  it('applyCorrection=false → adj 0, applied false, 시각 불변', () => {
    const r = calc({ year: 2000, month: 5, day: 5, hour: 14, minute: 20 }, 'Asia/Seoul', 126.9780, false);
    expect(r.solarTimeAdjustmentMinutes).toBe(0);
    expect(r.solarTimeAdjustmentApplied).toBe(false);
    expect(r.correctedClock).toMatchObject({ hour: 14, minute: 20 });
    // offset/dst는 여전히 산출(메타용)
    expect(r.utcOffsetMinutes).toBe(540);
  });
  it('보정으로 시진 경계가 바뀌는 케이스: 서울 11:10 → 10:38 (오시→사시)', () => {
    const r = calc({ year: 2001, month: 4, day: 10, hour: 11, minute: 10 }, 'Asia/Seoul', 126.9780);
    expect(r.correctedClock).toMatchObject({ hour: 10, minute: 38 });
  });
  it('자정 근처 날짜 롤오버: 서울 00:10 → 전날 23:38', () => {
    const r = calc({ year: 2010, month: 6, day: 15, hour: 0, minute: 10 }, 'Asia/Seoul', 126.9780);
    expect(r.correctedClock).toMatchObject({ day: 14, hour: 23, minute: 38 });
  });
  it('잘못된 tz → valid false, 시각 원본 유지', () => {
    const r = calc({ year: 2000, month: 1, day: 1, hour: 12, minute: 0 }, 'Not/AZone', 100);
    expect(r.valid).toBe(false);
    expect(r.correctedClock).toMatchObject({ hour: 12, minute: 0 });
  });
});
