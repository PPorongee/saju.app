// Daily Fortune V1 — deterministic 빌더 (spec §2·§3·§6).
//
// GPT 호출 0회. 사용자 원국(calculateAnalysisOnly 재사용) + 오늘 일진(calculatePillars 재사용)을
// 계산해 십성·용신/기신 관계·충합형해를 도출하고, 템플릿으로 짧은 카드를 만든다.
//
// 결정론 보장: 같은 birth + 같은 targetDate → 같은 결과 (모든 입력이 순수 함수).
// 날짜(targetDate)가 바뀌면 일진·십성이 바뀌어 결과도 바뀐다.

import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { normalizeBirthInput, type BirthInput } from '../calendar/normalizeBirthInput';
import { calculatePillars } from '../calendar/pillarCalculator';
import { buildPrecisionContext } from '../calendar/precisionContext';
import { DEFAULT_RULE_CONFIG } from '../rules/ruleConfig';
import { calcTenGod, TEN_GOD_CATEGORY } from '../rules/tenGods';
import {
  ELEMENTS, ELEMENT_KO, STEM_ELEMENT, BRANCH_ELEMENT, type Element,
} from '../rules/elements';
import type { HeavenlyStem } from '../rules/heavenlyStems';
import type { EarthlyBranch } from '../rules/earthlyBranches';
import { BRANCH_CONFLICTS, BRANCH_PUNISHMENTS, BRANCH_DESTRUCTIONS, BRANCH_HARMS } from '../rules/conflicts';
import { BRANCH_SIX, BRANCH_HALF } from '../rules/combinations';
import type { TenGod } from '../report/sajuReportSchema';
import {
  type DailyFortuneInput, type DailyFortuneV1, type DailyFlowLabel,
  type DailyFortuneEvidence, type DailyLuckItem,
} from './dailyFortuneTypes';
import { TENGOD_FLAVOR, FLOW_TEMPLATE, TENGOD_FLAVOR_EN, FLOW_TEMPLATE_EN } from './dailyTemplates';
import { LUCK_BY_ELEMENT, LUCK_BY_ELEMENT_EN } from './dailyLuckTable';
import { validateDailyFortune } from './dailyFortuneValidator';

// ============================================================
// 날짜 / 일진 헬퍼
// ============================================================

const SEOUL_TZ = 'Asia/Seoul';

/** now(JS Date)를 Asia/Seoul 기준 YYYY-MM-DD로. 의존성 없이 Intl 사용. */
export function todayInSeoul(now: Date): string {
  // 'en-CA' 로케일은 YYYY-MM-DD 포맷을 보장.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: SEOUL_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(now);
}

/** 임의 날짜의 일진(천간·지지)을 기존 엔진으로 계산. 정오 기준이라 야자시 시프트 무관. */
function computeDayPillar(dateYmd: string, now: Date): { stem: HeavenlyStem; branch: EarthlyBranch } {
  const synthetic: BirthInput = {
    gender: 'unknown',
    calendarType: 'solar',
    birthDate: dateYmd,
    birthTime: '12:00',
    birthTimeConfidence: 'exact',
    timezone: SEOUL_TZ,
  };
  const normalized = normalizeBirthInput(synthetic, now);
  const pctx = buildPrecisionContext(normalized, synthetic);
  const res = calculatePillars(normalized, DEFAULT_RULE_CONFIG, pctx.pillarOptions);
  return { stem: res.pillars.day.stem, branch: res.pillars.day.branch };
}

// ============================================================
// 지지 상호작용 (충·형·파·해·합·반합)
// ============================================================

type BranchPos = 'year' | 'month' | 'day' | 'hour';
const POS_KO: Record<BranchPos, string> = { year: '연지', month: '월지', day: '일지', hour: '시지' };
const POS_EN: Record<BranchPos, string> = { year: 'year branch', month: 'month branch', day: 'day branch', hour: 'hour branch' };
const ELEMENT_EN_NAME: Record<Element, string> = { wood: 'Wood', fire: 'Fire', earth: 'Earth', metal: 'Metal', water: 'Water' };
const KIND_EN: Record<string, string> = { '충': 'clash', '형': 'punishment', '파': 'break', '해': 'harm', '합': 'combine', '반합': 'half-combine' };

