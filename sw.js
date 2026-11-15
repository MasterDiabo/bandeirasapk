// Service worker: torna o jogo instalável como app e deixa-o abrir com a rede fraca.
// Estratégia "rede primeiro": vai sempre buscar a versão nova; se não houver rede, usa a última guardada.
const CACHE = 'bandeiras-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Os mosaicos do mapa não se guardam (são muitos)
  if (req.url.includes('tile.openstreetmap.org')) return;
  e.respondWith(
    fetch(req)
      .then(resp => {
        if (resp.ok) { const copia = resp.clone(); caches.open(CACHE).then(c => c.put(req, copia)); }
        return resp;
      })
      .catch(() => caches.match(req))
  );
});
