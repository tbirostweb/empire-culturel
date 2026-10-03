<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import ResourceBlock from './components/ui/ResourceBlock.vue';
import TabBar from './components/nav/TabBar.vue';
import Modal from './components/ui/Modal.vue';
import MonumentModel from './components/monuments/MonumentModel.vue';
import { usePlayerStore } from './stores/player.js';
import { useFarmStore } from './stores/farm.js';
import { useMissionsStore } from './stores/missions.js';
import { useCollectionStore } from './stores/collection.js';
import { useMetaStore } from './stores/meta.js';
import { useRankingsStore } from './stores/rankings.js';
import { useEventsStore } from './stores/events.js';
import { useRivalriesStore } from './stores/rivalries.js';
import ProfileGate from './components/profiles/ProfileGate.vue';
import { activeProfile, activeProfileId, adoptLegacySaveIfAny } from './utils/profiles.js';
import { FARM } from './data/economy.js';

// Adoption AVANT toute lecture de profil : une partie commencée avant
// l'existence des profils doit être récupérée dans un profil nommé, sinon
// elle disparaîtrait derrière l'écran d'inscription alors qu'elle est
// toujours là, intacte, dans le localStorage.
adoptLegacySaveIfAny();
const hasProfile = ref(Boolean(activeProfileId()));

const player = usePlayerStore();
const farm = useFarmStore();
const missions = useMissionsStore();
const collection = useCollectionStore();
const meta = useMetaStore();
const rankings = useRankingsStore();
const events = useEventsStore();
const rivalries = useRivalriesStore();

// Un rechargement complet plutôt qu'une simple bascule de `hasProfile` : les
// stores Pinia se sont déjà hydratés depuis les anciennes clés au moment de
// leur création. Recharger est la seule façon simple de garantir qu'ils
// repartent tous de la sauvegarde du profil qu'on vient d'activer.
function onProfileReady() {
  window.location.reload();
}

const offlinePopup = ref(null);
const starterPopup = ref(null);

// Le ticker de revenu Farm vit ici (App.vue), pas dans FarmView.vue : il
// doit continuer à générer de l'Or quel que soit l'onglet actif, pas
// seulement quand le joueur regarde la Farm — Vue démonte FarmView (et
// son intervalle) dès qu'on change d'onglet, App.vue reste monté tant
// que l'app est ouverte.
let ticker = null;
onMounted(() => {
  // Aucun profil actif : l'écran d'inscription est affiché, la boucle de jeu
  // ne doit pas tourner (ni créditer d'Or, ni ouvrir une saison de
  // classement sur une sauvegarde qui n'appartient à personne).
  if (!hasProfile.value) return;
  // Cadeau de bienvenue avant tout le reste : il alimente la Farm dès la
  // première seconde, donc avant que `collecterHorsLigne` et le ticker
  // calculent quoi que ce soit.
  const starter = collection.accorderMonumentDeDepart();
  if (starter) {
    farm.placer(starter.id);
    starterPopup.value = starter;
  }
  // Le nom choisi à l'inscription devient le pseudo affiché (classement,
  // Profil). Hors du bloc `starter` pour rattraper aussi les profils créés
  // avant ce correctif ; on ne touche au pseudo que s'il est resté la valeur
  // par défaut, jamais s'il a été personnalisé depuis le Profil.
  const p = activeProfile();
  if (p?.nom && player.pseudo === 'Collectionneur') player.setPseudo(p.nom);
  missions.refreshIfNeeded();
  // Avant le rattrapage hors-ligne : si la saison a changé pendant l'absence,
  // il faut clôturer l'ancienne (et figer le rang final) AVANT de créditer
  // l'or gagné hors-ligne, qui appartient déjà à la nouvelle saison.
  rankings.syncSeason();
  const result = farm.collecterHorsLigne();
  if (result.or > 0) offlinePopup.value = result;
  // APRÈS le rattrapage hors-ligne : l'Or gagné pendant l'absence doit
  // compter dans le duel de la semaine qu'il clôture (et non être perdu),
  // avant que le nouveau duel ne snapshot le total.
  rivalries.syncDuel();

  ticker = setInterval(() => {
    // Rafraîchi à chaque tick (négligeable) pour que l'événement de la
    // semaine et son compte à rebours restent justes dans une PWA laissée
    // ouverte plusieurs jours ; indépendant du revenu Farm.
    events.tick();
    if (farm.ratePerSecond <= 0) return;
    const amount = farm.ratePerSecond * (FARM.tickIntervalMs / 1000);
    player.credit('or', amount);
    missions.trackEvent('goldEarned', amount);
    meta.touchLastSeen();
  }, FARM.tickIntervalMs);
});
onBeforeUnmount(() => {
  if (ticker) clearInterval(ticker);
});

function dismissOffline() {
  offlinePopup.value = null;
}
</script>

<template>
  <ProfileGate v-if="!hasProfile" @ready="onProfileReady" />

  <div v-else class="app-shell flex h-dvh flex-col overflow-hidden text-ink">
    <header
      class="flex shrink-0 items-center gap-2 overflow-x-auto border-b bg-surface px-3 py-2"
      style="border-color: var(--color-liseret); padding-top: calc(env(safe-area-inset-top) + 0.5rem)"
    >
      <span class="mr-1 shrink-0 text-sm font-bold">Empire Culturel</span>
      <ResourceBlock icon="coin" label="Or" :value="player.resources.or" compact />
      <ResourceBlock icon="gem" label="Cristaux" :value="player.resources.cristaux" compact />
      <ResourceBlock icon="sparkles" label="Techno" :value="player.resources.pointsTech" compact />
    </header>

    <div class="flex-1 overflow-y-auto">
      <router-view v-slot="{ Component }">
        <transition name="tab-switch" mode="out-in" :duration="150">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>

    <TabBar />

    <Modal v-if="starterPopup" title="Bienvenue !" @close="starterPopup = null">
      <p class="text-sm text-ink-soft">
        Voici ton premier monument, déjà installé en Farm : il produit de l'Or en continu,
        même quand l'application est fermée.
      </p>
      <div class="my-3 flex items-center gap-3">
        <div class="card-photo h-24 w-20 shrink-0">
          <MonumentModel :def="starterPopup" />
        </div>
        <div class="min-w-0">
          <p class="font-display text-lg font-bold">{{ starterPopup.nom }}</p>
          <p class="typewriter text-xs uppercase tracking-wider text-ink-faint">{{ starterPopup.pays }}</p>
          <p class="tabular mt-1 text-sm font-bold text-succes">+{{ starterPopup.revenuBase }} Or/s</p>
        </div>
      </div>
      <p class="typewriter text-xs text-ink-faint">
        Ouvre des boosters pour agrandir ta collection, puis place tes meilleurs monuments en Farm.
      </p>
      <button type="button" class="btn-primary mt-4 w-full" @click="starterPopup = null">C'est parti</button>
    </Modal>

    <Modal v-if="offlinePopup" title="Pendant ton absence" @close="dismissOffline">
      <p class="text-sm">
        Ta Farm a généré
        <span class="tabular font-bold text-or">+{{ offlinePopup.or }} Or</span>
        <span class="tabular text-ink-soft"> ({{ (offlinePopup.seconds / 3600).toFixed(1) }} h)</span>
      </p>
      <button type="button" class="btn-primary mt-4 w-full" @click="dismissOffline">Récupérer</button>
    </Modal>
  </div>
</template>
