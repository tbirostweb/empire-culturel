<script setup>
// Deux écrans plutôt qu'un : une grille de 4 catégories, puis l'arbre de la
// catégorie choisie (retour utilisateur : "affiche 4 carre au debut dans
// l'onglet avec le titre des different arbre et ensuite quand on clique sur
// un carre ca ouvre larbre concerne"). Remplace la rangée d'onglets
// horizontaux qui affichait un arbre en permanence.
import { computed, ref } from 'vue';
import { TREES } from '../data/trees.js';
import { usePlayerStore } from '../stores/player.js';
import { useTreesStore } from '../stores/trees.js';
import TreeCanvas from '../components/trees/TreeCanvas.vue';
import AppIcon from '../components/icons/AppIcon.vue';

const player = usePlayerStore();
const trees = useTreesStore();
const openTreeId = ref(null);

const openTree = computed(() => (openTreeId.value ? TREES[openTreeId.value] : null));

// Progression par catégorie : rangs achetés / rangs achetables, pour que la
// grille dise quelque chose plutôt que d'être quatre cases décoratives.
const treeCards = computed(() =>
  Object.values(TREES).map((tree) => {
    const total = tree.noeuds.reduce((n, node) => n + node.maxRank, 0);
    const owned = tree.noeuds.reduce((n, node) => n + trees.rankOf(node.id), 0);
    const affordable = tree.noeuds.some((node) => {
      const cost = trees.nextCost(node.id);
      return cost !== null && trees.isNodeUnlocked(node.id) && player.resources.pointsTech >= cost;
    });
    return { tree, owned, total, affordable };
  }),
);
</script>

<template>
  <div class="space-y-4 p-4 pb-6">
    <div class="flex items-center justify-between gap-2">
      <h1 class="text-xl font-bold">Technologie</h1>
      <span class="pill-soft tabular flex items-center gap-1">
        <AppIcon name="sparkles" class="h-3.5 w-3.5" />
        {{ player.resources.pointsTech }} Points
      </span>
    </div>

    <template v-if="!openTree">
      <p class="text-sm text-ink-soft">Choisis une branche à développer.</p>
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="card in treeCards"
          :key="card.tree.id"
          type="button"
          class="panel tree-card"
          @click="openTreeId = card.tree.id"
        >
          <span class="icon-chip mx-auto" style="--chip-tint: var(--color-encre)">
            <AppIcon :name="card.tree.icon" class="h-5 w-5" />
          </span>
          <p class="font-display text-base font-bold leading-tight">{{ card.tree.nom }}</p>
          <p class="tabular text-xs text-ink-soft">{{ card.owned }}/{{ card.total }} rangs</p>
          <span v-if="card.affordable" class="stamp straight tree-card-flag" style="color: var(--color-accent)">Dispo</span>
        </button>
      </div>
    </template>

    <template v-else>
      <button type="button" class="typewriter flex items-center gap-1 text-xs uppercase tracking-wider text-ink-soft" @click="openTreeId = null">
        <AppIcon name="chevron-left" class="h-3.5 w-3.5" />
        Toutes les branches
      </button>
      <h2 class="font-display text-lg font-bold">{{ openTree.nom }}</h2>
      <TreeCanvas :tree="openTree" />
    </template>
  </div>
</template>

<style scoped>
.tree-card {
  position: relative;
  display: flex;
  aspect-ratio: 1;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.75rem;
  text-align: center;
}
.tree-card-flag {
  position: absolute;
  right: 0.4rem;
  top: 0.4rem;
}
</style>
