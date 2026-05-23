// ⚠ CACHE_VERSION을 배포마다 수동/스크립트로 갱신해야 함.
// 같은 이름의 캐시는 절대 무효화되지 않으므로 매 배포마다 바꾸지 않으면 옛 번들이 영구 캐싱됨.
// _next/static/는 immutable hash 경로라 안전하지만, 페이지 HTML은 절대 캐시 X.
const CACHE_VERSION = '20260524-04';
const CACHE_NAME = 'saju-static-' + CACHE_VERSION;

// 페이지 HTML은 절대 STATIC_ASSETS에 넣지 않는다. (SSR 결과가 바뀌면 옛 페이지 박힘)
const STATIC_ASSETS = ['/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  // 모든 기존 saju-* 캐시를 삭제 (이름이 달라야만 살아남는 정책)
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME && (k.startsWith('saju-') || k === 'saju-v3'))
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // 1. API 응답은 절대 캐시 X (PII + 시점 의존)
  if (url.pathname.startsWith('/api/')) return;

  // 2. Navigation 요청(HTML 페이지)도 절대 캐시 X — 새 배포가 즉시 보이도록 network-only.
  //    SW가 처리하지 않고 브라우저 기본 동작에 위임.
  if (e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html')) {
    return;
  }

  // 3. _next/static — content-hashed immutable 자산. cache-first.
  if (url.pathname.startsWith('/_next/static/')) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        if (cached) return cached;
        return fetch(e.request).then(res => {
          // 200 응답만 캐시, opaque/에러는 캐시 X
          if (res && res.status === 200 && res.type === 'basic') {
            const clone = res.clone(); // body 소진 전에 clone
            caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
          }
          return res;
        }).catch(() => new Response('', { status: 504, statusText: 'Gateway Timeout' }));
      })
    );
    return;
  }

  // 4. 그 외 정적 자산 — network-first with cache fallback (오프라인 대비)
  e.respondWith(
    fetch(e.request).catch(() =>
      caches.match(e.request).then(r => r || new Response('Offline', { status: 503, statusText: 'Service Unavailable' }))
    )
  );
});
