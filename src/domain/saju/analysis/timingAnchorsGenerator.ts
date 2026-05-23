// 타이밍 앵커 (과거 회고형 — 가볍게).
// 독립 섹션으로 크게 만들지 않고, 필요한 곳에서 짧게 녹이는 용도.
// 단정 절대 금지: "이사를 했다" → X / "자리가 바뀌는 흐름이었을 수 있다" → O

import type { FourPillars } from '../calendar/pillarCalculator';
import type { FortuneCycleResult } from '../calendar/fortuneCycleCalculator';
import type {
  TimingAnchor, TimingEventType, TenGodAnalysis,
  UsefulGodAnalysis, SpecialPoint,
} from '../report/sajuReportSchema';
import type { UserContext } from '../calendar/normalizeBirthInput';
import { calcTenGod } from '../rules/tenGods';
import { STEM_ELEMENT, BRANCH_ELEMENT, type Element } from '../rules/elements';
import { BRANCH_CONFLICTS } from '../rules/conflicts';
import { yearToPillar } from '../calendar/fortuneCycleCalculator';

interface Args {
  pillars: FourPillars;
  cycles: FortuneCycleResult;
  tenGods: TenGodAnalysis;
  usefulGod: UsefulGodAnalysis;
  specialPoints: SpecialPoint[];
  userContext: UserContext;
  currentYear?: number;
  birthYear: number;
}

export function generateTimingAnchors(args: Args): TimingAnchor[] {
  const { pillars, cycles, usefulGod, userContext, birthYear } = args;
  const currentYear = args.currentYear ?? new Date().getFullYear();
  const currentAge = currentYear - birthYear;
  const dm = pillars.dayMaster;
  const usefulEl = usefulGod.primaryUseful.value as Element;
  const kiEl = usefulGod.unfavorable[0] as Element | undefined;

  const anchors: TimingAnchor[] = [];

  // ── 1. 과거 대운 전환점 (현재보다 이전 대운) ──
  const pastDaewoon = cycles.daewoonList.filter(d => d.startAge < currentAge && d.startAge >= 8);
  for (const d of pastDaewoon.slice(-3)) {
    // 가장 최근 3개 과거 대운 전환점만
    if (d.index === 1 && currentAge < 18) continue; // 초년 대운은 의미 약함
    const stemEl = STEM_ELEMENT[d.stem];
    const branchEl = BRANCH_ELEMENT[d.branch];
    const tg = calcTenGod(dm, d.stem);
    const transYear = birthYear + Math.floor(d.startAge);
    const eventTypes = inferEventTypesFromDaewoon(tg, stemEl, branchEl, usefulEl, kiEl);
    if (eventTypes.length === 0) continue;

    anchors.push({
      year: transYear,
      age: Math.floor(d.startAge),
      title: titleForDaewoonTransition(tg, eventTypes),
      eventTypes,
      possibleManifestations: manifestationsForEventTypes(eventTypes),
      confidence: stemEl === usefulEl || stemEl === kiEl ? 'medium' : 'low',
      evidence: [`${d.pillarKo} 대운 시작 (만 ${d.startAge}세 무렵) — ${tg} 대운`],
      tone: 'light-touch',
    });
  }

  // ── 2. 과거 세운 — 원국 일지/월지 충이 있었던 해 (최근 5년) ──
  const yearRange = 5;
  const dayBranch = pillars.day.branch;
  const monthBranch = pillars.month.branch;
  for (let y = currentYear - yearRange; y < currentYear; y++) {
    if (y - birthYear < 15) continue; // 어린 시절 제외
    const sy = yearToPillar(y);
    const isConflictDay = BRANCH_CONFLICTS.some(([a, b]) =>
      (a === dayBranch && b === sy.branch) || (a === sy.branch && b === dayBranch)
    );
    const isConflictMonth = BRANCH_CONFLICTS.some(([a, b]) =>
      (a === monthBranch && b === sy.branch) || (a === sy.branch && b === monthBranch)
    );
    if (!isConflictDay && !isConflictMonth) continue;

    const eventTypes: TimingEventType[] = isConflictMonth
      ? ['career-change', 'move']
      : ['identity-shift', 'relationship-change'];

    anchors.push({
      year: y,
      age: y - birthYear,
      title: '내가 머무는 판이 흔들렸을 수 있는 해',
      eventTypes,
      possibleManifestations: manifestationsForEventTypes(eventTypes),
      confidence: 'low',
      evidence: [`${y}년 세운 ${sy.stem}${sy.branch} — 원국 ${isConflictMonth ? '월지' : '일지'}와 충`],
      tone: 'light-touch',
    });
  }

  // ── 3. 가족·초년 흔적 (15세 이전) — 사용자 컨텍스트에 family가 있을 때만 ──
  if (userContext.currentConcerns.includes('family')) {
    const firstDaewoon = cycles.daewoonList[0];
    if (firstDaewoon) {
      anchors.push({
        age: Math.floor(firstDaewoon.startAge),
        title: '성격이 자리 잡히던 초년 시기',
        eventTypes: ['family-issue', 'identity-shift'],
        possibleManifestations: [
          '가족 안에서 일찍 책임을 떠안았을 가능성',
          '주변 환경이 자주 바뀌었거나, 의지할 사람이 자주 바뀌었을 가능성',
          '혼자 결정해야 하는 상황이 많았을 가능성',
        ],
        confidence: 'low',
        evidence: ['첫 대운 흐름 — 어린 시절 환경의 결'],
        tone: 'light-touch',
      });
    }
  }

  // 시간순 정렬, 최대 4개
  return anchors
    .sort((a, b) => (a.year ?? 0) - (b.year ?? 0))
    .slice(0, 4);
}

