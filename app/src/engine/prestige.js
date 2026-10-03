// Prestige (brief §18) : boucle infinie, +5% revenus par prestige, jamais
// plafonnée. Pur. Enrichi d'un arbre de perks permanents achetés avec la
// Renommée (data/prestigePerks.js).
import { PRESTIGE } from '../data/economy.js';
import { PRESTIGE_PERKS, perkById } from '../data/prestigePerks.js';

export function prestigeBonusPct(prestigeCount) {
  return prestigeCount * PRESTIGE.bonusPerPrestigePct;
}

// Un vrai palier de progression requis avant de pouvoir prestiger — sans
// ça, un joueur pourrait prestiger dès la première seconde pour un bonus
// gratuit (retour utilisateur).
export function meetsPrestigeRequirement(niveauJoueur, monumentsOwned) {
  return niveauJoueur >= PRESTIGE.minLevel && monumentsOwned >= PRESTIGE.minMonuments;
}

// Renommée gagnée en accomplissant un prestige : un socle + une part par
// monument scoré possédé au moment du reset.
export function renommeeGain(monumentsOwned) {
  return PRESTIGE.renommeeBase + PRESTIGE.renommeePerMonument * Math.max(0, monumentsOwned);
}

// Agrège les effets de tous les perks possédés (`perks` = { [id]: niveau }).
// Somme, pour chaque clé d'effet, `perLevel[clé] × niveau`.
export function perkEffects(perks = {}) {
  const totals = { revenuPct: 0, startOr: 0, luckPct: 0, offlineCapPct: 0, keepMonuments: 0 };
  for (const perk of PRESTIGE_PERKS) {
    const level = perks[perk.id] ?? 0;
    if (level <= 0) continue;
    for (const [key, value] of Object.entries(perk.perLevel)) {
      totals[key] = (totals[key] ?? 0) + value * level;
    }
  }
  return totals;
}

// Coût du prochain niveau d'un perk, ou null si déjà au maximum.
export function perkNextCost(perkId, currentLevel) {
  const perk = perkById(perkId);
  if (!perk || currentLevel >= perk.maxLevel) return null;
  return perk.cost(currentLevel);
}
