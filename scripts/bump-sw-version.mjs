// 빌드 전 sw.js의 CACHE_VERSION을 현재 시각 기반 문자열로 갱신.
// 같은 이름 캐시는 무효화 안 되므로 매 배포마다 반드시 바뀌어야 한다.
// 형식: YYYYMMDD-HHMM (UTC) — 빌드 동시성 충돌 회피용으로 분 단위.

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SW_PATH = resolve(__dirname, '..', 'public', 'sw.js');

function nowVersion() {
  const d = new Date();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  const hh = String(d.getUTCHours()).padStart(2, '0');
  const mm = String(d.getUTCMinutes()).padStart(2, '0');
  return `${y}${m}${day}-${hh}${mm}`;
}

const src = readFileSync(SW_PATH, 'utf8');
const re = /const\s+CACHE_VERSION\s*=\s*'([^']+)'\s*;/;
const m = src.match(re);
if (!m) {
  // SW가 self-destruct 버전 등으로 바뀌어 CACHE_VERSION이 없을 수 있음 — 정상 skip.
  console.log('[bump-sw-version] CACHE_VERSION 없음 — sw.js가 캐시를 사용하지 않는 형태로 보임. skip.');
  process.exit(0);
}
const oldVersion = m[1];
const newVersion = nowVersion();
if (oldVersion === newVersion) {
  console.log('[bump-sw-version] 같은 분 안 재실행 — skip (' + oldVersion + ')');
  process.exit(0);
}
const updated = src.replace(re, `const CACHE_VERSION = '${newVersion}';`);
writeFileSync(SW_PATH, updated);
console.log('[bump-sw-version] ' + oldVersion + ' → ' + newVersion);
