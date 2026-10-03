<script setup>
import { computed } from 'vue';
import { RARITY_COLORS, RARITY_ICONS, RARITY_LABELS } from '../../data/rarity.js';
import { REGION_LABELS, REGION_ICONS, EPOQUE_LABELS, EPOQUE_ICONS } from '../../data/monuments.js';
import { FUSION, AMELIORATION } from '../../data/economy.js';
import { monumentEffectiveRevenue } from '../../engine/farm.js';
import { useCollectionStore } from '../../stores/collection.js';
import { useFarmStore } from '../../stores/farm.js';
import { useTreesStore } from '../../stores/trees.js';
import { usePrestigeStore } from '../../stores/prestige.js';
import { usePlayerStore } from '../../stores/player.js';
import MonumentModel from './MonumentModel.vue';
import AppIcon from '../icons/AppIcon.vue';

const props = defineProps({
  def: { type: Object, required: true },
  hasPrev: { type: Boolean, default: false },
  hasNext: { type: Boolean, default: false },
});
defineEmits(['prev', 'next']);

const collection = useCollectionStore();
const farm = useFarmStore();
const trees = useTreesStore();
const prestige = usePrestigeStore();
const player = usePlayerStore();

const entry = computed(() => collection.ownedEntry(props.def.id));
const revenue = computed(() =>
  entry.value ? monumentEffectiveRevenue(entry.value, props.def, trees.treeBonuses, prestige.bonusPct) : null,
);
const canFuseThis = computed(() => collection.canFuse(props.def.id));
const isPlaced = computed(() => farm.isPlaced(props.def.id));

// Améliorations par monument (puits d'Or dédié).
const ameLevel = computed(() => entry.value?.ameliorations ?? 0);
const ameMaxed = computed(() => ameLevel.value >= AMELIORATION.maxLevel);
const ameCost = computed(() => collection.ameliorationCost(props.def.id));
const amePctNow = computed(() => Math.round(ameLevel.value * AMELIORATION.revenueMultPerLevel * 100));
const canAfford = computed(() => ameCost.value != null && player.resources.or >= ameCost.value);

function toggleFarm() {
  if (isPlaced.value) farm.retirer(props.def.id);
  else farm.placer(props.def.id);
}
function fusionner() {
  collection.fusionner(props.def.id);
}
function ameliorer() {
  collection.ameliorer(props.def.id);
}
</script>

