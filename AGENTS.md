# Conventions du projet — jeu-pas

## Architecture non négociable

- **Profils LOCAUX, pas de comptes** (`utils/profiles.js`,
  `components/profiles/ProfileGate.vue`). L'utilisateur a demandé
  "inscription avec email et mdp" ; comme il n'y a pas de backend, un
  "compte" n'est qu'un jeu de clés dans le localStorage de cet appareil.
  L'email sert d'identifiant local, le mot de passe sépare plusieurs joueurs
  sur le même téléphone. **Ce n'est PAS de la sécurité** : qui a accès à
  l'appareil lit le localStorage et contourne l'écran. On stocke malgré tout
  un haché PBKDF2 salé et **jamais le mot de passe en clair**, parce que les
  gens réutilisent leurs mots de passe et qu'en laisser traîner un exposerait
  bien au-delà de ce jeu. Rien n'est synchronisé — **l'écran le dit
  explicitement et conseille de ne pas réutiliser un mot de passe
  important** ; ne jamais laisser croire à un compte en ligne. Le
  changement de profil SNAPSHOTE les clés de jeu vers `profil:<id>:<clé>`
  puis recharge la page, plutôt que de préfixer la clé de persistance des
  huit stores Pinia (ce qui aurait imposé de gérer leur réhydratation à
  chaud). `adoptLegacySaveIfAny()` récupère une partie commencée avant
  l'existence des profils. **Toute nouvelle clé de store persisté doit être
  ajoutée à `GAME_KEYS`**, sinon elle fuiterait d'un profil à l'autre.
- **100% client-only, aucun backend en v1.** Pinia + `pinia-plugin-persistedstate`
  (localStorage) est la seule persistance. Il n'y a ni compte, ni API, ni
  base de données — `api/`, `shared/` et `docker-compose.yml` (MySQL) ont
  été supprimés lors du pivot vers le jeu de cartes, bien avant le pivot
  actuel vers "Empire Culturel" (voir Historique ci-dessous). Un vrai
  backend (comptes réels, classement global avec de vrais autres joueurs,
  cross-device) est prévu en **Phase 2 future, hors scope actuel** — ne
  pas en anticiper l'existence dans le code. Conséquence directe pour le
  classement actuel : il n'y a pas de vrais autres joueurs, cf. `engine/rankings.js`.
- **Le moteur de jeu (`app/src/engine/`) est pur** : aucune dépendance à
  Vue/Pinia, prend un état en entrée et retourne un nouvel état
  (`gacha.js`, `farm.js`, `fusion.js`, `modifiers.js`, `prestige.js`,
  `rankings.js`, `rng.js`). Les stores (`app/src/stores/`) orchestrent ces
  fonctions pures et appliquent les récompenses en sortie ; ils ne
  contiennent aucune règle de jeu eux-mêmes.
- **RNG toujours via `engine/rng.js`** (mulberry32 seedable), jamais
  `Math.random()` ailleurs. Deux usages distincts, ne pas les confondre :
  - **Seed déterministe/rejouable** : les missions et la saison de
    classement sont tirées par seed du jour/de la saison (même joueur =
    même tirage toute la journée/saison).
  - **Seed non rejouable** (`freshSeed()` + `stores/meta.js#rngNonce`,
    incrémenté à chaque tirage) pour l'ouverture de boosters — le joueur
    ne doit jamais pouvoir prédire ni rejouer un tirage à l'identique.
    Sans backend, il n'y a de toute façon plus d'enjeu anti-triche
    multijoueur (un joueur qui trafique son propre `localStorage` ne
    prend rien à personne) — l'exigence ici est seulement
    l'imprévisibilité perçue, pas une garantie cryptographique.
- **Début de partie : un monument OFFERT au premier lancement**
  (`stores/collection.js#accorderMonumentDeDepart`, placé automatiquement en
  Farm par `App.vue`). Sans lui un nouveau joueur démarre à 0 Or/s — la Farm
  ne produit rien tant qu'il n'a pas ouvert un booster ET placé le résultat.
  C'était le vrai mur du début ("le jeu est un peu dur a commencer"), plus
  encore que le prix des boosters.
