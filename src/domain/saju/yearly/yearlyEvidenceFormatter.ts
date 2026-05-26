// Yearly Fortune V4 — Evidence Formatter (Y3)
//
// 역할:
//   - YearlyFortuneAnalysis(Y2 deterministic 계산 결과)를 받아
//     섹션별 ownership이 분리된 YearlyMustUseFact 집합으로 변환.
//   - 같은 fact가 여러 섹션에 중복 배정되지 않도록 owner를 미리 정해둔다.
//   - planBuilder는 본 결과를 받아 YearlyPlan을 만들기만 한다.
//
// 정합:
//   - Y2의 deterministic 결과만 사용. computedEvidence 외 명리 요소 X.
//   - 각 fact는 narrativeHint + lifeSceneHint + adviceHint를 포함 (planBuilder가 그대로 prompt에 노출).

import type {
  YearlyFortuneAnalysis, YearlyMustUseFact, YearlyFortuneSectionId,
  Interaction, MonthlyFortuneAnalysis, NextYearSummary,
} from './yearlyTypes';

// ============================================================
// Section-owned evidence 묶음
// ============================================================
export interface FormattedYearlyEvidence {
  yearFlowCard: YearlyMustUseFact[];
  yearlyMechanism: YearlyMustUseFact[];
  remainingMonths: YearlyMustUseFact[];
  topicFortunes: YearlyMustUseFact[];
  actionGuide: YearlyMustUseFact[];
  nextTwoYears: YearlyMustUseFact[];
  /** evidenceView는 LLM 호출 X — deterministic 데이터 직접 렌더용 */
  evidenceView: YearlyMustUseFact[];
}

const INTENSITY_RANK: Record<Interaction['intensity'], number> = { strong: 0, medium: 1, mild: 2 };
const PALACE_PREFERENCE = ['day', 'hour', 'month', 'year'];

function sortInteractionsByImportance(interactions: Interaction[]): Interaction[] {
  return [...interactions].sort((a, b) => {
    const di = INTENSITY_RANK[a.intensity] - INTENSITY_RANK[b.intensity];
    if (di !== 0) return di;
    // palace 우선 (scopeTag에서 추출)
    const palaceOf = (it: Interaction): number => {
      for (let i = 0; i < PALACE_PREFERENCE.length; i++) {
        if (it.scopeTag.includes(`-${PALACE_PREFERENCE[i]}-`)) return i;
      }
      return 99;
    };
    return palaceOf(a) - palaceOf(b);
  });
}

// ============================================================
// Section: yearFlowCard
//   - 올해 한 줄 요약 + 세운 ganji + 십성 + element vs 용신
// ============================================================
function buildYearFlowCardEvidence(a: YearlyFortuneAnalysis): YearlyMustUseFact[] {
  const facts: YearlyMustUseFact[] = [];

  facts.push({
    id: 'yfc-ganji',
    source: 'yearGanji',
    fact: `${a.targetYear}년 세운 = ${a.targetYearGanji.display}`,
    plainMeaning: `${a.targetYear}년의 60갑자는 ${a.targetYearGanji.display}입니다.`,
    narrativeHint: '카드 부제·요약에 자연스럽게 녹임. 한자/영문 표기 금지.',
    matchTokens: [a.targetYearGanji.display, String(a.targetYear)],
  });

  facts.push({
    id: 'yfc-yearTenGod',
    source: 'yearTenGod',
    fact: `세운 천간 십성: ${a.yearTenGod.stemTenGod} / 지지 본기 십성: ${a.yearTenGod.branchMainTenGod}`,
    plainMeaning: a.yearTenGod.plainMeaning,
    narrativeHint: '카드 요약 본문 안에서 십성 의미를 즉시 쉬운 말로 풀어 사용. 카드는 짧게.',
    matchTokens: [a.yearTenGod.stemTenGod, a.yearTenGod.branchMainTenGod],
  });

  facts.push({
    id: 'yfc-elementEffect',
    source: 'yearElement',
    fact: `세운 오행: ${a.yearElementEffect.element} — ${a.yearElementEffect.label}`,
    plainMeaning: a.yearElementEffect.plainMeaning,
    narrativeHint: '카드 요약에서 "용신/희신/기신/중립" 결을 사람이 이해할 수 있게 한 문장으로.',
    matchTokens: [a.yearElementEffect.element, a.yearElementEffect.relationToUsefulGod],
    adviceHint: a.yearElementEffect.adviceHint,
  });

  return facts;
}

