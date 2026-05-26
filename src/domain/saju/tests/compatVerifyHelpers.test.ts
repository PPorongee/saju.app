// compatVerifyHelpers.test.ts — scripts/lib/compat-verify-helpers.mjs 순수 헬퍼 단위 테스트.
//
// 정책:
//   - 네트워크 호출 절대 없음. 실제 OpenAI/GptCaller import 없음.
//   - vitest는 .mjs를 직접 import 가능.
//   - TS strict:false — assert 필요 시 as 사용.

import { describe, it, expect } from 'vitest';
import {
  getCompatFixtures,
  assertCompatReportShape,
  relationshipFocusTokens,
} from '../../../../scripts/lib/compat-verify-helpers.mjs';

// 6개 관계 유형 (RELATIONSHIP_TYPES와 동일)
const ALL_RELATIONSHIP_TYPES = [
  'dating',
  'married',
  'friendship',
  'coworker',
  'reunion_or_breakup',
  'crush_or_something',
] as const;

// ============================================================
// getCompatFixtures
// ============================================================
describe('getCompatFixtures', () => {
  it('비어있지 않은 배열 반환', () => {
    const fixtures = getCompatFixtures();
    expect(Array.isArray(fixtures)).toBe(true);
    expect(fixtures.length).toBeGreaterThan(0);
  });

  it('fixture 수는 ≥ 18 (3쌍 × 6유형)', () => {
    const fixtures = getCompatFixtures();
    expect(fixtures.length).toBeGreaterThanOrEqual(18);
  });

  it('각 fixture는 name·inputA·inputB·relationshipType을 가짐', () => {
    const fixtures = getCompatFixtures();
    for (const fx of fixtures) {
      expect(typeof fx.name).toBe('string');
      expect(fx.name.length).toBeGreaterThan(0);
      expect(fx.inputA).toBeTruthy();
      expect(typeof fx.inputA).toBe('object');
      expect(fx.inputB).toBeTruthy();
      expect(typeof fx.inputB).toBe('object');
      expect(typeof fx.relationshipType).toBe('string');
    }
  });

  it('각 fixture inputA·inputB는 birthDate와 timezone을 가짐', () => {
    const fixtures = getCompatFixtures();
    for (const fx of fixtures) {
      expect(typeof (fx.inputA as any).birthDate).toBe('string');
      expect(typeof (fx.inputA as any).timezone).toBe('string');
      expect(typeof (fx.inputB as any).birthDate).toBe('string');
      expect(typeof (fx.inputB as any).timezone).toBe('string');
    }
  });

  it('출생 쌍이 ≥ 3쌍 포함됨 (pairName 기준)', () => {
    const fixtures = getCompatFixtures();
    // name = "A-B/dating" 형태 — "/" 앞이 pair 이름
    const pairs = new Set(fixtures.map(fx => fx.name.split('/')[0]));
    expect(pairs.size).toBeGreaterThanOrEqual(3);
  });

  it('6개 관계 유형이 모두 포함됨', () => {
    const fixtures = getCompatFixtures();
    const types = new Set(fixtures.map(fx => fx.relationshipType));
    for (const t of ALL_RELATIONSHIP_TYPES) {
      expect(types.has(t)).toBe(true);
    }
  });
});

// ============================================================
// assertCompatReportShape
// ============================================================

/** 모든 필수 필드를 갖춘 최소 유효 report mock */
function makeCompleteReport() {
  return {
    compatibilityCard: {
      title: '테스트 관계 제목',
      snsPhrase: 'SNS 문구',
      keywords: ['끌림', '충돌', '성장'],
    },
    relationshipOverview: {
      oneLine: '두 사람은 서로 끌리면서도 부딪힌다.',
      body: '관계 핵심 분위기 본문 텍스트',
    },
    relationshipMechanism: {
      body: '명리 구조 원인 본문',
      evidenceBlocks: [
        {
          evidence: [{ label: '일지 충', plainMeaning: '일지가 충하는 관계', role: 'main' }],
          causalExplanation: '원인 설명',
          betweenScene: '관계 장면',
          positiveUse: '좋게 작동할 때',
          shadowPattern: '꼬일 때',
          practicalAdvice: '실용 조언',
        },
      ],
    },
    attractionAndFriction: { body: '끌림과 마찰 본문' },
    repeatedPattern: { body: '반복 패턴 본문' },
    relationshipGuide: { body: '관계 가이드 본문' },
    finalAdvice: { body: '최종 조언 본문' },
    evidenceView: {
      relationshipType: 'dating',
      relationshipTypeKo: '연애중',
      archetypeTitle: '아키타입 제목',
      dayMasterRelation: { relation: 'mutual', balance: 'mutual', plain: '서로 균형' },
      spousePalaceRelation: { kinds: [], intensity: 'moderate', plain: '배우자궁 관계' },
      elementComplement: { aNeedsFromB: [], bNeedsFromA: [], mutual: '상호' },
      tenGodInteraction: { aFeelsBAs: [], bFeelsAAs: [] },
      usefulGodInteraction: { plain: '용신 상호작용' },
      combinationConflicts: {
        combinations: [],
        conflicts: [],
        punishments: [],
        destructions: [],
        harms: [],
      },
    },
  };
}

