// Module 1: BirthInput 정규화
// 사용자 raw 입력을 후속 명리 계산이 사용할 NormalizedBirth로 변환한다.
//
// 정책:
//  1. birthTimeConfidence='unknown' → 시주 확정하지 않음 (hourUnknown=true).
//  2. birthTimeConfidence='approximate' → 시진 경계 근처(±15분) 검사하여 atBoundary 플래그.
//  3. 사용자 나이(만 나이, 현재 연도 기준) 계산.
//  4. 혼인상태/자녀/직업/관심사는 후속 컨텍스트 필터(contextGuard)와 GPT 입력 JSON에서 사용.

// ============================================================
// 사용자 raw 입력 — 외부 spec 그대로 (UI/API가 이 형태로 전달)
// ============================================================

import type { CalculationMode } from './calculationMeta';

export type CalendarType = 'solar' | 'lunar';

export type Gender = 'male' | 'female' | 'unknown';

export type RelationshipStatus =
  | 'single'
  | 'dating'
  | 'married'
  | 'divorced'
  | 'widowed'
  | 'unknown';

export type BirthTimeConfidence = 'exact' | 'approximate' | 'unknown';

export type ConcernTopic =
  | 'career'
  | 'money'
  | 'relationship'
  | 'marriage'
  | 'family'
  | 'health'
  | 'study'
  | 'business'
  | 'personality'
  | 'future';

export interface BirthInput {
  name?: string;
  gender: Gender;
  calendarType: CalendarType;
  isLeapMonth?: boolean;
  /** YYYY-MM-DD */
  birthDate: string;
  /** HH:mm — birthTimeConfidence='unknown'이면 생략 가능 */
  birthTime?: string;
  birthTimeConfidence: BirthTimeConfidence;
  birthPlace?: string;
  /** precision-v1: 출생지역 식별자 (placeResolver가 lat/lng/tz로 resolve). 미입력이면 태양시 보정 없음. */
  birthPlaceId?: string;
  /** 'Asia/Seoul'(legacy 고정). precision-v1에서 해외 IANA timezone 확장 예정. */
  timezone: string;
  /** 계산 모드. 미지정/'legacy'면 기존 동작 그대로(byte-identical). 'precision-v1'은 opt-in. */
  calculationMode?: CalculationMode;
  relationshipStatus?: RelationshipStatus;
  hasChildren?: boolean | 'unknown';
  occupation?: string;
  currentConcerns?: ConcernTopic[];
}

// ============================================================
// 정규화 결과 — 후속 명리 계산이 사용하는 안정 형태
// ============================================================

export interface UserContext {
  name?: string;
  gender: Gender;
  /** 만 나이 (현재 연도 - 출생 연도). 생일 미경과 보정은 별도 필요 시 추가. */
  ageYears: number;
  ageGroup: AgeGroup;
  relationshipStatus: RelationshipStatus;
  hasChildren: boolean | 'unknown';
  occupation?: string;
  currentConcerns: ConcernTopic[];
}

export type AgeGroup = 'child' | 'teen' | 'twenties' | 'thirties' | 'forties' | 'fifties' | 'sixties_plus';

export interface NormalizedBirth {
  /** 입력 원본 (감사·디버그·재현용) */
  raw: BirthInput;

  /** 정규화된 입력 달력 (음력이면 그대로 유지, 양력 변환은 다음 모듈에서) */
  inputCalendar: CalendarType;
  isLeapMonth: boolean;

  /** 입력 일자 (입력 달력 기준) */
  year: number;
  month: number;
  day: number;

  /** 출생시각 — 시간 미상이면 null. approximate면 hour/minute는 있어도 hourUncertain=true. */
  hour: number | null;        // 0~23
  minute: number;             // 0~59 (미상이면 0)
  hourUnknown: boolean;
  hourUncertain: boolean;     // approximate일 때 true
  hourAtBoundary: boolean;    // approximate + 시진 경계 ±15분일 때 true

  /** 사용자 컨텍스트 (GPT 입력 JSON + contextGuard 필터의 원본) */
  context: UserContext;
}

// ============================================================
// 정규화 함수
// ============================================================

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIME_RE = /^(\d{2}):(\d{2})$/;

