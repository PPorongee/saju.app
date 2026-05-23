// 앞으로 3년 시기 분석.
// 세운 + 대운 + 용신/기신 + 원국 충합을 결합해서
// 연도별 키워드, 가능 사건, 잡아야 할 행동, 피해야 할 행동을 출력.

import type { FourPillars } from '../calendar/pillarCalculator';
import type { FortuneCycleResult } from '../calendar/fortuneCycleCalculator';
import type {
  FutureTimingAnalysis, FutureTimingYearInfo, FutureTimingTheme,
  TenGodAnalysis, UsefulGodAnalysis, SpecialPoint,
} from '../report/sajuReportSchema';
import { calcTenGod } from '../rules/tenGods';
import { STEM_ELEMENT, BRANCH_ELEMENT, type Element } from '../rules/elements';
import { BRANCH_CONFLICTS } from '../rules/conflicts';
import { BRANCH_SIX } from '../rules/combinations';

interface Args {
  pillars: FourPillars;
  cycles: FortuneCycleResult;
  tenGods: TenGodAnalysis;
  usefulGod: UsefulGodAnalysis;
  specialPoints: SpecialPoint[];
  birthYear: number;
}

export function analyzeFutureTiming(args: Args): FutureTimingAnalysis {
  const { pillars, cycles, usefulGod, specialPoints, birthYear } = args;
  const dm = pillars.dayMaster;
  const usefulEl = usefulGod.primaryUseful.value as Element;
  const kiEl = usefulGod.unfavorable[0] as Element | undefined;
  const cd = cycles.currentDaewoon;

  const years: FutureTimingYearInfo[] = cycles.nextThreeYears.map(sy => {
    const stemEl = STEM_ELEMENT[sy.stem];
    const branchEl = BRANCH_ELEMENT[sy.branch];
    const stemTg = calcTenGod(dm, sy.stem);
    const themes: FutureTimingTheme[] = themesFromTenGod(stemTg);
    const possibleEvents: string[] = [];
    const bestActions: string[] = [];
    const avoidActions: string[] = [];
    const evidence: string[] = [
      `${sy.year}년 세운 ${sy.pillarKo} — 천간 ${sy.stem}(${stemTg}), 지지 ${sy.branch}(${branchEl})`,
      `현재 대운 ${cd.pillarKo} 안에서의 흐름`,
    ];

    // 원국 충 검사
    const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch];
    if (pillars.hour) branches.push(pillars.hour.branch);
    const conflictBranches = branches.filter(b =>
      BRANCH_CONFLICTS.some(([x, y]) => (x === b && y === sy.branch) || (x === sy.branch && y === b))
    );
    const harmonyBranches = branches.filter(b =>
      BRANCH_SIX.some(c => (c.pair[0] === b && c.pair[1] === sy.branch) || (c.pair[1] === b && c.pair[0] === sy.branch))
    );

    if (conflictBranches.length > 0) {
      themes.push('move');
      possibleEvents.push('이사·이직·부서 이동·생활권 변화처럼 머무는 자리가 바뀌는 흐름이 있을 수 있어요');
      avoidActions.push('불안하다는 이유로 이미 작아진 자리에 그대로 머무는 선택');
      bestActions.push('바뀌는 흐름 안에서 새 환경의 역할을 먼저 잡기');
      evidence.push(`원국 ${conflictBranches.join('·')} ↔ 세운 ${sy.branch} 충`);
    }
    if (harmonyBranches.length > 0) {
      possibleEvents.push('관계·협업·소개가 자연스럽게 연결될 수 있는 흐름');
      bestActions.push('도움 요청·소개 부탁을 평소보다 먼저 꺼내기');
      evidence.push(`원국 ${harmonyBranches.join('·')} ↔ 세운 ${sy.branch} 육합`);
    }

    // 용신·기신 체크
    if (stemEl === usefulEl || branchEl === usefulEl) {
      themes.push('career', 'self-branding');
      possibleEvents.push(`잠재력이 외부 결과로 나오기 쉬운 해 (용신 ${usefulEl} 들어옴)`);
      bestActions.push('포트폴리오·제안서·자격증처럼 외부 평가가 가능한 결과물 만들기');
      evidence.push(`용신 ${usefulEl} 들어옴`);
    }
    if (kiEl && (stemEl === kiEl || branchEl === kiEl)) {
      possibleEvents.push(`무리한 확장·과부하·결정 미루기가 생기기 쉬운 해 (기신 ${kiEl})`);
      avoidActions.push(`${kiEl} 영역으로 에너지·돈을 한꺼번에 몰지 않기`);
      evidence.push(`기신 ${kiEl} 들어옴`);
    }

    // 십성 기반 세부 조언
    const careerAdvice = adviceCareer(stemTg);
    const moneyAdvice = adviceMoney(stemTg);
    const relAdvice = adviceRelationship(stemTg);

    // 십성 themes에 따른 기본 행동
    if (stemTg === '편관' || stemTg === '정관') {
      themes.push('responsibility', 'career');
      bestActions.push('새 책임을 맡을 땐 권한·범위·지원 인력을 먼저 명문화');
      avoidActions.push('책임 범위를 두루뭉술하게 시작해서 혼자 다 떠안는 패턴');
    }
    if (stemTg === '편재' || stemTg === '정재') {
      themes.push('money');
      bestActions.push('수입 채널을 한 곳에 몰지 말고 작게 분산해서 굴리기');
      avoidActions.push('큰 자금을 검증 없이 한 번에 옮기는 결정');
    }
    if (stemTg === '식신' || stemTg === '상관') {
      themes.push('self-branding', 'business');
      bestActions.push('완성도 70% 결과물을 먼저 공개하고 피드백으로 다듬기');
      avoidActions.push('완벽해질 때까지 공개를 미루는 패턴');
    }
    if (stemTg === '정인' || stemTg === '편인') {
      themes.push('study');
      bestActions.push('학습한 것을 강의·문서·콘텐츠 형태로 외화');
      avoidActions.push('인풋만 늘리고 산출이 없는 무한 학습 루프');
    }
    if (stemTg === '비견' || stemTg === '겁재') {
      themes.push('relationship', 'self-branding');
      bestActions.push('비슷한 결의 동료와 작은 협업·공동 작업 시도');
      avoidActions.push('혼자 다 짊어지거나, 동료를 경쟁자로만 보는 태도');
    }

    // 특별 포인트 가산 — 역마/도화 등
    if (specialPoints.some(p => p.id === 'yeokMaMovement') && conflictBranches.length > 0) {
      possibleEvents.push('역마 + 충 — 이동·이사·출장처럼 물리적 변화 가능성이 더 커요');
    }
    if (specialPoints.some(p => p.id === 'cheoneulStrong') && harmonyBranches.length > 0) {
      possibleEvents.push('천을귀인 + 육합 — 막힌 일이 사람·정보·소개로 풀릴 흐름');
    }

    return {
      year: sy.year,
      age: sy.year - birthYear,
      pillar: sy.pillarKo,
      headline: headlineForYear(themes, conflictBranches.length > 0),
      strongestThemes: dedupeThemes(themes).slice(0, 4),
      possibleEvents: dedupeStrings(possibleEvents).slice(0, 4),
      bestActions: dedupeStrings(bestActions).slice(0, 4),
      avoidActions: dedupeStrings(avoidActions).slice(0, 4),
      careerAdvice,
      moneyAdvice,
      relationshipAdvice: relAdvice,
      confidence: confidenceForYear(stemEl, branchEl, usefulEl, kiEl, conflictBranches.length),
      evidence,
    };
  });

  return { years };
}

