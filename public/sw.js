const CACHE_NAME = 'aas-vt-v2';

const PRECACHE_URLS = [
  '/',
  '/detailing',
  '/boat-detailing',
  '/rv-detailing',
  '/about',
  '/contact',
  '/faq',
  '/service-area',
  '/e.png',
  '/aasbanner.png',
  '/favicon.ico',
];

// Install: precache shell pages
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
});

// Activate: clear old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      ),
    ])
  );
});

// Fetch: network-first for navigation & API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (analytics, maps, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip API routes and Next.js internals
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

  // Static assets (images, fonts, manifest) → cache-first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|json|webmanifest)$/)
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) => cached ?? fetch(event.request).then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Navigation requests → network-first, fallback to cache, then offline page
  event.respondWith(
    fetch(event.request)
      .then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(event.request, clone));
        return res;
      })
      .catch(() => caches.match(event.request).then((cached) => cached ?? caches.match('/')))
  );
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data
    ? event.data.json()
    : { title: 'Arise & Shine VT', body: 'You have a new notification.' };

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/e.png',
      badge: '/favicon.ico',
      vibrate: [200, 100, 200],
      data: { url: data.url ?? '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data.url));
});
