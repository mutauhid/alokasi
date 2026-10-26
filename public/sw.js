const CACHE_PREFIX = "alokasi-public-shell";
const CACHE_VERSION = "v3";
const CACHE_NAME = `${CACHE_PREFIX}-${CACHE_VERSION}`;
const PRECACHE_URLS = [
  "/offline",
  "/manifest.webmanifest",
  "/theme-init.js",
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
  if (
    request.method === "GET" &&
    new URL(request.url).pathname === "/theme-init.js"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => cached ?? fetch(request)),
    );
    return;
  }
  if (request.method !== "GET" || request.mode !== "navigate") return;

  event.respondWith(
    fetch(request).catch(async () => {
      const cached = await caches.match("/offline");
      return cached ?? Response.error();
    }),
  );
});

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data?.json() ?? {};
  } catch {
    payload = {};
  }
  const title =
    typeof payload.title === "string" ? payload.title : "Pembaruan Alokasi";
  const body =
    typeof payload.body === "string"
      ? payload.body
      : "Buka Alokasi untuk melihat informasi terbaru.";
  const url =
    typeof payload.url === "string" && /^\/(?!\/)/u.test(payload.url)
      ? payload.url
      : "/dashboard";
  const tag =
    typeof payload.tag === "string" ? payload.tag : "alokasi-notification";
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag,
      icon: "/icons/alokasi-192.png",
      badge: "/icons/alokasi-192.png",
      data: { url },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetPath =
    typeof event.notification.data?.url === "string" &&
    /^\/(?!\/)/u.test(event.notification.data.url)
      ? event.notification.data.url
      : "/dashboard";
  const targetUrl = new URL(targetPath, self.location.origin).href;
  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clients) => {
        for (const client of clients) {
          if ("navigate" in client) await client.navigate(targetUrl);
          return client.focus();
        }
        return self.clients.openWindow(targetUrl);
      }),
  );
});
