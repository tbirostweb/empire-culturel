// 7 paliers de rareté. Le brief "Empire Culturel" §7 en prévoyait 6 ; le
// 7e, `secret`, a été ajouté sur demande explicite de l'utilisateur
// ("une categorie a part secret ... avec tres tres peu de chance, encore
// moins que mythique").
//
// `secret` n'est pas simplement "un cran au-dessus de mythique" : c'est une
// catégorie À PART, et le code la traite comme telle —
//   - elle est exclue du décompte de complétion du musée
//     (`SCORED_RARITIES`), sinon le compteur deviendrait indépassable et
//     décourageant, puisque ces monuments sont quasi-introuvables ;
//   - un monument secret non découvert est MASQUÉ dans la Collection
//     (cf. views/CollectionView.vue) — d'où le nom : on ne doit pas savoir
//     à l'avance ce qu'on cherche ;
//   - sa teinte est la seule famille de couleur inutilisée par les six
//     autres (35° d'écart avec la plus proche), pour qu'elle se lise comme
//     autre chose et non comme un palier de plus.
export const RARITIES = ['commun', 'peu_commun', 'rare', 'epique', 'legendaire', 'mythique', 'secret'];

// Raretés comptées dans la complétion du musée et dans les séries
// région/époque. `secret` en est volontairement exclu (cf. ci-dessus).
export const SCORED_RARITIES = RARITIES.filter((r) => r !== 'secret');

export const RARITY_LABELS = {
  commun: 'Commun',
  peu_commun: 'Peu commun',
  rare: 'Rare',
  epique: 'Épique',
  legendaire: 'Légendaire',
  mythique: 'Mythique',
  secret: 'Secret',
};

// Constante JS plutôt qu'un lookup CSS `var(--color-${rarete})` — piège
// Tailwind v4 déjà rencontré sur ce projet (tree-shaking des `@theme` non
// référencées par une classe littérale), cf. CLAUDE.md.
//
// ENCRES VIVES. Troisième et dernier réglage de cette échelle : le premier
// jet était néon/écran, le second beaucoup trop rabattu (tout se
// confondait), celui-ci pousse la SATURATION au maximum compatible avec AA.
//
// Méthode, à refaire à l'identique si ces valeurs doivent bouger : garder la
// teinte, fixer la saturation haut (~0.88 en HSL), puis descendre la
// LUMINOSITÉ jusqu'à ce que le contraste passe — jamais l'inverse.
// Éclaircir délave, rabattre ternit ; seule la luminosité "achète" du
// contraste sans coûter de vivacité. Résultat : 80-95% de saturation contre
// 45-82% au jet précédent, à contraste égal.
//
// On s'arrête à ~88% et non 100% : à saturation pure on obtient des
// primaires de moniteur (#9100D9 magenta électrique, #0059BF bleu pur) qui
// jurent franchement avec le papier chaud de l'identité "carnet de voyage".
// `commun` reste volontairement neutre (graphite) — c'est le palier sans
// intérêt, il ne doit pas rivaliser avec les raretés hautes.
//
// Chaque valeur est vérifiée à >= 4.5:1 (AA petit texte) sur les TROIS fonds
// papier du thème (--color-fond, --color-surface, --color-surface-soft),
// puisque la rareté s'affiche en TAMPON (texte coloré sur papier) et non
// plus en pastille pleine à texte blanc. Calculé via la formule de luminance
// relative WCAG, jamais réglé à l'oeil (cf. CLAUDE.md).
// THÈME SOMBRE "plan d'architecte" : versions LUMINEUSES des teintes (texte
// clair sur bleu foncé), recalculées pour AA sur les trois fonds bleus via la
// méthode inverse du papier (monter la luminosité, pas la baisser). `commun`
// reste un gris bleuté neutre — le palier sans intérêt ne doit pas briller.
// `secret` garde sa famille vert-de-gris, seule teinte qu'aucun autre palier
// n'occupe.
export const RARITY_COLORS = {
  commun: '#A2ABB3',
  peu_commun: '#2EC26B',
  rare: '#51B4E6',
  epique: '#C997ED',
  legendaire: '#DB9F12',
  mythique: '#F28CA1',
  secret: '#1BC0AA',
};

// Pictogramme par palier (résolu par components/icons/AppIcon.vue). Redonde
// volontairement la couleur : sur une grille, la FORME se lit avant la
// teinte, et l'échelle reste lisible pour un daltonien.
export const RARITY_ICONS = {
  commun: 'rarity-commun',
  peu_commun: 'rarity-peu_commun',
  rare: 'rarity-rare',
  epique: 'rarity-epique',
  legendaire: 'rarity-legendaire',
  mythique: 'rarity-mythique',
  secret: 'rarity-secret',
};

// Base de revenu/valeur par rareté (brief §6 : chaque monument a un
// "revenu de base" et une "valeur de collection") — dérivés de la rareté
// par une fonction pure plutôt que saisis à la main par monument, pour
// rester cohérent et facile à rééquilibrer globalement.
// Courbe RELEVÉE PAR LE BAS et APLATIE (retour utilisateur : "le jeu est un
// peu dur a commencer"). Le premier réglage avait divisé les revenus par ~20
// pour casser le farm trop facile, mais il avait aussi écrasé le début de
// partie : avec deux Communs, s'offrir un booster à 40 Or demandait près de
// 7 minutes — on décroche avant.
//
// Le levier n'est pas de tout remonter (ça ramènerait le problème initial)
// mais de RÉDUIRE L'AMPLITUDE : le bas monte fort (x5 sur Commun), le haut
// beaucoup moins (x1,4 sur Mythique). L'écart Commun -> Mythique passe de
// 360x à 100x. Résultat : ~1 min pour le premier booster au lieu de 7, sans
// que la fin de partie redevienne triviale.
//
// Ce curseur se règle AVEC les coûts de booster et les probabilités
// (data/boosters.js), jamais seul.
const REVENUE_BASE = { commun: 0.25, peu_commun: 0.7, rare: 1.8, epique: 4, legendaire: 9, mythique: 25, secret: 70 };
const VALUE_BASE = { commun: 50, peu_commun: 150, rare: 500, epique: 1500, legendaire: 6000, mythique: 25000, secret: 60000 };

export function baseRevenue(rarete) {
  return REVENUE_BASE[rarete] ?? 1;
}
export function baseValue(rarete) {
  return VALUE_BASE[rarete] ?? 50;
}

// "Puissance" abstraite d'un monument par rareté — étalon commun aux
// mécaniques qui récompensent selon la valeur d'un monument sans passer par
// son revenu de Farm (expéditions, duels, bonus de set). Séparée de
// `baseRevenue` exprès : le revenu est un débit calibré sur l'économie idle,
// la puissance est un poids relatif plus lisse (échelle ~x40 du bas au haut).
const POWER_BASE = { commun: 1, peu_commun: 2, rare: 4, epique: 8, legendaire: 16, mythique: 32, secret: 45 };
export function rarityPower(rarete) {
  return POWER_BASE[rarete] ?? 1;
}
