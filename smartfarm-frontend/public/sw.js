// Service Worker for Offline Support
const CACHE_NAME = 'smartfarm-v1';
const RUNTIME_CACHE = 'smartfarm-runtime';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/offline.html',
    '/manifest.json',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('[SW] Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );

    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
                    .map((name) => {
                        console.log('[SW] Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );

    self.clients.claim();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // API requests - network first, cache fallback
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Clone response for caching
                    const responseClone = response.clone();

                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });

                    return response;
                })
                .catch(() => {
                    // Return cached response if available
                    return caches.match(request).then((cached) => {
                        if (cached) {
                            return cached;
                        }

                        // Return offline page for navigation requests
                        if (request.mode === 'navigate') {
                            return caches.match('/offline.html');
                        }

                        return new Response('Offline - no cached data available', {
                            status: 503,
                            statusText: 'Service Unavailable',
                        });
                    });
                })
        );
        return;
    }

    // Static assets - cache first, network fallback
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) {
                console.log('[SW] Serving from cache:', request.url);
                return cached;
            }

            return fetch(request).then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();

                    caches.open(RUNTIME_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }

                return response;
            }).catch(() => {
                // Return offline page for navigation requests
                if (request.mode === 'navigate') {
                    return caches.match('/offline.html');
                }

                return new Response('Offline', { status: 503 });
            });
        })
    );
});

// Background sync for queued requests
self.addEventListener('sync', (event) => {
    console.log('[SW] Background sync:', event.tag);

    if (event.tag === 'sync-disease-scans') {
        event.waitUntil(syncDiseaseScanQueue());
    }

    if (event.tag === 'sync-chat-messages') {
        event.waitUntil(syncChatMessageQueue());
    }
});

// Push notifications
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : {};

    const options = {
        body: data.body || 'New notification from SmartFarm',
        icon: '/icons/icon-192.png',
        badge: '/icons/badge.png',
        data: data.url || '/',
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'SmartFarm', options)
    );
});

// Notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.openWindow(event.notification.data)
    );
});

// Helper: Sync disease scan queue
async function syncDiseaseScanQueue() {
    try {
        const cache = await caches.open('pending-scans');
        const requests = await cache.keys();

        for (const request of requests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                    console.log('[SW] Synced disease scan:', request.url);
                }
            } catch (error) {
                console.error('[SW] Failed to sync scan:', error);
            }
        }
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}

// Helper: Sync chat message queue
async function syncChatMessageQueue() {
    try {
        const cache = await caches.open('pending-messages');
        const requests = await cache.keys();

        for (const request of requests) {
            try {
                const response = await fetch(request);
                if (response.ok) {
                    await cache.delete(request);
                    console.log('[SW] Synced message:', request.url);
                }
            } catch (error) {
                console.error('[SW] Failed to sync message:', error);
            }
        }
    } catch (error) {
        console.error('[SW] Sync failed:', error);
    }
}
