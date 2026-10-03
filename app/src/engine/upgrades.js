// Améliorations par monument (profondeur économique) — pur. Un puits d'Or
// dédié : chaque niveau d'amélioration multiplie le revenu propre du monument
// (indépendamment du niveau de fusion et des bonus globaux). Le coût est mis à
// l'échelle de la puissance de rareté, si bien qu'améliorer une pièce rare
// coûte plus mais rapporte davantage.
import { AMELIORATION } from '../data/economy.js';
import { rarityPower } from '../data/rarity.js';

export function ameliorationMultiplier(ameliorations = 0) {
  return 1 + AMELIORATION.revenueMultPerLevel * Math.max(0, ameliorations);
}

export function ameliorationCost(rarete, currentLevel) {
  return Math.round(AMELIORATION.baseCost * rarityPower(rarete) * AMELIORATION.costGrowth ** currentLevel);
}

export function canAmeliorer(currentLevel) {
  return (currentLevel ?? 0) < AMELIORATION.maxLevel;
}