<template>
  <div class="space-y-4">
    <!-- `aspect-auto` neutralise le `aspect-[3/4]` de `.card-photo` (pensé pour
         les tuiles de la grille) : ici l'illustration est une bannière large en
         haut de la modale, dont la hauteur est fixée par `h-40`. Sans ça le
         ratio l'emportait et la bannière se réduisait à une vignette 120x160
         collée à gauche, avec le nom du monument tronqué à côté. -->
    <div class="card-photo aspect-auto -mx-5 -mt-5 h-40 w-auto rounded-none border-x-0 border-t-0" :class="{ locked: !entry }">
      <MonumentModel :def="def" />
      <!-- Flèches pour passer au monument précédent/suivant sans refermer la
           modale, dans l'ordre AFFICHÉ par la grille (donc le tri courant). -->
      <button
        type="button"
        class="detail-arrow left-2"
        :disabled="!hasPrev"
        aria-label="Monument précédent"
        @click="$emit('prev')"
      >
        <AppIcon name="chevron-left" class="h-4 w-4" />
      </button>
      <button
        type="button"
        class="detail-arrow right-2"
        :disabled="!hasNext"
        aria-label="Monument suivant"
        @click="$emit('next')"
      >
        <AppIcon name="chevron-right" class="h-4 w-4" />
      </button>
    </div>

    <!-- Titre et rareté SOUS l'illustration, sur le papier : le voile sombre
         qui permettait d'écrire en blanc par-dessus la photo a été retiré avec
         la refonte "carnet de voyage", donc plus rien ne se pose sur l'image. -->
    <div class="flex items-start justify-between gap-3">
      <div class="min-w-0">
        <h3 class="truncate font-display text-xl font-bold">{{ def.nom }}</h3>
        <p class="typewriter mt-0.5 flex items-center gap-1 text-xs uppercase tracking-wider text-ink-faint">
          <AppIcon name="pin" class="h-3 w-3 shrink-0" />
          {{ def.pays }}
        </p>
      </div>
      <span class="stamp shrink-0" :style="{ color: RARITY_COLORS[def.rarete] }">
        <AppIcon :name="RARITY_ICONS[def.rarete]" class="mr-1 h-3 w-3 shrink-0" weight="fill" />
        {{ RARITY_LABELS[def.rarete] }}
      </span>
    </div>

    <div class="flex flex-wrap items-center gap-2">
      <span class="pill-soft gap-1.5">
        <AppIcon :name="REGION_ICONS[def.region]" class="h-3.5 w-3.5" />
        {{ REGION_LABELS[def.region] }}
      </span>
      <span class="pill-soft gap-1.5">
        <AppIcon :name="EPOQUE_ICONS[def.epoque]" class="h-3.5 w-3.5" />
        {{ EPOQUE_LABELS[def.epoque] }}
      </span>
    </div>

    <div v-if="entry" class="grid grid-cols-3 gap-2 text-center">
      <div class="panel p-2">
        <AppIcon name="coin" class="mx-auto h-4 w-4 text-ink-soft" />
        <div class="tabular text-sm font-semibold">{{ Math.round(revenue * 10) / 10 }}/s</div>
        <div class="text-xs text-ink-faint">Revenu</div>
      </div>
      <div class="panel p-2">
        <AppIcon name="gem" class="mx-auto h-4 w-4 text-ink-soft" />
        <div class="tabular text-sm font-semibold">{{ def.valeurCollection }}</div>
        <div class="text-xs text-ink-faint">Valeur</div>
      </div>
      <div class="panel p-2">
        <AppIcon name="sparkles" class="mx-auto h-4 w-4 text-ink-soft" />
        <div class="tabular text-sm font-semibold">{{ entry.niveau }}/{{ FUSION.maxLevel }}</div>
        <div class="text-xs text-ink-faint">Niveau</div>
      </div>
    </div>
    <div v-else class="panel p-3 text-center text-sm text-ink-soft">Monument non obtenu — ouvre un booster pour le débloquer.</div>

    <div v-if="entry" class="space-y-2">
      <p class="tabular text-xs text-ink-soft">Doublons : {{ entry.doublons }}/{{ FUSION.requiredCount }} requis pour fusionner</p>
      <button type="button" class="btn-ghost w-full" :disabled="!canFuseThis" @click="fusionner">
        {{ entry.niveau >= FUSION.maxLevel ? 'Niveau maximum atteint' : `Fusionner (Niveau ${entry.niveau + 1})` }}
      </button>

      <!-- Amélioration : puits d'Or propre au monument, distinct de la fusion
           (qui consomme des doublons). Le revenu affiché plus haut inclut déjà
           l'effet, donc il monte à vue d'oeil quand on améliore. -->
      <div class="panel space-y-2 p-3">
        <div class="flex items-center justify-between">
          <span class="section-label">Amélioration</span>
          <span class="tabular text-xs font-bold" :class="amePctNow > 0 ? 'text-succes' : 'text-ink-faint'">
            Niv {{ ameLevel }}/{{ AMELIORATION.maxLevel }} · +{{ amePctNow }}%
          </span>
        </div>
        <div class="progress-track light">
          <div class="h-full bg-accent transition-all" :style="{ width: `${(ameLevel / AMELIORATION.maxLevel) * 100}%` }" />
        </div>
        <button
          type="button"
          class="btn-ghost w-full text-sm"
          :disabled="ameMaxed || !canAfford"
          @click="ameliorer"
        >
          <template v-if="ameMaxed">Amélioration maximale</template>
          <template v-else>
            <AppIcon name="arrow-up" class="mr-1 inline h-3.5 w-3.5" />Améliorer — {{ ameCost }} Or
          </template>
        </button>
      </div>

      <button type="button" class="btn-primary w-full" @click="toggleFarm">
        {{ isPlaced ? 'Retirer de la Farm' : 'Placer en Farm' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.detail-arrow {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  height: 2rem;
  width: 2rem;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  border: 1px solid var(--color-liseret);
  background: color-mix(in srgb, var(--color-surface) 90%, transparent);
  color: var(--color-ink);
  transition: transform 0.12s ease;
}
.detail-arrow:active:not(:disabled) {
  transform: translateY(-50%) scale(0.9);
}
.detail-arrow:disabled {
  opacity: 0.3;
}
</style>
