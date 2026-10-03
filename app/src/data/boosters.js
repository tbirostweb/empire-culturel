// 3 boosters (brief §8) : chaque ouverture donne exactement UN monument
// (jamais plusieurs) — tous les monuments peuvent sortir de tous les
// boosters, seule la pondération par rareté change. `weights` n'a pas
// besoin de sommer à 100 (engine/gacha.js normalise), mais c'est plus
// lisible ainsi.
//
// `secret` est d'un ordre de grandeur en dessous de `mythique` (demande
// utilisateur : "tres tres peu de chance, encore moins que mythique") :
// ~0,2% sur le Booster Or contre 5% pour mythique, soit 25 fois plus rare.
// C'est volontairement au niveau où on ne l'obtient pas en visant — on
// tombe dessus. L'arbre technologique (noeud `rarityLuckPct`, catégorie
// Booster) est le seul moyen d'améliorer ces chances.
// Probabilités NETTEMENT resserrées sur les paliers hauts (retour
// utilisateur : "regle les propa pour les cartes elles sont trop facile a
// avoir"). Le Booster Or donnait 12% de Légendaire et 5% de Mythique — sur
// une ouverture x100, on ramassait donc ~12 Légendaires d'un coup et la
// collection était bouclée en une session. C'est désormais 4% et 0,7%.
//
// Les coûts baissent en parallèle (100/400/1200 -> 40/200/800) : combiné à
// la chute des revenus de Farm (data/rarity.js), ouvrir reste accessible
// mais accumuler l'Or devient le vrai frein — ce qui est le but.
export const BOOSTERS = {
  bronze: {
    id: 'bronze',
    nom: 'Booster Bronze',
    description: 'Beaucoup de Commun et Peu commun, quelques Rares.',
    cout: 40,
    weights: { commun: 58, peu_commun: 30, rare: 10.5, epique: 1.3, legendaire: 0.18, mythique: 0.02, secret: 0.002 },
  },
  argent: {
    id: 'argent',
    nom: 'Booster Argent',
    description: 'Moins de Commun, plus de Rare, chance correcte d\'Épique.',
    cout: 200,
    weights: { commun: 34, peu_commun: 34, rare: 24, epique: 6.5, legendaire: 1.2, mythique: 0.15, secret: 0.015 },
  },
  or: {
    id: 'or',
    nom: 'Booster Or',
    description: 'Chances augmentées de Légendaire et Mythique.',
    cout: 800,
    weights: { commun: 18, peu_commun: 27, rare: 34, epique: 16, legendaire: 4, mythique: 0.7, secret: 0.06 },
  },
};

export const BOOSTER_IDS = Object.keys(BOOSTERS);
