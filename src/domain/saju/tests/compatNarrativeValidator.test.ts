// 궁합 narrative V4 — Phase 4 Sanitizer + Validator 테스트 (LLM 호출 X).
//
// 검증:
//   - 각 sanitizer: fatalism/운명/상대 마음 단정 → 잔존 0, english key→한글, log leak strip,
//     applyCompatFinalSanitizers 통합.
//   - 각 HIGH issue type이 crafted mock report로 트리거됨 (severity high).
//   - 품질 issue는 medium (generic-advice/repeated-content 등 NOT high).
//   - valid mock report → highCount 0, isValid true.
//   - json-parse-failed / finish-length via generatorFlags → high.
//
// bundle은 calculateAnalysisOnly → composeCompatibilityAnalysis로 구성 (Phase 2/3 동일).

import { describe, it, expect } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import { composeCompatibilityAnalysis } from '../compatibility/compatibilityAnalyzer';
import { buildCompatNarrativePlans } from '../compatibility/narrative/compatPlanBuilder';
import {
  buildCompatNarrativeContext,
  type CompatibilityNarrativeReport,
  type CompatNarrativeContext,
  type CompatNarrativePlanSet,
} from '../compatibility/narrative/compatNarrativeTypes';
import { type RelationshipType, type CompatibilityAnalysisBundle } from '../compatibility/compatibilityTypes';
import {
  validateCompatNarrativeReport,
  type CompatNarrativeValidatorInput,
} from '../compatibility/narrative/compatNarrativeValidator';
import {
  sanitizeRelationshipFatalism,
  sanitizeDeterministicRelationshipPrediction,
  sanitizeUnsupportedUserContext,
  sanitizeEnglishElementKeys,
  sanitizeValidatorLogLeak,
  applyCompatFinalSanitizers,
} from '../compatibility/narrative/compatSanitizer';
import type { BirthInput } from '../calendar/normalizeBirthInput';

const NOW = new Date('2026-05-24T00:00:00Z');

