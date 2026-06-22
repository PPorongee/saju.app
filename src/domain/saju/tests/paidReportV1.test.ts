// Paid Report Productization V1 — 통합 + validator 테스트 (vitest).
//
// 정책(narrativePipeline.test.ts 와 동일):
//   - 실제 GPT/OpenAI 호출 없음. calculateAnalysisOnly + buildPaidReportV1(결정론)만 사용.
//   - A/B/C 세 실 샘플로 차별화·근거·금지문구·정확성·행운가이드 검증.
//
// 빌더(buildPaidReportV1)는 팀원이 작성 중일 수 있다. 없으면 통합 테스트는 skip하고
// validator 단위 테스트(6번)는 항상 실행한다. (import는 동적으로 — 빌더 부재가 파일 전체를 깨지 않게)

import { describe, it, expect, beforeAll } from 'vitest';
import { calculateAnalysisOnly } from '../generatePersonalSajuReport';
import type { BirthInput } from '../calendar/normalizeBirthInput';
import {
  validatePaidReportV1,
  FORBIDDEN_GENERIC_PHRASES,
} from '../paidReport/paidReportValidator';
import { FAVORABLE_ELEMENT_SYMBOLS } from '../paidReport/elementSymbols';
import { ELEMENT_KO, KO_TO_ELEMENT } from '../rules/elements';
import type { Element } from '../rules/elements';
import { buildPaidReportV1 } from '../paidReport/buildPaidReportV1';
import type {
  PaidSajuReportV1,
  PaidVerdictItem,
  PaidEvidenceMap,
} from '../paidReport/paidReportTypes';

const BUILDER_READY = true;

// 고정 now — 나이·세운 안정화.
const NOW = new Date('2026-06-06T12:00:00+09:00');

const base = {
  calendarType: 'solar' as const,
  timezone: 'Asia/Seoul',
};
const SAMPLES: Record<'A' | 'B' | 'C', BirthInput> = {
  A: { ...base, gender: 'female', birthDate: '1995-06-22', birthTime: '17:30', birthTimeConfidence: 'exact', birthPlace: '대전' },
  B: { ...base, gender: 'female', birthDate: '1995-07-06', birthTime: '11:49', birthTimeConfidence: 'exact', birthPlace: '서울' },
  C: { ...base, gender: 'male', birthDate: '1995-05-31', birthTime: '00:30', birthTimeConfidence: 'approximate', birthPlace: '경기' },
};
type SampleId = 'A' | 'B' | 'C';
const IDS: SampleId[] = ['A', 'B', 'C'];

function buildReport(id: SampleId): PaidSajuReportV1 {
  const gptInput = calculateAnalysisOnly(SAMPLES[id], NOW);
  return buildPaidReportV1!(gptInput);
}

// ── 텍스트 수집 헬퍼 ──
function itemTexts(arr?: PaidVerdictItem[]): string[] {
  return (arr ?? []).map(i => i.text);
}
function allVerdictTexts(r: PaidSajuReportV1): string[] {
  const out: string[] = [];
  const push = (s?: string) => { if (s) out.push(s); };
  push(r.archetypeCard?.verdict);
  push(r.archetypeCard?.oneLiner);
  push(r.coreSummary?.oneLiner);
  for (const w of r.weapons ?? []) push(w.verdict);
  for (const t of r.traps ?? []) push(t.verdict);
  push(r.peopleGuide?.verdict);
  push(r.moneyGuide?.verdict);
  push(r.timingGuide?.verdict);
  push(r.luckGuide?.verdict);
  push(r.careerGuide?.verdict);
  push(r.relationshipGuide?.verdict);
  const pg = r.peopleGuide;
  if (pg) out.push(...itemTexts(pg.closer), ...itemTexts(pg.avoid), ...itemTexts(pg.goodCollaborator), ...itemTexts(pg.avoidPattern));
  const mg = r.moneyGuide;
  if (mg) out.push(...itemTexts(mg.earnRoutes), ...itemTexts(mg.leakRoutes), ...itemTexts(mg.fitMonetization), ...itemTexts(mg.avoidMoneyStyle));
  const cg = r.careerGuide;
  if (cg) out.push(...itemTexts(cg.avoidEnvironments), ...itemTexts(cg.bestWorkStyle));
  const rg = r.relationshipGuide;
  if (rg) out.push(...itemTexts(rg.attractionStyle), ...itemTexts(rg.relationshipPattern), ...itemTexts(rg.whatHelps), ...itemTexts(rg.whatHurts));
  for (const y of r.timingGuide?.openingYears ?? []) push(y.label);
  for (const y of r.timingGuide?.cautionYears ?? []) push(y.label);
  return out.filter(Boolean);
}
function allReportText(r: PaidSajuReportV1): string {
  return allVerdictTexts(r).join(' \n ');
}

