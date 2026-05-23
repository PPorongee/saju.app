// 관계 아키타입 선택기 — 분석 결과를 종합해 카탈로그에서 가장 결이 맞는 1개를 고른다.

import type {
  RelationshipArchetype, AttractionAnalysis, ConflictAnalysis,
  RecoveryAnalysis, StabilityAnalysis, SpousePalaceRelationAnalysis,
  ElementComplementAnalysis, TenGodInteractionAnalysis,
  UsefulGodInteractionAnalysis, RelationshipType, ArchetypeEvidenceSource,
} from '../compatibilityTypes';
import { RELATIONSHIP_ARCHETYPE_CATALOG } from './relationshipArchetypeCatalog';

interface Args {
  attractionAnalysis: AttractionAnalysis;
  conflictAnalysis: ConflictAnalysis;
  recoveryAnalysis: RecoveryAnalysis;
  stabilityAnalysis: StabilityAnalysis;
  spousePalaceRelation: SpousePalaceRelationAnalysis;
  elementComplement: ElementComplementAnalysis;
  tenGodInteraction: TenGodInteractionAnalysis;
  usefulGodInteraction: UsefulGodInteractionAnalysis;
  relationshipType: RelationshipType;
}

export function selectRelationshipArchetype(args: Args): RelationshipArchetype {
  const {
    attractionAnalysis, conflictAnalysis, recoveryAnalysis,
    spousePalaceRelation, elementComplement, usefulGodInteraction,
    relationshipType,
  } = args;

  const hardPalace = spousePalaceRelation.relationTypes.includes('conflict') ||
                     spousePalaceRelation.relationTypes.includes('punishment');
  const softPalace = spousePalaceRelation.relationTypes.includes('six-harmony') ||
                     spousePalaceRelation.relationTypes.includes('three-harmony');
  const strongComplement = elementComplement.mutualComplement === 'strong';
  const oneSidedComplement = elementComplement.mutualComplement === 'one-sided';
  const strongChemistry = attractionAnalysis.initialChemistry === 'strong';
  const unstable = attractionAnalysis.initialChemistry === 'unstable';
  const slowBurn = attractionAnalysis.initialChemistry === 'slow-burn';
  const practical = attractionAnalysis.initialChemistry === 'practical';
  const recoveryMismatch = recoveryAnalysis.whatAUsuallyNeeds !== recoveryAnalysis.whatBUsuallyNeeds;
  const triggersMany = conflictAnalysis.mainConflictTriggers.length >= 4;

  // 우선순위 규칙 (스펙 §9)
  let chosenId: string;

  if (relationshipType === 'reunion_or_breakup') {
    chosenId = 'unfinished-emotion';
  } else if (relationshipType === 'crush_or_something') {
    chosenId = strongChemistry || unstable ? 'magnetic-pull' : 'unforgettable-ambiguous';
  } else if (relationshipType === 'coworker') {
    chosenId = 'practical-partner';
  } else if (unstable && recoveryMismatch) {
    chosenId = 'magnetic-pull';
  } else if (strongComplement && softPalace) {
    chosenId = 'missing-piece';
  } else if (slowBurn && softPalace) {
    chosenId = 'slow-burn-stability';
  } else if (hardPalace && triggersMany) {
    chosenId = 'growth-through-conflict';
  } else if (strongChemistry && (recoveryMismatch || oneSidedComplement)) {
    chosenId = 'rule-needed-love';
  } else if (practical && relationshipType !== 'friendship') {
    chosenId = 'practical-partner';
  } else if (softPalace && elementComplement.mutualComplement !== 'weak') {
    chosenId = 'comfortable-friend-lover';
  } else if (recoveryMismatch && spousePalaceRelation.intensity === 'low') {
    chosenId = 'love-and-distance';
  } else if (softPalace && elementComplement.mutualComplement === 'weak') {
    chosenId = 'comfortable-but-flat';
  } else if (hardPalace) {
    chosenId = 'karma-comedy';
  } else {
    chosenId = 'fire-and-brake';
  }

  const entry = RELATIONSHIP_ARCHETYPE_CATALOG.find(a => a.id === chosenId)
    ?? RELATIONSHIP_ARCHETYPE_CATALOG[0];

  // 증거 모으기
  const evidence: Array<{ source: ArchetypeEvidenceSource; description: string }> = [];
  evidence.push({ source: 'spousePalaceRelation', description: `일지 관계: ${spousePalaceRelation.relationTypes.join('·')}` });
  evidence.push({ source: 'elementComplement', description: `오행 보완: ${elementComplement.mutualComplement}` });
  if (usefulGodInteraction.aUsefulTouchedByB.length || usefulGodInteraction.bUsefulTouchedByA.length) {
    evidence.push({ source: 'usefulGodInteraction', description: '상호 용신 자극 있음' });
  }
  if (usefulGodInteraction.aUnfavorableTriggeredByB.length || usefulGodInteraction.bUnfavorableTriggeredByA.length) {
    evidence.push({ source: 'usefulGodInteraction', description: '상호 기신 자극 있음' });
  }
  evidence.push({ source: 'tenGodInteraction', description: `십성 매력: ${args.tenGodInteraction.attractionPoints[0] ?? '약'}` });

  // keywords — triggerKeywords + 추가 키워드
  const keywords = Array.from(new Set([
    ...entry.triggerKeywords,
    ...attractionAnalysis.mainAttraction.slice(0, 1),
  ])).slice(0, 5);

  return {
    id: entry.id,
    title: entry.title,
    shortLabel: entry.shortLabel,
    keywords,
    summary: `${entry.shortLabel} — ${entry.defaultBrightSide.split('.')[0]}.`,
    brightSide: entry.defaultBrightSide,
    shadowSide: entry.defaultShadowSide,
    keyAdvice: entry.defaultKeyAdvice,
    evidence,
    relationshipTypeFit: entry.fitTypes,
    tone: entry.tone,
  };
}
