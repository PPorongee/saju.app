// ⚠ SELF-DESTRUCT SW.
// 이전 sw.js의 캐시 정책이 옛 번들을 영구 캐싱하는 버그가 있었음.
// 옛 SW가 이 SW로 교체될 때 자가 unregister + 모든 캐시 비우기 + 클라이언트 reload.
// 이후로는 SW 없이 브라우저가 직접 fetch.

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // 1. 모든 캐시 비우기
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (_) { /* swallow */ }

    // 2. 자기 자신 unregister
    try {
      await self.registration.unregister();
    } catch (_) { /* swallow */ }

    // 3. 모든 활성 클라이언트 강제 reload — 새 코드로 진입
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      for (const c of clients) {
        try { c.navigate(c.url); } catch (_) { /* some clients can't navigate */ }
      }
    } catch (_) { /* swallow */ }
  })());
});

// fetch 이벤트는 처리하지 않음 — 브라우저 기본 동작 사용.
