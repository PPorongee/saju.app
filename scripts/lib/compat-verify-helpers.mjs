// compat-verify-helpers.mjs — 순수 헬퍼 (네트워크/env 의존 없음, TS import 없음).
//
// 사용처:
//   - scripts/verify-compat-fixtures.mjs (verify runner)
//   - src/domain/saju/tests/compatVerifyHelpers.test.ts (vitest)
//
// 이 파일은 plain Node ESM .mjs이다. TypeScript import는 절대 사용하지 않는다.

// ============================================================
// 생년월일 기반 birth input 헬퍼 (fixture 조립용)
// ============================================================

/** 3쌍의 출생 정보 × 6가지 관계 유형 = 18개 fixture */
const BIRTH_PAIRS = [
  {
    pairName: 'A-B',
    inputA: {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTime: '12:00',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    },
    inputB: {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1988-03-15',
      birthTime: '03:30',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    },
  },
  {
    pairName: 'A-C',
    inputA: {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '1995-07-06',
      birthTime: '12:00',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    },
    inputB: {
      gender: 'female',
      calendarType: 'solar',
      birthDate: '2001-11-22',
      birthTime: '20:45',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    },
  },
  {
    pairName: 'B-D',
    inputA: {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1988-03-15',
      birthTime: '03:30',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    },
    inputB: {
      gender: 'male',
      calendarType: 'solar',
      birthDate: '1983-08-10',
      birthTime: '06:00',
      birthTimeConfidence: 'exact',
      timezone: 'Asia/Seoul',
    },
  },
];

/** 6개 관계 유형 (compatibilityTypes.ts의 RELATIONSHIP_TYPES와 동일) */
const ALL_RELATIONSHIP_TYPES = [
  'dating',
  'married',
  'friendship',
  'coworker',
  'reunion_or_breakup',
  'crush_or_something',
];

/**
 * 검증용 fixture 목록.
 * 3쌍 × 6 관계 유형 = 18개.
 * 같은 쌍이 여러 관계 유형에서 다른 결과를 내는지 유형별 분화 확인용.
 *
 * @returns {{ name: string, inputA: object, inputB: object, relationshipType: string }[]}
 */
export function getCompatFixtures() {
  const fixtures = [];
  for (const pair of BIRTH_PAIRS) {
    for (const relationshipType of ALL_RELATIONSHIP_TYPES) {
      fixtures.push({
        name: `${pair.pairName}/${relationshipType}`,
        inputA: pair.inputA,
        inputB: pair.inputB,
        relationshipType,
      });
    }
  }
  return fixtures;
}

// ============================================================
// assertCompatReportShape
// ============================================================

/**
 * CompatibilityNarrativeReport 구조 검증.
 * 반환: { ok: boolean, errors: string[] }
 *
 * 확인 항목:
 *   - compatibilityCard: { title, keywords }
 *   - relationshipOverview: { oneLine, body }
 *   - relationshipMechanism: { body, evidenceBlocks }
 *   - attractionAndFriction: { body }
 *   - repeatedPattern: { body }
 *   - relationshipGuide: { body }
 *   - finalAdvice: { body }
 *   - evidenceView: 존재 (object)
 *
 * @param {unknown} report
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function assertCompatReportShape(report) {
  const errors = [];

  if (!report || typeof report !== 'object') {
    return { ok: false, errors: ['report가 object가 아님'] };
  }

  // compatibilityCard
  const cc = report.compatibilityCard;
  if (!cc || typeof cc !== 'object') {
    errors.push('compatibilityCard가 없음');
  } else {
    if (typeof cc.title !== 'string' || !cc.title) errors.push('compatibilityCard.title 누락');
    if (!Array.isArray(cc.keywords)) {
      errors.push('compatibilityCard.keywords가 배열이 아님');
    } else if (cc.keywords.length === 0) {
      errors.push('compatibilityCard.keywords 비어있음');
    }
  }

  // relationshipOverview
  const ro = report.relationshipOverview;
  if (!ro || typeof ro !== 'object') {
    errors.push('relationshipOverview가 없음');
  } else {
    if (typeof ro.oneLine !== 'string' || !ro.oneLine) errors.push('relationshipOverview.oneLine 누락');
    if (typeof ro.body !== 'string' || !ro.body) errors.push('relationshipOverview.body 누락');
  }

  // relationshipMechanism
  const rm = report.relationshipMechanism;
  if (!rm || typeof rm !== 'object') {
    errors.push('relationshipMechanism가 없음');
  } else {
    if (typeof rm.body !== 'string' || !rm.body) errors.push('relationshipMechanism.body 누락');
    if (!Array.isArray(rm.evidenceBlocks)) errors.push('relationshipMechanism.evidenceBlocks가 배열이 아님');
  }

  // attractionAndFriction
  const af = report.attractionAndFriction;
  if (!af || typeof af !== 'object') {
    errors.push('attractionAndFriction가 없음');
  } else {
    if (typeof af.body !== 'string' || !af.body) errors.push('attractionAndFriction.body 누락');
  }

  // repeatedPattern
  const rp = report.repeatedPattern;
  if (!rp || typeof rp !== 'object') {
    errors.push('repeatedPattern가 없음');
  } else {
    if (typeof rp.body !== 'string' || !rp.body) errors.push('repeatedPattern.body 누락');
  }

  // relationshipGuide
  const rg = report.relationshipGuide;
  if (!rg || typeof rg !== 'object') {
    errors.push('relationshipGuide가 없음');
  } else {
    if (typeof rg.body !== 'string' || !rg.body) errors.push('relationshipGuide.body 누락');
  }

  // finalAdvice
  const fa = report.finalAdvice;
  if (!fa || typeof fa !== 'object') {
    errors.push('finalAdvice가 없음');
  } else {
    if (typeof fa.body !== 'string' || !fa.body) errors.push('finalAdvice.body 누락');
  }

  // evidenceView
  if (!report.evidenceView || typeof report.evidenceView !== 'object') {
    errors.push('evidenceView가 없거나 object가 아님');
  }

  return { ok: errors.length === 0, errors };
}

// ============================================================
// relationshipFocusTokens
// ============================================================

/**
 * 관계 유형별로 기대하는 관심사 토큰 목록.
 * live 검증에서 report body에 이 토큰 중 ≥1 포함되는지 확인한다.
 * (plain JS 하드코딩 — TS RELATIONSHIP_TYPE_FOCUS의 primaryConcerns 요약.)
 *
 * @param {string} relationshipType
 * @returns {string[]}
 */
export function relationshipFocusTokens(relationshipType) {
  const MAP = {
    dating: ['끌리', '연락', '표현', '감정', '설레', '싸우', '안정'],
    married: ['생활', '역할', '분담', '책임', '가족', '갈등', '피로'],
    friendship: ['편한', '서운', '거리', '친구', '조언', '기대'],
    coworker: ['업무', '협업', '의사결정', '속도', '시너지', '역할', '실행'],
    reunion_or_breakup: ['재회', '이별', '반복', '감정', '조건', '정리', '신호'],
    crush_or_something: ['접근', '부담', '신호', '편하', '가까워', '확신'],
  };
  return MAP[relationshipType] ?? [];
}
