// Yearly Fortune (올해운세) V4 — deterministic 분석 빌더.
//
// Phase 1 (Y2a~Y2g) deterministic 계산만 담는다. LLM 호출 X.
// 각 sub-phase 함수는 독립적으로 호출/테스트 가능하도록 export.
//
// Y2a (현재 phase): 세운 간지 + 천간/지지/지장간 십성 + 입춘 경계 처리.

import { stemByIndex, type HeavenlyStem, stemIndex } from '../rules/heavenlyStems';
import { branchByIndex, type EarthlyBranch, branchIndex } from '../rules/earthlyBranches';
import { calcTenGod } from '../rules/tenGods';
import { HIDDEN_STEMS } from '../rules/hiddenStems';
import { findApplicableJie } from '../calendar/solarTermProvider';
import {
  calculateFortuneCycles,
  type DaewoonPillar,
  type FortuneCycleResult,
} from '../calendar/fortuneCycleCalculator';
import type { NormalizedBirth } from '../calendar/normalizeBirthInput';
import type { FourPillars } from '../calendar/pillarCalculator';
import {
  STEM_COMBOS, BRANCH_SIX, BRANCH_HALF, BRANCH_THREE, BRANCH_DIRECTION,
} from '../rules/combinations';
import {
  BRANCH_CONFLICTS, BRANCH_DESTRUCTIONS, BRANCH_HARMS, BRANCH_PUNISHMENTS,
} from '../rules/conflicts';
import { STEM_ELEMENT, ELEMENT_KO, ELEMENTS, PRODUCES, RESTRAINS, type Element } from '../rules/elements';
import { YEAR_STEM_TO_INWOL_STEM } from '../rules/heavenlyStems';
import { MONTH_INDEX_TO_BRANCH } from '../rules/earthlyBranches';
import type { TenGod, UsefulGodAnalysis, DayMasterStrengthAnalysis } from '../report/sajuReportSchema';
import type {
  Ganji, YearTenGodAnalysis, CurrentDaewoon, Interaction,
  DaewoonSewoonInteraction, NatalSewoonInteraction, NatalSewoonAdvancedHint,
  PalaceTopic, YearlyRelationshipStatus,
  YearElementEffect, UsefulGodRelation, StrengthImpact, YearlyStrengthEffect,
  MonthlyFortuneAnalysis, YearlyTopicKey, NextYearSummary,
} from './yearlyTypes';
// solar term raw access for monthly boundaries
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar: _Solar } = require('lunar-javascript');

// ============================================================
// Y2a-1. 적용 saju 연도 결정 (입춘 경계)
// ============================================================
//
// 규칙:
//   - findApplicableJie(y, m, d, 12, 0)이 monthIndex=12 (축월) 이고
//     양력 month가 1 또는 2(입춘 이전)이면 → sajuYear = solarYear - 1
//   - 그 외 → sajuYear = solarYear
//
// override가 주어지면 입력값 그대로 사용.
export function resolveTargetSajuYear(currentDate: string, override?: number): number {
  if (typeof override === 'number' && Number.isFinite(override)) return Math.trunc(override);

  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(currentDate);
  if (!m) throw new Error(`currentDate 형식이 잘못됨 (YYYY-MM-DD 필요): ${currentDate}`);
  const y = Number(m[1]);
  const mon = Number(m[2]);
  const d = Number(m[3]);

  // 정오 기준 적용 절기 (절기 발생 시각이 정오를 넘으면 직전 절기 적용 → 입춘 전이면 축월 반환)
  const jie = findApplicableJie(y, mon, d, 12, 0);
  if (jie.monthIndex === 12 && (mon === 1 || mon === 2)) {
    return y - 1;
  }
  return y;
}

// ============================================================
// Y2a-2. 60갑자 cycle math로 연 간지 계산
// ============================================================
//
// 기준: 서기 4년(=갑자년). (sajuYear - 4) % 10 → 천간 index, % 12 → 지지 index.
// 음수 보정은 stemByIndex / branchByIndex 내부에서 처리.
export function computeYearGanji(sajuYear: number): Ganji {
  const offset = sajuYear - 4;
  const stem = stemByIndex(offset);
  const branch = branchByIndex(offset);
  return { stem, branch, display: `${stem}${branch}` };
}

// ============================================================
// Y2a-3. 세운 십성 (천간 + 지지 본기 + 지장간 중기·여기)
// ============================================================
//
// stemTenGod        ← 세운 천간 → dayMaster 십성
// branchMainTenGod  ← 세운 지지의 본기 천간 → dayMaster 십성
// hiddenStemTenGods ← 세운 지지의 중기/여기 천간(있을 때) → dayMaster 십성 (본기 제외, 등장 순서대로)
export function computeYearTenGod(dayMaster: HeavenlyStem, yearGanji: Ganji): YearTenGodAnalysis {
  const stem = yearGanji.stem as HeavenlyStem;
  const branch = yearGanji.branch as EarthlyBranch;

  const stemTenGod = calcTenGod(dayMaster, stem);

  const hiddens = HIDDEN_STEMS[branch];
  const primary = hiddens.find(h => h.role === 'primary');
  if (!primary) throw new Error(`HIDDEN_STEMS에 primary가 없음: ${branch}`);
  const branchMainTenGod = calcTenGod(dayMaster, primary.stem);

  const hiddenStemTenGods = hiddens
    .filter(h => h.role !== 'primary')
    .map(h => calcTenGod(dayMaster, h.stem));

  const plainMeaning =
    `${yearGanji.display}년의 천간 ${stem}은(는) 일간 ${dayMaster}에게 ${stemTenGod}으로, ` +
    `지지 ${branch}의 본기는 ${branchMainTenGod}` +
    (hiddenStemTenGods.length > 0 ? `, 지장간은 ${hiddenStemTenGods.join('·')}으로 들어옵니다.` : '으로 들어옵니다.');

  return {
    stemTenGod,
    branchMainTenGod,
    hiddenStemTenGods,
    plainMeaning,
  };
}

// ============================================================
// (참고) Y2a 통합 호출 — 외부에서 한 번에 받기 좋게 묶은 헬퍼
// ============================================================
export interface Y2aResult {
  sajuYear: number;
  ganji: Ganji;
  yearTenGod: YearTenGodAnalysis;
}

export function buildY2a(args: {
  currentDate: string;
  targetYear?: number;
  dayMaster: HeavenlyStem;
}): Y2aResult {
  const sajuYear = resolveTargetSajuYear(args.currentDate, args.targetYear);
  const ganji = computeYearGanji(sajuYear);
  const yearTenGod = computeYearTenGod(args.dayMaster, ganji);
  return { sajuYear, ganji, yearTenGod };
}

// ============================================================
// Y2b. 현재 대운 식별 + 대운 십성
// ============================================================
//
// 정합 원칙:
//   - 대운 리스트(daewoonList) 자체는 fortuneCycleCalculator.calculateFortuneCycles 결과를 그대로 사용.
//   - 활성 대운 선택만 본 파일에서 currentDate decimal age 기준으로 day-level 정확도로 재선택.
//   - daewoonList는 이미 startAge 소수점 정밀도이므로, decimal age 비교는 자연스러운 확장이며
//     기존 결과(currentDaewoon)와 일치하는 경우가 대부분. 차이는 대운 경계 직후에만 발생(test로 검증).
//
// 경계 규칙 (명시):
//   - 활성 대운 = decimal age가 [startAge, startAge+10) 구간에 들어가는 대운.
//   - currentDate가 새 대운 시작일과 정확히 같으면 → 새 대운으로 진입 (closed [start, ...) ).
//   - decimal age < 첫 대운 startAge → 첫 대운 반환 (출생~첫 대운 진입 전 기간 보수적 처리).
//   - decimal age >= 마지막 대운 endAge → 마지막 대운 반환.

/** 출생일~현재일 (YYYY-MM-DD) 사이의 소수점 만 나이. 365.2425일 기준. */
export function computeDecimalAge(birthDate: string, currentDate: string): number {
  const parse = (s: string): { y: number; m: number; d: number } => {
    const x = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
    if (!x) throw new Error(`날짜 형식이 잘못됨 (YYYY-MM-DD 필요): ${s}`);
    return { y: Number(x[1]), m: Number(x[2]), d: Number(x[3]) };
  };
  const b = parse(birthDate);
  const c = parse(currentDate);
  const bEpoch = Date.UTC(b.y, b.m - 1, b.d);
  const cEpoch = Date.UTC(c.y, c.m - 1, c.d);
  return (cEpoch - bEpoch) / (365.2425 * 24 * 60 * 60 * 1000);
}

/** daewoonList(이미 startAge 소수점)에서 decimal age 기준 활성 대운 선택. */
export function selectActiveDaewoon(daewoonList: DaewoonPillar[], decimalAge: number): DaewoonPillar {
  if (daewoonList.length === 0) throw new Error('daewoonList가 비어 있음');
  // 첫 대운 시작 전 → 첫 대운으로 보수적 처리
  if (decimalAge < daewoonList[0].startAge) return daewoonList[0];
  // 마지막 대운 끝 이후 → 마지막 대운
  const last = daewoonList[daewoonList.length - 1];
  if (decimalAge >= last.startAge + 10) return last;
  // 그 외: startAge <= age < startAge + 10
  let picked = daewoonList[0];
  for (const d of daewoonList) {
    if (decimalAge >= d.startAge) picked = d;
    else break;
  }
  return picked;
}

/** 대운 천간/지지 → 일간 기준 십성 + plainMeaning 시드 */
export function computeDaewoonTenGod(
  dayMaster: HeavenlyStem,
  daewoonPillar: DaewoonPillar,
): CurrentDaewoon {
  const stem = daewoonPillar.stem;
  const branch = daewoonPillar.branch;
  const stemTenGod = calcTenGod(dayMaster, stem);

  const hiddens = HIDDEN_STEMS[branch];
  const primary = hiddens.find(h => h.role === 'primary');
  if (!primary) throw new Error(`HIDDEN_STEMS primary 없음: ${branch}`);
  const branchTenGod = calcTenGod(dayMaster, primary.stem);
  const hiddenStemTenGods = hiddens
    .filter(h => h.role !== 'primary')
    .map(h => calcTenGod(dayMaster, h.stem));

  const ageRange = `${daewoonPillar.startAge}~${(daewoonPillar.startAge + 10).toFixed(1)}세`;
  const plainMeaning =
    `현재 대운 ${daewoonPillar.pillarKo} (${ageRange})은 ` +
    `천간 ${stem}이(가) 일간 ${dayMaster}에게 ${stemTenGod}으로, ` +
    `지지 ${branch}의 본기는 ${branchTenGod}` +
    (hiddenStemTenGods.length > 0 ? `, 지장간은 ${hiddenStemTenGods.join('·')}으로 작동합니다.` : '으로 작동합니다.');

  return {
    pillar: daewoonPillar,
    stemTenGod,
    branchTenGod,
    hiddenStemTenGods,
    plainMeaning,
  };
}

// ── Y2b 통합 ────────────────────────────────────────────────
export interface Y2bResult {
  /** 기존 fortuneCycleCalculator 결과 그대로 (감사·디버그용) */
  fortuneCycle: FortuneCycleResult;
  /** 8주기 대운 리스트 (위 결과의 daewoonList — 정합 보장) */
  daewoonList: DaewoonPillar[];
  /** currentDate 기준 day-level 활성 대운 (decimal age 선택) */
  activeDaewoon: DaewoonPillar;
  /** decimal 만 나이 */
  decimalAge: number;
  /** 활성 대운 + 십성 + plainMeaning */
  currentDaewoon: CurrentDaewoon;
}

export function buildY2b(args: {
  normalizedBirth: NormalizedBirth;
  pillars: FourPillars;
  currentDate: string;
}): Y2bResult {
  const parse = (s: string): number => {
    const x = /^(\d{4})/.exec(s);
    if (!x) throw new Error(`currentDate 형식이 잘못됨: ${s}`);
    return Number(x[1]);
  };
  const currentYear = parse(args.currentDate);
  const fortuneCycle = calculateFortuneCycles(args.normalizedBirth, args.pillars, currentYear);

  // birthDate: NormalizedBirth는 year/month/day가 입력 달력 기준이므로
  // 음력 입력일 때는 부정확할 수 있으나, 대운 자체는 calculateFortuneCycles 내부에서
  // 양력 환산을 거치므로 daewoonList는 정확함.
  // 음력 보정이 필요하면 fortuneCycle의 firstDaewoonStartAge를 활용해 fallback할 수 있음.
  // 본 Y2b에서는 입력이 양력인 경우만 정확. (개인사주 fixture A/B/C는 모두 양력).
  const birthDate = `${args.normalizedBirth.year}-${String(args.normalizedBirth.month).padStart(2, '0')}-${String(args.normalizedBirth.day).padStart(2, '0')}`;
  const decimalAge = computeDecimalAge(birthDate, args.currentDate);
  const activeDaewoon = selectActiveDaewoon(fortuneCycle.daewoonList, decimalAge);
  const currentDaewoon = computeDaewoonTenGod(args.pillars.dayMaster, activeDaewoon);
  return {
    fortuneCycle,
    daewoonList: fortuneCycle.daewoonList,
    activeDaewoon,
    decimalAge,
    currentDaewoon,
  };
}

