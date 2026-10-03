<script setup>
import MonumentTile from './MonumentTile.vue';

defineProps({
  monuments: { type: Array, required: true }, // [{ def, entry }]
});
const emit = defineEmits(['select']);
</script>

<template>
  <div class="grid grid-cols-3 gap-2 sm:grid-cols-4">
    <MonumentTile v-for="item in monuments" :key="item.def.id" :def="item.def" :entry="item.entry" @click="emit('select', item.def.id)" />
  </div>
</template>
