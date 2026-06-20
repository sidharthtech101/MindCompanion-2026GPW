const CACHE_NAME = 'mindcompanion-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/index.css',
  './css/components.css',
  './css/dashboard.css',
  './css/animations.css',
  './js/app.js',
  './js/storage.js',
  './js/ai-engine.js',
  './js/biomarkers.js',
  './js/companion.js',
  './js/grounding.js',
  './js/safety.js',
  './js/charts.js',
  './js/audio-engine.js',
  './js/anxiety-wipe.js'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('Caching assets');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

// Fetch Event
self.addEventListener('fetch', event => {
  // Only intercept GET requests
  if (event.request.method !== 'GET') return;
  // Don't intercept API calls (like Gemini)
  if (event.request.url.includes('generativelanguage.googleapis.com')) return;

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      return cachedResponse || fetch(event.request).then(fetchResponse => {
        return caches.open(CACHE_NAME).then(cache => {
          // Cache successful new fetches
          if (fetchResponse.ok) {
            cache.put(event.request, fetchResponse.clone());
          }
          return fetchResponse;
        });
      });
    }).catch(() => {
      // Offline fallback if needed
      if (event.request.headers.get('accept').includes('text/html')) {
        return caches.match('./index.html');
      }
    })
  );
});
