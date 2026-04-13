export const CG = ['갑','을','병','정','무','기','경','신','임','계'];
export const JJ = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
export const CG_HANJA = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];
export const JJ_HANJA = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
export const OH_CG = ['목','목','화','화','토','토','금','금','수','수'];
export const OH_JJ = ['수','토','목','목','토','화','화','토','금','금','토','수'];
export const OH_HANJA: Record<string, string> = {'목':'木','화':'火','토':'土','금':'金','수':'水'};

/**
 * 지장간 (Hidden Stems / 藏干) — authoritative fixed table
 * Each 지지 contains 1-3 hidden stems: [여기, 중기, 본기] or fewer.
 * Reference: 연해자평, 삼명통회 — universally agreed across all schools.
 * Stem indices: 갑=0, 을=1, 병=2, 정=3, 무=4, 기=5, 경=6, 신=7, 임=8, 계=9
 */
/**
 * Ground-truth verified 지장간 table.
 * Source: verified against 사주아이/만세력 reference (image 12 golden case).
 * Convention: Full 3-stem (여기, 중기, 본기) for all branches that have them.
 * Order: [여기, 중기, 본기] — 본기 is the primary/strongest hidden stem.
 */
export const JIJANGGAN: number[][] = [
  /* 자(子) */ [8, 9],        // 임(壬/수), 계(癸/수)             — 본기=계  [FIXED: was [9] only — missing 壬]
  /* 축(丑) */ [9, 7, 5],     // 계(癸/수), 신(辛/금), 기(己/토)  — 본기=기
  /* 인(寅) */ [4, 2, 0],     // 무(戊/토), 병(丙/화), 갑(甲/목)  — 본기=갑
  /* 묘(卯) */ [1],           // 을(乙/목)                        — 본기=을
  /* 진(辰) */ [1, 9, 4],     // 을(乙/목), 계(癸/수), 무(戊/토)  — 본기=무
  /* 사(巳) */ [4, 6, 2],     // 무(戊/토), 경(庚/금), 병(丙/화)  — 본기=병
  /* 오(午) */ [5, 3],        // 기(己/토), 정(丁/화)             — 본기=정
  /* 미(未) */ [3, 1, 5],     // 정(丁/화), 을(乙/목), 기(己/토)  — 본기=기
  /* 신(申) */ [4, 8, 6],     // 무(戊/토), 임(壬/수), 경(庚/금)  — 본기=경
  /* 유(酉) */ [7],           // 신(辛/금)                        — 본기=신
  /* 술(戌) */ [7, 3, 4],     // 신(辛/금), 정(丁/화), 무(戊/토)  — 본기=무
  /* 해(亥) */ [4, 0, 8],     // 무(戊/토), 갑(甲/목), 임(壬/수)  — 본기=임  [FIXED: was [0,8] — missing 戊]
];
export const OH_EN: Record<string, string> = {'목':'wood','화':'fire','토':'earth','금':'metal','수':'water'};
export const OH_ICON: Record<string, string> = {'목':'🌿','화':'🔥','토':'⛰️','금':'🔩','수':'💧'};

export const JEOLGI = [
  {sm:2, sd:4},
  {sm:3, sd:6},
  {sm:4, sd:5},
  {sm:5, sd:6},
  {sm:6, sd:6},
  {sm:7, sd:7},
  {sm:8, sd:7},
  {sm:9, sd:8},
  {sm:10, sd:8},
  {sm:11, sd:7},
  {sm:12, sd:7},
  {sm:1, sd:6}
];

export function getSajuMonth(solarMonth: number, solarDay: number): number {
  const d = solarMonth * 100 + solarDay;
  if (d >= 1207) return 10;
  if (d >= 1107) return 9;
  if (d >= 1008) return 8;
  if (d >= 908) return 7;
  if (d >= 807) return 6;
  if (d >= 707) return 5;
  if (d >= 606) return 4;
  if (d >= 506) return 3;
  if (d >= 405) return 2;
  if (d >= 306) return 1;
  if (d >= 204) return 0;
  if (d >= 106) return 11;
  return 10;
}