// ============================================================
// Y2c. 대운-세운 합·충 + 지지 합충형파해
// ============================================================
//
// 해석 원칙 (불안 조장 금지, "좋다/나쁘다" 단정 금지):
//   - 합 = 연결·묶임·협력·방향성 형성
//   - 충 = 변화·흔들림·방향 전환·조정 필요
//   - 형 = 마찰·기준 어긋남·조정 필요
//   - 파 = 누수·일관성 깨짐
//   - 해 = 소소한 어긋남·신경 쓸 결
//
// 본 함수는 두 pillar(대운 + 세운) 사이의 2-element interaction만 다룬다.
// 삼합/방합/지세지형(인사신)/무은지형(축술미)은 3-pillar 요구 → Y2d/Y2f에서 별도 처리.

// 천간충 — rules/conflicts.ts에 별도 export 없으므로 본 파일에 정의.
// 전통: 갑경/을신/병임/정계 4쌍 (무·기는 토끼리 서로 충 없음).
const STEM_CONFLICTS: ReadonlyArray<readonly [HeavenlyStem, HeavenlyStem]> = [
  ['갑', '경'], ['을', '신'], ['병', '임'], ['정', '계'],
];

// 자형 — BRANCH_PUNISHMENTS 중 같은 글자 2개(자형)만 추출
const SELF_PUNISHMENTS: ReadonlyArray<EarthlyBranch> = ['진', '오', '유', '해'];

// 자묘 무례지형 — 2-pillar로 성립 가능한 형 (BRANCH_PUNISHMENTS[0])
const MUREI_PAIR: readonly [EarthlyBranch, EarthlyBranch] = ['자', '묘'];

/** 한 쌍이 정해진 쌍 배열 중 하나와 일치하면 그 entry 반환 */
function findPair<T extends readonly [string, string]>(
  pairs: ReadonlyArray<T>,
  a: string, b: string,
): T | undefined {
  return pairs.find(p =>
    (p[0] === a && p[1] === b) || (p[0] === b && p[1] === a),
  );
}

/**
 * 두 pillar 사이 합·충·형·파·해 interaction 모두 수집.
 * 같은 쌍에서 여러 작용이 동시에 성립할 수 있다(예: 인-해 = 합 + 파).
 */
export function computeDaewoonSewoonInteractions(
  daewoonPillar: DaewoonPillar,
  sewoonGanji: Ganji,
): Interaction[] {
  const dStem = daewoonPillar.stem;
  const dBranch = daewoonPillar.branch;
  const sStem = sewoonGanji.stem as HeavenlyStem;
  const sBranch = sewoonGanji.branch as EarthlyBranch;
  const interactions: Interaction[] = [];

  // ── 1) 천간합 ──────────────────────────────────────────
  const stemCombo = STEM_COMBOS.find(c =>
    (c.pair[0] === dStem && c.pair[1] === sStem) ||
    (c.pair[0] === sStem && c.pair[1] === dStem),
  );
  if (stemCombo) {
    interactions.push({
      kind: '합',
      target: 'stem',
      from: '대운',
      to: '세운',
      label: stemCombo.name,
      between: `대운 ${dStem} + 세운 ${sStem} → ${stemCombo.name}`,
      scopeTag: 'daewoon-sewoon-stem-combo',
      plainMeaning: `대운 ${dStem}과(와) 세운 ${sStem}이(가) 합하여 한 방향(${stemCombo.name})으로 묶이는 흐름이 생깁니다.`,
      lifeSceneHint: '협업 제안이 들어오거나 약속이 한 방향으로 모이는 장면이 늘 수 있어요.',
      adviceHint: {
        actionable: '시작 전에 역할·기여 범위·정산 조건을 짧게 정리해두면 합의 결이 흐트러지지 않습니다.',
        activatePattern: '같은 방향을 가진 사람·환경에 시간을 더 붙이기',
      },
      intensity: 'medium',
    });
  }

  // ── 2) 천간충 ──────────────────────────────────────────
  const stemConflict = findPair(STEM_CONFLICTS, dStem, sStem);
  if (stemConflict) {
    interactions.push({
      kind: '충',
      target: 'stem',
      from: '대운',
      to: '세운',
      label: `${stemConflict[0]}-${stemConflict[1]} 천간충`,
      between: `대운 ${dStem} ↔ 세운 ${sStem} 천간충`,
      scopeTag: 'daewoon-sewoon-stem-conflict',
      plainMeaning: `대운 ${dStem}과(와) 세운 ${sStem}이(가) 부딪쳐 기준·방향의 조정이 필요한 흐름이 됩니다.`,
      lifeSceneHint: '판단해야 할 선택이 잦아지고, 기존 기준이 한 번 흔들리는 장면이 늘 수 있어요.',
      adviceHint: {
        actionable: '큰 결정은 충동적으로 내리지 말고 한 단계 검증을 더 두는 것이 좋습니다.',
        avoidPattern: '기존 방식만 고집하거나, 흔들림을 무시하고 밀어붙이는 패턴.',
      },
      intensity: 'strong',
    });
  }

  // ── 3) 지지 육합 ───────────────────────────────────────
  const branchSix = BRANCH_SIX.find(c =>
    (c.pair[0] === dBranch && c.pair[1] === sBranch) ||
    (c.pair[0] === sBranch && c.pair[1] === dBranch),
  );
  if (branchSix) {
    interactions.push({
      kind: '합',
      target: 'branch',
      from: '대운',
      to: '세운',
      label: branchSix.name,
      between: `대운 ${dBranch} + 세운 ${sBranch} → ${branchSix.name}`,
      scopeTag: 'daewoon-sewoon-branch-six',
      plainMeaning: `대운 ${dBranch}과(와) 세운 ${sBranch}이(가) 묶이며 공통 방향(${branchSix.name})이 자연스럽게 만들어집니다.`,
      lifeSceneHint: '오래 알고 지낸 사람·환경과 새로 연결되거나, 흐름이 한 방향으로 모이는 장면이 늘 수 있어요.',
      adviceHint: {
        actionable: '같은 방향을 잡은 만큼 책임도 같이 묶이므로, 어디까지 함께 갈지 선을 분명히 하는 것이 좋습니다.',
        activatePattern: '오래 봐온 관계·환경을 다시 챙겨두기',
      },
      intensity: 'medium',
    });
  }

  // ── 4) 지지 반합 ───────────────────────────────────────
  const branchHalf = BRANCH_HALF.find(c =>
    (c.pair[0] === dBranch && c.pair[1] === sBranch) ||
    (c.pair[0] === sBranch && c.pair[1] === dBranch),
  );
  if (branchHalf) {
    interactions.push({
      kind: '합',
      target: 'branch',
      from: '대운',
      to: '세운',
      label: branchHalf.name,
      between: `대운 ${dBranch} + 세운 ${sBranch} → ${branchHalf.name}`,
      scopeTag: 'daewoon-sewoon-branch-half',
      plainMeaning: `${branchHalf.name}이 작동하여 한 오행 결(${ELEMENT_KO[branchHalf.produces]}) 쪽으로 흐름이 모입니다.`,
      lifeSceneHint: '특정 주제(돈·관계·일 중 하나)에 관심과 시간이 자연스럽게 쏠리는 장면이 생길 수 있어요.',
      adviceHint: {
        actionable: '쏠리는 쪽이 분명해질수록 다른 영역에서의 균형을 의식해두는 편이 좋습니다.',
      },
      intensity: 'medium',
    });
  }

  // ── 5) 지지 충 ─────────────────────────────────────────
  const branchConflict = findPair(BRANCH_CONFLICTS, dBranch, sBranch);
  if (branchConflict) {
    interactions.push({
      kind: '충',
      target: 'branch',
      from: '대운',
      to: '세운',
      label: `${branchConflict[0]}-${branchConflict[1]} 충`,
      between: `대운 ${dBranch} ↔ 세운 ${sBranch} 지지충`,
      scopeTag: 'daewoon-sewoon-branch-conflict',
      plainMeaning: `대운 ${dBranch}과(와) 세운 ${sBranch}의 충은 환경·역할·자리의 흔들림과 방향 전환을 요구하는 흐름입니다.`,
      lifeSceneHint: '일하는 환경이나 역할의 경계가 다시 그어지는 장면이 생길 수 있어요.',
      adviceHint: {
        actionable: '버티기보다, 역할·환경·계약 조건을 다시 점검해 정리하는 것이 좋습니다.',
        avoidPattern: '흔들림을 무시하고 같은 방식을 강하게 밀어붙이는 패턴.',
        activatePattern: '작은 변화를 먼저 시도해 큰 흔들림을 줄이기.',
      },
      intensity: 'strong',
    });
  }

  // ── 6) 지지 형 ─────────────────────────────────────────
  // 자묘 무례지형
  if (
    (dBranch === MUREI_PAIR[0] && sBranch === MUREI_PAIR[1]) ||
    (dBranch === MUREI_PAIR[1] && sBranch === MUREI_PAIR[0])
  ) {
    interactions.push({
      kind: '형',
      target: 'branch',
      from: '대운',
      to: '세운',
      label: '자묘 무례지형',
      between: `대운 ${dBranch} ↔ 세운 ${sBranch} (자묘 무례지형)`,
      scopeTag: 'daewoon-sewoon-branch-pun-murei',
      plainMeaning: '자묘 무례지형은 가까운 관계에서 기준이 어긋나 마찰이 생기기 쉬운 결을 뜻합니다.',
      lifeSceneHint: '말투·태도의 작은 차이가 가까운 사람과의 거리감으로 이어지는 장면이 생길 수 있어요.',
      adviceHint: {
        actionable: '감정 대신 사실로 기준을 다시 확인하고, 마음이 닫히기 전에 신호를 짧게 나누는 편이 좋습니다.',
      },
      intensity: 'medium',
    });
  }
  // 자형 (같은 글자)
  if (dBranch === sBranch && SELF_PUNISHMENTS.includes(dBranch)) {
    interactions.push({
      kind: '형',
      target: 'branch',
      from: '대운',
      to: '세운',
      label: `${dBranch}${sBranch} 자형`,
      between: `대운 ${dBranch} ↔ 세운 ${sBranch} 자형`,
      scopeTag: 'daewoon-sewoon-branch-self-pun',
      plainMeaning: '같은 지지가 겹치는 자형은 자신과의 마찰·내부의 답답함이 늘기 쉬운 결로 봅니다.',
      lifeSceneHint: '겉으론 문제 없어 보여도 안에서 같은 고민이 반복되는 장면이 생길 수 있어요.',
      adviceHint: {
        actionable: '머리로 풀려 하기보다, 짧게라도 환경을 바꾸고 몸을 움직이는 시간을 두는 편이 좋습니다.',
      },
      intensity: 'medium',
    });
  }

  // ── 7) 지지 파 ─────────────────────────────────────────
  const destruction = findPair(BRANCH_DESTRUCTIONS, dBranch, sBranch);
  if (destruction) {
    interactions.push({
      kind: '파',
      target: 'branch',
      from: '대운',
      to: '세운',
      label: `${destruction[0]}-${destruction[1]} 파`,
      between: `대운 ${dBranch} ↔ 세운 ${sBranch} 파`,
      scopeTag: 'daewoon-sewoon-branch-destruction',
      plainMeaning: '파는 흐름의 일관성이 깨지고 진행 중인 일에 작은 누수가 생기기 쉬운 결입니다.',
      lifeSceneHint: '예정된 일정이 미뤄지거나 약속이 한두 번 어긋나는 장면이 늘 수 있어요.',
      adviceHint: {
        actionable: '중간 점검 빈도를 평소보다 한 단계 늘리고, 구두 약속은 짧은 메모로 남기는 것이 좋습니다.',
      },
      intensity: 'mild',
    });
  }

  // ── 8) 지지 해 ─────────────────────────────────────────
  const harm = findPair(BRANCH_HARMS, dBranch, sBranch);
  if (harm) {
    interactions.push({
      kind: '해',
      target: 'branch',
      from: '대운',
      to: '세운',
      label: `${harm[0]}-${harm[1]} 해`,
      between: `대운 ${dBranch} ↔ 세운 ${sBranch} 해`,
      scopeTag: 'daewoon-sewoon-branch-harm',
      plainMeaning: '해는 소소하게 어긋나는 결로, 큰 사건보다 신경 쓸 작은 일이 늘기 쉬운 흐름입니다.',
      lifeSceneHint: '일·관계에서 작은 어긋남이 누적되어 피로가 늘 수 있는 장면이 생길 수 있어요.',
      adviceHint: {
        actionable: '피로 신호가 보이면 한 가지 일을 잠시 분리해 회복 시간을 만드는 편이 좋습니다.',
      },
      intensity: 'mild',
    });
  }

  return interactions;
}

