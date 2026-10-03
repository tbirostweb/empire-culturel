<script setup>
import { RouterLink } from 'vue-router';
import AppIcon from '../icons/AppIcon.vue';

const TABS = [
  { to: '/', name: 'farm', label: 'Farm', icon: 'farm' },
  { to: '/collection', name: 'collection', label: 'Collection', icon: 'collection' },
  { to: '/boutique', name: 'boosters', label: 'Boosters', icon: 'treasure' },
  { to: '/terrain', name: 'expeditions', label: 'Terrain', icon: 'expedition' },
  { to: '/arbre', name: 'trees', label: 'Techno', icon: 'tree' },
  { to: '/classement', name: 'rankings', label: 'Classement', icon: 'ranking' },
  { to: '/profil', name: 'profile', label: 'Profil', icon: 'profile' },
];
</script>

<template>
  <nav
    class="flex shrink-0 border-t bg-surface"
    style="border-color: var(--color-liseret); padding-bottom: env(safe-area-inset-bottom)"
  >
    <!-- Onglet actif : icône PLEINE + libellé en petites majuscules Courier
         souligné d'un trait d'encre, plutôt qu'une pastille de fond arrondie.
         L'opposition trait/plein se lit immédiatement et reste dans le
         registre "encre sur papier" de la direction carnet de voyage. -->
    <RouterLink
      v-for="tab in TABS"
      :key="tab.name"
      :to="tab.to"
      class="tab-link typewriter flex flex-1 flex-col items-center gap-0.5 py-2 text-[0.6rem] uppercase tracking-wider"
      :class="$route.name === tab.name ? 'font-bold text-accent' : 'text-ink-faint'"
    >
      <span class="flex h-7 w-11 items-center justify-center">
        <AppIcon :name="tab.icon" :weight="$route.name === tab.name ? 'fill' : 'regular'" class="h-5 w-5" />
      </span>
      <span class="tab-label" :class="$route.name === tab.name ? 'is-active' : ''">{{ tab.label }}</span>
    </RouterLink>
  </nav>
</template>

<style scoped>
.tab-label {
  border-bottom: 1.5px solid transparent;
  padding-bottom: 1px;
}
.tab-label.is-active {
  border-bottom-color: currentColor;
}
</style>
