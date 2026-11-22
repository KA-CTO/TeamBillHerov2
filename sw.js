/* BillHero service worker — network-first, cache fallback.
   Keeps the app installable + usable with no internet, WITHOUT
   ever serving stale code during the demo (network wins when online). */
const CACHE = "billhero-v3";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./config.js", "./db.js", "./manifest.json"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // let cross-origin calls (Gemini API, reverse-geocoder) go straight to network
  if (url.origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
  );
});
