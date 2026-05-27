// Precision V1 — Phase 6: precision fixture 확장 (A~G). legacy vs precision 동작/차이 검증.
// 모두 synthetic 입력. calculateAnalysisOnly만 사용 (LLM 없음).
import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const NOW = new Date('2026-05-27T00:00:00Z');

function leg(over: Partial<BirthInput>): BirthInput {
  return { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul', ...over } as BirthInput;
}
const L = (over: Partial<BirthInput>) => calculateAnalysisOnly(leg(over), NOW);
const P = (over: Partial<BirthInput>, placeId?: string) => calculateAnalysisOnly(leg({ ...over, calculationMode: 'precision-v1', birthPlaceId: placeId }), NOW);
const bc = (r: ReturnType<typeof calculateAnalysisOnly>) => r.birthChart;

// ============================================================
// A. 절기 경계
// ============================================================
describe('A 절기 경계', () => {
  it('입춘 근처 + 지역unknown + non-23h: precision == legacy (월/년/일주 동일)', () => {
    const over = { birthDate: '1995-02-04', birthTime: '10:00' };
    const l = bc(L(over)); const p = bc(P(over));
    expect({ y: p.year, m: p.month, d: p.day, h: p.hour }).toEqual({ y: l.year, m: l.month, d: l.day, h: l.hour });
  });
  it('경칩/청명 월주 경계 + 지역unknown non-23h: 동일', () => {
    const over = { birthDate: '2000-03-05', birthTime: '14:30' };
    expect(bc(P(over))).toEqual(bc(L(over)));
  });
  it('절기 근처 + 지역known(서울): 태양시 보정 meta 적용', () => {
    const p = P({ birthDate: '1995-02-04', birthTime: '04:10' }, 'KR-11');
    expect(p.calculationMeta?.solarTimeAdjustmentApplied).toBe(true);
    expect(p.calculationMeta?.solarTimeAdjustmentMinutes).toBe(-32);
  });
});

// ============================================================
// B. 자시 경계 — legacy(야자시) vs precision(조자시)
// ============================================================
describe('B 자시 경계', () => {
  const day = (h: string) => ({ birthDate: '1990-06-15', birthTime: h });
  it('22:50: 23시 미만 → precision(조자시) 일주 == legacy', () => {
    expect(bc(P(day('22:50'))).dayMaster).toBe(bc(L(day('22:50'))).dayMaster);
  });
  it('23:00 / 23:30 / 23:59: legacy는 익일 시프트, precision은 시프트 없음 → dayMaster 다름', () => {
    for (const t of ['23:00', '23:30', '23:59']) {
      expect(bc(P(day(t))).dayMaster, `precision ${t}`).not.toBe(bc(L(day(t))).dayMaster);
    }
  });
  it('00:00 / 00:10: 자정 이후 → 두 정책 모두 동일 일주', () => {
    for (const t of ['00:00', '00:10']) {
      expect(bc(P(day(t))).dayMaster, `${t}`).toBe(bc(L(day(t))).dayMaster);
    }
  });
  it('precision 23:30은 지역 unknown이어도 조자시 정책 유지(meta)', () => {
    const p = P(day('23:30'));
    expect(p.calculationMeta?.ziHourPolicy).toBe('zi-midnight-day-boundary');
    expect(p.calculationMeta?.solarTimeAdjustmentApplied).toBe(false);
  });
});

// ============================================================
// C. 음력 / 윤달
// ============================================================
describe('C 음력/윤달', () => {
  const lunar = (over: Partial<BirthInput>) => ({ calendarType: 'lunar' as const, birthDate: '1985-08-21', birthTime: '07:40', ...over });
  // (참고: 특정 연도 윤달 존재 여부는 lunar-javascript 소관 — precision 범위 밖이라 sanity 단정은 제외)
  it('음력 + 지역unknown non-23h: precision == legacy (lunar→solar 후 보정 없음)', () => {
    const over = lunar({ isLeapMonth: false });
    expect(bc(P(over))).toEqual(bc(L(over)));
  });
  it('음력 + 지역known: lunar→solar→태양시 보정 순서 정상 (meta 적용)', () => {
    const p = P(lunar({ isLeapMonth: false }), 'KR-26');
    expect(p.calculationMeta?.solarTimeAdjustmentApplied).toBe(true);
    expect(p.calculationMeta?.calculationVersion).toBe('precision-v1');
  });
});

// ============================================================
// D. 한국 시간대 / DST
// ============================================================
describe('D 한국 DST/historical', () => {
  it('1987 summer 서머타임 → offset 600, dst true', () => {
    const p = P({ birthDate: '1987-07-01', birthTime: '12:00' }, 'KR-11');
    expect(p.calculationMeta?.utcOffsetMinutes).toBe(600);
    expect(p.calculationMeta?.dstApplied).toBe(true);
  });
  it('1988 summer → offset 600', () => {
    const p = P({ birthDate: '1988-08-01', birthTime: '12:00' }, 'KR-11');
    expect(p.calculationMeta?.utcOffsetMinutes).toBe(600);
  });
  it('pre-1961(1958) → 표준 540과 다른 historical offset + warning', () => {
    const p = P({ birthDate: '1958-06-01', birthTime: '12:00' }, 'KR-11');
    expect(p.calculationMeta?.utcOffsetMinutes).not.toBe(540);
    expect(p.calculationMeta?.warnings.some(w => w.includes('1961'))).toBe(true);
  });
  it('1961+ 일반(1990) → offset 540, dst 없음, 1961 warning 없음', () => {
    const p = P({ birthDate: '1990-05-05', birthTime: '12:00' }, 'KR-11');
    expect(p.calculationMeta?.utcOffsetMinutes).toBe(540);
    expect(p.calculationMeta?.dstApplied).toBe(false);
    expect(p.calculationMeta?.warnings.some(w => w.includes('1961'))).toBe(false);
  });
});

// ============================================================
// E. 해외 출생
// ============================================================
describe('E 해외 출생', () => {
  const o = { birthDate: '1992-07-01', birthTime: '12:00' };
  it('DST 도시 여름(LA/NY/London/Sydney): dstApplied true', () => {
    // 2026 기준이 아니라 1992-07; 북반구 7월 → LA/NY/London DST, Sydney(남반구)는 겨울 → DST 아님
    expect(P(o, 'US-LAX').calculationMeta?.dstApplied).toBe(true);
    expect(P(o, 'US-NYC').calculationMeta?.dstApplied).toBe(true);
    expect(P(o, 'GB-LON').calculationMeta?.dstApplied).toBe(true);
    expect(P(o, 'AU-SYD').calculationMeta?.dstApplied).toBe(false);
  });
  it('비-DST 도시(Tokyo/Beijing): dstApplied false', () => {
    expect(P(o, 'JP-TYO').calculationMeta?.dstApplied).toBe(false);
    expect(P(o, 'CN-PEK').calculationMeta?.dstApplied).toBe(false);
  });
  it('같은 local time이라도 도시별 태양시 보정분이 다름 (Tokyo vs Beijing)', () => {
    const tyo = P(o, 'JP-TYO').calculationMeta?.solarTimeAdjustmentMinutes;
    const pek = P(o, 'CN-PEK').calculationMeta?.solarTimeAdjustmentMinutes;
    expect(tyo).not.toBe(pek);
    expect(tyo).toBe(19);   // 139.6503*4 - 540
    expect(pek).toBe(-14);  // 116.4074*4 - 480
  });
  it('timeZoneId가 도시 tz로 설정됨', () => {
    expect(P(o, 'US-NYC').calculationMeta?.timeZoneId).toBe('America/New_York');
    expect(P(o, 'JP-TYO').calculationMeta?.timeZoneId).toBe('Asia/Tokyo');
  });
});

// ============================================================
// F. 태양시 보정으로 시주가 바뀌는 케이스
// ============================================================
describe('F 태양시 → 시주 변경', () => {
  it('서울 11:10: 지역known(보정 -32→10:38 사시)은 지역unknown과 시주 다름', () => {
    const over = { birthDate: '2001-04-10', birthTime: '11:10' };
    expect(bc(P(over, 'KR-11')).hour).not.toBe(bc(P(over)).hour);
  });
  it('Tokyo 12:50: 보정 +19→13:09 (오시→미시)로 시주 변경 (지역unknown 대비)', () => {
    const over = { birthDate: '1995-05-05', birthTime: '12:50' };
    expect(bc(P(over, 'JP-TYO')).hour).not.toBe(bc(P(over)).hour);
  });
  it('지역 unknown이면 시주가 legacy와 동일(보정 없음)', () => {
    const over = { birthDate: '2001-04-10', birthTime: '11:10' };
    expect(bc(P(over)).hour).toBe(bc(L(over)).hour);
  });
});

// ============================================================
// G. 출생시간 unknown / 지역 unknown
// ============================================================
describe('G unknown 처리', () => {
  it('시간 unknown precision: 시주 미생성 + 보정 미적용 + 조자시 meta 유지', () => {
    const p = P({ birthTimeConfidence: 'unknown', birthTime: undefined });
    expect(p.birthChart.hour).toBeUndefined();
    expect(p.birthChart.isHourEstimated).toBe(true);
    expect(p.calculationMeta?.solarTimeAdjustmentApplied).toBe(false);
    expect(p.calculationMeta?.ziHourPolicy).toBe('zi-midnight-day-boundary');
    expect(p.calculationMeta?.warnings.some(w => w.includes('출생시간 미상'))).toBe(true);
  });
  it('지역 unknown precision: 보정 없음 + birthPlacePrecision unknown', () => {
    const p = P({ birthTime: '09:30' });
    expect(p.calculationMeta?.solarTimeAdjustmentApplied).toBe(false);
    expect(p.calculationMeta?.birthPlacePrecision).toBe('unknown');
  });
  it('invalid place id precision: 표준시 fallback + invalid id warning', () => {
    const p = P({ birthTime: '09:30' }, 'XX-NOPE');
    expect(p.calculationMeta?.birthPlacePrecision).toBe('unknown');
    expect(p.calculationMeta?.solarTimeAdjustmentApplied).toBe(false);
    expect(p.calculationMeta?.warnings.some(w => w.includes('유효하지 않은 출생지역'))).toBe(true);
  });
});