/** Y2c 통합 — 대운/세운 ganji 두 개로부터 DaewoonSewoonInteraction 한 묶음 생성. */
export function buildY2c(args: {
  daewoonPillar: DaewoonPillar;
  sewoonGanji: Ganji;
}): DaewoonSewoonInteraction {
  const interactions = computeDaewoonSewoonInteractions(args.daewoonPillar, args.sewoonGanji);
  const summary =
    interactions.length === 0
      ? `대운 ${args.daewoonPillar.pillarKo}과(와) 세운 ${args.sewoonGanji.display} 사이에 두드러진 합·충·형·파·해는 없습니다.`
      : `대운 ${args.daewoonPillar.pillarKo}과(와) 세운 ${args.sewoonGanji.display} 사이에 ${interactions.map(i => i.label).join(', ')} 작용이 있습니다.`;
  const plainMeaning =
    interactions.length === 0
      ? '두 흐름이 직접 부딪치지 않아 큰 변동 신호보다 기존 결이 이어지는 한 해로 볼 수 있습니다.'
      : '합은 묶임과 방향, 충은 흔들림과 전환, 형·파·해는 마찰과 어긋남으로 풀이합니다. 모두 단정이 아닌 흐름 신호로 봅니다.';
  return { summary, interactions, plainMeaning };
}

// ============================================================
// Y2d. 세운 ↔ 원국 4주 합·충·형·파·해 + 궁 영향 매핑
// ============================================================
//
// 본 함수는 세운(target year)이 원국의 년/월/일/시주 각각을 어떻게 건드리는지 계산하고
// 그 결과를 궁(palace) 기반 lifeSceneHint·adviceHint로 매핑한다.
//
// 처리 범위:
//   - 2-pillar interaction (세운 ↔ 원국 N주): 천간합/천간충, 지지 육합/반합/충/자묘 형/자형/파/해
//   - 3-pillar interaction (advanced): 세운 지지가 원국 두 지지와 함께 삼합/방합/지세지형/무은지형 완성하는 경우
//     → NatalSewoonAdvancedHint[]로 별도 반환 (Phase 2 확장 자리, 본 Y2d에서는 detect까지만)
//
// 안전 톤 (명세 §7~§8 그대로):
//   - "합=좋음/충=나쁨" 단정 금지
//   - 사고/사망/파산/이혼확정/질병/중병/실패확정/무조건깨짐 표현 금지
//   - relationshipStatus가 unknown이면 일주 lifeSceneHint에 "배우자/남편/아내" 단정 금지
//   - hasChildren이 unknown이면 시주 lifeSceneHint에 "자녀" 단정 금지

// ── 궁 메타 ────────────────────────────────────────────────
interface PalaceMeta {
  pillarLabel: '년주' | '월주' | '일주' | '시주';
  topic: PalaceTopic;
  /** kind별 현실 장면 시드 (palace-aware) */
  sceneByKind: Record<Exclude<Interaction['kind'], 'none'>, string>;
  /** kind별 행동 조언 시드 */
  adviceByKind: Record<Exclude<Interaction['kind'], 'none'>, string>;
  /** 작용 없을 때 표시할 안내 */
  emptyScene: string;
}

const PALACE_INFO: Record<'year' | 'month' | 'day' | 'hour', PalaceMeta> = {
  year: {
    pillarLabel: '년주', topic: '배경',
    sceneByKind: {
      '합': '가족·오래 봐온 인연·옛 환경과 다시 연결되는 결이 생길 수 있어요.',
      '충': '가족이나 배경 환경에 변화·전환 신호가 생기는 장면이 늘 수 있어요.',
      '형': '가족 안에서 오래 묵었던 기준 차이가 드러나는 장면이 생길 수 있어요.',
      '파': '오랜 약속·계획에 작은 누수가 생기는 장면이 있을 수 있어요.',
      '해': '옛 인연·환경에서 소소한 어긋남이 늘 수 있는 장면이 생길 수 있어요.',
    },
    adviceByKind: {
      '합': '오래된 결을 다시 챙기되 책임 범위는 분명히 두는 편이 좋습니다.',
      '충': '버티기보다 가족/배경 환경의 역할과 거리를 한 번 정리해두는 편이 좋습니다.',
      '형': '감정 대신 사실로 기준을 다시 확인하고 짧게 신호를 나누는 편이 좋습니다.',
      '파': '구두 약속은 한 번 더 정리해두는 편이 좋습니다.',
      '해': '소소한 불편이 누적되지 않게 한 번씩 거리를 조정하는 편이 좋습니다.',
    },
    emptyScene: '배경/가족 영역에서 두드러진 변화 신호는 적은 편으로, 기존 결이 이어집니다.',
  },
  month: {
    pillarLabel: '월주', topic: '사회/일',
    sceneByKind: {
      '합': '직장·팀에서 협업이나 책임이 한 방향으로 모이는 장면이 생길 수 있어요.',
      '충': '직장·역할·업무 환경에 변화·전환 신호가 생기는 장면이 늘 수 있어요.',
      '형': '조직 안에서 기준이 어긋나 마찰이 생기는 장면이 있을 수 있어요.',
      '파': '진행 중인 프로젝트·계약 흐름에 누수가 생기는 장면이 있을 수 있어요.',
      '해': '동료·상사와의 소소한 어긋남이 늘 수 있는 장면이 생길 수 있어요.',
    },
    adviceByKind: {
      '합': '시작 전에 역할·권한·평가 기준을 짧게 정리해두는 편이 좋습니다.',
      '충': '바로 결정하기보다 역할·범위·계약 조건을 다시 점검해 정리하는 편이 좋습니다.',
      '형': '말투보다 기준 문서로 정리해두는 편이 좋습니다.',
      '파': '중간 점검 빈도를 평소보다 한 단계 늘리는 편이 좋습니다.',
      '해': '피로 신호가 생기면 한 가지 일을 잠시 분리해두는 편이 좋습니다.',
    },
    emptyScene: '사회·일 영역에서 강한 변화 신호는 적은 편으로, 기존 역할 흐름이 이어집니다.',
  },
  day: {
    pillarLabel: '일주', topic: '나/관계',
    sceneByKind: {
      '합': '가까운 관계와의 연결이나 생활 리듬이 한 방향으로 모이는 장면이 생길 수 있어요.',
      '충': '가까운 관계·생활 리듬에 변화·조정 신호가 생기는 장면이 늘 수 있어요.',
      '형': '가까운 사람과의 기준 마찰이 드러나는 장면이 있을 수 있어요.',
      '파': '가까운 약속이나 일상 루틴이 어긋나기 쉬운 장면이 있을 수 있어요.',
      '해': '가까운 관계에서 신경 쓸 작은 결이 늘 수 있는 장면이 생길 수 있어요.',
    },
    adviceByKind: {
      '합': '연결이 깊어질수록 기준은 더 분명히 나눠두는 편이 좋습니다.',
      '충': '바로 큰 결정을 내리기보다 생활 리듬을 먼저 정비하는 편이 좋습니다.',
      '형': '감정이 커지기 전 짧게 신호를 나누는 편이 좋습니다.',
      '파': '약속·일정은 짧은 메모로 남기는 편이 좋습니다.',
      '해': '한 번 거리를 두고 회복 시간을 두는 편이 좋습니다.',
    },
    emptyScene: '나/가까운 관계 영역에서 강한 변동 신호는 적은 편으로, 평소 결이 이어집니다.',
  },
  hour: {
    pillarLabel: '시주', topic: '미래/결과물',
    sceneByKind: {
      '합': '결과물·장기 계획·후배·제자 영역에서 연결이 만들어지는 장면이 생길 수 있어요.',
      '충': '결과물·계획·일정에 방향 전환 신호가 생기는 장면이 늘 수 있어요.',
      '형': '장기 계획의 기준이 어긋나 조정이 필요한 장면이 있을 수 있어요.',
      '파': '결과물 일정이 미뤄지거나 약속이 어긋나는 장면이 있을 수 있어요.',
      '해': '후배·제자·장기 계획에서 소소한 어긋남이 늘 수 있는 장면이 생길 수 있어요.',
    },
    adviceByKind: {
      '합': '시작 전에 결과물의 형태와 일정 기준을 짧게 정리해두는 편이 좋습니다.',
      '충': '큰 방향을 바꾸기 전 작은 변화부터 시도해보는 편이 좋습니다.',
      '형': '기준을 문서로 한 번 정리해 공유하는 편이 좋습니다.',
      '파': '일정 점검과 결과물 중간 확인 빈도를 한 단계 늘리는 편이 좋습니다.',
      '해': '돌봐야 할 일·사람이 있는 영역에서 작은 조정을 미루지 않는 편이 좋습니다.',
    },
    emptyScene: '결과물/장기 계획 영역에서 강한 변화 신호는 적은 편으로, 기존 방향이 이어집니다.',
  },
};

// ── 일주/시주 caution (relationshipStatus / hasChildren 미상) ──
function dayPalaceCaution(rs?: YearlyRelationshipStatus): string | undefined {
  if (!rs || rs === 'unknown') return '일주 해석은 결혼 여부 단정 없이 "가까운 관계" 또는 "장기적 관계를 생각한다면" 중립 표현으로 다룹니다.';
  if (rs === 'single' || rs === 'divorced' || rs === 'dating') return '일주 해석은 현재 관계 상태를 단정하지 않고 가까운 관계 결로 다룹니다.';
  return undefined; // married
}
function hourPalaceCaution(hc?: boolean | 'unknown'): string | undefined {
  if (hc === true) return undefined;
  return '시주 해석은 자녀 보유 단정 없이 "결과물·후배·제자·돌봄이 필요한 대상" 중립 표현으로 다룹니다.';
}

// ── pair 작용 detector — Y2d 전용 (Y2c와 독립 유지, 안전) ─────
// Y2c와 같은 rule을 사용하되 wrap 형태가 palace-aware라 분리.
interface PairFinding {
  kind: '합' | '충' | '형' | '파' | '해';
  target: 'stem' | 'branch';
  label: string;
  scopeBase: string;
  basePlainMeaning: string;
  intensity: Interaction['intensity'];
}

function detectPair(stemA: HeavenlyStem, branchA: EarthlyBranch, stemB: HeavenlyStem, branchB: EarthlyBranch): PairFinding[] {
  const out: PairFinding[] = [];
  // 천간합
  const stemCombo = STEM_COMBOS.find(c =>
    (c.pair[0] === stemA && c.pair[1] === stemB) || (c.pair[0] === stemB && c.pair[1] === stemA),
  );
  if (stemCombo) out.push({ kind: '합', target: 'stem', label: stemCombo.name, scopeBase: 'stem-combo', basePlainMeaning: `${stemA}과(와) ${stemB}이(가) 합하여 한 방향(${stemCombo.name})으로 묶입니다.`, intensity: 'medium' });
  // 천간충
  const stemConflict = STEM_CONFLICTS.find(p =>
    (p[0] === stemA && p[1] === stemB) || (p[0] === stemB && p[1] === stemA),
  );
  if (stemConflict) out.push({ kind: '충', target: 'stem', label: `${stemConflict[0]}-${stemConflict[1]} 천간충`, scopeBase: 'stem-conflict', basePlainMeaning: `${stemA}과(와) ${stemB}의 천간충은 기준·방향의 조정이 필요한 흐름입니다.`, intensity: 'strong' });
  // 지지 육합
  const branchSix = BRANCH_SIX.find(c =>
    (c.pair[0] === branchA && c.pair[1] === branchB) || (c.pair[0] === branchB && c.pair[1] === branchA),
  );
  if (branchSix) out.push({ kind: '합', target: 'branch', label: branchSix.name, scopeBase: 'branch-six', basePlainMeaning: `${branchA}-${branchB}의 육합(${branchSix.name})은 공통 방향이 만들어지는 결입니다.`, intensity: 'medium' });
  // 지지 반합
  const branchHalf = BRANCH_HALF.find(c =>
    (c.pair[0] === branchA && c.pair[1] === branchB) || (c.pair[0] === branchB && c.pair[1] === branchA),
  );
  if (branchHalf) out.push({ kind: '합', target: 'branch', label: branchHalf.name, scopeBase: 'branch-half', basePlainMeaning: `${branchHalf.name}이 작동하여 한 오행(${ELEMENT_KO[branchHalf.produces]}) 결로 모이는 흐름입니다.`, intensity: 'medium' });
  // 지지 충
  const branchConflict = BRANCH_CONFLICTS.find(p =>
    (p[0] === branchA && p[1] === branchB) || (p[0] === branchB && p[1] === branchA),
  );
  if (branchConflict) out.push({ kind: '충', target: 'branch', label: `${branchConflict[0]}-${branchConflict[1]} 충`, scopeBase: 'branch-conflict', basePlainMeaning: `${branchA}-${branchB}의 충은 환경·역할의 흔들림과 방향 전환을 요구하는 결입니다.`, intensity: 'strong' });
  // 형 (자묘)
  if ((branchA === MUREI_PAIR[0] && branchB === MUREI_PAIR[1]) || (branchA === MUREI_PAIR[1] && branchB === MUREI_PAIR[0])) {
    out.push({ kind: '형', target: 'branch', label: '자묘 무례지형', scopeBase: 'branch-pun-murei', basePlainMeaning: '자묘 무례지형은 가까운 결에서 기준이 어긋날 수 있는 결입니다.', intensity: 'medium' });
  }
  // 형 (자형)
  if (branchA === branchB && SELF_PUNISHMENTS.includes(branchA)) {
    out.push({ kind: '형', target: 'branch', label: `${branchA}${branchB} 자형`, scopeBase: 'branch-self-pun', basePlainMeaning: '같은 지지가 겹치는 자형은 자신과의 마찰이 늘기 쉬운 결입니다.', intensity: 'medium' });
  }
  // 파
  const destruction = BRANCH_DESTRUCTIONS.find(p =>
    (p[0] === branchA && p[1] === branchB) || (p[0] === branchB && p[1] === branchA),
  );
  if (destruction) out.push({ kind: '파', target: 'branch', label: `${destruction[0]}-${destruction[1]} 파`, scopeBase: 'branch-destruction', basePlainMeaning: '파는 일관성이 깨지고 진행이 끊기기 쉬운 결입니다.', intensity: 'mild' });
  // 해
  const harm = BRANCH_HARMS.find(p =>
    (p[0] === branchA && p[1] === branchB) || (p[0] === branchB && p[1] === branchA),
  );
  if (harm) out.push({ kind: '해', target: 'branch', label: `${harm[0]}-${harm[1]} 해`, scopeBase: 'branch-harm', basePlainMeaning: '해는 소소하게 어긋나는 결입니다.', intensity: 'mild' });
  return out;
}