// ============================================================
// Section: yearlyMechanism
//   - 원국 + 대운 + 세운 + 신강/신약 + 용신/기신 + 대표 interaction (대운-세운, 세운-원국)
// ============================================================
function buildYearlyMechanismEvidence(a: YearlyFortuneAnalysis): YearlyMustUseFact[] {
  const facts: YearlyMustUseFact[] = [];

  // 현재 대운
  facts.push({
    id: 'ym-currentDaewoon',
    source: 'currentDaewoon',
    fact: `현재 대운: ${a.currentDaewoon.pillar.pillarKo} (천간 ${a.currentDaewoon.stemTenGod}, 지지 본기 ${a.currentDaewoon.branchTenGod})`,
    plainMeaning: a.currentDaewoon.plainMeaning,
    narrativeHint: '"올해를 둘러싼 큰 환경"으로 1단락 안에 흡수. 사용자에게는 "현재 대운"이라는 단어 자체보다 그 결의 결을 풀어 설명.',
    matchTokens: [a.currentDaewoon.pillar.pillarKo, a.currentDaewoon.stemTenGod, a.currentDaewoon.branchTenGod],
  });

  // 신강/신약 yearlyEffect
  facts.push({
    id: 'ym-strengthImpact',
    source: 'strengthImpact',
    fact: `신강/신약 × 세운 = ${a.strengthImpact.natalStrength} / ${a.strengthImpact.yearlyEffect}`,
    plainMeaning: a.strengthImpact.plainMeaning,
    narrativeHint: '"올해 들어오는 결이 ${nat}에게 어떻게 작동하는지" 식으로 자연스럽게. 운명론 단정 금지.',
    matchTokens: [a.strengthImpact.natalStrength, a.strengthImpact.yearlyEffect],
    lifeSceneHint: a.strengthImpact.lifeSceneHint ? {
      situation: a.strengthImpact.lifeSceneHint,
      likelyBehavior: '이 결이 자연스럽게 작동하는 행동 방식',
      innerReaction: '안쪽에서는 이미 결이 잡혀 있는 상태',
    } : undefined,
    adviceHint: a.strengthImpact.adviceHint,
  });

  // 용신/기신
  facts.push({
    id: 'ym-elementEffect',
    source: 'yearElement',
    fact: `세운 오행 ${a.yearElementEffect.element} — ${a.yearElementEffect.relationToUsefulGod}`,
    plainMeaning: a.yearElementEffect.plainMeaning,
    narrativeHint: '용신/기신 관계를 행동·환경·선택의 결로 풀어 mechanism 단락 안에서 함께 다룸.',
    matchTokens: ['용신', '기신', a.yearElementEffect.element, a.yearElementEffect.relationToUsefulGod],
    lifeSceneHint: {
      situation: a.yearElementEffect.lifeSceneHint,
      likelyBehavior: '이 결이 들어오는 환경 변화',
      innerReaction: '내면적인 결 정리',
    },
    adviceHint: a.yearElementEffect.adviceHint,
  });

  // 대운-세운 대표 interaction top 2
  const dsTop = sortInteractionsByImportance(a.daewoonSewoonInteraction.interactions).slice(0, 2);
  dsTop.forEach((it, i) => {
    facts.push({
      id: `ym-daewoonSewoon-${i}`,
      source: 'daewoonSewoonInteraction',
      fact: `대운-세운 작용: ${it.label} (${it.intensity})`,
      plainMeaning: it.plainMeaning,
      narrativeHint: '큰 환경(대운)과 올해(세운)가 어떻게 맞물리는지 한 문장 시드. "흔들림/연결/조정" 톤.',
      matchTokens: [it.label],
      adviceHint: it.adviceHint,
    });
  });

  // 세운-원국 대표 interaction top 2 (palace 영향 단락 시드)
  const palaceTop: Interaction[] = a.natalSewoonInteractions
    .flatMap(g => g.interactions.map(it => ({ ...it, palaceLabel: g.pillarLabel })))
    .slice() as Interaction[];
  const palaceSorted = sortInteractionsByImportance(palaceTop).slice(0, 2);
  palaceSorted.forEach((it, i) => {
    facts.push({
      id: `ym-natalSewoon-${i}`,
      source: 'natalSewoonInteraction',
      fact: `세운-원국 작용: ${it.label} → ${it.to} (${it.intensity})`,
      plainMeaning: it.plainMeaning,
      narrativeHint: `세운이 어느 궁(${it.to})을 건드리는지 자연스럽게. 단정 미래 예측 금지.`,
      matchTokens: [it.label],
      lifeSceneHint: it.lifeSceneHint ? { situation: it.lifeSceneHint, likelyBehavior: '이 결의 행동 방식', innerReaction: '안쪽 정리' } : undefined,
      adviceHint: it.adviceHint,
    });
  });

  return facts;
}

