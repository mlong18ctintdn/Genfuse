/*
 * GENFUSE service worker (basic).
 *
 * Purpose: make the app installable (Chrome on Android) and show a friendly page when the
 * phone is offline.
 *
 * Deliberately NOT cached: app pages, /api, Supabase, payments, photos and voice notes.
 * Family conversations and memories are private and often opened on a shared tablet,
 * so nothing personal is ever stored by this worker. If you want offline reading later,
 * add it with care (per-user caches, cleared at sign-out).
 */
const VERSION = 'genfuse-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icon-192x192.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only page navigations are handled; everything else goes straight to the network.
  if (req.method !== 'GET' || req.mode !== 'navigate') return;

  event.respondWith(
    fetch(req).catch(async () => {
      const cached = await caches.match(OFFLINE_URL);
      return cached || new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
    }),
  );
});
