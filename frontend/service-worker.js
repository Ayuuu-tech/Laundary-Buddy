/**
 * SERVICE WORKER
 * 
 * Progressive Web App (PWA) service worker for Laundry Buddy.
 * Provides offline functionality and caching strategies.
 * 
 * Features:
 * - Cache-first strategy for static assets
 * - Network-first strategy for API calls
 * - Offline fallback page
 * - Background sync for order submissions
 * - Push notifications support
 * 
 * Cache Strategy:
 * - Static assets (HTML, CSS, JS, images): Cache-first
 * - JSON data: Network-first with cache fallback
 * - External resources: Network-only
 * 
 * Created: 2025
 * Part of: Laundry Buddy College Project
 */

const CACHE_VERSION = 'laundry-buddy-v1.0.1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const MAX_DYNAMIC_CACHE_SIZE = 50;

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/home.html',
  '/login.html',
  '/signup.html',
  '/profile.html',
  '/history.html',
  '/submit.html',
  '/track.html',
  '/contact.html',
  '/support.html',
  '/offline.html',

  // CSS files
  '/style.css',
  '/home.css',
  '/login.css',
  '/signup.css',
  '/profile.css',
  '/history.css',
  '/submit.css',
  '/track.css',
  '/contact.css',
  '/support.css',
  '/modal.css',
  '/form-validation.css',
  '/loading.css',
  '/toast.css',
  '/dark-mode.css',
  // '/confirmation-modal.css', // removed unused modal styles from precache

  // JavaScript files
  '/assests/auth.js',
  '/assests/home.js',
  '/assests/login.js',
  '/assests/signup.js',
  '/assests/profile.js',
  '/assests/history.js',
  '/assests/submit.js',
  '/assests/track.js',
  '/assests/contact.js',
  '/assests/support.js',
  '/assests/form-validator.js',
  '/assests/loading-manager.js',
  '/assests/crypto-utils.js',
  '/assests/toast-manager.js',
  '/assests/email-validator.js',
  // '/assests/confirmation-modal.js', // removed unused modal script from precache
  '/assests/dark-mode.js',
  '/assests/keyboard-shortcuts.js',

  // Images
  '/assests/laundary_buddy.png',
  '/assests/home.png',
  '/assests/login.png',
  '/assests/profile.png',
  '/assests/submit.png',
  '/assests/track.png',

  // External resources (optional - comment out if too large)
  // 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap',
  // 'https://unpkg.com/boxicons@2.1.4/css/boxicons.min.css'
];

/**
 * Install Event
 * Cache static assets when service worker is installed
 */
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

/**
 * Activate Event
 * Clean up old caches when service worker is activated
 */
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name.startsWith('laundry-buddy-') && name !== STATIC_CACHE && name !== DYNAMIC_CACHE)
            .map((name) => {
              console.log(`[Service Worker] Deleting old cache: ${name}`);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activation complete');
        return self.clients.claim(); // Take control immediately
      })
  );
});

/**
 * Fetch Event
 * Intercept network requests and apply caching strategies
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (unless it's fonts or icons)
  if (url.origin !== location.origin && !url.href.includes('fonts.googleapis.com') && !url.href.includes('boxicons')) {
    return;
  }

  // Always use network-first for navigation/HTML documents to ensure reload gets fresh pages
  if (request.mode === 'navigate' || request.destination === 'document') {
    event.respondWith(networkFirstStrategy(request));
    return;
  }

  // Apply different strategies based on request type
  if (request.url.includes('/api/')) {
    // Network-first for API requests (don't cache sensitive data vigorously, or use Network-Only if preferred)
    // Actually, for API, Network-Only is safest to avoid stale data, especially for orders/auth.
    // But Network-First allows offline read. Let's send Network-First but ensure we don't return old auth data.
    // Better: Network-First but with very short validity? 
    // Safest for 30k users launch: Network-First.
    event.respondWith(networkFirstStrategy(request));
  } else if (request.url.includes('/assests/data/')) {
    // Network-first for JSON data
    event.respondWith(networkFirstStrategy(request));
  } else if (request.destination === 'image') {
    // Cache-first for images
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Cache-first for everything else (HTML, CSS, JS)
    event.respondWith(cacheFirstStrategy(request));
  }
});

/**
 * Cache-First Strategy
 * Try cache first, fallback to network
 */