// Ipchun (입춘) dates by year — the exact date when the solar year begins in saju
// Source: Korean astronomical almanac (만세력)
const IPCHUN_DATES: Record<number, { month: number; day: number }> = {
  2000: { month: 2, day: 4 },
  2001: { month: 2, day: 4 },
  2002: { month: 2, day: 4 },
  2003: { month: 2, day: 4 },
  2004: { month: 2, day: 4 },
  2005: { month: 2, day: 4 },
  2006: { month: 2, day: 4 },
  2007: { month: 2, day: 4 },
  2008: { month: 2, day: 4 },
  2009: { month: 2, day: 4 },
  2010: { month: 2, day: 4 },
  2011: { month: 2, day: 4 },
  2012: { month: 2, day: 4 },
  2013: { month: 2, day: 4 },
  2014: { month: 2, day: 4 },
  2015: { month: 2, day: 4 },
  2016: { month: 2, day: 4 },
  2017: { month: 2, day: 3 },  // Feb 3
  2018: { month: 2, day: 4 },
  2019: { month: 2, day: 4 },
  2020: { month: 2, day: 4 },
  2021: { month: 2, day: 3 },  // Feb 3
  2022: { month: 2, day: 4 },
  2023: { month: 2, day: 4 },
  2024: { month: 2, day: 4 },
  2025: { month: 2, day: 3 },  // Feb 3
  2026: { month: 2, day: 4 },
  2027: { month: 2, day: 4 },
  2028: { month: 2, day: 4 },
  2029: { month: 2, day: 3 },  // Feb 3
  2030: { month: 2, day: 4 },
};

// When year is omitted (or outside the lookup table), falls back to Feb 4 approximation.
export function isBeforeIpchun(month: number, day: number, year?: number): boolean {
  const ipchun = year !== undefined && IPCHUN_DATES[year]
    ? IPCHUN_DATES[year]
    : { month: 2, day: 4 }; // approximation for years outside lookup table
  return month < ipchun.month || (month === ipchun.month && day < ipchun.day);
}

export interface SajuResult {
  yStem: number;
  yBranch: number;
  mStem: number;
  mBranch: number;
  dStem: number;
  dBranch: number;
  hStem: number;
  hBranch: number;
  sajuYear: number;
  sajuMonthIdx: number;
}

export function calcSaju(y: number, m: number, d: number, hour: number): SajuResult {
  const sajuYear = isBeforeIpchun(m, d, y) ? y - 1 : y;
  let yStem = (sajuYear - 4) % 10;
  if (yStem < 0) yStem += 10;
  let yBranch = (sajuYear - 4) % 12;
  if (yBranch < 0) yBranch += 12;

  const sajuMonthIdx = getSajuMonth(m, d);
  const mBranch = (sajuMonthIdx + 2) % 12;

  const yearStemGroup = yStem % 5;
  const monthStartStems = [2, 4, 6, 8, 0];
  const mStem = (monthStartStems[yearStemGroup] + sajuMonthIdx) % 10;

  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  const jdn = d + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
  const dStem = (jdn + 9) % 10;
  const dBranch = (jdn + 1) % 12;

  let hStem = -1;
  let hBranch = -1;
  if (hour >= 0) {
    hBranch = hour;
    const dStemGroup = dStem % 5;
    const hourStartStems = [0, 2, 4, 6, 8];
    hStem = (hourStartStems[dStemGroup] + hBranch) % 10;
  }

  return {
    yStem, yBranch,
    mStem, mBranch,
    dStem, dBranch,
    hStem, hBranch,
    sajuYear, sajuMonthIdx
  };
}

/**
 * 오행 count — SURFACE count (visible 8 characters).
 * Convention: 4 천간 (OH_CG) + 4 지지 surface 오행 (OH_JJ).
 * This matches the standard display convention used by major Korean saju apps
 * (사주아이, 점신, etc.) and the user-provided golden fixtures.
 * Total count is always 8 (or 6 without hour pillar).
 */
export function getOhCount(saju: SajuResult): Record<string, number> {
  const counts: Record<string, number> = {'목':0,'화':0,'토':0,'금':0,'수':0};

  // 4 천간 (heavenly stems) — OH_CG maps stem index to 오행
  counts[OH_CG[saju.yStem]]++;
  counts[OH_CG[saju.mStem]]++;
  counts[OH_CG[saju.dStem]]++;
  if (saju.hStem >= 0) counts[OH_CG[saju.hStem]]++;

  // 4 지지 surface 오행 — OH_JJ maps branch index to 오행
  counts[OH_JJ[saju.yBranch]]++;
  counts[OH_JJ[saju.mBranch]]++;
  counts[OH_JJ[saju.dBranch]]++;
  if (saju.hBranch >= 0) counts[OH_JJ[saju.hBranch]]++;

  return counts;
}

