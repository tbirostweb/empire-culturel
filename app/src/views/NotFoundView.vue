<script setup>
import { RouterLink } from 'vue-router';
</script>

<template>
  <div class="space-y-4 p-4 pb-6 text-center">
    <h1 class="text-xl font-bold">Page introuvable</h1>
    <p class="text-sm text-ink-soft">Cette page n'existe pas dans Empire Culturel.</p>
    <RouterLink to="/" class="btn-primary inline-block px-4 py-2">Retour à l'accueil</RouterLink>
  </div>
</template>