export class BirthInputError extends Error {
  constructor(message: string, public readonly field: keyof BirthInput) {
    super(message);
    this.name = 'BirthInputError';
  }
}

export function normalizeBirthInput(input: BirthInput, now: Date = new Date()): NormalizedBirth {
  if (input.timezone !== 'Asia/Seoul') {
    throw new BirthInputError('현재 Asia/Seoul만 지원합니다.', 'timezone');
  }

  // 날짜 파싱
  const dm = DATE_RE.exec(input.birthDate);
  if (!dm) throw new BirthInputError('birthDate는 YYYY-MM-DD 형식', 'birthDate');
  const year = Number(dm[1]);
  const month = Number(dm[2]);
  const day = Number(dm[3]);
  if (year < 1900 || year > 2100) throw new BirthInputError('연도는 1900~2100', 'birthDate');
  if (month < 1 || month > 12) throw new BirthInputError('월은 1~12', 'birthDate');
  if (day < 1 || day > 31) throw new BirthInputError('일은 1~31', 'birthDate');

  // 시간 파싱 + confidence 처리
  let hour: number | null = null;
  let minute = 0;
  let hourUnknown = false;
  let hourUncertain = false;
  let hourAtBoundary = false;

  if (input.birthTimeConfidence === 'unknown') {
    hourUnknown = true;
  } else {
    if (!input.birthTime) {
      throw new BirthInputError('birthTimeConfidence가 unknown이 아니면 birthTime 필수', 'birthTime');
    }
    const tm = TIME_RE.exec(input.birthTime);
    if (!tm) throw new BirthInputError('birthTime은 HH:mm 형식', 'birthTime');
    hour = Number(tm[1]);
    minute = Number(tm[2]);
    if (hour < 0 || hour > 23) throw new BirthInputError('시는 0~23', 'birthTime');
    if (minute < 0 || minute > 59) throw new BirthInputError('분은 0~59', 'birthTime');

    if (input.birthTimeConfidence === 'approximate') {
      hourUncertain = true;
      hourAtBoundary = isAtHourBoundary(hour, minute);
    }
  }

  // 음력 윤달 — calendarType=solar면 무시
  const isLeapMonth = input.calendarType === 'lunar' ? input.isLeapMonth === true : false;

  // 사용자 컨텍스트
  const ageYears = now.getFullYear() - year; // 만 나이 근사. 생일 미경과 보정은 양력 변환 후 정확히.
  const context: UserContext = {
    name: input.name,
    gender: input.gender,
    ageYears,
    ageGroup: classifyAgeGroup(ageYears),
    relationshipStatus: input.relationshipStatus ?? 'unknown',
    hasChildren: input.hasChildren ?? 'unknown',
    occupation: input.occupation,
    currentConcerns: input.currentConcerns ?? [],
  };

  return {
    raw: input,
    inputCalendar: input.calendarType,
    isLeapMonth,
    year,
    month,
    day,
    hour,
    minute,
    hourUnknown,
    hourUncertain,
    hourAtBoundary,
    context,
  };
}

// ============================================================
// 헬퍼
// ============================================================

/** 시진 경계: 1·3·5·7·9·11·13·15·17·19·21·23시 정각의 ±15분
 *  자시(23~01)는 23시 0분과 01시 0분 양쪽이 경계.
 */
export function isAtHourBoundary(hour: number, minute: number): boolean {
  // 모든 홀수 시각(시진 시작점)을 경계로 본다 (±15분)
  const boundaryHours = [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23];
  const totalMin = hour * 60 + minute;
  for (const bh of boundaryHours) {
    const bmin = bh * 60;
    if (Math.abs(totalMin - bmin) <= 15) return true;
  }
  // 자시 경계: 23:45 ~ 00:15
  if (hour === 0 && minute <= 15) return true;
  if (hour === 23 && minute >= 45) return true;
  return false;
}

export function classifyAgeGroup(age: number): AgeGroup {
  if (age <= 12) return 'child';
  if (age <= 19) return 'teen';
  if (age <= 29) return 'twenties';
  if (age <= 39) return 'thirties';
  if (age <= 49) return 'forties';
  if (age <= 59) return 'fifties';
  return 'sixties_plus';
}