describe('assertCompatReportShape', () => {
  it('완전한 report mock에서 ok=true', () => {
    const result = assertCompatReportShape(makeCompleteReport());
    expect(result.ok).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('빈 객체 {}에서 ok=false, errors 비어있지 않음', () => {
    const result = assertCompatReportShape({});
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('null에서 ok=false', () => {
    const result = assertCompatReportShape(null);
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('compatibilityCard 누락 시 ok=false, errors에 compatibilityCard 언급', () => {
    const report = makeCompleteReport() as any;
    delete report.compatibilityCard;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes('compatibilityCard'))).toBe(true);
  });

  it('compatibilityCard.title 누락 시 ok=false', () => {
    const report = makeCompleteReport() as any;
    delete report.compatibilityCard.title;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes('title'))).toBe(true);
  });

  it('compatibilityCard.keywords 빈 배열 시 ok=false', () => {
    const report = makeCompleteReport() as any;
    report.compatibilityCard.keywords = [];
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes('keywords'))).toBe(true);
  });

  it('relationshipOverview 누락 시 ok=false', () => {
    const report = makeCompleteReport() as any;
    delete report.relationshipOverview;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes('relationshipOverview'))).toBe(true);
  });

  it('relationshipOverview.body 누락 시 ok=false', () => {
    const report = makeCompleteReport() as any;
    delete report.relationshipOverview.body;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
  });

  it('relationshipMechanism 누락 시 ok=false', () => {
    const report = makeCompleteReport() as any;
    delete report.relationshipMechanism;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes('relationshipMechanism'))).toBe(true);
  });

  it('attractionAndFriction.body 누락 시 ok=false', () => {
    const report = makeCompleteReport() as any;
    delete report.attractionAndFriction.body;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
  });

  it('repeatedPattern.body 누락 시 ok=false', () => {
    const report = makeCompleteReport() as any;
    delete report.repeatedPattern.body;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
  });

  it('relationshipGuide.body 누락 시 ok=false', () => {
    const report = makeCompleteReport() as any;
    delete report.relationshipGuide.body;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
  });

  it('finalAdvice.body 누락 시 ok=false', () => {
    const report = makeCompleteReport() as any;
    delete report.finalAdvice.body;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
  });

  it('evidenceView 누락 시 ok=false, errors에 evidenceView 언급', () => {
    const report = makeCompleteReport() as any;
    delete report.evidenceView;
    const result = assertCompatReportShape(report);
    expect(result.ok).toBe(false);
    expect(result.errors.some((e: string) => e.includes('evidenceView'))).toBe(true);
  });
});

// ============================================================
// relationshipFocusTokens
// ============================================================
describe('relationshipFocusTokens', () => {
  it('6개 관계 유형 각각에서 비어있지 않은 토큰 배열 반환', () => {
    for (const t of ALL_RELATIONSHIP_TYPES) {
      const tokens = relationshipFocusTokens(t);
      expect(Array.isArray(tokens)).toBe(true);
      expect(tokens.length).toBeGreaterThan(0);
    }
  });

  it('dating 토큰에 연애 관련 키워드 포함', () => {
    const tokens = relationshipFocusTokens('dating');
    // 끌리/연락/표현/감정 중 하나 이상 포함
    const hasOne = tokens.some((t: string) =>
      ['끌리', '연락', '표현', '감정', '설레'].includes(t),
    );
    expect(hasOne).toBe(true);
  });

  it('married 토큰에 생활 관련 키워드 포함', () => {
    const tokens = relationshipFocusTokens('married');
    const hasOne = tokens.some((t: string) =>
      ['생활', '역할', '분담', '책임', '가족'].includes(t),
    );
    expect(hasOne).toBe(true);
  });

  it('coworker 토큰에 업무 관련 키워드 포함', () => {
    const tokens = relationshipFocusTokens('coworker');
    const hasOne = tokens.some((t: string) =>
      ['업무', '협업', '의사결정', '속도', '시너지'].includes(t),
    );
    expect(hasOne).toBe(true);
  });

  it('알 수 없는 유형에서 빈 배열 반환', () => {
    const tokens = relationshipFocusTokens('unknown_type');
    expect(Array.isArray(tokens)).toBe(true);
    expect(tokens.length).toBe(0);
  });
});
