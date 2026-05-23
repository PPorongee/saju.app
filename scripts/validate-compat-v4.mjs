// Compat v4 시나리오 종단 검증 — 6개 관계 유형 모두 /api/compat-v4/preview 호출.
// 사용: node scripts/validate-compat-v4.mjs [BASE_URL]
//   BASE_URL 기본값: https://www.starlight-saju.com

const BASE_URL = process.argv[2] || process.env.BASE_URL || 'https://www.starlight-saju.com';
const ENDPOINT = BASE_URL + '/api/compat-v4/preview';

const RELATIONSHIP_TYPES = [
  'dating', 'married', 'friendship', 'coworker', 'reunion_or_breakup', 'crush_or_something',
];

// 카탈로그 13 ID — relationshipArchetypeCatalog.ts와 일치해야 함
const VALID_ARCHETYPE_IDS = new Set([
  'magnetic-pull', 'slow-burn-stability', 'growth-through-conflict', 'rule-needed-love',
  'practical-partner', 'unforgettable-ambiguous', 'unfinished-emotion', 'comfortable-friend-lover',
  'missing-piece', 'love-and-distance', 'comfortable-but-flat', 'fire-and-brake', 'karma-comedy',
]);

const inputA = {
  name: 'A', gender: 'unknown', calendarType: 'solar',
  birthDate: '1995-07-06', birthTime: '12:00',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};
const inputB = {
  name: 'B', gender: 'unknown', calendarType: 'solar',
  birthDate: '1990-03-15', birthTime: '09:30',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
};

async function checkOne(relationshipType) {
  const start = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputA, inputB, relationshipType }),
    });
    const ms = Date.now() - start;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { type: relationshipType, ok: false, status: res.status, ms, reason: `HTTP ${res.status}: ${text.slice(0, 200)}` };
    }
    const data = await res.json();
    const issues = [];
    if (!data?.compatibilityAnalysis) issues.push('compatibilityAnalysis 누락');
    const arch = data?.compatibilityAnalysis?.relationshipArchetype;
    if (!arch?.id) issues.push('archetype.id 누락');
    else if (!VALID_ARCHETYPE_IDS.has(arch.id)) issues.push('알 수 없는 archetype.id=' + arch.id);
    if (data?.relationshipType !== relationshipType) issues.push('relationshipType 불일치: 응답=' + data?.relationshipType);
    if (!Array.isArray(data?.relationshipQuestions) || data.relationshipQuestions.length !== 10) {
      issues.push('relationshipQuestions 길이 ≠ 10 (실제: ' + (data?.relationshipQuestions?.length ?? 'undefined') + ')');
    }
    const ff = data?.compatibilityAnalysis?.futureFlow;
    if (!Array.isArray(ff) || ff.length !== 3) issues.push('futureFlow 길이 ≠ 3 (실제: ' + (ff?.length ?? 'undefined') + ')');
    return { type: relationshipType, ok: issues.length === 0, status: 200, ms, issues, archetype: arch?.id };
  } catch (err) {
    const ms = Date.now() - start;
    return { type: relationshipType, ok: false, ms, reason: 'fetch 실패: ' + (err?.message ?? String(err)) };
  }
}

(async () => {
  console.log('[validate-compat-v4]', ENDPOINT);
  console.log('병렬 6 유형 호출...');
  const results = await Promise.all(RELATIONSHIP_TYPES.map(checkOne));
  let pass = 0;
  for (const r of results) {
    if (r.ok) {
      pass++;
      console.log('✅', r.type.padEnd(20), 'archetype=' + r.archetype, r.ms + 'ms');
    } else {
      console.log('❌', r.type.padEnd(20), r.reason || (r.issues || []).join(' / '));
    }
  }
  console.log('\n결과:', pass + '/' + RELATIONSHIP_TYPES.length);
  process.exit(pass === RELATIONSHIP_TYPES.length ? 0 : 1);
})();
