// SpecialPoint Detector — spec §9-2의 9개 카테고리(A~I) detection.
//
// 각 detector는 (a) 해당 패턴이 사주에 있는지 확인 → (b) 점수 신호 산출 →
// (c) 카탈로그 narrative + 점수 + evidence를 묶어 SpecialPoint 반환.
//
// detect → 50점 이상만 노출 → displayPriority 정렬 → 최대 5개

import type { FourPillars } from '../calendar/pillarCalculator';
import type {
  SpecialPoint, TenGodAnalysis, ElementStrengthAnalysis,
  DayMasterStrengthAnalysis, UsefulGodAnalysis,
  SpecialStarInfo, FortuneCycleInfo,
} from '../report/sajuReportSchema';
import type { StructureAnalysis } from '../analysis/structureAnalyzer';
import { SPECIAL_POINT_TITLE_TEMPLATES } from './specialPointCatalog';
import { scoreSpecialPoint, type ScoreSignals } from './specialPointScorer';
import { buildNarrative } from './specialPointNarrativeMapper';
import { TEN_GOD_CATEGORY } from '../rules/tenGods';
import { HIDDEN_STEMS } from '../rules/hiddenStems';
import { calcTenGod } from '../rules/tenGods';
import { STEM_ELEMENT, type Element } from '../rules/elements';

export interface DetectorInput {
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  dayMasterStrength: DayMasterStrengthAnalysis;
  structure: StructureAnalysis;
  usefulGod: UsefulGodAnalysis;
  specialStars: SpecialStarInfo[];
  fortune: FortuneCycleInfo;
  hourUnknown: boolean;
}

export function detectSpecialPoints(input: DetectorInput): SpecialPoint[] {
  const candidates: SpecialPoint[] = [];

  candidates.push(...detectNoble(input));
  candidates.push(...detectMoneyTalent(input));
  candidates.push(...detectCareerAuthority(input));
  candidates.push(...detectAttraction(input));
  candidates.push(...detectInnerDepth(input));
  candidates.push(...detectMovement(input));
  candidates.push(...detectMentalStrength(input));
  candidates.push(...detectInnerOuterContrast(input));
  candidates.push(...detectFortuneActivation(input));

  // 50 이상만, displayPriority 내림차순, 최대 5개
  return candidates
    .filter(c => c.strengthScore >= 50)
    .sort((a, b) => b.displayPriority - a.displayPriority)
    .slice(0, 5);
}

// ============================================================
// A. 귀인·보호막
// ============================================================
function detectNoble(input: DetectorInput): SpecialPoint[] {
  const out: SpecialPoint[] = [];
  const cheoneul = input.specialStars.find(s => s.name === '천을귀인');
  if (cheoneul) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: cheoneul.positions.some(p => p === '월지' || p === '일지'),
      dayBranch: cheoneul.positions.includes('일지'),
      monthBranch: cheoneul.positions.includes('월지'),
      usefulGodLink: false, // 후속 평가
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('cheoneulStrong', '천을귀인', sig, [{
      source: 'specialStar', description: `천을귀인 in ${cheoneul.positions.join(',')}`,
    }]));
  }
  const munchang = input.specialStars.find(s => s.name === '문창귀인');
  if (munchang) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: munchang.positions.some(p => p === '월지' || p === '일지'),
      dayBranch: munchang.positions.includes('일지'),
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('munchangScholar', '문창귀인', sig, [{
      source: 'specialStar', description: `문창귀인 in ${munchang.positions.join(',')}`,
    }]));
  }
  return out;
}

// ============================================================
// B. 돈 되는 재능
// ============================================================
function detectMoneyTalent(input: DetectorInput): SpecialPoint[] {
  const out: SpecialPoint[] = [];
  const t = input.tenGods.totals;
  const outputStrong = (t['식신'] + t['상관']) >= 1.5;
  const wealthStrong = (t['편재'] + t['정재']) >= 1.5;

  if (outputStrong && wealthStrong) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: true, // 식상·재성이 천간에 있으면 직접 영향
      usefulGodLink: input.usefulGod.favorable.includes('water') || input.usefulGod.favorable.includes('wood'),
      supportingFactors: 1,
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('sikSangSaengJae', '식상생재', sig, [
      { source: 'tenGod', description: `식상 합 ${(t['식신']+t['상관']).toFixed(2)}, 재성 합 ${(t['편재']+t['정재']).toFixed(2)}` },
    ]));
  }
  if (t['편재'] >= 2.0) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: input.tenGods.visible.some(v => v.tenGod === '편재' && (v.position === 'monthStem' || v.position === 'dayStem')),
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('pyeonjaeStrong', '편재 강세', sig, [
      { source: 'tenGod', description: `편재 ${t['편재'].toFixed(2)}` },
    ]));
  }
  return out;
}

