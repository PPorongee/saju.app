// 신살 분석 — 핵심 신살을 사주에서 detect.
// 결과는 SpecialStarInfo[] (report schema).

import type { FourPillars } from '../calendar/pillarCalculator';
import type { SpecialStarInfo } from '../report/sajuReportSchema';
import {
  CHEONEUL, MUNCHANG, HAKDANG, YANGIN, HONGYEOM,
  doHwaFor, yeokMaFor, hwaGaeFor,
  GOEGANG_PILLARS, BAEKHO_PILLARS,
} from '../rules/specialStars';
import type { EarthlyBranch } from '../rules/earthlyBranches';

export function analyzeSpecialStars(pillars: FourPillars): SpecialStarInfo[] {
  const dm = pillars.dayMaster;
  const branches: Array<{ branch: EarthlyBranch; pos: string }> = [
    { branch: pillars.year.branch,  pos: '년지' },
    { branch: pillars.month.branch, pos: '월지' },
    { branch: pillars.day.branch,   pos: '일지' },
  ];
  if (pillars.hour) branches.push({ branch: pillars.hour.branch, pos: '시지' });

  const result: SpecialStarInfo[] = [];

  // 천을귀인
  const cheoneulTargets = CHEONEUL[dm] ?? [];
  const cheoneulHits = branches.filter(b => cheoneulTargets.includes(b.branch));
  if (cheoneulHits.length > 0) {
    result.push({
      name: '천을귀인',
      positions: cheoneulHits.map(h => h.pos),
      strengthScore: 60 + cheoneulHits.length * 15,
      interpretationHint: '결정적 순간에 사람·정보·조언이 붙는 구조',
    });
  }

  // 문창귀인
  const munchang = MUNCHANG[dm];
  const munchangHits = branches.filter(b => b.branch === munchang);
  if (munchangHits.length > 0) {
    result.push({
      name: '문창귀인',
      positions: munchangHits.map(h => h.pos),
      strengthScore: 55 + munchangHits.length * 10,
      interpretationHint: '공부·시험·글로 풀리는 학자형 기운',
    });
  }

  // 학당귀인
  const hakdang = HAKDANG[dm];
  const hakdangHits = branches.filter(b => b.branch === hakdang);
  if (hakdangHits.length > 0) {
    result.push({
      name: '학당귀인',
      positions: hakdangHits.map(h => h.pos),
      strengthScore: 50 + hakdangHits.length * 10,
      interpretationHint: '배움과 지식이 자신을 지키는 자산',
    });
  }

  // 양인
  const yangin = YANGIN[dm];
  if (yangin) {
    const hits = branches.filter(b => b.branch === yangin);
    if (hits.length > 0) {
      result.push({
        name: '양인',
        positions: hits.map(h => h.pos),
        strengthScore: 60 + hits.length * 10,
        interpretationHint: '결단력·승부성·위기 돌파의 강함 (이 강함이 자산)',
      });
    }
  }

  // 홍염
  const hongyeom = HONGYEOM[dm];
  const hongyeomHits = branches.filter(b => b.branch === hongyeom);
  if (hongyeomHits.length > 0) {
    result.push({
      name: '홍염',
      positions: hongyeomHits.map(h => h.pos),
      strengthScore: 50 + hongyeomHits.length * 10,
      interpretationHint: '분위기로 사람을 끌어당기는 매력의 별',
    });
  }

  // 도화 — 년지·일지 기준 모두 검사
  const dohwaTargets = new Set([
    doHwaFor(pillars.year.branch),
    doHwaFor(pillars.day.branch),
  ]);
  const dohwaHits = branches.filter(b => dohwaTargets.has(b.branch));
  if (dohwaHits.length > 0) {
    result.push({
      name: '도화',
      positions: dohwaHits.map(h => h.pos),
      strengthScore: 55 + dohwaHits.length * 10,
      interpretationHint: '존재감과 시선을 끄는 매력의 별',
    });
  }

  // 역마
  const yeokmaTargets = new Set([
    yeokMaFor(pillars.year.branch),
    yeokMaFor(pillars.day.branch),
  ]);
  const yeokmaHits = branches.filter(b => yeokmaTargets.has(b.branch));
  if (yeokmaHits.length > 0) {
    result.push({
      name: '역마',
      positions: yeokmaHits.map(h => h.pos),
      strengthScore: 50 + yeokmaHits.length * 10,
      interpretationHint: '이동·변화·확장에서 운이 살아나는 별',
    });
  }

  // 화개
  const hwagaeTargets = new Set([
    hwaGaeFor(pillars.year.branch),
    hwaGaeFor(pillars.day.branch),
  ]);
  const hwagaeHits = branches.filter(b => hwagaeTargets.has(b.branch));
  if (hwagaeHits.length > 0) {
    result.push({
      name: '화개',
      positions: hwagaeHits.map(h => h.pos),
      strengthScore: 50 + hwagaeHits.length * 10,
      interpretationHint: '혼자 정리할 때 깊어지는 몰입·내면의 별',
    });
  }

  // 괴강 — 일주
  const dayPillar = pillars.day.stem + pillars.day.branch;
  if (GOEGANG_PILLARS.has(dayPillar)) {
    result.push({
      name: '괴강',
      positions: ['일주'],
      strengthScore: 70,
      interpretationHint: '남다른 카리스마·강한 자기 기준의 별',
    });
  }

  // 백호
  if (BAEKHO_PILLARS.has(dayPillar)) {
    result.push({
      name: '백호',
      positions: ['일주'],
      strengthScore: 65,
      interpretationHint: '돌파력과 추진력의 별 (흉성 X — 강한 자아)',
    });
  }

  return result;
}
