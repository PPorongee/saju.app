// Module 8 — 신강·신약 분석.
// spec §8 6단계 검사 절차를 점수로 환산 후 5레벨로 매핑.
//   1. 월령이 일간을 돕는가? (가장 큰 가중)
//   2. 일간이 지지에 통근(根)했는가?
//   3. 인성·비겁이 일간을 돕는가? (천간)
//   4. 식상·재성·관성이 일간을 소모·극하는가?
//   5. 합·충으로 뿌리가 흔들리는가? (Phase 2 후반에 confidence 조정)
//   6. 조후상 일간이 살아 움직이기 좋은가? (confidence 조정)

import type { FourPillars } from '../calendar/pillarCalculator';
import type { DayMasterStrengthAnalysis, TenGodAnalysis, ElementStrengthAnalysis } from '../report/sajuReportSchema';
import { STEM_ELEMENT, BRANCH_ELEMENT, PRODUCES, RESTRAINS } from '../rules/elements';
import { HIDDEN_STEMS } from '../rules/hiddenStems';
import { SCORING } from '../rules/scoringWeights';
import { TEN_GOD_CATEGORY } from '../rules/tenGods';

export function analyzeDayMasterStrength(
  pillars: FourPillars,
  tenGods: TenGodAnalysis,
  elements: ElementStrengthAnalysis,
): DayMasterStrengthAnalysis {
  const dm = pillars.dayMaster;
  const myEl = STEM_ELEMENT[dm];

  const support: string[] = [];
  const drain: string[] = [];
  const conflict: string[] = [];

  let score = 0;

  // 1. 월령 (가장 큰 가중)
  const monthEl = BRANCH_ELEMENT[pillars.month.branch];
  if (monthEl === myEl) {
    score += SCORING.DM_BONUS_MONTH_SAME_ELEMENT;
    support.push(`월령 ${pillars.month.branch}(${monthEl}) = 일간(${myEl}) → 비겁 왕 +${SCORING.DM_BONUS_MONTH_SAME_ELEMENT}`);
  } else if (PRODUCES[monthEl] === myEl) {
    score += SCORING.DM_BONUS_MONTH_PRODUCES_SELF;
    support.push(`월령 ${pillars.month.branch}(${monthEl})이 일간 생함 → 인성 왕 +${SCORING.DM_BONUS_MONTH_PRODUCES_SELF}`);
  } else if (RESTRAINS[monthEl] === myEl) {
    score -= SCORING.DM_DRAIN_MONTH_RESTRAINS_SELF;
    drain.push(`월령 ${pillars.month.branch}(${monthEl})이 일간 극함 → 관살 왕 -${SCORING.DM_DRAIN_MONTH_RESTRAINS_SELF}`);
  } else if (RESTRAINS[myEl] === monthEl) {
    score -= SCORING.DM_DRAIN_MONTH_RESTRAINED_BY_SELF;
    drain.push(`월령 ${pillars.month.branch}(${monthEl}) — 일간이 극하는 오행 → 재성 왕 -${SCORING.DM_DRAIN_MONTH_RESTRAINED_BY_SELF}`);
  } else if (PRODUCES[myEl] === monthEl) {
    score -= SCORING.DM_DRAIN_MONTH_PRODUCED_BY_SELF;
    drain.push(`월령 ${pillars.month.branch}(${monthEl}) — 일간이 생하는 오행 → 식상 왕 -${SCORING.DM_DRAIN_MONTH_PRODUCED_BY_SELF}`);
  }

  // 2. 일지 통근
  const dayBranch = pillars.day.branch;
  const dayPrimary = HIDDEN_STEMS[dayBranch].find(h => h.role === 'primary')!.stem;
  if (STEM_ELEMENT[dayPrimary] === myEl) {
    score += SCORING.DM_BONUS_DAY_BRANCH_PRIMARY_SELF;
    support.push(`일지 ${dayBranch} 본기 ${dayPrimary}(${myEl}) — 일간 본근 +${SCORING.DM_BONUS_DAY_BRANCH_PRIMARY_SELF}`);
  } else {
    // 본기 아닌 중기/여기에 통근하는지
    const root = HIDDEN_STEMS[dayBranch].find(h => STEM_ELEMENT[h.stem] === myEl);
    if (root) {
      score += SCORING.DM_BONUS_DAY_BRANCH_ROOT * root.weight;
      support.push(`일지 ${dayBranch}에 ${root.role} 통근 (${root.stem}) +${(SCORING.DM_BONUS_DAY_BRANCH_ROOT * root.weight).toFixed(2)}`);
    }
  }

  // 3,4. 천간에 비견·겁재·인성 vs 식상·재성·관성
  for (const v of tenGods.visible) {
    const cat = TEN_GOD_CATEGORY[v.tenGod];
    if (cat === 'self') {
      score += SCORING.DM_BONUS_STEM_SAME_ELEMENT;
      support.push(`${v.position} ${v.source} ${v.tenGod} +${SCORING.DM_BONUS_STEM_SAME_ELEMENT}`);
    } else if (cat === 'support') {
      score += SCORING.DM_BONUS_STEM_PRODUCES_SELF;
      support.push(`${v.position} ${v.source} ${v.tenGod} +${SCORING.DM_BONUS_STEM_PRODUCES_SELF}`);
    } else {
      score -= SCORING.DM_DRAIN_STEM_OUT;
      drain.push(`${v.position} ${v.source} ${v.tenGod} -${SCORING.DM_DRAIN_STEM_OUT}`);
    }
  }

  // 5. 합·충 (Phase 2 후반에 conflicts 모듈 연결 — 일단 confidence만 표시)
  // 6. 조후 — 일간이 너무 한/열에 노출되면 약화
  const climate = elements.climate.coldHot;
  let confidence: DayMasterStrengthAnalysis['confidence'] = 'high';
  if (climate === 'too-cold' || climate === 'too-hot') {
    conflict.push(`조후 ${climate} — 일간 운동성 저하 가능`);
    confidence = 'medium';
  }

  // 레벨 매핑
  const t = SCORING.DAY_MASTER_STRENGTH_THRESHOLDS;
  let level: DayMasterStrengthAnalysis['level'];
  if (score >= t['very-strong'])      level = 'very-strong';
  else if (score >= t['strong'])      level = 'strong';
  else if (score >= t['balanced'])    level = 'balanced';
  else if (score >= t['weak'])        level = 'weak';
  else                                 level = 'very-weak';

  return {
    level,
    score: Number(score.toFixed(2)),
    supportFactors: support,
    drainingFactors: drain,
    conflictFactors: conflict,
    conclusion: buildConclusion(level, dm, myEl, score),
    confidence,
  };
}

function buildConclusion(level: DayMasterStrengthAnalysis['level'], dm: string, myEl: string, score: number): string {
  const labels: Record<DayMasterStrengthAnalysis['level'], string> = {
    'very-strong': '신강 — 일간이 매우 강하다',
    'strong':       '신강 — 일간이 강한 편',
    'balanced':     '중화 — 일간이 균형',
    'weak':         '신약 — 일간이 약한 편',
    'very-weak':    '신약 — 일간이 매우 약하다',
  };
  return `일간 ${dm}(${myEl}) 총점 ${score.toFixed(2)} → ${labels[level]}`;
}