// ============================================================
// Section: remainingMonths
//   - 각 월운 → 1 fact (compact)
// ============================================================
function buildRemainingMonthsEvidence(a: YearlyFortuneAnalysis): YearlyMustUseFact[] {
  return a.remainingMonthlyFortunes.map((m, i) => buildMonthlyFact(m, i));
}

function buildMonthlyFact(m: MonthlyFortuneAnalysis, idx: number): YearlyMustUseFact {
  const topLabels = m.interactions.slice(0, 2).map(it => it.label).join(', ');
  return {
    id: `rm-month-${idx}`,
    source: 'monthlyFortune',
    fact: `${m.monthLabel} (${m.monthGanji.display}, ${m.monthStemTenGod}) — ${m.keyword}`,
    plainMeaning: m.plainMeaning,
    narrativeHint: `${m.periodLabel}. 좋은 선택: ${m.goodChoice} / 주의: ${m.caution}.` +
      (topLabels ? ` 두드러질 수 있는 작용: ${topLabels}.` : ''),
    matchTokens: [m.monthLabel, m.monthGanji.display, m.keyword.split(' — ').pop() ?? m.keyword],
    lifeSceneHint: {
      situation: m.lifeSceneHint,
      likelyBehavior: '이 달의 결이 작동하는 방식',
      innerReaction: '안쪽 정리',
      betterUse: m.goodChoice,
    },
    adviceHint: {
      actionable: m.goodChoice,
      avoidPattern: m.caution,
    },
  };
}

