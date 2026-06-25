// 궁합 narrative V4 — Evidence Formatter (Phase 2)
//
// 역할:
//   - CompatibilityAnalysisBundle(결정적 계산 결과)를 받아
//     섹션별 ownership이 분리된 CompatMustUseFact 집합으로 변환.
//   - 같은 fact id가 두 섹션에 중복 배정되지 않도록 owner를 미리 정해둔다.
//   - planBuilder는 본 결과를 받아 CompatNarrativePlan을 만들기만 한다.
//
// 정합:
//   - bundle의 결정적 결과만 사용 (computedEvidence 외 명리 요소 X).
//   - 각 fact는 EXACTLY ONE ownerSection (id prefix로 식별, getOwnerSectionOf와 정합).
//   - relationshipStrengths/relationshipRisks는 LLM fact로 배정하지 않는다
//     (기존 결정적 카드와 중복 방지 — evidenceView/카드 영역).
//   - futureFlow는 finalAdvice에 ONE short summary fact로만 (3년 재서술 금지).
//
// id prefix → ownerSection 맵:
//   ro-  relationshipOverview
//   mech- relationshipMechanism
//   af-  attractionAndFriction
//   rp-  repeatedPattern
//   rg-  relationshipGuide
//   fa-  finalAdvice
//   cc-  compatibilityCard (결정적, 코드용)

import type { CompatibilityAnalysisBundle } from '../compatibilityTypes';
import type {
  CompatMustUseFact, CompatNarrativeSectionId, CompatNarrativeContext,
} from './compatNarrativeTypes';

// ============================================================
// 섹션별 묶음 결과
// ============================================================
export interface FormattedCompatEvidence {
  facts: CompatMustUseFact[];
}

// ============================================================
// 헬퍼 — 비어있지 않은 항목만 join
// ============================================================
function joinNonEmpty(items: (string | undefined | null)[], sep = ', '): string {
  return items.filter((s): s is string => !!s && s.trim().length > 0).join(sep);
}

function firstNonEmpty(items: (string | undefined | null)[], fallback: string): string {
  for (const it of items) {
    if (it && it.trim().length > 0) return it;
  }
  return fallback;
}