- **Équilibrage : revenus de Farm divisés par ~20, boosters ~2,5x moins
  chers, probabilités hautes resserrées** (retour utilisateur : "trop facile
  d'avoir des booster", "baisser le prix bcp bcp de la farm"). Un Légendaire
  rapportait 60 Or/s pour un booster à 100 Or — soit un booster toutes les
  deux secondes. Désormais 5 Or/s pour un booster à 40 Or. Le Booster Or est
  passé de 12% à 4% de Légendaire et de 5% à 0,7% de Mythique. Les récompenses
  de mission/streak ont été recalibrées en conséquence : à l'ancienne échelle
  elles représentaient plus d'une heure de Farm. **Ces trois curseurs
  (revenus, coûts, probabilités) se règlent ENSEMBLE** — n'en toucher qu'un
  casse la courbe. Vérifier avec une simulation de la boucle réelle, pas à
  l'intuition. **Second temps de ce réglage** : la division par 20 avait
  rendu le début de partie décrochant (près de 7 minutes pour le premier
  booster avec deux Communs). Le correctif n'est PAS de tout remonter — ce
  serait revenir au problème initial — mais de RÉDUIRE L'AMPLITUDE : le bas
  de l'échelle monte fort (x5 sur Commun), le haut peu (x1,4 sur Mythique).
  L'écart Commun -> Mythique passe de 360x à 100x, le premier booster tombe
  à ~1 minute, et la fin de partie ne redevient pas triviale.
- **`stores/rankings.js#BALANCE_VERSION`** : les rivaux sont calés une seule
  fois sur le débit du joueur au début de la saison. Après un rééquilibrage
  qui change l'ordre de grandeur des revenus, il FAUT incrémenter ce
  compteur, sinon les rivaux d'une saison déjà commencée restent calibrés sur
  l'ancienne échelle et deviennent définitivement inatteignables.
- **Rareté = puissance, assumé (contraire du jeu de cartes précédent).**
  Contrairement à l'ancien jeu de cartes où la rareté ne changeait jamais
  la puissance brute d'une carte, "Empire Culturel" assume explicitement
  l'inverse par brief produit (§7) : la rareté d'un monument
  (`data/rarity.js`) influence directement son revenu de base et sa
  valeur de collection (`baseRevenue`/`baseValue`), en plus des chances
  d'obtention et de l'apparence. **Ne jamais réappliquer le principe
  "rareté ≠ puissance" de l'ancien jeu ici** — c'est un choix de design
  différent, assumé, pas un oubli.
- **Trois ressources** (`or`, `cristaux`, `pointsTech`) — remplace les
  "Or/Éclats" de l'ancien jeu de cartes, sur demande explicite du brief
  "Empire Culturel" (§14). Gérées uniquement par
  `stores/player.js#credit()`/`debit()`/`creditMany()` — pas de ledger
  séparé façon `wallet.js`. Or = monnaie principale (boosters,
  progression) ; Cristaux = monnaie premium (jamais réinitialisés par un
  Prestige, cf. `stores/prestige.js`) ; Points technologie = arbre
  technologique uniquement.
- **Le serveur ne décide plus de la date** (n'existe plus) : c'est
  `stores/meta.js` (`lastLoginDate`, `lastSeen`) qui fait foi côté client
  pour le streak quotidien et les revenus Farm hors-ligne. Un joueur qui
  change l'heure de son appareil peut en théorie tricher sur ces
  mécaniques — accepté comme compromis du 100% client-only (aucune valeur
  réelle en jeu).
- Toutes les entrées API n'existent plus (pas d'API) ; les validations de
  formes de données vivent dans les stores/engine directement, pas via
  `zod` (retiré avec `api/`).
- **JavaScript pur partout, pas de TypeScript** (préférence explicite de
  l'utilisateur, plus à l'aise en JS).
- **`app/nginx.conf` : `/sw.js` doit toujours avoir sa propre `location =
  /sw.js`** avec `Cache-Control: no-cache`, séparée du bloc regex
  `\.(?:css|js|...)$` qui donne un cache 30j "immutable" aux bundles
  hashés. Piège réel rencontré : sans ce bloc dédié, le service worker
  lui-même héritait du cache 30 jours — le navigateur ne revérifiait plus
  jamais s'il y avait une nouvelle version, donc un déploiement restait
  invisible pendant un mois pour tout visiteur déjà passé sur le site.
  Diagnostiquer ce genre de "je ne vois pas mes changements" en comparant
  le bundle servi par le serveur (curl) à ce que le navigateur affiche,
  pas en supposant d'emblée un problème de code applicatif.
- **Toute ressource externe (image, police) doit être ajoutée à la CSP
  `app/nginx.conf` (`img-src`/`style-src`/`font-src`) — et vérifiée
  derrière cette CSP, pas seulement en `vite dev`.** Piège réel rencontré :
  des ressources externes (images, polices Google Fonts) s'affichaient
  parfaitement en dev (Vite ne pose aucun header CSP) mais disparaissaient
  silencieusement une fois déployées derrière nginx, dont la CSP par
  défaut bloque tout domaine externe non listé — sans la moindre erreur
  visible à l'écran. Un changement de police ou d'image externe qui
  "marche en dev" ne prouve rien sur la prod : tester contre un serveur
  qui envoie la vraie CSP de `nginx.conf` avant de considérer que c'est
  bon. **"Empire Culturel" n'a actuellement aucune image externe** (les
  monuments sont des emblèmes SVG générés, `data/monumentEmblems.js` —
  voir Direction artistique) : si des photos réelles de monuments sont
  ajoutées un jour, ce piège redevient pertinent.