// ── pillar별 group 빌드 ────────────────────────────────────
function buildPillarGroup(
  pillarKey: 'year' | 'month' | 'day' | 'hour',
  natalPillar: { stem: HeavenlyStem; branch: EarthlyBranch },
  sewoonGanji: Ganji,
  options: { relationshipStatus?: YearlyRelationshipStatus; hasChildren?: boolean | 'unknown' } = {},
): NatalSewoonInteraction {
  const meta = PALACE_INFO[pillarKey];
  const sStem = sewoonGanji.stem as HeavenlyStem;
  const sBranch = sewoonGanji.branch as EarthlyBranch;
  const findings = detectPair(sStem, sBranch, natalPillar.stem, natalPillar.branch);

  const interactions: Interaction[] = findings.map(f => ({
    kind: f.kind,
    target: f.target,
    from: '세운',
    to: `원국-${meta.pillarLabel}`,
    label: f.label,
    between: `세운 ${f.target === 'stem' ? sStem : sBranch} ↔ ${meta.pillarLabel} ${f.target === 'stem' ? natalPillar.stem : natalPillar.branch} (${f.label})`,
    scopeTag: `sewoon-natal-${pillarKey}-${f.scopeBase}`,
    plainMeaning: f.basePlainMeaning,
    lifeSceneHint: meta.sceneByKind[f.kind],
    adviceHint: { actionable: meta.adviceByKind[f.kind] },
    intensity: f.intensity,
  }));

  // 가장 강한 작용 1개를 group lifeSceneHint/adviceHint 대표로 채택
  const order: Interaction['intensity'][] = ['strong', 'medium', 'mild'];
  const repr = [...interactions].sort((a, b) => order.indexOf(a.intensity) - order.indexOf(b.intensity))[0];

  const summary = interactions.length === 0
    ? `세운 ${sewoonGanji.display} ↔ ${meta.pillarLabel}: 두드러진 합·충·형·파·해 없음.`
    : `세운 ${sewoonGanji.display} ↔ ${meta.pillarLabel}: ${interactions.map(i => i.label).join(', ')}.`;

  const plainMeaning = interactions.length === 0
    ? `${meta.pillarLabel}(${meta.topic})를 세운이 직접 건드리지 않는 한 해로 볼 수 있습니다.`
    : `세운이 ${meta.pillarLabel}(${meta.topic})를 건드리는 결이 있으며, 합은 묶임/방향, 충은 흔들림/전환, 형·파·해는 마찰·누수·어긋남으로 풉니다.`;

  const lifeSceneHint = repr ? repr.lifeSceneHint! : meta.emptyScene;
  const adviceHint = repr?.adviceHint;

  // 일주/시주 caution (relationshipStatus / hasChildren 단정 방지 안내)
  let caution: string | undefined;
  if (pillarKey === 'day') caution = dayPalaceCaution(options.relationshipStatus);
  if (pillarKey === 'hour') caution = hourPalaceCaution(options.hasChildren);

  return {
    pillar: pillarKey,
    pillarLabel: meta.pillarLabel,
    palaceTopic: meta.topic,
    interactions,
    summary,
    plainMeaning,
    lifeSceneHint,
    adviceHint,
    caution,
  };
}

/** 세운 ↔ 원국 4주 각각의 작용 묶음 (시주 없으면 3개) */
export function computeNatalSewoonInteractions(
  pillars: FourPillars,
  sewoonGanji: Ganji,
  options: { relationshipStatus?: YearlyRelationshipStatus; hasChildren?: boolean | 'unknown' } = {},
): NatalSewoonInteraction[] {
  const groups: NatalSewoonInteraction[] = [];
  groups.push(buildPillarGroup('year',  { stem: pillars.year.stem,  branch: pillars.year.branch  }, sewoonGanji, options));
  groups.push(buildPillarGroup('month', { stem: pillars.month.stem, branch: pillars.month.branch }, sewoonGanji, options));
  groups.push(buildPillarGroup('day',   { stem: pillars.day.stem,   branch: pillars.day.branch   }, sewoonGanji, options));
  if (pillars.hour) {
    groups.push(buildPillarGroup('hour', { stem: pillars.hour.stem, branch: pillars.hour.branch }, sewoonGanji, options));
  }
  return groups;
}

// ── Phase 2 advanced detect (3-pillar 완성) ─────────────────
/**
 * 세운 지지가 원국 두 지지와 만나 삼합/방합/지세지형/무은지형 중 하나를 완성하는지 detect.
 * detect만 수행 — 안정화는 Phase 2에서.
 */
export function detectNatalSewoonAdvancedHints(
  pillars: FourPillars,
  sewoonGanji: Ganji,
): NatalSewoonAdvancedHint[] {
  const out: NatalSewoonAdvancedHint[] = [];
  const sBranch = sewoonGanji.branch as EarthlyBranch;
  const natalBranches: Array<{ key: string; branch: EarthlyBranch }> = [
    { key: '년지', branch: pillars.year.branch },
    { key: '월지', branch: pillars.month.branch },
    { key: '일지', branch: pillars.day.branch },
  ];
  if (pillars.hour) natalBranches.push({ key: '시지', branch: pillars.hour.branch });

  const natalSet = natalBranches.map(b => b.branch);

  // 삼합 (세운 + 원국 두 지지)
  for (const tri of BRANCH_THREE) {
    if (tri.triplet.includes(sBranch)) {
      const others = tri.triplet.filter(b => b !== sBranch);
      const matchA = natalBranches.find(n => n.branch === others[0]);
      const matchB = natalBranches.find(n => n.branch === others[1]);
      if (matchA && matchB) {
        out.push({
          kind: '삼합완성',
          involves: [`세운 ${sBranch}`, `원국 ${matchA.key} ${matchA.branch}`, `원국 ${matchB.key} ${matchB.branch}`],
          label: `${tri.name} (세운+${matchA.key}+${matchB.key})`,
          plainMeaning: `세운이 원국과 함께 ${tri.name}을 완성하는 흐름이 만들어집니다. 한 오행(${ELEMENT_KO[tri.produces]}) 결로 모이는 신호로 보세요.`,
          intensity: 'strong',
        });
      }
    }
  }
  // 방합
  for (const dir of BRANCH_DIRECTION) {
    if (dir.triplet.includes(sBranch)) {
      const others = dir.triplet.filter(b => b !== sBranch);
      const matchA = natalBranches.find(n => n.branch === others[0]);
      const matchB = natalBranches.find(n => n.branch === others[1]);
      if (matchA && matchB) {
        out.push({
          kind: '방합완성',
          involves: [`세운 ${sBranch}`, `원국 ${matchA.key} ${matchA.branch}`, `원국 ${matchB.key} ${matchB.branch}`],
          label: `${dir.name} (세운+${matchA.key}+${matchB.key})`,
          plainMeaning: `세운이 원국과 함께 ${dir.name}을 완성합니다. 계절적 결(${ELEMENT_KO[dir.produces]})이 한 방향으로 강해지는 신호입니다.`,
          intensity: 'strong',
        });
      }
    }
  }
  // 3-element 형 (지세지형 인사신 / 무은지형 축술미)
  for (const pun of BRANCH_PUNISHMENTS) {
    if (pun.branches.length !== 3) continue;
    if (!pun.branches.includes(sBranch)) continue;
    const others = pun.branches.filter(b => b !== sBranch);
    const matched = others.map(b => natalBranches.find(n => n.branch === b));
    if (matched.every(m => !!m)) {
      out.push({
        kind: pun.subtype === '지세지형' ? '지세지형완성' : '무은지형완성',
        involves: [`세운 ${sBranch}`, ...others.map((b, i) => `원국 ${matched[i]!.key} ${b}`)],
        label: `${pun.name} (세운+원국 2지지)`,
        plainMeaning: `${pun.name}이 세운에서 완성되어 가까운 결의 마찰이 늘 수 있습니다. 기준을 문서로 정리해두는 편이 좋습니다.`,
        intensity: 'medium',
      });
    }
  }
  // 기존 합이 충으로 깨지는지 / 충이 합으로 풀리는지 등 더 정교한 detect는 Phase 2로 미룸.
  void natalSet;
  return out;
}

// ── Y2d 통합 ───────────────────────────────────────────────
export interface Y2dResult {
  natalSewoonInteractions: NatalSewoonInteraction[];
  advancedHints: NatalSewoonAdvancedHint[];
}

export function buildY2d(args: {
  pillars: FourPillars;
  sewoonGanji: Ganji;
  options?: { relationshipStatus?: YearlyRelationshipStatus; hasChildren?: boolean | 'unknown' };
}): Y2dResult {
  return {
    natalSewoonInteractions: computeNatalSewoonInteractions(args.pillars, args.sewoonGanji, args.options),
    advancedHints: detectNatalSewoonAdvancedHints(args.pillars, args.sewoonGanji),
  };
}

// ============================================================
// Y2e. 세운 오행 vs 용신/희신/기신 + 신강/신약 부담/지원
// ============================================================
//
// 정합:
//   - usefulGod 결과는 기존 coreAnalysis.usefulGod 그대로 사용 (재계산 X).
//   - dayMasterStrength도 기존 coreAnalysis.dayMasterStrength 그대로 사용.
//
// 안전 톤 (명세 §6, §10):
//   - "용신=무조건 좋다" / "기신=올해 나쁘다" 단정 금지
//   - 기신 결도 "과해지면 부담" / "조건 정리 전략" 톤으로 풀이
//   - 신강/신약은 사람의 강약이 아니라 사주 구조 설명

const KO_TO_ELEMENT_INTERNAL: Record<string, Element> = {
  목: 'wood', 화: 'fire', 토: 'earth', 금: 'metal', 수: 'water',
};

/** TenGod → Element (일간 기준) */
function tenGodToElement(tg: TenGod, dayMaster: HeavenlyStem): Element {
  const myEl = STEM_ELEMENT[dayMaster];
  switch (tg) {
    case '비견':
    case '겁재':
      return myEl;
    case '식신':
    case '상관':
      return PRODUCES[myEl];
    case '편재':
    case '정재':
      return RESTRAINS[myEl];
    case '편관':
    case '정관':
      // 일간을 극하는 element (invert RESTRAINS)
      for (const el of ELEMENTS) if (RESTRAINS[el] === myEl) return el;
      throw new Error('unreachable: 관성 element 추론 실패');
    case '편인':
    case '정인':
      // 일간을 생하는 element (invert PRODUCES)
      for (const el of ELEMENTS) if (PRODUCES[el] === myEl) return el;
      throw new Error('unreachable: 인성 element 추론 실패');
  }
}

