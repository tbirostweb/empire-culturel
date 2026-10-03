// Expéditions — on envoie un monument possédé "sur le terrain" pendant une
// durée, il revient avec des récompenses (retour utilisateur : pousser la
// mécanique loin). Deux intérêts de design distincts :
//   - donne une UTILITÉ aux doublons/monuments hors-Farm (on en a beaucoup
//     avec 35 monuments et le farm limité à 2-3 slots) ;
//   - c'est la seule source régulière de Cristaux et de Points techno hors
//     classement/missions — donc un vrai second robinet, pas un doublon de
//     la Farm.
//
// Volontairement MOINS rentable que la Farm en Or/heure : la Farm reste la
// boucle principale. L'expédition paie en ressources rares que la Farm ne
// donne pas, et sur un monument qui ne produirait rien pendant ce temps.

export const EXPEDITION_SLOTS = 3;

// `durationMs` : durée de l'expédition. `reward` : gains PAR POINT DE PUISSANCE
// du monument (cf. data/rarity.js#rarityPower) — un mythique (puissance 32)
// rapporte donc 32x un commun. `xp` fixe par expédition (indépendant de la
// puissance : c'est le fait de mener l'expédition qui donne de l'XP).
export const EXPEDITIONS = {
  releve: {
    id: 'releve',
    nom: 'Relevé de terrain',
    description: 'Une sortie courte. Surtout de l\'Or.',
    icon: 'compass',
    durationMs: 15 * 60_000,
    reward: { or: 22, pointsTech: 0, cristaux: 0 },
    xp: 8,
  },
  fouille: {
    id: 'fouille',
    nom: 'Fouille archéologique',
    description: 'Plus longue. De l\'Or et des Points techno.',
    icon: 'landmark',
    durationMs: 2 * 3_600_000,
    reward: { or: 120, pointsTech: 0.5, cristaux: 0 },
    xp: 30,
  },
  campagne: {
    id: 'campagne',
    nom: 'Grande campagne',
    description: 'Une expédition majeure. Or, Points techno et Cristaux.',
    icon: 'flag',
    durationMs: 8 * 3_600_000,
    reward: { or: 380, pointsTech: 2, cristaux: 0.2 },
    xp: 90,
  },
};

export const EXPEDITION_IDS = Object.keys(EXPEDITIONS);
