// Fusion des doublons (brief §11) : N monuments identiques du même
// niveau -> niveau supérieur, jamais un doublon inutile. Pur.
import { FUSION } from '../data/economy.js';

export function canFuse(ownedEntry) {
  if (!ownedEntry) return false;
  return ownedEntry.doublons >= FUSION.requiredCount && ownedEntry.niveau < FUSION.maxLevel;
}

export function fuse(ownedEntry) {
  if (!canFuse(ownedEntry)) return null;
  // `...ownedEntry` d'abord : préserve les champs annexes de l'entrée (dont
  // `ameliorations`, le puits d'Or par monument) que la fusion ne touche pas.
  // Sans ça, fusionner remettrait les améliorations à zéro.
  return {
    ...ownedEntry,
    niveau: ownedEntry.niveau + 1,
    doublons: ownedEntry.doublons - FUSION.requiredCount,
  };
}
