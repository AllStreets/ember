/* EMBER service worker — caches the entire console so it loads with the network
   fully dead. Cache-first for our own files; never touches the local LLM origin. */
const CACHE = 'ember-v22';
const ASSETS = [
  './', 'index.html', 'css/app.css', 'manifest.webmanifest', 'icon.svg',
  'data/kb.js', 'data/ref.js', 'data/guide.js',
  'js/store.js', 'js/llm.js', 'js/app.js',
  'js/home.js', 'js/advisor.js', 'js/survival.js', 'js/fieldguide.js', 'js/navigate.js',
  'js/tools.js', 'js/reference.js', 'js/log.js', 'js/power.js', 'js/forge.js',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // Only handle same-origin GETs; let the local LLM (localhost:11434) pass straight through.
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match('index.html')))
  );
});
