<script setup>
// Compteur animé (LOT 3) : la valeur affichée rattrape `value` en douceur
// plutôt que de sauter directement au nouveau nombre — utilisé pour l'Or/
// Éclats du header, où chaque gain doit se voir défiler.
import { onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps({
  value: { type: Number, required: true },
});

const displayed = ref(props.value);
let frame = null;

function formatValue(n) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(n));
}

watch(
  () => props.value,
  (next, prev) => {
    if (frame) cancelAnimationFrame(frame);
    const from = prev ?? next;
    const start = performance.now();
    const duration = 500;
    function tick(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) * (1 - t);
      displayed.value = from + (next - from) * eased;
      if (t < 1) frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  },
);

onBeforeUnmount(() => {
  if (frame) cancelAnimationFrame(frame);
});
</script>

<template>
  <span>{{ formatValue(displayed) }}</span>
</template>