// ============================================================
// C. 직업·권위
// ============================================================
function detectCareerAuthority(input: DetectorInput): SpecialPoint[] {
  const out: SpecialPoint[] = [];
  const t = input.tenGods.totals;
  const authorityStrong = (t['정관'] + t['편관']) >= 1.2;
  const supportStrong = (t['정인'] + t['편인']) >= 1.2;

  if (authorityStrong && supportStrong) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: true,
      monthBranch: input.tenGods.hidden.some(h => h.position === 'monthBranch' && (h.tenGod === '정인' || h.tenGod === '편인')),
      supportingFactors: 1,
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('gwanInSangSaeng', '관인상생', sig, [
      { source: 'tenGod', description: `관성 합 ${(t['정관']+t['편관']).toFixed(2)}, 인성 합 ${(t['정인']+t['편인']).toFixed(2)}` },
    ]));
  }
  // 식신제살: 편관 강 + 식신 강 + 격국이 편관격 또는 식신제살 흐름
  if (t['편관'] >= 1.0 && t['식신'] >= 1.0) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: true,
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('sikSinJeSal', '식신제살', sig, [
      { source: 'tenGod', description: `편관 ${t['편관'].toFixed(2)}, 식신 ${t['식신'].toFixed(2)}` },
    ]));
  }
  return out;
}

// ============================================================
// D. 매력·인기
// ============================================================
function detectAttraction(input: DetectorInput): SpecialPoint[] {
  const out: SpecialPoint[] = [];
  const dohwa = input.specialStars.find(s => s.name === '도화');
  const t = input.tenGods.totals;
  const outputStrong = (t['식신'] + t['상관']) >= 1.5;
  if (dohwa && outputStrong) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: dohwa.positions.includes('월지') || dohwa.positions.includes('일지'),
      dayBranch: dohwa.positions.includes('일지'),
      supportingFactors: 1,
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('peachBlossomExpression', '도화+식상', sig, [
      { source: 'specialStar', description: '도화 + 식상 결합 → 표현형 매력' },
    ]));
  }
  const hongyeom = input.specialStars.find(s => s.name === '홍염');
  if (hongyeom) {
    const sig: ScoreSignals = {
      base: true,
      dayBranch: hongyeom.positions.includes('일지'),
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('hongyeomCharm', '홍염', sig, [
      { source: 'specialStar', description: `홍염 in ${hongyeom.positions.join(',')}` },
    ]));
  }
  return out;
}

// ============================================================
// E. 깊이·고독·몰입
// ============================================================
function detectInnerDepth(input: DetectorInput): SpecialPoint[] {
  const out: SpecialPoint[] = [];
  const hwagae = input.specialStars.find(s => s.name === '화개');
  const t = input.tenGods.totals;
  const supportStrong = (t['정인'] + t['편인']) >= 1.5;
  if (hwagae && supportStrong) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: hwagae.positions.includes('월지') || hwagae.positions.includes('일지'),
      dayBranch: hwagae.positions.includes('일지'),
      supportingFactors: 1,
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('hwagaeDepth', '화개+인성', sig, [
      { source: 'specialStar', description: `화개 in ${hwagae.positions.join(',')}` },
      { source: 'tenGod',      description: `인성 합 ${(t['정인']+t['편인']).toFixed(2)}` },
    ]));
  }
  return out;
}

// ============================================================
// F. 이동·변화
// ============================================================
function detectMovement(input: DetectorInput): SpecialPoint[] {
  const out: SpecialPoint[] = [];
  const yeokma = input.specialStars.find(s => s.name === '역마');
  if (yeokma) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: yeokma.positions.includes('월지') || yeokma.positions.includes('일지'),
      currentDaewoonActivation: input.fortune.currentDaewoon.relationToChart.some(r => r.includes('충')),
      hourUnknown: input.hourUnknown,
    };
    out.push(buildPoint('yeokMaMovement', '역마', sig, [
      { source: 'specialStar', description: `역마 in ${yeokma.positions.join(',')}` },
    ]));
  }
  return out;
}

