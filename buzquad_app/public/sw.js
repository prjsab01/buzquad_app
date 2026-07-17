const SHELL_CACHE = 'buzquad-shell-v2';
const IMAGE_CACHE = 'buzquad-images-v1';
const OFFLINE_QUEUE_KEY = 'buzquad-offline-queue';

const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/offline.html',
  '/icons/icon-192.svg',
  '/icons/icon-512.svg',
];

// Install: cache shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_ASSETS))
      .then(() => self.skipWaiting()),
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((n) => n !== SHELL_CACHE && n !== IMAGE_CACHE)
          .map((n) => caches.delete(n)),
      ),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Never cache third-party embeds
  if (url.hostname !== self.location.hostname &&
      !url.hostname.endsWith('firebaseio.com') &&
      !url.hostname.endsWith('googleapis.com')) {
    // Stale-while-revalidate for images from Cloudinary
    if (request.destination === 'image') {
      event.respondWith(staleWhileRevalidate(IMAGE_CACHE, request));
      return;
    }
    return; // network-only for other third-party
  }

  // Shell assets: cache-first
  if (SHELL_ASSETS.includes(url.pathname) || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then((cached) => cached || fetch(request)),
    );
    return;
  }

  // Navigation: network-first, fallback to cached shell, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match('/offline.html')),
        ),
    );
    return;
  }
});

// Stale-while-revalidate helper
async function staleWhileRevalidate(cacheName, request) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((res) => {
    if (res.ok) cache.put(request, res.clone());
    return res;
  }).catch(() => null);
  return cached || fetchPromise;
}

// Background sync for offline queue (if supported)
self.addEventListener('sync', (event) => {
  if (event.tag === 'buzquad-offline-queue') {
    event.waitUntil(flushOfflineQueue());
  }
});

async function flushOfflineQueue() {
  // Notify all clients to flush their offline queue
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach((client) => client.postMessage({ type: 'FLUSH_OFFLINE_QUEUE' }));
}

// PWA share target handler
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method === 'POST' && url.pathname === '/share-target') {
    event.respondWith(
      (async () => {
        const formData = await event.request.formData();
        const sharedUrl = formData.get('url') || formData.get('text') || '';
        return Response.redirect(`/feed?share=${encodeURIComponent(String(sharedUrl))}`, 303);
      })(),
    );
  }
});
