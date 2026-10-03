// Génération de revenu idle par la Farm (brief §12) + calcul hors-ligne
// (repris du patron de l'ancien jeu : plafond en heures, jamais de
// revenu infini pendant l'absence). Pur, pas de dépendance Vue/Pinia.
import { FARM, FUSION, SLOT_SPEC } from '../data/economy.js';
import { ameliorationMultiplier } from './upgrades.js';

// Revenu effectif d'un monument placé en Farm. Trois strates distinctes :
//   - `levelMult`  : niveau de FUSION (multiplicatif, engine/fusion.js) ;
//   - `ameMult`    : niveau d'AMÉLIORATION propre au monument (multiplicatif,
//                    puits d'Or dédié, engine/upgrades.js) ;
//   - `pct`        : somme des bonus EN POURCENTAGE (arbre + prestige +
//                    collections complétées + spécialisation d'emplacement).
// Le tout sur le revenu de base de la rareté (data/rarity.js#baseRevenue),
// jamais un montant deviné à la main. `slotSpecPct` vaut 0 hors contexte de
// Farm (aperçu de fiche, etc.).
export function monumentEffectiveRevenue(
  ownedEntry,
  def,
  treeBonuses = {},
  prestigeBonusPct = 0,
  collectionBonusPct = 0,
  slotSpecPct = 0,
) {
  const levelMult = 1 + FUSION.revenueMultiplierPerLevel * ((ownedEntry.niveau ?? 1) - 1);
  const ameMult = ameliorationMultiplier(ownedEntry.ameliorations ?? 0);
  const pct = (treeBonuses.revenuPct ?? 0) + prestigeBonusPct + collectionBonusPct + slotSpecPct;
  return def.revenuBase * levelMult * ameMult * (1 + pct / 100);
}

// Bonus de spécialisation d'un emplacement pour un monument donné : +match% si
// la région du monument correspond à la spécialisation de l'emplacement, 0
// sinon (y compris emplacement non spécialisé). Jamais de malus.
export function slotSpecBonusPct(spec, def) {
  return spec && def.region === spec ? SLOT_SPEC.matchPct : 0;
}

// `paddedSlots` : tableau [id|null] indexé par EMPLACEMENT (position stable),
// `specs` : tableau [region|null] parallèle. Itère par index pour associer
// chaque monument à la spécialisation de SON emplacement.
// `collectionBonusForMonument` : fonction (def) -> % (brief §10, collections
// régionales/historiques complétées) — passée par l'appelant plutôt
// qu'importée directement, pour garder ce fichier indépendant du store
// collection.
export function farmRatePerSecond(
  paddedSlots,
  specs,
  owned,
  monumentDefLookup,
  treeBonuses = {},
  prestigeBonusPct = 0,
  collectionBonusForMonument = () => 0,
) {
  return paddedSlots.reduce((sum, id, i) => {
    if (!id) return sum;
    const entry = owned[id];
    const def = monumentDefLookup(id);
    if (!entry || !def) return sum;
    const specPct = slotSpecBonusPct(specs[i] ?? null, def);
    return sum + monumentEffectiveRevenue(entry, def, treeBonuses, prestigeBonusPct, collectionBonusForMonument(def), specPct);
  }, 0);
}

export function farmSlotCount(treeBonuses = {}) {
  return FARM.baseSlots + (treeBonuses.farmSlots ?? 0);
}

export function offlineCapHours(treeBonuses = {}) {
  return FARM.offlineCapHours * (1 + (treeBonuses.offlineCapPct ?? 0) / 100);
}

// lastSeenMs/nowMs en epoch ms. Retourne le nombre de secondes
// effectivement comptées (après plafonnement) + l'Or généré.
export function offlineEarnings(ratePerSecond, lastSeenMs, nowMs, treeBonuses = {}) {
  const capSeconds = offlineCapHours(treeBonuses) * 3600;
  const elapsedSeconds = Math.max(0, (nowMs - lastSeenMs) / 1000);
  const seconds = Math.min(capSeconds, elapsedSeconds);
  return { seconds, or: Math.round(ratePerSecond * seconds) };
}