// ============================================================
// relationshipMechanism — 구조적 원인
//   dayMasterRelation, elementComplement, tenGodInteraction,
//   usefulGodInteraction, spousePalaceRelation, combinationConflicts
// ============================================================
function buildMechanismFacts(b: CompatibilityAnalysisBundle): CompatMustUseFact[] {
  const facts: CompatMustUseFact[] = [];

  // 일간 관계
  facts.push({
    id: 'mech-dayMaster',
    source: 'dayMasterRelation',
    ownerSection: 'relationshipMechanism',
    fact: `일간 관계: ${b.dayMasterRelation.relation} (균형: ${b.dayMasterRelation.balance})`,
    plainMeaning: b.dayMasterRelation.description,
    narrativeHint: '두 사람의 "기본 기운이 만나는 방식"을 일상어로. 누가 더 주고 받는 결인지 자연스럽게. 한자/영문 금지.',
    matchTokens: ['일간', '기운'],
    role: 'main',
  });

  // 오행 보완
  facts.push({
    id: 'mech-elementComplement',
    source: 'elementComplement',
    ownerSection: 'relationshipMechanism',
    fact: `오행 보완: 상호 ${b.elementComplement.mutualComplement}`,
    plainMeaning: firstNonEmpty(b.elementComplement.evidence, '서로 부족한 기운을 채워주는 정도를 봅니다.'),
    narrativeHint: '"서로 부족한 부분을 채우는지 / 한쪽으로 기우는지"를 행동·역할 결로. 일방적 의존 위험이 있으면 짚되 단정 금지.',
    matchTokens: ['보완', '채워'],
    role: b.elementComplement.mutualComplement === 'one-sided' ? 'tension' : 'support',
    adviceHint: b.elementComplement.oneSidednessRisk.length > 0
      ? { actionable: '서로 채워주는 쪽과 기우는 쪽을 구분해 역할을 나눠보기.', avoidPattern: joinNonEmpty(b.elementComplement.oneSidednessRisk) }
      : undefined,
  });

  // 십성 상호작용
  facts.push({
    id: 'mech-tenGod',
    source: 'tenGodInteraction',
    ownerSection: 'relationshipMechanism',
    fact: `십성 작용: A→B ${joinNonEmpty(b.tenGodInteraction.aFeelsBAs) || '두드러진 작용 적음'} / B→A ${joinNonEmpty(b.tenGodInteraction.bFeelsAAs) || '두드러진 작용 적음'}`,
    plainMeaning: '상대가 나에게 어떤 역할(책임·표현·현실·보호·동료)로 느껴지는지의 결입니다.',
    narrativeHint: '"상대가 나에게 어떤 십성으로 작용하는지"를, 그 십성 이름(정관·식상·재성 등 fact에 있는 값)을 한 번 드러내고 바로 "어떤 사람으로 느껴지는지(책임 일깨움/표현 끌어냄/현실 조언자 등)"로 풀이. 끌림과 부담이 같은 뿌리임을 1번 짚음.',
    matchTokens: ['느껴', '역할'],
    role: 'support',
  });

  // 용신/기신 상호 자극
  facts.push({
    id: 'mech-usefulGod',
    source: 'usefulGodInteraction',
    ownerSection: 'relationshipMechanism',
    fact: `용신/기신 상호 자극: ${b.usefulGodInteraction.interpretation}`,
    plainMeaning: firstNonEmpty(b.usefulGodInteraction.evidence, '상대가 나에게 필요한 기운을 건드리는지, 부담스러운 기운을 건드리는지의 결입니다.'),
    narrativeHint: '"상대의 기운이 내 용신(곁에 있으면 편한 기운)인지 기신(과하면 부담스러운 기운)인지"를, **"용신" 또는 "기신"이라는 말을 한 번 드러내고** 바로 일상어로 풀이. 부적·방향 같은 미신 금지, 환경·행동 결로.',
    matchTokens: ['용신', '기신'],
    role: 'support',
  });

  // 일지(배우자궁) 관계
  facts.push({
    id: 'mech-spousePalace',
    source: 'spousePalaceRelation',
    ownerSection: 'relationshipMechanism',
    fact: `일지(배우자궁) 관계: ${joinNonEmpty(b.spousePalaceRelation.relationTypes) || 'none'} (강도 ${b.spousePalaceRelation.intensity})`,
    plainMeaning: joinNonEmpty([b.spousePalaceRelation.attractionEffect, b.spousePalaceRelation.conflictEffect], ' / '),
    narrativeHint: '"일지(가장 가까운 자리 — 일상·생활 리듬)가 서로 어떻게 맞물리는가"를, **"일지"라는 말을 한 번 가볍게 드러내고** 바로 일상어로 풀이. 합/충 같은 작용이 있으면 "당기는 결/흔들리는 결"로 1번 짚되, 좋다/나쁘다 단정 금지.',
    matchTokens: ['일지'],
    role: b.spousePalaceRelation.intensity === 'high' ? 'tension' : 'support',
  });

  // 합·충·형·파·해 (원국 전체)
  const combLabels = joinNonEmpty([
    b.combinationConflicts.combinations.length ? `합 ${b.combinationConflicts.combinations.length}` : '',
    b.combinationConflicts.conflicts.length ? `충 ${b.combinationConflicts.conflicts.length}` : '',
    b.combinationConflicts.punishments.length ? `형 ${b.combinationConflicts.punishments.length}` : '',
    b.combinationConflicts.destructions.length ? `파 ${b.combinationConflicts.destructions.length}` : '',
    b.combinationConflicts.harms.length ? `해 ${b.combinationConflicts.harms.length}` : '',
  ]);
  facts.push({
    id: 'mech-combinationConflicts',
    source: 'combinationConflicts',
    ownerSection: 'relationshipMechanism',
    fact: `원국 합·충·형·파·해: ${combLabels || '두드러진 작용 적음'}`,
    plainMeaning: '두 사주가 만났을 때 끌어당기는 작용(합)과 흔들리는 작용(충·형·파·해)이 어느 정도인지의 결입니다.',
    narrativeHint: '합·충·형·파·해를 일일이 나열하지 말 것. "끌어당기는 결 / 흔들리는 결"의 균형으로 한 문장 정도만 mechanism에 흡수.',
    matchTokens: ['합', '충'],
    role: 'tension',
  });

  return facts;
}

