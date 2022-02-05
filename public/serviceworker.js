/*************************
 * Service worker for PWA
 * References: https://developers.google.com/web/ilt/pwa/caching-files-with-service-worker
 *************************/

const cacheName = 'team-reg-app';
const files = [
    "/img/icon-192x192.png",
    "/img/icon-256x256.png",
    "/img/icon-384x384.png",
    "/img/icon-512x512.png",
    "/img/home.svg",
    "/img/logout.svg",
    "/img/plus.svg",
    "/img/schedule.svg",
    "/img/settings.svg",
    "/img/team.svg",
];


self.addEventListener('install', async e => {
    const cache = await caches.open(cacheName);
    await cache.addAll(files);
    return self.skipWaiting();
});

self.addEventListener('activate', e => {
    self.clients.claim();
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            return response || fetch(event.request);
        })
    );
});