/**
 * 오행 count — FULL count including all 지장간 (hidden stems).
 * Convention: 4 천간 + all 지장간 from 4 지지.
 * Used for deeper doctrinal analysis (연해자평, 자평진전).
 * Total count varies: typically 12-16 with hour, 9-12 without.
 */
export function getOhCountFull(saju: SajuResult): Record<string, number> {
  const counts: Record<string, number> = {'목':0,'화':0,'토':0,'금':0,'수':0};

  // 4 천간 (heavenly stems)
  counts[OH_CG[saju.yStem]]++;
  counts[OH_CG[saju.mStem]]++;
  counts[OH_CG[saju.dStem]]++;
  if (saju.hStem >= 0) counts[OH_CG[saju.hStem]]++;

  // 지장간 from each 지지
  const branches = [saju.yBranch, saju.mBranch, saju.dBranch];
  if (saju.hBranch >= 0) branches.push(saju.hBranch);

  for (const branch of branches) {
    const hiddenStems = JIJANGGAN[branch];
    for (const stemIdx of hiddenStems) {
      counts[OH_CG[stemIdx]]++;
    }
  }

  return counts;
}

/** Get the 지장간 for a given branch */
export function getJijanggan(branch: number): number[] {
  if (branch < 0 || branch > 11) return [];
  return JIJANGGAN[branch];
}

export function calcSipsung(dayStem: number, targetStem: number): string {
  const OH = ['목','목','화','화','토','토','금','금','수','수'];
  const dayOh = OH[dayStem];
  const tgtOh = OH[targetStem];
  const dayYin = dayStem % 2;
  const tgtYin = targetStem % 2;
  const same = (dayYin === tgtYin);
  const ohOrder = ['목','화','토','금','수'];
  const di = ohOrder.indexOf(dayOh);
  const ti = ohOrder.indexOf(tgtOh);
  const rel = (ti - di + 5) % 5;
  const names = [
    same ? '비견' : '겁재',
    same ? '식신' : '상관',
    same ? '편재' : '정재',
    same ? '편관' : '정관',
    same ? '편인' : '정인'
  ];
  return names[rel];
}

export function getSipsung(sj: SajuResult): Record<string, string> {
  const ds = sj.dStem;
  const result: Record<string, string> = {};
  const stems = [sj.yStem, sj.mStem, sj.dStem, sj.hStem];
  const labels = ['년간','월간','일간','시간'];
  for (let i = 0; i < stems.length; i++) {
    if (stems[i] >= 0 && i !== 2) result[labels[i]] = calcSipsung(ds, stems[i]);
  }
  return result;
}

