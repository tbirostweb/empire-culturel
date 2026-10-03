// Service worker minimal : cache les fichiers statiques de l'app (shell),
// ne touche jamais aux requêtes vers l'API (autre origine — carte-api.* —
// donc déjà exclues naturellement par le test d'origine ci-dessous). Les
// soldes/comptes doivent toujours venir du serveur, jamais du cache.
const CACHE_NAME = 'jeu-pas-v2';
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Le shell HTML doit toujours refléter le dernier déploiement : réseau
  // d'abord, cache seulement en secours hors-ligne. Bug réel rencontré
  // avec un cache-first ici : `index.html` référence les noms de fichiers
  // hashés (Vite) du build courant, donc servir une version en cache
  // servait indéfiniment les anciens bundles après chaque déploiement —
  // un redesign complet devenait invisible malgré un déploiement réussi.
  const isNavigation =
    event.request.mode === 'navigate' || url.pathname === '/' || url.pathname === '/index.html';
  if (isNavigation) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)),
    );
    return;
  }

  // Assets statiques nommés avec un hash de contenu (ex. index-abc123.js) :
  // un cache-first est sûr ici, une nouvelle version a toujours un nom de
  // fichier différent, donc jamais de staleness possible sur ces requêtes.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      });
    }),
  );
});
