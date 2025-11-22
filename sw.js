
const CACHE_NAME = 'kaoyan-vocab-v10'; // Version Bump to v10 (Critical for updating users)
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Cache External CDNs critical for the app shell
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap',
];

// Install Event: Cache core files
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Event: Clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Event: Stale-While-Revalidate for CDNs, Network First for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 1. Cache External Assets (Tailwind, Fonts, React, Lucide Icons)
  // This ensures the "App Shell" loads even if offline.
  if (
      url.hostname.includes('cdn') || 
      url.hostname.includes('fonts') || 
      url.hostname.includes('icons8') ||
      event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.destination === 'image'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            // Update cache with new version
            if(networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse); // If network fails, return cached (even if undefined, handled below)

          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Default Strategy for App Shell: Network First, Fallback to Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
           // Don't cache API calls or browser-sync/hot-reload stuff
           if (event.request.url.startsWith('http') && event.request.method === 'GET') {
               cache.put(event.request, response.clone());
           }
           return response;
        });
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});