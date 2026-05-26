const CACHE_NAME = 'road-to-workshop-v1';
const ASSETS = [
  './',
  './index.html',
  './css/tailwind.css',
  './js/app.min.js',
  './js/data-areas.min.js',
  './js/data-naseem-sulay.min.js',
  './js/data-exit18.min.js',
  './js/data-old-industrial.min.js',
  './manifest.json',
  './icons/icon-512.png',
  './icons/icon-192.png'
];

// Installation: Cache all static assets and initial data
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Service Worker: Pre-caching assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activation: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('Service Worker: Clearing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetching: Cache first or Network fallback with dynamic caching
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache newly fetched files if they are from our origin
        if (response && response.status === 200 && response.type === 'basic') {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback can be defined here if necessary
    })
  );
});
