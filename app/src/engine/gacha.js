// Ouverture de booster (brief §8) : un booster donne exactement UN
// monument. Tire d'abord la rareté (pondérée par le booster), puis un
// monument uniforme parmi ceux de cette rareté — tous les monuments
// peuvent sortir de tous les boosters, seule la pondération change. Pur,
// alimenté par engine/rng.js (jamais Math.random()).
import { MONUMENTS } from '../data/monuments.js';

const MONUMENTS_BY_RARITY = (() => {
  const map = {};
  for (const m of MONUMENTS) {
    (map[m.rarete] ??= []).push(m);
  }
  return map;
})();

// `rarityLuckBonus` (arbre Booster) déplace du poids des raretés basses
// vers les hautes plutôt que de changer arbitrairement la table — reste
// borné (jamais plus de 50% du poids "commun" déplacé) pour ne pas casser
// l'équilibrage si le bonus devient très élevé en fin de partie.
//
// `secret` reçoit une part volontairement minuscule (2% du poids déplacé) :
// il doit rester quasi-introuvable même à bonus maximum, mais l'arbre doit
// quand même avoir une prise dessus — sinon le seul palier que le joueur a
// une raison d'investir pour atteindre serait précisément celui que le
// bonus ignore. Les cinq parts somment à 1.
export function openBooster(rng, booster, rarityLuckPct = 0) {
  const weights = { ...booster.weights };
  if (rarityLuckPct > 0) {
    const shift = Math.min(weights.commun * 0.5, weights.commun * (rarityLuckPct / 100));
    weights.commun -= shift;
    weights.secret = (weights.secret ?? 0) + shift * 0.02;
    weights.mythique += shift * 0.15;
    weights.legendaire += shift * 0.25;
    weights.epique += shift * 0.29;
    weights.rare += shift * 0.29;
  }

  const entries = Object.entries(weights).map(([rarete, weight]) => ({ rarete, weight }));
  const chosenRarity = rng.weightedPick(entries, 'weight').rarete;
  const pool = MONUMENTS_BY_RARITY[chosenRarity] ?? MONUMENTS;

  // Biais régional du booster événement (engine/events.js) : une fois la
  // rareté tirée, on préfère un monument de la région-thème `themeBias` du
  // temps — mais seulement si cette région a effectivement un monument de la
  // rareté tirée, sinon on retombe sur le pool complet (jamais de tirage
  // impossible).
  if (booster.themeRegion && rng.next() < (booster.themeBias ?? 0)) {
    const themed = pool.filter((m) => m.region === booster.themeRegion);
    if (themed.length > 0) return rng.pick(themed);
  }
  return rng.pick(pool);
}
