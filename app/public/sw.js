// Service worker minimal : cache les fichiers statiques de l'app (shell) ;
// les requêtes d'autres origines ne sont jamais interceptées. Aucune donnée de
// jeu n'est en cache : elle vit dans le localStorage, que ce SW ne touche pas
// (une mise à jour du SW ne peut donc pas faire perdre de progression).
//
// Version du cache : à incrémenter quand la stratégie change. Les fichiers
// /assets/* sont hashés (cache-first sûr) ; tout le reste (modèles 3D,
// manifest, icônes — noms stables) passe par réseau d'abord, cache en secours.
const CACHE_PREFIX = 'empire-culturel-';
const CACHE_NAME = `${CACHE_PREFIX}v3`;
const PRECACHE_URLS = ['/', '/index.html', '/manifest.json'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k)))),
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

  // Ressources à nom stable (modèles 3D, manifest, icônes) : réseau d'abord
  // pour refléter le dernier déploiement, cache en secours hors-ligne.
  if (!url.pathname.startsWith('/assets/')) {
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

  // Assets nommés avec un hash de contenu (ex. /assets/index-abc123.js) :
  // cache-first est sûr, une nouvelle version a toujours un nom différent.
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
