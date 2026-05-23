// Production 핵심 페이지 7개 200 응답 + HTML 무결성 검증.
// 사용: node scripts/validate-pages.mjs [BASE_URL]

const BASE_URL = process.argv[2] || process.env.BASE_URL || 'https://www.starlight-saju.com';
const PAGES = ['/', '/payment', '/payment/success', '/payment/fail', '/privacy', '/terms', '/refund'];

async function checkOne(path) {
  const url = BASE_URL + path;
  const start = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow' });
    const ms = Date.now() - start;
    if (res.status !== 200) return { path, ok: false, status: res.status, ms, reason: 'HTTP ' + res.status };
    const html = await res.text();
    const issues = [];
    if (html.length < 1024) issues.push('HTML 사이즈 < 1KB (' + html.length + 'B)');
    if (!/<title[^>]*>[\s\S]*?<\/title>/i.test(html)) issues.push('<title> 누락');
    return { path, ok: issues.length === 0, status: 200, ms, issues, sizeKB: Math.round(html.length / 1024) };
  } catch (err) {
    const ms = Date.now() - start;
    return { path, ok: false, ms, reason: 'fetch 실패: ' + (err?.message ?? String(err)) };
  }
}

(async () => {
  console.log('[validate-pages]', BASE_URL);
  console.log('병렬 ' + PAGES.length + ' 페이지 호출...');
  const results = await Promise.all(PAGES.map(checkOne));
  let pass = 0;
  for (const r of results) {
    if (r.ok) {
      pass++;
      console.log('✅', r.path.padEnd(20), r.sizeKB + 'KB', r.ms + 'ms');
    } else {
      console.log('❌', r.path.padEnd(20), r.reason || (r.issues || []).join(' / '));
    }
  }
  console.log('\n결과:', pass + '/' + PAGES.length);
  process.exit(pass === PAGES.length ? 0 : 1);
})();
