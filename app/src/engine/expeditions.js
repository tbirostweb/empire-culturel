// Récompense d'une expédition (brief : mécanique poussée). Pur — prend la
// définition d'expédition, la rareté et le niveau (fusion) du monument, et
// retourne les ressources gagnées. Aucune dépendance Vue/Pinia.
import { EXPEDITIONS } from '../data/expeditions.js';
import { rarityPower } from '../data/rarity.js';
import { FUSION } from '../data/economy.js';

// Le niveau de fusion majore la récompense au même taux que le revenu de Farm
// (FUSION.revenueMultiplierPerLevel), pour qu'un monument monté vaille autant
// en expédition qu'en Farm — sinon fusionner "désoptimiserait" l'expédition.
export function expeditionReward(expedition, rarete, niveau = 1) {
  const power = rarityPower(rarete);
  const levelMult = 1 + FUSION.revenueMultiplierPerLevel * (Math.max(1, niveau) - 1);
  const scaled = (base) => Math.round(base * power * levelMult * 100) / 100;
  return {
    or: Math.round(expedition.reward.or * power * levelMult),
    pointsTech: Math.floor(scaled(expedition.reward.pointsTech)),
    cristaux: Math.floor(scaled(expedition.reward.cristaux)),
    xp: expedition.xp,
  };
}

// Aperçu de toutes les expéditions pour un monument donné, avec durée lisible
// — sert la vue à présenter les choix sans dupliquer la logique de calcul.
export function expeditionPreviews(rarete, niveau = 1) {
  return Object.values(EXPEDITIONS).map((exp) => ({
    ...exp,
    gains: expeditionReward(exp, rarete, niveau),
  }));
}
