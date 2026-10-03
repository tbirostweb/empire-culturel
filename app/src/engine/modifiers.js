// Agrège tous les rangs achetés de l'arbre technologique en un objet de
// bonus unique, consommé par engine/farm.js, stores/collection.js
// (fusion), engine/gacha.js (chance) et stores/meta.js (streak). Pur, pas
// de dépendance Vue/Pinia — même patron que l'ancien jeu de cartes.
import { TREES } from '../data/trees.js';

export function computeTreeBonuses(purchasedRanks = {}) {
  const bonuses = {};
  for (const tree of Object.values(TREES)) {
    for (const node of tree.noeuds) {
      const rank = purchasedRanks[node.id] ?? 0;
      if (rank <= 0) continue;
      const { kind, value } = node.effect;
      bonuses[kind] = (bonuses[kind] ?? 0) + value * rank;
    }
  }
  return bonuses;
}
