<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

defineProps({
  title: { type: String, default: '' },
});
const emit = defineEmits(['close']);

// Dialogue accessible : rôle + aria-modal, nom accessible, Échap pour fermer,
// focus déplacé dans le dialogue à l'ouverture, piégé (Tab / Maj+Tab) et
// rendu à l'élément déclencheur à la fermeture.
const dialog = ref(null);
const uid = `modal-${Math.random().toString(36).slice(2, 8)}`;
let previouslyFocused = null;

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

function onKeydown(e) {
  if (e.key === 'Escape') {
    e.stopPropagation();
    emit('close');
    return;
  }
  if (e.key !== 'Tab' || !dialog.value) return;
  const items = [...dialog.value.querySelectorAll(FOCUSABLE)];
  if (items.length === 0) {
    e.preventDefault();
    dialog.value.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (e.shiftKey && (active === first || active === dialog.value)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && active === last) {
    e.preventDefault();
    first.focus();
  }
}

onMounted(async () => {
  previouslyFocused = document.activeElement;
  document.addEventListener('keydown', onKeydown);
  await nextTick();
  const first = dialog.value?.querySelector(FOCUSABLE);
  (first ?? dialog.value)?.focus();
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  if (previouslyFocused && typeof previouslyFocused.focus === 'function') previouslyFocused.focus();
});
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-center justify-center bg-black/60 p-4" @click.self="emit('close')">
    <div
      ref="dialog"
      class="panel fade-in-up w-full max-w-sm p-5"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="title ? uid : undefined"
      :aria-label="title ? undefined : 'Fenêtre de dialogue'"
      tabindex="-1"
    >
      <div class="mb-3 flex items-center justify-between">
        <h2 v-if="title" :id="uid" class="text-lg font-semibold">{{ title }}</h2>
        <button
          type="button"
          class="rounded-lg p-1 text-ink-soft hover:bg-surface-soft"
          aria-label="Fermer"
          @click="emit('close')"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-5 w-5" aria-hidden="true">
            <path d="M5 5 19 19M19 5 5 19" />
          </svg>
        </button>
      </div>
      <slot />
    </div>
  </div>
</template>
