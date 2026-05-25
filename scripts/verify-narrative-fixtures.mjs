// 실제 production API에 3 fixture 호출 → 안정화 + Narrative Depth v1 자동 검증.
// 새 기능/문장 품질 평가 X. 안정화 회귀 + depth 흡수만.
//
// 이 스크립트는 실제 OpenAI 호출 비용/시간이 들고 외부 환경에 의존하므로
// 기본 CI/test에서 절대 실행되지 않아야 한다.
// 실행:
//   기본(off): RUN_LLM_INTEGRATION_TESTS=true node scripts/verify-narrative-fixtures.mjs
//   depth on:  RUN_LLM_INTEGRATION_TESTS=true SAJU_DEPTH=on node scripts/verify-narrative-fixtures.mjs

if (process.env.RUN_LLM_INTEGRATION_TESTS !== 'true') {
  console.log('[verify-narrative-fixtures] skipped — 이 스크립트는 실제 production GPT를 호출합니다.');
  console.log('의도적으로 실행하려면: RUN_LLM_INTEGRATION_TESTS=true node scripts/verify-narrative-fixtures.mjs');
  process.exit(0);
}

const API = process.env.SAJU_V4_API ?? 'https://www.starlight-saju.com/api/saju-v4';
const DEPTH_MODE = process.env.SAJU_DEPTH === 'on';
const DEPTH_OPTIONS = DEPTH_MODE ? {
  useEvidenceNarrativeBlocks: true,
  useSajuOpeningLuckCondition: true,
  useFinalGaewoonDirection: true,
} : {
  useEvidenceNarrativeBlocks: false,
  useSajuOpeningLuckCondition: false,
  useFinalGaewoonDirection: false,
};

const FIXTURES = [
  {
    name: 'A (1995-07-06 12:00 여)',
    input: {
      name: 'A', gender: 'female',
      calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00',
      birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
      relationshipStatus: 'unknown', hasChildren: 'unknown',
      occupation: '', currentConcerns: [],
    },
  },
  {
    name: 'B (1988-03-15 03:30 남)',
    input: {
      name: 'B', gender: 'male',
      calendarType: 'solar', birthDate: '1988-03-15', birthTime: '03:30',
      birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
      relationshipStatus: 'unknown', hasChildren: 'unknown',
      occupation: '', currentConcerns: [],
    },
  },
  {
    name: 'C (2001-11-22 20:45 여)',
    input: {
      name: 'C', gender: 'female',
      calendarType: 'solar', birthDate: '2001-11-22', birthTime: '20:45',
      birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
      relationshipStatus: 'unknown', hasChildren: 'unknown',
      occupation: '', currentConcerns: [],
    },
  },
];

async function fetchOne(fx) {
  const t0 = Date.now();
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: fx.input, maxRepairAttempts: 1, depthOptions: DEPTH_OPTIONS }),
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    return { name: fx.name, error: `HTTP ${res.status} (${dt}s) — ${detail.slice(0, 200)}` };
  }
  const data = await res.json();
  return { name: fx.name, dt, data };
}

function splitSections(md) {
  // 핫픽스 정규식과 동일
  const re = /^#{1,3}\s*(\d+)\s*[.:)]\s+(.+)$/gm;
  const matches = [];
  let m;
  while ((m = re.exec(md)) !== null) matches.push({ start: m.index, idx: Number(m[1]) });
  const SECTION_IDS = [
    'openingDefinition', 'lifeStructureNarrative', 'repeatedPatternNarrative',
    'careerTalentNarrative', 'moneyMonetizationNarrative', 'relationshipLoveNarrative',
    'finalStrategyNarrative',
  ];
  const out = Object.fromEntries(SECTION_IDS.map(k => [k, '']));
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i], next = matches[i + 1];
    if (cur.idx < 1 || cur.idx > 7) continue;
    const headerEnd = md.indexOf('\n', cur.start);
    const bodyStart = headerEnd >= 0 ? headerEnd + 1 : cur.start;
    const bodyEnd = next ? next.start : md.length;
    out[SECTION_IDS[cur.idx - 1]] = md.slice(bodyStart, bodyEnd).trim();
  }
  return out;
}

