// Catalogue de monuments. Réduit de 50 (brief §22, v1 de test générique) à
// ces 12 précisément, sur demande explicite de l'utilisateur : uniquement
// les monuments pour lesquels un vrai modèle 3D low-poly (GLB) a été
// fourni (`monuments/glb/` à la racine, copié dans
// `app/public/models/monuments/` pour être servi par Vite) — "retire les
// autres cartes". `revenuBase`/`valeurCollection` dérivés de la rareté
// (data/rarity.js) plutôt que saisis à la main par monument.
import { baseRevenue, baseValue } from './rarity.js';

export const REGIONS = ['europe', 'asie', 'amerique', 'afrique', 'oceanie'];
export const REGION_LABELS = {
  europe: 'Europe',
  asie: 'Asie',
  amerique: 'Amérique',
  afrique: 'Afrique',
  oceanie: 'Océanie',
};

export const EPOQUES = ['antiquite', 'moyen_age', 'renaissance', 'moderne', 'contemporain'];
export const EPOQUE_LABELS = {
  antiquite: 'Antiquité',
  moyen_age: 'Moyen Âge',
  renaissance: 'Renaissance',
  moderne: 'Moderne',
  contemporain: 'Contemporain',
};

// Pictogrammes (résolus par components/icons/AppIcon.vue). Une région et une
// époque ne sont pas des données colorées — un picto est le seul moyen de
// les rendre reconnaissables d'un coup d'oeil sans ajouter un second canal
// de couleur, que la DA réserve strictement à la rareté.
export const REGION_ICONS = {
  europe: 'region-europe',
  asie: 'region-asie',
  amerique: 'region-amerique',
  afrique: 'region-afrique',
  oceanie: 'region-oceanie',
};
export const EPOQUE_ICONS = {
  antiquite: 'epoque-antiquite',
  moyen_age: 'epoque-moyen_age',
  renaissance: 'epoque-renaissance',
  moderne: 'epoque-moderne',
  contemporain: 'epoque-contemporain',
};

