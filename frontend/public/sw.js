// Service Worker for SpecForge AI Specification Generator
const CACHE_NAME = 'specforge-v1';
const STATIC_CACHE_NAME = 'specforge-static-v1';
const DYNAMIC_CACHE_NAME = 'specforge-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  // Add other static assets as needed
];

// API endpoints that can be cached
const CACHEABLE_API_PATTERNS = [
  /^\/api\/conversations\/[^\/]+$/,
  /^\/api\/specifications\/[^\/]+$/,
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker');

  event.waitUntil(
    caches
      .open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (
              cacheName !== STATIC_CACHE_NAME &&
              cacheName !== DYNAMIC_CACHE_NAME
            ) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Handle different types of requests
  if (url.pathname.startsWith('/api/')) {
    // API requests - cache-first for specific endpoints, network-first for others
    event.respondWith(handleApiRequest(request));
  } else if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|woff|woff2)$/)
  ) {
    // Static assets - cache-first
    event.respondWith(handleStaticAsset(request));
  } else {
    // HTML pages - network-first with fallback
    event.respondWith(handlePageRequest(request));
  }
});

// Handle API requests
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_PATTERNS.some((pattern) =>
    pattern.test(url.pathname)
  );

  if (isCacheable) {
    // Cache-first strategy for cacheable API endpoints
    try {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) {
        console.log('[SW] Serving API from cache:', request.url);

        // Update cache in background
        fetch(request)
          .then((response) => {
            if (response.ok) {
              const responseClone = response.clone();
              caches
                .open(DYNAMIC_CACHE_NAME)
                .then((cache) => cache.put(request, responseClone));
            }
          })
          .catch(() => {
            // Ignore background update errors
          });

        return cachedResponse;
      }
    } catch (error) {
      console.error('[SW] Cache match error:', error);
    }

    // Fallback to network
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const responseClone = networkResponse.clone();
        const cache = await caches.open(DYNAMIC_CACHE_NAME);
        await cache.put(request, responseClone);
        console.log('[SW] API response cached:', request.url);
      }
      return networkResponse;
    } catch (error) {
      console.error('[SW] Network request failed:', error);
      return new Response(
        JSON.stringify({
          error: 'Network unavailable',
          message: 'This content is not available offline',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  } else {
    // Network-first for non-cacheable API endpoints
    try {
      return await fetch(request);
    } catch (error) {
      console.error('[SW] API request failed:', error);
      return new Response(
        JSON.stringify({
          error: 'Network unavailable',
          message: 'This feature requires an internet connection',
        }),
        {
          status: 503,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }
}

// Handle static assets
async function handleStaticAsset(request) {
  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving static asset from cache:', request.url);
      return cachedResponse;
    }

    // Fallback to network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(STATIC_CACHE_NAME);
      await cache.put(request, responseClone);
      console.log('[SW] Static asset cached:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Static asset request failed:', error);
    // Return a placeholder or error response
    return new Response('Asset not available offline', { status: 503 });
  }
}

// Handle page requests
async function handlePageRequest(request) {
  try {
    // Network-first strategy
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      await cache.put(request, responseClone);
      console.log('[SW] Page cached:', request.url);
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Page request failed, trying cache:', error);

    // Fallback to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      console.log('[SW] Serving page from cache:', request.url);
      return cachedResponse;
    }

    // Fallback to index.html for SPA routing
    const indexResponse = await caches.match('/index.html');
    if (indexResponse) {
      console.log('[SW] Serving index.html for SPA routing');
      return indexResponse;
    }

    // Final fallback
    return new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SpecForge - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: system-ui, -apple-system, sans-serif; 
              text-align: center; 
              padding: 2rem; 
              color: #374151;
            }
            .offline-message {
              max-width: 400px;
              margin: 0 auto;
              padding: 2rem;
              border: 1px solid #e5e7eb;
              border-radius: 0.5rem;
              background: #f9fafb;
            }
            .icon { font-size: 3rem; margin-bottom: 1rem; }
            h1 { color: #1f2937; margin-bottom: 1rem; }
            p { margin-bottom: 1rem; line-height: 1.5; }
            button {
              background: #3b82f6;
              color: white;
              border: none;
              padding: 0.5rem 1rem;
              border-radius: 0.25rem;
              cursor: pointer;
            }
            button:hover { background: #2563eb; }
          </style>
        </head>
        <body>
          <div class="offline-message">
            <div class="icon">📱</div>
            <h1>You're Offline</h1>
            <p>SpecForge requires an internet connection to work properly. Please check your connection and try again.</p>
            <button onclick="window.location.reload()">Try Again</button>
          </div>
        </body>
      </html>
      `,
      {
        status: 503,
        headers: { 'Content-Type': 'text/html' },
      }
    );
  }
}

// Handle background sync (if supported)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);

  if (event.tag === 'conversation-sync') {
    event.waitUntil(syncConversations());
  }
});

// Sync conversations when back online
async function syncConversations() {
  try {
    // Get pending conversations from IndexedDB or localStorage
    // This would need to be implemented based on your offline storage strategy
    console.log('[SW] Syncing conversations...');

    // Example: sync any pending conversation data
    const pendingData = await getPendingData();
    if (pendingData.length > 0) {
      for (const data of pendingData) {
        try {
          await fetch('/api/conversations/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        } catch (error) {
          console.error('[SW] Failed to sync conversation:', error);
        }
      }
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
  }
}

// Helper function to get pending data (placeholder)
async function getPendingData() {
  // This would integrate with your offline storage solution
  return [];
}

// Handle push notifications (if implemented)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/vite.svg',
    badge: '/vite.svg',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'explore',
        title: 'Open SpecForge',
        icon: '/vite.svg',
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/vite.svg',
      },
    ],
  };

  event.waitUntil(self.registration.showNotification('SpecForge', options));
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(clients.openWindow('/'));
  }
});

// Performance monitoring
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PERFORMANCE_MARK') {
    console.log('[SW] Performance mark:', event.data.name, event.data.time);
  }
});

console.log('[SW] Service worker script loaded');
