// Daily Fortune V1 — "오늘의 별빛" 스키마 (spec §4).
//
// 원칙: GPT 자유생성 금지. 사용자 원국 + 오늘 일진을 deterministic하게 계산한 뒤
// 짧은 카드형 결과를 만든다. 모든 visible item에는 evidenceIds가 붙는다.

import type { BirthInput } from '../calendar/normalizeBirthInput';

// 오늘 흐름 라벨 — 8종 고정 enum (spec §4)
export type DailyFlowLabel =
  | '흐름 좋음'
  | '정리 필요한 날'
  | '무리 금지'
  | '관계 조심'
  | '돈 관리 유리'
  | '움직이면 풀리는 날'
  | '집중력 좋은 날'
  | '속도 조절';

export interface DailyActionItem {
  label: string;
  reason: string;
  evidenceIds: string[];
}

export interface DailyPoint {
  label: string;
  message: string;
  evidenceIds: string[];
}

export type DailyLuckType = 'item' | 'color' | 'place' | 'routine';

export interface DailyLuckItem {
  label: string;
  type: DailyLuckType;
  reason: string;
  evidenceIds: string[];
}

export interface DailyFortuneEvidence {
  id: string;
  /** 근거 종류 — dayPillar | dayTenGod | useGodRelation | branchInteraction */
  source: string;
  label: string;
  detail: string;
}

export interface DailyFortuneV1 {
  meta: {
    version: 'daily-fortune-v1';
    /** Asia/Seoul YYYY-MM-DD */
    date: string;
    timezone: 'Asia/Seoul';
    /** 오늘 일진 간지 (예: 갑자) */
    dayStemBranch: string;
    /** 사용자 일간 (예: 갑) */
    userDayMaster: string;
    /** 일간 기준 오늘 천간 십성 (예: 편관) */
    dayTenGod: string;
  };

  summary: {
    headline: string;
    flowLabel: DailyFlowLabel;
    shortMessage: string;
  };

  goodFor: DailyActionItem[];
  caution: DailyActionItem[];

  points: {
    work: DailyPoint;
    money: DailyPoint;
    relationship: DailyPoint;
  };

  luck: {
    items: DailyLuckItem[];
    colors: string[];
    places: string[];
    routines: string[];
  };

  evidence: DailyFortuneEvidence[];

  validation: {
    isValid: boolean;
    issues: string[];
  };
}

// ============================================================
// 빌더 입력
// ============================================================

/**
 * Daily Fortune 빌더 입력.
 * birth: 사용자 원국 계산용 (기존 BirthInput 재사용).
 * targetDate: 오늘 운세 기준일 (Asia/Seoul YYYY-MM-DD). 미지정이면 빌더가 now에서 산출.
 */
export type DailyLang = 'ko' | 'en';

export interface DailyFortuneInput {
  birth: BirthInput;
  /** Asia/Seoul YYYY-MM-DD. 테스트/QA용 고정값. 미지정이면 now 기준 오늘. */
  targetDate?: string;
  /** 출력 언어. 미지정이면 'ko'. flowLabel(meta/summary)은 항상 한글 enum 유지(키), 표시 텍스트만 언어별. */
  lang?: DailyLang;
}