// ============================================================
// Section: topicFortunes
//   - 일/돈/관계/리듬 4개 fact
//   - activatedTopics 종합 기반
// ============================================================
function buildTopicFortunesEvidence(a: YearlyFortuneAnalysis): YearlyMustUseFact[] {
  // 월운들의 activatedTopics 카운트로 가장 강하게 활성된 topic 우선
  const topicCount = new Map<string, number>();
  for (const m of a.remainingMonthlyFortunes) {
    for (const t of m.activatedTopics) topicCount.set(t, (topicCount.get(t) ?? 0) + 1);
  }
  for (const at of a.activatedTopics) topicCount.set(at.topic, (topicCount.get(at.topic) ?? 0) + 2);

  function topicHasActivity(...keys: string[]): boolean {
    return keys.some(k => (topicCount.get(k) ?? 0) > 0);
  }

  const facts: YearlyMustUseFact[] = [];

  // 1) 일·커리어 (일/공부/이동/계약)
  facts.push({
    id: 'tf-career',
    source: 'activatedTopic',
    fact: '일·커리어 흐름',
    plainMeaning: '올해 일운은 직업 추천보다 "어떤 흐름이 들어오는가"가 핵심. 역할 변화·평가·인정·공부·자격·환경 변화 신호로 봅니다.',
    narrativeHint: '"이직한다"·"승진한다" 같은 단정 예측 금지. "변화 신호가 생길 수 있다" 톤.' +
      (topicHasActivity('일','공부','이동','계약') ? ' 활성된 주제: 일/공부/계약/이동.' : ' 큰 변화 신호는 적음.'),
    matchTokens: ['일', '커리어', '역할', '환경'],
    adviceHint: {
      actionable: '맡고 있는 일의 범위·권한·평가 기준을 다시 확인하는 편이 좋습니다.',
      avoidPattern: '책임만 받고 권한·기준 확인 없이 일을 떠안는 패턴.',
    },
  });

  // 2) 돈·수익화 — financial-advice-risk 방지
  facts.push({
    id: 'tf-money',
    source: 'activatedTopic',
    fact: '돈·수익 흐름',
    plainMeaning: '돈운은 한 번에 크게 들어오는 흐름이라기보다, 능력을 수익 구조로 바꾸는 쪽에서 살아납니다.',
    narrativeHint: '투자/거래/시세/매수/매도/시장 타이밍 같은 표현 절대 금지. 작업 범위·보상 기준·계약·정산 조건·반복 수익 구조 중심.' +
      (topicHasActivity('돈','계약') ? ' 돈/계약 주제가 활성된 달이 있음.' : ''),
    matchTokens: ['돈', '수익', '보상', '계약', '정산'],
    adviceHint: {
      actionable: '작업 범위·기간·보상 기준을 먼저 정해 수익 구조를 만드는 방식이 안정적.',
      avoidPattern: '조건이 애매한 일을 그대로 받는 패턴.',
      activatePattern: '능력을 제안서·포트폴리오·계약 조건으로 구조화.',
    },
  });

  // 3) 관계·연애 — relationshipStatus/hasChildren 정책 유지
  facts.push({
    id: 'tf-relationship',
    source: 'activatedTopic',
    fact: '관계·연애 흐름',
    plainMeaning: '관계운은 가까워지는 사람/멀어지는 사람 결의 변화와 관계의 기준 정리 결로 봅니다.',
    narrativeHint: 'relationshipStatus가 unknown이면 "아내/남편/배우자/자녀" 단정 금지. "가까운 관계 / 장기적 관계를 생각한다면" 중립 표현.' +
      (topicHasActivity('관계','연애','가족') ? ' 관계/연애 주제 활성된 흐름 있음.' : ''),
    matchTokens: ['관계', '연애', '가까운', '신뢰'],
    adviceHint: {
      actionable: '감정이 커지기 전 짧게 기준을 나누는 편이 좋습니다.',
      avoidPattern: '괜찮은 척 쌓아두는 패턴.',
    },
  });

  // 4) 생활 리듬·멘탈 — medical-advice-risk 방지
  facts.push({
    id: 'tf-rhythm',
    source: 'activatedTopic',
    fact: '생활 리듬·멘탈 흐름',
    plainMeaning: '리듬은 의학적 진단이 아니라 과로·수면·생각 과부하·감정 소모 결의 신호로 봅니다.',
    narrativeHint: '질병/치료/약물/진단 절대 금지. 루틴·휴식·생각 정리 결로만.' +
      (topicHasActivity('건강리듬') ? ' 리듬 주제 활성됨.' : ''),
    matchTokens: ['리듬', '루틴', '수면', '회복'],
    adviceHint: {
      actionable: '체력보다 생각을 내려놓는 루틴을 한 가지 더 두는 편이 좋습니다.',
    },
  });

  return facts;
}

// ============================================================
// Section: actionGuide
//   - 잡아야 할 것 / 흘려보낼 것 / 운 살리는 / 막는 / 한 문장 전략
// ============================================================
function buildActionGuideEvidence(a: YearlyFortuneAnalysis): YearlyMustUseFact[] {
  const facts: YearlyMustUseFact[] = [];

  facts.push({
    id: 'ag-usefulGod-action',
    source: 'yearElement',
    fact: `용신/기신 행동 번역 (${a.yearElementEffect.relationToUsefulGod})`,
    plainMeaning: a.yearElementEffect.plainMeaning,
    narrativeHint: '용신/기신을 부적·색상·방향 같은 미신 개운법으로 풀지 말 것. 행동·환경·구조화·역할 분담 중심.',
    matchTokens: ['용신', '기신', '개운', '운을 편하게', '운을 막는'],
    adviceHint: a.yearElementEffect.adviceHint,
  });

  facts.push({
    id: 'ag-strength-action',
    source: 'strengthImpact',
    fact: `신강/신약 행동 번역 (${a.strengthImpact.natalStrength} / ${a.strengthImpact.yearlyEffect})`,
    plainMeaning: a.strengthImpact.plainMeaning,
    narrativeHint: '신강/신약을 사람 강약 단정 금지. 추진/협업 구조 균형으로.',
    matchTokens: [a.strengthImpact.natalStrength, a.strengthImpact.yearlyEffect],
    adviceHint: a.strengthImpact.adviceHint,
  });

  facts.push({
    id: 'ag-must-catch',
    source: 'activatedTopic',
    fact: '올해 잡아야 할 것 (must-catch)',
    plainMeaning: '결과물로 남길 수 있는 일 / 조건이 명확한 협업 / 능력을 문서화하고 보상 기준 붙이는 기회.',
    narrativeHint: '구체 행동 3가지로 정리. 추상 표현 금지.',
    matchTokens: ['잡아야', '결과물', '조건이 명확', '문서화'],
    adviceHint: {
      actionable: '조건이 명확한 협업·결과물 남길 수 있는 일·능력의 가격 기준 정리.',
    },
  });

  facts.push({
    id: 'ag-let-go',
    source: 'activatedTopic',
    fact: '올해 흘려보낼 것 (let-go)',
    plainMeaning: '책임은 많은데 권한은 없는 자리 / 말은 많지만 행동이 없는 관계 / 기준 없이 부탁만 쌓이는 일.',
    narrativeHint: '구체 회피 행동 2~3가지. 단정 미래 사건 X.',
    matchTokens: ['흘려', '권한', '책임', '기준 없이'],
    adviceHint: {
      actionable: '들어오는 모든 기회·요청을 받지 말고 조건을 골라 받기.',
      avoidPattern: '거절하지 못해 떠안는 패턴.',
    },
  });

  facts.push({
    id: 'ag-one-line',
    source: 'activatedTopic',
    fact: '올해의 한 문장 전략',
    plainMeaning: '올해는 더 많이 버티는 해가 아니라, 내가 감당할 조건을 정하고 그 기준 안에서 움직일 때 운이 살아나는 해.',
    narrativeHint: '저장하고 싶을 만큼 기억에 남는 한 문장. "긍정적인 결과를 가져올" 같은 일반론 금지.',
    matchTokens: ['더 많이 버티는', '조건', '기준 안에서'],
  });

  return facts;
}

