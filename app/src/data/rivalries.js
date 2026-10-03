// Roster de rivaux pour le DUEL hebdomadaire — une mécanique DISTINCTE du
// classement saisonnier (stores/rankings.js) : là c'est un tableau à 4 sur 21
// jours, ici c'est un 1 contre 1 par semaine, avec un objectif chiffré, un
// palmarès (victoires/défaites/série) et une récompense qui monte avec la
// série. Le classement dit "où tu te situes", le duel dit "bats CETTE
// personne cette semaine".
//
// `difficulty` = facteur appliqué au débit d'Or du joueur au début de la
// semaine pour fixer la CIBLE du rival (engine/rivalries.js). < 1 : gagnable
// en jouant normalement, même sans progresser ; >= 1 : il faut améliorer sa
// Farm dans la semaine pour le battre. La récompense est proportionnelle à la
// difficulté — battre le plus coriace paie le plus.
export const RIVAL_ROSTER = [
  {
    id: 'margaux',
    nom: 'Margaux la Méthodique',
    persona: 'Elle collectionne par ordre alphabétique. « Ta Farm est charmante. La mienne est rentable. »',
    difficulty: 0.7,
  },
  {
    id: 'theo_r',
    nom: 'Théo le Régulier',
    persona: 'Se connecte tous les jours à la même heure. « Rien de spectaculaire. Juste devant toi. »',
    difficulty: 0.85,
  },
  {
    id: 'sofia',
    nom: 'Sofia la Spéculatrice',
    persona: 'Revend, fusionne, recommence. « Je ne garde que ce qui rapporte. »',
    difficulty: 1.0,
  },
  {
    id: 'ravi',
    nom: 'Ravi le Rapace',
    persona: 'N’ouvre que des Boosters Or. « Le commun, c’est pour les débutants. »',
    difficulty: 1.15,
  },
  {
    id: 'nadia',
    nom: 'Nadia l’Insatiable',
    persona: 'Championne trois saisons d’affilée. « Montre-moi que tu mérites ma semaine. »',
    difficulty: 1.3,
  },
];

export const DUEL = {
  // Récompense de base (en ressources premium/techno), multipliée par la
  // difficulté du rival et la série de victoires en cours.
  baseReward: { cristaux: 3, pointsTech: 4 },
  // +15% de récompense par victoire consécutive (série).
  streakRewardPct: 15,
  // Plancher de débit pour caler la cible du rival, même patron que le
  // classement : un joueur à 0 Or/s ne doit pas hériter d'un duel trivial.
  minRate: 0.5,
  // On ne LANCE pas un duel s'il reste moins que ça dans la semaine — un duel
  // d'une heure n'a pas de sens, et le joueur reprend au duel suivant. Ne
  // s'applique qu'au tout premier lancement d'une semaine donnée.
  minWindowMs: 24 * 3_600_000,
};

export const rivalById = (id) => RIVAL_ROSTER.find((r) => r.id === id) ?? null;
