// 타이밍 레이어 — 앞으로 3년, 관계 흐름.
// 두 사람의 세운/대운이 동시에 어떤 자극을 받는지 결합.

import type {
  RelationshipYearFlow, RelationshipEventType, RelationshipType,
} from '../compatibilityTypes';
import type { PersonalSajuGptInput, FortuneCycleInfo } from '../../report/sajuReportSchema';

interface Args {
  personA: PersonalSajuGptInput;
  personB: PersonalSajuGptInput;
  relationshipType: RelationshipType;
}

export function analyzeRelationshipTiming(args: Args): RelationshipYearFlow[] {
  const { personA, personB, relationshipType } = args;
  const aYears = personA.fortune.nextThreeYears;
  const bYears = personB.fortune.nextThreeYears;
  const len = Math.min(aYears.length, bYears.length);
  const out: RelationshipYearFlow[] = [];

  for (let i = 0; i < len; i++) {
    const ay = aYears[i];
    const by = bYears[i];
    if (ay.year !== by.year) continue; // 같은 해만

    const aRisks = ay.risks.length;
    const bRisks = by.risks.length;
    const aOpp   = ay.opportunities.length;
    const bOpp   = by.opportunities.length;

    const events: RelationshipEventType[] = [];
    if (aOpp + bOpp >= 2) events.push('closer');
    if (aRisks + bRisks >= 2) events.push('turning-point');
    if (aRisks >= 2 || bRisks >= 2) events.push('decision-needed');
    if (aOpp === 0 && bOpp === 0 && aRisks + bRisks >= 1) events.push('cooling');
    if (relationshipType === 'reunion_or_breakup' && events.includes('closer')) {
      events.push('reconnect-possible');
    }
    if (aOpp + bOpp + aRisks + bRisks === 0) events.push('distance');

    // 이동/생활 변화 — relation/risks 텍스트에 '이동'·'충' 키워드가 있으면
    const allText = [...ay.risks, ...ay.opportunities, ...by.risks, ...by.opportunities].join(' ');
    if (/충|이동|변동/.test(allText)) events.push('move-or-life-change');

    const theme = themeFor(events, relationshipType);
    const opportunity = makeOpportunity(events, relationshipType);
    const caution = makeCaution(events, relationshipType);
    const advice = makeAdvice(events, relationshipType);

    out.push({
      year: ay.year,
      theme,
      relationshipEventTypes: dedupe(events).slice(0, 4),
      opportunity,
      caution,
      advice,
      evidence: [
        `A ${ay.year} ${ay.pillar}: ${ay.theme}${ay.risks.length ? ' / 위험: ' + ay.risks.join('·') : ''}${ay.opportunities.length ? ' / 기회: ' + ay.opportunities.join('·') : ''}`,
        `B ${by.year} ${by.pillar}: ${by.theme}${by.risks.length ? ' / 위험: ' + by.risks.join('·') : ''}${by.opportunities.length ? ' / 기회: ' + by.opportunities.join('·') : ''}`,
      ],
    });
  }

  void describeDaewoon; // 보조 함수 export 회피
  return out;
}

function themeFor(events: RelationshipEventType[], t: RelationshipType): string {
  if (events.includes('decision-needed')) return '결정·정리·전환이 필요해질 수 있는 해';
  if (events.includes('turning-point')) return '관계의 방향이 한 번 정리되는 해';
  if (events.includes('reconnect-possible')) return '관계가 다시 움직일 수 있는 해';
  if (events.includes('closer')) return '가까워지기 쉬운 해';
  if (events.includes('cooling')) return '관계 온도가 잠시 식을 수 있는 해';
  if (events.includes('move-or-life-change')) return '생활·환경 변화가 관계에 영향을 주는 해';
  if (events.includes('distance')) return '특별한 사건보다는 페이스를 점검하는 해';
  return '관계 안정 구간';
  void t;
}

function makeOpportunity(events: RelationshipEventType[], t: RelationshipType): string {
  if (events.includes('closer')) {
    switch (t) {
      case 'dating': return '서로의 결을 더 깊게 확인하고 한 단계 진전할 수 있는 흐름';
      case 'married': return '부부로서의 합을 다시 다지기 좋은 해';
      case 'friendship': return '더 진솔한 대화나 공동 경험이 우정을 깊게 만들 수 있는 흐름';
      case 'coworker': return '공동 프로젝트·새 시도가 성과로 이어질 수 있는 해';
      case 'reunion_or_breakup': return '관계가 다시 움직일 가능성이 열리지만, 같은 패턴 점검이 먼저 필요한 해';
      case 'crush_or_something': return '자연스럽게 관계 진전을 시도해볼 만한 해';
    }
  }
  if (events.includes('decision-needed')) return '관계 형식을 다시 정의할 기회 — 룰을 새로 짜기 좋은 흐름';
  if (events.includes('move-or-life-change')) return '환경 변화 안에서 함께 새 룰을 정할 기회';
  return '큰 도약보다 작은 합의를 꾸준히 쌓을 수 있는 흐름';
}

function makeCaution(events: RelationshipEventType[], t: RelationshipType): string {
  if (events.includes('cooling')) return '연락·표현 빈도가 줄어들면 평소보다 외로움·불안이 크게 느껴질 수 있어요.';
  if (events.includes('decision-needed')) {
    return t === 'reunion_or_breakup'
      ? '감정에 휘둘려 빠르게 재회·정리 결정을 하지 않도록 시간 두기'
      : '큰 결정(이사·결혼·이직·동거 등)을 충동적으로 내리지 않기';
  }
  if (events.includes('turning-point')) return '같은 갈등이 한 번에 다시 부각될 수 있으니, 회복 룰을 미리 점검해두기';
  if (events.includes('move-or-life-change')) return '환경 변화로 관계 우선순위가 흐려질 수 있으니, 자주 만나는 페이스를 의식적으로 유지하기';
  return '특별한 사건이 적은 만큼 표현 부족·익숙함의 권태에 주의';
}

function makeAdvice(events: RelationshipEventType[], t: RelationshipType): string {
  if (events.includes('decision-needed')) return '결정을 내리기 전에 "이 결정이 1년 뒤에도 같을까?"를 한 번 더 묻기';
  if (events.includes('closer')) {
    return t === 'married'
      ? '돈·생활·역할의 작은 룰을 다시 합의하기 좋은 시기'
      : '관계의 다음 단계를 의식해서 작은 약속·이벤트를 만들어보기';
  }
  if (events.includes('cooling')) return '연락 빈도·만남 빈도를 의식적으로 유지하고, "괜찮음"이라는 단답 대신 짧은 감정 공유를 의도적으로 늘리기';
  return '큰 변화 없이 일상의 작은 디테일을 점검하는 시기로 두기';
}

function describeDaewoon(_d: FortuneCycleInfo['currentDaewoon']) { return _d.pillar; }

function dedupe<T>(arr: T[]): T[] { return Array.from(new Set(arr)); }