const describeBuilder = BUILDER_READY ? describe : describe.skip;

// ============================================================
// 통합 테스트 (빌더 필요)
// ============================================================
describeBuilder('Paid Report V1 — A/B/C 통합', () => {
  // 빌더가 있어도 describe.skip은 body를 collect하므로 빌드는 beforeAll로 지연시킨다.
  const reports: Record<SampleId, PaidSajuReportV1> = {} as any;
  beforeAll(() => {
    reports.A = buildReport('A');
    reports.B = buildReport('B');
    reports.C = buildReport('C');
  });

  // pairwise 차이 검사 헬퍼
  function assertPairwiseDifferent(label: string, valueOf: (r: PaidSajuReportV1) => string) {
    const pairs: [SampleId, SampleId][] = [['A', 'B'], ['A', 'C'], ['B', 'C']];
    for (const [x, y] of pairs) {
      const vx = valueOf(reports[x]);
      const vy = valueOf(reports[y]);
      expect(vx, `${label}: ${x} vs ${y} 가 동일하면 안 됨`).not.toBe(vy);
    }
  }

  // ── 1. differentiation ──
  describe('1) differentiation — A/B/C 모듈이 동일하지 않음', () => {
    it('archetype.nickname pairwise 차이', () => {
      assertPairwiseDifferent('nickname', r => r.archetypeCard.nickname);
    });
    it('weapons (verdict set) pairwise 차이', () => {
      // title은 섹션 라벨("나의 무기")이라 동일 — 실제 차별점은 verdict(무기 이름).
      assertPairwiseDifferent('weapons', r => (r.weapons ?? []).map(w => w.verdict).sort().join('|'));
    });
    it('traps (verdict set) pairwise 차이', () => {
      assertPairwiseDifferent('traps', r => (r.traps ?? []).map(t => t.verdict).sort().join('|'));
    });
    it('peopleGuide.closer texts pairwise 차이', () => {
      assertPairwiseDifferent('closer', r => itemTexts(r.peopleGuide.closer).join('|'));
    });
    it('moneyGuide.earnRoutes texts pairwise 차이', () => {
      assertPairwiseDifferent('earnRoutes', r => itemTexts(r.moneyGuide.earnRoutes).join('|'));
    });
    it('luckGuide (full signature) pairwise 차이', () => {
      // colors는 용신이 같으면 합치될 수 있음(분석값 기반이라 정상). 기신 기반 blocking 포함 전체 시그니처로 비교.
      assertPairwiseDifferent('luckGuide', r => [
        (r.luckGuide.colors ?? []).join(','),
        (r.luckGuide.places ?? []).join(','),
        (r.luckGuide.routines ?? []).join(','),
        (r.luckGuide.blockingEnvironments ?? []).join(','),
      ].join(' || '));
    });
    it('timingGuide pairwise 차이 (openingYears why)', () => {
      // label은 순화된 고정 문구라 동일 — 실제 차별점은 chart 파생 why.
      assertPairwiseDifferent('timing', r =>
        (r.timingGuide.openingYears ?? []).map(y => `${y.year}:${y.why}`).join('|'));
    });
  });

  // ── 2. evidence-required ──
  describe('2) evidence-required — 모든 visible verdict가 근거 보유', () => {
    for (const id of IDS) {
      it(`${id}: validator가 missing-evidence / evidence-id-dangling 0건`, () => {
        const r = reports[id];
        const { validation, ...rest } = r;
        const result = validatePaidReportV1(rest);
        const evidenceIssues = result.issues.filter(
          i => i.type === 'missing-evidence' || i.type === 'evidence-id-dangling'
        );
        expect(evidenceIssues, JSON.stringify(evidenceIssues, null, 2)).toEqual([]);
      });
    }
  });

  // ── 3. forbidden-phrase / high issues ──
  describe('3) forbidden-phrase — high 0건 + 금지 범용 문구 없음', () => {
    for (const id of IDS) {
      it(`${id}: validatePaidReportV1 high issue 0건`, () => {
        const { validation, ...rest } = reports[id];
        const result = validatePaidReportV1(rest);
        const highs = result.issues.filter(i => i.severity === 'high');
        expect(highs, JSON.stringify(highs, null, 2)).toEqual([]);
        expect(result.highCount).toBe(0);
      });
      it(`${id}: 리포트 텍스트에 FORBIDDEN_GENERIC_PHRASES 미포함`, () => {
        const text = allReportText(reports[id]);
        const hits = FORBIDDEN_GENERIC_PHRASES
          .filter(fp => fp.pattern.test(text))
          .map(fp => fp.label);
        expect(hits, `금지 문구 검출: ${hits.join(', ')}`).toEqual([]);
      });
    }
  });

  // ── 4. accuracy-consistency ──
  describe('4) accuracy-consistency — A/C(신약/매우신약)', () => {
    function isWeak(r: PaidSajuReportV1): boolean {
      const s = (r.meta.strength ?? '').toLowerCase();
      return s.includes('weak') || s.includes('신약') || s.includes('매우');
    }

    it('A: 신약이면 "혼자 버티는 힘" 미포함', () => {
      const r = reports.A;
      if (!isWeak(r)) return; // 신약이 아니면 이 검사는 적용 안 함(보수적)
      expect(allReportText(r)).not.toContain('혼자 버티는 힘');
    });
    it('C: 신약/매우신약이면 "혼자 버티는 힘" 미포함', () => {
      const r = reports.C;
      if (!isWeak(r)) return;
      expect(allReportText(r)).not.toContain('혼자 버티는 힘');
    });
    it('C: peopleGuide가 귀인 언급 (천을귀인 존재 시)', () => {
      const r = reports.C;
      const gpt: any = calculateAnalysisOnly(SAMPLES.C, NOW);
      const stars: string[] = (gpt.coreAnalysis?.specialStars ?? []).map((s: any) => String(s?.name ?? s));
      const hasNobleStar = stars.some(s => s.includes('천을귀인'));
      if (!hasNobleStar) return; // 천을귀인 없으면 skip(보수적)
      const peopleText = [
        r.peopleGuide.verdict,
        ...itemTexts(r.peopleGuide.closer),
        ...itemTexts(r.peopleGuide.goodCollaborator),
      ].join(' ');
      expect(peopleText).toMatch(/귀인/);
    });
  });

  // ── 5. luckGuide correctness ──
  describe('5) luckGuide correctness — colors ⊆ 차트 favorable 오행 팔레트 합집합', () => {
    for (const id of IDS) {
      it(`${id}: luckGuide.colors가 용신/희신 오행 팔레트의 합집합에 포함`, () => {
        const r = reports[id];
        const colors = r.luckGuide.colors ?? [];
        expect(colors.length).toBeGreaterThan(0);
        // 빌더는 primary 용신 + secondary 희신 팔레트를 블렌드한다. → 차트 favorable 오행들의 합집합으로 검사.
        const gpt: any = calculateAnalysisOnly(SAMPLES[id], NOW);
        const ug = gpt.coreAnalysis.usefulGod;
        const favEls = new Set<Element>();
        if (ug.primaryUseful?.type === 'element') favEls.add(ug.primaryUseful.value);
        for (const f of ug.favorable ?? []) {
          if (typeof f === 'string' && (f as Element) in FAVORABLE_ELEMENT_SYMBOLS) favEls.add(f as Element);
        }
        const palette = new Set<string>();
        for (const el of favEls) FAVORABLE_ELEMENT_SYMBOLS[el].colors.forEach(c => palette.add(c));
        const outside = colors.filter(c => !palette.has(c));
        expect(outside, `favorable=${[...favEls].join(',')} 팔레트 밖의 색: ${outside.join(',')}`).toEqual([]);
      });
    }
  });
});

