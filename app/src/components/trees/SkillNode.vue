<script setup>
import { computed } from 'vue';
import { effectIcon } from '../../data/trees.js';
import AppIcon from '../icons/AppIcon.vue';

const props = defineProps({
  node: { type: Object, required: true },
  rank: { type: Number, required: true },
  cost: { type: Number, default: null }, // null = rang max atteint
  locked: { type: Boolean, default: false }, // parent pas encore acheté
});
defineEmits(['select']);

// `computed` et non une constante évaluée une fois au setup : le rang change
// au fil des achats, et l'ancienne version figeait l'état "maxé" à la valeur
// qu'il avait au premier rendu.
const maxed = computed(() => props.cost === null && props.rank > 0);
</script>

<template>
  <button type="button" class="skill-node" :class="{ 'is-locked': locked }" @click="$emit('select')">
    <span
      class="skill-node-badge"
      :class="[rank > 0 ? 'is-owned' : '', maxed ? 'is-maxed' : '']"
    >
      <AppIcon v-if="locked" name="lock" class="h-5 w-5" />
      <template v-else>
        <!-- Le picto dit CE QUE FAIT le noeud, le rang dit où on en est :
             avant, tous les noeuds étaient un rond avec deux chiffres. -->
        <AppIcon :name="effectIcon(node.effect)" class="h-5 w-5" :weight="maxed ? 'fill' : 'regular'" />
        <span class="tabular skill-node-rank">{{ rank }}/{{ node.maxRank }}</span>
      </template>
    </span>
    <div class="flex gap-0.5">
      <span
        v-for="i in node.maxRank"
        :key="i"
        class="h-1.5 w-1.5 rounded-full"
        :style="{ backgroundColor: i <= rank ? 'var(--color-accent)' : 'var(--color-liseret)' }"
      />
    </div>
    <p class="text-xs font-semibold leading-tight">{{ node.nom }}</p>
    <p class="tabular flex items-center justify-center gap-0.5 text-[0.65rem]" :class="cost !== null && !locked ? 'text-accent' : 'text-ink-faint'">
      <AppIcon v-if="cost !== null && !locked" name="sparkles" class="h-2.5 w-2.5" />
      {{ locked ? 'Verrouillé' : cost === null ? 'Max' : `${cost}` }}
    </p>
  </button>
</template>

<style scoped>
.skill-node {
  position: relative;
  z-index: 1; /* au-dessus du SVG de liaisons */
  display: flex;
  width: 5.5rem;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  text-align: center;
}
.skill-node.is-locked {
  opacity: 0.55;
}
.skill-node-badge {
  display: flex;
  height: 3.5rem;
  width: 3.5rem;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.1rem;
  border-radius: 3px;
  border: 2px solid var(--color-liseret);
  background: var(--color-surface);
  color: var(--color-ink);
  font-weight: 700;
  transition: all 0.15s ease;
}
.skill-node-rank {
  font-size: 0.65rem;
  line-height: 1;
}
.skill-node-badge.is-owned {
  border-color: var(--color-accent);
  background: var(--color-accent);
  color: #fff;
}
.skill-node-badge.is-maxed {
  border-color: var(--color-legendaire);
  background: var(--color-legendaire);
  color: #fff;
}
.skill-node:active .skill-node-badge {
  transform: scale(0.92);
}
</style>
