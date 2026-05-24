// 실제 production API에 3 fixture 호출 → 6개 안정화 항목 자동 검증.
// 새 기능/문장 품질 평가 X. 안정화 회귀만.
//
// 실행: node scripts/verify-narrative-fixtures.mjs

const API = process.env.SAJU_V4_API ?? 'https://www.starlight-saju.com/api/saju-v4';

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
    body: JSON.stringify({ input: fx.input, maxRepairAttempts: 1 }),
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

  // 보조 — 섹션별 본문 길이
  const lens = Object.fromEntries(
    Object.entries(sec).map(([k, v]) => [k, v.replace(/\s+/g, '').length])
  );
  return { dm, totalLen: md.replace(/\s+/g, '').length, lens, issues, validation: data.validation };
}

(async () => {
  console.log(`[verify-narrative-fixtures] API=${API}\n`);
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
    console.log(`  section lengths:`);
    for (const [k, v] of Object.entries(ck.lens)) console.log(`    ${k}: ${v}`);
    if (ck.validation) {
      const h = ck.validation.issues?.filter(i => i.severity === 'high').length ?? 0;
      const m = ck.validation.issues?.filter(i => i.severity === 'medium').length ?? 0;
      console.log(`  validation: isValid=${ck.validation.isValid}, high=${h}, medium=${m}`);
    }
    console.log(`  check items:`);
    for (const it of ck.issues) console.log(`    ${it}`);
  }
  console.log('━'.repeat(72));
})();
