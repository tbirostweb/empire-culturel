// Arbre technologique (brief §13) : orchestre engine/modifiers.js, coûte
// des Points technologie (pas la monnaie principale ni les Cristaux).
import { defineStore } from 'pinia';
import { findTreeNode, treeNodeCost } from '../data/trees.js';
import { computeTreeBonuses } from '../engine/modifiers.js';
import { usePlayerStore } from './player.js';

export const useTreesStore = defineStore('trees', {
  state: () => ({
    ranks: {}, // { [nodeId]: rang }
  }),
  getters: {
    treeBonuses: (state) => computeTreeBonuses(state.ranks),
    rankOf: (state) => (nodeId) => state.ranks[nodeId] ?? 0,
    // Un noeud est débloqué quand son parent est au rang MAXIMUM (les
    // racines n'ont pas de parent). Demande explicite de l'utilisateur :
    // "si une amelioration niv 1 est pas max on ne peux pas passer en
    // dessous". C'est plus exigeant que la règle précédente (un seul rang
    // suffisait), et ça donne son sens à l'arbre : on termine une branche
    // avant d'ouvrir la suivante, au lieu de picorer un rang partout.
    isNodeUnlocked: (state) => (nodeId) => {
      const node = findTreeNode(nodeId);
      if (!node || !node.parent) return true;
      const parent = findTreeNode(node.parent);
      if (!parent) return true;
      return (state.ranks[node.parent] ?? 0) >= parent.maxRank;
    },
    nextCost: (state) => (nodeId) => treeNodeCost(nodeId, state.ranks[nodeId] ?? 0),
  },
  actions: {
    acheterNoeud(nodeId) {
      const node = findTreeNode(nodeId);
      if (!node) return false;
      if (!this.isNodeUnlocked(nodeId)) return false;
      const rank = this.ranks[nodeId] ?? 0;
      const cost = treeNodeCost(nodeId, rank);
      if (cost === null) return false;
      const player = usePlayerStore();
      if (!player.debit('pointsTech', cost)) return false;
      this.ranks[nodeId] = rank + 1;
      return true;
    },
  },
  persist: true,
});