// ============================================================
// 6. validator 단위 테스트 (빌더 불필요 — 항상 실행)
// ============================================================
describe('6) validator 단위 — hand-built report', () => {
  // 최소 골격 헬퍼 — 필수 필드만 채운 PaidModuleBase 류.
  function mkModule(id: string, verdict: string, evidenceIds: string[]): any {
    return {
      id, title: id, verdict, evidenceIds,
      confidence: 'medium', displayPriority: 1, riskLevel: 'none', forbiddenClaims: [],
    };
  }
  function mkItem(text: string, evidenceIds: string[]): PaidVerdictItem {
    return { text, why: '근거', evidenceIds };
  }

  function baseEvidenceMap(): PaidEvidenceMap {
    return {
      'tenGod:상관': { id: 'tenGod:상관', source: 'tenGod', label: '상관', detail: '표현·재능' },
      'usefulGod:primary': { id: 'usefulGod:primary', source: 'usefulGod', label: '용신', detail: '용신' },
    };
  }

  /** validator가 받는 형태(validation 제외)로 최소 리포트 골격을 만든다. */
  function mkReport(overrides: Partial<Omit<PaidSajuReportV1, 'validation'>> = {}): Omit<PaidSajuReportV1, 'validation'> {
    const ev = baseEvidenceMap();
    const okMod = (id: string) => mkModule(id, `${id} 판정 한 줄`, ['tenGod:상관']);
    return {
      meta: {
        version: 'paid-v1', dayMaster: '갑', dayMasterElement: 'wood',
        strength: 'medium', generatedDeterministically: true, microcopyApplied: false,
      },
      archetypeCard: { ...mkModule('archetype', '맑은 물 같은 별', ['tenGod:상관']), nickname: '맑은 물 같은 별', oneLiner: '한 줄', keywords: ['a'], brightSide: 'b', shadowSide: 's' },
      coreSummary: { keywords: ['a'], oneLiner: '핵심 한 줄', evidenceIds: ['tenGod:상관'] },
      weapons: [{ ...okMod('weapon-1'), scene: '장면', howToUse: '활용' }],
      traps: [{ ...okMod('trap-1'), pattern: '패턴', escape: '탈출' }],
      peopleGuide: { ...okMod('peopleGuide'), closer: [mkItem('이런 사람을 가까이', ['tenGod:상관'])], avoid: [], goodCollaborator: [], avoidPattern: [] },
      moneyGuide: { ...okMod('moneyGuide'), earnRoutes: [mkItem('이렇게 돈이 붙어', ['tenGod:상관'])], leakRoutes: [], fitMonetization: [], avoidMoneyStyle: [] },
      timingGuide: { ...okMod('timingGuide'), openingYears: [], cautionYears: [] },
      luckGuide: { ...okMod('luckGuide'), items: [], colors: ['초록', '연두'], places: [], routines: [], blockingEnvironments: [] },
      careerGuide: { ...okMod('careerGuide'), topFits: [], conditionalFits: [], avoidEnvironments: [], bestWorkStyle: [] },
      relationshipGuide: { ...okMod('relationshipGuide'), attractionStyle: [], relationshipPattern: [], whatHelps: [], whatHurts: [] },
      detailedNarrative: { sections: [] },
      evidenceMap: ev,
      ...overrides,
    } as Omit<PaidSajuReportV1, 'validation'>;
  }

  it('깨끗한 리포트 → high 0건, isValid=true', () => {
    const r = validatePaidReportV1(mkReport());
    expect(r.highCount).toBe(0);
    expect(r.isValid).toBe(true);
  });

  it('빈 evidenceIds 아이템 → missing-evidence(high) 발동', () => {
    const report = mkReport({
      moneyGuide: { ...mkModule('moneyGuide', 'moneyGuide 판정', ['tenGod:상관']),
        earnRoutes: [mkItem('근거 없는 돈 루트', [])], leakRoutes: [], fitMonetization: [], avoidMoneyStyle: [] } as any,
    });
    const r = validatePaidReportV1(report);
    const issue = r.issues.find(i => i.type === 'missing-evidence');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('high');
    expect(r.isValid).toBe(false);
  });

  it('evidenceMap에 없는 evidenceId → evidence-id-dangling(high)', () => {
    const report = mkReport({
      weapons: [{ ...mkModule('weapon-1', '없는 근거를 가리킴', ['tenGod:존재안함']), scene: 's', howToUse: 'h' }] as any,
    });
    const r = validatePaidReportV1(report);
    const issue = r.issues.find(i => i.type === 'evidence-id-dangling');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('high');
  });

  it('planted "기준을 세워라" → forbidden-generic-phrase(medium)', () => {
    const report = mkReport({
      weapons: [{ ...mkModule('weapon-1', '일단 기준을 세워라', ['tenGod:상관']), scene: 's', howToUse: 'h' }] as any,
    });
    const r = validatePaidReportV1(report);
    const issue = r.issues.find(i => i.type === 'forbidden-generic-phrase');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('medium');
    // forbidden phrase는 medium이라 high count에는 영향 없음
    expect(r.highCount).toBe(0);
  });

  it('신약 + "혼자 버티는 힘" → accuracy-conflict(high)', () => {
    const report = mkReport({
      meta: { version: 'paid-v1', dayMaster: '갑', dayMasterElement: 'wood', strength: 'very-weak', generatedDeterministically: true, microcopyApplied: false },
      weapons: [{ ...mkModule('weapon-1', '너의 무기는 혼자 버티는 힘', ['tenGod:상관']), scene: 's', howToUse: 'h' }] as any,
    });
    const r = validatePaidReportV1(report);
    const issue = r.issues.find(i => i.type === 'accuracy-conflict');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('high');
  });

  it('guarantee-claim("대박") → medium', () => {
    const report = mkReport({
      moneyGuide: { ...mkModule('moneyGuide', '이건 대박 난다', ['tenGod:상관']),
        earnRoutes: [], leakRoutes: [], fitMonetization: [], avoidMoneyStyle: [] } as any,
    });
    const r = validatePaidReportV1(report);
    const issue = r.issues.find(i => i.type === 'guarantee-claim');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('medium');
  });

  it('unsafe-claim("꼭 결혼") → high', () => {
    const report = mkReport({
      relationshipGuide: { ...mkModule('relationshipGuide', '내년에 꼭 결혼한다', ['tenGod:상관']),
        attractionStyle: [], relationshipPattern: [], whatHelps: [], whatHurts: [] } as any,
    });
    const r = validatePaidReportV1(report);
    const issue = r.issues.find(i => i.type === 'unsafe-claim');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('high');
  });

  it('duplicate-across-modules → 동일 문장이 2모듈 → medium', () => {
    const dup = '이 사주는 표현으로 길이 열리는 흐름이다';
    const report = mkReport({
      weapons: [{ ...mkModule('weapon-1', dup, ['tenGod:상관']), scene: 's', howToUse: 'h' }] as any,
      traps: [{ ...mkModule('trap-1', dup, ['tenGod:상관']), pattern: 'p', escape: 'e' }] as any,
    });
    const r = validatePaidReportV1(report);
    const issue = r.issues.find(i => i.type === 'duplicate-across-modules');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('medium');
  });

  it('luckGuide blockingEnvironments가 favorable 권장환경과 충돌 → accuracy-conflict(high)', () => {
    // colors=['초록','연두'] → wood favorable. wood 권장 routine "아침 산책"을 blocking에 넣으면 충돌.
    const report = mkReport({
      luckGuide: { ...mkModule('luckGuide', 'luck 판정', ['tenGod:상관']),
        items: [], colors: ['초록', '연두'], places: [], routines: [],
        blockingEnvironments: ['아침 산책'] } as any,
    });
    const r = validatePaidReportV1(report);
    const issue = r.issues.find(i => i.type === 'accuracy-conflict' && i.moduleId === 'luckGuide');
    expect(issue).toBeTruthy();
    expect(issue!.severity).toBe('high');
  });

  it('FORBIDDEN_GENERIC_PHRASES에 오행 근접 문구가 5개 포함된다', () => {
    const labels = FORBIDDEN_GENERIC_PHRASES.map(p => p.label);
    const elementProximity = labels.filter(l => l.startsWith('generic-element-proximity'));
    expect(elementProximity.length).toBe(5);
    // "혼자 버티는 힘"도 단일 출처에 존재
    expect(labels).toContain('endure-alone-strength');
  });
});