// ============================================================
// attractionAndFriction — 매력↔부담이 같은 뿌리
//   attractionAnalysis + conflictAnalysis(mainConflictTriggers/emotionalMismatch)
// ============================================================
function buildAttractionFrictionFacts(b: CompatibilityAnalysisBundle): CompatMustUseFact[] {
  const facts: CompatMustUseFact[] = [];

  // 끌림
  facts.push({
    id: 'af-attraction',
    source: 'attraction',
    ownerSection: 'attractionAndFriction',
    fact: `끌림: ${joinNonEmpty(b.attractionAnalysis.mainAttraction) || b.attractionAnalysis.whyTheyNoticeEachOther}`,
    plainMeaning: b.attractionAnalysis.whyTheyNoticeEachOther,
    narrativeHint: '"서로를 알아본 지점"을 구체 장면으로. 첫인상 케미(soft/strong/slow-burn 등)는 overview에서 다루므로 여기선 끌림의 "내용"만.',
    matchTokens: ['끌림', '알아'],
    role: 'main',
  });

  // 충돌 트리거 (같은 뿌리의 부담 측)
  facts.push({
    id: 'af-conflictTriggers',
    source: 'conflict',
    ownerSection: 'attractionAndFriction',
    fact: `부딪힘 방아쇠: ${joinNonEmpty(b.conflictAnalysis.mainConflictTriggers) || '뚜렷한 방아쇠 적음'}`,
    plainMeaning: b.conflictAnalysis.emotionalMismatch,
    narrativeHint: '핵심 — "끌린 그 지점이 곧 부담이 되는 구조"를 같은 뿌리로 묶어 설명. 상대 마음 단정 금지.',
    matchTokens: ['부담', '엇갈'],
    role: 'tension',
    lifeSceneHint: {
      situation: firstNonEmpty(b.conflictAnalysis.mainConflictTriggers, '가까워질수록 같은 지점에서 반응이 갈리는 상황'),
      likelyBehavior: '끌렸던 특성이 그대로 마찰의 원인이 되는 행동',
      innerReaction: b.conflictAnalysis.emotionalMismatch,
    },
  });

  return facts;
}

// ============================================================
// repeatedPattern — 현실 반복 장면
//   conflictAnalysis.repeatedPattern + recoveryAnalysis + stabilityAnalysis
// ============================================================
function buildRepeatedPatternFacts(b: CompatibilityAnalysisBundle): CompatMustUseFact[] {
  const facts: CompatMustUseFact[] = [];

  // 반복 패턴 (conflict의 repeatedPattern 서브필드 — af-와 다른 id)
  facts.push({
    id: 'rp-repeatedPattern',
    source: 'conflict',
    ownerSection: 'repeatedPattern',
    fact: `반복되는 갈등 패턴: ${b.conflictAnalysis.repeatedPattern}`,
    plainMeaning: b.conflictAnalysis.recoveryStyleMismatch,
    narrativeHint: '"한 번 부딪히면 어떤 순서로 흘러가는가"의 반복 장면. 단정 미래("반드시 깨진다") 금지, "이런 흐름이 반복되기 쉽다" 톤.',
    matchTokens: ['반복', '패턴'],
    role: 'tension',
    lifeSceneHint: {
      situation: b.conflictAnalysis.repeatedPattern,
      likelyBehavior: b.conflictAnalysis.recoveryStyleMismatch,
      innerReaction: '서로 다른 방식으로 회복을 시도하면서 어긋나는 상태',
    },
  });

  // 회복 패턴
  facts.push({
    id: 'rp-recovery',
    source: 'recovery',
    ownerSection: 'repeatedPattern',
    fact: `회복 방식: ${b.recoveryAnalysis.likelyRecoveryPattern}`,
    plainMeaning: joinNonEmpty([
      `A가 필요로 하는 것: ${b.recoveryAnalysis.whatAUsuallyNeeds}`,
      `B가 필요로 하는 것: ${b.recoveryAnalysis.whatBUsuallyNeeds}`,
    ], ' / '),
    narrativeHint: '갈등 뒤 "어떻게 풀리는가"를 구체 행동으로. 서로가 회복에 필요로 하는 것이 다름을 짚되 한쪽을 탓하지 말 것.',
    matchTokens: ['회복', '풀'],
    role: 'support',
    adviceHint: {
      actionable: b.recoveryAnalysis.bestRecoveryRule,
    },
  });

  // 안정성 (일상 궁합 / 장기 리스크)
  facts.push({
    id: 'rp-stability',
    source: 'stability',
    ownerSection: 'repeatedPattern',
    fact: `안정성: 일상 ${b.stabilityAnalysis.dailyCompatibility} / 장기 ${b.stabilityAnalysis.longTermRisk}`,
    plainMeaning: b.stabilityAnalysis.relationshipTypeSpecificStability,
    narrativeHint: '"오래 함께할 때 편한 지점과 피로해지는 지점"을 생활 결로. 점수·등급 금지.',
    matchTokens: ['일상', '오래'],
    role: 'support',
  });

  return facts;
}

