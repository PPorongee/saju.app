// Fixture A (1995-07-06 12:00 여, unknown/unknown)에 대해 depth off vs on을 로컬 dev API로 호출 후 비교.
// production 호출 X. main push X. 단순 local 측정.

const API = process.env.SAJU_V4_API ?? 'http://localhost:3000/api/saju-v4';

const FIXTURE_A = {
  name: 'A', gender: 'female',
  calendarType: 'solar', birthDate: '1995-07-06', birthTime: '12:00',
  birthTimeConfidence: 'exact', timezone: 'Asia/Seoul',
  relationshipStatus: 'unknown', hasChildren: 'unknown',
  occupation: '', currentConcerns: [],
};

const DEPTH_OFF = {
  useEvidenceNarrativeBlocks: false,
  useSajuOpeningLuckCondition: false,
  useFinalGaewoonDirection: false,
};
const DEPTH_ON = {
  useEvidenceNarrativeBlocks: true,
  useSajuOpeningLuckCondition: true,
  useFinalGaewoonDirection: true,
};

const KNOWN_STARS = ['양인','괴강','백호','도화','홍염','화개','역마','천을귀인','문창귀인','학당귀인','월덕귀인','천덕귀인'];

async function call(label, depth) {
  const t0 = Date.now();
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: FIXTURE_A, maxRepairAttempts: 1, depthOptions: depth }),
  });
  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${label}: HTTP ${res.status} (${dt}s) — ${text.slice(0, 200)}`);
  }
  const data = await res.json();
  return { label, dt, data };
}

function splitSections(md) {
  const re = /^#\s+(\d+)\.\s+(.+)$/gm;
  const matches = [];
  let m;
  while ((m = re.exec(md)) !== null) matches.push({ start: m.index, idx: Number(m[1]), title: m[2] });
  const ids = ['openingDefinition','lifeStructureNarrative','repeatedPatternNarrative','careerTalentNarrative','moneyMonetizationNarrative','relationshipLoveNarrative','finalStrategyNarrative'];
  const out = Object.fromEntries(ids.map(k => [k, '']));
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i]; const next = matches[i + 1];
    if (cur.idx < 1 || cur.idx > 7) continue;
    const headerEnd = md.indexOf('\n', cur.start);
    const bodyStart = headerEnd >= 0 ? headerEnd + 1 : cur.start;
    const bodyEnd = next ? next.start : md.length;
    out[ids[cur.idx - 1]] = md.slice(bodyStart, bodyEnd).trim();
  }
  return out;
}

function analyze(r) {
  const md = r.data.reportText ?? '';
  const sec = splitSections(md);
  const v = r.data.validation;
  const high = v?.issues?.filter(i => i.severity === 'high') ?? [];
  const medium = v?.issues?.filter(i => i.severity === 'medium') ?? [];

  const life = sec.lifeStructureNarrative;
  const final = sec.finalStrategyNarrative;
  const opening = sec.openingDefinition;

  const strengthHit = /신강|신약|중화/.test(life);
  const presentStars = (r.data.coreAnalysis?.specialStars ?? []).map(s => s.name).filter(n => KNOWN_STARS.includes(n));
  let starsExplained = 0, starsShallow = 0;
  for (const name of presentStars) {
    if (!life.includes(name)) continue;
    const pos = life.indexOf(name);
    const window = life.slice(Math.max(0, pos - 60), Math.min(life.length, pos + name.length + 100));
    const hasExplain = /쉽게|말하면|풀면|풀어|처럼|비유|뜻|의미|라는 건|이라는 건|에 가까|와 비슷|같은 기운|같은 힘|이고|이며/.test(window);
    if (hasExplain) starsExplained++; else starsShallow++;
  }
  const ugHit = /용신|기신|도와주는 결|편하게 살려|과해지면/.test(final);
  const gaewoonHit = /개운|운을 편하게|운이 살아나|운을 막는|운이 막히는/.test(final);
  const luckOpenHit = /운이 열리|운이 살아나|구조로 바꿀|구조로 바꾸|구조로 정리/.test(opening);

  // opening 마지막 단락 (luck condition이 들어가야 할 위치) 추출
  const openingParas = opening.split(/\n{2,}/);
  const lastOpeningPara = openingParas[openingParas.length - 1] ?? '';
  const lastOpeningSentenceCount = lastOpeningPara.split(/[.!?]\s/).filter(s => s.trim()).length;

  return {
    dt: r.dt,
    totalLen: md.replace(/\s+/g, '').length,
    secLens: Object.fromEntries(Object.entries(sec).map(([k, v]) => [k, v.replace(/\s+/g, '').length])),
    high, medium,
    presentStars,
    strengthHit, starsExplained, starsShallow,
    ugHit, gaewoonHit, luckOpenHit, lastOpeningSentenceCount,
    futureLeak: /\b202[6-9]년|\b203\d년|앞으로\s*3년|향후\s*3년|다음\s*3년|미래\s*흐름|올해\s*하반기/.test(md),
    englishKey: /\b(wood|fire|earth|metal|water)\b/i.test(md),
    unsupportedCtx: /아내(?=[를는이가와과에도의]|\s|$)|남편(?=[를는이가와과에도의]|\s|$)|배우자(?!궁)/.test(md),
    over7k: md.length > 7000 || md.replace(/\s+/g, '').length > 7000,
    md, sec,
  };
}

(async () => {
  console.log('======================================');
  console.log('Fixture A — depth off vs on (local dev)');
  console.log('API:', API);
  console.log('======================================\n');

  let off, on;
  try { off = await call('OFF', DEPTH_OFF); } catch (e) { console.error('OFF failed:', e.message); process.exit(1); }
  try { on  = await call('ON',  DEPTH_ON);  } catch (e) { console.error('ON failed:', e.message); process.exit(1); }

  const A = { off: analyze(off), on: analyze(on) };

  // 표 1 — 핵심 비교
  console.log('## 핵심 비교');
  console.log('| 항목 | depth OFF | depth ON |');
  console.log('|---|---|---|');
  console.log(`| 응답 시간 | ${A.off.dt}s | ${A.on.dt}s |`);
  console.log(`| 전체 글자 수 (compact) | ${A.off.totalLen} | ${A.on.totalLen} |`);
  console.log(`| 7,000자 초과 여부 | ${A.off.over7k ? '⚠️ YES' : 'OK'} | ${A.on.over7k ? '⚠️ YES' : 'OK'} |`);
  console.log(`| validation HIGH | ${A.off.high.length} | ${A.on.high.length} |`);
  console.log(`| validation MEDIUM | ${A.off.medium.length} | ${A.on.medium.length} |`);
  console.log(`| 영문 오행 key leak | ${A.off.englishKey ? '⚠️ YES' : 'OK'} | ${A.on.englishKey ? '⚠️ YES' : 'OK'} |`);
  console.log(`| futureFlow leak | ${A.off.futureLeak ? '⚠️ YES' : 'OK'} | ${A.on.futureLeak ? '⚠️ YES' : 'OK'} |`);
  console.log(`| unsupported-user-context leak | ${A.off.unsupportedCtx ? '⚠️ YES' : 'OK'} | ${A.on.unsupportedCtx ? '⚠️ YES' : 'OK'} |`);
  console.log();

  console.log('## Narrative Depth v1 흡수 여부');
  console.log('| 항목 | depth OFF | depth ON |');
  console.log('|---|---|---|');
  console.log(`| lifeStructure 신강/신약/중화 반영 | ${A.off.strengthHit ? 'O' : 'X'} | ${A.on.strengthHit ? 'O' : 'X'} |`);
  console.log(`| 대표 신살 풀이 동반 (개) | ${A.off.starsExplained} | ${A.on.starsExplained} |`);
  console.log(`| 대표 신살 얕은 언급 (개) | ${A.off.starsShallow} | ${A.on.starsShallow} |`);
  console.log(`| final 용신/기신 결 반영 | ${A.off.ugHit ? 'O' : 'X'} | ${A.on.ugHit ? 'O' : 'X'} |`);
  console.log(`| final 개운 방향 반영 | ${A.off.gaewoonHit ? 'O' : 'X'} | ${A.on.gaewoonHit ? 'O' : 'X'} |`);
  console.log(`| opening 운이 열리는 방식 반영 | ${A.off.luckOpenHit ? 'O' : 'X'} | ${A.on.luckOpenHit ? 'O' : 'X'} |`);
  console.log(`| opening 마지막 단락 문장 수 | ${A.off.lastOpeningSentenceCount} | ${A.on.lastOpeningSentenceCount} |`);
  console.log();

  console.log('## 섹션 글자 수');
  console.log('| 섹션 | OFF | ON | 차이 |');
  console.log('|---|---:|---:|---:|');
  for (const [k, v] of Object.entries(A.off.secLens)) {
    const v2 = A.on.secLens[k] ?? 0;
    console.log(`| ${k} | ${v} | ${v2} | ${v2 - v >= 0 ? '+' : ''}${v2 - v} |`);
  }
  console.log();

  if (A.off.high.length > 0 || A.on.high.length > 0) {
    console.log('## HIGH issues');
    for (const [label, set] of [['OFF', A.off.high], ['ON', A.on.high]]) {
      for (const it of set) console.log(`  [${label}/${it.type}/${it.sectionId}] "${(it.sentence ?? '').slice(0, 80)}" — ${(it.reason ?? '').slice(0, 150)}`);
    }
    console.log();
  }

  console.log('## A fixture — lifeStructureNarrative — OFF\n');
  console.log(A.off.sec.lifeStructureNarrative);
  console.log('\n----------------------------------------\n');
  console.log('## A fixture — lifeStructureNarrative — ON\n');
  console.log(A.on.sec.lifeStructureNarrative);
  console.log('\n========================================\n');
  console.log('## A fixture — finalStrategyNarrative — OFF\n');
  console.log(A.off.sec.finalStrategyNarrative);
  console.log('\n----------------------------------------\n');
  console.log('## A fixture — finalStrategyNarrative — ON\n');
  console.log(A.on.sec.finalStrategyNarrative);
  console.log('\n========================================\n');
  console.log('## A fixture — openingDefinition — ON (운이 열리는 방식 확인용)\n');
  console.log(A.on.sec.openingDefinition);
})();
