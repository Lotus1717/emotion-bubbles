const CACHE_NAME = 'nianqi-v3';
const PRECACHE_FILES = [
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
  './icons/icon-512.png',
  './nianqi-icon.png'
];

const BASE_URL = new URL(self.registration.scope);
const PRECACHE_URLS = PRECACHE_FILES.map((path) => new URL(path, BASE_URL).toString());
const OFFLINE_PAGE_URL = new URL('./index.html', BASE_URL).toString();

function isCachableResponse(response) {
  return Boolean(response && response.ok && response.type === 'basic');
}

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_URLS.map(async (assetUrl) => {
          try {
            await cache.add(new Request(assetUrl, { cache: 'reload' }));
          } catch (error) {
            console.warn('[SW] failed to precache:', assetUrl, error);
          }
        })
      );
    })
  );
  self.skipWaiting();
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== BASE_URL.origin) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_NAME);
        try {
          const networkResponse = await fetch(event.request);
          if (isCachableResponse(networkResponse)) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch (error) {
          return (
            (await cache.match(event.request, { ignoreSearch: true })) ||
            (await cache.match(OFFLINE_PAGE_URL)) ||
            Response.error()
          );
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(event.request);
      if (cachedResponse) {
        return cachedResponse;
      }

      try {
        const networkResponse = await fetch(event.request);
        if (isCachableResponse(networkResponse)) {
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (error) {
        return Response.error();
      }
    })()
  );
});
