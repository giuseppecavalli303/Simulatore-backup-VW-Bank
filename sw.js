// Service worker: permette all'app di aprirsi anche senza internet.
// Le pagine dell'app si scaricano sempre aggiornate quando c'è rete (copia in cache come riserva);
// le librerie esterne (Tailwind, font) vengono servite dalla cache e aggiornate in background.
const CACHE = 'simulatore-vw-v1';
const APP_SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(APP_SHELL)));
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const req = event.request;
    if (req.method !== 'GET') return;
    const sameOrigin = new URL(req.url).origin === self.location.origin;

    if (sameOrigin) {
        // Rete prima, cache come riserva offline
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE).then((cache) => cache.put(req, copy));
                    return res;
                })
                .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
        );
    } else {
        // Cache prima, aggiornamento in background
        event.respondWith(
            caches.match(req).then((cached) => {
                const network = fetch(req)
                    .then((res) => {
                        const copy = res.clone();
                        caches.open(CACHE).then((cache) => cache.put(req, copy));
                        return res;
                    })
                    .catch(() => cached);
                return cached || network;
            })
        );
    }
});
