<script setup>
import { computed } from 'vue';
import AppIcon from '../icons/AppIcon.vue';
import AnimatedNumber from './AnimatedNumber.vue';

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  value: { type: Number, required: true },
  compact: { type: Boolean, default: false },
});

// Chaque ressource a sa propre teinte de chip plutôt qu'une icône grise
// uniforme — repère visuel immédiat pour distinguer les 2 ressources
// (Or/Éclats) d'un coup d'œil.
// Teintes LUMINEUSES pour le thème sombre (l'icône est un trait clair sur un
// chip translucide, elle doit ressortir sur le bleu de plan).
const TINTS = {
  coin: '#E8B44A',
  gem: '#35D6C4',
  sparkles: '#C997ED',
};

const tint = computed(() => TINTS[props.icon] ?? 'var(--color-accent)');
</script>

<template>
  <div class="panel flex items-center gap-2" :class="compact ? 'px-2 py-1.5' : 'px-3.5 py-3'">
    <span class="icon-chip" :class="compact ? 'h-7 w-7' : ''" :style="{ '--chip-tint': tint }">
      <AppIcon :name="icon" :class="compact ? 'h-4 w-4' : 'h-5 w-5'" />
    </span>
    <div class="flex min-w-0 flex-col">
      <span v-if="!compact" class="text-xs text-ink-soft">{{ label }}</span>
      <span class="tabular truncate text-sm font-bold"><AnimatedNumber :value="props.value" /></span>
    </div>
  </div>
</template>