// [nom, pays, region, epoque, rarete, fichier glb, crédit]
//
// Le 7e champ porte l'attribution du modèle 3D : `[auteur, licence, url]`.
// Ce n'est pas décoratif — 39 des 41 modèles sont sous CC BY, dont
// l'attribution est une OBLIGATION légale. Ces données alimentent l'écran
// de crédits du Profil ; ne jamais ajouter un monument sans les remplir.
// `null` = provenance non déterminée (cf. monuments/CREDITS.md), à régler.
// Neuschwanstein et Parthénon : maquettes originales CC0 (app/scripts/generate-original-monuments.py).
//
// L'ORDRE DE CE TABLEAU EST FIGÉ : l'`id` d'un monument est dérivé de son
// index (`mon_001`...), et ces ids sont persistés dans le localStorage des
// joueurs (collection possédée, emplacements de Farm). Insérer une ligne au
// milieu décalerait tous les ids suivants et réattribuerait les monuments
// des joueurs existants. Toujours AJOUTER EN FIN DE LISTE.
const PP = 'Poly Pizza (CC BY 3.0)';
const RAW_MONUMENTS = [
  ['Tour de Babel', 'Irak (mythologique)', 'asie', 'antiquite', 'mythique', 'tour-de-babel.glb',
    ['Thomas de Rivaz', PP, 'https://poly.pizza/m/0MmIbleQag8']],
  ['Tour Eiffel', 'France', 'europe', 'moderne', 'legendaire', 'tour-eiffel.glb',
    ['Scott Marshall', PP, 'https://poly.pizza/u/Scott%20Marshall']],
  ['Colisée', 'Italie', 'europe', 'antiquite', 'legendaire', 'colisee.glb',
    ['Poly by Google', PP, 'https://poly.pizza/search/colosseum']],
  ['Angkor Wat', 'Cambodge', 'asie', 'moyen_age', 'epique', 'angkor-wat.glb',
    ['kris pilcher', PP, 'https://poly.pizza/search/Temple%20for%20Tilt%20Integration']],
  ['Big Ben', 'Royaume-Uni', 'europe', 'moderne', 'rare', 'big-ben.glb',
    ['Daqian Dong', PP, 'https://poly.pizza/search/big%20ben']],
  ['Chichen Itza', 'Mexique', 'amerique', 'moyen_age', 'rare', 'chichen-itza.glb',
    ['Bruno Oliveira', PP, 'https://poly.pizza/m/0rEriuH2sVr']],
  ['Château de Neuschwanstein', 'Allemagne', 'europe', 'moderne', 'rare', 'neuschwanstein.glb',
    ['Maquette originale Birostweb (générée par code)', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/']],
  ['Arc de Triomphe', 'France', 'europe', 'moderne', 'peu_commun', 'arc-de-triomphe.glb',
    ['Poly by Google', PP, 'https://poly.pizza/search/archway']],
  ['Notre-Dame de Paris', 'France', 'europe', 'moyen_age', 'peu_commun', 'notre-dame.glb',
    ['Bruno Oliveira', PP, 'https://poly.pizza/search/cathedral']],
  ['Parthénon', 'Grèce', 'europe', 'antiquite', 'peu_commun', 'parthenon.glb',
    ['Maquette originale Birostweb (générée par code)', 'CC0 1.0', 'https://creativecommons.org/publicdomain/zero/1.0/']],
  ['Golden Gate Bridge', 'États-Unis', 'amerique', 'contemporain', 'peu_commun', 'golden-gate.glb',
    ['Steren Giannini', PP, 'https://poly.pizza/search/golden%20gate']],
  ['Teotihuacan', 'Mexique', 'amerique', 'antiquite', 'commun', 'teotihuacan.glb',
    ['Jarlan Perez', PP, 'https://poly.pizza/search/step%20pyramid']],

  // --- Ajouts (Sketchfab, CC BY 4.0 sauf mention) -------------------------
  ['Tour de Pise', 'Italie', 'europe', 'moyen_age', 'commun', 'tour-de-pise.glb',
    ['LinkinPipe', 'CC BY 4.0', 'https://sketchfab.com/3d-models/torre-pisa-1ff02ed0588e4e4f9dcf621a8af07336']],
  ['Moulin de Kinderdijk', 'Pays-Bas', 'europe', 'moderne', 'commun', 'moulin.glb',
    ['marishka1611', 'CC BY 4.0', 'https://sketchfab.com/3d-models/low-poly-windmill-d2755b355902420e9a84270923aab585']],
  ['Obélisque', 'Égypte', 'afrique', 'antiquite', 'commun', 'obelisque.glb',
    ['Gunnar Correa', 'CC BY 4.0', 'https://sketchfab.com/3d-models/egypt-obelisk-bd458fb7f16647e48c27e75a106358ec']],
  ['Torii de Miyajima', 'Japon', 'asie', 'moderne', 'commun', 'torii.glb',
    ['Sahir Virmani', 'CC BY 4.0', 'https://sketchfab.com/3d-models/japanese-torii-gate-2027a248de1b4b70985ff97e708fb50d']],
  ['Porte de Brandebourg', 'Allemagne', 'europe', 'moderne', 'peu_commun', 'porte-de-brandebourg.glb',
    ['Furry12355', 'CC BY 4.0', 'https://sketchfab.com/3d-models/brandenburgh-gate-f0501d1cc3d04c78a0bb8efd6058cb90']],
  ['Tower Bridge', 'Royaume-Uni', 'europe', 'moderne', 'peu_commun', 'tower-bridge.glb',
    ['purpleguy<3', 'CC BY 4.0', 'https://sketchfab.com/3d-models/london-tower-bridge-0021ac55a9d54c13b655a2ed430d01f6']],
  ['Stonehenge', 'Royaume-Uni', 'europe', 'antiquite', 'peu_commun', 'stonehenge.glb',
    ['lightguard', 'CC BY 4.0', 'https://sketchfab.com/3d-models/stonehenge-low-poly-639b5ad228404eb3b87ad49660723251']],
  ['Tour Hassan', 'Maroc', 'afrique', 'moyen_age', 'peu_commun', 'tour-hassan.glb',
    ['Ysn.Aitaddi', 'CC BY 4.0', 'https://sketchfab.com/3d-models/hassan-tower-rabat-morocco-3e2bcb97e5f7407e9565f4fba164896d']],
  ['Grande Muraille', 'Chine', 'asie', 'moyen_age', 'rare', 'grande-muraille.glb',
    ['jackcc1', 'CC BY 4.0', 'https://sketchfab.com/3d-models/great-wall-of-china-5cc34350e47d4fbc99098ac58911ddf6']],
  ['Églises de Lalibela', 'Éthiopie', 'afrique', 'moyen_age', 'epique', 'lalibela.glb',
    ['adrieladi889', 'CC BY 4.0', 'https://sketchfab.com/3d-models/lalibela-d7b2a9a413ea4d6a9ed94a8b61c24bf4']],
  ['Borobudur', 'Indonésie', 'asie', 'moyen_age', 'epique', 'borobudur.glb',
    ['giga', 'CC BY 4.0', 'https://sketchfab.com/3d-models/borobudur-temple-84525b2dc4094057ab33e026eb961371']],
  ['Moaï', 'Rapa Nui', 'oceanie', 'moyen_age', 'epique', 'moai.glb',
    ['Museo Nacional de Historia Natural de Chile', 'CC0 1.0', 'https://sketchfab.com/3d-models/moai-paa-paa-6d21b01fbd01478b8942507655b985f1']],
  ['Cathédrale Saint-Basile', 'Russie', 'europe', 'renaissance', 'epique', 'saint-basile.glb',
    ['Polskaball', 'CC BY 4.0', 'https://sketchfab.com/3d-models/saint-basils-cathedral-a0b09745ecfe4cfea590eefcaac1e457']],
  ['Sphinx de Gizeh', 'Égypte', 'afrique', 'antiquite', 'epique', 'sphinx.glb',
    ['Chenzoss', 'CC BY 4.0', 'https://sketchfab.com/3d-models/the-great-sphinx-of-giza-egypt-f169dbe7974648babe327179091e0ee3']],
  ['Machu Picchu', 'Pérou', 'amerique', 'renaissance', 'legendaire', 'machu-picchu.glb',
    ['Ministerio de Cultura Perú', 'CC BY 4.0', 'https://sketchfab.com/3d-models/machupicchu-d59370ac4a444628b95081f5bb7bbd02']],
  ['Pyramides de Gizeh', 'Égypte', 'afrique', 'antiquite', 'legendaire', 'pyramides-de-gizeh.glb',
    ['Chenzoss', 'CC BY 4.0', 'https://sketchfab.com/3d-models/the-great-pyramid-of-giza-egypt-99bb947b9a9f4884ba249aec1be779eb']],
  ['Statue de la Liberté', 'États-Unis', 'amerique', 'moderne', 'legendaire', 'statue-de-la-liberte.glb',
    ['Crafteri', 'CC BY 4.0', 'https://sketchfab.com/3d-models/statue-of-liberty-de104ba657a14df099bde10cd9bbf4f2']],
  ['Christ Rédempteur', 'Brésil', 'amerique', 'contemporain', 'legendaire', 'christ-redempteur.glb',
    ['JuanG3D', 'CC BY 4.0', 'https://sketchfab.com/3d-models/christ-the-redeemer-d143e5357efd42529777438d0f72c79c']],
  ['Burj Khalifa', 'Émirats arabes unis', 'asie', 'contemporain', 'mythique', 'burj-khalifa.glb',
    ['ManySince910', 'CC BY 4.0', 'https://sketchfab.com/3d-models/burj-khalifa-59e6dd74e5f647158de568b5a7f9cab7']],

  // --- SECRETS ------------------------------------------------------------
  // Ces quatre modèles ne représentent pas le monument qu'ils annoncent : une
  // voiture, une statuette, un souvenir de boutique, un torii cyberpunk. Plutôt
  // que de les jeter, ils deviennent des trouvailles absurdes quasi-introuvables
  // — c'est le seul palier où un objet hors-sujet est un gag et non un défaut.
  ['Simca Chambord', 'France (1961)', 'europe', 'contemporain', 'secret', 'secret-simca-chambord.glb',
    ['fishermans garage', 'CC BY 4.0', 'https://sketchfab.com/3d-models/simca-chambord-1961-lowpoly-for-3d-printing-742814d63f71441c95b0c787c508257e']],
  ['Poupée de lest de Wat Arun', 'Thaïlande', 'asie', 'moderne', 'secret', 'secret-poupee-wat-arun.glb',
    ['VR Siam', 'CC BY 4.0', 'https://sketchfab.com/3d-models/chinese-ballast-doll-at-wat-arun-150-83b03f665f7c460382f52156b2ec264b']],
  ['Souvenir de la place Saint-Pierre', 'Vatican', 'europe', 'contemporain', 'secret', 'secret-souvenir-saint-pierre.glb',
    ['nikosapostolopoylos6', 'CC BY 4.0', 'https://sketchfab.com/3d-models/saint-peters-square-vaticano-souvenir-8bae8f4377c74cb0a6a38047b5d89ff2']],
  ['Torii cyberpunk', 'Japon (2077)', 'asie', 'contemporain', 'secret', 'secret-torii-cyberpunk.glb',
    ['Julio Cesar', 'CC BY 4.0', 'https://sketchfab.com/3d-models/cyberpunk-torii-gate-e566e56d4bf0450eba2e20d6a2a9fd3b']],
];

export const MONUMENTS = RAW_MONUMENTS.map(([nom, pays, region, epoque, rarete, glb, credit], index) => {
  const id = `mon_${String(index + 1).padStart(3, '0')}`;
  return {
    id,
    nom,
    pays,
    region,
    epoque,
    rarete,
    glb,
    credit: credit ? { auteur: credit[0], licence: credit[1], url: credit[2] } : null,
    revenuBase: baseRevenue(rarete),
    valeurCollection: baseValue(rarete),
  };
});

// Les secrets ne comptent ni dans la complétion du musée ni dans les séries
// région/époque : ils sont quasi-introuvables, les inclure rendrait ces
// compteurs indépassables (cf. data/rarity.js#SCORED_RARITIES).
export const SCORED_MONUMENTS = MONUMENTS.filter((m) => m.rarete !== 'secret');

const MONUMENTS_BY_ID = new Map(MONUMENTS.map((m) => [m.id, m]));
export function monumentDef(id) {
  return MONUMENTS_BY_ID.get(id) ?? null;
}
