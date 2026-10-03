<script setup>
defineProps({
  message: { type: String, required: true },
  tone: { type: String, default: 'default' }, // default | success | danger
});
</script>

<template>
  <div
    class="fade-in-up panel fixed bottom-20 left-1/2 z-50 -translate-x-1/2 px-4 py-2.5 text-sm font-medium shadow-sm"
    :class="{
      'text-succes': tone === 'success',
      'text-danger': tone === 'danger',
    }"
  >
    {{ message }}
  </div>
</template>