const PAIR: { a: BirthInput; b: BirthInput } = {
  a: { gender: 'female', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  b: { gender: 'male', calendarType: 'solar', birthDate: '1988-03-15', birthTime: '03:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
};

function bundleOf(type: RelationshipType): CompatibilityAnalysisBundle {
  const personA = calculateAnalysisOnly(PAIR.a, NOW);
  const personB = calculateAnalysisOnly(PAIR.b, NOW);
  return composeCompatibilityAnalysis(personA, personB, type);
}

// ============================================================
// valid mock report — highCount 0 / isValid true 가 되도록 구성.
//   mustUseFact 토큰(일간·일지·합·충 등) + 유형 focus 토큰 + 관계 장면 + 같은 뿌리 표현 포함.
// ============================================================
function buildValidMockReport(ctx: CompatNarrativeContext): CompatibilityNarrativeReport {
  // 유형 관심사 토큰 일부를 본문에 흡수 (focus-missing / qna 회피)
  const concern = ctx.focus.primaryConcerns[0];
  return {
    compatibilityCard: { title: '서로를 비추는 거울 같은 사이', snsPhrase: '닮아서 끌리고 닮아서 부딪히는', keywords: ['거울', '속도', '거리'] },
    relationshipOverview: {
      oneLine: '닮은 결이 많아 빠르게 편해지지만 같은 자리에서 다른 기대가 드러나는 사이',
      body: '두 사람은 처음에는 결이 비슷해 빠르게 가까워지지만, 가까워질수록 같은 지점에서 서로 다른 기대가 드러나는 사이에 가깝습니다. 잘 맞을 때는 부족한 부분을 자연스럽게 채워주고, 어긋날 때는 바로 그 지점에서 답답함이 올라오기 쉽습니다.',
    },
    relationshipMechanism: {
      body: `두 사람의 일간이 만나는 기본 기운은 한쪽이 조금 더 끌고 가는 결이라, 한 사람이 분위기를 이끄는 흐름이 자연스럽게 생깁니다. 오행으로 보면 서로 부족한 부분을 채워주는 결이 있고, 십성으로는 상대가 책임처럼 느껴지는 자리가 있습니다. 용신과 기신이 함께 자극받아 편한 기운과 부담스러운 기운이 같이 올라옵니다. 가장 가까운 자리인 일지에서는 강하게 끌어당기는 동시에 생활 리듬이 흔들리는 결이 함께 있어서, 끌어당기는 결과 흔들리는 결이 같이 옵니다. 그래서 이 관계는 거리를 잘 조절할수록 편해지는 구조입니다.`,
      evidenceBlocks: [
        {
          sectionId: 'relationshipMechanism',
          evidence: [{ label: '일지 결', plainMeaning: '가장 가까운 자리의 맞물림', role: 'main' }],
          causalExplanation: '가까운 자리에서 끌림과 흔들림이 함께 생깁니다.',
          betweenScene: '같이 있는 시간이 길어질 때 생활 리듬에서 결이 갈리는 순간',
          positiveUse: '서로의 속도를 미리 맞춰두기',
          shadowPattern: '한쪽이 끌고 다른 쪽이 끌려가며 지치는 패턴',
          practicalAdvice: '거리와 속도를 함께 정해두기',
        },
      ],
    },
    attractionAndFriction: {
      body: '처음에는 망설임 없이 밀고 나가는 모습에 끌리지만, 가까워지면 바로 그 단호함이 내 속도가 무시당한다는 느낌으로 바뀌기 쉽습니다. 끌렸던 특성과 부담스러운 특성이 사실 같은 뿌리에서 나오기 때문에, 그 특성을 없애려 하기보다 언제 켜고 끌지를 함께 정하는 편이 낫습니다. 함께 있는 장면에서 이 결이 자주 드러납니다.',
    },
    repeatedPattern: {
      body: `한 사람이 빠르게 풀고 싶어 다가갈 때 다른 사람은 혼자 정리할 시간이 필요해서, 다가갈수록 더 멀어지는 흐름이 반복되기 쉽습니다. 싸울 때 이 순서를 미리 알고 지금은 식히는 시간이라고 이름 붙여두면, 같은 장면이 와도 덜 흔들립니다. ${concern} 같은 부분도 이 흐름 안에서 함께 풀어가면 좋습니다.`,
    },
    relationshipGuide: {
      body: '감정이 올라온 그 자리에서 바로 풀려고 하기보다, 오늘은 여기까지 말하고 내일 이어가자처럼 한 번 끊는 약속을 미리 정해두는 편이 낫습니다. 역할도 둘 다 끌고 가려다 부딪히기보다, 결정하는 사람과 챙기는 사람을 상황별로 번갈아 맡으면 마찰이 줄어듭니다.',
    },
    finalAdvice: {
      body: `이 관계는 잘 맞고 안 맞고로 나눌 관계라기보다, 서로의 속도와 거리를 어디까지 맞출 수 있는지를 보고 선택할 관계에 가깝습니다. 그 기준만 분명히 해두면 흔들림 없이 같은 방향을 볼 수 있습니다. ${concern} 관점에서도 같은 기준이 도움이 됩니다.`,
    },
    evidenceView: {
      relationshipType: ctx.relationshipType,
      relationshipTypeKo: ctx.relationshipTypeKo,
      archetypeTitle: '거울 관계',
      dayMasterRelation: { relation: 'same-element', balance: 'mutual', plain: '비슷한 기운' },
      spousePalaceRelation: { kinds: [], intensity: 'medium', plain: '보통' },
      elementComplement: { aNeedsFromB: [], bNeedsFromA: [], mutual: 'moderate' },
      tenGodInteraction: { aFeelsBAs: [], bFeelsAAs: [] },
      usefulGodInteraction: { plain: '보통' },
      combinationConflicts: { combinations: [], conflicts: [], punishments: [], destructions: [], harms: [] },
    },
  };
}

function inputFor(
  type: RelationshipType,
  mutate?: (r: CompatibilityNarrativeReport) => void,
  generatorFlags?: CompatNarrativeValidatorInput['generatorFlags'],
): CompatNarrativeValidatorInput {
  const bundle = bundleOf(type);
  const ctx = buildCompatNarrativeContext(type);
  const plans: CompatNarrativePlanSet = buildCompatNarrativePlans(bundle, ctx);
  const report = buildValidMockReport(ctx);
  if (mutate) mutate(report);
  return { report, bundle, plans, ctx, generatorFlags };
}

// ============================================================
// SAN — Sanitizer 단위
// ============================================================
describe('SAN-1 sanitizeRelationshipFatalism', () => {
  it('운명/반드시 헤어진다/상대 마음 단정 → 잔존 0', () => {
    const cases = [
      '두 분은 반드시 헤어집니다.',
      '이 사람은 운명입니다.',
      '상대는 당신을 좋아하지 않습니다.',
      '상대는 반드시 돌아옵니다.',
      '무조건 재회합니다.',
      '두 사람은 천생연분입니다.',
    ];
    for (const c of cases) {
      const out = sanitizeRelationshipFatalism(c);
      expect(out).not.toContain('반드시');
      expect(out).not.toMatch(/운명입니다/);
      expect(out).not.toMatch(/좋아하지\s*않습니다/);
      expect(out).not.toMatch(/천생연분/);
    }
  });

  it('대표 치환 예시가 안전 톤으로 바뀐다', () => {
    expect(sanitizeRelationshipFatalism('반드시 헤어집니다')).toContain('관계 결의 변화');
    expect(sanitizeRelationshipFatalism('이 사람은 운명입니다')).toContain('강하게 연결되는 흐름');
    expect(sanitizeRelationshipFatalism('상대는 당신을 좋아하지 않습니다')).toContain('단정하기 어렵');
  });
});

describe('SAN-2 sanitizeDeterministicRelationshipPrediction', () => {
  it('결혼/이혼/재회 단정 → 가능성/신호 톤', () => {
    expect(sanitizeDeterministicRelationshipPrediction('내년에 결혼합니다.')).toContain('가능성');
    expect(sanitizeDeterministicRelationshipPrediction('두 사람은 이혼할 것입니다.')).toMatch(/신호|변화/);
    expect(sanitizeDeterministicRelationshipPrediction('곧 재회합니다.')).toContain('가능성');
    const out = sanitizeDeterministicRelationshipPrediction('결혼합니다');
    expect(out).not.toMatch(/결혼합니다$/);
  });
});

describe('SAN-3 sanitizeUnsupportedUserContext (배우자궁 보존)', () => {
  it('미혼 컨텍스트에서 아내/남편/배우자 단정은 중립화하되 "배우자궁"은 보존', () => {
    const ctx = { relationshipType: 'dating' as RelationshipType, relationshipStatus: 'dating', hasChildren: 'unknown' as const };
    const out = sanitizeUnsupportedUserContext('당신의 아내는 배우자궁에 영향을 줍니다.', ctx);
    expect(out).toContain('배우자궁'); // 명리 용어 보존
    expect(out).not.toMatch(/아내는/); // 단정 표현 중립화
  });

  it('married면 배우자 표현 보존', () => {
    const ctx = { relationshipType: 'married' as RelationshipType, relationshipStatus: 'married', hasChildren: 'unknown' as const };
    const out = sanitizeUnsupportedUserContext('배우자와의 생활 리듬', ctx);
    expect(out).toContain('배우자');
  });
});

describe('SAN-4 sanitizeEnglishElementKeys', () => {
  it('wood/fire/earth/metal/water → 한글', () => {
    const out = sanitizeEnglishElementKeys('wood and Fire vs EARTH, metal, water');
    expect(out).toContain('목');
    expect(out).toContain('화');
    expect(out).toContain('토');
    expect(out).toContain('금');
    expect(out).toContain('수');
    expect(out).not.toMatch(/wood|fire|earth|metal|water/i);
  });
});

describe('SAN-5 sanitizeValidatorLogLeak', () => {
  it('fact id / sectionId / issue type / 내부 schema 토큰 제거', () => {
    const out = sanitizeValidatorLogLeak('mech-dayMaster sectionId relationshipMechanism mustUseFacts relationship-fatalism validator');
    expect(out).not.toContain('mech-dayMaster');
    expect(out).not.toContain('sectionId');
    expect(out).not.toContain('mustUseFacts');
    expect(out).not.toContain('relationship-fatalism');
    expect(out).not.toMatch(/relationshipMechanism/);
  });
});

describe('SAN-6 applyCompatFinalSanitizers 통합', () => {
  it('체인 적용 후 fatalism/english/log leak 잔존 0', () => {
    const ctx = { relationshipType: 'reunion_or_breakup' as RelationshipType, relationshipStatus: 'unknown', hasChildren: 'unknown' as const };
    const dirty = '두 분은 반드시 재회합니다. wood 기운이 강합니다. fact id: fa-archetypeAdvice. 상대는 당신을 좋아하지 않습니다.';
    const out = applyCompatFinalSanitizers(dirty, ctx);
    expect(out).not.toContain('반드시');
    expect(out).not.toMatch(/\bwood\b/i);
    expect(out).not.toContain('fa-archetypeAdvice');
    expect(out).not.toMatch(/좋아하지\s*않습니다/);
  });
});

// ============================================================
// VAL — Validator HIGH issues
// ============================================================
describe('VAL-1 HIGH issues (사용자 노출 위험)', () => {
  it('relationship-fatalism → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.finalAdvice.body = '두 분은 반드시 헤어집니다.';
    }));
    const iss = r.issues.find(i => i.type === 'relationship-fatalism');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('high');
    expect(r.highCount).toBeGreaterThan(0);
  });

  it('score-leak ("궁합 87점") → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.relationshipOverview.body += ' 궁합 87점입니다.';
    }));
    const iss = r.issues.find(i => i.type === 'score-leak');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('high');
  });

  it('deterministic-future-claim (결혼 단정) → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.finalAdvice.body = '두 사람은 내년에 결혼합니다.';
    }));
    // fatalism이 먼저 잡힐 수도 있으나 deterministic 또는 fatalism 중 하나는 high
    const det = r.issues.find(i => i.type === 'deterministic-future-claim');
    expect(det).toBeTruthy();
    expect(det!.severity).toBe('high');
  });

  it('fear-based-claim → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.repeatedPattern.body = '이 관계는 끝장납니다.';
    }));
    const iss = r.issues.find(i => i.type === 'fear-based-claim');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('high');
  });

  it('invented-evidence (없는 신살 "도화") → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.relationshipMechanism.body += ' 두 사람 사이에는 도화 기운이 강합니다.';
    }));
    const iss = r.issues.find(i => i.type === 'invented-evidence');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('high');
  });

  it('validator-log-output (fact id 노출) → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.relationshipGuide.body += ' (mech-dayMaster 근거)';
    }));
    const iss = r.issues.find(i => i.type === 'validator-log-output');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('high');
  });

  it('unsupported-user-context (미혼인데 아내 단정) → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.repeatedPattern.body += ' 당신의 아내는 이렇게 반응합니다.';
    }));
    const iss = r.issues.find(i => i.type === 'unsupported-user-context');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('high');
  });

  it('cross-section-leak (finalAdvice가 여러 연도 재서술) → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.finalAdvice.body = '2026년에는 가까워지고 2027년에는 거리가 생기고 2028년에는 다시 정리됩니다.';
    }));
    const iss = r.issues.find(i => i.type === 'cross-section-leak');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('high');
  });

  it('section-missing (relationshipMechanism 비움) → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.relationshipMechanism.body = '';
      rep.relationshipMechanism.evidenceBlocks = [];
    }));
    const iss = r.issues.find(i => i.type === 'section-missing' && i.sectionId === 'relationshipMechanism');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('high');
  });

  it('json-parse-failed / finish-length via generatorFlags → high', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', undefined, {
      jsonParseFailedSections: ['repeatedPattern'],
      finishLengthSections: ['relationshipMechanism'],
    }));
    const parse = r.issues.find(i => i.type === 'json-parse-failed');
    const len = r.issues.find(i => i.type === 'finish-length');
    expect(parse).toBeTruthy();
    expect(parse!.severity).toBe('high');
    expect(len).toBeTruthy();
    expect(len!.severity).toBe('high');
  });
});