export function calcShinsal(sj: SajuResult): string[] {
  const sals: string[] = [];
  const db = sj.dBranch;
  const hb = sj.hBranch >= 0 ? sj.hBranch : -1;
  // All four branch positions for search
  const allFourBranches = [sj.yBranch, sj.mBranch, db, hb];

  /** Build search pool excluding the base branch position itself */
  function poolExcluding(base: number): number[] {
    // When base is 일지, search [년지, 월지, 시지]
    // When base is 년지, search [월지, 일지, 시지]
    if (base === db) return [sj.yBranch, sj.mBranch, hb];
    return [sj.mBranch, db, hb]; // base is 년지
  }

  // 삼합 기반 도화살: 인오술->묘(3), 사유축->오(6), 신자진->유(9), 해묘미->자(0)
  // 삼명통회: lookup base = 년지 AND 일지 (both checked)
  const dohwaMap: Record<number, number> = {0:9,1:6,2:3,3:0,4:9,5:6,6:3,7:0,8:9,9:6,10:3,11:0};
  for (const base of [db, sj.yBranch]) {
    const target = dohwaMap[base];
    if (poolExcluding(base).includes(target)) { sals.push('도화살'); break; }
  }

  // 삼합 기반 역마살: 인오술->신(8), 사유축->해(11), 신자진->인(2), 해묘미->사(5)
  // 삼명통회: lookup base = 년지 AND 일지
  const yukmaMap: Record<number, number> = {0:2,1:11,2:8,3:5,4:2,5:11,6:8,7:5,8:2,9:11,10:8,11:5};
  for (const base of [db, sj.yBranch]) {
    const target = yukmaMap[base];
    if (poolExcluding(base).includes(target)) { sals.push('역마살'); break; }
  }

  // 화개살: lookup base = 년지 AND 일지
  const hwagaeMap: Record<number, number> = {0:4,1:1,2:10,3:7,4:4,5:1,6:10,7:7,8:4,9:1,10:10,11:7};
  for (const base of [db, sj.yBranch]) {
    const target = hwagaeMap[base];
    if (poolExcluding(base).includes(target)) { sals.push('화개살'); break; }
  }

  // 홍염살 (일간 기준): 갑->오(6), 을->신(8), 병->인(2), 정->미(7), 무->진(4), 기->진(4), 경->술(10), 신->유(9), 임->자(0), 계->신(8)
  const hongMap: Record<number, number> = {0:6,1:8,2:2,3:7,4:4,5:4,6:10,7:9,8:0,9:8};
  const hongTarget = hongMap[sj.dStem];
  for (const b of allFourBranches) {
    if (b === hongTarget) { sals.push('홍염살'); break; }
  }

  /* 괴강살: 경진(庚辰)/경술(庚戌)/임진(壬辰)/임술(壬戌) — 삼명통회 */
  if ((sj.dStem === 6 && sj.dBranch === 4) || (sj.dStem === 6 && sj.dBranch === 10) ||
      (sj.dStem === 8 && sj.dBranch === 4) || (sj.dStem === 8 && sj.dBranch === 10)) {
    sals.push('괴강살');
  }

  /* 백호살: 일지 기준으로 충 위치가 다른 주에 있을 때 */
  const baekhoChung: Record<number, number> = {0:6,1:7,2:8,3:9,4:10,5:11,6:0,7:1,8:2,9:3,10:4,11:5};
  const baekhoTarget = baekhoChung[sj.dBranch];
  if (sj.yBranch === baekhoTarget || sj.mBranch === baekhoTarget || (sj.hBranch >= 0 && sj.hBranch === baekhoTarget)) {
    sals.push('백호살');
  }

  /* 천을귀인: 일간 기준 지지에 해당 글자 */
  const chuneulMap: Record<number, number[]> = {
    0:[1,7], 1:[0,8], 2:[11,9], 3:[11,9], 4:[1,7], 5:[1,7], 6:[2,6], 7:[2,6], 8:[3,5], 9:[3,5]
  };
  const chuneulTargets = chuneulMap[sj.dStem] || [];
  const allBr = [sj.yBranch, sj.mBranch, sj.dBranch, sj.hBranch >= 0 ? sj.hBranch : -1];
  for (const t of chuneulTargets) {
    let found = false;
    for (const b of allBr) { if (b === t) { found = true; break; } }
    if (found) { sals.push('천을귀인'); break; }
  }

  /* 문창귀인: 일간 기준 */
  const munchangMap: Record<number, number> = {0:5,1:6,2:8,3:9,4:8,5:9,6:11,7:0,8:2,9:3};
  const munchangTarget = munchangMap[sj.dStem];
  for (const b of allBr) { if (b === munchangTarget) { sals.push('문창귀인'); break; } }

  /* 양인살: 일간 기준 */
  const yanginMap: Record<number, number> = {0:3,1:4,2:6,3:7,4:6,5:7,6:9,7:10,8:0,9:1};
  const yanginTarget = yanginMap[sj.dStem];
  for (const b of allBr) { if (b === yanginTarget) { sals.push('양인살'); break; } }

  /* 귀문관살: 일지 기준 */
  const gwimunPairs: number[][] = [[2,5],[3,4],[8,11],[9,10]];
  for (const pair of gwimunPairs) {
    if ((sj.dBranch === pair[0] && allBr.includes(pair[1])) || (sj.dBranch === pair[1] && allBr.includes(pair[0]))) {
      sals.push('귀문관살'); break;
    }
  }

  /* 고진살/과숙살 */
  const gojinMap: Record<number, number> = {2:5,3:5,4:5,5:8,6:8,7:8,8:11,9:11,10:11,11:2,0:2,1:2};
  const gwasukMap: Record<number, number> = {2:1,3:1,4:1,5:4,6:4,7:4,8:7,9:7,10:7,11:10,0:10,1:10};
  const gojinTarget = gojinMap[sj.yBranch];
  const gwasukTarget = gwasukMap[sj.yBranch];
  for (const b of allBr) {
    if (b === gojinTarget) { sals.push('고진살'); break; }
  }
  for (const b of allBr) {
    if (b === gwasukTarget) { sals.push('과숙살'); break; }
  }

  /* 장성살: 년지/일지 기준 */
  const jangMap: Record<number, number> = {0:9,1:10,2:11,3:0,4:1,5:2,6:3,7:4,8:5,9:6,10:7,11:8};
  const jangTarget = jangMap[sj.dBranch];
  for (const b of poolExcluding(db)) { if (b === jangTarget) { sals.push('장성살'); break; } }

  return sals;
}

