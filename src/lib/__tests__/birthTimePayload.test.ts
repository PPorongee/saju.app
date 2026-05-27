// 출생시간 payload 정책 테스트 (개인사주/올해운세/궁합/임산부 공통 헬퍼).
//
// 정책:
//   1. 정확입력(시/분) → birthTime "HH:mm"(실제), confidence 'exact'
//   2. 시진만          → 대표시각 "HH:mm", confidence 'approximate'
//   3. 모름            → undefined, 'unknown'
//
// 핵심 회귀: 과거 궁합 버그(시진 인덱스를 HH로 직접 사용 → 11:10이 "06:10"으로 오염)가
//           더 이상 발생하지 않음을 assert.
import { describe, it, expect } from 'vitest';
import {
  resolveBirthTimeFields,
  sijuToRepresentativeTime,
  pregnancySijuBirthTimeFields,
} from '@/lib/birthTimePayload';

// 개인사주/올해운세/궁합이 공유하는 exact-우선 헬퍼.
// (각 모드는 sijuIndex=시진 인덱스, exact={use,hour,min}를 넣어 호출.)

describe('개인사주/올해운세 — 정확입력 보호 (HH:mm 분 단위 보존 + exact)', () => {
  const ex = (hour: number, min: number) =>
    resolveBirthTimeFields({ sijuIndex: 6 /* 무관: exact 우선 */, exact: { use: true, hour, min } });

  it('11:10 → "11:10" / exact', () => {
    expect(ex(11, 10)).toEqual({ birthTime: '11:10', birthTimeConfidence: 'exact' });
  });
  it('11:50 → "11:50" / exact', () => {
    expect(ex(11, 50)).toEqual({ birthTime: '11:50', birthTimeConfidence: 'exact' });
  });
  it('12:10 → "12:10" / exact', () => {
    expect(ex(12, 10)).toEqual({ birthTime: '12:10', birthTimeConfidence: 'exact' });
  });
  it('23:30 → "23:30" / exact (시진 인덱스로 뭉뚱그리지 않음)', () => {
    expect(ex(23, 30)).toEqual({ birthTime: '23:30', birthTimeConfidence: 'exact' });
  });
  it('시진 grid 선택(예: 오시 idx 6, 정확입력 off) → 대표시각 "12:00" / approximate', () => {
    expect(resolveBirthTimeFields({ sijuIndex: 6, exact: { use: false, hour: -1, min: 0 } }))
      .toEqual({ birthTime: '12:00', birthTimeConfidence: 'approximate' });
  });
  it('자시 grid(idx 0) → "00:00" / approximate', () => {
    expect(resolveBirthTimeFields({ sijuIndex: 0, exact: { use: false, hour: -1, min: 0 } }))
      .toEqual({ birthTime: '00:00', birthTimeConfidence: 'approximate' });
  });
  it('시간 미선택(sijuIndex -1, exact off) → undefined / unknown', () => {
    expect(resolveBirthTimeFields({ sijuIndex: -1, exact: { use: false, hour: -1, min: 0 } }))
      .toEqual({ birthTime: undefined, birthTimeConfidence: 'unknown' });
  });
});

describe('sijuToRepresentativeTime — 시진 인덱스 → 대표 벽시계', () => {
  it('오시 6 → "12:00", 자시 0 → "00:00", 해시 11 → "22:00"', () => {
    expect(sijuToRepresentativeTime(6)).toBe('12:00');
    expect(sijuToRepresentativeTime(0)).toBe('00:00');
    expect(sijuToRepresentativeTime(11)).toBe('22:00');
  });
  it('범위 밖(-1) → undefined', () => {
    expect(sijuToRepresentativeTime(-1)).toBeUndefined();
  });
});

describe('궁합 A/B — 시간 payload 교정 (시진 인덱스 오염 제거)', () => {
  // 실제 컴포넌트 호출 형태를 모사:
  //   compatPersonX.hour = exactTimeToSiju(h,m) (시진 인덱스), compatExactX = { use, hour, min }
  // 정확입력이면 시진 인덱스를 무시하고 실제 시각을 써야 한다.
  const compatExact = (sijuIdx: number, hour: number, min: number) =>
    resolveBirthTimeFields({ sijuIndex: sijuIdx, exact: { use: true, hour, min } });
  const compatGrid = (sijuIdx: number) =>
    resolveBirthTimeFields({ sijuIndex: sijuIdx, exact: { use: false, hour: -1, min: 0 } });
  const compatUnknown = () =>
    resolveBirthTimeFields({ sijuIndex: -1, exact: { use: false, hour: -1, min: 0 } });

  it('A 정확입력 11:10 → "11:10" / exact (절대 "06:10" 아님)', () => {
    const r = compatExact(6 /* 11:10이 버킷되는 오시 idx */, 11, 10);
    expect(r).toEqual({ birthTime: '11:10', birthTimeConfidence: 'exact' });
    expect(r.birthTime).not.toBe('06:10'); // 과거 시진 인덱스 오염 회귀 가드
  });
  it('B 정확입력 11:10 → "11:10" / exact', () => {
    expect(compatExact(6, 11, 10)).toEqual({ birthTime: '11:10', birthTimeConfidence: 'exact' });
  });
  it('A 정확입력 23:30 → "23:30" / exact (자시 idx 0으로 뭉뚱그려 "00:30" 아님)', () => {
    const r = compatExact(0, 23, 30);
    expect(r).toEqual({ birthTime: '23:30', birthTimeConfidence: 'exact' });
    expect(r.birthTime).not.toBe('00:30');
  });
  it('B 정확입력 23:30 → "23:30" / exact', () => {
    expect(compatExact(0, 23, 30)).toEqual({ birthTime: '23:30', birthTimeConfidence: 'exact' });
  });
  it('A/B 시진 grid 오시(idx 6) → 대표 "12:00" / approximate (절대 "06:00" 아님)', () => {
    const r = compatGrid(6);
    expect(r).toEqual({ birthTime: '12:00', birthTimeConfidence: 'approximate' });
    expect(r.birthTime).not.toBe('06:00');
  });
  it('A/B 시간 모름 → undefined / unknown', () => {
    expect(compatUnknown()).toEqual({ birthTime: undefined, birthTimeConfidence: 'unknown' });
  });
});

describe('임산부 — 엄마/아기 시진 기반 (항상 approximate, exact 금지)', () => {
  it('엄마 시진 grid 오시(idx 6) → "12:00" / approximate', () => {
    expect(pregnancySijuBirthTimeFields(6)).toEqual({ birthTime: '12:00', birthTimeConfidence: 'approximate' });
  });
  it('엄마 자시(idx 0) → "00:30" / approximate (기존 _toTime 대표값 보존)', () => {
    expect(pregnancySijuBirthTimeFields(0)).toEqual({ birthTime: '00:30', birthTimeConfidence: 'approximate' });
  });
  it('엄마 시간 모름(-1) → undefined / unknown', () => {
    expect(pregnancySijuBirthTimeFields(-1)).toEqual({ birthTime: undefined, birthTimeConfidence: 'unknown' });
  });
  it('아기 예정 시진(idx 6) → "12:00" / approximate (기존 동작 유지)', () => {
    expect(pregnancySijuBirthTimeFields(6)).toEqual({ birthTime: '12:00', birthTimeConfidence: 'approximate' });
  });
  it('엄마/아기 모두 exact를 절대 반환하지 않음', () => {
    for (let i = -1; i <= 11; i++) {
      expect(pregnancySijuBirthTimeFields(i).birthTimeConfidence).not.toBe('exact');
    }
  });
});