// ============================================================
// VAL — Validator MEDIUM issues (품질 = medium, NOT high)
// ============================================================
describe('VAL-2 MEDIUM issues (품질 — high 아님)', () => {
  it('generic-advice → medium', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.relationshipGuide.body = '서로 노력하고 소통이 중요합니다.';
    }));
    const iss = r.issues.find(i => i.type === 'generic-advice');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('medium');
    // 품질 이슈는 highCount를 올리면 안 됨 (다른 high가 없는 한)
  });

  it('repeated-content → medium', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      const dup = '두 사람은 같은 자리에서 서로 다른 기대가 드러나는 사이에 가깝습니다.';
      rep.attractionAndFriction.body = dup;
      rep.repeatedPattern.body = dup;
    }));
    const iss = r.issues.find(i => i.type === 'repeated-content');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('medium');
  });

  it('weak-evidence-to-narrative (evidenceBlocks 비움) → medium', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.relationshipMechanism.evidenceBlocks = [];
    }));
    const iss = r.issues.find(i => i.type === 'weak-evidence-to-narrative');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('medium');
  });

  it('attraction-friction-too-separated → medium', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.attractionAndFriction.body = '서로 다른 점에 끌립니다. 그리고 다른 점에서 부딪힙니다.';
    }));
    const iss = r.issues.find(i => i.type === 'attraction-friction-too-separated');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('medium');
  });

  it('weak-final-advice (앞 섹션 재요약) → medium', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.finalAdvice.body = '앞에서 말했듯이 두 사람은 거리를 조절하면 됩니다.';
    }));
    const iss = r.issues.find(i => i.type === 'weak-final-advice');
    expect(iss).toBeTruthy();
    expect(iss!.severity).toBe('medium');
  });
});

