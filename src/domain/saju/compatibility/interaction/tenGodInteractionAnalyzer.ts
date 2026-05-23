// 십성 상호작용 — 상대가 나에게 어떤 십성처럼 느껴지는지.
// A의 일간 기준 B의 일간이 어떤 십성인지 + 보조 (B의 가장 강한 십성을 A가 어떻게 받는지).

import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';
import type { TenGodInteractionAnalysis, TenGodFeelKind } from '../compatibilityTypes';
import type { HeavenlyStem } from '../../rules/heavenlyStems';
import { calcTenGod } from '../../rules/tenGods';
import type { TenGod } from '../../report/sajuReportSchema';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
}

const TG_TO_FEEL: Record<TenGod, TenGodFeelKind> = {
  비견: 'peer-mirror', 겁재: 'peer-mirror',
  식신: 'expression-spark', 상관: 'expression-spark',
  편재: 'wealth-realism', 정재: 'wealth-realism',
  편관: 'authority-pressure', 정관: 'authority-pressure',
  편인: 'support-shelter', 정인: 'support-shelter',
};

const FEEL_DESCRIPTION: Record<TenGodFeelKind, string> = {
  'authority-pressure': '책임·기준·평가받는 느낌',
  'expression-spark':   '즐거움·표현·자극·잔소리가 같이 따라오는 결',
  'wealth-realism':     '현실감·소유욕·돈과 얽힌 결',
  'support-shelter':    '위로·보호·배움·의존감이 있는 결',
  'peer-mirror':        '친구·동료·경쟁자·닮은 사람의 결',
};

export function analyzeTenGodInteraction({ personA, personB }: Args): TenGodInteractionAnalysis {
  const aStem = personA.birthChart.dayMaster as HeavenlyStem;
  const bStem = personB.birthChart.dayMaster as HeavenlyStem;

  // 1차 — 상대 일간이 내 기준 어떤 십성인가
  const bTenGodFromA = calcTenGod(aStem, bStem);
  const aTenGodFromB = calcTenGod(bStem, aStem);

  const aFeelsBAs: TenGodFeelKind[] = [TG_TO_FEEL[bTenGodFromA]];
  const bFeelsAAs: TenGodFeelKind[] = [TG_TO_FEEL[aTenGodFromB]];

  // 2차 — 상대의 가장 강한 십성도 결에 영향. (보조 — 일관성이 너무 강한 경우만 추가)
  const bDominantTg = (personB.coreAnalysis.tenGods.strongest[0] ?? null) as TenGod | null;
  const aDominantTg = (personA.coreAnalysis.tenGods.strongest[0] ?? null) as TenGod | null;
  if (bDominantTg && TG_TO_FEEL[bDominantTg] !== aFeelsBAs[0]) {
    aFeelsBAs.push(TG_TO_FEEL[bDominantTg]);
  }
  if (aDominantTg && TG_TO_FEEL[aDominantTg] !== bFeelsAAs[0]) {
    bFeelsAAs.push(TG_TO_FEEL[aDominantTg]);
  }

  const evidence: string[] = [
    `A 기준 B는 ${bTenGodFromA} — ${FEEL_DESCRIPTION[aFeelsBAs[0]]}`,
    `B 기준 A는 ${aTenGodFromB} — ${FEEL_DESCRIPTION[bFeelsAAs[0]]}`,
  ];
  if (bDominantTg) evidence.push(`B의 가장 강한 십성: ${bDominantTg}`);
  if (aDominantTg) evidence.push(`A의 가장 강한 십성: ${aDominantTg}`);

  // 매력 포인트 / 압박 포인트 — 십성별 묶음
  const attractionPoints: string[] = [];
  const pressurePoints: string[] = [];

  for (const feel of aFeelsBAs) {
    switch (feel) {
      case 'authority-pressure':
        attractionPoints.push('A 입장에서 B의 책임감·기준이 신뢰감으로 느껴짐');
        pressurePoints.push('A 입장에서 B가 평가하는 듯 느껴지면 위축될 수 있음');
        break;
      case 'expression-spark':
        attractionPoints.push('A 입장에서 B의 표현력·아이디어가 자극·즐거움으로 느껴짐');
        pressurePoints.push('A 입장에서 B의 표현이 잔소리·간섭으로 느껴질 수 있음');
        break;
      case 'wealth-realism':
        attractionPoints.push('A 입장에서 B의 현실감·생활 감각이 안정감으로 느껴짐');
        pressurePoints.push('A 입장에서 돈·소유 이슈가 자주 부각될 수 있음');
        break;
      case 'support-shelter':
        attractionPoints.push('A 입장에서 B가 위로·보호처럼 느껴짐');
        pressurePoints.push('A 입장에서 B에게 기대다가 의존이 깊어질 위험');
        break;
      case 'peer-mirror':
        attractionPoints.push('A 입장에서 B가 친구·동료처럼 편안함');
        pressurePoints.push('A 입장에서 B와 비교·경쟁 감정이 생길 수 있음');
        break;
    }
  }
  for (const feel of bFeelsAAs) {
    switch (feel) {
      case 'authority-pressure':
        attractionPoints.push('B 입장에서 A의 기준·책임감이 안정감으로 느껴짐');
        pressurePoints.push('B 입장에서 A가 통제하는 느낌으로 다가올 수 있음');
        break;
      case 'expression-spark':
        attractionPoints.push('B 입장에서 A의 표현·아이디어가 활력처럼 느껴짐');
        pressurePoints.push('B 입장에서 A가 말이 많거나 간섭으로 느껴질 수 있음');
        break;
      case 'wealth-realism':
        attractionPoints.push('B 입장에서 A의 현실감이 매력으로 느껴짐');
        pressurePoints.push('B 입장에서 돈·소유 문제가 잦아질 수 있음');
        break;
      case 'support-shelter':
        attractionPoints.push('B 입장에서 A가 위로·보호처럼 느껴짐');
        pressurePoints.push('B 입장에서 A에게 기대다가 의존이 깊어질 수 있음');
        break;
      case 'peer-mirror':
        attractionPoints.push('B 입장에서 A가 친구·동료처럼 편안함');
        pressurePoints.push('B 입장에서 비교·경쟁 감정이 생길 수 있음');
        break;
    }
  }

  return {
    aFeelsBAs: dedupe(aFeelsBAs),
    bFeelsAAs: dedupe(bFeelsAAs),
    attractionPoints: dedupe(attractionPoints).slice(0, 4),
    pressurePoints: dedupe(pressurePoints).slice(0, 4),
    evidence,
  };
}

function dedupe<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }
