// 두 사람의 일지(배우자궁) 관계 — 합/충/형/파/해.

import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';
import type {
  SpousePalaceRelationAnalysis, BranchRelationKind,
} from '../compatibilityTypes';
import type { EarthlyBranch } from '../../rules/earthlyBranches';
import { BRANCH_CONFLICTS, BRANCH_PUNISHMENTS, BRANCH_DESTRUCTIONS, BRANCH_HARMS } from '../../rules/conflicts';
import { BRANCH_SIX, BRANCH_HALF } from '../../rules/combinations';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
}

function dayBranch(person: PersonalSajuGptInput): EarthlyBranch {
  return person.birthChart.day.slice(-1) as EarthlyBranch;
}

export function analyzeSpousePalaceRelation({ personA, personB }: Args): SpousePalaceRelationAnalysis {
  const a = dayBranch(personA);
  const b = dayBranch(personB);
  const types: BranchRelationKind[] = [];
  const evidence: string[] = [`A 일지 ${a}, B 일지 ${b}`];

  // 같으면 신·같음 (자형 가능)
  if (a === b) {
    const punishment = BRANCH_PUNISHMENTS.find(p => p.subtype === '자형' && p.branches[0] === a);
    if (punishment) {
      types.push('punishment');
      evidence.push(`${punishment.name}`);
    }
  }

  // 육합
  const six = BRANCH_SIX.find(s =>
    (s.pair[0] === a && s.pair[1] === b) || (s.pair[1] === a && s.pair[0] === b)
  );
  if (six) {
    types.push('six-harmony');
    evidence.push(`${six.name} (육합)`);
  }

  // 반합 (삼합 일부)
  const half = BRANCH_HALF.find(h =>
    (h.pair[0] === a && h.pair[1] === b) || (h.pair[1] === a && h.pair[0] === b)
  );
  if (half) {
    types.push('three-harmony');
    evidence.push(`${half.name} (반합)`);
  }

  // 충
  if (BRANCH_CONFLICTS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
    types.push('conflict');
    evidence.push(`${a}${b} 충`);
  }

  // 형 (2글자만 매칭)
  for (const p of BRANCH_PUNISHMENTS) {
    if (p.subtype === '자형') continue;
    const set = new Set(p.branches);
    if (set.has(a) && set.has(b) && a !== b) {
      types.push('punishment');
      evidence.push(p.name);
      break;
    }
  }

  // 파
  if (BRANCH_DESTRUCTIONS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
    types.push('destruction');
    evidence.push(`${a}${b} 파`);
  }

  // 해
  if (BRANCH_HARMS.some(([x, y]) => (x === a && y === b) || (x === b && y === a))) {
    types.push('harm');
    evidence.push(`${a}${b} 해`);
  }

  if (types.length === 0) types.push('none');

  // 강도 — 충/형 ≥1이면 high, 합만 있으면 medium, none이면 low
  const hasHard = types.some(t => t === 'conflict' || t === 'punishment');
  const hasSoft = types.some(t => t === 'six-harmony' || t === 'three-harmony');
  const intensity: SpousePalaceRelationAnalysis['intensity'] =
    hasHard ? 'high' : hasSoft ? 'medium' : 'low';

  // 끌림/충돌 효과 — relationship-agnostic, 관계 유형별 해석은 상위 레이어에서.
  const attractionEffect = (() => {
    if (types.includes('six-harmony') || types.includes('three-harmony')) {
      return '익숙함과 묶임의 느낌이 강한 결 — 같이 있으면 자연스럽게 자리잡히는 분위기예요.';
    }
    if (types.includes('conflict')) {
      return '강한 자극·끌림이 같이 따라오는 결 — 처음부터 의식되지만 결이 다른 끌림입니다.';
    }
    if (types.includes('punishment')) {
      return '예민한 결을 서로 건드리는 끌림 — 신경 쓰이지만 늘 가깝게 두기에는 피로가 있을 수 있어요.';
    }
    return '강한 일지 작용은 약한 편 — 끌림은 다른 요소(오행 보완·십성·매력 포인트)에서 결정되는 결이에요.';
  })();

  const conflictEffect = (() => {
    if (types.includes('conflict')) {
      return '가까워질수록 생활 리듬·표현 방식 차이로 충돌이 반복되기 쉬워요.';
    }
    if (types.includes('punishment')) {
      return '말투·디테일·반복되는 디테일에서 미묘한 불편감이 누적될 수 있어요.';
    }
    if (types.includes('harm') || types.includes('destruction')) {
      return '겉으로 큰 갈등은 아니어도 기대 어긋남·서운함이 쌓이는 결입니다.';
    }
    if (types.includes('six-harmony') || types.includes('three-harmony')) {
      return '큰 충돌보다 익숙함에 따른 권태·표현 부족이 더 큰 위험이에요.';
    }
    return '강한 일지 마찰은 약한 편 — 갈등은 다른 요소(말투·생활 패턴·외부 환경)에서 시작될 수 있어요.';
  })();

  return {
    relationTypes: types,
    intensity,
    attractionEffect,
    conflictEffect,
    evidence,
  };
}
