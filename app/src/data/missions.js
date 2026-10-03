// Modèles de missions quotidiennes (brief §16). `stores/missions.js` en
// tire un tirage journalier déterministe (seed du jour, comme la
// boutique/les decks bots de l'ancien jeu — même joueur = mêmes missions
// toute la journée).
export const MISSION_TEMPLATES = [
  { id: 'open_boosters', label: 'Ouvrir 3 boosters', target: 3, trackedEvent: 'boosterOpened' },
  { id: 'earn_gold', label: "Générer 500 d'Or via la Farm", target: 500, trackedEvent: 'goldEarned' },
  { id: 'fuse_monument', label: 'Fusionner un monument', target: 1, trackedEvent: 'monumentFused' },
  { id: 'complete_collection', label: 'Compléter une collection (région ou époque)', target: 1, trackedEvent: 'collectionCompleted' },
  { id: 'open_boosters_5', label: 'Ouvrir 5 boosters', target: 5, trackedEvent: 'boosterOpened' },
  { id: 'earn_gold_1000', label: "Générer 1000 d'Or via la Farm", target: 1000, trackedEvent: 'goldEarned' },
];
