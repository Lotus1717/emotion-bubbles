const CACHE_VERSION = 'v2';
const STATIC_CACHE = `nianqi-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `nianqi-runtime-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/styles.css',
  './js/app.js',
  './js/pwa.js',
  './js/constants.js',
  './js/game.js',
  './js/share.js',
  './js/reminder.js',
  './js/audio.js',
  './js/physics.js',
  './js/bubble.js',
  './js/emotions.js',
  './js/suggestions.js',
  './js/stats.js',
  './js/achievements.js',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const OFFLINE_FALLBACK = './index.html';

const resolveAssetUrl = (assetPath) => new URL(assetPath, self.registration.scope).toString();

// 安装阶段预缓存核心资源，确保首轮在线访问后即可离线运行
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const requests = CORE_ASSETS.map((assetPath) =>
        new Request(resolveAssetUrl(assetPath), { cache: 'reload' })
      );
      await cache.addAll(requests);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((cacheName) => ![STATIC_CACHE, RUNTIME_CACHE].includes(cacheName))
          .map((cacheName) => caches.delete(cacheName))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

const cacheRuntimeResponse = async (request, response) => {
  if (!response || response.status !== 200 || response.type !== 'basic') {
    return response;
  }

  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response.clone());
  return response;
};

const handleNavigationRequest = async (event) => {
  try {
    const preloadResponse = await event.preloadResponse;
    if (preloadResponse) {
      return preloadResponse;
    }

    const networkResponse = await fetch(event.request);
    return cacheRuntimeResponse(event.request, networkResponse);
  } catch (error) {
    const cachedPage = await caches.match(event.request);
    if (cachedPage) {
      return cachedPage;
    }

    const offlinePage = await caches.match(resolveAssetUrl(OFFLINE_FALLBACK));
    if (offlinePage) {
      return offlinePage;
    }

    throw error;
  }
};

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(event));
    return;
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);
        return cacheRuntimeResponse(event.request, networkResponse);
      } catch (error) {
        if (event.request.destination === 'document') {
          const offlinePage = await caches.match(resolveAssetUrl(OFFLINE_FALLBACK));
          if (offlinePage) {
            return offlinePage;
          }
        }
        throw error;
      }
    })()
  );
});