function inferEventTypesFromDaewoon(
  tg: string, stemEl: Element, branchEl: Element, usefulEl: Element, kiEl?: Element,
): TimingEventType[] {
  const out: TimingEventType[] = [];
  if (tg === '편관' || tg === '정관') out.push('career-change');
  if (tg === '편재' || tg === '정재') out.push('money-change', 'career-change');
  if (tg === '식신' || tg === '상관') out.push('identity-shift', 'social-expansion');
  if (tg === '정인' || tg === '편인') out.push('study-exam', 'identity-shift');
  if (tg === '비견' || tg === '겁재') out.push('relationship-change');
  if (stemEl === usefulEl || branchEl === usefulEl) out.push('achievement');
  if (kiEl && (stemEl === kiEl || branchEl === kiEl)) out.push('conflict');
  return Array.from(new Set(out));
}

function titleForDaewoonTransition(tg: string, types: TimingEventType[]): string {
  if (types.includes('career-change')) return '일·역할의 판이 바뀌었을 수 있는 시기';
  if (types.includes('identity-shift')) return '내가 어떤 사람인지 다시 정의했을 수 있는 시기';
  if (types.includes('study-exam')) return '배우거나 자격을 다지던 시기';
  if (types.includes('money-change')) return '돈의 흐름이 출렁였을 수 있는 시기';
  return `${tg} 흐름이 강해진 시기`;
}

function manifestationsForEventTypes(types: TimingEventType[]): string[] {
  const set = new Set<string>();
  for (const t of types) {
    switch (t) {
      case 'move':
        set.add('이사·생활권 변화로 머무는 자리가 달라졌을 수 있어요'); break;
      case 'career-change':
        set.add('이직·부서 이동·역할 변경 같은 일의 판 변화가 있었을 수 있어요'); break;
      case 'relationship-change':
        set.add('가까운 관계가 정리되거나 새로 시작됐을 수 있어요'); break;
      case 'family-issue':
        set.add('가족 안에서 책임이 커지거나 갈등이 드러났을 수 있어요'); break;
      case 'study-exam':
        set.add('공부·자격·시험처럼 정리해야 할 학습이 많았을 수 있어요'); break;
      case 'money-change':
        set.add('수입 구조가 바뀌거나, 큰 지출·수입이 한꺼번에 있었을 수 있어요'); break;
      case 'identity-shift':
        set.add('내가 어떤 사람인지에 대한 정의가 바뀌었을 수 있어요'); break;
      case 'social-expansion':
        set.add('만나는 사람의 폭이 갑자기 넓어졌을 수 있어요'); break;
      case 'isolation':
        set.add('관계를 줄이고 혼자 정리하는 시기였을 수 있어요'); break;
      case 'achievement':
        set.add('그간 쌓인 것이 결과물·인정으로 드러난 시기였을 수 있어요'); break;
      case 'conflict':
        set.add('의도와 다른 마찰·갈등이 잦았을 수 있어요'); break;
    }
  }
  return Array.from(set);
}
