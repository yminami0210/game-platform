/* 二度目の夜 — オフライン用の最小 Service Worker（同一オリジンの静的ファイルのみ） */
const CACHE = "second-night-v2";
const FILES = ["./", "index.html", "style.css", "story.js", "app.js", "manifest.webmanifest", "icon.svg", "og.png", "LICENSES.md"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
// ネットワーク優先・失敗時はキャッシュ（更新がすぐ反映されるように）
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })
      .catch(() => caches.match(e.request).then((r) => r || caches.match("index.html")))
  );
});