- **Ne jamais construire un `var(--color-X)` dynamiquement dans un binding
  `:style`** (ex. `` `var(--color-${rarete})` ``) **si `X` n'apparaît nulle
  part ailleurs comme nom de classe Tailwind littéral.** Piège réel
  rencontré (sur l'ancien jeu de cartes, toujours valable) : Tailwind v4 ne
  génère un `--color-x` déclaré dans `@theme` que si un nom de classe
  littéral l'utilise quelque part dans le code — un lookup construit
  dynamiquement n'est jamais vu par son scanner de contenu, d'où un
  `background-color: rgba(0,0,0,0)` silencieux. Solution systématique :
  une constante JS (`data/rarity.js#RARITY_COLORS`) plutôt qu'un lookup
  CSS var pour toute couleur qui n'a pas par ailleurs une classe Tailwind
  littérale dans le code.
- **Contraste AA sur fond sombre : calculer, ne jamais évaluer à l'oeil.**
  `--color-ink-faint` avait été posé à `#5b6070` lors du premier passage
  sur cette palette dark et ne passait que ~2.85:1 sur `--color-surface`
  (sous le seuil AA 4.5:1 pour du texte de petite taille, la quasi-totalité
  de ses usages) — corrigé à `#7c8393` (~5:1) via la formule de luminance
  relative WCAG. Refaire ce calcul avant de retoucher un token de texte
  "faint/soft" sur fond sombre.

## Historique du pivot produit

Le projet a démarré sur une boucle "marche pour gagner" (pas → coins, via
Health Connect/HealthKit, app Capacitor native), puis a pivoté vers une PWA
web-only avec une économie de connexion quotidienne/pubs récompensées/casino
adossée à un backend Express/MySQL serveur-autoritaire, puis vers un **jeu
de cartes de créatures** (idle auto-battle + deckbuilding + ladder,
100% client-only). `api/`, `shared/`, `docker-compose.yml` et tous les
stores/vues/composants liés à ces anciennes économies ont été supprimés
intégralement à chaque pivot plutôt que conservés en code mort.

**Pivot le plus récent (2026-07-21) : du jeu de cartes de créatures vers
"Empire Culturel"**, un jeu de collection de monuments historiques + économie
idle + progression + compétition, sur brief produit complet fourni par
l'utilisateur ("REFONTE COMPLETE DU JEU — PROJET EMPIRE CULTUREL"). Nettoyage
total du jeu de cartes précédent (combat, casino, deckbuilding, arbre de
compétence de créatures, expérimentation 3D FBX/Three.js) plutôt que
conservé en code mort — voir Jeu ci-dessous pour l'état actuel. Comme pour
les pivots précédents : **ne jamais supposer qu'un principe de jeu, une
palette ou une mécanique d'un ancien commit est encore d'actualité** — ce
fichier fait foi sur l'état courant, toujours le relire avant d'agir.

`app/android/` et `app/ios/` (coquilles Capacitor) restent dans le repo,
toujours hors sujet du canal de distribution principal (PWA). L'ancien
dossier `personnage/` (FBX/textures/animations/armes de l'expérimentation
3D du jeu de cartes précédent) a été **supprimé sur confirmation explicite
de l'utilisateur** ("supprime le dossier personnage il nous sert plus")
lors du round de retouches suivant le pivot Empire Culturel. Remplacé par
`monuments/glb/` à la racine (GLB préféré au FBX pour ce nouveau pack :
texture déjà intégrée dans le fichier, pas de résolution de chemin de
texture séparée à gérer) — l'utilisateur y a déposé 12 modèles low-poly,
copiés dans `app/public/models/monuments/` pour être servis par Vite et
intégrés au catalogue (cf. section Jeu, "Monuments"). `monuments/animation/`
reste vide en réserve si des fichiers d'animation séparés sont fournis un
jour ; ne pas le recréer différemment sans redemander.

## Direction artistique

**Identité "PLAN D'ARCHITECTE"** (choisie explicitement par l'utilisateur
parmi 4 directions proposées, après un retour : ni la police ni les couleurs
de l'identité "carnet de voyage" claire ne lui plaisaient). C'est le PREMIER
thème SOMBRE du projet — tous les contrastes sont recalculés pour du texte
clair sur fond bleu foncé (méthode inverse du papier : monter la luminosité
jusqu'au seuil AA, jamais la baisser).

Le parti pris : l'écran est un RELEVÉ D'ARCHITECTE — fond bleu de plan
(`#0D2440`), grille technique fine en filigrane (dégradés CSS purs, jamais
une image — CSP nginx), crochets d'angle façon repère de cadrage sur chaque
panneau (`.panel::before/::after`), titres en grotesque condensé majuscule
(cartouche de plan), et TOUS les nombres en chasse fixe (sur un plan, un
nombre est une cote). Un monument n'est plus une photo collée mais une pièce
tracée sur un calque quadrillé teinté par sa rareté (`MonumentModel`
`cardBackground`). Les étiquettes de rareté (`.stamp`) ne sont plus des
tampons encreurs mais des COTES : libellé mono + crochet de trait +
couleur de rareté. Ne jamais supposer que "revenir à l'ancien style" serait
un simple undo — vérifier ce fichier avant d'agir.

- **Polices** (Google Fonts, mêmes hôtes, CSP inchangée) : **Barlow
  Condensed** (titres), **Barlow** (corps), **IBM Plex Mono** (chiffres,
  cotes, libellés techniques).
- **Palette** (`app/src/style.css`, `@theme`) : fond `#0D2440`, surface
  `#123157`, relevé `#1B3E6B`, liseré `#2C5590`, texte `#EAF2FB` / `#9FB6D4`
  / `#9AACC5`. **Accent = CYAN traçant `#35D6C4`** (CTA + tracés actifs, à
  texte SOMBRE dessus car lumineux) ; **`--color-encre` bleu clair `#69ADFF`
  = accent secondaire**, jamais un bouton. Toutes les valeurs vérifiées à
  >= 4.5:1 sur les trois fonds bleus (méthode fond sombre, cf. AGENTS.md).
  Raretés en versions LUMINEUSES (data/rarity.js#RARITY_COLORS) recalculées
  pour ce fond sombre.
- **Formes** : coins presque droits (`--radius-sm/md/lg/xl/2xl` surchargés
  à **2-6px** dans `@theme`, `--radius-full` gardé à `9999px` pour les
  pastilles/avatars) — une fiche, une photo collée ou un tampon n'ont pas
  de gros arrondis. Valeurs volontairement non nulles : un angle
  parfaitement vif lit "wireframe" à l'écran. Toute classe littérale
  `rounded-*` déjà posée dans les vues suit automatiquement.
  Les ombres sont **courtes et basses** (contact avec la page), plus le
  halo diffus façon "carte Material" d'avant.
- **Fond du `body`** : la **grille technique** de plan (deux trames de traits
  en dégradés CSS purs, jamais une image — CSP nginx). Le grain de papier de
  l'ancienne DA claire a été retiré avec elle.
- **`.stamp` = une COTE, plus un tampon** : libellé mono (IBM Plex) +
  crochet de trait + couleur de rareté, jamais incliné. L'ancien tampon
  encreur Courier de travers (`rotate(-2.5deg)`) et l'ancienne
  `.rarete-badge` (pastille pleine à texte blanc) ont tous deux disparu.
  **Toutes** les valeurs de texte sont vérifiées à >= 4.5:1 (AA petit texte)
  sur les **trois** fonds bleus via la formule de luminance relative WCAG —
  calculées, jamais réglées à l'oeil (méthode fond sombre : monter la
  luminosité jusqu'au seuil, cf. plus bas).
- **Icônes : Phosphor (`@phosphor-icons/vue`), en poids `regular`** — un
  trait d'épaisseur uniforme, comme un dessin à l'encre. Le poids
  `duotone` précédent (aplat translucide sous le trait) a été abandonné
  sur retour utilisateur : c'est un rendu d'interface logicielle, pas de
  trait tracé. `AppIcon.vue` garde le même patron (un seul mapping
  nom→composant, aucune branche `v-else-if`) et expose désormais une prop
  `weight` : la tab bar passe **`fill` sur l'onglet actif** et `regular`
  ailleurs, l'opposition trait/plein remplaçant la pastille de fond
  arrondie. Quelques icônes restent littéralement thématiques :
  `PhFarm`, `PhRanking`, `PhTreasureChest`.
- **Un seul canal de couleur sémantique : la RARETÉ**
  (`data/rarity.js#RARITY_COLORS`, 7 paliers avec `secret`) — contrairement
  au jeu de cartes précédent qui avait deux canaux distincts (type de
  créature + rareté), les monuments n'ont pas de "type" élémentaire, donc pas
  de second canal à garder séparé. Sur ce fond bleu foncé, les teintes sont
  des versions **LUMINEUSES** recalculées pour passer AA (4.5:1) sur les trois
  fonds bleus — surtout pas les pigments sombres de l'ancienne DA papier, qui
  disparaîtraient sur le bleu. Valeurs dans `RARITY_COLORS`, consommées via
  constante JS, jamais `var(--color-${rarete})` (piège Tailwind tree-shaking
  documenté plus haut). `secret` (vert-de-gris `#036963` → version claire) est
  la seule famille qu'aucun autre palier n'occupe.
- **Les tuiles de monuments** (`MonumentTile.vue`) : le rendu 3D est posé sur
  un calque quadrillé teinté par la rareté, et le nom est une **légende SOUS
  le rendu** (plus jamais par-dessus), avec le pays en mono et la cote de
  rareté dessous. Le voile noir dégradé + nom en blanc PAR-DESSUS l'image
  d'une version antérieure a été **explicitement pointé par l'utilisateur**
  comme ce qui n'allait pas — ne pas le réintroduire. Conséquence transversale : `.card-photo-overlay` a été
  supprimée, donc **plus aucun texte ne doit être posé en blanc sur une
  illustration** ; là où le nom ne peut pas passer sous la photo
  (emplacements de Farm, sélecteur), utiliser `.photo-caption` (bandeau de
  papier opaque à encre sombre). Le niveau est une petite étiquette dans
  la photo, pas à côté du tampon — la tuile ne fait que ~112px de large et
  "LÉGENDAIRE" + "Niv. 1" sur une même ligne débordait.
  Un monument non possédé est viré **sépia** (vieux tirage), pas gris
  désaturé — le gris lisait "désactivé" plus que "à collectionner".
  L'écran Collection n'a **qu'un seul contrôle, le tri** : les quatre
  filtres (région/époque/rareté/possédés) ont été retirés sur retour
  utilisateur — avec 12 monuments qui tiennent en trois écrans, filtrer ne
  servait à rien et mangeait la moitié de la page. La modale de détail a
  des flèches précédent/suivant qui suivent l'ordre AFFICHÉ, et la grille
  reste **montée** (`v-show`, pas `v-if`) pendant qu'elle est ouverte :
  la démonter faisait perdre la position de défilement et renvoyait tout
  en haut à la fermeture. `MonumentModel` saute le rendu d'un canvas sans
  boîte de layout, donc la grille cachée ne coûte rien.
- **Monuments rendus en vrai 3D** (`components/monuments/MonumentModel.vue`,
  remplace l'ancien `MonumentEmblem.vue` + `data/monumentEmblems.js` à
  silhouettes SVG génériques par hash) : `GLTFLoader` charge le fichier
  `.glb` propre à chaque monument (`data/monuments.js#glb`, servi depuis
  `app/public/models/monuments/`), cadré/centré automatiquement et animé
  d'une lente rotation ambiante (coupée si `prefers-reduced-motion`).
  **Fond = calque quadrillé teinté par la RARETÉ** (deux dégradés de grille
  fine + un fond `color-mix` à 12% avec `RARITY_COLORS`, `cardBackground` /
  `cardBackgroundSize` dans `MonumentModel.vue`) — cohérent avec la grille de
  plan de la DA. Un dégradé radial "spotlight" + liseré + balayage lumineux
  Légendaire/Mythique avaient été ajoutés puis **retirés sur retour
  utilisateur explicite** ("j'aime pas les effets etc") : ne pas les
  réintroduire sans redemander.

  **Modèles sans couleur exploitable** : `angkor-wat` et `tower-bridge` n'ont
  ni texture, ni couleur de matériau, ni couleur de sommet ; `machu-picchu`
  porte ses textures via `KHR_materials_pbrSpecularGlossiness`, extension que
  **three.js ne supporte plus** (0 occurrence dans GLTFLoader en 0.185) — les
  textures sont ignorées en silence. Les trois rendaient en blanc saturé.
  `applyFallbackTint()` applique une pierre chaude UNIQUEMENT si tout le
  modèle est incolore, donc sans jamais repeindre un modèle correct. Vérifier
  ce point sur tout nouveau GLB : le bloc `asset.extras` et les matériaux se
  lisent directement dans le JSON du fichier.

  **Chargement DIFFÉRÉ des `.glb`** (`IntersectionObserver`, `rootMargin`
  400px) : la grille de Collection monte toutes les tuiles d'un coup, et
  charger les 35 modèles représentait ~74 Mo de téléchargement au premier
  affichage. Seuls les modèles proches du viewport partent réellement.
  Indispensable depuis l'agrandissement du catalogue — ne pas le retirer.

  **UN SEUL contexte WebGL pour toute l'application**, partagé par toutes
  les tuiles : un `WebGLRenderer` unique au niveau module rend la scène de
  chaque instance à son tour dans une boucle `requestAnimationFrame`
  commune, puis la recopie (`drawImage`) dans le **canvas 2D** de la tuile
  (d'où `preserveDrawingBuffer: true`). La version précédente créait un
  contexte WebGL PAR tuile : avec 12 tuiles, ouvrir la modale de détail
  (qui démonte la grille et monte une 13e tuile) déclenchait une vague de
  libérations/créations que le navigateur ne suit pas de façon synchrone —
  la modale s'ouvrait sur un cadre vide, et un simple rechargement à chaud
  vidait les 12 tuiles d'un coup. `forceContextLoss()` + un délai d'une
  frame ne fiabilisaient pas ça (il fallait ~250ms, inacceptable à
  l'affichage). Le contexte unique supprime la classe de bug entière et
  lève la limite qui empêchait de faire grossir le catalogue.

  **Cadrage résolu sur la PROJECTION RÉELLE à l'écran**, itérativement
  (`FILL_RATIO` = part du cadre occupée, `FIT_ITERATIONS`), et échantillonné
  sur un tour complet (`SPIN_SAMPLES`) pour que le modèle reste cadré à
  TOUS les angles de sa rotation. Le modèle est posé au sol (`position.y -=
  box.min.y`) avec une ombre portée douce, comme une pièce de musée sur un
  socle. L'approche précédente (règle géométrique : diagonale horizontale
  rapportée à la taille du frustum) était très pessimiste pour les
  monuments larges et bas vus en plongée — le Colisée n'occupait que ~16%
  de la hauteur de sa carte contre 62% pour Big Ben. **Quatre bugs réels
  distincts** ont dû être corrigés ici (plusieurs monuments ne s'affichaient
  pas — retour utilisateur) :
  1. *Ordre position/échelle* : `object.position` est un décalage appliqué
     APRÈS la mise à l'échelle de la géométrie locale (ordre Three.js :
     monde = position + rotation×échelle×local). Mesurer le centrage sur la
     boîte non-échelonnée puis l'appliquer tel quel à `position` ne
     correspond plus au vrai centre une fois le modèle réduit — l'erreur
     grandit avec le facteur de réduction. Fix : toujours mesurer
     `position` sur la boîte DÉJÀ mise à l'échelle.
  2. *Cache de matrice monde périmé* : `Box3.setFromObject(mesh)` sur un
     mesh enfant ne recalcule QUE la matrice de ce mesh et réutilise la
     matrice-monde déjà en cache du PARENT — sans un `updateMatrixWorld(true)`
     explicite après avoir changé l'échelle, la mesure reste basée sur
     l'ancienne (le rendu, lui, reste correct : Three.js recalcule tout
     avant chaque frame, mais PAS nos mesures faites entre-temps).
  3. *Rotation autour d'une origine excentrée* : la rotation doit vivre sur
     un **groupe parent** (`spinner`), jamais sur le modèle lui-même — la
     rotation s'applique autour de l'origine locale de l'objet tourné, et
     comme c'est `model.position` qui porte le recentrage, faire tourner
     `model` le faisait ORBITER autour d'un point excentré au lieu de
     pivoter sur place. La Tour Eiffel (origine d'export très loin de son
     centre) sortait entièrement du cadre à chaque tour.
  4. *Mesh "socle" parasite* : certains modèles marketplace embarquent une
     dalle de sol (Neuschwanstein/"Low Poly Castle.glb"). Elle est détectée
     par géométrie, jamais par nom de fichier, et masquée — mais les DEUX
     tests doivent passer ensemble et se comparer au **RESTE du modèle**,
     jamais à une médiane par mesh : le mesh doit à lui seul dépasser
     `GROUND_DOMINANCE` (3x) l'empreinte de tout le reste ET être plat
     (`GROUND_FLATNESS`, hauteur < 15% de sa propre empreinte). La règle
     précédente (empreinte > 4x la MÉDIANE des mesh) était catastrophique
     sur les modèles très découpés, où la médiane ne vaut que la taille
     d'un petit détail : elle masquait la nef de Notre-Dame, les
     plateformes d'Angkor Wat et le socle du Parthénon — ces monuments
     n'apparaissaient plus que comme une poignée de flèches éparses — et
     désignait même la Tour Eiffel entière comme un "socle".
- **Classes utilitaires de texte** : `.tabular` (chiffres en IBM Plex Mono)
  sur toutes les stats/ressources — sur un plan, un nombre est une cote ;
  `.typewriter` pour les petites légendes mono ; `.section-label` pour les
  sur-titres. Les titres h1/h2 sont en Barlow Condensed ; ils ne sont plus
  forcés en majuscules trackées globalement (la règle faisait déborder un nom
  de monument long de son badge) — le cartouche de plan majuscule est réservé
  aux `.section-label`.
- Historique complet des DA précédentes (pour référence uniquement, aucune
  n'est d'actualité) : atelier/forge beige → idle mobile orange/or →
  collection premium bleu/violet/rose+or → corporate navy/teal plat →
  navy/teal façon Pokémon TCG Pocket → arcade néon (sombre puis violet) →
  flat minimaliste → identité "atlas de créatures" (lavande/magenta puis
  crème/orange avec photo par carte, calée sur une maquette Figma Make) →
  identité "native game" dark/chanfreinée (programme "10/10") → même
  identité dark/chanfreinée réutilisée pour "Empire Culturel" → "premium/
  musée personnel" claire (blanc cassé, bleu marine, coins arrondis) →
  "carnet de voyage" (papier crème, Playfair/Karla/Courier, terre de Sienne)
  → **"Plan d'architecte"** (l'actuelle : premier thème SOMBRE, bleu de plan,
  Barlow/IBM Plex Mono, accent cyan). Ne jamais supposer qu'une ancienne
  palette ou qu'un ancien principe visuel mentionné dans un vieux commit
  est encore d'actualité — ce fichier fait foi sur l'état courant.

## Workflow Git

- `main` = branche de release, reste vierge. Jamais de checkout de travail, de
  commit, de merge ni de push dessus.
- `develop` = branche d'intégration. Seule branche poussée sur le remote.
- Une branche `feat/...` par fonctionnalité, créée depuis `develop`, mergée
  dans `develop` avec `--no-ff`, puis `git push origin develop` uniquement.
- Commits atomiques, messages en conventional commits (`feat:`, `fix:`,
  `chore:`...).

## Stack

- Monorepo npm workspaces : `app/` uniquement (workspace unique depuis la
  suppression de `api/`/`shared/` — le champ `workspaces` racine ne liste
  plus que `app`).
- `app/` : Vue 3 (Composition API, `<script setup>`), Vite, Tailwind CSS v4
  (`@tailwindcss/vite`, thème via `@theme` dans `style.css`, pas de
  `tailwind.config.js`), Pinia + `pinia-plugin-persistedstate` (persistance
  localStorage), Vue Router (historique hash), **PWA**
  (`public/manifest.json` + `public/sw.js`, enregistré dans `main.js`),
  Capacitor + plateformes Android et iOS en option (hors sujet du canal de
  distribution principal).
  `app/capacitor.config.json` (pas `.js`) : le loader `.js` du CLI
  Capacitor ne gère pas correctement l'ESM (`export default`) sur un
  package `"type": "module"`.
- **JavaScript pur partout, pas de TypeScript.**
- BDD : aucune. Tout l'état persistant vit dans le `localStorage` du
  navigateur via `pinia-plugin-persistedstate`.
- **`three`** (`GLTFLoader`) : retirée lors du pivot Empire Culturel (ne
  servait qu'à l'expérimentation de combat 3D du jeu de cartes précédent),
  puis **réinstallée** une fois l'utilisateur a fourni un vrai pack de
  monuments en GLB — sert désormais au rendu 3D du catalogue
  (`components/monuments/MonumentModel.vue`), sans rapport avec l'ancienne
  expérimentation de combat.

## Jeu — Empire Culturel (état actuel)

Jeu de collection de monuments historiques + économie idle + progression +
compétition. Structure de `app/src/` : `data/` (catalogues statiques :
monuments, raretés, boosters, arbre technologique, missions, constantes
d'économie), `engine/` (moteur pur : tirage de booster, revenu Farm,
fusion, bonus d'arbre, prestige, classements simulés, RNG),
`stores/` (Pinia, orchestrent l'engine et persistent),
`components/`+`views/` (6 onglets : Farm, Collection, Boosters, Techno,
Classement, Profil).

- **7 paliers de rareté et non 6** : `secret` a été ajouté au-dessus de
  `mythique` sur demande de l'utilisateur ("une categorie a part secret ...
  encore moins que mythique"). Ce n'est PAS un simple cran de plus —
  `data/rarity.js#SCORED_RARITIES` l'exclut du décompte de complétion du
  musée et des séries région/époque (sinon ces compteurs deviendraient
  indépassables), et `views/CollectionView.vue` **masque de la grille tout
  secret non découvert** : on ne doit pas savoir à l'avance ce qu'on
  cherche. Sa teinte (vert-de-gris `#036963`) est la seule famille de
  couleur qu'aucun des six autres paliers n'occupe. Poids de tirage ~25x
  inférieur à mythique (0,2% sur le Booster Or). Les 4 monuments secrets
  sont les modèles hors-sujet du lot téléchargé (une voiture Simca, une
  statuette, un souvenir de boutique, un torii cyberpunk) : plutôt que de
  les jeter, ils deviennent des trouvailles absurdes — c'est le seul palier
  où un objet hors-sujet est un gag et non un défaut.
- **Attribution obligatoire.** 39 des 41 modèles 3D sont sous CC BY :
  l'attribution est une obligation légale. Chaque entrée de
  `data/monuments.js` porte un champ `credit` (`{auteur, licence, url}`)
  qui alimente l'écran de crédits du Profil — **ne jamais ajouter un
  monument sans le remplir**. `monuments/CREDITS.md` documente tout le
  catalogue, y compris les pièges relevés (un modèle sous licence Sketchfab
  Standard non redistribuable, un autre extrait de Civilization VI donc
  illicitement placé sous CC par son uploadeur). Les métadonnées de licence
  sont lisibles dans le bloc glTF `asset.extras` des `.glb` Sketchfab —
  c'est la source de vérité, pas une saisie manuelle.
- **L'ORDRE de `RAW_MONUMENTS` est figé** : l'`id` (`mon_001`...) est dérivé
  de l'index et persiste dans le localStorage des joueurs. Insérer une ligne
  au milieu réattribuerait les monuments de tout le monde. **Toujours
  ajouter en fin de liste.**
- **Monuments** (`data/monuments.js`) : **passé de 12 à 35** (19 monuments
  ajoutés + 4 secrets), après avoir été **réduit de 50 (v1 de test
  générique, brief §22) à 12 précisément**, sur demande explicite de
  l'utilisateur ("rajoute moi ces monuments dans le jeu et retire les
  autres cartes") — uniquement les monuments pour lesquels un vrai modèle
  3D GLB a été fourni (cf. Historique du pivot produit). 11 des 12
  reprennent un monument de l'ancien catalogue de 50 ; le 12e, "Tour de
  Babel" (mythique, Irak mythologique), a été ajouté pour le seul GLB
  sans correspondance dans l'ancien catalogue plutôt qu'écarté — le
  fichier envoyé par l'utilisateur a été traité comme faisant partie de
  la demande. La répartition par rareté n'est donc plus la distribution
  20/12/8/6/3/1 du brief original (avec seulement 12 monuments, plusieurs
  paliers n'ont qu'1 ou 2 entrées) — ne pas s'étonner d'un tirage de
  booster qui semble "trop facile" sur les raretés basses, c'est attendu
  vu la taille réduite du catalogue. Chaque monument a un nom, un pays,
  une région (`REGIONS` : europe/asie/amerique/afrique/oceanie), une
  époque (`EPOQUES` : antiquite/moyen_age/renaissance/moderne/contemporain),
  une rareté et un fichier `glb` (`app/public/models/monuments/`).
  **`afrique`/`oceanie` (régions) et `renaissance` (époque) n'ont
  désormais plus aucun monument** — `stores/collection.js#regionCompletion`/
  `epoqueCompletion` gardent un garde-fou explicite (`total > 0 &&`) pour
  qu'une région/époque vide ne soit jamais comptée comme "complétée"
  (sans quoi `0 possédé === 0 total` aurait été vrai et aurait accordé le
  bonus de complétion gratuitement). `revenuBase`/`valeurCollection`
  **dérivés de la rareté** (`data/rarity.js#baseRevenue`/`baseValue`),
  jamais saisis à la main par monument — même principe de cohérence que
  l'ancien "budget de stats" du jeu de cartes, appliqué ici à l'économie
  plutôt qu'au combat.
- **Boosters** (`data/boosters.js`, `engine/gacha.js`) : un booster donne
  **toujours exactement un monument** (brief §8, contrairement aux packs
  multi-cartes de l'ancien jeu). 3 boosters (Bronze 100 Or, Argent 400 Or,
  Or 1200 Or de base) partagent le même catalogue de 50 monuments — seule
  la pondération par rareté change. `openBooster()` tire d'abord la
  rareté (pondérée, + bonus `rarityLuckPct` de l'arbre Booster), puis un
  monument uniforme parmi ceux de cette rareté. **Coût croissant à chaque
  achat** (`stores/collection.js#boostersPurchased`, +6% par achat du même
  palier via `data/economy.js#BOOSTER_COST_GROWTH`, avant réduction
  d'arbre) — ajouté après coup (retour utilisateur : "pour pas finir le
  jeu trop vite") ; sans cette croissance le coût restait plat pour
  toujours et un joueur pouvait spammer des boosters sans frein dès que la
  Farm généère assez. Remis à zéro par un Prestige (même reset que le
  reste de la collection). **Ouverture groupée x5/x10/x100**
  (`stores/collection.js#ouvrirBoosters`, `BulkOpeningResultModal.vue`,
  retour utilisateur : "un bouton pour ouvrir 5 ou 10 booster aussi c'est
  pas mal voir 100 aussi") : s'arrête net dès que l'Or manque plutôt que
  d'exiger le coût total d'avance (un joueur "presque assez riche" peut
  quand même ouvrir ce qu'il peut se permettre) — le coût croissant déjà
  en place freine naturellement un x100 avant qu'il devienne abusif, pas
  besoin d'un plafond dédié. **Aucun rendu 3D dans le résultat groupé**
  (contrairement à `BoosterOpeningModal`, la mise en scène d'un tirage
  x1) : une liste plate + un récapitulatif par rareté + les meilleurs
  tirages (Légendaire/Mythique) mis en avant, pas question d'ouvrir
  jusqu'à 100 contextes WebGL simultanés pour un seul modal. Un seul
  journal d'activité groupé par lot (pas un par booster individuel) pour
  ne pas noyer le fil d'activité plafonné à 20 entrées
  (`stores/activity.js`) sous 100 lignes identiques.
- **Doublons → fusion, jamais perdus** (`engine/fusion.js`, brief §11) :
  un doublon incrémente `owned[id].doublons` (pas de conversion
  automatique en ressource, contrairement à l'ancien jeu de cartes) ; à
  partir de `FUSION.requiredCount` (3) doublons du même niveau, le joueur
  peut fusionner manuellement pour passer au niveau supérieur (max
  `FUSION.maxLevel`, 5), ce qui augmente le revenu et la valeur du
  monument de `FUSION.revenueMultiplierPerLevel` (25%) par niveau.
- **Farm** (`stores/farm.js`) : 2 emplacements actifs de base
  (`FARM.baseSlots`), extensibles via l'arbre technologique (catégorie
  Gestion). Un monument placé génère de l'Or en continu
  (`engine/farm.js#monumentEffectiveRevenue`, dépend du niveau du
  monument + bonus d'arbre + bonus de prestige + bonus de collection
  régionale/historique). **Ticker global posé dans `App.vue`, pas
  `FarmView.vue`** : Vue démonte `FarmView` (et tout `setInterval` qui y
  vivrait) dès qu'on change d'onglet, donc le revenu doit être généré par
  un composant qui reste monté en permanence tant que l'app est ouverte,
  quel que soit l'onglet affiché (retour utilisateur : "je dois gagner
  mes pièces tout le temps pas que quand je suis dans l'onglet"). Le
  ticker appelle aussi `meta.touchLastSeen()` à chaque tick, pour que le
  rattrapage hors-ligne (`collecterHorsLigne()`, au montage de l'app,
  plafonné en heures) mesure bien le temps où l'app était **fermée**, pas
  depuis la dernière visite de l'onglet Farm.
- **Collections régionales et historiques** (brief §10) : compléter une
  région donne +10% revenus **des monuments de cette région uniquement**
  ; compléter une époque donne +5% revenus **globaux** (exemples exacts
  du brief). Calculé dans `stores/collection.js#regionCompletion`/
  `epoqueCompletion`/`bonusPctForMonument`, injecté dans
  `engine/farm.js#monumentEffectiveRevenue` via un paramètre fonction
  (pas un import direct du store collection dans le moteur pur, pour
  garder `engine/farm.js` indépendant de Pinia).
- **Arbre technologique** (`data/trees.js`, `stores/trees.js`) : 4
  catégories (Gestion, Collection, Booster, Économie), coûte des Points
  technologie (pas l'Or ni les Cristaux). Coûts par rang volontairement
  ~2x plus élevés que le premier jet (retour utilisateur : la progression
  finissait trop vite) — à retenir si de futurs noeuds sont ajoutés : ne
  pas repartir des valeurs basses initiales.
  **C'est un VRAI arbre depuis le second round de retouches** : chaque
  noeud a un `parent` (`data/trees.js`) qu'il faut avoir monté **au rang
  MAXIMUM** (et pas seulement acheté une fois — demande explicite de
  l'utilisateur : "si une amelioration niv 1 est pas max on ne peux pas
  passer en dessous"), et `stores/trees.js#isNodeUnlocked` applique
  réellement cette dépendance (elle renvoyait `true` en dur avant — l'« arbre » n'était
  qu'une liste de noeuds groupés par palier, ce que l'utilisateur a
  relevé). `components/trees/TreeCanvas.vue` trace les liaisons
  parent→enfant dans un SVG superposé : les positions ne sont pas
  calculables à l'avance (largeur variable, retour à la ligne), donc on
  MESURE les noeuds rendus (`getBoundingClientRect` + `ResizeObserver`)
  et on retrace à chaque changement de taille ou d'achat.
  L'onglet ouvre d'abord **4 cartes de catégorie** (`views/TreesView.vue`),
  et l'arbre concerné ne s'affiche qu'après le clic — pas de rangée
  d'onglets horizontaux avec un arbre affiché en permanence.
- **Niveau joueur** (`stores/player.js`) : XP gagnée en ouvrant des
  boosters, en fusionnant, en complétant des missions. Chaque niveau
  crédite des Points technologie (pas d'XP de combat, il n'y a plus de
  combat dans ce jeu).
- **Pas de journal d'activité.** `stores/activity.js` et tous ses appels
  `log()` ont été supprimés (retour utilisateur : "activite recente ne sert
  a rien c'est nul et ca prend de la place"). Ne pas le réintroduire par
  réflexe en ajoutant une mécanique : si un évènement doit être signalé,
  c'est un `Toast`.
- **Missions quotidiennes** (`data/missions.js`, `stores/missions.js`) :
  tirage déterministe par jour (seed du jour, même patron que l'ancienne
  boutique du jour du jeu de cartes), progression suivie via
  `trackEvent(eventName, montant)` appelé par les autres stores
  (collection, farm) plutôt qu'une logique de tracking centralisée —
  chaque store sait quand il déclenche un évènement de mission.
- **Connexion quotidienne** (`stores/meta.js`) : réclamation manuelle
  (jamais auto-créditée), palier de jour croissant plafonné à 7,
  récompense modulée par le bonus d'arbre `streakRewardPct`.
- **Prestige** (`stores/prestige.js`, `engine/prestige.js`) : reset
  collection + Farm + arbre technologique + niveau/XP/Or/Points
  technologie contre un bonus permanent infini de +5% revenus par
  prestige (`PRESTIGE.bonusPerPrestigePct`). Les Cristaux ne sont
  **jamais** réinitialisés par un prestige (monnaie premium/"réelle").
  **Verrouillé derrière un vrai palier de progression**
  (`PRESTIGE.minLevel`/`minMonuments`, `engine/prestige.js#meetsPrestigeRequirement`
  — niveau 10 + 15 monuments possédés dans cette v1) : au premier jet,
  le prestige était disponible dès la première seconde de jeu (retour
  utilisateur : "on peut les faire n'importe quand", gratuit et
  déséquilibrant). Distinct du bouton **"Supprimer le compte"** du Profil
  (reset total via `localStorage.clear()`, y compris les Cristaux et le
  compteur de prestige), qui lui reste toujours disponible sans condition.
  Le libellé est bien "supprimer le compte" et non "réinitialiser ma
  progression" (demande explicite de l'utilisateur) : sans backend, un
  compte N'EST que le localStorage de cet appareil, donc l'effacer est
  littéralement la suppression du compte.
- **Classement** (`stores/rankings.js`, `engine/rankings.js`, brief §19) :
  **une seule saison de 21 jours**, 3 rivaux + le joueur. Le score est
  l'**Or GAGNÉ cumulé** (`stores/player.js#orGagneSaison`/`orGagneTotal`,
  incrémentés dans `credit()`), et non plus un score composite "Empire
  Culturel" ni le solde courant : c'est la seule mesure que le joueur voit
  monter en permanence, et compter le solde ferait CHUTER son rang quand
  il ouvre des boosters — exactement ce qu'on veut encourager. Le
  classement global permanent et les 14 concurrents ont été retirés
  (retour utilisateur : "fait genre juste 3 personne et moi").
  **Pas de vrais autres joueurs** (app 100% client-only) : chaque rival a
  un DÉBIT d'or par seconde calé une seule fois sur celui du joueur au
  début de la saison, et son total se déduit du temps écoulé. C'est ce qui
  rend le dépassement réellement possible — avec des scores figés tirés
  autour du score courant du joueur (v1), il restait éternellement à la
  même place quoi qu'il fasse. Conséquence : contrairement à la v1, ce
  store **persiste** (les rivaux ne sont pas re-dérivables à la volée).
  `syncSeason()` est appelée au montage de l'app ET à l'ouverture de
  l'onglet ; elle clôture la saison écoulée en figeant le rang final
  AVANT de remettre `orGagneSaison` à zéro. La récompense de fin de saison
  (`RANKINGS.seasonRewards`, en Cristaux + Points techno) est **réclamée
  manuellement**, jamais auto-créditée — même principe que la connexion
  quotidienne — et le gain de chaque place est affiché en face de chaque
  ligne du tableau.

### Mécaniques de profondeur (ajouts après la v1 de base)

Quatre systèmes ajoutés sur demande explicite ("pousse encore plus loin la
mécanique, très loin"), chacun sur une branche/commit dédié. Tous respectent
l'architecture : moteur pur dans `engine/`, orchestration + persistance dans
`stores/`, RNG déterministe par période via `engine/rng.js`. **Tout nouveau
store persisté est ajouté à `GAME_KEYS`** (`utils/profiles.js`) — fait pour
`expeditions` et `rivalries` ; `events` ne persiste pas (recalculable).

- **Expéditions** (`data/expeditions.js`, `engine/expeditions.js`,
  `stores/expeditions.js`, `views/ExpeditionsView.vue`, onglet "Terrain") :
  envoyer un monument POSSÉDÉ mais NON placé en Farm sur une expédition
  minutée (3 durées : 15 min / 2 h / 8 h) qui revient avec Or + Points techno
  + Cristaux, **mis à l'échelle de la puissance de rareté × niveau de fusion**
  (`expeditionReward`). Récompense **par unité de puissance**, réclamation
  manuelle (même patron que la connexion quotidienne / la saison). Un monument
  en expédition n'est **pas** plaçable en Farm et inversement (getter
  `available` exclut `farmStore.isPlaced`) — sinon l'expédition serait un
  revenu gratuit en doublon. Le temps réel fait foi (pas de backend), une
  expédition finie hors-ligne est réclamable au retour. **Piège ESM corrigé** :
  ne pas faire `require('./farm.js')` dans un getter — import statique
  `useFarmStore` appelé au runtime.
- **Événements hebdomadaires + Sets de collection** :
  - *Événement* (`engine/events.js`, `stores/events.js`) : une région-thème
    tourne chaque semaine (déterministe par graine de semaine, **même ancre
    lundi `Date.UTC(2026,0,5)` que les duels**), débloquant un **booster
    événement** à prix réduit (`id: 'event'`) dont 70% des tirages sont
    orientés vers la région du thème (biais appliqué dans `engine/gacha.js`
    APRÈS le tirage de rareté, avec repli sur le pool complet si la région n'a
    pas de monument de la rareté tirée — jamais de tirage impossible). Le
    booster événement ne vit pas dans `BOOSTERS` : `collection.js#_booster()`
    le résout depuis le store events pour l'`id 'event'`, sinon `BOOSTERS[id]`.
    Store **non persisté** (tout recalculable) ; `tick()` appelé par le ticker
    global d'`App.vue` pour rester juste dans une PWA laissée ouverte.
  - *Sets* (`data/sets.js`) : 5 regroupements curatés **transversaux** aux
    régions/époques (Sept Merveilles, Lieux sacrés, Géants modernes, Nouveau
    Monde, Tours du monde) ; compléter un set donne un bonus de revenu GLOBAL
    permanent, câblé dans `collection.js#setsBonusPct` → `globalCollectionBonusPct`
    (donc déjà pris par le moteur de Farm). **Définis par NOM** (résolus en id
    au chargement) pour rester robustes à l'ordre figé de `RAW_MONUMENTS`.
- **Duels hebdomadaires (rivalités actives)** (`data/rivalries.js`,
  `engine/rivalries.js`, `stores/rivalries.js`, panneau dans
  `views/RankingsView.vue`) : un 1 contre 1 par semaine contre un rival tiré
  au sort (roster de 5, chacun avec un persona et une **difficulté** 0,7→1,3),
  DISTINCT du classement saisonnier à 4. La **cible** du rival = débit d'Or du
  joueur au début du duel × difficulté × **durée réelle du duel** (de
  l'inscription à dimanche, PAS une semaine pleine) : joueur et rival courent
  la même fenêtre, donc l'issue ne dépend que de la difficulté, pas du moment
  où l'on rejoint (plancher `minWindowMs` pour le cas dégénéré). Score du
  joueur mesuré par **différence de `player.orGagneTotal`** (monotone) entre le
  snapshot de départ et maintenant — Farm + expéditions + missions comptent.
  `syncDuel()` (appelé APRÈS le rattrapage hors-ligne dans `App.vue`) clôture
  le duel écoulé (fige V/D/série, prépare la récompense à réclamer) puis
  démarre le suivant. Palmarès (victoires/défaites/série) persistant ; la
  récompense monte avec la série. **Piège réactivité** : les valeurs qui
  dépendent de l'HORLOGE (score live du rival, compte à rebours) ne sont PAS
  des getters Pinia (un getter ne se recalcule que sur dépendance réactive, or
  `Date.now()` n'en est pas une) — la vue les recalcule depuis un `now` local
  rafraîchi à la seconde.
- **Profondeur économique** (trois leviers) :
  - *Améliorations par monument* (`data/economy.js#AMELIORATION`,
    `engine/upgrades.js`) : puits d'Or DÉDIÉ, distinct de la fusion (qui
    consomme des doublons). +12% du revenu propre par niveau (multiplicatif),
    coût mis à l'échelle de la **puissance de rareté** (`data/rarity.js#rarityPower`)
    et croissant (×1,35/niveau), max 15. Champ `owned[id].ameliorations`
    (initialisé à 0 partout ; `engine/fusion.js#fuse` fait `...ownedEntry`
    pour NE PAS le remettre à zéro en fusionnant). Appliqué dans
    `monumentEffectiveRevenue`. UI dans `MonumentDetail`.
  - *Spécialisation d'emplacement de Farm* (`data/economy.js#SLOT_SPEC`) :
    chaque emplacement peut recevoir une RÉGION de prédilection (+25% aux
    monuments de cette région), puits de Points techno, bonus PUR sans malus.
    A imposé de passer la Farm d'une liste compacte à des **emplacements à
    position stable** (`stores/farm.js` : `slots` [id|null] + `slotSpecs`
    parallèle) — sinon retirer un monument décalait tout et la spécialisation
    "glissait". Getter `active` conservé pour la compatibilité (liste
    compacte), `placedCount` pour les comptes.
  - *Prestige repensé en arbre de perks permanents* (`data/prestigePerks.js`,
    `engine/prestige.js`, `stores/prestige.js`) : chaque prestige crédite de la
    **Renommée** (jamais réinitialisée), investie dans 5 perks qui SURVIVENT
    aux prestiges suivants (Rente impériale = +revenus, Trésor de guerre = Or
    de départ, Œil du collectionneur = chance booster, Intendance = plafond
    hors-ligne, Héritage = conserve ses N meilleurs monuments au reset). Effets
    agrégés par `perkEffects` et branchés là où ils agissent : revenus via
    `prestige.bonusPct` (Farm), chance dans `collection._pullOne`, plafond dans
    `farm.collecterHorsLigne`, Or/conservation dans `faireLePrestige`. UI dans
    `ProfileView`.
- **Simplifications assumées pour cette v1 de test** (brief §22/§23,
  décisions prises pendant l'implémentation, pas des oublis) :
  - Pas d'animations spécifiques par monument (Tour Eiffel qui s'illumine,
    Pyramides avec du sable, Colisée avec une foule — brief §21) : chaque
    monument est un vrai modèle 3D (cf. Direction artistique, "Monuments
    rendus en vrai 3D") avec une rotation ambiante générique, pas de mise
    en scène bespoke par monument (lumière/particules dédiées, etc.).
  - Classement = un seul calcul de score partagé entre saisonnier et
    global (`computeEmpireScore()`), pas deux formules distinctes malgré
    des listes de critères légèrement différentes dans le brief (revenus
    cumulés notamment, pas encore trackés séparément du revenu
    instantané).

## Dépôt GitHub

Ce projet est publié sur `https://github.com/tbirostweb/empire-culturel`. Pour les commits et les push, utilise le dépôt `tbirostweb/empire-culturel` et sa branche courante. N'utilise pas le compte personnel `theobirost` comme destination. L'identité Git locale du projet est BirostWeb. Ne publie jamais les fichiers `.env`, les clés, les bases de données locales, les données privées ou les sorties générées.