async function cacheFirstStrategy(request) {
  try {
    // Try to get from cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log(`[Service Worker] Serving from cache: ${request.url}`);
      return cachedResponse;
    }

    // Not in cache, fetch from network
    console.log(`[Service Worker] Fetching from network: ${request.url}`);
    const networkResponse = await fetch(request);

    // Cache the new response
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      limitCacheSize(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_SIZE);
    }

    return networkResponse;
  } catch (error) {
    console.error(`[Service Worker] Fetch failed: ${request.url}`, error);

    // Return offline page for navigation requests
    if (request.destination === 'document') {
      const offlinePage = await caches.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }

    throw error;
  }
}

/**
 * Network-First Strategy
 * Try network first, fallback to cache
 */
async function networkFirstStrategy(request) {
  try {
    // Try network first
    console.log(`[Service Worker] Fetching from network (network-first): ${request.url}`);
    const networkResponse = await fetch(request);

    // Cache the response
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log(`[Service Worker] Network failed, trying cache: ${request.url}`);

    // Network failed, try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      console.log(`[Service Worker] Serving from cache (fallback): ${request.url}`);
      return cachedResponse;
    }

    throw error;
  }
}

/**
 * Limit cache size
 * Delete oldest entries when cache exceeds max size
 */
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxSize) {
    console.log(`[Service Worker] Cache size limit reached, deleting oldest entries`);
    await cache.delete(keys[0]);
    await limitCacheSize(cacheName, maxSize); // Recursive call
  }
}

/**
 * Background Sync Event
 * Retry failed submissions when connection is restored
 */
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-submissions') {
    console.log('[Service Worker] Syncing submissions...');

    event.waitUntil(
      syncSubmissions()
        .then(() => {
          console.log('[Service Worker] Submissions synced successfully');
        })
        .catch((error) => {
          console.error('[Service Worker] Sync failed:', error);
        })
    );
  }
});

/**
 * Sync pending submissions
 */
importScripts('/assests/idb-utils.js');

/**
 * Sync pending submissions
 */
async function syncSubmissions() {
  console.log('[Service Worker] background sync started');
  try {
    const offlineOrders = await self.IDBUtils.getAllOrders();
    if (offlineOrders.length === 0) {
      console.log('[Service Worker] No offline orders to sync');
      return;
    }

    console.log(`[Service Worker] Syncing ${offlineOrders.length} orders...`);

    for (const order of offlineOrders) {
      try {
        // Attempt to send to backend
        // Note: We need API base URL. Assuming it's same origin for now relative fetch
        const response = await fetch('/api/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
            // Auth headers might be tricky here if tokens are in memory/localStorage (which we can't access)
            // But browser cookies (HttpOnly) should be sent automatically if we use credentials: 'include'?
            // The backend uses session cookies.
          },
          body: JSON.stringify(order)
        });

        if (response.ok) {
          console.log(`[Service Worker] Synced order IDB key: ${order.id}`);
          await self.IDBUtils.deleteOrder(order.id);
        } else {
          console.error('[Service Worker] Failed to sync order', await response.text());
        }
      } catch (err) {
        console.error('[Service Worker] Error processing order sync item', err);
      }
    }
  } catch (error) {
    console.error('[Service Worker] Error reading from IndexedDB:', error);
  }
}

/**
 * Push Notification Event
 * Handle push notifications (if enabled)
 */
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');

  let data = {
    title: 'Laundry Buddy',
    body: 'You have a new notification',
    icon: '/favicon.svg',
    badge: '/favicon.svg'
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (error) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || []
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

/**
 * Notification Click Event
 * Handle notification clicks
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked');

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }

        // Open new window
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
  );
});

/**
 * Message Event
 * Handle messages from clients
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});

console.log('[Service Worker] Loaded successfully');
