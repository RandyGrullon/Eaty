// Service Worker de Eaty.
// - Estáticos (/_next/static, iconos, manifest): cache-first.
// - Navegaciones: network-first con fallback a la copia en caché (y a "/").
// - /api y peticiones de otros orígenes (Firebase, Groq, etc.): nunca se cachean.
// - Push: muestra la notificación; al pulsarla enfoca/abre la app.

const CACHE_VERSION = "v3";
const STATIC_CACHE = `eaty-static-${CACHE_VERSION}`;
const PAGES_CACHE = `eaty-pages-${CACHE_VERSION}`;
const KEEP_CACHES = [STATIC_CACHE, PAGES_CACHE];

const PRECACHE_PAGES = ["/"];
const PRECACHE_STATIC = [
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const pages = await caches.open(PAGES_CACHE);
      const statics = await caches.open(STATIC_CACHE);
      // Si algo falla (p. ej. sin red), no se bloquea la instalación.
      await Promise.allSettled([
        pages.addAll(PRECACHE_PAGES),
        statics.addAll(PRECACHE_STATIC),
      ]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => !KEEP_CACHES.includes(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// En `next dev` los chunks de /_next/static no llevan hash y cambian con cada
// edición: no se cachean en hosts locales para no servir código viejo.
const IS_LOCAL_DEV_HOST = ["localhost", "127.0.0.1", "[::1]"].includes(
  self.location.hostname
);

function isStaticAsset(url) {
  return (
    (!IS_LOCAL_DEV_HOST && url.pathname.startsWith("/_next/static/")) ||
    url.pathname === "/manifest.json" ||
    /^\/icon-[\w-]+\.(png|jpg|jpeg|svg|webp)$/.test(url.pathname) ||
    url.pathname === "/favicon.ico"
  );
}

async function cacheFirst(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function networkFirstNavigation(request) {
  const cache = await caches.open(PAGES_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (err) {
    const cached =
      (await cache.match(request, { ignoreSearch: true })) ||
      (await cache.match("/"));
    if (cached) return cached;
    return new Response(
      "<!doctype html><meta charset='utf-8'><title>Eaty</title><p>Sin conexión. Vuelve a intentarlo cuando tengas internet.</p>",
      { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Solo mismo origen; Firebase/Groq/Storage/etc. van directos a la red.
  if (url.origin !== self.location.origin) return;
  // Nunca cachear la API.
  if (url.pathname.startsWith("/api/")) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request));
  }
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let data;
  try {
    data = event.data.json();
  } catch (e) {
    data = { title: "Eaty", body: event.data.text() };
  }
  const options = {
    body: data.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: data.primaryKey,
      url: typeof data.url === "string" ? data.url : "/",
    },
  };
  event.waitUntil(
    self.registration.showNotification(data.title || "Eaty", options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(
    (event.notification.data && event.notification.data.url) || "/",
    self.location.origin
  ).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin) {
          await client.focus();
          if ("navigate" in client && client.url !== target) {
            await client.navigate(target).catch(() => undefined);
          }
          return;
        }
      }
      await self.clients.openWindow(target);
    })()
  );
});
