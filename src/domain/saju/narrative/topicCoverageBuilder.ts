// TopicCoverageMap builder — 분석 데이터를 보고 어떤 주제가 본문에 흡수돼야 하는지 결정.
// "데이터가 없으면 skip" 정책: 예) timingAnchors 비어 있으면 pastTimingAnchor=false.
// 단, 프리미엄 리포트 핵심 주제(REQUIRED_TOPICS_HARD)는 데이터가 적어도 true로 고정.

import type { PersonalSajuGptInput } from '../report/sajuReportSchema';
import type { TopicCoverageMap, NarrativeTopicKey } from './topicCoverageTypes';

export function buildTopicCoverageMap(input: PersonalSajuGptInput): TopicCoverageMap {
  const has = {
    identityKeywords: input.identityKeywords.length > 0,
    specialPoints: input.specialPoints.length > 0,
    lifeTraps: input.lifeTraps.length > 0,
    lifeWeapons: input.lifeWeapons.length > 0,
    careerMatches: input.careerSpecificAnalysis.topCareerMatches.length > 0,
    avoidEnvironments: input.careerSpecificAnalysis.avoidCareerEnvironments.length > 0,
    moneyStyle: input.careerSpecificAnalysis.moneyMakingStyle.length > 0,
    timingAnchors: input.timingAnchors.length > 0,
    futureYears: input.futureTimingAnalysis.years.length > 0,
    fortuneTriggers:
      input.fortuneTriggers.fortuneActivatingChoices.length +
      input.fortuneTriggers.fortuneBlockingChoices.length > 0,
  };

  const map: TopicCoverageMap = {
    // 도입부
    oneLineDefinition: true,
    coreKeywords: has.identityKeywords,
    outerInnerContrast: true,
    specialPoints: has.specialPoints,
    // 기질·내면
    personality: true,
    innerWorld: true,
    emotionalProcessing: true,
    socialMask: true,
    selfProtectionPattern: true,
    // 반복 패턴·관계
    repeatedPattern: has.lifeTraps,
    workPattern: true,
    relationshipPattern: true,
    relationshipStyle: true,
    loveMarriageStyle: true,
    familyEarlyPattern: true,
    pastTimingAnchor: has.timingAnchors,
    // 일·재능 (4장)
    career: has.careerMatches,
    talent: has.lifeWeapons,
    workEnvironment: has.careerMatches,
    avoidWorkEnvironment: has.avoidEnvironments,
    leadershipStyle: true,
    coworkerFit: true,
    independenceOrBusinessPotential: has.careerMatches,
    // 돈·수익화 (5장)
    moneyStyle: has.moneyStyle,
    monetizationStyle: true,
    moneyLeakPattern: has.moneyStyle || has.lifeTraps,
    pricingAndContractAdvice: true,
    productizationAdvice: true,
    // 관계·연애 (6장)
    loveStyle: true,
    marriageLongTermStyle: true,
    heartOpeningPattern: true,
    heartClosingPattern: true,
    conflictPattern: true,
    // 타이밍·미래·전략
    futureThreeYears: has.futureYears,
    practicalStrategy: true,
  };

  return map;
}

export function listRequiredTopics(map: TopicCoverageMap): NarrativeTopicKey[] {
  return Object.entries(map)
    .filter(([, v]) => v === true)
    .map(([k]) => k as NarrativeTopicKey);
}
