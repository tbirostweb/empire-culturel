# jeu-pas

**Empire Culturel** — jeu de collection de monuments historiques en PWA
(web, installable à l'écran d'accueil) : boosters + Farm idle + arbre
technologique + missions + prestige + classement. 100% client-only — aucun
backend, aucun compte ; toute la progression (ressources, collection,
Farm, arbre) est stockée dans le `localStorage` du navigateur via Pinia +
`pinia-plugin-persistedstate`. Aucune valeur réelle, aucun retrait, aucun
échange.

> Historique : le projet a démarré sur une boucle "marche pour gagner" (pas
> → coins, via Health Connect/HealthKit) avant un premier pivot vers une PWA
> avec économie de connexion quotidienne/pubs/casino adossée à un backend
> Express/MySQL, un second pivot vers un jeu de cartes de créatures
> (idle auto-battle + deckbuilding + ladder), puis ce troisième pivot vers
> Empire Culturel — entièrement client-only à chaque fois. `api/`,
> `shared/` et `docker-compose.yml` ont été supprimés dès le premier pivot.
> Les plateformes Capacitor Android/iOS restent dans le repo
> (`app/android`, `app/ios`) mais ne sont plus le canal de distribution
> principal.

## Prérequis

- Node.js LTS + npm

## Structure

```
jeu-pas/
  app/       Frontend Vue 3 (seul workspace du monorepo)
    src/
      data/         catalogues statiques (monuments, raretés, boosters, arbre technologique, missions)
      engine/       moteur de jeu pur (tirage de booster, revenu Farm, fusion, prestige, classements, RNG)
      stores/       Pinia (orchestrent l'engine, persistance localStorage)
      components/   UI, monuments, arbres, navigation
      views/        les 6 onglets (Farm, Collection, Boosters, Techno, Classement, Profil)
```

## Lancement

```bash
npm install
npm run dev -w app
```

Ouvrir http://localhost:5173 — le jeu est jouable immédiatement, sans
inscription : ouvre un booster depuis l'onglet Boosters pour obtenir ton
premier monument, place-le en Farm pour générer de l'Or.

**PWA** : `app/public/manifest.json` + `sw.js` rendent l'app installable
depuis un navigateur (icône à l'écran d'accueil, mode standalone sans barre
de navigateur). Sur Android/Chrome, un bandeau d'installation apparaît
automatiquement ; sur iOS/Safari, il faut passer par Partager → Sur l'écran
d'accueil.

## Android / iOS (optionnel — coquille Capacitor)

Le PWA est le canal principal. `app/android/` et `app/ios/` restent dans le
repo si tu veux quand même empaqueter l'app en natif (ex. sideload Android).

```bash
npm run build -w app
npx cap sync            # ou : cd app && npx cap sync
npx cap open android    # ou : npx cap open ios (nécessite un Mac + Xcode complet)
```

Prérequis Android : Android Studio (SDK, min SDK 26). Prérequis iOS : un Mac
avec Xcode complet.

## Déploiement (Dokploy)

App 100% statique, sans variable d'environnement : type **Dockerfile**
(`app/Dockerfile`), build depuis la racine du monorepo (build path `/`).
Le conteneur tourne en utilisateur non privilégié (UID 101) et écoute sur le
port **8080** (à renseigner dans Dokploy ; healthcheck sur ce port). Réglages
Dokploy conseillés : système de fichiers en lecture seule avec `/tmp` en tmpfs,
suppression des capabilities, limites CPU/RAM, redémarrage automatique.

Tests : `npm run test:app` (profils/stockage, cache SW, en-têtes, a11y statique).

```bash
curl -sSI https://ton-domaine/   # 200 + en-têtes de sécurité ; /chemin-inconnu => 404
```

`docker-compose.yml` n'existe plus (plus de base de données à faire tourner
en local ni en prod).
