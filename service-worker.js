/* Hadiya service worker
   - Pages & scripts: network first (so you always get the newest version), cache as offline fallback
   - API calls and other websites: never touched (always live data)
   Bump CACHE_NAME whenever you want to force everyone's cache to reset. */
const CACHE_NAME = 'hadiya-v9';

const PRECACHE = [
  './',
  'index.html',
  'shops.html',
  'shop-detail.html',
  'login.html',
  'register.html',
  'privacy.html',
  'terms.html',
  'my-orders.html',
  'shop-owner-dashboard.html',
  'shop-orders.html',
  'config.js',
  'theme.css',
  'trees.svg',
  'manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // add one by one so a single missing file can't break the whole install
      Promise.all(PRECACHE.map(url => cache.add(url).catch(() => null)))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(names => Promise.all(names.filter(n => n !== CACHE_NAME).map(n => caches.delete(n))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);

  // Only handle same-site GET requests; let API calls / fonts / images from other sites pass through
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then(cached => cached || caches.match('index.html')))
  );
});

/* ---- Phone notifications (Web Push) ----
   The server sends a small encrypted message { title, body, url, tag }; the phone wakes this
   file up even when the app is closed, and we show it as a notification. */
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = {}; }
  const options = {
    body: data.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    dir: 'auto',
    data: { url: data.url || 'index.html' }
  };
  if (data.tag) { options.tag = data.tag; options.renotify = true; }   // same order/chat: replace instead of stacking
  event.waitUntil(self.registration.showNotification(data.title || 'Hadiya', options));
});

/* Tapping the notification opens (or focuses) the right page */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL((event.notification.data && event.notification.data.url) || 'index.html', self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async list => {
      for (const client of list) {
        if (!client.url.startsWith(self.registration.scope)) continue;
        try {
          const focused = await client.focus();
          if (focused && 'navigate' in focused && focused.url !== target) await focused.navigate(target);
          return;
        } catch (e) { /* fall through and open a new window */ }
      }
      await self.clients.openWindow(target);
    })
  );
});
