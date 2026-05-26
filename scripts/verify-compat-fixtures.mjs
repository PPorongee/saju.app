// 실제 production API에 compat-narrative fixture 호출 → shape + highCount + 유형별 관심사 검증.
// 새 기능/문장 품질 평가 X. 안정화 회귀만.
//
// 이 스크립트는 실제 OpenAI 호출 비용/시간이 들고 외부 환경에 의존하므로
// 기본 CI/test에서 절대 실행되지 않아야 한다.
//
// 실행:
//   기본(off): node scripts/verify-compat-fixtures.mjs
//   LLM on:    RUN_LLM_INTEGRATION_TESTS=true node scripts/verify-compat-fixtures.mjs

if (process.env.RUN_LLM_INTEGRATION_TESTS !== 'true') {
  console.log('[verify-compat-fixtures] skipped — RUN_LLM_INTEGRATION_TESTS=true 로 실행');
  process.exit(0);
}

import {
  getCompatFixtures,
  assertCompatReportShape,
  relationshipFocusTokens,
} from './lib/compat-verify-helpers.mjs';

const API =
  process.env.COMPAT_API ?? 'https://www.starlight-saju.com/api/compat-narrative';
// secret mode 검증용 — COMPAT_NARRATIVE_VERIFY_SECRET이 서버에 설정된 경우 동일 값을 로컬 env로 전달.
// 값은 절대 커밋/로그 금지. 미설정이면 헤더 없이 호출.
const SECRET = process.env.COMPAT_VERIFY_SECRET;

const FIXTURES = getCompatFixtures();

async function fetchOne(fx) {
  const t0 = Date.now();
  const headers = { 'Content-Type': 'application/json' };
  if (SECRET) headers['x-compat-verify-secret'] = SECRET;
  const res = await fetch(API, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      inputA: fx.inputA,
      inputB: fx.inputB,
      relationshipType: fx.relationshipType,
      maxRepairAttempts: 0,
    }),
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { name: fx.name, error: `HTTP ${res.status} (${dt}s) — ${detail.slice(0, 200)}` };
  }
  const data = await res.json();
  return { name: fx.name, dt, data, relationshipType: fx.relationshipType };
}

function check(result) {
  const { data, relationshipType } = result;
  if (!data) return { fatalError: result.error };

  const issues = [];

  // 1. report shape 검증
  const report = data.report;
  if (!report) {
    return { fatalError: 'data.report 없음' };
  }
  const shapeResult = assertCompatReportShape(report);
  if (!shapeResult.ok) {
    for (const e of shapeResult.errors) issues.push(`[FAIL] report shape: ${e}`);
  } else {
    issues.push('[OK ] report shape 완전');
  }

  // 2. validation highCount
  const validation = data.validation;
  if (validation) {
    const highCount = validation.highCount ?? 0;
    if (highCount > 0) {
      issues.push(`[FAIL] validation highCount=${highCount}`);
    } else {
      issues.push('[OK ] validation highCount=0');
    }
  } else {
    issues.push('[WARN] validation 필드 없음 (응답 구조 확인 필요)');
  }

  // 3. 관계 유형별 관심사 토큰 ≥1 포함 확인
  const tokens = relationshipFocusTokens(relationshipType);
  if (tokens.length > 0) {
    // report의 주요 body 필드를 합쳐 검색
    const bodyText = [
      report.relationshipOverview?.body ?? '',
      report.relationshipOverview?.oneLine ?? '',
      report.attractionAndFriction?.body ?? '',
      report.repeatedPattern?.body ?? '',
      report.relationshipGuide?.body ?? '',
      report.finalAdvice?.body ?? '',
    ].join(' ');

    const found = tokens.some(tok => bodyText.includes(tok));
    if (found) {
      issues.push(`[OK ] 관계유형(${relationshipType}) 관심사 토큰 포함`);
    } else {
      issues.push(`[FAIL] 관계유형(${relationshipType}) 관심사 토큰 미포함 (기대: ${tokens.slice(0, 4).join(', ')} ...)`);
    }
  }

  const hasFail = issues.some(s => s.includes('[FAIL]'));
  return { issues, hasFail };
}

// 같은 쌍 다른 유형의 결과가 서로 다른지 옵션 비교
function compareTypeDiff(results) {
  // pairName 기준으로 그룹핑
  const byPair = {};
  for (const r of results) {
    if (!r.data?.report) continue;
    // name = "A-B/dating" 형태
    const slash = r.name.lastIndexOf('/');
    const pairKey = r.name.slice(0, slash);
    if (!byPair[pairKey]) byPair[pairKey] = [];
    byPair[pairKey].push(r);
  }

  const diffIssues = [];
  for (const [pair, pairResults] of Object.entries(byPair)) {
    if (pairResults.length < 2) continue;
    const bodies = pairResults.map(r => r.data?.report?.relationshipOverview?.body ?? '');
    const allSame = bodies.every(b => b === bodies[0]);
    if (allSame && bodies[0]) {
      diffIssues.push(`[WARN] ${pair} — 모든 유형의 relationshipOverview.body가 동일 (유형별 분화 없음 가능성)`);
    } else {
      diffIssues.push(`[OK ] ${pair} — 유형별 body 다름`);
    }
  }
  return diffIssues;
}

(async () => {
  console.log(`[verify-compat-fixtures] API=${API}`);
  console.log(`[verify-compat-fixtures] fixtures=${FIXTURES.length} (${BIRTH_PAIRS_COUNT}쌍 × 6유형)\n`);

  // 직렬 실행 (rate limit / 비용 제어)
  const results = [];
  for (const fx of FIXTURES) {
    const r = await fetchOne(fx);
    results.push(r);
  }

  let pass = 0;
  let fail = 0;

  for (const r of results) {
    console.log('━'.repeat(72));
    console.log(`■ ${r.name}  (${r.dt ?? '?'}s)`);
    if (r.error) {
      console.log(`  FATAL: ${r.error}`);
      fail++;
      continue;
    }
    const ck = check(r);
    if (ck.fatalError) {
      console.log(`  FATAL: ${ck.fatalError}`);
      fail++;
      continue;
    }
    for (const it of ck.issues) console.log(`  ${it}`);
    if (ck.hasFail) {
      fail++;
    } else {
      pass++;
    }
  }

  // 옵션: 유형별 분화 비교
  console.log('\n' + '━'.repeat(72));
  console.log('■ [옵션] 같은 쌍 다른 유형 분화 확인');
  for (const msg of compareTypeDiff(results)) {
    console.log(`  ${msg}`);
  }

  console.log('━'.repeat(72));
  console.log(`\n결과: ${pass}/${FIXTURES.length} PASS`);
  process.exit(fail > 0 ? 1 : 0);
})();

// BIRTH_PAIRS_COUNT는 getCompatFixtures에서 사용한 쌍 수
const BIRTH_PAIRS_COUNT = 3;
