// Garden Master — Service Worker
// Strategy: cache-first for app shell, network-first for Firestore-backed pages

// ⚠️ CACHE_VERSION ถูกแทนที่อัตโนมัติทุกครั้งที่ deploy (ดู deploy.ps1)
// ห้ามแก้รูปแบบบรรทัดนี้ด้วยมือ — deploy script ใช้ regex แทนที่ค่า
const CACHE_VERSION = 'gm-202607010359'; // [auto-version]
const APP_SHELL = `${CACHE_VERSION}-shell`;
const RUNTIME = `${CACHE_VERSION}-runtime`;

// Pre-cache the entry pages we know exist (static export builds these as HTML files)
const PRECACHE_URLS = [
  '/',
  '/login/',
  '/orchard/',
  '/orchard/care/',
  '/orchard/care/water/',
  '/orchard/care/fertilize/',
  '/orchard/care/spray/',
  '/orchard/expense/',
  '/orchard/upgrade/',
  '/orchard/sales/',
  '/orchard/hospital/',
  '/orchard/tree-info/',
  '/orchard/farm-map/',
  '/orchard/farm-map/',
  '/orchard/chemical-stock/',
  '/orchard/expense-summary/',
  '/manifest.webmanifest',
];

// Install — pre-cache shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(APP_SHELL).then((cache) =>
      // ใช้ addAll แบบ tolerant: ถ้าหน้าใดไม่มีจะข้าม
      Promise.all(
        PRECACHE_URLS.map((url) =>
          cache.add(url).catch((err) => {
            console.warn('[SW] precache miss:', url, err.message);
          })
        )
      )
    ).then(() => {
      // ไม่เรียก skipWaiting ที่นี่ — ให้ SW ใหม่อยู่สถานะ waiting
      // รอผู้ใช้กดปุ่ม "อัปเดต" แล้วค่อยส่ง SKIP_WAITING มา activate
      console.log('[SW] installed, waiting for user to update');
    })
  );
});

// Activate — cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => !k.startsWith(CACHE_VERSION))
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — strategies
self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Skip cross-origin (Firestore, fonts, weather API)
  if (url.origin !== self.location.origin) return;

  // Skip Next.js dev hot-reload websockets / RSC streams
  if (url.pathname.startsWith('/_next/webpack-hmr')) return;

  // Strategy 1: Static assets (JS/CSS/Images/Fonts) — cache-first
  if (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    /\.(?:js|css|woff2?|ttf|otf|eot|png|jpg|jpeg|gif|svg|webp|ico)$/i.test(url.pathname)
  ) {
    event.respondWith(cacheFirst(req, RUNTIME));
    return;
  }

  // Strategy 2: HTML / navigation — network-first with offline fallback
  if (req.mode === 'navigate' || req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirst(req, APP_SHELL));
    return;
  }

  // Default: try cache, then network
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
  );
});

async function cacheFirst(req, cacheName) {
  const cached = await caches.match(req);
  if (cached) return cached;
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    return cached || Response.error();
  }
}

async function networkFirst(req, cacheName) {
  try {
    const res = await fetch(req);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      cache.put(req, res.clone());
    }
    return res;
  } catch (err) {
    const cached = await caches.match(req);
    if (cached) return cached;
    // Last resort: return main page from cache
    const fallback = await caches.match('/');
    if (fallback) return fallback;
    return new Response('ออฟไลน์ — โปรดเชื่อมต่ออินเทอร์เน็ตเพื่อใช้งาน', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}

// Listen to messages (for skipWaiting from client)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
