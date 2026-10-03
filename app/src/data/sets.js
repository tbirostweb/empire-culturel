// Sets de collection — regroupements THÉMATIQUES curatés (transversaux aux
// régions/époques déjà présentes), qui accordent un bonus PERMANENT de
// revenus global une fois complétés. C'est un second axe d'objectif de
// collection : compléter "les Sept Merveilles" est un but en soi, distinct de
// "compléter l'Europe".
//
// Définis par NOM et non par id : l'ordre de RAW_MONUMENTS est figé (les ids
// en dérivent), mais lier par nom rend ce fichier robuste si un jour un
// monument est renommé ou déplacé sans changer d'id. La résolution nom -> id
// se fait au chargement (plus bas) ; un nom introuvable est ignoré avec un
// avertissement plutôt que de casser le jeu.
import { MONUMENTS } from './monuments.js';

const RAW_SETS = [
  {
    id: 'merveilles',
    nom: 'Sept Merveilles',
    icon: 'epoque-antiquite',
    bonusPct: 8,
    monuments: ['Colisée', 'Parthénon', 'Pyramides de Gizeh', 'Sphinx de Gizeh', 'Teotihuacan', 'Chichen Itza'],
  },
  {
    id: 'lieux_sacres',
    nom: 'Lieux sacrés',
    icon: 'landmark',
    bonusPct: 7,
    monuments: ['Notre-Dame de Paris', 'Cathédrale Saint-Basile', 'Borobudur', 'Angkor Wat', 'Églises de Lalibela', 'Torii de Miyajima'],
  },
  {
    id: 'geants_modernes',
    nom: 'Géants modernes',
    icon: 'epoque-contemporain',
    bonusPct: 7,
    monuments: ['Tour Eiffel', 'Big Ben', 'Burj Khalifa', 'Tower Bridge', 'Statue de la Liberté', 'Golden Gate Bridge'],
  },
  {
    id: 'nouveau_monde',
    nom: 'Nouveau Monde',
    icon: 'region-amerique',
    bonusPct: 5,
    monuments: ['Machu Picchu', 'Christ Rédempteur', 'Chichen Itza', 'Teotihuacan'],
  },
  {
    id: 'tours',
    nom: 'Tours du monde',
    icon: 'region-europe',
    bonusPct: 6,
    monuments: ['Tour de Pise', 'Tour Eiffel', 'Big Ben', 'Tour Hassan', 'Grande Muraille', 'Stonehenge'],
  },
];

const idByName = new Map(MONUMENTS.map((m) => [m.nom, m.id]));

export const SETS = RAW_SETS.map((set) => {
  const monumentIds = [];
  for (const nom of set.monuments) {
    const id = idByName.get(nom);
    if (id) monumentIds.push(id);
    else console.warn(`[sets] monument introuvable pour le set "${set.id}" : ${nom}`);
  }
  return { ...set, monumentIds };
});
