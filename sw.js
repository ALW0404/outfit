const CACHE = 'outfit-v29';
const ASSETS = ['./', './index.html', './style.css', './app.js', './manifest.json',
  './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

/* Zwei Strategien:
   – App-Dateien: erst das Netz, Zwischenspeicher nur ohne Verbindung. Vorher war
     es umgekehrt, und die Homebildschirm-App lieferte deshalb dauerhaft die alte
     Fassung aus, obwohl online längst eine neue lag.
   – Modell und Laufzeit unter ki/: erst der Zwischenspeicher. 15 MB, die sich nie
     ändern – die jedes Mal neu zu laden wäre reine Verschwendung. */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  const speichern = res => {
    if (res.ok) { const k = res.clone(); caches.open(CACHE).then(c => c.put(e.request, k)); }
    return res;
  };

  if (url.pathname.includes('/ki/')) {
    e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(speichern)));
    return;
  }

  e.respondWith(
    fetch(e.request).then(speichern).catch(() =>
      caches.match(e.request, { ignoreSearch: true }).then(hit =>
        hit || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
