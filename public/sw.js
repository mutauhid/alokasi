const CACHE_PREFIX = "alokasi-public-shell";
const CACHE_VERSION = "v1";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/icons/alokasi-192.png",
  "/icons/alokasi-512.png",
  "/icons/alokasi-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match("/offline");
      return cached ?? Response.error();
    }),
  );
});
