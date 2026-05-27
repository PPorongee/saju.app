'use client';

// Precision V1 — 출생지역 선택 UI (Phase 7).
//
// 정책 / 안전:
//   - 이 컴포넌트는 places 데이터셋만 import 한다.
//     solarTimeCorrector / precisionAdjust / precisionContext / luxon 등 계산 모듈은
//     절대 import 하지 않는다 (client 번들에 luxon 유입 금지 — 테스트가 강제).
//   - 선택값은 place id 문자열만 저장한다. '' = 지역 모름.
//   - 정확한 주소/병원/좌표 입력 없음, 외부 geocoding 호출 없음.
//   - UI 문구에 태양시·자시·DST·절기/시차/정밀 보정 같은 어려운 용어를 노출하지 않는다.
//
// flag 게이팅(NEXT_PUBLIC_SAJU_PRECISION_INPUTS_ENABLED)은 호출부(SajuApp)에서 처리한다.
// 이 컴포넌트 자체는 flag를 모른다 — 렌더되면 보이고, 안 렌더되면 안 보인다.

import React from 'react';
import { PLACES, type Place } from '@/domain/saju/calendar/data/places';

// 그룹: 국내 광역(region) / 해외 주요 도시(city). country fallback(precision==='country')은
// 검색 매칭용 항목이라 드롭다운에는 노출하지 않는다.
const KR_REGIONS: Place[] = PLACES.filter(p => p.precision === 'region');
const WORLD_CITIES: Place[] = PLACES.filter(p => p.precision === 'city');

export interface PlaceSelectProps {
  /** 선택된 place id. '' = 지역 모름. */
  value: string;
  /** 선택 변경 콜백. place id('' 포함)를 그대로 전달. */
  onChange: (placeId: string) => void;
  lang?: 'ko' | 'en';
  /** select element id (label 연결 / 테스트 훅). */
  id?: string;
}

/**
 * submit payload 패치 헬퍼 — flag/선택 상태에 따라 birthPlaceId를 포함할지 결정.
 *
 *   - enabled=false (flag off)            → {}            (payload 변동 없음 = byte-identical)
 *   - enabled=true + 지역 미선택('')      → {}            (지역 모름 → 생략)
 *   - enabled=true + 지역 선택(id)        → { birthPlaceId }
 *
 * calculationMode는 절대 넣지 않는다 — precision 적용 여부는 서버 env(SAJU_CALC_MODE) 소관.
 */
export function birthPlacePayloadPatch(
  enabled: boolean,
  placeId: string | null | undefined,
): { birthPlaceId?: string } {
  if (!enabled) return {};
  const id = (placeId ?? '').trim();
  if (!id) return {};
  return { birthPlaceId: id };
}

export default function PlaceSelect({
  value,
  onChange,
  lang = 'ko',
  id = 'birth-place-select',
}: PlaceSelectProps) {
  const isEn = lang === 'en';
  const label = isEn ? 'Birthplace (optional)' : '출생지역 (선택)';
  const help = isEn
    ? 'Birthplace helps improve the accuracy of the hour pillar. An exact address is not needed.'
    : '출생지역은 시주 계산의 정확도를 높이기 위해 사용됩니다. 정확한 주소는 필요하지 않습니다.';
  const unknownLabel = isEn ? "Don't know" : '지역 모름';
  const krGroupLabel = isEn ? 'South Korea' : '대한민국';
  const worldGroupLabel = isEn ? 'Major cities abroad' : '해외 주요 도시';
  const optLabel = (p: Place) => (isEn ? p.labelEn : p.labelKo);

  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        aria-label={label}
        onChange={e => onChange(e.target.value)}
      >
        <option value="">{unknownLabel}</option>
        <optgroup label={krGroupLabel}>
          {KR_REGIONS.map(p => (
            <option key={p.id} value={p.id}>{optLabel(p)}</option>
          ))}
        </optgroup>
        <optgroup label={worldGroupLabel}>
          {WORLD_CITIES.map(p => (
            <option key={p.id} value={p.id}>{optLabel(p)}</option>
          ))}
        </optgroup>
      </select>
      <p className="exact-time-note">{help}</p>
    </div>
  );
}