export function get12Unsung(sj: SajuResult): Record<string, string> {
  const stages = ['장생','목욕','관대','건록','제왕','쇠','병','사','묘','절','태','양'];

  // 장생 위치 (양간 기준, 음간은 역행)
  const yangStart: Record<number, number> = {0:11, 2:2, 4:2, 6:5, 8:8};
  const yinStart: Record<number, number> = {1:6, 3:9, 5:9, 7:0, 9:3};

  const ds = sj.dStem;
  const isYang = ds % 2 === 0;
  const startBranch = isYang ? yangStart[ds] : yinStart[ds];

  function getStage(branch: number): string {
    if (branch < 0) return '';
    if (isYang) {
      return stages[(branch - startBranch + 12) % 12];
    } else {
      return stages[(startBranch - branch + 12) % 12];
    }
  }

  return {
    년지: getStage(sj.yBranch),
    월지: getStage(sj.mBranch),
    일지: getStage(sj.dBranch),
    시지: sj.hBranch >= 0 ? getStage(sj.hBranch) : ''
  };
}

export const PROFILES: Record<number, {
  name: string;
  short: string;
  desc: string;
  trait: string;
  strength: string;
  weakness: string;
}> = {
  0: {
    name: '갑(큰 나무)', short: '큰 나무',
    desc: '너는 숲에서 가장 큰 나무 같은 사람이야. 곧고 당당하고, 한번 뿌리내리면 쉽게 흔들리지 않아. 리더십이 있고 정의감이 강해서 불의를 보면 참지 못하는 타입이야. 주변에서 너를 보면 "저 사람은 흔들려도 안 흔들리겠다"라고 느껴. 단, 고집이 세고 자기 확신이 강해서 가끔 주변과 부딪힐 수 있어. 하지만 그 고집이 너를 여기까지 데려온 힘이기도 해. 한번 정한 목표는 반드시 이루는 추진력, 그게 너의 가장 큰 무기야.',
    trait: '리더십, 정의감, 곧은 성격',
    strength: '어떤 상황에서도 흔들리지 않는 단단한 중심',
    weakness: '유연성이 부족해서 타협이 어려울 때가 있어'
  },
  1: {
    name: '을(꽃/덩굴)', short: '꽃과 덩굴',
    desc: '부드러워 보이지만 절대 약한 게 아니야. 바람이 불면 흔들리는 것 같지만 절대 부러지지 않는 덩굴처럼 질긴 생명력을 가졌어. 유연함과 적응력이 최고의 무기야. 어떤 환경에서든 살아남고, 사람들 틈사이에서 자기 자리를 찾는 능력이 탁월해. 예술적 감각도 있어서 뷰티, 디자인, 음악 쪽으로 소질이 있어. 사람을 대할 때도 부드럽게 다가가서 마음을 여는 재주가 있지.',
    trait: '유연함, 적응력, 예술적',
    strength: '어디서든 살아남는 놀라운 적응력',
    weakness: '너무 남에게 맞추다가 자기 자신을 잃을 수 있어'
  },
  2: {
    name: '병(태양)', short: '태양',
    desc: '방에 들어가면 자연스럽게 시선이 모이는 타입. 태양처럼 에너지가 뿜어져 나와. 열정적이고 밝고, 사람들을 이끄는 힘이 있어. 화끈하고 소신있는 성격이라 주변에 사람이 많이 모여. 그런데 태양은 모두를 비추지만 정작 자기 자신은 그늘에 가려져서, 가끔 외로울 때가 있어. 또 너무 뜨거워서 가까이 가면 데이는 경우도. 중요한 건 그 열정을 어디에 쏟느냐야.',
    trait: '열정, 밝음, 카리스마',
    strength: '주변을 밝히고 이끄는 타고난 리더 기질',
    weakness: '번아웃이 올 수 있어서 에너지 관리가 중요해'
  },
  3: {
    name: '정(촛불)', short: '촛불',
    desc: '조용한 열정의 소유자. 태양처럼 화려하진 않지만, 어둠 속에서 빛나는 촛불 같은 사람이야. 섬세하고 따뜻하고 지적인 매력이 있어. 사람의 마음을 읽는 능력이 뛰어나고, 말 한마디 안 해도 분위기를 파악하는 사람. 학구적이고 탐구심이 강해서 전문 분야에서 두각을 나타내는 타입이야. 다만 너무 많이 생각하고 감정을 안으로 쌓는 경향이 있어서, 가끔은 표현하는 연습이 필요해.',
    trait: '섬세, 따뜻함, 지적',
    strength: '깊은 통찰력과 사람을 이해하는 능력',
    weakness: '감정을 안으로만 쌓아서 내면이 지칠 수 있어'
  },
  4: {
    name: '무(산)', short: '산',
    desc: '움직이지 않는 산처럼 든든한 존재감. 주변 사람들이 힘들 때 가장 먼저 찾는 사람이야. 중재자 역할을 잘 하고, 어느 편에도 치우치지 않는 공정함이 있어. 포용력이 크고 맥이 두꺼워. 사람들이 너 옆에 있으면 이상하게 마음이 편안해져. 대신 변화를 싫어하고 움직이는 게 느릴 수 있어. 하지만 한번 움직이면 그 에너지는 산사태급이야.',
    trait: '듬직, 신뢰, 포용',
    strength: '어떤 상황에서도 흔들리지 않는 안정감',
    weakness: '변화에 느리게 반응해서 기회를 놓칠 수 있어'
  },
  5: {
    name: '기(들판)', short: '들판',
    desc: '따뜻한 들판처럼 누구든 품어주는 사람. 겉으로 화려하지 않지만 가장 많은 것을 키워내는 힘이 있어. 실용적이고 겸소하고, 사람들을 보살피는 모성적 본능이 강해. 요리, 가드닝, 교육 같은 키우고 돌보는 분야에서 빛나는 타입이야. 다만 자기 자신보다 남을 더 챙기는 경향이 있어서, 가끔은 나를 위한 시간을 꼭 가져야 해.',
    trait: '모성적, 실용적, 겸손',
    strength: '사람과 관계를 키워내는 타고난 능력',
    weakness: '자기희생이 과해져서 번아웃이 올 수 있어'
  },
  6: {
    name: '경(강철)', short: '강철',
    desc: '칼날 같은 판단력의 소유자. 결정이 빠르고 한번 잘랐으면 뒤돌아보지 않는 스타일. 카리스마와 승부욕이 강해서 무엇을 하든 이기려고 해. 날카로운 비판력이 있고 본질을 꿰뚫어 내는 타입. 비즈니스나 전문직에서 크게 성공할 가능성이 높아. 정의감도 있어서 약한 사람 편에 서는 의리가 있지. 다만 그 날카로움이 때로는 사람을 상처줄 수 있어.',
    trait: '카리스마, 결단력, 승부욕',
    strength: '빠른 판단과 강한 실행력',
    weakness: '너무 직설적이라 인간관계에서 갈등이 올 수 있어'
  },
  7: {
    name: '신(보석)', short: '보석',
    desc: '거친 원석을 깎아 빛나는 보석을 만드는 사람. 디테일에 강하고 미적 감각이 뛰어난 완벽주의자야. 세련되고 깔끔한 것을 좋아하고, 자기만의 기준이 확실해. 패션, 디자인, 예술, 기획 같은 분야에서 진가를 발휘해. 예민하고 예술적인 면이 있지만, 그만큼 상처도 잘 받는 편이야. 완벽하지 않아도 괜찮다는 걸 기억하면 더 빛날 수 있어.',
    trait: '완벽주의, 세련, 예민',
    strength: '뛰어난 미적 감각과 디테일 관리 능력',
    weakness: '완벽주의가 과하면 행동이 느려질 수 있어'
  },
  8: {
    name: '임(바다)', short: '바다',
    desc: '바다처럼 넓고 깊은 사람. 겉으로는 잔잔해 보여도 속에는 거대한 흐름이 있어. 지혜롭고 포용력이 크고, 자유를 사랑하는 영혼이야. 하나의 틀에 갇히는 걸 싫어하고, 늘 더 큰 그림을 보려고 해. 학문이나 철학에 관심이 많고 직관력이 무척 좋아. 리더보다는 전략가 타입으로, 뒤에서 판을 짜는 역할이 더 잘 맞아.',
    trait: '지혜, 포용, 자유',
    strength: '넓은 시야와 깊은 사고력',
    weakness: '현실보다 이상에 치우쳐서 실행이 느릴 수 있어'
  },
  9: {
    name: '계(비/이슬)', short: '비와 이슬',
    desc: '아침 이슬처럼 맑고 순수한 감성의 소유자. 남들이 못 보는 걸 느끼고, 남들이 못 듣는 걸 듣는 사람이야. 직관력과 창의력이 뛰어나고 신비로운 매력이 있어. 감성이 풍부해서 예술이나 창작 분야에서 두각을 나타낼 수 있어. 사람의 감정에 공감하는 능력도 최고야. 다만 감정 기복이 크고 우울한 면이 있을 수 있어서, 마음 관리가 중요해.',
    trait: '직관, 감성, 창의',
    strength: '남들이 못 보는 것을 포착하는 직관력',
    weakness: '감정 기복이 심해서 에너지 소모가 클 수 있어'
  }
};

