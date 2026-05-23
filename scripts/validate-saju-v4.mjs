// Saju v4 시나리오 종단 검증 — 5개 입력 유형 모두 /api/saju-v4/preview 호출.
// 사용: node scripts/validate-saju-v4.mjs [BASE_URL]

const BASE_URL = process.argv[2] || process.env.BASE_URL || 'https://www.starlight-saju.com';
const ENDPOINT = BASE_URL + '/api/saju-v4/preview';

const STEMS = ['갑','을','병','정','무','기','경','신','임','계'];
const VALID_ELEMENTS = new Set(['wood', 'fire', 'earth', 'metal', 'water']);

const CASES = [
  {
    label: '1. 양력 + 정확한 시간 (95-07-06 12:00)',
    input: { gender: 'unknown', calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  },
  {
    label: '2. 양력 + 시간 미상 (90-03-15)',
    input: { gender: 'unknown', calendarType: 'solar', birthDate: '1990-03-15', birthTimeConfidence: 'unknown', timezone: 'Asia/Seoul' },
  },
  {
    label: '3. 음력 + approximate (88-11-04 02:30)',
    input: { gender: 'female', calendarType: 'lunar', birthDate: '1988-11-04', birthTime: '02:30', birthTimeConfidence: 'approximate', timezone: 'Asia/Seoul' },
  },
  {
    label: '4. 양력 + 자시 경계 (00-12-31 23:50)',
    input: { gender: 'male', calendarType: 'solar', birthDate: '2000-12-31', birthTime: '23:50', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  },
  {
    label: '5. 양력 + 새벽 0시 (05-01-01 00:30)',
    input: { gender: 'unknown', calendarType: 'solar', birthDate: '2005-01-01', birthTime: '00:30', birthTimeConfidence: 'exact', timezone: 'Asia/Seoul' },
  },
];

async function checkOne(c) {
  const start = Date.now();
  try {
    const res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: c.input }),
    });
    const ms = Date.now() - start;
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return { label: c.label, ok: false, status: res.status, ms, reason: 'HTTP ' + res.status + ': ' + text.slice(0, 200) };
    }
    const data = await res.json();
    const issues = [];
    if (!data?.birthChart?.dayMaster) issues.push('birthChart.dayMaster 누락');
    else if (!STEMS.includes(data.birthChart.dayMaster)) issues.push('dayMaster 비정상: ' + data.birthChart.dayMaster);
    const ug = data?.coreAnalysis?.usefulGod?.primaryUseful?.value;
    if (!ug) issues.push('usefulGod.primaryUseful.value 누락');
    else if (!VALID_ELEMENTS.has(ug)) issues.push('usefulGod 비정상: ' + ug);
    if (!Array.isArray(data?.specialPoints)) issues.push('specialPoints 배열 X');
    if (!Array.isArray(data?.identityKeywords)) issues.push('identityKeywords 배열 X');
    if (!Array.isArray(data?.lifeWeapons)) issues.push('lifeWeapons 배열 X');
    if (!Array.isArray(data?.lifeTraps)) issues.push('lifeTraps 배열 X');
    if (!data?.fortuneTriggers) issues.push('fortuneTriggers 누락');
    const cs = data?.careerSpecificAnalysis?.topCareerMatches;
    if (!Array.isArray(cs) || cs.length < 1) issues.push('careerSpecificAnalysis.topCareerMatches 비어있음');
    return { label: c.label, ok: issues.length === 0, status: 200, ms, issues, dayMaster: data?.birthChart?.dayMaster, usefulGod: ug };
  } catch (err) {
    const ms = Date.now() - start;
    return { label: c.label, ok: false, ms, reason: 'fetch 실패: ' + (err?.message ?? String(err)) };
  }
}

(async () => {
  console.log('[validate-saju-v4]', ENDPOINT);
  console.log('병렬 5 케이스 호출...');
  const results = await Promise.all(CASES.map(checkOne));
  let pass = 0;
  for (const r of results) {
    if (r.ok) {
      pass++;
      console.log('✅', r.label, 'dm=' + r.dayMaster + ' useful=' + r.usefulGod, r.ms + 'ms');
    } else {
      console.log('❌', r.label, r.reason || (r.issues || []).join(' / '));
    }
  }
  console.log('\n결과:', pass + '/' + CASES.length);
  process.exit(pass === CASES.length ? 0 : 1);
})();
