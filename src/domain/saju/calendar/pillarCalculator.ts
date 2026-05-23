// Module 3+4: 사주팔자(四柱八字) 계산 — 연·월·일·시 4기둥.
//
// lunar-javascript의 EightChar를 1차 출처로 사용하되,
// (a) 결과를 한글로 정규화, (b) 야자시 정책 적용, (c) 시간 미상 처리, (d) 지장간 부착.
//
// 입력: 정규화된 BirthInput (양력 변환 후) + DEFAULT_RULE_CONFIG.
// 출력: FourPillars + 산정 컨텍스트.

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript');

import { DEFAULT_RULE_CONFIG, RULE_VERSION, type RuleConfig } from '../rules/ruleConfig';
import {
  HANJA_TO_STEM,
  type HeavenlyStem,
  DAY_STEM_TO_JASI_STEM,
  stemByIndex,
  stemIndex,
  stemYinYang as stemYy,
} from '../rules/heavenlyStems';
import {
  HANJA_TO_BRANCH,
  type EarthlyBranch,
  hourToBranch,
  branchYinYang as branchYy,
} from '../rules/earthlyBranches';
import { STEM_ELEMENT, BRANCH_ELEMENT, type Element } from '../rules/elements';
import { HIDDEN_STEMS, allHiddenStems } from '../rules/hiddenStems';
import type { NormalizedBirth } from './normalizeBirthInput';
import { toSolarDate } from './solarLunarConverter';
import { findApplicableJie, type SolarTermPoint } from './solarTermProvider';

// ============================================================
// 도메인 타입 — spec 준수
// ============================================================

export type YinYang = 'yin' | 'yang';

export interface Pillar {
  stem: HeavenlyStem;
  branch: EarthlyBranch;
  stemElement: Element;
  branchElement: Element;
  stemYinYang: YinYang;
  branchYinYang: YinYang;
  hiddenStems: HeavenlyStem[];
}

export interface FourPillars {
  year: Pillar;
  month: Pillar;
  day: Pillar;
  hour?: Pillar;
  dayMaster: HeavenlyStem;
  isHourEstimated: boolean;
  missingHourReason?: string;
}

export type HourMethodType = '야자시' | '조자시' | '일반' | '미상';

export interface PillarsResult {
  ruleVersion: string;
  ruleConfig: RuleConfig;
  pillars: FourPillars;
  monthBranchSource: SolarTermPoint;
  hourMethod: HourMethodType;
  /** 야자시 정책상 일주가 다음날로 시프트되었는가 */
  dayPillarShifted: boolean;
  /** 입력 양력 일자 (음력이면 변환된 값) */
  solarYmd: { year: number; month: number; day: number };
}

// ============================================================
// 공개 API
// ============================================================

export function calculatePillars(
  input: NormalizedBirth,
  config: RuleConfig = DEFAULT_RULE_CONFIG,
): PillarsResult {
  const solar = toSolarDate(input.inputCalendar, input.year, input.month, input.day, input.isLeapMonth);

  const hour = input.hour ?? 12;  // 시간 미상은 정오로 가정 (일주 영향 최소)
  const minute = input.minute;

  // 월건 결정 절기
  const jie = findApplicableJie(solar.year, solar.month, solar.day, hour, minute);

  // lunar-javascript EightChar
  const solarObj = Solar.fromYmdHms(solar.year, solar.month, solar.day, hour, minute, 0);
  const ec = solarObj.getLunar().getEightChar();

  let dayPillarShifted = false;
  let dayPillar = parsePillar(ec.getDay());
  let yearPillar = parsePillar(ec.getYear());
  let monthPillar = parsePillar(ec.getMonth());

  // 야자시 정책: 23시 출생 → 다음날 일주 (config.hourBoundaryMode='standard-23')
  // 월/년 경계 오버플로 안전: JS Date로 다음날을 계산 (12/31 23시 → 1/1 다음해).
  if (!input.hourUnknown && hour === 23 && config.hourBoundaryMode === 'standard-23') {
    const d = new Date(Date.UTC(solar.year, solar.month - 1, solar.day));
    d.setUTCDate(d.getUTCDate() + 1);
    const ny = d.getUTCFullYear();
    const nm = d.getUTCMonth() + 1;
    const nd = d.getUTCDate();
    const next = Solar.fromYmdHms(ny, nm, nd, 0, 0, 0)
      .getLunar().getEightChar();
    dayPillar = parsePillar(next.getDay());
    yearPillar = parsePillar(next.getYear());
    monthPillar = parsePillar(next.getMonth());
    dayPillarShifted = true;
  }

  // 시주 계산
  let hourPillar: Pillar | undefined = undefined;
  let hourMethod: HourMethodType = '미상';
  let missingHourReason: string | undefined = undefined;

  if (input.hourUnknown) {
    missingHourReason = '사용자가 출생시간을 모름 (birthTimeConfidence=unknown)';
  } else {
    const hb = hourToBranch(hour, minute);
    hourMethod = hb.category;
    const jasiStem = DAY_STEM_TO_JASI_STEM[dayPillar.stem];
    const branchIdx = ['자','축','인','묘','진','사','오','미','신','유','술','해'].indexOf(hb.branch);
    const hourStem = stemByIndex(stemIndex(jasiStem) + branchIdx);
    hourPillar = buildPillar(hourStem, hb.branch);
  }

  return {
    ruleVersion: RULE_VERSION,
    ruleConfig: config,
    pillars: {
      year: yearPillar,
      month: monthPillar,
      day: dayPillar,
      hour: hourPillar,
      dayMaster: dayPillar.stem,
      isHourEstimated: input.hourUnknown,
      missingHourReason,
    },
    monthBranchSource: jie,
    hourMethod,
    dayPillarShifted,
    solarYmd: solar,
  };
}

// ============================================================
// 헬퍼
// ============================================================

function buildPillar(stem: HeavenlyStem, branch: EarthlyBranch): Pillar {
  return {
    stem,
    branch,
    stemElement: STEM_ELEMENT[stem],
    branchElement: BRANCH_ELEMENT[branch],
    stemYinYang: stemYy(stem),
    branchYinYang: branchYy(branch),
    hiddenStems: allHiddenStems(branch),
  };
}

function parsePillar(hanjaPillar: string): Pillar {
  if (hanjaPillar.length !== 2) throw new Error(`기둥 형식 오류: ${hanjaPillar}`);
  const stem = HANJA_TO_STEM[hanjaPillar[0]];
  const branch = HANJA_TO_BRANCH[hanjaPillar[1]];
  if (!stem || !branch) throw new Error(`알 수 없는 천간/지지: ${hanjaPillar}`);
  return buildPillar(stem, branch);
}

// 지장간 export (다른 모듈이 import할 수 있게)
export { HIDDEN_STEMS };
