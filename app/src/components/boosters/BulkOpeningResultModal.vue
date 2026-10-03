<script setup>
// Résultat d'une ouverture groupée (x5/x10/x100, retour utilisateur : "un
// bouton pour ouvrir 5 ou 10 booster aussi c'est pas mal voir 100 aussi").
// Contrairement à BoosterOpeningModal (mise en scène 3D d'un seul tirage),
// ici aucun rendu 3D par résultat : jusqu'à 100 tirages d'un coup rendrait
// autant de canvas Three.js simultanés, bien au-delà de ce qui est
// raisonnable (cf. limite de contexte WebGL documentée pour la grille de
// Collection, pensée pour 12 tuiles maximum) — une liste plate suffit,
// l'essentiel ici est le récapitulatif, pas la mise en scène.
import { computed } from 'vue';
import { RARITIES, RARITY_COLORS, RARITY_LABELS } from '../../data/rarity.js';

const props = defineProps({
  results: { type: Array, required: true }, // [{ def, duplicate }]
  boosterNom: { type: String, default: 'Booster' },
  totalCost: { type: Number, default: 0 },
});
const emit = defineEmits(['close']);

const countByRarity = computed(() => {
  const counts = Object.fromEntries(RARITIES.map((r) => [r, 0]));
  for (const r of props.results) counts[r.def.rarete] += 1;
  return counts;
});
const highlights = computed(() => props.results.filter((r) => r.def.rarete === 'legendaire' || r.def.rarete === 'mythique'));
const sorted = computed(() => [...props.results].sort((a, b) => RARITIES.indexOf(b.def.rarete) - RARITIES.indexOf(a.def.rarete)));
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
    <div class="panel flex max-h-[85vh] w-full max-w-md flex-col p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="font-display text-lg font-bold">{{ boosterNom }} ×{{ results.length }}</h2>
        <span class="tabular text-sm text-ink-soft">-{{ totalCost }} Or</span>
      </div>

      <div v-if="highlights.length" class="mb-3 space-y-1.5 rounded-sm bg-surface-soft p-3">
        <p class="section-label">Meilleurs tirages</p>
        <div v-for="(r, i) in highlights" :key="i" class="flex items-center justify-between text-sm">
          <span class="font-semibold">{{ r.def.nom }}</span>
          <span class="stamp straight" :style="{ color: RARITY_COLORS[r.def.rarete] }">{{ RARITY_LABELS[r.def.rarete] }}</span>
        </div>
      </div>

      <div class="mb-3 flex flex-wrap gap-1.5">
        <span
          v-for="r in RARITIES"
          v-show="countByRarity[r] > 0"
          :key="r"
          class="pill-soft"
          :style="{ color: RARITY_COLORS[r], backgroundColor: `color-mix(in srgb, ${RARITY_COLORS[r]} 16%, transparent)` }"
        >
          {{ RARITY_LABELS[r] }} ×{{ countByRarity[r] }}
        </span>
      </div>

      <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
        <div v-for="(r, i) in sorted" :key="i" class="flex items-center justify-between rounded-sm bg-surface-soft px-2.5 py-1.5 text-sm">
          <span class="flex min-w-0 items-center gap-2">
            <span class="h-2 w-2 shrink-0 rounded-full" :style="{ backgroundColor: RARITY_COLORS[r.def.rarete] }" />
            <span class="truncate">{{ r.def.nom }}</span>
          </span>
          <span class="tabular shrink-0 text-xs text-ink-faint">{{ r.duplicate ? 'doublon' : 'nouveau' }}</span>
        </div>
      </div>

      <button type="button" class="btn-primary mt-4 w-full shrink-0" @click="emit('close')">Continuer</button>
    </div>
  </div>
</template>
