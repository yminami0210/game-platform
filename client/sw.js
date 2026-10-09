// オフライン用のサービスワーカー。画面とライブラリはキャッシュし、サーバーの API・SSE は素通しにする。
const CACHE = 'nanashi-v1';
const SHELL = ['./', './index.html', './style.css', './main.js', './town.js', './backend.js', './manifest.webmanifest',
  './shared/world.js', './shared/lore.js', './shared/sim.js', './shared/templates.js', './shared/chronicle-core.js', './shared/api.js',
  './vendor/three/build/three.module.js', './vendor/three/examples/jsm/controls/OrbitControls.js', './icons/icon-192.png'];

self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())));
self.addEventListener('activate', (e) => e.waitUntil(
  caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || /\/(api|events|data)\//.test(url.pathname) || url.pathname.endsWith('/events')) return;
  // 新しい版を優先し、つながらないときだけキャッシュを使う
  e.respondWith(fetch(e.request).then((r) => {
    const copy = r.clone();
    if (r.ok) caches.open(CACHE).then((c) => c.put(e.request, copy));
    return r;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