// ============================================================
// 7. 회귀 — 시간미상 + 신약 차트에서 신강 결 무기('버티는 힘')가 섞이지 않음
//    (lifeWeapons가 '위기 때 끝까지 버티는 힘'을 top에 올려도 very-weak 차트엔 노출 금지)
// ============================================================
describe('7) 회귀 — hourUnknown/신약 차트 정확성', () => {
  const EDGE: BirthInput[] = [
    { ...base, gender: 'female', birthDate: '1990-03-15', birthTimeConfidence: 'unknown' },
    { ...base, gender: 'male', birthDate: '2001-11-09', birthTimeConfidence: 'unknown' },
  ];
  for (const input of EDGE) {
    it(`${input.birthDate} ${input.gender} 시간미상: high 0건 + 신약이면 '버티는 힘' 무기 없음`, () => {
      const g: any = calculateAnalysisOnly(input, NOW);
      const r = buildPaidReportV1(g);
      expect(r.validation.highCount, JSON.stringify(r.validation.issues.filter(i => i.severity === 'high'), null, 2)).toBe(0);
      const lv = String(g.coreAnalysis.dayMasterStrength.level);
      if (lv === 'weak' || lv === 'very-weak') {
        const weaponVerdicts = r.weapons.map(w => w.verdict).join(' | ');
        expect(weaponVerdicts).not.toMatch(/버티는\s*힘/);
      }
    });
  }
});

// 빌더 부재 시 안내 (테스트로 잡히게)
describe('빌더 가용성', () => {
  it(BUILDER_READY ? '빌더 로드됨 — 통합 테스트 실행' : '빌더 미작성 — 통합 테스트 skip(validator 단위만 실행)', () => {
    expect(true).toBe(true);
  });
});

// 사용되지 않는 import 방어 (KO_TO_ELEMENT/ELEMENT_KO 참조 보장)
void KO_TO_ELEMENT; void ELEMENT_KO;
