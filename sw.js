const CACHE_NAME = 'kaoyan-vocab-v54'; // Version Bump
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  // Cache External CDNs critical for the app shell
  'https://cdn.tailwindcss.com',
  // Removed Google Fonts to allow offline/CN access
];

// Install Event: Cache core files
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate worker immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
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
  self.clients.claim(); // Become available to all pages
});

// Fetch Event: Stale-While-Revalidate for CDNs, Network First for API
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // CRITICAL FIX: Bypass Service Worker for API calls and non-GET requests
  // This prevents "Failed to fetch" errors when the SW fails to handle POST requests or CORS
  if (event.request.method !== 'GET' || url.hostname.includes('api.deepseek.com')) {
      return;
  }

  // 1. Cache External Assets (Tailwind, React, Lucide Icons)
  if (
      url.hostname.includes('cdn') || 
      url.hostname.includes('icons8') ||
      event.request.destination === 'script' || 
      event.request.destination === 'style' ||
      event.request.destination === 'image'
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if(networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => cachedResponse);
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Default Strategy: Network First (to get new version), then Cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        return caches.open(CACHE_NAME).then((cache) => {
           // Only cache valid GET responses
           if (event.request.url.startsWith('http') && response.status === 200) {
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