function check(result) {
  const { data } = result;
  if (!data) return { fatalError: result.error };
  const md = data.reportText ?? '';
  const dm = data.birthChart?.dayMaster ?? '';
  const sec = splitSections(md);
  const issues = [];

  // 1. 임수 → 큰 산 비유 적용 검사
  const isImsu = dm.startsWith('임');
  if (isImsu && /큰\s*산|넓은\s*땅/.test(md)) {
    issues.push(`#1 [FAIL] 임수 일간인데 "큰 산/넓은 땅" 등장 (dictionary 비유 임수=강/바다와 충돌)`);
  } else {
    issues.push(`#1 [OK ] dayMaster=${dm}, "큰 산/넓은 땅" 잘못된 적용 없음`);
  }

  // 2. 영문 오행 key 노출
  const engKey = md.match(/\b(wood|fire|earth|metal|water)\b/i);
  if (engKey) issues.push(`#2 [FAIL] 영문 오행 키 노출: "${engKey[0]}"`);
  else issues.push(`#2 [OK ] 영문 오행 키 노출 없음`);

  // 3. includeFutureFlow=false 미래 단어 leak
  const futureLeak = md.match(/\b202[6-9]년|\b203\d년|앞으로\s*3년|올해\s*하반기/);
  if (futureLeak) issues.push(`#3 [FAIL] 미래 단어 등장: "${futureLeak[0]}"`);
  else issues.push(`#3 [OK ] 미래 단어 leak 없음`);

  // 4. money 본문에 미래운세 leak (위 #3과 별도로 섹션 한정 검사)
  const moneyFuture = (sec.moneyMonetizationNarrative ?? '').match(/\b202[6-9]년|앞으로\s*3년/);
  if (moneyFuture) issues.push(`#4 [FAIL] money에 미래운세 등장: "${moneyFuture[0]}"`);
  else issues.push(`#4 [OK ] money 섹션에 미래운세 없음`);

  // 5. relationship 본문에 finalStrategy 결론조 leak
  const relFinal = (sec.relationshipLoveNarrative ?? '').match(/결국\s*이\s*사주는|사주의\s*사용법|이\s*사주를\s*어떻게\s*써야/);
  if (relFinal) issues.push(`#5 [FAIL] relationship에 결론조 등장: "${relFinal[0]}"`);
  else issues.push(`#5 [OK ] relationship 섹션에 결론조 없음`);

  // 6. finalStrategy 누락 / 한 문장 종료
  const finalLen = (sec.finalStrategyNarrative ?? '').replace(/\s+/g, '').length;
  const finalSentenceCount = (sec.finalStrategyNarrative ?? '').split(/[.!?]\s/).filter(s => s.trim()).length;
  if (finalLen < 200) issues.push(`#6 [FAIL] finalStrategy 본문 너무 짧음 (compactLen=${finalLen}, sentence=${finalSentenceCount})`);
  else issues.push(`#6 [OK ] finalStrategy compactLen=${finalLen}, sentence=${finalSentenceCount}`);

  // 7~10. Narrative Depth v1 검사 (depth on일 때만 PASS 조건 의미 있음)
  const lifeBody = sec.lifeStructureNarrative ?? '';
  const finalBody = sec.finalStrategyNarrative ?? '';

  // #7 신강/신약/중화 반영
  const strengthHit = /신강|신약|중화/.test(lifeBody);
  issues.push(
    DEPTH_MODE
      ? (strengthHit ? `#7 [OK ] lifeStructure에 신강/신약/중화 단어 반영` : `#7 [FAIL] lifeStructure에 신강/신약/중화 단어 없음 (depth on인데 흡수되지 않음)`)
      : (strengthHit ? `#7 [INFO] lifeStructure에 신강/신약/중화 단어 있음 (depth off에서도 흡수됨)` : `#7 [INFO] depth off — 신강/신약 단어 없음 (정상)`)
  );

  // #8 대표 신살 깊이 풀이
  const KNOWN_STARS = ['양인','괴강','백호','도화','홍염','화개','역마','천을귀인','문창귀인','학당귀인','월덕귀인','천덕귀인'];
  const presentStars = (data.coreAnalysis?.specialStars ?? []).map(s => s.name).filter(n => KNOWN_STARS.includes(n));
  let starsExplained = 0;
  let starsShallow = 0;
  for (const name of presentStars) {
    if (!lifeBody.includes(name)) continue;
    const pos = lifeBody.indexOf(name);
    const window = lifeBody.slice(Math.max(0, pos - 60), Math.min(lifeBody.length, pos + name.length + 100));
    const hasExplain = /쉽게|말하면|풀면|풀어|처럼|비유|뜻|의미|라는 건|이라는 건|에 가까|와 비슷|같은 기운|같은 힘/.test(window);
    if (hasExplain) starsExplained++;
    else starsShallow++;
  }
  issues.push(
    DEPTH_MODE
      ? (starsExplained >= 1
          ? `#8 [OK ] 대표 신살 ${starsExplained}개 풀이 동반 (얕은 언급 ${starsShallow}개)`
          : `#8 [FAIL] 대표 신살 풀이 동반 0개 (얕은 언급 ${starsShallow}개) — special-star-too-shallow 가능`)
      : `#8 [INFO] depth off — 대표 신살 풀이 ${starsExplained}, 얕은 ${starsShallow}`
  );

  // #9 용신/기신 행동 조언 연결
  const ugHit = /용신|기신|도와주는 결|편하게 살려|과해지면/.test(finalBody);
  issues.push(
    DEPTH_MODE
      ? (ugHit ? `#9 [OK ] final에 용신/기신 결 반영` : `#9 [FAIL] final에 용신/기신 결 없음 — missing-useful-god-advice 가능`)
      : `#9 [INFO] depth off — 용신 단어 ${ugHit ? '있음' : '없음'}`
  );

  // #10 개운 방향 포함
  const gaewoonHit = /개운|운을 편하게|운이 살아나|운을 막는|운이 막히는/.test(finalBody);
  issues.push(
    DEPTH_MODE
      ? (gaewoonHit ? `#10 [OK ] final에 개운 방향 반영` : `#10 [FAIL] final에 개운 방향 없음 — gaewoon-direction-missing 가능`)
      : `#10 [INFO] depth off — 개운 키워드 ${gaewoonHit ? '있음' : '없음'}`
  );

  // 보조 — 섹션별 본문 길이
  const lens = Object.fromEntries(
    Object.entries(sec).map(([k, v]) => [k, v.replace(/\s+/g, '').length])
  );
  // 진단 — # 헤더 개수와 첫 200자
  const headerMatches = md.match(/^#{1,3}\s*\d+\s*[.:)]\s+.+$/gm) ?? [];
  const headerCount = headerMatches.length;
  const headers = headerMatches.slice(0, 10);
  const first200 = md.slice(0, 200);
  return { dm, totalLen: md.replace(/\s+/g, '').length, lens, issues, validation: data.validation, headerCount, headers, first200 };
}

(async () => {
  console.log(`[verify-narrative-fixtures] API=${API}  DEPTH_MODE=${DEPTH_MODE ? 'on' : 'off'}\n`);
  const results = await Promise.all(FIXTURES.map(fetchOne));
  for (const r of results) {
    console.log('━'.repeat(72));
    console.log(`■ ${r.name}  (${r.dt ?? '?'}s)`);
    if (r.error) {
      console.log(`  FATAL: ${r.error}`);
      continue;
    }
    const ck = check(r);
    console.log(`  dayMaster: ${ck.dm}`);
    console.log(`  reportText compactLen: ${ck.totalLen}`);
    console.log(`  header count: ${ck.headerCount}`);
    console.log(`  headers found:`);
    for (const h of ck.headers) console.log(`    ${h.trim()}`);
    console.log(`  first 200 chars: ${JSON.stringify(ck.first200)}`);
    console.log(`  section lengths:`);
    for (const [k, v] of Object.entries(ck.lens)) console.log(`    ${k}: ${v}`);
    if (ck.validation) {
      const highIssues = ck.validation.issues?.filter(i => i.severity === 'high') ?? [];
      const m = ck.validation.issues?.filter(i => i.severity === 'medium').length ?? 0;
      console.log(`  validation: isValid=${ck.validation.isValid}, high=${highIssues.length}, medium=${m}`);
      if (highIssues.length > 0) {
        console.log(`  HIGH issues:`);
        for (const iss of highIssues) {
          console.log(`    - [${iss.type}/${iss.sectionId}] "${(iss.sentence ?? '').slice(0, 80)}" — ${(iss.reason ?? '').slice(0, 120)}`);
        }
      }
    }
    console.log(`  check items:`);
    for (const it of ck.issues) console.log(`    ${it}`);
  }
  console.log('━'.repeat(72));
})();
