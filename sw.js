/**
 * Service Worker — Cache-first for offline support
 * All clause data is static and cached on first load
 */

const CACHE_NAME = 'ccc-v5';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/styles/main.css',
  '/src/main.js',
  '/src/search.js',
  '/src/ui.js',
  '/src/clipboard.js',
  '/data/b149-1-clauses.json',
  '/data/b149-2-clauses.json',
  '/data/scenario-index.json',
  '/data/bulletins.json',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-192.png',
  '/icons/icon-maskable-512.png',
  '/icons/apple-touch-180.png',
  '/icons/favicon-32.png',
];

const CDN_ASSETS = [
  'https://cdn.jsdelivr.net/npm/fuse.js@7.0.0/dist/fuse.min.js',
  'https://cdn.jsdelivr.net/npm/dompurify@3.0.6/dist/purify.min.js',
];

// Install — cache all static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([...STATIC_ASSETS, ...CDN_ASSETS]);
    })
  );
  self.skipWaiting();
});

// Activate — clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) => {
      return Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      );
    })
  );
  self.clients.claim();
});

// Fetch — cache-first for static assets, network-first for everything else
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Cache-first for same-origin static assets and CDN libs
  if (url.origin === self.location.origin || url.hostname === 'cdn.jsdelivr.net') {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      }).catch(() => {
        // Offline fallback for navigation requests
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('Offline', { status: 503 });
      })
    );
  }
});