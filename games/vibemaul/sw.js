// Service worker for Vibemaul som app: allt spelet behover cachas vid
// installation, sa appen startar och fungerar utan natverk. Byt VERSION nar
// filerna andras, annars ser installerade appar den gamla versionen.
const VERSION = 'vibemaul-v3-kedjor';
const FILER = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './data.js', './maze.js', './sim.js', './art.js', './mobile.js', './game.js', './app.js',
  './bilder/towers-atlas.webp', './bilder/enemies-atlas.webp',
  './ikoner/ikon-192.png', './ikoner/ikon-512.png', './ikoner/ikon-maskable-512.png',
  '../../style.css', '../common.js'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(VERSION).then(cache => cache.addAll(FILER)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(caches.keys()
    .then(nycklar => Promise.all(nycklar.filter(n => n.startsWith('vibemaul-') && n !== VERSION).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

// Natverket forst for sidor och skript (sa uppdateringar syns direkt nar
// natet finns), cachen som reserv. Bilder och ikoner tas fran cachen forst.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  const bild = /\.(webp|png)$/.test(new URL(req.url).pathname);
  if (bild) {
    event.respondWith(caches.match(req).then(svar => svar || fetch(req)));
    return;
  }
  event.respondWith(fetch(req).then(svar => {
    if (svar.ok) { const kopia = svar.clone(); caches.open(VERSION).then(cache => cache.put(req, kopia)); }
    return svar;
  }).catch(() => caches.match(req, { ignoreSearch: true })));
});
