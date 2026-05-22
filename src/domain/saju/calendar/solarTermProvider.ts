// Module 3 (절기 시각): 24절기 중 월건을 결정하는 12절(節)의 정확한 시각.
// lunar-javascript의 JieQi 데이터 활용.
//
// 12절: 입춘·경칩·청명·입하·망종·소서·입추·백로·한로·입동·대설·소한
// (12중기는 월건에 직접 영향 X)

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Solar } = require('lunar-javascript');

import type { EarthlyBranch } from '../rules/earthlyBranches';
import { MONTH_INDEX_TO_BRANCH } from '../rules/earthlyBranches';

/** 12절 이름과 그것이 시작시키는 월건 index (인월=1) */
// lunar-javascript는 간체 한자 키 사용
const JIE_NODES: Array<{ jieName: string; monthIndex: number }> = [
  { jieName: '立春', monthIndex: 1  },  // 인월
  { jieName: '惊蛰', monthIndex: 2  },  // 묘월 (간체)
  { jieName: '清明', monthIndex: 3  },  // 진월
  { jieName: '立夏', monthIndex: 4  },  // 사월
  { jieName: '芒种', monthIndex: 5  },  // 오월 (간체)
  { jieName: '小暑', monthIndex: 6  },  // 미월
  { jieName: '立秋', monthIndex: 7  },  // 신월
  { jieName: '白露', monthIndex: 8  },  // 유월
  { jieName: '寒露', monthIndex: 9  },  // 술월
  { jieName: '立冬', monthIndex: 10 },  // 해월
  { jieName: '大雪', monthIndex: 11 },  // 자월
  { jieName: '小寒', monthIndex: 12 },  // 축월
];

const HANJA_TO_KO: Record<string, string> = {
  立春: '입춘', 惊蛰: '경칩', 清明: '청명', 立夏: '입하',
  芒种: '망종', 小暑: '소서', 立秋: '입추', 白露: '백로',
  寒露: '한로', 立冬: '입동', 大雪: '대설', 小寒: '소한',
};

export interface SolarTermPoint {
  /** 한글 절기명 */
  name: string;
  /** 1=인월 ~ 12=축월 */
  monthIndex: number;
  /** 그 절기가 시작시키는 월지 */
  monthBranch: EarthlyBranch;
  /** 절기 발생 epoch ms (KST 기준 lunar-javascript Solar의 toYmdHms는 로컬 KST로 가정) */
  epochMs: number;
  /** ISO-like 표현 (디버그) */
  iso: string;
}

/** 양력 일자가 어느 12절 노드 이후인지 판정.
 *  하루를 KST 12:00 기준이 아닌 출생 정확 시각(hour, minute)으로 비교한다 (절입 분 단위까지 반영).
 *  반환: 그 시점에 적용되는 월건 (인덱스 + 한글 지지).
 */
export function findApplicableJie(
  solarYear: number,
  solarMonth: number,
  solarDay: number,
  hour: number,
  minute: number,
): SolarTermPoint {
  // 후보: 해당 양력 연도 + 전년 12월(소한) — 1월 출생은 전년 소한 후일 수 있음
  const candidates: SolarTermPoint[] = [];

  for (const year of [solarYear - 1, solarYear]) {
    // lunar-javascript: getJieQiTable()는 Lunar 인스턴스에 있음 (간체 한자 키 → Solar)
    const tableObj = Solar.fromYmd(year, 1, 1).getLunar().getJieQiTable();
    for (const node of JIE_NODES) {
      const point = tableObj[node.jieName];
      if (!point) continue;
      candidates.push({
        name: HANJA_TO_KO[node.jieName] ?? node.jieName,
        monthIndex: node.monthIndex,
        monthBranch: MONTH_INDEX_TO_BRANCH[node.monthIndex],
        epochMs: solarToEpochMs(point),
        iso: solarToIso(point),
      });
    }
  }

  // 출생 시각의 epoch (KST 가정)
  const birthEpoch = Date.UTC(solarYear, solarMonth - 1, solarDay, hour - 9, minute); // KST → UTC: -9h

  // birthEpoch 이전(<=)에 있는 절기 중 가장 늦은 것 = 현재 적용 월건
  let applied: SolarTermPoint | null = null;
  for (const c of candidates) {
    if (c.epochMs <= birthEpoch && (applied === null || c.epochMs > applied.epochMs)) {
      applied = c;
    }
  }
  if (!applied) {
    throw new Error(`적용 절기를 찾지 못함: ${solarYear}-${solarMonth}-${solarDay} ${hour}:${minute}`);
  }
  return applied;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function solarToEpochMs(s: any): number {
  // KST 시각으로 가정 → UTC로 환산
  return Date.UTC(s.getYear(), s.getMonth() - 1, s.getDay(), s.getHour() - 9, s.getMinute(), s.getSecond());
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function solarToIso(s: any): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${s.getYear()}-${pad(s.getMonth())}-${pad(s.getDay())}T${pad(s.getHour())}:${pad(s.getMinute())}:${pad(s.getSecond())}+09:00`;
}
