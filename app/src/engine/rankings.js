// Classements (brief §19) : app 100% client-only (pas de backend, cf.
// CLAUDE.md — Architecture non-négociable), donc pas de vrais autres
// joueurs. Trois concurrents simulés, tirés par graine de saison.
//
// Le classement se joue sur l'OR GAGNÉ (cumulé), pas sur un score composite
// "Empire Culturel" : c'est la seule mesure que le joueur voit augmenter en
// continu, donc la seule sur laquelle il peut se situer sans explication.
//
// Les concurrents ne sont plus un score figé : chacun a un DÉBIT d'or par
// seconde fixé au début de la saison, et son total se déduit du temps écoulé
// depuis. Le classement bouge donc tout seul, et surtout le joueur peut
// réellement les rattraper puis les dépasser en améliorant sa Farm — avec
// des scores figés tirés autour de son propre score, il restait
// éternellement à la même place quoi qu'il fasse.
import { createRng } from './rng.js';

const NAMES = [
  'Aurélien', 'Camille', 'Sofia', 'Lucas', 'Mei', 'Ibrahim', 'Noah', 'Elena',
  'Kenji', 'Amara', 'Zara', 'Diego', 'Priya', 'Oscar', 'Yara',
];

// Un rival nettement devant, un au coude à coude, un derrière — pour que le
// classement ait toujours un objectif atteignable ET quelqu'un à ne pas
// laisser repasser.
const RIVAL_PACE = [
  { key: 'lievre', factor: 1.6 },
  { key: 'rival', factor: 1.0 },
  { key: 'poursuivant', factor: 0.55 },
];

// `referenceRatePerSecond` : débit d'or du joueur au moment où la saison
// démarre pour lui. Sert d'étalon une seule fois, puis les rivaux vivent
// leur vie — c'est ce qui rend le dépassement possible quand le joueur
// progresse pendant la saison.
export function generateSeasonRivals(seed, referenceRatePerSecond) {
  const rng = createRng(seed);
  const base = Math.max(referenceRatePerSecond, 0.5);
  return RIVAL_PACE.map(({ factor }) => ({
    nom: `${rng.pick(NAMES)} ${rng.int(10, 99)}`,
    // Jitter seedé pour que deux saisons ne se ressemblent pas exactement.
    ratePerSecond: base * factor * (0.85 + rng.next() * 0.3),
    // Petite avance de départ, uniquement pour départager les quatre
    // concurrents dans les toutes premières minutes (sans elle, tout le
    // monde est à 0 et le tableau est plat). Volontairement de l'ordre de
    // quelques minutes de production : à 10-90 minutes, les rivaux
    // démarraient la saison avec des centaines de milliers d'or d'avance
    // alors que le compteur du joueur venait d'être remis à zéro, et la
    // 4e place était acquise d'office.
    avance: base * factor * rng.int(30, 300),
  }));
}

export function rivalScoreAt(rival, elapsedSeconds) {
  return Math.max(0, Math.round(rival.avance + rival.ratePerSecond * Math.max(0, elapsedSeconds)));
}

export function buildLeaderboard(rivals, elapsedSeconds, playerName, playerScore) {
  const entries = [
    ...rivals.map((r) => ({ nom: r.nom, score: rivalScoreAt(r, elapsedSeconds) })),
    { nom: playerName, score: Math.round(playerScore), isPlayer: true },
  ];
  entries.sort((a, b) => b.score - a.score);
  return entries.map((entry, index) => ({ ...entry, rang: index + 1 }));
}
