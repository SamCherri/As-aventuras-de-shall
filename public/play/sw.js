const CACHE = "shall-aventuras-v36";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=36",
  "./game.js?v=36",
  "./manifest.webmanifest",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/shall-actions.png",
  "./assets/shall-walk-cycle.png",
  "./assets/shall-short-neck-idle.png",
  "./assets/shall-short-neck-actions.png",
  "./assets/shall-head-back-walk.png",
  "./assets/cleyde.png",
  "./assets/joyce-cenorita-v2.png",
  "./assets/joyce-actions.png",
  "./assets/joyce-watcher-day-32.png",
  "./assets/rock-side-actions.png",
  "./assets/rock-front-watcher.png",
  "./assets/bar-enemies.png",
  "./assets/carrot-enemies.png",
  "./assets/carrot-elites.png",
  "./assets/bar-district-v2.png",
  "./assets/stage1-carrot-district-day-32.png",
  "./assets/joyce-market-arena-day-32.png",
  "./assets/rock-arena-bg.png",
  "./assets/bar-props.png",
  "./assets/rock-flee.png",
  "./assets/zico-actions-32.png",
  "./assets/zico-flee-32.png",
  "./assets/teiu-bees-32.png",
  "./assets/forest-enemies-32.png",
  "./assets/mata-horta-stage-32.png",
  "./assets/biluia-actions-32.png",
  "./assets/boss-watchers-32.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key.startsWith("shall-aventuras-") && key !== CACHE)
        .map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(CACHE).then((cache) => cache.put(event.request, copy));
      }
      return response;
    }))
  );
});