/** Element|TenGod 혼합 배열을 Element 배열로 정규화 */
function toElementList(arr: ReadonlyArray<Element | TenGod>, dayMaster: HeavenlyStem): Element[] {
  return arr.map(v => (ELEMENTS.includes(v as Element) ? (v as Element) : tenGodToElement(v as TenGod, dayMaster)));
}

/** usefulGod의 primary/secondary/favorable/unfavorable을 element 배열로 펼침 */
function normalizeUsefulGodToElements(usefulGod: UsefulGodAnalysis, dayMaster: HeavenlyStem): {
  useful: Element[]; favorable: Element[]; unfavorable: Element[];
} {
  const useful: Element[] = [];
  if (usefulGod.primaryUseful) {
    useful.push(
      ELEMENTS.includes(usefulGod.primaryUseful.value as Element)
        ? (usefulGod.primaryUseful.value as Element)
        : tenGodToElement(usefulGod.primaryUseful.value as TenGod, dayMaster),
    );
  }
  if (usefulGod.secondaryUseful) {
    useful.push(
      ELEMENTS.includes(usefulGod.secondaryUseful.value as Element)
        ? (usefulGod.secondaryUseful.value as Element)
        : tenGodToElement(usefulGod.secondaryUseful.value as TenGod, dayMaster),
    );
  }
  return {
    useful,
    favorable: toElementList(usefulGod.favorable ?? [], dayMaster),
    unfavorable: toElementList(usefulGod.unfavorable ?? [], dayMaster),
  };
}

/** 세운 천간 element를 일간 기준 십성 카테고리로 분류 */
type YearRelToDayMaster = '비겁' | '인성' | '식상' | '재성' | '관성';
function yearRelToDayMaster(yearEl: Element, dmEl: Element): YearRelToDayMaster {
  if (yearEl === dmEl) return '비겁';
  if (PRODUCES[yearEl] === dmEl) return '인성';
  if (PRODUCES[dmEl] === yearEl) return '식상';
  if (RESTRAINS[yearEl] === dmEl) return '관성';
  if (RESTRAINS[dmEl] === yearEl) return '재성';
  throw new Error('unreachable: 세운-일간 관계 분류 실패');
}

/** Y2e-1. 세운 오행 vs 용신/희신/기신 분류 + metadata */
export function computeYearElementEffect(
  yearGanji: Ganji,
  dayMaster: HeavenlyStem,
  usefulGod: UsefulGodAnalysis,
): YearElementEffect {
  const yearStemEl = STEM_ELEMENT[yearGanji.stem as HeavenlyStem];
  const ko = ELEMENT_KO[yearStemEl] as YearElementEffect['element'];
  const norm = normalizeUsefulGodToElements(usefulGod, dayMaster);

  let relation: UsefulGodRelation;
  if (norm.useful.includes(yearStemEl)) relation = 'useful';
  else if (norm.favorable.includes(yearStemEl)) relation = 'favorable';
  else if (norm.unfavorable.includes(yearStemEl)) relation = 'unfavorable';
  else relation = 'neutral';

  let label: string, plainMeaning: string, lifeSceneHint: string;
  let adviceHint: YearElementEffect['adviceHint'];
  let caution: string | undefined;
  let intensity: YearElementEffect['intensity'];

  switch (relation) {
    case 'useful':
      label = `${ko} 기운 — 용신 결`;
      plainMeaning = `올해 들어오는 ${ko} 기운은 이 사주를 편하게 살려주는 방향(용신)에 가깝습니다. 균형을 잡아주는 결로 봅니다.`;
      lifeSceneHint = `${ko} 결의 환경·습관·관계가 자연스럽게 들어오는 장면이 늘 수 있어요.`;
      adviceHint = {
        actionable: `${ko} 결을 생활 속에 더 자주 붙이는 선택이 운을 편하게 만듭니다.`,
        activatePattern: `${ko} 결의 환경·관계를 의식해서 챙기기.`,
      };
      intensity = 'strong';
      break;
    case 'favorable':
      label = `${ko} 기운 — 희신 결`;
      plainMeaning = `올해 들어오는 ${ko} 기운은 용신을 도와주는 보조 방향(희신)에 가깝습니다. 직접 핵심은 아니어도 운을 편하게 만드는 보조 기운으로 봅니다.`;
      lifeSceneHint = `${ko} 결의 보조 환경이 흐름을 풀어주는 장면이 생길 수 있어요.`;
      adviceHint = {
        actionable: `${ko} 결을 부담 없이 더 자주 활용하는 편이 좋습니다.`,
        activatePattern: `핵심은 아니지만 받쳐주는 결로 보조적으로 들이기.`,
      };
      intensity = 'medium';
      break;
    case 'unfavorable':
      label = `${ko} 기운 — 기신 결 (과해지면 부담)`;
      plainMeaning = `올해 들어오는 ${ko} 기운은 과해지면 운이 막히는 결(기신)에 가깝습니다. 단순히 어려운 해라기보다, 무리하게 확장하기보다 조건과 역할을 먼저 정리하는 쪽이 안정적입니다.`;
      lifeSceneHint = `${ko} 결의 요구가 갑자기 늘어나며 부담이 커지는 장면이 생길 수 있어요.`;
      adviceHint = {
        actionable: `기회를 다 잡으려 하기보다, 조건을 먼저 정리하고 선택적으로 받는 편이 좋습니다.`,
        avoidPattern: `${ko} 결의 요구가 커질 때 무리하게 확장·결정하는 패턴.`,
        activatePattern: `작게 검증하고, 정리되지 않은 일은 늘리지 않기.`,
      };
      caution = `기신은 "어려운 해" 단정이 아니라 "과해지면 부담이 커지는 결"로 풀이합니다. 불안 단정 금지.`;
      intensity = 'strong';
      break;
    default:
      label = `${ko} 기운 — 중립 결`;
      plainMeaning = `올해 들어오는 ${ko} 기운은 용신·희신·기신과 직접 연결되지 않는 중립 결로 봅니다. 큰 균형 변동보다 기존 결이 이어집니다.`;
      lifeSceneHint = `평소 결이 그대로 이어지는 장면이 많을 수 있어요.`;
      adviceHint = {
        actionable: `평소 결을 유지하되 작은 변화에서 방향을 다듬는 편이 좋습니다.`,
      };
      intensity = 'mild';
      break;
  }

  return { element: ko, relationToUsefulGod: relation, label, plainMeaning, lifeSceneHint, adviceHint, caution, intensity };
}

/** Y2e-2. 신강/신약 vs 세운 오행 → 부담/지원 판정 + metadata */
export function computeStrengthImpact(
  yearGanji: Ganji,
  dayMaster: HeavenlyStem,
  dms: DayMasterStrengthAnalysis,
): StrengthImpact {
  const yearStemEl = STEM_ELEMENT[yearGanji.stem as HeavenlyStem];
  const dmEl = STEM_ELEMENT[dayMaster];
  const rel = yearRelToDayMaster(yearStemEl, dmEl);
  const yearKo = ELEMENT_KO[yearStemEl];

  const strongLevel = dms.level === 'very-strong' || dms.level === 'strong';
  const weakLevel = dms.level === 'weak' || dms.level === 'very-weak';

  let natalStrength: '신강' | '신약' | '중화';
  let yearlyEffect: YearlyStrengthEffect;

  if (strongLevel) {
    natalStrength = '신강';
    yearlyEffect = (rel === '비겁' || rel === '인성') ? 'burdensome' : 'supportive';
  } else if (weakLevel) {
    natalStrength = '신약';
    yearlyEffect = (rel === '비겁' || rel === '인성') ? 'supportive' : 'burdensome';
  } else {
    natalStrength = '중화';
    yearlyEffect = 'neutral';
  }

  let plainMeaning: string, lifeSceneHint: string;
  let adviceHint: StrengthImpact['adviceHint'];
  let caution: string | undefined;

  const key = `${natalStrength}/${yearlyEffect}`;
  switch (key) {
    case '신강/burdensome':
      plainMeaning = `이 사주는 자기 기준과 버티는 힘이 강한 신강 구조입니다. 올해 들어오는 ${yearKo} 기운(${rel})이 그 힘을 더 키우는 결이라, 추진력으로 살리되 과부하·고집·타협 지연을 의식해두는 편이 좋습니다.`;
      lifeSceneHint = `"내가 다 해야 한다"는 감각이 더 자주 올라오는 장면이 늘 수 있어요.`;
      adviceHint = {
        actionable: `책임을 맡기 전 권한·범위·평가 기준을 한 번 더 확인하는 편이 좋습니다.`,
        avoidPattern: `도움을 받지 않고 혼자 끌고 가는 패턴.`,
        activatePattern: `기준을 사람들과 공유하고 구조로 남기는 선택.`,
      };
      caution = `"신강=유리 / 신약=불리" 식으로 풀지 않습니다. 사주 구조 설명입니다.`;
      break;
    case '신강/supportive':
      plainMeaning = `이 사주는 신강 구조이며, 올해 들어오는 ${yearKo} 기운(${rel})은 강한 힘을 덜어 균형을 만드는 결로 봅니다. 추진과 정리, 책임과 권한의 비율이 자연스럽게 잡힐 수 있어요.`;
      lifeSceneHint = `맡고 있던 일을 정리하거나 책임의 범위를 다시 그리는 장면이 생길 수 있어요.`;
      adviceHint = {
        actionable: `들어오는 기회를 작은 단위로 검증하고 보상 기준을 명확히 하는 편이 좋습니다.`,
        activatePattern: `내 기준을 외부에 검증받는 선택.`,
      };
      caution = `"신강=유리 / 신약=불리" 식으로 풀지 않습니다.`;
      break;
    case '신약/supportive':
      plainMeaning = `이 사주는 신약 구조로, 사주 안에서 일간을 직접 받쳐주는 힘이 상대적으로 적습니다. 혼자 버티기보다 환경·정보·협업·조언을 붙일 때 안정되는 결로 봅니다. 올해 들어오는 ${yearKo} 기운(${rel})은 이 구조를 받쳐주는 결로 봅니다.`;
      lifeSceneHint = `필요했던 정보·환경·사람이 자연스럽게 붙는 장면이 늘 수 있어요.`;
      adviceHint = {
        actionable: `도움이 들어올 때 짧게 정리해서 받는 습관을 만드는 편이 좋습니다.`,
        activatePattern: `협업·조언·문서로 중심을 보완하는 선택.`,
      };
      caution = `신약은 사람의 강약이 아니라 "환경을 잘 붙일 때 안정되는 구조"로 풀이합니다.`;
      break;
    case '신약/burdensome':
      plainMeaning = `이 사주는 환경·협업으로 보완하는 신약 구조입니다. 올해 들어오는 ${yearKo} 기운(${rel})은 요구·소모가 늘기 쉬운 결로 봅니다. 단순히 어려운 해라기보다, 기회를 다 잡기보다 조건을 고르고 무리하지 않는 전략이 안정적입니다.`;
      lifeSceneHint = `요청·일·관계가 한꺼번에 몰리며 피로가 쌓일 수 있는 장면이 생길 수 있어요.`;
      adviceHint = {
        actionable: `들어오는 기회를 모두 받지 말고 조건이 맞는 것만 골라 받는 편이 좋습니다.`,
        avoidPattern: `거절하지 못해 떠안는 패턴.`,
        activatePattern: `조건·범위를 먼저 정리하고 들어가는 선택.`,
      };
      caution = `신약은 부족함의 뜻이 아니라 "혼자 다 잡을 필요 없다"로 풉니다.`;
      break;
    default: // 중화/neutral
      plainMeaning = `이 사주는 한쪽으로 극단적으로 쏠리기보다 환경에 따라 힘의 방향이 달라지는 중화 구조입니다. 올해는 어떤 사람·환경·조건에 붙느냐가 큰 차이를 만듭니다.`;
      lifeSceneHint = `환경 변화에 따라 강점이 다르게 드러나는 장면이 생길 수 있어요.`;
      adviceHint = {
        actionable: `판이 바뀌는 신호가 보이면 결을 빠르게 읽고 접근을 조정하는 편이 좋습니다.`,
        activatePattern: `한 가지 방식만 고집하지 않고 환경별 강점을 다르게 활용.`,
      };
      caution = `"중화=두루뭉술"이 아니라 "환경에 따라 다르게 작동하는 구조"입니다.`;
      break;
  }

  return { natalStrength, yearlyEffect, plainMeaning, lifeSceneHint, adviceHint, caution };
}

// ── Y2e 통합 ───────────────────────────────────────────────
export interface Y2eResult {
  yearElementEffect: YearElementEffect;
  strengthImpact: StrengthImpact;
}

export function buildY2e(args: {
  yearGanji: Ganji;
  dayMaster: HeavenlyStem;
  usefulGod: UsefulGodAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
}): Y2eResult {
  return {
    yearElementEffect: computeYearElementEffect(args.yearGanji, args.dayMaster, args.usefulGod),
    strengthImpact: computeStrengthImpact(args.yearGanji, args.dayMaster, args.dayMasterStrength),
  };
}

