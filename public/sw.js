// Installability-only service worker. It exists solely so Chrome/Android/
// desktop treat Metabo as installable (offering the native install prompt) —
// it does no caching of its own, so it can never serve stale content after a
// deploy. Every request just passes straight through to the network.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
