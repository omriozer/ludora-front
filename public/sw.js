/**
 * Service Worker for Ludora
 * Provides caching strategies for better Core Web Vitals performance
 */

const CACHE_NAME = 'ludora-v1';
const STATIC_CACHE = 'ludora-static-v1';
const DYNAMIC_CACHE = 'ludora-dynamic-v1';
const API_CACHE = 'ludora-api-v1';

// Define assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/src/main.jsx',
  '/src/index.css',
  '/src/styles/hebrew-fonts.css',
  '/fonts/Inter-Regular.ttf',
  '/fonts/Inter-Bold.ttf',
  '/fonts/Assistant-Regular.ttf',
  '/images/ludora-logo.png',
  '/favicon.ico'
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = [
  /\/api\/settings/,
  /\/api\/products/,
  /\/api\/categories/
];

// Assets that should never be cached
const NEVER_CACHE_PATTERNS = [
  /\/api\/auth/,
  /\/api\/payments/,
  /\/api\/admin/,
  /\/socket\.io/,
  /\/analytics/
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        // Take control of all pages immediately
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches
            if (cacheName !== STATIC_CACHE &&
                cacheName !== DYNAMIC_CACHE &&
                cacheName !== API_CACHE) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Activated');
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

/**
 * Fetch event - implement caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension requests
  if (request.url.startsWith('chrome-extension://')) return;

  // Skip requests that should never be cached
  if (NEVER_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return;
  }

  event.respondWith(
    handleRequest(request)
  );
});

/**
 * Handle different types of requests with appropriate caching strategies
 */
async function handleRequest(request) {
  const url = new URL(request.url);

  // 1. Static assets - Cache First strategy
  if (isStaticAsset(request)) {
    return handleStaticAsset(request);
  }

  // 2. API requests - Network First with fallback to cache
  if (isApiRequest(request)) {
    return handleApiRequest(request);
  }

  // 3. Images and media - Cache First with network fallback
  if (isMediaRequest(request)) {
    return handleMediaRequest(request);
  }

  // 4. Navigation requests - Network First with cache fallback
  if (request.mode === 'navigate') {
    return handleNavigationRequest(request);
  }

  // 5. Everything else - Network First
  return handleNetworkFirst(request, DYNAMIC_CACHE);
}

/**
 * Check if request is for a static asset
 */
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|ttf|woff|woff2|ico)$/);
}

/**
 * Check if request is for an API endpoint
 */
function isApiRequest(request) {
  return request.url.includes('/api/') &&
         API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

/**
 * Check if request is for media content
 */
function isMediaRequest(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|mp4|webm|ogg|mp3|wav)$/);
}

/**
 * Handle static assets with Cache First strategy
 */
async function handleStaticAsset(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset fetch failed:', error);
    return new Response('Asset not available offline', { status: 503 });
  }
}

/**
 * Handle API requests with Network First strategy
 */
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request.clone());

    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed for API request, trying cache');
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Add header to indicate cached response
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Cache', 'SW-CACHE');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers
      });
    }

    return new Response('API not available offline', {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Handle media requests with Cache First strategy
 */
async function handleMediaRequest(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      // Only cache smaller images to avoid filling up storage
      const contentLength = networkResponse.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) < 5000000) { // 5MB limit
        cache.put(request, networkResponse.clone());
      }
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Media fetch failed:', error);
    return new Response('Media not available offline', { status: 503 });
  }
}

/**
 * Handle navigation requests (HTML pages)
 */
async function handleNavigationRequest(request) {
  try {
    // Always try network first for navigation
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed, try cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // If no cached version, try to return the root page
    const rootCache = await caches.match('/');
    if (rootCache) {
      return rootCache;
    }

    return new Response('Page not available offline', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

/**
 * Generic Network First strategy
 */
async function handleNetworkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    return new Response('Resource not available offline', { status: 503 });
  }
}

/**
 * Listen for messages from the main thread
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

/**
 * Background sync for offline actions (if supported)
 */
if ('sync' in self.registration) {
  self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'background-sync') {
      event.waitUntil(doBackgroundSync());
    }
  });
}

/**
 * Perform background sync operations
 */
async function doBackgroundSync() {
  console.log('[SW] Performing background sync...');
  // Implement offline action sync here if needed
}

console.log('[SW] Service Worker loaded');