// 회복 레이어 — 싸운 뒤 어떻게 풀리는가.

import type {
  RecoveryAnalysis, TenGodInteractionAnalysis, ConflictAnalysis, RelationshipType,
} from '../compatibilityTypes';
import type { PersonalSajuGptInput } from '../../report/sajuReportSchema';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
  tenGodInteraction: TenGodInteractionAnalysis;
  conflictAnalysis: ConflictAnalysis;
  relationshipType: RelationshipType;
}

export function analyzeRecovery(args: Args): RecoveryAnalysis {
  const { personA, personB, relationshipType, conflictAnalysis } = args;

  // 회복 신호 — 인성 강하면 시간이 필요, 식상 강하면 말로 푸는 편, 비겁 강하면 자기 주장 후 회복
  const profile = (p: PersonalSajuGptInput) => {
    const sup = p.coreAnalysis.tenGods.totals['정인'] + p.coreAnalysis.tenGods.totals['편인'];
    const out = p.coreAnalysis.tenGods.totals['식신'] + p.coreAnalysis.tenGods.totals['상관'];
    const self = p.coreAnalysis.tenGods.totals['비견'] + p.coreAnalysis.tenGods.totals['겁재'];
    const auth = p.coreAnalysis.tenGods.totals['정관'] + p.coreAnalysis.tenGods.totals['편관'];
    if (sup >= 1.5 && sup >= out) return 'needs-time';
    if (out >= 1.5) return 'needs-to-talk';
    if (self >= 1.5) return 'needs-distance-then-talk';
    if (auth >= 1.5) return 'needs-rule-confirmation';
    return 'mixed';
  };
  const aP = profile(personA);
  const bP = profile(personB);

  const profileToText = (k: ReturnType<typeof profile>): string => {
    switch (k) {
      case 'needs-time':              return '시간을 두고 혼자 정리해야 마음이 풀리는 쪽';
      case 'needs-to-talk':           return '바로 말로 확인하고 표현해야 풀리는 쪽';
      case 'needs-distance-then-talk':return '잠깐 거리를 둔 뒤 자기 페이스로 돌아와 대화하는 쪽';
      case 'needs-rule-confirmation': return '같은 일이 반복되지 않도록 규칙·기준이 확인되어야 풀리는 쪽';
      case 'mixed':                   return '상황에 따라 회복 방식이 달라지는 쪽';
    }
  };

  const whatAUsuallyNeeds = profileToText(aP);
  const whatBUsuallyNeeds = profileToText(bP);

  const likelyRecoveryPattern = (() => {
    if (aP === bP) {
      return `두 사람 모두 ${whatAUsuallyNeeds} — 같은 방식이라 빠르게 풀릴 수도, 한쪽이 닫히면 같이 닫혀버릴 수도 있어요.`;
    }
    return `${whatAUsuallyNeeds}(A)와 ${whatBUsuallyNeeds}(B)가 만나는 결이라, 싸운 직후 행동 방향이 어긋나기 쉬운 편이에요.`;
  })();

  const bestRecoveryRule = (() => {
    if (aP === 'needs-time' || bP === 'needs-time') {
      return '싸운 직후에는 결론내지 말고, 정해진 시간(예: 24시간) 뒤에 다시 이야기하는 룰을 정해두기.';
    }
    if (aP === 'needs-to-talk' && bP === 'needs-to-talk') {
      return '바로 말로 풀되, "감정 → 사실 → 다음에 어떻게 할지" 3단계로 정리하는 룰을 정해두기.';
    }
    if (aP === 'needs-rule-confirmation' || bP === 'needs-rule-confirmation') {
      return '사과보다 같은 상황이 반복되지 않도록 작은 규칙을 함께 만들기.';
    }
    return '갈등이 일어난 다음 날 짧은 메모로 "내가 받았던 감정 / 상대가 받았을 감정" 두 줄을 공유해보기.';
  })();

  void conflictAnalysis; void relationshipType;

  return {
    likelyRecoveryPattern,
    whatAUsuallyNeeds,
    whatBUsuallyNeeds,
    bestRecoveryRule,
    evidence: [
      `A 십성 프로필: ${aP}`,
      `B 십성 프로필: ${bP}`,
    ],
  };
}
