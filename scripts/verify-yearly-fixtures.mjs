// 실제 production API에 yearly-fortune 3 fixture 호출 → shape + highCount 검증.
// 새 기능/문장 품질 평가 X. 안정화 회귀만.
//
// 이 스크립트는 실제 OpenAI 호출 비용/시간이 들고 외부 환경에 의존하므로
// 기본 CI/test에서 절대 실행되지 않아야 한다.
// 실행:
//   기본(off): node scripts/verify-yearly-fixtures.mjs
//   LLM on:    RUN_LLM_INTEGRATION_TESTS=true node scripts/verify-yearly-fixtures.mjs

if (process.env.RUN_LLM_INTEGRATION_TESTS !== 'true') {
  console.log('[verify-yearly-fixtures] skipped — 실제 GPT 호출. 실행: RUN_LLM_INTEGRATION_TESTS=true node scripts/verify-yearly-fixtures.mjs');
  process.exit(0);
}

import { assertReportShape } from './lib/yearly-verify-helpers.mjs';

const API = process.env.YEARLY_API ?? 'https://www.starlight-saju.com/api/yearly-fortune';
const CURRENT_DATE = '2026-05-25';
// secret mode 검증용 — YEARLY_FORTUNE_VERIFY_SECRET이 서버에 설정된 경우 동일 값을 로컬 env로 전달.
// 값은 절대 커밋/로그 금지. 미설정이면 헤더 없이 호출(공개/비밀 미설정 환경).
const VERIFY_SECRET = process.env.YEARLY_VERIFY_SECRET;

// verify-narrative-fixtures.mjs 와 동일한 3 birth inputs 사용.
const FIXTURES = [
  {
    name: 'A (1995-07-06 12:00 여)',
    input: {
      birth: {
        gender: 'female',
        calendarType: 'solar',
        birthDate: '1995-07-06',
        birthTime: '12:00',
        birthTimeConfidence: 'exact',
        timezone: 'Asia/Seoul',
      },
      currentDate: CURRENT_DATE,
      relationshipStatus: 'unknown',
    },
  },
  {
    name: 'B (1988-03-15 03:30 남)',
    input: {
      birth: {
        gender: 'male',
        calendarType: 'solar',
        birthDate: '1988-03-15',
        birthTime: '03:30',
        birthTimeConfidence: 'exact',
        timezone: 'Asia/Seoul',
      },
      currentDate: CURRENT_DATE,
      relationshipStatus: 'unknown',
    },
  },
  {
    name: 'C (2001-11-22 20:45 여)',
    input: {
      birth: {
        gender: 'female',
        calendarType: 'solar',
        birthDate: '2001-11-22',
        birthTime: '20:45',
        birthTimeConfidence: 'exact',
        timezone: 'Asia/Seoul',
      },
      currentDate: CURRENT_DATE,
      relationshipStatus: 'unknown',
    },
  },
];

async function fetchOne(fx) {
  const t0 = Date.now();
  const headers = { 'Content-Type': 'application/json' };
  if (VERIFY_SECRET) headers['x-yearly-verify-secret'] = VERIFY_SECRET;
  const res = await fetch(API, {
    method: 'POST',
    headers,
    body: JSON.stringify({ input: fx.input, maxRepairAttempts: 0 }),
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { name: fx.name, error: `HTTP ${res.status} (${dt}s) — ${detail.slice(0, 200)}` };
  }
  const data = await res.json();
  return { name: fx.name, dt, data };
}

function check(result) {
  const { data } = result;
  if (!data) return { fatalError: result.error };

  const issues = [];

  // 1. report shape 검증
  const report = data.report ?? data;
  const shapeResult = assertReportShape(report);
  if (!shapeResult.ok) {
    for (const e of shapeResult.errors) issues.push(`[FAIL] report shape: ${e}`);
  } else {
    issues.push('[OK ] report shape 완전');
  }

  // 2. validation highCount
  const validation = data.validation;
  if (validation) {
    const highCount = validation.highCount ?? (validation.issues?.filter(i => i.severity === 'high').length ?? 0);
    if (highCount > 0) {
      const highIssues = (validation.issues ?? []).filter(i => i.severity === 'high');
      issues.push(`[FAIL] validation highCount=${highCount}`);
      for (const iss of highIssues) {
        issues.push(`  - [${iss.type}/${iss.sectionId}] "${(iss.sentence ?? '').slice(0, 80)}" — ${(iss.reason ?? '').slice(0, 120)}`);
      }
    } else {
      issues.push('[OK ] validation highCount=0');
    }
  } else {
    issues.push('[WARN] validation 필드 없음 (응답 구조 확인 필요)');
  }

  const hasFail = issues.some(s => s.includes('[FAIL]'));
  return { issues, hasFail };
}

(async () => {
  console.log(`[verify-yearly-fixtures] API=${API}\n`);
  const results = await Promise.all(FIXTURES.map(fetchOne));
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
    for (const it of ck.issues) console.log(`  ${it}`);
    if (ck.hasFail) {
      fail++;
    } else {
      pass++;
    }
  }

  console.log('━'.repeat(72));
  console.log(`\n결과: ${pass}/${FIXTURES.length} PASS`);
  process.exit(fail > 0 ? 1 : 0);
})();
