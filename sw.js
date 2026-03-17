const CACHE_PREFIX = 'nianqi-';
const CACHE_NAME = `${CACHE_PREFIX}v5`;
const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/constants.js',
  './js/game.js',
  './js/audio.js',
  './js/bubble.js',
  './js/physics.js',
  './js/emotions.js',
  './js/suggestions.js',
  './js/stats.js',
  './js/share.js',
  './js/reminder.js',
  './js/achievements.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];
const OPTIONAL_ASSETS = ['./nianqi-icon.png'];

const BASE_URL = new URL(self.registration.scope);
const CORE_URLS = CORE_ASSETS.map((path) => new URL(path, BASE_URL).toString());
const OPTIONAL_URLS = OPTIONAL_ASSETS.map((path) => new URL(path, BASE_URL).toString());
const OFFLINE_PAGE_URL = new URL('./index.html', BASE_URL).toString();

function isCacheableResponse(response) {
  return Boolean(response && response.ok && (response.type === 'basic' || response.type === 'default'));
}

function getCacheKey(request, { ignoreSearch = false } = {}) {
  const url = new URL(request.url);
  url.hash = '';
  if (ignoreSearch) {
    url.search = '';
  }
  return url.toString();
}

function shouldBypassCache(request) {
  return request.cache === 'no-store';
}

async function precacheCoreAssets(cache) {
  await Promise.all(
    CORE_URLS.map((assetUrl) => cache.add(new Request(assetUrl, { cache: 'reload' })))
  );
}

async function precacheOptionalAssets(cache) {
  await Promise.allSettled(
    OPTIONAL_URLS.map(async (assetUrl) => {
      try {
        await cache.add(new Request(assetUrl, { cache: 'reload' }));
      } catch (error) {
        console.warn('[SW] optional precache failed:', assetUrl, error);
      }
    })
  );
}

async function cleanupOldCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter((name) => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map((name) => caches.delete(name))
  );
}

async function handleNavigateRequest(event) {
  const cache = await caches.open(CACHE_NAME);
  const cacheKey = getCacheKey(event.request, { ignoreSearch: true });

  try {
    const preloadResponse = await event.preloadResponse;
    if (isCacheableResponse(preloadResponse)) {
      await cache.put(cacheKey, preloadResponse.clone());
      return preloadResponse;
    }

    const networkResponse = await fetch(event.request);
    if (isCacheableResponse(networkResponse)) {
      await cache.put(cacheKey, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return (await cache.match(cacheKey)) || (await cache.match(OFFLINE_PAGE_URL)) || Response.error();
  }
}

async function updateStaticCacheInBackground(cache, request, exactKey) {
  try {
    const networkResponse = await fetch(request);
    if (isCacheableResponse(networkResponse)) {
      await cache.put(exactKey, networkResponse.clone());
    }
  } catch (error) {
    // 后台更新失败不影响本次响应
  }
}

async function handleStaticRequest(event) {
  const { request } = event;
  const cache = await caches.open(CACHE_NAME);
  const exactKey = getCacheKey(request);
  const fuzzyKey = getCacheKey(request, { ignoreSearch: true });

  const cached = (await cache.match(exactKey)) || (await cache.match(fuzzyKey));
  if (cached) {
    event.waitUntil(updateStaticCacheInBackground(cache, request, exactKey));
    return cached;
  }

  try {
    const networkResponse = await fetch(request);
    if (isCacheableResponse(networkResponse)) {
      await cache.put(exactKey, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    return Response.error();
  }
}

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await precacheCoreAssets(cache);
      await precacheOptionalAssets(cache);
    })()
  );
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await cleanupOldCaches();

      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })()
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') {
    return;
  }
  if (shouldBypassCache(request)) {
    return;
  }

  const requestUrl = new URL(request.url);
  if (!['http:', 'https:'].includes(requestUrl.protocol)) {
    return;
  }
  if (requestUrl.origin !== BASE_URL.origin) {
    return;
  }

  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(handleNavigateRequest(event));
    return;
  }

  event.respondWith(handleStaticRequest(event));
});
