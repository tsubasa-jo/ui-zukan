const CACHE_NAME = 'uiz-v1';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch('./precache.json', { cache: 'no-store' });
    if (!response.ok) throw new Error('保存するファイルの一覧を読めません');
    const { files } = await response.json();
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(files);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_NAME).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const cacheReady = caches.open(CACHE_NAME);
  const refresh = cacheReady.then(async cache => {
    const response = await fetch(request);
    if (response.ok) {
      // 保存できなくても、取得できた応答はそのまま使う。
      await cache.put(request, response.clone()).catch(() => {});
    }
    return response;
  }).catch(() => undefined);
  // キャッシュを返したあとも更新を続け、通信なしの失敗は外に出さない。
  event.waitUntil(refresh.then(() => {}));
  event.respondWith(cacheReady.then(async cache => {
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await refresh;
    if (response) return response;
    if (request.mode === 'navigate') {
      const fallback = await cache.match('./index.html');
      if (fallback) return fallback;
    }
    return new Response('通信がなく、保存されたファイルもありません。', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }));
});
