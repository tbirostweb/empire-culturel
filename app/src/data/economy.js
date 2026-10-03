// Constantes d'équilibrage globales — regroupées ici pour être ajustables
// sans fouiller dans les stores/engine (même patron que l'ancien jeu de
// cartes). Nouveau concept "Empire Culturel" : 3 ressources (brief §14).

// Monnaie principale (achats boosters/progression), Cristaux premium
// (booster premium/accélérations), Points technologie (arbre tech).
export const CURRENCIES = ['or', 'cristaux', 'pointsTech'];

export const FARM = {
  baseSlots: 2, // brief §12 : 2 monuments actifs au départ
  tickIntervalMs: 1000,
  offlineCapHours: 8,
};

// Coût de booster croissant à chaque achat (+6% par achat du MÊME
// palier, avant réduction d'arbre) — sans ça, le coût reste plat pour
// toujours et un joueur qui laisse tourner sa Farm finit par pouvoir
// spammer des boosters sans frein, ce qui vide le jeu trop vite. Patron
// idle-game classique (coût = base * croissance^nombre déjà acheté).
// 7% (et non 6%) : avec des boosters moins chers en valeur absolue, il faut
// une progression un peu plus mordante pour que l'ouverture en masse reste
// un vrai choix économique et pas une évidence.
export const BOOSTER_COST_GROWTH = 1.07;

export const LEVELING = {
  xpBase: 100,
  xpPerLevel: 60,
  maxLevel: 60,
  xpPerBooster: 10,
  xpPerFusion: 25,
  xpPerMission: 40,
};

// Fusion des doublons (brief §11) : N monuments identiques du même niveau
// -> niveau supérieur, jamais un doublon perdu/inutile.
export const FUSION = {
  requiredCount: 3,
  maxLevel: 5,
  revenueMultiplierPerLevel: 0.25, // +25% revenu par niveau de monument
  valueMultiplierPerLevel: 0.25,
};

// Améliorations par monument (profondeur économique) : un PUITS D'OR dédié,
// distinct de la fusion (qui consomme des doublons, pas de l'Or). Chaque
// niveau d'amélioration multiplie le revenu PROPRE du monument — le bénéfice
// suit le monument où qu'il soit placé, contrairement à un bonus d'arbre
// global. Coût mis à l'échelle de la PUISSANCE de rareté (data/rarity.js) :
// améliorer un Mythique coûte plus cher mais rapporte proportionnellement
// plus, si bien qu'investir dans ses meilleures pièces reste le bon choix.
export const AMELIORATION = {
  maxLevel: 15,
  revenueMultPerLevel: 0.12, // +12% du revenu de base par niveau (multiplicatif propre)
  baseCost: 60, // coût niveau 0 -> 1 pour un Commun (puissance 1)
  costGrowth: 1.35,
};

// Spécialisation d'emplacement de Farm (profondeur économique) : on assigne à
// un emplacement une RÉGION de prédilection ; un monument de cette région
// posé dans cet emplacement gagne un bonus de revenu. Puits de Points techno
// (pas d'Or), et vrai choix stratégique — organiser sa Farm par région plutôt
// que d'y empiler ses plus gros revenus bruts. Bonus PUR (jamais de malus) :
// un emplacement non spécialisé (défaut) reste parfaitement neutre.
export const SLOT_SPEC = {
  matchPct: 25, // +25% revenu si la région du monument correspond à celle de l'emplacement
  cost: 8, // Points techno pour (re)spécialiser un emplacement
};

// Prestige (brief §18) : boucle infinie, +5% revenus par prestige. Gagné
// à n'importe quel moment sans condition dans un premier jet — retour
// utilisateur : le rendre disponible seulement après un vrai palier de
// progression, pas dès le début de partie.
export const PRESTIGE = {
  bonusPerPrestigePct: 5,
  minLevel: 10,
  // ~40% des monuments scorés (31 hors secrets). Le commentaire précédent
  // parlait de "30% des 50 monuments", chiffre hérité d'un catalogue qui
  // n'existe plus.
  minMonuments: 13,
  // Or crédité juste après un prestige (avant le perk de démarrage).
  resetOr: 300,
  // RENOMMÉE : monnaie de méta-progression gagnée à chaque prestige, jamais
  // dépensée ailleurs, JAMAIS réinitialisée. Sert à acheter des perks
  // permanents (data/prestigePerks.js) qui, eux, survivent aux prestiges
  // suivants — c'est ce qui donne une raison de prestiger au-delà du simple
  // +5%. Gain = un socle + une part par monument scoré possédé au moment du
  // prestige (récompense d'être allé loin avant de recommencer).
  renommeeBase: 3,
  renommeePerMonument: 1,
};

// Connexion quotidienne (brief §17, réutilise le patron de l'ancien jeu :
// réclamation manuelle, jamais auto-créditée).
export const STREAK = {
  toleranceDays: 0,
  maxDay: 7,
  // Recalibré avec l'économie : l'Or vaut ~20x plus qu'avant, une récompense
  // de 50 Or/jour représentait désormais plus d'une heure de Farm de début
  // de partie. 8 Or/jour (jour 7 = 56 Or) reste un vrai appoint sans
  // court-circuiter la boucle.
  rewardOrPerDay: 8,
  crystalDay: 7, // jour 7 : bonus Cristaux
  crystalReward: 20,
};

export const MISSIONS = {
  dailyCount: 3,
  // Idem : recalibré sur la nouvelle valeur de l'Or (cf. STREAK).
  rewardOr: 25,
  rewardPointsTech: 5,
};

// Classement (brief §19) : 100% client-only (pas de backend, cf.
// CLAUDE.md — Architecture non-négociable), donc pas de vrais autres
// joueurs. Adversaires simulés générés déterministiquement par graine
// (même principe que les bots de ladder de l'ancien jeu) pour donner une
// sensation de classement sans prétendre à un vrai multijoueur.
// Le classement se joue sur l'OR GAGNÉ cumulé (stores/player.js#orGagneSaison
// / orGagneTotal), pas sur un score composite : c'est la seule mesure que le
// joueur voit monter en permanence.
export const RANKINGS = {
  seasonDurationDays: 21,
  rivalCount: 3,
  // Récompense de fin de saison, par rang final (index 0 = 1er). Payée en
  // Cristaux : la monnaie premium, jamais réinitialisée par un prestige,
  // donc la seule qui donne du poids à une performance saisonnière.
  seasonRewards: [
    { cristaux: 150, pointsTech: 10 },
    { cristaux: 90, pointsTech: 6 },
    { cristaux: 50, pointsTech: 3 },
    { cristaux: 20, pointsTech: 1 },
  ],
};
