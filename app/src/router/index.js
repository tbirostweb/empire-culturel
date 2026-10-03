import { createRouter, createWebHashHistory } from 'vue-router';
import FarmView from '../views/FarmView.vue';
import CollectionView from '../views/CollectionView.vue';
import BoosterView from '../views/BoosterView.vue';
import ExpeditionsView from '../views/ExpeditionsView.vue';
import TreesView from '../views/TreesView.vue';
import RankingsView from '../views/RankingsView.vue';
import ProfileView from '../views/ProfileView.vue';

// Historique hash : app 100% client-only (pas de backend, pas d'auth), donc
// pas de guard de navigation.
const routes = [
  { path: '/', name: 'farm', component: FarmView },
  { path: '/collection', name: 'collection', component: CollectionView },
  { path: '/boutique', name: 'boosters', component: BoosterView },
  { path: '/terrain', name: 'expeditions', component: ExpeditionsView },
  { path: '/arbre', name: 'trees', component: TreesView },
  { path: '/classement', name: 'rankings', component: RankingsView },
  { path: '/profil', name: 'profile', component: ProfileView },
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
