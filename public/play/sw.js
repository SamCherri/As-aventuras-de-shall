const CACHE = "shall-aventuras-v40-network-first";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=36",
  "./game.js?v=36",
  "./stage4-bridge.js?v=37",
  "./stage4.html",
  "./stage4.css?v=39",
  "./stage4-arena-depth.css?v=1",
  "./stage4-parity.css?v=1",
  "./stage4.js?v=40",
  "./stage4-hero-parity.js?v=1",
  "./stage4-enemy-parity.js?v=2",
  "./stage4-boss-parity.js?v=1",
  "./stage4-reef-parity.js?v=1",
  "./stage4-scene-parity.js?v=2",
  "./stage4-zone-parity.js?v=1",
  "./stage4-lighting-parity.js?v=1",
  "./stage4-impact-parity.js?v=1",
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
  "./assets/boss-watchers-32.png",
  "./assets/stage4/art-atlas.b64.00.txt?v=40",
  "./assets/stage4/art-atlas.b64.01.txt?v=40",
  "./assets/stage4/art-atlas.b64.02.txt?v=40",
  "./assets/stage4/art-atlas.b64.03.txt?v=40",
  "./assets/stage4/art-atlas.b64.04.txt?v=40",
  "./assets/stage4/art-atlas.b64.05.txt?v=40",
  "./assets/stage4/art-atlas.b64.06.txt?v=40",
  "./assets/stage4/art-atlas.b64.07.txt?v=40",
  "./assets/stage4/art-atlas.b64.08.txt?v=40",
  "./assets/stage4/art-atlas.b64.09.txt?v=40",
  "./assets/stage4/art-atlas.b64.10.txt?v=40",
  "./assets/stage4/art-atlas.b64.11.txt?v=40",
  "./assets/stage4/art-atlas.b64.12.txt?v=40",
  "./assets/stage4/art-atlas.b64.13.txt?v=40"
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

  const isGameCode = event.request.destination === "script" || event.request.destination === "style";
  if (isGameCode) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
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