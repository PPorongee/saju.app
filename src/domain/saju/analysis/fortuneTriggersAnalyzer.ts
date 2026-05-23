// 운이 살아나는 선택 / 운을 막는 선택 (spec §3-4).
// lifeWeapons.howToUse → activatingChoices (행동 전략)
// lifeTraps.name → blockingChoices + escapeStrategy를 correction으로
// usefulGod + fortune도 종합.

import type {
  FortuneTriggerAnalysis, UsefulGodAnalysis, TenGodAnalysis,
  ElementStrengthAnalysis, SpecialPoint, LifeWeapon, LifeTrap,
  FortuneCycleInfo,
} from '../report/sajuReportSchema';
import type { FourPillars } from '../calendar/pillarCalculator';

interface MatchArgs {
  pillars: FourPillars;
  tenGods: TenGodAnalysis;
  elements: ElementStrengthAnalysis;
  usefulGod: UsefulGodAnalysis;
  specialPoints: SpecialPoint[];
  lifeWeapons: LifeWeapon[];
  lifeTraps: LifeTrap[];
  fortune: FortuneCycleInfo;
}

export function analyzeFortuneTriggers(args: MatchArgs): FortuneTriggerAnalysis {
  const { lifeWeapons, lifeTraps, usefulGod, specialPoints, fortune } = args;

  // ============= 운이 살아나는 선택 =============
  const activating: FortuneTriggerAnalysis['fortuneActivatingChoices'] = [];

  // 1. 각 lifeWeapon의 howToUse → 행동 전략
  for (const w of lifeWeapons.slice(0, 3)) {
    activating.push({
      title: w.howToUse.split('—')[0]?.trim() || w.howToUse,
      reason: `[${w.name}] ${w.evidence.map(e => e.description).join(', ')}`,
      practicalAction: w.howToUse,
      relatedTo: 'specialPoint',
    });
  }

  // 2. 용신 오행을 가까이 두는 환경
  const useful = usefulGod.primaryUseful.value;
  activating.push({
    title: `용신 ${useful} 기운을 가까이 두는 환경`,
    reason: `용신 ${useful} — ${usefulGod.reasons[0] || '명리적으로 가장 도움되는 오행'}`,
    practicalAction: useful === 'water' ? '한강·바다 근처, 수영·반신욕, 검정·네이비, 노르웨이' :
                     useful === 'wood' ? '동쪽 공원·숲, 그린 인테리어, 시금치·브로콜리' :
                     useful === 'fire' ? '남쪽, 따뜻한 조명, 캔들, 강남·해운대' :
                     useful === 'metal' ? '서쪽 도시, 메탈 액세서리, 헬스·필라테스' :
                                          '중부·황토·도예·원예 (토)',
    relatedTo: 'usefulGod',
  });

  // 3. 향후 3년에서 용신/희신이 들어오는 시점
  const opp = fortune.nextThreeYears.find(y => y.opportunities.length > 0);
  if (opp) {
    activating.push({
      title: `${opp.year}년 — 잠재력이 현실로 나오는 구간 활용`,
      reason: opp.opportunities.join(' / '),
      practicalAction: '제안서·포트폴리오·자격 취득처럼 외부 평가 가능한 형태로 결과물 만들기',
      relatedTo: 'sewoon',
    });
  }

  // 4. signature SpecialPoint를 활성화하는 행동
  const sigPoint = specialPoints[0];
  if (sigPoint) {
    activating.push({
      title: sigPoint.narrative.goodUse.split('—')[0]?.trim() || `${sigPoint.shortLabel} 살리기`,
      reason: `signature 포인트 [${sigPoint.title}]`,
      practicalAction: sigPoint.narrative.goodUse,
      relatedTo: 'specialPoint',
    });
  }

  // ============= 운을 막는 선택 =============
  const blocking: FortuneTriggerAnalysis['fortuneBlockingChoices'] = [];

  // 1. 각 lifeTrap → blocking choice
  for (const t of lifeTraps.slice(0, 4)) {
    blocking.push({
      title: t.name,
      reason: `[패턴] ${t.patternDescription}`,
      practicalRisk: t.realLifeScene,
      correction: t.escapeStrategy,
      relatedTo: 'lifeTrap',
    });
  }

  // 2. 기신 오행 행동 회피
  const ki = usefulGod.unfavorable[0];
  blocking.push({
    title: `기신 ${ki} 기운을 과도하게 자극하는 환경`,
    reason: `기신 ${ki} — 사주에 이미 강하거나 충돌 일으키는 오행`,
    practicalRisk: '쉽게 과부하·관계 마찰·결정 미루기 같은 결과로 이어질 수 있음',
    correction: `${ki} 활동을 줄이고 용신 ${useful} 활동으로 균형 잡기`,
    relatedTo: 'unfavorableGod',
  });

  return {
    fortuneActivatingChoices: activating.slice(0, 6),
    fortuneBlockingChoices: blocking.slice(0, 6),
  };
}
