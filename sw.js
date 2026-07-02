/* Amin Al-Ridha PWA Service Worker — clean rebuild */
const CACHE_NAME = 'amin-pwa-v2026-clean-v1';
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/portal.html',
  '/offline.html',
  '/css/design-tokens.css',
  '/css/components.css',
  '/js/config.js',
  '/js/i18n.js',
  '/js/platform-modules.js',
  '/js/signature-star.js',
  '/js/renderHelpers.js',
  '/js/core.js',
  '/js/portal-app.js',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/libs/supabase.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))).then(() => self.clients.claim())
  );
});

function isApiRequest(url) {
  return url.pathname.startsWith('/api') || url.pathname.includes('/rest/v1') || url.pathname.includes('/auth/v1') || url.pathname.includes('/storage/v1');
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (isApiRequest(url)) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(r => r || caches.match('/offline.html')))
    );
    return;
  }

  if (url.pathname.endsWith('.js') || url.pathname.endsWith('.css')) {
    event.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(cached =>
      cached || fetch(req).then(res => {
        const copy = res.clone();
        if (res.ok) caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      }).catch(() => cached)
    )
  );
});
