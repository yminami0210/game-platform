// オフライン対応。キャッシュ一覧と版は tools/sync_sw.mjs が書き直す。
const CACHE_VERSION = 'tsugi-7720c0ae';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon.svg',
  'fonts/DotGothic16-subset.woff2',
  'fonts/KaiseiDecol-Bold-subset.woff2',
  'src/audio/sfx.js',
  'src/core/boss.js',
  'src/core/enemies.js',
  'src/core/level.js',
  'src/core/rng.js',
  'src/core/stage.js',
  'src/core/world.js',
  'src/data/stages/1-1.json',
  'src/data/stages/1-2.json',
  'src/data/stages/1-3.json',
  'src/data/stages/1-4.json',
  'src/data/stages/1-F.json',
  'src/data/stages/1-S.json',
  'src/data/stages/index.json',
  'src/data/text.json',
  'src/data/tuning.json',
  'src/data/world1.json',
  'src/input/input.js',
  'src/main.js',
  'src/render/mapview.js',
  'src/render/renderer.js',
  'src/render/sprites.js',
  'src/render/themes.js',
  'src/save.js',
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
    if (res.ok && new URL(e.request.url).origin === location.origin) caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match('index.html'))));
});
