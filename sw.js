const CACHE_NAME = 'nianqi-v2';
const PRECACHE_FILES = [
  '',
  'index.html',
  'manifest.json',
  'css/styles.css',
  'js/app.js',
  'js/game.js',
  'js/achievements.js',
  'icons/icon-192.png',
  'icons/icon-512.png'
];

const BASE_URL = new URL(self.registration.scope);
const ASSETS = PRECACHE_FILES.map((path) => new URL(path, BASE_URL).toString());

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        ASSETS.map(async (assetUrl) => {
          try {
            await cache.add(assetUrl);
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
    })
  );
  self.clients.claim();
});

// 拦截请求
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        // 不缓存非正常响应或跨域 opaque 响应
        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      });
    }).catch(() => {
      const requestUrl = new URL(event.request.url);
      if (event.request.mode === 'navigate' && requestUrl.origin === BASE_URL.origin) {
        return caches.match(new URL('index.html', BASE_URL).toString());
      }
      return Response.error();
    })
  );
});
