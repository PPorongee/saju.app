// Precision V1 — Phase 2: placeResolver / 데이터셋 무결성 테스트 (외부 호출 없음).
import { describe, it, expect } from 'vitest';
import { resolvePlace, getPlaceById, listPlaces } from '../calendar/placeResolver';
import { PLACES } from '../calendar/data/places';

const KR_IDS = ['KR-11','KR-26','KR-27','KR-28','KR-29','KR-30','KR-31','KR-50','KR-41','KR-42','KR-43','KR-44','KR-45','KR-46','KR-47','KR-48','KR-49'];

function norm(s: string) { return s.trim().toLowerCase().replace(/[\s_\-]+/g, ' ').trim(); }

describe('P2 데이터셋 무결성', () => {
  it('국내 17개 광역 모두 존재 + Asia/Seoul + region', () => {
    for (const id of KR_IDS) {
      const p = getPlaceById(id);
      expect(p, id).toBeTruthy();
      expect(p!.ianaTimeZone).toBe('Asia/Seoul');
      expect(p!.precision).toBe('region');
      expect(typeof p!.lat).toBe('number');
      expect(typeof p!.lng).toBe('number');
    }
  });
  it('해외 도시 50개 내외 (city precision) 존재', () => {
    const cities = PLACES.filter(p => p.precision === 'city');
    expect(cities.length).toBeGreaterThanOrEqual(45);
    expect(cities.length).toBeLessThanOrEqual(70);
  });
  it('id 중복 없음', () => {
    const ids = PLACES.map(p => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it('정규화 키(id/labelKo/labelEn/alias) collision 없음 (서로 다른 place를 가리키는 키 0건)', () => {
    const keyOwner = new Map<string, string>();
    const collisions: string[] = [];
    for (const p of PLACES) {
      for (const raw of [p.id, p.labelKo, p.labelEn, ...p.aliases]) {
        const k = norm(raw);
        if (!k) continue;
        if (keyOwner.has(k) && keyOwner.get(k) !== p.id) {
          collisions.push(`"${k}": ${keyOwner.get(k)} vs ${p.id}`);
        } else {
          keyOwner.set(k, p.id);
        }
      }
    }
    expect(collisions, collisions.join(' / ')).toEqual([]);
  });
  it('모든 place가 lat/lng/timezone/precision/id 보유', () => {
    for (const p of PLACES) {
      expect(p.id).toBeTruthy();
      expect(Number.isFinite(p.lat)).toBe(true);
      expect(Number.isFinite(p.lng)).toBe(true);
      expect(p.ianaTimeZone).toBeTruthy();
      expect(['country','region','city']).toContain(p.precision);
    }
  });
  it('listPlaces는 전체 반환', () => {
    expect(listPlaces().length).toBe(PLACES.length);
  });
});

describe('P2 resolvePlace', () => {
  it('국내 17개 라벨로 resolve', () => {
    expect(resolvePlace('서울')).toMatchObject({ ok: true, place: { id: 'KR-11' } });
    expect(resolvePlace('제주')).toMatchObject({ ok: true, place: { id: 'KR-49' } });
    expect(resolvePlace('경기')).toMatchObject({ ok: true, place: { id: 'KR-41' } });
  });
  it('해외 주요 도시 resolve (영문/한글)', () => {
    expect(resolvePlace('Los Angeles')).toMatchObject({ ok: true, place: { id: 'US-LAX' } });
    expect(resolvePlace('뉴욕')).toMatchObject({ ok: true, place: { id: 'US-NYC' } });
    expect(resolvePlace('Tokyo')).toMatchObject({ ok: true, place: { id: 'JP-TYO' } });
    expect(resolvePlace('London')).toMatchObject({ ok: true, place: { id: 'GB-LON' } });
    expect(resolvePlace('Beijing')).toMatchObject({ ok: true, place: { id: 'CN-PEK' } });
  });
  it('alias resolve (la / nyc / 수원 / saigon / peking)', () => {
    expect(resolvePlace('LA')).toMatchObject({ ok: true, place: { id: 'US-LAX' } });
    expect(resolvePlace('nyc')).toMatchObject({ ok: true, place: { id: 'US-NYC' } });
    expect(resolvePlace('수원')).toMatchObject({ ok: true, place: { id: 'KR-41' } });
    expect(resolvePlace('saigon')).toMatchObject({ ok: true, place: { id: 'VN-SGN' } });
    expect(resolvePlace('peking')).toMatchObject({ ok: true, place: { id: 'CN-PEK' } });
  });
  it('대소문자/공백 정규화', () => {
    expect(resolvePlace('  los   angeles ')).toMatchObject({ ok: true, place: { id: 'US-LAX' } });
    expect(resolvePlace('HONG KONG')).toMatchObject({ ok: true, place: { id: 'HK-HKG' } });
  });
  it('국가 fallback은 precision=country', () => {
    const r = resolvePlace('일본');
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.place.precision).toBe('country');
  });
  it('unknown은 명시적 not-found (좌표 추정 안 함)', () => {
    expect(resolvePlace('아무도시없음XYZ')).toEqual({ ok: false, reason: 'not-found' });
    expect(resolvePlace('Atlantis')).toEqual({ ok: false, reason: 'not-found' });
  });
  it('빈 입력은 empty', () => {
    expect(resolvePlace('')).toEqual({ ok: false, reason: 'empty' });
    expect(resolvePlace('   ')).toEqual({ ok: false, reason: 'empty' });
    expect(resolvePlace(null)).toEqual({ ok: false, reason: 'empty' });
    expect(resolvePlace(undefined)).toEqual({ ok: false, reason: 'empty' });
  });
});