/**
 * Canonical hour-branch mapping from exact birth time.
 * Standard Korean 만세력: each 시 is exactly 2 hours.
 * 자시 23:00-00:59, 축시 01:00-02:59, ... 해시 21:00-22:59
 */
export function exactTimeToHourBranch(hour: number, minute: number): number {
  const total = hour * 60 + minute;
  if (total >= 1380 || total < 60) return 0;   // 자 23:00-00:59
  if (total < 180) return 1;                     // 축 01:00-02:59
  if (total < 300) return 2;                     // 인 03:00-04:59
  if (total < 420) return 3;                     // 묘 05:00-06:59
  if (total < 540) return 4;                     // 진 07:00-08:59
  if (total < 660) return 5;                     // 사 09:00-10:59
  if (total < 780) return 6;                     // 오 11:00-12:59
  if (total < 900) return 7;                     // 미 13:00-14:59
  if (total < 1020) return 8;                    // 신 15:00-16:59
  if (total < 1140) return 9;                    // 유 17:00-18:59
  if (total < 1260) return 10;                   // 술 19:00-20:59
  return 11;                                      // 해 21:00-22:59
}

/** Validate that a saju result is internally consistent */
export function validateSajuResult(saju: ReturnType<typeof calcSaju>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  // Stem must be 0-9
  if (saju.yStem < 0 || saju.yStem > 9) errors.push(`Invalid year stem: ${saju.yStem}`);
  if (saju.mStem < 0 || saju.mStem > 9) errors.push(`Invalid month stem: ${saju.mStem}`);
  if (saju.dStem < 0 || saju.dStem > 9) errors.push(`Invalid day stem: ${saju.dStem}`);
  // Branch must be 0-11
  if (saju.yBranch < 0 || saju.yBranch > 11) errors.push(`Invalid year branch: ${saju.yBranch}`);
  if (saju.mBranch < 0 || saju.mBranch > 11) errors.push(`Invalid month branch: ${saju.mBranch}`);
  if (saju.dBranch < 0 || saju.dBranch > 11) errors.push(`Invalid day branch: ${saju.dBranch}`);
  // Hour pillar: either -1 (unknown) or valid range
  if (saju.hStem !== -1 && (saju.hStem < 0 || saju.hStem > 9)) errors.push(`Invalid hour stem: ${saju.hStem}`);
  if (saju.hBranch !== -1 && (saju.hBranch < 0 || saju.hBranch > 11)) errors.push(`Invalid hour branch: ${saju.hBranch}`);
  // Stem-branch parity: stem%2 must equal branch%2 (both odd or both even)
  if (saju.yStem % 2 !== saju.yBranch % 2) errors.push('Year stem/branch parity mismatch');
  if (saju.mStem % 2 !== saju.mBranch % 2) errors.push('Month stem/branch parity mismatch');
  if (saju.dStem % 2 !== saju.dBranch % 2) errors.push('Day stem/branch parity mismatch');
  if (saju.hStem >= 0 && saju.hStem % 2 !== saju.hBranch % 2) errors.push('Hour stem/branch parity mismatch');
  return { valid: errors.length === 0, errors };
}

/** Engine version for audit trail */
export const SAJU_ENGINE_VERSION = '1.2.0';
