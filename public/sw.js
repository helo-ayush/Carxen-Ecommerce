const CACHE_NAME = 'carxen-shell-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll([OFFLINE_URL, '/logo.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  const url = new URL(request.url);
  // Do not persist customer, auth, checkout, or API responses.
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/checkout') || url.pathname.startsWith('/login')) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && (request.destination === 'document' || request.destination === 'image' || request.destination === 'style')) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL)))
  );
});