// ============================================================
// relationshipGuide — 행동 조언
//   relationshipChoices (helpful/harmful)
// ============================================================
function buildGuideFacts(b: CompatibilityAnalysisBundle): CompatMustUseFact[] {
  const facts: CompatMustUseFact[] = [];

  b.relationshipChoices.helpfulChoices.forEach((c, i) => {
    facts.push({
      id: `rg-helpful-${i}`,
      source: 'choices',
      ownerSection: 'relationshipGuide',
      fact: `도움이 되는 선택: ${c.title}`,
      plainMeaning: c.reason,
      narrativeHint: '추상 조언("서로 노력하세요") 금지. 대화·거리·역할·타이밍 차원의 구체 행동으로.',
      matchTokens: ['도움', '선택'],
      role: 'support',
      adviceHint: { actionable: c.practicalAction },
    });
  });

  b.relationshipChoices.harmfulChoices.forEach((c, i) => {
    facts.push({
      id: `rg-harmful-${i}`,
      source: 'choices',
      ownerSection: 'relationshipGuide',
      fact: `피하는 게 좋은 선택: ${c.title}`,
      plainMeaning: c.reason,
      narrativeHint: '"하지 말라"보다 "이렇게 바꾸면 된다"의 교정 행동으로. 상대 비난 톤 금지.',
      matchTokens: ['피', '바꾸'],
      role: 'caution',
      adviceHint: { actionable: c.correction, avoidPattern: c.title },
    });
  });

  return facts;
}

// ============================================================
// finalAdvice — 관계유형별 결론
//   relationshipType + archetype.keyAdvice + ONE short futureFlow summary
// ============================================================
function buildFinalAdviceFacts(
  b: CompatibilityAnalysisBundle,
  ctx: CompatNarrativeContext,
): CompatMustUseFact[] {
  const facts: CompatMustUseFact[] = [];

  // 관계유형
  facts.push({
    id: 'fa-relationshipType',
    source: 'relationshipType',
    ownerSection: 'finalAdvice',
    fact: `관계 유형: ${ctx.relationshipTypeKo}`,
    plainMeaning: `이 관계는 "${ctx.relationshipTypeKo}" 관점에서 무엇을 기준으로 볼지가 달라집니다.`,
    narrativeHint: `결론은 ${ctx.relationshipTypeKo} 관점의 "선택 기준"으로. 앞 섹션 재요약 금지. 톤: ${ctx.focus.toneHint}.`,
    matchTokens: [ctx.relationshipTypeKo],
    role: 'main',
  });

  // 아키타입 핵심 조언
  facts.push({
    id: 'fa-archetypeAdvice',
    source: 'archetype',
    ownerSection: 'finalAdvice',
    fact: `관계 핵심 조언: ${b.relationshipArchetype.keyAdvice}`,
    plainMeaning: b.relationshipArchetype.keyAdvice,
    narrativeHint: '저장하고 싶을 만큼 기억에 남는 결론 한 문장으로 이어지게. 운명 단정·점수 금지.',
    matchTokens: ['조언'],
    role: 'main',
  });

  // futureFlow 짧은 요약 (3년 재서술 금지 — 단 하나의 brief link)
  const flowYears = b.futureFlow.map(f => f.year).join('~');
  const flowThemes = joinNonEmpty(b.futureFlow.map(f => f.theme));
  facts.push({
    id: 'fa-futureFlowSummary',
    source: 'futureFlow',
    ownerSection: 'finalAdvice',
    fact: `앞으로의 흐름 요약: ${flowYears ? `${flowYears} — ` : ''}${flowThemes || '큰 흐름 변화는 점진적'}`,
    plainMeaning: '앞으로 몇 해 동안 관계의 결이 어떻게 흘러갈 수 있는지의 아주 짧은 연결입니다.',
    narrativeHint: '3년치를 모두 풀어쓰지 말 것. 결론을 닫는 한 문장으로만 가볍게 연결. 단정 예언 금지.',
    matchTokens: ['흐름', '앞으로'],
    role: 'support',
  });

  return facts;
}