// ============================================================
// Y2f. 남은 월운 — 절기 기준 구간 + 월간/월지 십성 + 합충 + 용신 활성도
// ============================================================
//
// 절기 boundary:
//   - lunar-javascript의 JieQiTable에서 12절 epoch을 읽어 [start, next) 구간 = 1개 월운
//   - currentDate가 어느 월운 구간 안에 있는지 detect → 그 월운(남은 기간)부터 sajuYear 축월 끝까지
//
// 월간 계산:
//   - 五虎遁訣 (YEAR_STEM_TO_INWOL_STEM)로 인월 천간 결정 → monthIndex-1만큼 stemByIndex 진행
//
// 안전 톤:
//   - 단정 미래 예측 X, financial-advice-risk X, medical-advice-risk X
//   - relationshipStatus/hasChildren 미상이면 일주/시주 영향 lifeSceneHint 중립
//
// 정합:
//   - Y2c/Y2d의 detectPair (private) 그대로 재사용 → 동일 합·충·형·파·해 규칙
//   - Y2e의 normalizeUsefulGodToElements 재사용 → 동일 용신/기신 분류
//   - 신강/신약 부담/지원 판정도 동일 규칙

const JIE_NODES_ORDER: ReadonlyArray<string> = [
  '立春', '惊蛰', '清明', '立夏', '芒种', '小暑',
  '立秋', '白露', '寒露', '立冬', '大雪', '小寒',
];
const JIE_KO: Record<string, string> = {
  '立春': '입춘', '惊蛰': '경칩', '清明': '청명', '立夏': '입하',
  '芒种': '망종', '小暑': '소서', '立秋': '입추', '白露': '백로',
  '寒露': '한로', '立冬': '입동', '大雪': '대설', '小寒': '소한',
};

interface MonthSegment {
  startEpoch: number;
  endEpoch: number;
  startIso: string;        // YYYY-MM-DD (KST 기준)
  endIso: string;          // 종료 절기 직전 — 표시용
  monthIndex: number;      // 1=인월 ~ 12=축월
  monthBranch: '인' | '묘' | '진' | '사' | '오' | '미' | '신' | '유' | '술' | '해' | '자' | '축';
  jieKo: string;           // 시작 절기 한글명
  nextJieKo: string;       // 다음 절기 한글명
}

function dateToEpochKST(year: number, month: number, day: number): number {
  // KST → UTC: -9h
  return Date.UTC(year, month - 1, day, -9, 0, 0);
}

