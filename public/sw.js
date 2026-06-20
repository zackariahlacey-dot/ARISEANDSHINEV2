// Bump the version when changing the SW so old caches get evicted on activate.
// v4 — evict stale /manifest.webmanifest (could have cached HTML on first SSR
// miss in dev), and skip caching .webmanifest entirely since it's tiny + can
// change shape between deploys.
const CACHE_NAME = 'aas-vt-v4';

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

// Paths whose responses must never be cached — they're either user-specific
// (auth dashboards, admin) or POST-only / fast-changing.
// Privacy: a cached /protected from User A must not be served to User B.
const NEVER_CACHE_PREFIXES = [
  '/admin',
  '/protected',
  '/auth',
  '/pay/',
  '/onboard',
  '/schedule/monthly',
  '/my-detail',
  '/membership',
];

function shouldSkipCache(pathname) {
  return NEVER_CACHE_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/') || pathname.startsWith(p));
}

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

// Listen for explicit cache-purge messages (e.g. on sign-out so the next
// visitor doesn't see the previous user's cached HTML).
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'PURGE_CACHE') {
    event.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

// Fetch: network-first for navigation & API, cache-first for static assets
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Skip cross-origin requests (analytics, maps, etc.)
  if (url.origin !== self.location.origin) return;

  // Skip API routes and Next.js internals
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) return;

  // Never cache authenticated / user-specific routes — always go straight to
  // the network so each visitor gets a fresh, role-correct response.
  if (shouldSkipCache(url.pathname)) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Manifest is generated server-side and lightweight — always go to network
  // so we never serve a stale or accidentally-cached HTML body in its place.
  if (url.pathname.endsWith('.webmanifest') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(fetch(event.request));
    return;
  }

  // Static assets (images, fonts) → cache-first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico|woff2?|ttf|json)$/)
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

  // Public navigation requests → network-first, fallback to cache, then to /
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
    : { title: 'Arise And Shine Detailing', body: 'You have a new notification.' };

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
