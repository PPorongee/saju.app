// 대운·세운 흐름 해석.
// 원국과 운의 관계 (합/충/형/용신/기신과의 결합) 분석.

import type { FourPillars } from '../calendar/pillarCalculator';
import type { FortuneCycleResult } from '../calendar/fortuneCycleCalculator';
import type {
  UsefulGodAnalysis, TenGodAnalysis,
  DaewoonInfo, SewoonYearInfo, FortuneCycleInfo,
} from '../report/sajuReportSchema';
import { STEM_ELEMENT, BRANCH_ELEMENT, type Element } from '../rules/elements';
import { calcTenGod } from '../rules/tenGods';
import { BRANCH_CONFLICTS } from '../rules/conflicts';
import { BRANCH_SIX } from '../rules/combinations';

export function analyzeFortuneFlow(args: {
  pillars: FourPillars;
  cycles: FortuneCycleResult;
  usefulGod: UsefulGodAnalysis;
  tenGods: TenGodAnalysis;
}): FortuneCycleInfo {
  const { pillars, cycles, usefulGod } = args;
  const dm = pillars.dayMaster;

  // 현재 대운
  const cd = cycles.currentDaewoon;
  const cdStemEl = STEM_ELEMENT[cd.stem];
  const cdBranchEl = BRANCH_ELEMENT[cd.branch];
  const cdStemTg = calcTenGod(dm, cd.stem);
  const cdRelation: string[] = [];
  cdRelation.push(`대운 천간 ${cd.stem}(${cdStemEl}) → 일간 기준 ${cdStemTg}`);
  cdRelation.push(`대운 지지 ${cd.branch}(${cdBranchEl})`);
  // 원국 지지와 충/육합 검사
  const allBranches = [pillars.year.branch, pillars.month.branch, pillars.day.branch];
  if (pillars.hour) allBranches.push(pillars.hour.branch);
  for (const b of allBranches) {
    if (BRANCH_CONFLICTS.some(([a, bb]) => (a === b && bb === cd.branch) || (a === cd.branch && bb === b))) {
      cdRelation.push(`원국 ${b} ↔ 대운 ${cd.branch} 충`);
    }
    if (BRANCH_SIX.some(c => (c.pair[0] === b && c.pair[1] === cd.branch) || (c.pair[1] === b && c.pair[0] === cd.branch))) {
      cdRelation.push(`원국 ${b} ↔ 대운 ${cd.branch} 육합`);
    }
  }

  const usefulEl = usefulGod.primaryUseful.value as Element;
  const kiEl = usefulGod.unfavorable[0] as Element;
  if (cdStemEl === usefulEl || cdBranchEl === usefulEl) {
    cdRelation.push(`★ 대운에 용신 ${usefulEl} 들어옴 — 강점이 살아나는 흐름`);
  }
  if (cdStemEl === kiEl || cdBranchEl === kiEl) {
    cdRelation.push(`⚠ 대운에 기신 ${kiEl} 들어옴 — 무리·과잉 주의`);
  }

  const currentDaewoon: DaewoonInfo = {
    pillar: cd.pillarKo,
    ageRange: `${cd.startAge}~${cd.endAge.toFixed(1)}`,
    theme: `${cdStemTg} 대운 — ${themeOfTenGod(cdStemTg)}`,
    relationToChart: cdRelation,
  };

  // 향후 3년 세운
  const nextThreeYears: SewoonYearInfo[] = cycles.nextThreeYears.map(sy => {
    const stemEl = STEM_ELEMENT[sy.stem];
    const branchEl = BRANCH_ELEMENT[sy.branch];
    const stemTg = calcTenGod(dm, sy.stem);
    const activatedElements: Element[] = [stemEl, branchEl];
    const activatedTenGods = [stemTg];
    const risks: string[] = [];
    const opportunities: string[] = [];
    const relation: string[] = [`세운 ${sy.pillarKo} (천간 ${stemTg}, 지지 ${branchEl})`];

    if (stemEl === usefulEl || branchEl === usefulEl) {
      opportunities.push(`용신 ${usefulEl} 들어옴 — 잠재력이 현실로 나올 구간`);
    }
    if (stemEl === kiEl || branchEl === kiEl) {
      risks.push(`기신 ${kiEl} 들어옴 — 무리한 확장·과부하 주의`);
    }
    for (const b of allBranches) {
      if (BRANCH_CONFLICTS.some(([a, bb]) => (a === b && bb === sy.branch) || (a === sy.branch && bb === b))) {
        risks.push(`원국 ${b} ↔ 세운 ${sy.branch} 충 — 변동·이동`);
      }
    }

    return {
      year: sy.year,
      pillar: sy.pillarKo,
      theme: `${stemTg} 세운`,
      activatedElements,
      activatedTenGods,
      risks,
      opportunities,
      relationToOriginalChart: relation,
    };
  });

  return { currentDaewoon, nextThreeYears };
}

function themeOfTenGod(tg: string): string {
  const map: Record<string, string> = {
    비견: '동료·자기 확장', 겁재: '경쟁·재물 변동',
    식신: '표현·성과 누적', 상관: '재능·돌파·파격',
    정재: '안정 재물·결혼', 편재: '큰 재물·기회·사업',
    정관: '직책·인정·책임', 편관: '시련·돌파·압박',
    정인: '학습·문서·인정', 편인: '독창·통찰·자격',
  };
  return map[tg] ?? '주제 미상';
}
