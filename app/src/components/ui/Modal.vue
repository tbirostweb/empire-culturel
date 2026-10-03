<script setup>
defineProps({
  title: { type: String, default: '' },
});
const emit = defineEmits(['close']);
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" @click.self="emit('close')">
    <div class="panel fade-in-up w-full max-w-sm p-5">
      <div class="mb-3 flex items-center justify-between">
        <h2 v-if="title" class="text-lg font-semibold">{{ title }}</h2>
        <button type="button" class="rounded-lg p-1 text-ink-soft hover:bg-surface-soft" @click="emit('close')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-5 w-5">
            <path d="M5 5 19 19M19 5 5 19" />
          </svg>
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>
