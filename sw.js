const CACHE_NAME = 'crm-v71';
const STATIC_ASSETS = [
    './login.html',
    './dashboard.html',
    './leads.html',
    './css/styles.css',
    './js/config.js',
    './js/auth.js',
    './js/utils.js',
    './js/db.js',
    './js/sync.js',
    './js/api.js',
    './js/layout.js',
    './js/dashboard.js',
    './js/leads.js',
    './js/lead-form.js',
    './js/lead-modal.js'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS).catch(err => {
                console.warn('SW: Some assets failed to cache', err);
            });
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    // Skip API calls - let them fall through to the network so api.js can handle offline logic
    if (event.request.url.includes('script.google.com') || event.request.url.includes('script.googleusercontent.com')) {
        return; 
    }

    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            // Serve from cache if found
            if (cachedResponse) {
                // Background fetch to update cache for next time (Stale-while-revalidate for assets)
                event.waitUntil(
                    fetch(event.request).then(response => {
                        if (response.ok) {
                            caches.open(CACHE_NAME).then(cache => {
                                cache.put(event.request, response);
                            });
                        }
                    }).catch(() => {})
                );
                return cachedResponse;
            }

            // Otherwise, fetch from network
            return fetch(event.request).then((response) => {
                // If it's a valid response from same origin, cache it
                if (response && response.ok && response.type === 'basic') {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            }).catch(() => {
                // Fallback for offline if not in cache (e.g., return an offline HTML page if we had one)
                console.warn('SW: Fetch failed and not in cache', event.request.url);
            });
        })
    );
});
