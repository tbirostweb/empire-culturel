// Arbre technologique (brief §13) : 4 catégories. Coûte des Points
// technologie (pas la monnaie principale ni les Cristaux). Même patron
// que l'ancien jeu de cartes (noeuds à rangs, coût croissant par rang,
// `describeEffect` pour l'explication au tap) mais entièrement nouveau
// jeu de données pour ce concept.
// `parent` : identifiant du noeud dont il faut avoir acheté AU MOINS un rang
// pour débloquer celui-ci (`null` = racine, toujours disponible). Ajouté sur
// retour utilisateur ("sa serait peut etre mieux de faire un vrai arbre") —
// la v1 n'avait aucune dépendance (`isNodeUnlocked` renvoyait toujours vrai)
// et ne se distinguait donc en rien d'une simple liste de noeuds groupés par
// palier. Les liens de parenté sont aussi ce que trace TreeCanvas.vue.
export const TREES = {
  gestion: {
    id: 'gestion',
    nom: 'Gestion',
    icon: 'landmark',
    description: 'Plus de slots Farm, plus de revenus, bonus actifs.',
    noeuds: [
      { id: 'revenu1', nom: 'Rendement I', tier: 1, parent: null, maxRank: 5, coutParRang: [3, 5, 7, 10, 14], effect: { kind: 'revenuPct', value: 4 } },
      { id: 'slot1', nom: 'Extension Farm I', tier: 1, parent: null, maxRank: 1, coutParRang: [5], effect: { kind: 'farmSlots', value: 1 } },
      { id: 'revenu2', nom: 'Rendement II', tier: 2, parent: 'revenu1', maxRank: 5, coutParRang: [10, 14, 18, 24, 32], effect: { kind: 'revenuPct', value: 5 } },
      { id: 'slot2', nom: 'Extension Farm II', tier: 2, parent: 'slot1', maxRank: 1, coutParRang: [16], effect: { kind: 'farmSlots', value: 1 } },
      { id: 'slot3', nom: 'Extension Farm III', tier: 3, parent: 'slot2', maxRank: 1, coutParRang: [40], effect: { kind: 'farmSlots', value: 1 } },
    ],
  },
  collection: {
    id: 'collection',
    nom: 'Collection',
    icon: 'book',
    description: 'Bonus de collection, meilleures récompenses.',
    noeuds: [
      { id: 'bonusRegion', nom: 'Expertise régionale', tier: 1, parent: null, maxRank: 5, coutParRang: [3, 5, 7, 10, 14], effect: { kind: 'collectionBonusPct', value: 2 } },
      { id: 'fusionBonus', nom: 'Maître fusionneur', tier: 2, parent: 'bonusRegion', maxRank: 3, coutParRang: [14, 20, 30], effect: { kind: 'fusionValuePct', value: 10 } },
    ],
  },
  booster: {
    id: 'booster',
    nom: 'Booster',
    icon: 'package',
    description: 'Réduction des coûts, bonus de probabilités.',
    noeuds: [
      { id: 'coutReduc', nom: 'Négociateur', tier: 1, parent: null, maxRank: 5, coutParRang: [3, 5, 7, 10, 14], effect: { kind: 'boosterCostReductionPct', value: 2 } },
      { id: 'chanceRarete', nom: 'Flair du collectionneur', tier: 2, parent: 'coutReduc', maxRank: 5, coutParRang: [10, 14, 18, 24, 32], effect: { kind: 'rarityLuckPct', value: 2 } },
    ],
  },
  economie: {
    id: 'economie',
    nom: 'Économie',
    icon: 'coin',
    description: 'Plus de génération, meilleures récompenses quotidiennes.',
    noeuds: [
      { id: 'genGlobale', nom: 'Productivité', tier: 1, parent: null, maxRank: 5, coutParRang: [3, 5, 7, 10, 14], effect: { kind: 'revenuPct', value: 3 } },
      { id: 'streakBonus', nom: 'Fidélité', tier: 2, parent: 'genGlobale', maxRank: 3, coutParRang: [14, 20, 30], effect: { kind: 'streakRewardPct', value: 15 } },
      { id: 'offlineBonus', nom: 'Gestion à distance', tier: 3, parent: 'streakBonus', maxRank: 3, coutParRang: [24, 35, 50], effect: { kind: 'offlineCapPct', value: 20 } },
    ],
  },
};

export function findTreeNode(nodeId) {
  for (const tree of Object.values(TREES)) {
    const node = tree.noeuds.find((n) => n.id === nodeId);
    if (node) return node;
  }
  return null;
}

export function treeNodeCost(nodeId, currentRank) {
  const node = findTreeNode(nodeId);
  if (!node || currentRank >= node.maxRank) return null;
  return node.coutParRang[currentRank];
}

const EFFECT_LABELS = {
  farmSlots: (v) => `+${v} emplacement Farm`,
  revenuPct: (v) => `+${v}% revenus`,
  collectionBonusPct: (v) => `+${v}% bonus de collection`,
  fusionValuePct: (v) => `+${v}% valeur de fusion`,
  boosterCostReductionPct: (v) => `-${v}% coût des boosters`,
  rarityLuckPct: (v) => `+${v}% chance de rareté supérieure`,
  streakRewardPct: (v) => `+${v}% récompense de connexion`,
  offlineCapPct: (v) => `+${v}% plafond hors-ligne`,
};

export function describeEffect(effect) {
  const fn = EFFECT_LABELS[effect.kind];
  return fn ? fn(effect.value) : '';
}

// Pictogramme par TYPE d'effet (résolu par components/icons/AppIcon.vue) :
// un noeud dit ainsi ce qu'il fait avant même d'être ouvert, là où tous se
// ressemblaient (un rond avec un rang dedans).
const EFFECT_ICONS = {
  farmSlots: 'farm',
  revenuPct: 'trend',
  collectionBonusPct: 'collection',
  fusionValuePct: 'sparkles',
  boosterCostReductionPct: 'treasure',
  rarityLuckPct: 'target',
  streakRewardPct: 'flame',
  offlineCapPct: 'clock',
};

export function effectIcon(effect) {
  return EFFECT_ICONS[effect.kind] ?? 'sparkles';
}
