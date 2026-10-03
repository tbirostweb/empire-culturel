<script setup>
const props = defineProps({
  value: { type: Number, required: true },
  max: { type: Number, required: true },
  color: { type: String, default: 'var(--color-succes)' },
  height: { type: String, default: '0.5rem' },
});

function pct() {
  if (props.max <= 0) return 0;
  return Math.max(0, Math.min(100, (props.value / props.max) * 100));
}
</script>

<template>
  <div class="w-full overflow-hidden rounded-full bg-surface-soft" :style="{ height }">
    <div class="h-full rounded-full transition-all" :style="{ width: `${pct()}%`, backgroundColor: color }" />
  </div>
</template>