// ============================================================
// VAL — valid mock report
// ============================================================
describe('VAL-3 valid mock report', () => {
  it('clean report → highCount 0, isValid true (모든 유형)', () => {
    const types: RelationshipType[] = ['dating', 'married', 'friendship', 'coworker', 'reunion_or_breakup', 'crush_or_something'];
    for (const type of types) {
      const r = validateCompatNarrativeReport(inputFor(type));
      expect(r.highCount, `${type} highCount`).toBe(0);
      expect(r.isValid, `${type} isValid`).toBe(true);
    }
  });
});

// ============================================================
// VAL — 집계/repair 정책
// ============================================================
describe('VAL-4 집계 + repair 정책', () => {
  it('high 1+ → shouldRepair true + repairTargets 포함', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.finalAdvice.body = '두 분은 반드시 헤어집니다.';
    }));
    expect(r.shouldRepair).toBe(true);
    // global high는 relationshipMechanism로 redirect
    expect(r.repairTargets.length).toBeGreaterThan(0);
  });

  it('partition counts 일관성', () => {
    const r = validateCompatNarrativeReport(inputFor('dating', rep => {
      rep.relationshipGuide.body = '서로 노력하고 소통이 중요합니다.';
    }));
    expect(r.highCount + r.mediumCount + r.lowCount).toBe(r.issues.length);
  });
});