function epochToIso(epoch: number): string {
  // KST 기준 표기. UTC epoch를 +9h해 표시 (잘못 보이는 +1일 방지)
  const d = new Date(epoch + 9 * 60 * 60 * 1000);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

/** sajuYear의 12개 월(인월~축월) segment 생성. 절기 KST 시각 기준 [start, next). */
function buildMonthSegments(sajuYear: number): MonthSegment[] {
  // sajuYear 입춘 ~ (sajuYear+1) 입춘 직전 까지의 12개 절기
  const segments: MonthSegment[] = [];
  // JieQiTable from sajuYear, sajuYear+1
  const tableThis = _Solar.fromYmd(sajuYear, 1, 1).getLunar().getJieQiTable();
  const tableNext = _Solar.fromYmd(sajuYear + 1, 1, 1).getLunar().getJieQiTable();

  // 인월 시작 = sajuYear 입춘
  // 자월 시작 = sajuYear 대설
  // 축월 시작 = sajuYear+1 소한 (sajuYear의 1~2월에 있는 그 소한이 아님; 축월=소한 후 sajuYear+1 입춘 전)
  // 즉 사주 연도 N의 12절 노드는 sajuYear의 입춘 ~ 자월(대설) + sajuYear+1의 소한(축월 시작)
  // 끝 = sajuYear+1 입춘.

  const nodeEpochs: Array<{ jieName: string; epoch: number; monthIndex: number }> = [];
  // 사주 연도 N의 인월~자월 (입춘~소한 직전까지가 자월. 소한은 sajuYear+1년 양력 1월 초)
  // 정확히: 입춘(1), 경칩(2), ..., 대설(11) 모두 sajuYear에 있음. 소한(12)은 sajuYear+1에 있음.
  for (let i = 0; i < 11; i++) {
    const jie = JIE_NODES_ORDER[i];
    const p = tableThis[jie];
    if (!p) continue;
    nodeEpochs.push({
      jieName: jie,
      epoch: Date.UTC(p.getYear(), p.getMonth() - 1, p.getDay(), p.getHour() - 9, p.getMinute(), p.getSecond()),
      monthIndex: i + 1,
    });
  }
  // 소한 (sajuYear+1)
  const sohan = tableNext['小寒'];
  if (sohan) {
    nodeEpochs.push({
      jieName: '小寒', monthIndex: 12,
      epoch: Date.UTC(sohan.getYear(), sohan.getMonth() - 1, sohan.getDay(), sohan.getHour() - 9, sohan.getMinute(), sohan.getSecond()),
    });
  }
  // 다음해 입춘 — 축월의 끝
  const ipchunNext = tableNext['立春'];
  const ipchunNextEpoch = ipchunNext
    ? Date.UTC(ipchunNext.getYear(), ipchunNext.getMonth() - 1, ipchunNext.getDay(), ipchunNext.getHour() - 9, ipchunNext.getMinute(), ipchunNext.getSecond())
    : null;

  for (let i = 0; i < nodeEpochs.length; i++) {
    const cur = nodeEpochs[i];
    const nextEpoch = i < nodeEpochs.length - 1 ? nodeEpochs[i + 1].epoch : ipchunNextEpoch;
    if (nextEpoch === null) continue;
    const nextJie = i < nodeEpochs.length - 1 ? nodeEpochs[i + 1].jieName : '立春';
    segments.push({
      startEpoch: cur.epoch,
      endEpoch: nextEpoch,
      startIso: epochToIso(cur.epoch),
      endIso: epochToIso(nextEpoch),
      monthIndex: cur.monthIndex,
      monthBranch: MONTH_INDEX_TO_BRANCH[cur.monthIndex] as MonthSegment['monthBranch'],
      jieKo: JIE_KO[cur.jieName] ?? cur.jieName,
      nextJieKo: JIE_KO[nextJie] ?? nextJie,
    });
  }
  return segments;
}

/** 월간 천간 — 五虎遁訣 */
function computeMonthStem(yearStem: HeavenlyStem, monthIndex: number): HeavenlyStem {
  const inwol = YEAR_STEM_TO_INWOL_STEM[yearStem];
  return stemByIndex(stemIndex(inwol) + (monthIndex - 1));
}

/** currentDate 이후 남은 월 segment만 추림 (첫 segment는 currentDate로 truncate) */
export interface RemainingMonthSegment extends MonthSegment {
  effectiveStartIso: string; // currentDate가 segment 안이면 currentDate, 아니면 startIso
  truncatedStart: boolean;
}

export function findRemainingMonthSegments(currentDate: string, sajuYear: number): RemainingMonthSegment[] {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(currentDate);
  if (!m) throw new Error(`currentDate 형식이 잘못됨: ${currentDate}`);
  const curEpoch = dateToEpochKST(Number(m[1]), Number(m[2]), Number(m[3]));
  const segments = buildMonthSegments(sajuYear);
  const out: RemainingMonthSegment[] = [];
  for (const seg of segments) {
    if (seg.endEpoch <= curEpoch) continue; // 이미 지난 월
    const truncated = curEpoch > seg.startEpoch && curEpoch < seg.endEpoch;
    out.push({
      ...seg,
      effectiveStartIso: truncated ? currentDate : seg.startIso,
      truncatedStart: truncated,
    });
  }
  return out;
}

// ── 십성 카테고리 → keyword/topic 매핑 ─────────────────────
type TenGodCategory = '비겁' | '식상' | '재성' | '관성' | '인성';

function tenGodToCategory(tg: TenGod): TenGodCategory {
  switch (tg) {
    case '비견': case '겁재': return '비겁';
    case '식신': case '상관': return '식상';
    case '편재': case '정재': return '재성';
    case '편관': case '정관': return '관성';
    case '편인': case '정인': return '인성';
  }
}

// 월별 키워드 — 십성 "카테고리"가 아니라 정확한 10십성으로 분리한다.
// 월천간은 갑→을→병… 순서라 연속 두 달이 같은 오행(같은 카테고리)일 수 있는데
// (예: 갑오월·을미월 = 둘 다 관성 카테고리), 정확한 십성은 항상 달라(갑=정관, 을=편관)
// 연속 달이 동일 키워드/시드로 collapse되는 문제를 막는다.
const MONTH_KEYWORD_BY_TENGOD: Record<TenGod, string> = {
  '비견': '같은 결의 사람들과 나란히 서는 달',
  '겁재': '추진력과 경쟁이 함께 세지는 달',
  '식신': '꾸준히 만들어 내는 결이 살아나는 달',
  '상관': '재능을 드러내되 말이 앞서기 쉬운 달',
  '정재': '꾸준한 보상과 현실 관리가 중요한 달',
  '편재': '기회와 유동적인 자원이 움직이는 달',
  '정관': '역할과 규범이 또렷해지는 달',
  '편관': '압박과 도전이 동시에 들어오는 달',
  '정인': '배움과 정리가 나를 받쳐 주는 달',
  '편인': '관점이 깊어지되 흐름이 들쭉날쭉한 달',
};

// 월별 본문 시드 — 정확한 10십성별. (plain/scene/good/caution)
const TENGOD_SEED: Record<TenGod, { plain: string; scene: string; good: string; caution: string }> = {
  '비견': {
    plain: '비슷한 힘을 가진 사람들과 나란히 서며 내 몫과 자립을 시험받는 흐름이 강해질 수 있어요.',
    scene: '동료·또래와 역할이 겹치거나 내 자리를 분명히 해야 하는 장면이 생길 수 있어요.',
    good: '내 몫과 경계를 분명히 정해 두기.',
    caution: '다 같이 한다는 분위기에 휩쓸려 내 기준을 놓는 자리.',
  },
  '겁재': {
    plain: '추진력과 경쟁심이 함께 올라오고, 자원이 빠르게 들고 나는 흐름이 강해질 수 있어요.',
    scene: '함께 벌이는 일에서 속도가 붙거나, 지출·분배를 두고 신경 쓸 장면이 생길 수 있어요.',
    good: '함께 벌인 일의 몫과 비용을 미리 정해 두기.',
    caution: '분위기에 밀려 무리하게 떠안는 자리.',
  },
  '식신': {
    plain: '꾸준히 만들고 표현하는 결이 살아나며, 준비한 것이 자연스럽게 형태를 갖추는 흐름이 강해질 수 있어요.',
    scene: '하던 일을 차분히 이어 결과물로 다듬는 장면이 생길 수 있어요.',
    good: '작게라도 꾸준히 내보내며 반응으로 다듬기.',
    caution: '편하다는 이유로 늘어져 마무리를 미루는 패턴.',
  },
  '상관': {
    plain: '재능과 표현력이 강하게 드러나지만, 기존 규범·윗사람 기준과 부딪히기도 쉬운 흐름이에요.',
    scene: '내 아이디어를 강하게 내세우다 평가·규칙과 마찰이 생기는 장면이 있을 수 있어요.',
    good: '말보다 결과물로 보여 주고, 표현 수위를 한 번 점검하기.',
    caution: '지적·비판이 앞서 관계를 깎는 자리.',
  },
  '정재': {
    plain: '꾸준한 수입·자원·현실적인 조건을 차분히 관리하는 결이 강해질 수 있어요.',
    scene: '정산·비용·일상 살림의 기준을 다시 맞추는 장면이 생길 수 있어요.',
    good: '들어오고 나가는 기준을 한 번 정리해 두기.',
    caution: '작은 손해를 귀찮다고 방치하는 패턴.',
  },
  '편재': {
    plain: '기회·인맥·유동적인 자원이 활발히 움직이는 흐름이 강해질 수 있어요.',
    scene: '새로운 제안이나 부수입·확장 기회가 들어오는 장면이 생길 수 있어요.',
    good: '기회의 범위와 거둘 시점을 먼저 그려 두기.',
    caution: '벌여 놓기만 하고 거두지 못해 흩어지는 자리.',
  },
  '정관': {
    plain: '맡은 역할·규범·제도 안에서 자리가 또렷해지는 흐름이 강해질 수 있어요.',
    scene: '공식적인 절차·직책·약속이 정리되는 장면이 생길 수 있어요.',
    good: '맡은 역할의 권한과 책임 범위를 또렷이 해 두기.',
    caution: '형식에 매여 융통성을 잃는 자리.',
  },
  '편관': {
    plain: '외부의 압박·평가·갑작스러운 책임이 강하게 들어오고, 그만큼 단단해질 수 있는 흐름이에요.',
    scene: '예상보다 무거운 일이나 급한 결정·평가가 몰리는 장면이 생길 수 있어요.',
    good: '우선순위를 좁히고, 감당할 범위를 먼저 선 긋기.',
    caution: '권한 없이 책임만 떠안거나 무리해서 버티는 자리.',
  },
  '정인': {
    plain: '배움·문서·조언·자격 같은 보조 자산이 나를 받쳐 주는 흐름이 강해질 수 있어요.',
    scene: '배운 것을 정리하거나 도움을 받아 기반을 다지는 장면이 생길 수 있어요.',
    good: '입력을 내 언어로 정리해 기록으로 남기기.',
    caution: '준비만 길어지고 실행이 미뤄지는 패턴.',
  },
  '편인': {
    plain: '직관·전문성·남다른 관점이 깊어지지만, 리듬이 들쭉날쭉해지기 쉬운 흐름이에요.',
    scene: '혼자 파고드는 공부나 비주류 방식에 끌리는 장면이 생길 수 있어요.',
    good: '관심을 한두 가지로 좁혀 끝까지 가 보기.',
    caution: '생각만 깊어지고 외부와 단절되는 패턴.',
  },
};

// 월 지지 십성 카테고리 → 본문에 덧대는 짧은 보조 노트.
// 지지는 매달 바뀌므로(午→未→申…) 같은 천간 십성 계열이 와도 결이 갈라진다.
const BRANCH_NOTE_BY_CATEGORY: Record<TenGodCategory, string> = {
  '비겁': '사람·자립 문제가 함께 따라옵니다.',
  '식상': '표현하고 내보내려는 마음이 함께 따라옵니다.',
  '재성': '현실 조건·자원 정리가 함께 따라옵니다.',
  '관성': '책임·평가의 무게가 함께 따라옵니다.',
  '인성': '배움·정리·안정 욕구가 함께 따라옵니다.',
};

const MONTH_TOPIC_BY_CATEGORY: Record<TenGodCategory, YearlyTopicKey[]> = {
  '비겁': ['관계', '일'],
  '식상': ['결과물', '일'],
  '재성': ['돈', '계약'],
  '관성': ['일', '계약'],
  '인성': ['공부', '계약'],
};

const PALACE_TOPIC_HINT: Record<'year' | 'month' | 'day' | 'hour', YearlyTopicKey[]> = {
  year:  ['가족'],
  month: ['일'],
  day:   ['관계', '연애'],
  hour:  ['결과물', '계약'],
};

// ── 월운 vs 용신/기신·신강신약 활성도 ─────────────────────
function computeMonthUsefulGodEffect(
  monthGanji: Ganji,
  dayMaster: HeavenlyStem,
  usefulGod: UsefulGodAnalysis,
  dms: DayMasterStrengthAnalysis,
): MonthlyFortuneAnalysis['usefulGodEffect'] {
  // element 분류 (Y2e와 동일 로직)
  const stemEl = STEM_ELEMENT[monthGanji.stem as HeavenlyStem];
  const norm = normalizeUsefulGodToElements(usefulGod, dayMaster);
  let relation: UsefulGodRelation;
  if (norm.useful.includes(stemEl)) relation = 'useful';
  else if (norm.favorable.includes(stemEl)) relation = 'favorable';
  else if (norm.unfavorable.includes(stemEl)) relation = 'unfavorable';
  else relation = 'neutral';

  // 신강신약 결합
  const dmEl = STEM_ELEMENT[dayMaster];
  const rel = yearRelToDayMaster(stemEl, dmEl);
  const strong = dms.level === 'strong' || dms.level === 'very-strong';
  const weak = dms.level === 'weak' || dms.level === 'very-weak';
  const strengthEffect: YearlyStrengthEffect = strong
    ? (rel === '비겁' || rel === '인성' ? 'burdensome' : 'supportive')
    : weak
      ? (rel === '비겁' || rel === '인성' ? 'supportive' : 'burdensome')
      : 'neutral';

  // 종합: 두 신호가 같은 방향이면 강하게, 반대면 mixed, 한쪽만이면 약하게
  const usefulPositive = relation === 'useful' || relation === 'favorable';
  const usefulNegative = relation === 'unfavorable';
  const strengthPositive = strengthEffect === 'supportive';
  const strengthNegative = strengthEffect === 'burdensome';

  if (usefulPositive && strengthPositive) return 'helpful';
  if (usefulNegative && strengthNegative) return 'burdensome';
  if ((usefulPositive && strengthNegative) || (usefulNegative && strengthPositive)) return 'mixed';
  if (usefulPositive || strengthPositive) return 'helpful';
  if (usefulNegative || strengthNegative) return 'burdensome';
  return 'neutral';
}

// ── 월운 keyword 생성 — usefulGodEffect로 톤 조정 ──────────
function buildMonthKeyword(
  stemTenGod: TenGod,
  effect: MonthlyFortuneAnalysis['usefulGodEffect'],
): string {
  const base = MONTH_KEYWORD_BY_TENGOD[stemTenGod];
  // 너무 일반적인 keyword 금지 — base 자체가 구체적이므로 그대로 사용.
  // effect별 prefix 추가는 keyword 길이를 늘리므로, plainMeaning/goodChoice 톤에서만 반영.
  // (UI에 짧게 보여야 함)
  if (effect === 'helpful') return `운이 살아나는 결로 — ${base}`;
  if (effect === 'burdensome') return `무리하지 않는 결로 — ${base}`;
  if (effect === 'mixed') return `한쪽으로 쏠리지 않는 결로 — ${base}`;
  return base;
}

// ── 월운 본문 (plainMeaning / lifeSceneHint / goodChoice / caution) ──
function buildMonthNarrative(args: {
  monthLabel: string;
  stemTenGod: TenGod;
  branchTenGod: TenGod;
  effect: MonthlyFortuneAnalysis['usefulGodEffect'];
  topInteractions: Interaction[];
}): { plainMeaning: string; lifeSceneHint: string; goodChoice: string; caution: string } {
  const { stemTenGod, branchTenGod, effect, topInteractions } = args;

  // 정확한 10십성별 시드 (연속 같은 오행 달도 정관/편관처럼 갈라짐).
  const seed = TENGOD_SEED[stemTenGod];

  // 월 지지 십성이 천간과 다른 결을 더하면 보조 노트로 차별화 — 지지는 매달 바뀌므로
  // 같은 천간 십성 계열이 연달아 와도 본문이 갈라진다.
  const stemCategory = tenGodToCategory(stemTenGod);
  const branchCategory = tenGodToCategory(branchTenGod);
  const branchNote = branchCategory !== stemCategory
    ? ` 안쪽 결로는 ${BRANCH_NOTE_BY_CATEGORY[branchCategory]}`
    : '';

  // effect 톤 prefix
  let plainPrefix = '';
  if (effect === 'helpful') plainPrefix = '올해 흐름이 이 달에 살아나는 결로 봅니다. ';
  else if (effect === 'burdensome') plainPrefix = '올해 흐름이 이 달에 부담으로 누적될 수 있는 결로 봅니다. ';
  else if (effect === 'mixed') plainPrefix = '올해 흐름의 양면이 이 달에 같이 드러날 수 있는 결입니다. ';
  else plainPrefix = '올해 흐름 안에서 기존 결이 이어지는 달입니다. ';

  let interactionAddon = '';
  if (topInteractions.length > 0) {
    const labels = topInteractions.slice(0, 3).map(i => i.label).join(', ');
    interactionAddon = ` 이번 달에는 ${labels} 같은 작용이 함께 잡혀, 같은 주제가 더 구체적인 사건/장면으로 드러날 수 있습니다.`;
  }

  // caution은 effect=burdensome일 때만 추가 강조
  let extraCaution = '';
  if (effect === 'burdensome') extraCaution = ' 무리하게 확장하지 않고 조건을 먼저 정리하는 편이 안전합니다.';

  return {
    plainMeaning: plainPrefix + seed.plain + branchNote + interactionAddon,
    lifeSceneHint: seed.scene,
    goodChoice: seed.good,
    caution: seed.caution + extraCaution,
  };
}

// ── 월운-세운 + 월운-원국 interaction 집계 (top 1~3) ────────
function collectMonthInteractions(args: {
  monthGanji: Ganji;
  sewoonGanji: Ganji;
  natalPillars: FourPillars;
}): Interaction[] {
  const findings = detectPair(
    args.monthGanji.stem as HeavenlyStem,
    args.monthGanji.branch as EarthlyBranch,
    args.sewoonGanji.stem as HeavenlyStem,
    args.sewoonGanji.branch as EarthlyBranch,
  );
  const interactions: Interaction[] = findings.map(f => ({
    kind: f.kind, target: f.target,
    from: '월운', to: '세운',
    label: f.label,
    between: `월운 ${args.monthGanji.display} ↔ 세운 ${args.sewoonGanji.display} (${f.label})`,
    scopeTag: `month-sewoon-${f.scopeBase}`,
    plainMeaning: f.basePlainMeaning,
    intensity: f.intensity,
  }));

  // 월운 ↔ 원국 4주 (간략)
  const palaceLabels: Array<['year' | 'month' | 'day' | 'hour', '년주' | '월주' | '일주' | '시주', { stem: HeavenlyStem; branch: EarthlyBranch } | undefined]> = [
    ['year',  '년주', { stem: args.natalPillars.year.stem,  branch: args.natalPillars.year.branch }],
    ['month', '월주', { stem: args.natalPillars.month.stem, branch: args.natalPillars.month.branch }],
    ['day',   '일주', { stem: args.natalPillars.day.stem,   branch: args.natalPillars.day.branch }],
    ['hour',  '시주', args.natalPillars.hour ? { stem: args.natalPillars.hour.stem, branch: args.natalPillars.hour.branch } : undefined],
  ];
  for (const [, label, np] of palaceLabels) {
    if (!np) continue;
    const f2 = detectPair(args.monthGanji.stem as HeavenlyStem, args.monthGanji.branch as EarthlyBranch, np.stem, np.branch);
    for (const f of f2) {
      interactions.push({
        kind: f.kind, target: f.target,
        from: '월운', to: `원국-${label}`,
        label: f.label,
        between: `월운 ${args.monthGanji.display} ↔ ${label} (${f.label})`,
        scopeTag: `month-natal-${label}-${f.scopeBase}`,
        plainMeaning: f.basePlainMeaning,
        intensity: f.intensity,
      });
    }
  }

  // top 1~3 추리기 — intensity strong > medium > mild 우선, 그 다음 등장 순서
  const order: Interaction['intensity'][] = ['strong', 'medium', 'mild'];
  return [...interactions]
    .sort((a, b) => order.indexOf(a.intensity) - order.indexOf(b.intensity))
    .slice(0, 3);
}

// ── activatedTopics 집계 ──────────────────────────────────
function collectActivatedTopics(args: {
  monthStemCategory: TenGodCategory;
  interactions: Interaction[];
}): YearlyTopicKey[] {
  const topics = new Set<YearlyTopicKey>();
  for (const t of MONTH_TOPIC_BY_CATEGORY[args.monthStemCategory]) topics.add(t);
  for (const it of args.interactions) {
    // scopeTag로 어느 궁인지 추출
    if (it.scopeTag.includes('-year-'))  for (const t of PALACE_TOPIC_HINT.year)  topics.add(t);
    if (it.scopeTag.includes('-month-')) for (const t of PALACE_TOPIC_HINT.month) topics.add(t);
    if (it.scopeTag.includes('-day-'))   for (const t of PALACE_TOPIC_HINT.day)   topics.add(t);
    if (it.scopeTag.includes('-hour-'))  for (const t of PALACE_TOPIC_HINT.hour)  topics.add(t);
  }
  return Array.from(topics).slice(0, 4);
}

// ── 월운 단일 객체 빌드 ───────────────────────────────────
export function computeMonthlyFortuneAnalysis(args: {
  segment: RemainingMonthSegment;
  yearStem: HeavenlyStem;
  sewoonGanji: Ganji;
  natalPillars: FourPillars;
  dayMaster: HeavenlyStem;
  usefulGod: UsefulGodAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
}): MonthlyFortuneAnalysis {
  const { segment } = args;
  const monthStem = computeMonthStem(args.yearStem, segment.monthIndex);
  const monthGanji: Ganji = {
    stem: monthStem,
    branch: segment.monthBranch,
    display: `${monthStem}${segment.monthBranch}`,
  };
  const stemTenGod = calcTenGod(args.dayMaster, monthStem);
  const hiddens = HIDDEN_STEMS[segment.monthBranch];
  const primary = hiddens.find(h => h.role === 'primary')!;
  const branchTenGod = calcTenGod(args.dayMaster, primary.stem);
  const hiddenStemTenGods = hiddens.filter(h => h.role !== 'primary').map(h => calcTenGod(args.dayMaster, h.stem));
  const category = tenGodToCategory(stemTenGod);

  const interactions = collectMonthInteractions({
    monthGanji, sewoonGanji: args.sewoonGanji, natalPillars: args.natalPillars,
  });

  const usefulGodEffect = computeMonthUsefulGodEffect(monthGanji, args.dayMaster, args.usefulGod, args.dayMasterStrength);
  const keyword = buildMonthKeyword(stemTenGod, usefulGodEffect);
  const activatedTopics = collectActivatedTopics({ monthStemCategory: category, interactions });

  // monthLabel — 양력 월 기반 (UI 친화) + 절기 한글 부가
  const startMonth = Number(segment.startIso.slice(5, 7));
  const monthLabel = segment.truncatedStart
    ? `${startMonth}월 흐름 (남은 기간)`
    : `${startMonth}월 흐름`;
  const periodLabel = `${segment.effectiveStartIso} ~ ${segment.endIso} (${segment.jieKo}~${segment.nextJieKo} 전)`;

  const narrative = buildMonthNarrative({ monthLabel, stemTenGod, branchTenGod, effect: usefulGodEffect, topInteractions: interactions });

  return {
    monthLabel,
    periodLabel,
    startDate: segment.effectiveStartIso,
    endDate: segment.endIso,
    monthGanji,
    monthStemTenGod: stemTenGod,
    monthBranchTenGod: branchTenGod,
    hiddenStemTenGods,
    keyword,
    activatedTopics,
    usefulGodEffect,
    interactions,
    plainMeaning: narrative.plainMeaning,
    lifeSceneHint: narrative.lifeSceneHint,
    goodChoice: narrative.goodChoice,
    caution: narrative.caution,
    truncatedStart: segment.truncatedStart,
  };
}

// ── Y2f 통합 ───────────────────────────────────────────────
export function buildY2f(args: {
  currentDate: string;
  sajuYear: number;
  yearStem: HeavenlyStem;
  sewoonGanji: Ganji;
  natalPillars: FourPillars;
  dayMaster: HeavenlyStem;
  usefulGod: UsefulGodAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
}): MonthlyFortuneAnalysis[] {
  const segments = findRemainingMonthSegments(args.currentDate, args.sajuYear);
  return segments.map(seg => computeMonthlyFortuneAnalysis({
    segment: seg,
    yearStem: args.yearStem,
    sewoonGanji: args.sewoonGanji,
    natalPillars: args.natalPillars,
    dayMaster: args.dayMaster,
    usefulGod: args.usefulGod,
    dayMasterStrength: args.dayMasterStrength,
  }));
}

// ============================================================
// Y2g. 이후 2년 (targetYear+1, targetYear+2) 요약
// ============================================================
//
// 본 phase는 올해운세의 "보조 정보"이므로 keyword + summary + opportunity + caution + evidence
// 정도로만 압축한다. 월별 세부는 만들지 않는다.
//
// 안전 톤:
//   - 단정 미래 예측 X (반드시·무조건·100% 등)
//   - financial/medical risk X
//   - relationshipStatus/hasChildren unknown 시 배우자/자녀 단정 X
//
// 정합:
//   - 모든 십성/오행/합충 계산은 Y2a~Y2f의 deterministic helper 그대로 재사용

const YEAR_KEYWORD_BY_CATEGORY: Record<TenGodCategory, string> = {
  '비겁': '협업과 자기 기준이 같이 정리되는 해',
  '식상': '쌓아둔 것을 밖으로 꺼내 검증받는 해',
  '재성': '조건과 보상 기준이 선명해지는 해',
  '관성': '책임과 평가 기준이 무거워지는 해',
  '인성': '정리·문서·공부가 자산이 되는 해',
};

const YEAR_OPPORTUNITY_BY_CATEGORY: Record<TenGodCategory, string> = {
  '비겁': '같은 결을 가진 동료·협업 관계와 기준을 다시 정리하는 선택.',
  '식상': '준비해 둔 결과물을 외부에 검증받고 반응으로 다듬는 선택.',
  '재성': '작업 범위·보상 기준을 명확히 하고 반복 가능한 수익 구조로 만드는 선택.',
  '관성': '책임을 맡기 전 권한·범위·평가 기준을 먼저 확인하고 정리하는 선택.',
  '인성': '배운 것을 자기 언어로 정리해 결과물·문서로 남기는 선택.',
};

const YEAR_CAUTION_BY_CATEGORY: Record<TenGodCategory, string> = {
  '비겁': '경쟁심에 밀려 혼자 끌고 가거나 동료의 결정을 가로채는 패턴.',
  '식상': '완벽해질 때까지 외부에 안 꺼내고 묵혀두는 패턴.',
  '재성': '조건이 애매한 일을 그대로 받고 보상 기준을 흐릿하게 두는 패턴.',
  '관성': '권한 없이 책임만 떠안거나 평가 기준을 미루는 패턴.',
  '인성': '입력만 늘리고 정리·출력으로 이어가지 않는 패턴.',
};

// palace 우선순위 (대표 interaction 선정용)
const PALACE_PRIORITY: Record<string, number> = {
  'day': 0, 'hour': 1, 'month': 2, 'year': 3,
};
const INTENSITY_ORDER: Record<Interaction['intensity'], number> = {
  strong: 0, medium: 1, mild: 2,
};

function pickRepresentativeInteractions(
  daewoonSewoonInteractions: Interaction[],
  natalGroups: NatalSewoonInteraction[],
  max: number = 3,
): Interaction[] {
  // 모든 interaction 모으기 + palace 정보 부여
  const all: Array<{ it: Interaction; palaceRank: number }> = [];
  for (const it of daewoonSewoonInteractions) {
    all.push({ it, palaceRank: 4 }); // 대운-세운은 별도, 우선순위는 마지막에서 두 번째
  }
  for (const g of natalGroups) {
    for (const it of g.interactions) {
      all.push({ it, palaceRank: PALACE_PRIORITY[g.pillar] ?? 5 });
    }
  }
  all.sort((a, b) => {
    const di = INTENSITY_ORDER[a.it.intensity] - INTENSITY_ORDER[b.it.intensity];
    if (di !== 0) return di;
    return a.palaceRank - b.palaceRank;
  });
  return all.slice(0, max).map(x => x.it);
}

function buildYearSummary(args: {
  category: TenGodCategory;
  usefulGodRelation: UsefulGodRelation;
  strengthEffect: YearlyStrengthEffect;
  representative: Interaction[];
}): { summary: string; opportunity: string; caution: string } {
  const { category, usefulGodRelation, strengthEffect, representative } = args;

  // 톤 prefix
  let summaryTone: string;
  if (usefulGodRelation === 'useful' || usefulGodRelation === 'favorable') {
    summaryTone = '용신 또는 희신 결에 가까워 올해 흐름이 자연스럽게 풀릴 수 있는 결로 봅니다.';
  } else if (usefulGodRelation === 'unfavorable') {
    summaryTone = '과해지면 부담이 커지는 기신 결로 봅니다. 무리하게 확장하기보다 정리가 먼저인 해입니다.';
  } else if (strengthEffect === 'supportive') {
    summaryTone = '신강/신약 기준에서 받쳐주는 결로 봅니다.';
  } else if (strengthEffect === 'burdensome') {
    summaryTone = '신강/신약 기준에서 부담이 누적될 수 있는 결로, 조건을 골라 받는 전략이 안정적입니다.';
  } else {
    summaryTone = '큰 균형 변동보다 기존 결이 이어지는 해로 봅니다.';
  }

  const categoryDetail: Record<TenGodCategory, string> = {
    '비겁': '협업과 자기 기준이 같이 움직이는 흐름이 강해질 수 있어요.',
    '식상': '준비해 둔 것을 외부로 꺼내 검증받는 흐름이 강해질 수 있어요.',
    '재성': '돈·자원·계약·역할 보상이 함께 움직이는 흐름이 강해질 수 있어요.',
    '관성': '책임·평가·외부 기준이 강해지는 흐름이 늘 수 있어요.',
    '인성': '학습·문서·정리·자격이 자산이 되는 흐름이 늘 수 있어요.',
  };

  let interactionAddon = '';
  if (representative.length > 0) {
    const labels = representative.slice(0, 3).map(i => i.label).join(', ');
    interactionAddon = ` 이 해에 두드러질 수 있는 작용으로는 ${labels} 정도가 있습니다.`;
  }

  return {
    summary: `${summaryTone} ${categoryDetail[category]}${interactionAddon}`,
    opportunity: YEAR_OPPORTUNITY_BY_CATEGORY[category],
    caution: YEAR_CAUTION_BY_CATEGORY[category],
  };
}

function buildYearKeyword(category: TenGodCategory, effect: YearlyStrengthEffect, relation: UsefulGodRelation): string {
  const base = YEAR_KEYWORD_BY_CATEGORY[category];
  if (relation === 'useful' || relation === 'favorable') return `운이 풀려가는 결로 — ${base}`;
  if (relation === 'unfavorable') return `확장보다 정리가 먼저인 결로 — ${base}`;
  if (effect === 'supportive') return `받쳐주는 결로 — ${base}`;
  if (effect === 'burdensome') return `조건을 골라 받는 결로 — ${base}`;
  return base;
}

function buildOneYearSummary(args: {
  year: number;
  dayMaster: HeavenlyStem;
  natalPillars: FourPillars;
  daewoonPillar: DaewoonPillar;
  usefulGod: UsefulGodAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  options?: { relationshipStatus?: YearlyRelationshipStatus; hasChildren?: boolean | 'unknown' };
}): NextYearSummary {
  const ganji = computeYearGanji(args.year);
  const yearTenGod = computeYearTenGod(args.dayMaster, ganji);
  const yEffect = computeYearElementEffect(ganji, args.dayMaster, args.usefulGod);
  const sImpact = computeStrengthImpact(ganji, args.dayMaster, args.dayMasterStrength);

  const daewoonSewoonInts = computeDaewoonSewoonInteractions(args.daewoonPillar, ganji);
  const natalGroups = computeNatalSewoonInteractions(args.natalPillars, ganji, args.options ?? {});
  const repr = pickRepresentativeInteractions(daewoonSewoonInts, natalGroups, 3);

  const category = tenGodToCategory(yearTenGod.stemTenGod);
  const { summary, opportunity, caution } = buildYearSummary({
    category,
    usefulGodRelation: yEffect.relationToUsefulGod,
    strengthEffect: sImpact.yearlyEffect,
    representative: repr,
  });
  const keyword = buildYearKeyword(category, sImpact.yearlyEffect, yEffect.relationToUsefulGod);

  const evidence: string[] = [
    `${args.year}년 세운 = ${ganji.display} (${args.dayMaster} 일간 기준 천간 ${yearTenGod.stemTenGod}, 지지 본기 ${yearTenGod.branchMainTenGod})`,
    `세운 오행 vs 용신/기신 = ${yEffect.relationToUsefulGod}`,
    `신강/신약 × 세운 = ${sImpact.natalStrength} / ${sImpact.yearlyEffect}`,
    daewoonSewoonInts.length > 0
      ? `대운(${args.daewoonPillar.pillarKo})-세운(${ganji.display}) 작용: ${daewoonSewoonInts.map(i => i.label).join(', ')}`
      : `대운(${args.daewoonPillar.pillarKo})-세운(${ganji.display}): 두드러진 합·충·형·파·해 없음`,
    repr.length > 0
      ? `대표 작용: ${repr.map(i => i.label).join(', ')}`
      : `대표 작용: 없음 (기존 결 유지)`,
  ];

  return {
    year: args.year,
    ganji,
    keyword,
    summary,
    opportunity,
    caution,
    evidence,
    yearTenGod,
    usefulGodRelation: yEffect.relationToUsefulGod,
    strengthEffect: sImpact.yearlyEffect,
    representativeInteractions: repr,
  };
}

/** Y2g 통합 — targetYear+1, targetYear+2 요약 2개 생성. */
export function buildY2g(args: {
  targetYear: number;
  dayMaster: HeavenlyStem;
  natalPillars: FourPillars;
  daewoonPillar: DaewoonPillar;
  usefulGod: UsefulGodAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  options?: { relationshipStatus?: YearlyRelationshipStatus; hasChildren?: boolean | 'unknown' };
}): NextYearSummary[] {
  if (!Number.isFinite(args.targetYear) || args.targetYear < 1900 || args.targetYear > 3000) {
    return []; // graceful — 비정상 입력
  }
  return [
    buildOneYearSummary({ ...args, year: args.targetYear + 1 }),
    buildOneYearSummary({ ...args, year: args.targetYear + 2 }),
  ];
}

// 향후 sub-phase에서 사용 예약
void KO_TO_ELEMENT_INTERNAL;

// ── 내부 유틸은 의도적으로 export하지 않음 ───────────────────
// Y2a~Y2g 완료. Y3 이후는 별도 파일(yearlyEvidenceFormatter, yearlyPlanBuilder 등)에서 import.
void stemIndex; void branchIndex;