type InteractionKind = '충' | '형' | '파' | '해' | '합' | '반합';
interface Interaction { kind: InteractionKind; withPos: BranchPos; name: string }

function pairMatches(a: EarthlyBranch, b: EarthlyBranch, pair: [EarthlyBranch, EarthlyBranch]): boolean {
  return (a === pair[0] && b === pair[1]) || (a === pair[1] && b === pair[0]);
}

/** 오늘 지지와 원국 지지 1개 사이의 관계를 모두 수집. */
function interactionsForBranch(today: EarthlyBranch, natal: EarthlyBranch, pos: BranchPos): Interaction[] {
  const found: Interaction[] = [];

  for (const pair of BRANCH_CONFLICTS) {
    if (pairMatches(today, natal, pair)) found.push({ kind: '충', withPos: pos, name: `${pair[0]}${pair[1]} 충` });
  }
  for (const p of BRANCH_PUNISHMENTS) {
    if (p.branches.length === 2) {
      if (pairMatches(today, natal, [p.branches[0], p.branches[1]])) found.push({ kind: '형', withPos: pos, name: p.name });
    } else if (p.subtype === '자형') {
      if (today === natal && today === p.branches[0]) found.push({ kind: '형', withPos: pos, name: p.name });
    } else {
      // 3지 형(인사신/축술미): 오늘·원국이 모두 세트에 속하고 서로 다르면 형 성립으로 간주(MVP).
      if (today !== natal && p.branches.includes(today) && p.branches.includes(natal)) {
        found.push({ kind: '형', withPos: pos, name: p.name });
      }
    }
  }
  for (const pair of BRANCH_DESTRUCTIONS) {
    if (pairMatches(today, natal, pair)) found.push({ kind: '파', withPos: pos, name: `${pair[0]}${pair[1]} 파` });
  }
  for (const pair of BRANCH_HARMS) {
    if (pairMatches(today, natal, pair)) found.push({ kind: '해', withPos: pos, name: `${pair[0]}${pair[1]} 해` });
  }
  for (const six of BRANCH_SIX) {
    if (pairMatches(today, natal, six.pair)) found.push({ kind: '합', withPos: pos, name: six.name });
  }
  for (const half of BRANCH_HALF) {
    if (pairMatches(today, natal, half.pair)) found.push({ kind: '반합', withPos: pos, name: half.name });
  }
  return found;
}

// ============================================================
// flowLabel 결정 (deterministic)
// ============================================================

type UseGodRelation = 'boost' | 'drain' | 'neutral';
type TenGodCategory = 'self' | 'output' | 'wealth' | 'authority' | 'support';

function decideFlowLabel(
  rel: UseGodRelation,
  category: TenGodCategory,
  interactions: Interaction[],
): DailyFlowLabel {
  const hasClash = interactions.some(i => i.kind === '충');
  const dayBranchClash = interactions.some(i => i.kind === '충' && i.withPos === 'day');
  const hasPunish = interactions.some(i => i.kind === '형');
  const hasCombine = interactions.some(i => i.kind === '합' || i.kind === '반합');

  if (dayBranchClash) return '관계 조심';
  if (hasClash && rel === 'drain') return '무리 금지';
  if (hasClash || hasPunish) return '속도 조절';

  if (rel === 'drain') return '정리 필요한 날';

  if (rel === 'boost') {
    if (category === 'wealth') return '돈 관리 유리';
    if (category === 'output') return '집중력 좋은 날';
    if (category === 'self') return '움직이면 풀리는 날';
    return '흐름 좋음'; // authority / support
  }

  // neutral
  if (category === 'output') return '집중력 좋은 날';
  if (category === 'wealth') return '돈 관리 유리';
  if (hasCombine) return '흐름 좋음';
  return '속도 조절';
}

// ============================================================
// 메인 빌더
// ============================================================

