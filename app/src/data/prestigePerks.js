// Arbre de perks de PRESTIGE — méta-progression permanente achetée avec la
// Renommée (gagnée à chaque prestige, cf. data/economy.js#PRESTIGE). Chaque
// perk PERSISTE à travers les prestiges suivants : c'est la récompense de
// long terme qui donne un sens à la boucle de prestige au-delà du +5%/reset.
//
// Chaque perk a un effet cumulatif par niveau, agrégé dans
// engine/prestige.js#perkEffects et appliqué au bon endroit :
//   - revenuPct        -> ajouté au bonus de prestige (stores/prestige.js#bonusPct)
//   - startOr          -> Or crédité juste après un prestige
//   - luckPct          -> chance de rareté des boosters (stores/collection.js)
//   - offlineCapPct    -> plafond de revenu hors-ligne (stores/farm.js)
//   - keepMonuments    -> nombre de monuments (les mieux notés) CONSERVÉS au prestige
//
// `cost(level)` = Renommée pour passer de `level` à `level+1`. Coûts
// volontairement croissants : un perk maxé représente plusieurs prestiges.
export const PRESTIGE_PERKS = [
  {
    id: 'revenu',
    nom: 'Rente impériale',
    description: '+4% de revenus de Farm par niveau, permanent.',
    icon: 'trend',
    maxLevel: 10,
    perLevel: { revenuPct: 4 },
    cost: (level) => 4 + level * 3,
  },
  {
    id: 'demarrage',
    nom: 'Trésor de guerre',
    description: "Commence chaque nouvelle ère avec un pécule d'Or.",
    icon: 'coin',
    maxLevel: 10,
    perLevel: { startOr: 500 },
    cost: (level) => 3 + level * 2,
  },
  {
    id: 'chance',
    nom: 'Œil du collectionneur',
    description: '+3% de chance de rareté sur tous les boosters, par niveau.',
    icon: 'star',
    maxLevel: 8,
    perLevel: { luckPct: 3 },
    cost: (level) => 5 + level * 4,
  },
  {
    id: 'horsligne',
    nom: 'Intendance',
    description: '+20% de plafond de revenus hors-ligne, par niveau.',
    icon: 'clock',
    maxLevel: 8,
    perLevel: { offlineCapPct: 20 },
    cost: (level) => 4 + level * 3,
  },
  {
    id: 'heritage',
    nom: 'Héritage',
    description: 'Conserve tes meilleurs monuments à travers le prestige (1 de plus par niveau).',
    icon: 'crown',
    maxLevel: 3,
    perLevel: { keepMonuments: 1 },
    cost: (level) => 12 + level * 12,
  },
];

export const perkById = (id) => PRESTIGE_PERKS.find((p) => p.id === id) ?? null;
