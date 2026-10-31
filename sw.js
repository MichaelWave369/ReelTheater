// Cache only REEL Theater's app shell, never streamed video or selected files.
const CACHE = "reel-theater-shell-v11";
const SHELL = ["./", "./index.html", "./styles.css", "./src/app.js", "./src/arcade.js", "./src/sources.js", "./src/field.js", "./src/platform.js", "./src/games.js", "./src/playback.js", "./src/remote.js", "./src/device.js", "./src/quicklaunch.js", "./src/portable.js", "./src/performance.js", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png", "./favicon.svg"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("reel-theater-shell-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope);
  if (!url.pathname.startsWith(scope.pathname)) return;
  const relative = url.pathname.slice(scope.pathname.length);
  if (!["", "index.html", "styles.css", "src/app.js", "src/arcade.js", "src/sources.js", "src/field.js", "src/platform.js", "src/games.js", "src/playback.js", "src/remote.js", "src/device.js", "src/quicklaunch.js", "src/portable.js", "src/performance.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "favicon.svg"].includes(relative)) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok) { const copy = response.clone(); caches.open(CACHE).then(cache => cache.put(request, copy)); }
    return response;
  })));
});