function themesFromTenGod(tg: string): FutureTimingTheme[] {
  const map: Record<string, FutureTimingTheme[]> = {
    비견: ['relationship', 'self-branding'],
    겁재: ['relationship', 'money'],
    식신: ['self-branding', 'rest'],
    상관: ['self-branding', 'business'],
    편재: ['money', 'business'],
    정재: ['money', 'family'],
    편관: ['responsibility', 'career'],
    정관: ['career', 'responsibility'],
    편인: ['study'],
    정인: ['study'],
  };
  return map[tg] ?? [];
}

function adviceCareer(tg: string): string {
  const map: Record<string, string> = {
    편관: '책임이 커지는 해 — 권한·지원 인력·평가 기준을 먼저 합의한 뒤 받기',
    정관: '직책·인정의 기회가 열리는 해 — 자격·자료를 정리해 외부로 드러내기',
    편재: '큰 거래·신사업 제안이 오는 해 — 작은 단위로 검증하고 본 거래로',
    정재: '안정 수익·연차 단가가 오르는 해 — 계약·정산 기준을 명문화',
    식신: '결과물 공개가 잘 통하는 해 — 작은 결과물부터 먼저 외부로',
    상관: '기존 틀을 흔드는 시도가 효과 보는 해 — 단, 조직 안 합의 챙기기',
    정인: '학습·자격이 자산으로 누적되는 해 — 학습 결과를 외부 산출로',
    편인: '독창적 통찰이 통하는 해 — 결과물 정리로 자기 신뢰 강화',
    비견: '동료·협업이 자산이 되는 해 — 비슷한 결의 사람과 작은 공동 작업',
    겁재: '경쟁이 강해지는 해 — 자기 차별점을 분명히 드러내기',
  };
  return map[tg] ?? '';
}

