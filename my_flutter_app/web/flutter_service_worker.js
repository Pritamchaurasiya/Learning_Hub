// This is a placeholder for the Flutter service worker.
// It is used to cache and serve assets for the Flutter web app.

const CACHE_NAME = 'flutter-app-cache-v1';
const urlsToCache = [
  '/',
  '/main.dart.js',
  '/flutter_bootstrap.js',
  '/favicon.png',
  '/manifest.json',
  '/assets/FontManifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        return response || fetch(event.request);
      })
  );
});