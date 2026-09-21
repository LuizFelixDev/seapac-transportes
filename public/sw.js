const CACHE_NAME = 'seapac-pwa-v5';
const STATIC_ASSETS = [
  '/',
  '/login',
  '/manifest.json',
  '/favicon.ico',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

/**
 * Helper to clean redirected responses.
 * Browsers block serving redirected responses (response.redirected === true)
 * for navigation/fetch events where redirect mode is not "follow".
 * Re-constructing a new Response strips the redirected flag.
 */
function cleanResponse(response) {
  if (!response || !response.redirected) {
    return response;
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers
  });
}

// Install event: Pre-cache core static app shell assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      console.log('[SW] Pre-caching app shell assets');
      await Promise.all(
        STATIC_ASSETS.map(async (url) => {
          try {
            const response = await fetch(url, { redirect: 'follow' });
            if (response && response.ok) {
              const cleaned = cleanResponse(response);
              await cache.put(url, cleaned);
            }
          } catch (err) {
            console.warn('[SW] Failed to pre-cache asset:', url, err);
          }
        })
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate event: Clean up legacy caches
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

// Fetch event: Network-first for API & Navigation, Stale-while-revalidate for static assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip caching for non-GET requests or external origins
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  // API Requests: Network first, fallback to cached JSON response if offline
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const cleaned = cleanResponse(response);
          if (cleaned && cleaned.ok) {
            const resClone = cleaned.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return cleaned;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cleanResponse(cached);
          return new Response(JSON.stringify({ error: 'Offline' }), { 
            status: 503, 
            headers: { 'Content-Type': 'application/json' } 
          });
        })
    );
    return;
  }

  // HTML Navigation: Network first so online users always get latest deploy, fallback to cache offline
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          const cleaned = cleanResponse(networkResponse);
          if (cleaned && cleaned.ok) {
            const resClone = cleaned.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
          }
          return cleaned;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cleanResponse(cached);
          const fallback = await caches.match('/');
          if (fallback) return cleanResponse(fallback);
          return new Response('<!DOCTYPE html><html><body><h1>Sem conexão</h1></body></html>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });
        })
    );
    return;
  }

  // Static Assets (CSS, JS chunks, images): Stale-While-Revalidate
  event.respondWith(
    caches.match(event.request).then(async (cachedResponse) => {
      if (cachedResponse) {
        const cleanedCached = cleanResponse(cachedResponse);
        // Fetch in background to update cache for next load
        fetch(event.request)
          .then((networkResponse) => {
            const cleaned = cleanResponse(networkResponse);
            if (cleaned && cleaned.ok) {
              const resClone = cleaned.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
            }
          })
          .catch(() => {});
        return cleanedCached;
      }

      // If not in cache, fetch from network
      try {
        const networkResponse = await fetch(event.request);
        const cleaned = cleanResponse(networkResponse);
        if (cleaned && cleaned.ok) {
          const resClone = cleaned.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return cleaned;
      } catch (err) {
        console.log('[SW] Asset fetch failed:', err);
        return new Response('', { status: 404 });
      }
    })
  );
});