// ============================================================
// Section: nextTwoYears
//   - Y2g NextYearSummary 2개 → 2 fact
// ============================================================
function buildNextTwoYearsEvidence(a: YearlyFortuneAnalysis): YearlyMustUseFact[] {
  return a.nextTwoYears.map((n, i) => buildNextYearFact(n, i));
}

function buildNextYearFact(n: NextYearSummary, idx: number): YearlyMustUseFact {
  const topLabels = n.representativeInteractions.slice(0, 2).map(it => it.label).join(', ');
  return {
    id: `nty-year-${idx}`,
    source: 'nextYear',
    fact: `${n.year}년 (${n.ganji.display}, ${n.yearTenGod.stemTenGod}) — ${n.keyword}`,
    plainMeaning: n.summary,
    narrativeHint:
      `압축. 키워드 + 짧은 요약 + 잡으면 좋은 결(${n.opportunity}) + 주의(${n.caution}).` +
      (topLabels ? ` 두드러질 수 있는 작용: ${topLabels}.` : '') +
      ` 올해보다 길어지지 않게, 단정 예언 금지.`,
    matchTokens: [String(n.year), n.ganji.display, n.keyword.split(' — ').pop() ?? n.keyword],
    adviceHint: {
      actionable: n.opportunity,
      avoidPattern: n.caution,
    },
  };
}