// ============================================================
// relationshipOverview — 관계 핵심 분위기 + 첫인상
//   archetype.summary/brightSide/shadowSide + attractionAnalysis.initialChemistry
// ============================================================
function buildOverviewFacts(b: CompatibilityAnalysisBundle): CompatMustUseFact[] {
  const facts: CompatMustUseFact[] = [];

  facts.push({
    id: 'ro-archetypeSummary',
    source: 'archetype',
    ownerSection: 'relationshipOverview',
    fact: `관계 한 줄 요약: ${b.relationshipArchetype.summary}`,
    plainMeaning: joinNonEmpty([
      `밝은 면: ${b.relationshipArchetype.brightSide}`,
      `그늘진 면: ${b.relationshipArchetype.shadowSide}`,
    ], ' / '),
    narrativeHint: '관계 전체 분위기를 한 문장 + 밝은 면/그늘진 면을 균형 있게. 세부 명리 원인은 다음 섹션이므로 여기선 framing만.',
    matchTokens: ['관계', '분위기'],
    role: 'main',
  });

  facts.push({
    id: 'ro-initialChemistry',
    source: 'attraction',
    ownerSection: 'relationshipOverview',
    fact: `첫인상 케미: ${b.attractionAnalysis.initialChemistry}`,
    plainMeaning: '두 사람이 처음 가까워질 때의 속도와 결(부드러운/강한/천천히 타는/불안정한/현실적인)입니다.',
    narrativeHint: '첫인상 케미를 "처음 어떻게 가까워지는가"의 한 문장으로. overview 차원의 framing만, 끌림의 내용은 다음 섹션.',
    matchTokens: ['첫인상', '처음'],
    role: 'support',
  });

  return facts;
}

// ============================================================
// compatibilityCard (결정적) — 코드가 카드 렌더에 사용. LLM fact 아님.
//   archetype.title/shortLabel/keywords (+ snsPhrase source)
// ============================================================
function buildCardFacts(b: CompatibilityAnalysisBundle): CompatMustUseFact[] {
  return [
    {
      id: 'cc-archetypeTitle',
      source: 'archetype',
      ownerSection: 'compatibilityCard',
      fact: `아키타입 제목: ${b.relationshipArchetype.title}`,
      plainMeaning: b.relationshipArchetype.shortLabel,
      narrativeHint: 'compatibilityCard는 결정적 — 코드가 카드/SNS 문구에 사용. LLM 프롬프트에 넣지 않음.',
      matchTokens: [b.relationshipArchetype.title],
    },
    {
      id: 'cc-keywords',
      source: 'keywords',
      ownerSection: 'compatibilityCard',
      fact: `관계 키워드: ${joinNonEmpty(b.relationshipArchetype.keywords)}`,
      plainMeaning: '관계를 압축한 3~5개 키워드.',
      narrativeHint: 'compatibilityCard는 결정적 — 코드가 키워드 카드에 사용. LLM 프롬프트에 넣지 않음.',
      matchTokens: b.relationshipArchetype.keywords.slice(0, 3),
    },
  ];
}

// ============================================================
// 메인 — formatCompatEvidence
// ============================================================
export function formatCompatEvidence(
  bundle: CompatibilityAnalysisBundle,
  ctx: CompatNarrativeContext,
): FormattedCompatEvidence {
  const facts: CompatMustUseFact[] = [
    ...buildOverviewFacts(bundle),
    ...buildMechanismFacts(bundle),
    ...buildAttractionFrictionFacts(bundle),
    ...buildRepeatedPatternFacts(bundle),
    ...buildGuideFacts(bundle),
    ...buildFinalAdviceFacts(bundle, ctx),
    ...buildCardFacts(bundle),
  ];
  return { facts };
}

// ============================================================
// 중복 방지 검증용 helper (planBuilder/test에서 사용)
//   id prefix → ownerSection
// ============================================================
export function getOwnerSectionOf(factId: string): CompatNarrativeSectionId | null {
  if (factId.startsWith('ro-'))   return 'relationshipOverview';
  if (factId.startsWith('mech-')) return 'relationshipMechanism';
  if (factId.startsWith('af-'))   return 'attractionAndFriction';
  if (factId.startsWith('rp-'))   return 'repeatedPattern';
  if (factId.startsWith('rg-'))   return 'relationshipGuide';
  if (factId.startsWith('fa-'))   return 'finalAdvice';
  if (factId.startsWith('cc-'))   return 'compatibilityCard';
  return null;
}
