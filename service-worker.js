const CACHE_NAME = 'gugnani-crm-v2';
const urlsToCache = [
  './index.html',
  './login.html',
  './dashboard.html',
  './css/style.css',
  './css/dashboard.css',
  './css/responsive.css',
  './js/config.js',
  './js/api.js',
  './js/auth.js',
  './js/layout.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  // Pass through all requests to network to prevent aggressive dev caching
  event.respondWith(fetch(event.request));
});
