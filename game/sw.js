// オフライン対応。アセットを変えたら CACHE_VERSION を上げる。
const CACHE_VERSION = 'v6';
const ASSETS = [
  './', 'index.html', 'manifest.webmanifest', 'icons/icon.svg',
  'src/main.js', 'src/core/game.js', 'src/core/rng.js', 'src/core/loop.js', 'src/render/renderer.js',
  'src/input/input.js', 'src/audio/sfx.js', 'src/audio/bgm.js', 'src/save.js', 'src/data/balance.json', 'src/data/layers.json', 'src/data/texts.json', 'src/data/creatures.json', 'src/data/colors.json', 'src/ui/screens.js', 'fonts/yuji-boku.woff2', 'fonts/kiwi-maru-500.woff2', 'icons/icon-192.png', 'icons/icon-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone();
    caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('index.html'))));
});
