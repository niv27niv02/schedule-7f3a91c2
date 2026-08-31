// Offline cache. Bump CACHE when you upload a new index.html.
const CACHE = 'schedule-v13';
const ASSETS = ['./', './index.html', './manifest.webmanifest',
                './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// Network-first so you always get the newest version online, cache as the offline fallback.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
  );
});
