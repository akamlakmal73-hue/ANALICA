/* ANALICA - service worker (versi 3)
   - Naikkan angka VERSION tiap kali mau memaksa semua perangkat ambil file baru.
   - Hanya menangani file milik ANALICA sendiri (alamat yang sama), metode GET.
   - Panggilan ke supabase.co dan alamat luar lain TIDAK disentuh dan TIDAK pernah di-cache.
   - File aplikasi: ambil dari internet dulu, kalau offline baru pakai cadangan. */
const VERSION = 'v3';
const CACHE = 'analica-' + VERSION;
const FILES = ['./', './index.html', './manifest.json', './auth.js', './sync.js',
               './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;   /* supabase.co, jsdelivr, fonts: biarkan browser */

  e.respondWith(
    fetch(new Request(req.url, { cache: 'no-cache' }))
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then(r => (r ? r : caches.match('./index.html'))))
  );
});