export function buildDailyFortune(input: DailyFortuneInput, now: Date = new Date()): DailyFortuneV1 {
  const targetDate = input.targetDate ?? todayInSeoul(now);
  const lang = input.lang ?? 'ko';
  const isEn = lang === 'en';
  const elName = (el: Element) => (isEn ? ELEMENT_EN_NAME[el] : ELEMENT_KO[el]);

  // 1) 사용자 원국 (GPT 없음) — 용신/기신 + 일간 + 원국 지지
  const analysis = calculateAnalysisOnly(input.birth, now);
  const dayMaster = analysis.birthChart.dayMaster as HeavenlyStem;
  const usefulGod = analysis.coreAnalysis.usefulGod;

  const natalBranches: Array<{ pos: BranchPos; branch: EarthlyBranch }> = [];
  const pushNatal = (pos: BranchPos, ganji?: string) => {
    if (ganji && ganji.length >= 2) natalBranches.push({ pos, branch: ganji.charAt(1) as EarthlyBranch });
  };
  pushNatal('year', analysis.birthChart.year);
  pushNatal('month', analysis.birthChart.month);
  pushNatal('day', analysis.birthChart.day);
  pushNatal('hour', analysis.birthChart.hour);

  // 2) 오늘 일진
  const { stem: todayStem, branch: todayBranch } = computeDayPillar(targetDate, now);
  const todayStemEl = STEM_ELEMENT[todayStem];
  const todayBranchEl = BRANCH_ELEMENT[todayBranch];

  // 3) 오늘 천간의 십성 (일간 기준)
  const dayTenGod: TenGod = calcTenGod(dayMaster, todayStem);
  const category = TEN_GOD_CATEGORY[dayTenGod];

  // 4) 용신/기신 관계 — 오늘 천간 오행이 favorable/unfavorable element에 속하는가
  const ELSET = new Set<Element>(ELEMENTS);
  const favEls = usefulGod.favorable.filter((v): v is Element => ELSET.has(v as Element));
  const unfavEls = usefulGod.unfavorable.filter((v): v is Element => ELSET.has(v as Element));
  const primaryUsefulEl: Element | undefined =
    usefulGod.primaryUseful.type === 'element' ? (usefulGod.primaryUseful.value as Element) : undefined;

  const rel: UseGodRelation =
    favEls.includes(todayStemEl) ? 'boost' : unfavEls.includes(todayStemEl) ? 'drain' : 'neutral';

  // 5) 지지 상호작용
  const interactions: Interaction[] = [];
  for (const n of natalBranches) interactions.push(...interactionsForBranch(todayBranch, n.branch, n.pos));

  // 6) flowLabel
  const flowLabel = decideFlowLabel(rel, category, interactions);

  // 7) 추천 오행 — 오늘이 길하면 그 기운을, 아니면 용신 오행을 생활에서 맞추도록.
  const recommendedEl: Element = rel === 'boost' ? todayStemEl : (primaryUsefulEl ?? todayStemEl);

  // ── evidence (lang-aware) ──────────────────────────────────
  const evidence: DailyFortuneEvidence[] = [];
  evidence.push({
    id: 'ev-day', source: 'dayPillar',
    label: isEn ? "Today's day pillar" : '오늘 일진',
    detail: `${todayStem}${todayBranch} (${elName(todayStemEl)}·${elName(todayBranchEl)})`,
  });
  evidence.push({
    id: 'ev-tengod', source: 'dayTenGod',
    label: isEn ? 'Ten-god vs my day master' : '내 일간 기준 십성',
    detail: isEn
      ? `Day master ${dayMaster}, today's stem ${todayStem} → ${dayTenGod}`
      : `${dayMaster} 일간에 오늘 천간 ${todayStem} → ${dayTenGod}`,
  });
  evidence.push({
    id: 'ev-usegod', source: 'useGodRelation',
    label: isEn ? 'Useful / unfavorable element' : '용신·기신 관계',
    detail: isEn
      ? (rel === 'boost'
          ? `Today's ${elName(todayStemEl)} energy supports you`
          : rel === 'drain'
            ? `Today's ${elName(todayStemEl)} energy is one to spend sparingly`
            : `Today's ${elName(todayStemEl)} energy sits neutrally with your chart`)
      : (rel === 'boost'
          ? `오늘 기운 ${elName(todayStemEl)}은(는) 내게 힘이 되는 오행이에요`
          : rel === 'drain'
            ? `오늘 기운 ${elName(todayStemEl)}은(는) 아껴 써야 하는 오행이에요`
            : `오늘 기운 ${elName(todayStemEl)}은(는) 내 사주와 무난한 관계예요`),
  });
  const interactionIds: string[] = [];
  interactions.forEach((it, i) => {
    const id = `ev-int-${i}`;
    interactionIds.push(id);
    evidence.push({
      id, source: 'branchInteraction',
      label: isEn ? "Today's branch vs natal" : '오늘 지지와 원국 관계',
      detail: isEn
        ? `Today ${todayBranch} ↔ ${POS_EN[it.withPos]} (${KIND_EN[it.kind] ?? it.kind})`
        : `오늘 ${todayBranch} ↔ ${POS_KO[it.withPos]} ${it.name}`,
    });
  });
  const dayBranchClashId =
    interactions.findIndex(i => i.kind === '충' && i.withPos === 'day');
  // ──────────────────────────────────────────────────────────

  const flavor = isEn ? TENGOD_FLAVOR_EN[dayTenGod] : TENGOD_FLAVOR[dayTenGod];
  const flow = isEn ? FLOW_TEMPLATE_EN[flowLabel] : FLOW_TEMPLATE[flowLabel];
  const luckTable = isEn ? LUCK_BY_ELEMENT_EN[recommendedEl] : LUCK_BY_ELEMENT[recommendedEl];

  const goodForEvidence = rel === 'boost' ? ['ev-tengod', 'ev-usegod'] : ['ev-tengod'];
  const goodFor = flavor.good.map(label => ({
    label,
    reason: isEn ? `Fits today's "${flavor.theme}" energy.` : `오늘 들어오는 '${flavor.theme}' 기운에 어울리는 일이에요.`,
    evidenceIds: goodForEvidence,
  }));

  const cautionEvidence: string[] = ['ev-day'];
  if (rel === 'drain') cautionEvidence.push('ev-usegod');
  if (interactionIds.length > 0) cautionEvidence.push(interactionIds[0]);
  const caution = flow.caution.map(label => ({
    label,
    reason: isEn ? "Easy to slip on with today's flow." : `오늘 흐름(${flowLabel})에서 특히 어긋나기 쉬운 부분이에요.`,
    evidenceIds: cautionEvidence,
  }));

  const luckItems: DailyLuckItem[] = luckTable.items.map(label => ({
    label,
    type: 'item' as const,
    reason: isEn
      ? `${elName(recommendedEl)} tones help you sync with today's energy.`
      : `오늘 기운을 생활에서 맞추기 좋은 ${elName(recommendedEl)} 계열이에요.`,
    evidenceIds: ['ev-usegod', 'ev-day'],
  }));

  const report: DailyFortuneV1 = {
    meta: {
      version: 'daily-fortune-v1',
      date: targetDate,
      timezone: SEOUL_TZ,
      dayStemBranch: `${todayStem}${todayBranch}`,
      userDayMaster: dayMaster,
      dayTenGod,
    },
    summary: {
      headline: flow.headline,
      flowLabel,
      shortMessage: flow.shortMessage,
    },
    goodFor,
    caution,
    points: {
      work: { label: isEn ? 'Work' : '일', message: flavor.work, evidenceIds: ['ev-tengod'] },
      money: { label: isEn ? 'Money' : '돈', message: flavor.money, evidenceIds: ['ev-tengod'] },
      relationship: {
        label: isEn ? 'People' : '관계',
        message: flavor.relationship,
        evidenceIds: dayBranchClashId >= 0 ? ['ev-tengod', `ev-int-${dayBranchClashId}`] : ['ev-tengod'],
      },
    },
    luck: {
      items: luckItems,
      colors: luckTable.colors,
      places: luckTable.places,
      routines: luckTable.routines,
    },
    evidence,
    validation: { isValid: true, issues: [] },
  };

  report.validation = validateDailyFortune(report);
  return report;
}