function adviceMoney(tg: string): string {
  const map: Record<string, string> = {
    편재: '큰 흐름의 기회 — 단, 한 번에 큰 자금 이동은 위험. 작게 분산',
    정재: '꾸준한 단가 상승 — 가격표·계약 기준을 먼저 정비',
    식신: '만든 결과물이 돈으로 연결될 수 있는 해 — 무료로 풀던 가치에 가격표 붙이기',
    상관: '돌파형 수익 가능 — 단, 변동성 있는 채널은 회수 기간을 짧게',
    겁재: '돈이 새기 쉬운 해 — 비용·지출·계약 기준을 한 번 더 점검',
    편관: '책임 단가는 오르되 부담도 커지는 해 — 거절·조정 기준 명확히',
    정관: '안정 수익 구간 — 큰 모험보다 누적·연차 강화에 집중',
  };
  return map[tg] ?? '';
}

function adviceRelationship(tg: string): string {
  const map: Record<string, string> = {
    정관: '신뢰·약속이 잘 통하는 해 — 책임 있는 관계 다지기 좋음',
    편관: '책임감 큰 관계가 들어오는 해 — 부담은 분명히 말로 표현',
    겁재: '경쟁·갈등이 잦아질 수 있는 해 — 기준을 부드럽게 먼저 말하기',
    식신: '편안한 관계가 잘 통하는 해 — 가벼운 만남을 즐기기',
    상관: '말로 인한 마찰 주의 — 표현 강도를 한 박자 줄이기',
    정재: '안정적 관계가 좋아지는 해 — 약속을 지키는 작은 디테일 챙기기',
    편재: '새로운 사람·기회 만남이 늘어남 — 모든 만남에 에너지 쏟지 말기',
  };
  return map[tg] ?? '';
}

function headlineForYear(themes: FutureTimingTheme[], hasConflict: boolean): string {
  if (hasConflict) return '자리가 바뀌는 흐름';
  if (themes.includes('money')) return '돈의 흐름이 움직이는 해';
  if (themes.includes('career')) return '일의 판이 정리되는 해';
  if (themes.includes('study')) return '학습·자격이 누적되는 해';
  if (themes.includes('self-branding')) return '내 결과물이 드러나는 해';
  if (themes.includes('relationship')) return '관계의 결이 정리되는 해';
  if (themes.includes('responsibility')) return '책임이 커지는 해';
  return '잔잔하게 다지는 해';
}

function confidenceForYear(stemEl: Element, branchEl: Element, useful: Element, ki?: Element, conflicts = 0): 'high' | 'medium' | 'low' {
  let score = 0;
  if (stemEl === useful || branchEl === useful) score += 2;
  if (ki && (stemEl === ki || branchEl === ki)) score += 2;
  if (conflicts > 0) score += 1;
  if (score >= 3) return 'high';
  if (score >= 1) return 'medium';
  return 'low';
}

function dedupeThemes(themes: FutureTimingTheme[]): FutureTimingTheme[] {
  return Array.from(new Set(themes));
}
function dedupeStrings(arr: string[]): string[] {
  return Array.from(new Set(arr));
}