// ============================================================
// Section: evidenceView
//   - LLM 호출 X — deterministic 데이터 직접 렌더용 fact 집합
// ============================================================
function buildEvidenceViewEvidence(a: YearlyFortuneAnalysis): YearlyMustUseFact[] {
  const facts: YearlyMustUseFact[] = [];

  facts.push({
    id: 'ev-yearGanji',
    source: 'yearGanji',
    fact: `세운 ${a.targetYear} = ${a.targetYearGanji.display}`,
    plainMeaning: `${a.targetYear}년의 60갑자 (입춘 기준)`,
    narrativeHint: 'evidenceView는 deterministic UI 렌더용 — LLM 호출 X.',
    matchTokens: [a.targetYearGanji.display, String(a.targetYear)],
  });

  facts.push({
    id: 'ev-currentDaewoon',
    source: 'currentDaewoon',
    fact: `현재 대운: ${a.currentDaewoon.pillar.pillarKo}`,
    plainMeaning: `${a.currentDaewoon.pillar.startAge}~${(a.currentDaewoon.pillar.startAge + 10).toFixed(1)}세 구간의 큰 환경.`,
    narrativeHint: '근거 카드',
    matchTokens: [a.currentDaewoon.pillar.pillarKo],
  });

  facts.push({
    id: 'ev-yearTenGod',
    source: 'yearTenGod',
    fact: `세운 십성: 천간 ${a.yearTenGod.stemTenGod} / 지지 본기 ${a.yearTenGod.branchMainTenGod}`,
    plainMeaning: a.yearTenGod.plainMeaning,
    narrativeHint: '근거 카드',
    matchTokens: [a.yearTenGod.stemTenGod, a.yearTenGod.branchMainTenGod],
  });

  facts.push({
    id: 'ev-elementVsUsefulGod',
    source: 'usefulGodInteraction',
    fact: `세운 오행 ${a.yearElementEffect.element} — 용신/기신 관계: ${a.yearElementEffect.relationToUsefulGod}`,
    plainMeaning: a.yearElementEffect.plainMeaning,
    narrativeHint: '근거 카드',
    matchTokens: [a.yearElementEffect.element, a.yearElementEffect.relationToUsefulGod],
  });

  // 모든 natal-sewoon 작용 (deterministic 모두 노출)
  for (const g of a.natalSewoonInteractions) {
    const labels = g.interactions.map(i => i.label).join(', ') || '두드러진 작용 없음';
    facts.push({
      id: `ev-natal-${g.pillar}`,
      source: 'natalSewoonInteraction',
      fact: `세운 ↔ ${g.pillarLabel}: ${labels}`,
      plainMeaning: g.plainMeaning,
      narrativeHint: '근거 카드',
      matchTokens: [g.pillarLabel, ...g.interactions.map(i => i.label)],
    });
  }

  // 대운-세운 작용
  facts.push({
    id: 'ev-daewoonSewoon',
    source: 'daewoonSewoonInteraction',
    fact: `대운(${a.currentDaewoon.pillar.pillarKo})-세운(${a.targetYearGanji.display}): ${a.daewoonSewoonInteraction.summary}`,
    plainMeaning: a.daewoonSewoonInteraction.plainMeaning,
    narrativeHint: '근거 카드',
    matchTokens: [a.currentDaewoon.pillar.pillarKo, a.targetYearGanji.display],
  });

  // 월운 요약 (각 월 한 줄)
  for (const m of a.remainingMonthlyFortunes) {
    facts.push({
      id: `ev-month-${m.monthLabel}`,
      source: 'monthlyFortune',
      fact: `${m.monthLabel} (${m.monthGanji.display}) — ${m.keyword}`,
      plainMeaning: `${m.periodLabel}. 활성 토픽: ${m.activatedTopics.join(', ') || '없음'}.`,
      narrativeHint: '근거 카드',
      matchTokens: [m.monthLabel, m.monthGanji.display],
    });
  }

  // 활성 신살 (있으면)
  for (const s of a.specialStarsActivated ?? []) {
    facts.push({
      id: `ev-star-${s.name}`,
      source: 'activatedSpecialStar',
      fact: `활성 신살: ${s.name} (${s.source})`,
      plainMeaning: s.plainMeaning,
      narrativeHint: '근거 카드 — 공포 해석 금지',
      matchTokens: [s.name],
    });
  }

  return facts;
}

// ============================================================
// 메인
// ============================================================
export function formatYearlyEvidence(analysis: YearlyFortuneAnalysis): FormattedYearlyEvidence {
  return {
    yearFlowCard:    buildYearFlowCardEvidence(analysis),
    yearlyMechanism: buildYearlyMechanismEvidence(analysis),
    remainingMonths: buildRemainingMonthsEvidence(analysis),
    topicFortunes:   buildTopicFortunesEvidence(analysis),
    actionGuide:     buildActionGuideEvidence(analysis),
    nextTwoYears:    buildNextTwoYearsEvidence(analysis),
    evidenceView:    buildEvidenceViewEvidence(analysis),
  };
}

// 중복 방지 검증용 helper (planBuilder/test에서 사용)
export function getOwnerSectionOf(factId: string): YearlyFortuneSectionId | null {
  if (factId.startsWith('yfc-')) return 'yearFlowCard';
  if (factId.startsWith('ym-'))  return 'yearlyMechanism';
  if (factId.startsWith('rm-'))  return 'remainingMonths';
  if (factId.startsWith('tf-'))  return 'topicFortunes';
  if (factId.startsWith('ag-'))  return 'actionGuide';
  if (factId.startsWith('nty-')) return 'nextTwoYears';
  if (factId.startsWith('ev-'))  return 'evidenceView';
  return null;
}

