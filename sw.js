// Offline cache. Bump CACHE when you upload a new index.html.
const CACHE = 'schedule-v25';
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
//
// ONLY our own files. This used to intercept everything, which quietly broke
// school sync: a call to the Cloudflare Worker that failed fell through to
// caches.match('./index.html'), so the app got its own HTML back with status
// 200. r.ok was true, the ICS parser found no events, and sync reported
// success with nothing in it. Cross-origin requests now go straight to the
// network and are allowed to fail honestly.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then(r => { const copy = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(()=>{});
        return r; })
      .catch(() => caches.match(e.request).then(r =>
        // index.html stands in for a page you tried to open offline — never for data.
        r || (e.request.mode === 'navigate' ? caches.match('./index.html') : Response.error())))
  );
});
