/* Wasel Egypt service worker — offline shell for the SPA.
   Strategy: network-first for navigation/API, cache-first for static
   assets (JS/CSS/icons). Simple, no exotic dependencies; tile requests
   are deliberately NOT cached (provider terms + freshness).
   v2: router-era shell — old v1 caches are purged on activate. */
const CACHE = 'wasel-shell-v2';
const SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Never intercept the API, tiles, or geocoding — always live.
  if (url.pathname.startsWith('/api/') || url.hostname.includes('tiles') || url.pathname.startsWith('/api/v1/places')) {
    return;
  }

  // Static assets: cache-first.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then((hit) => {
        if (hit) return hit;
        return fetch(request).then((res) => {
          if (res.ok && (request.destination === 'script' || request.destination === 'style' || request.destination === 'image' || url.pathname.startsWith('/icons/'))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(request, copy));
          }
          return res;
        });
      })
    );
    return;
  }

  // SPA navigation: network-first with cached shell fallback.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/index.html', copy));
          return res;
        })
        .catch(() => caches.match('/index.html'))
    );
  }
});