// ============================================================
// G. 버티는 힘·승부성
// ============================================================
function detectMentalStrength(input: DetectorInput): SpecialPoint[] {
  const out: SpecialPoint[] = [];
  const yangin = input.specialStars.find(s => s.name === '양인');
  const goegang = input.specialStars.find(s => s.name === '괴강');
  const t = input.tenGods.totals;
  const selfStrong = (t['비견'] + t['겁재']) >= 1.5;
  if (yangin || goegang || selfStrong) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: !!goegang || (yangin && yangin.positions.includes('일지')),
      dayBranch: !!(yangin && yangin.positions.includes('일지')),
      supportingFactors: (yangin ? 1 : 0) + (goegang ? 1 : 0) + (selfStrong ? 1 : 0) - 1,
      hourUnknown: input.hourUnknown,
    };
    const evidence = [];
    if (yangin)  evidence.push({ source: 'specialStar' as const, description: `양인 in ${yangin.positions.join(',')}` });
    if (goegang) evidence.push({ source: 'specialStar' as const, description: `괴강 일주` });
    if (selfStrong) evidence.push({ source: 'tenGod' as const, description: `비겁 합 ${(t['비견']+t['겁재']).toFixed(2)}` });
    out.push(buildPoint('strongSurvival', '양인/괴강/비겁', sig, evidence));
  }
  return out;
}

// ============================================================
// H. 반전 구조 (천간 vs 지장간 십성 카테고리 비교)
// ============================================================
function detectInnerOuterContrast(input: DetectorInput): SpecialPoint[] {
  const visibleCats = new Set(input.tenGods.visible.map(v => TEN_GOD_CATEGORY[v.tenGod]));
  const hiddenCats = new Set(input.tenGods.hidden.map(h => TEN_GOD_CATEGORY[h.tenGod]));
  // 천간엔 'support'/'authority' (정관·정인 류) — 안정형
  // 지장간엔 'output'/'wealth' (식상·재성 류) — 표현·기회형
  const outerCalm = visibleCats.has('support') || visibleCats.has('authority');
  const innerActive = hiddenCats.has('output') || hiddenCats.has('wealth');
  if (outerCalm && innerActive) {
    const sig: ScoreSignals = {
      base: true,
      monthOrDayPillar: true,
      supportingFactors: 1,
      hourUnknown: input.hourUnknown,
    };
    return [buildPoint('innerOuterContrast', '천간-지장간 대조', sig, [
      { source: 'tenGod', description: `천간 카테고리 ${[...visibleCats].join(',')} vs 지장간 ${[...hiddenCats].join(',')}` },
    ])];
  }
  return [];
}

// ============================================================
// I. 운의 활성화 — 현 대운/세운에서 용신 들어오거나 강점 활성화
// ============================================================
function detectFortuneActivation(input: DetectorInput): SpecialPoint[] {
  const usefulEl = input.usefulGod.primaryUseful.value as Element;
  const activatedNow = input.fortune.currentDaewoon.relationToChart.some(r => r.includes('용신'));
  const activatedNext = input.fortune.nextThreeYears.some(y =>
    y.opportunities.some(o => o.includes('용신')) ||
    y.activatedElements.includes(usefulEl)
  );
  if (activatedNow || activatedNext) {
    const sig: ScoreSignals = {
      base: true,
      currentDaewoonActivation: activatedNow,
      nextYearsActivation: activatedNext,
      usefulGodLink: true,
      hourUnknown: input.hourUnknown,
    };
    return [buildPoint('fortuneActivation', '용신 활성화', sig, [
      { source: 'usefulGod', description: `용신 ${usefulEl} ${activatedNow ? '대운' : ''} ${activatedNext ? '세운' : ''}`.trim() },
    ])];
  }
  return [];
}

// ============================================================
// 공통 빌더
// ============================================================
function buildPoint(
  templateKey: keyof typeof SPECIAL_POINT_TITLE_TEMPLATES,
  name: string,
  sig: ScoreSignals,
  evidence: SpecialPoint['evidence'],
): SpecialPoint {
  const tpl = SPECIAL_POINT_TITLE_TEMPLATES[templateKey];
  const score = scoreSpecialPoint(sig);
  const narrative = buildNarrative({ templateKey, strengthScore: score.score });

  return {
    id: templateKey,
    name,
    category: tpl.category,
    title: tpl.title,
    shortLabel: tpl.shortLabel,
    strengthScore: score.score,
    rarity: {
      level: score.rarityLevel,
      estimatedPer10000: null,  // default: null (정성 표현만)
      basis: null,
      caution: '표본 통계 미수집 — 숫자로 환산하지 말 것',
    },
    evidence,
    activatedBy: narrative.activatedBy ?? [],
    weakenedBy: narrative.weakenedBy ?? [],
    narrative: narrative.narrative,
    displayPriority: score.score,
  };
}
