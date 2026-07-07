const CACHE_VERSION = 'aerodrive-zenith-v0.3.0';
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
  '/wasm/zenith_physics.wasm'
];
const STATIC_PATTERNS = [
  '/_next/static/',
  '/icons/',
  '.js',
  '.css',
  '.wasm',
  '.woff2',
  '.webmanifest'
];
const MAX_RUNTIME_ENTRIES = 96;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(CACHE_VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  if (url.origin !== self.location.origin || request.method !== 'GET') return;

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (STATIC_PATTERNS.some((pattern) => url.pathname.includes(pattern) || url.pathname.endsWith(pattern))) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

async function networkFirstNavigation(request) {
  const cache = await caches.open(CACHE_VERSION);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put('/', response.clone());
    return response;
  } catch (_error) {
    const cached = await cache.match(request) || await cache.match('/') || await cache.match('/index.html') || await caches.match('/');
    return cached || new Response('AeroDrive Zenith is not cached yet. Load once while online.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });
  }
}

async function cacheFirst(request) {
  const cache = await caches.open(CACHE_VERSION);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') await cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(RUNTIME_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok || response.type === 'opaque') {
        await cache.put(request, response.clone());
        await trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
      }
      return response;
    })
    .catch(() => cached);
  return cached || network || new Response('AeroDrive Zenith asset unavailable offline.', { status: 504, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}

async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length <= maxEntries) return;
  await Promise.all(keys.slice(0, keys.length - maxEntries).map((request) => cache.delete(request)));
}

self.addEventListener('error', (event) => {
  console.error('[AeroDrive Zenith SW]', event.message);
});
