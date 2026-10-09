/**
 * Service Worker – LDRRMO Diplahan Emergency Response System
 * Provides:
 *  - Offline fallback for the SPA shell
 *  - Background sync for queued emergency reports (tag: sync-reports)
 *  - Cache-first for static assets, network-first for API calls
 */

const CACHE_NAME = 'ldrrmo-v1';
const OFFLINE_REPORT_STORE = 'offline-reports';

const STATIC_URLS = [
  '/',
  '/manifest.json',
  '/favicon.png',
];

// ── Install: pre-cache the app shell ─────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_URLS))
  );
  self.skipWaiting();
});

// ── Activate: purge old caches ───────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for statics ────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Always network-first for Supabase API / edge functions
  if (
    url.hostname.includes('supabase') ||
    url.pathname.startsWith('/functions/')
  ) {
    event.respondWith(fetch(request).catch(() => new Response('{}', { status: 503 })));
    return;
  }

  // Cache-first for same-origin static assets
  if (request.method === 'GET') {
    event.respondWith(
      caches.match(request).then((cached) =>
        cached ||
        fetch(request).then((response) => {
          // Cache successful GET responses for static assets
          if (response.ok && (url.pathname.match(/\.(js|css|png|jpg|svg|woff2?)$/))) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        }).catch(() =>
          // Offline fallback: return cached index.html for navigation requests
          request.destination === 'document'
            ? caches.match('/')
            : new Response('', { status: 503 })
        )
      )
    );
  }
});

// ── Background Sync: flush queued emergency reports ──────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-reports') {
    event.waitUntil(flushOfflineReports());
  }
});

async function flushOfflineReports() {
  const db = await openIDB();
  const tx = db.transaction(OFFLINE_REPORT_STORE, 'readwrite');
  const store = tx.objectStore(OFFLINE_REPORT_STORE);
  const records = await idbGetAll(store);

  for (const record of records) {
    try {
      const resp = await fetch('/functions/v1/report-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record.payload),
      });
      if (resp.ok) {
        store.delete(record.id);
      }
    } catch {
      // Will retry on next sync
    }
  }
}

// ── Minimal IndexedDB helpers (no library dependency) ────────
function openIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('ldrrmo-offline', 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(OFFLINE_REPORT_STORE, { keyPath: 'id', autoIncrement: true });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGetAll(store) {
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
