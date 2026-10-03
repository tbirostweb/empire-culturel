<script setup>
// Onglet "Terrain" — envoi de monuments en expédition. Un `now` local
// rafraîchi chaque seconde fait avancer les comptes à rebours (les getters du
// store recalculent à la volée mais Vue a besoin d'une dépendance réactive
// pour re-rendre).
import { computed, onMounted, onBeforeUnmount, ref } from 'vue';
import { EXPEDITIONS } from '../data/expeditions.js';
import { expeditionPreviews } from '../engine/expeditions.js';
import { RARITY_COLORS, RARITY_ICONS, RARITY_LABELS } from '../data/rarity.js';
import { useExpeditionsStore } from '../stores/expeditions.js';
import MonumentModel from '../components/monuments/MonumentModel.vue';
import Modal from '../components/ui/Modal.vue';
import Toast from '../components/ui/Toast.vue';
import AppIcon from '../components/icons/AppIcon.vue';

const expeditions = useExpeditionsStore();

const now = ref(Date.now());
let ticker = null;
onMounted(() => {
  ticker = setInterval(() => (now.value = Date.now()), 1000);
});
onBeforeUnmount(() => ticker && clearInterval(ticker));

// `now.value` référencé pour rendre le calcul réactif (dépend du tick).
const slots = computed(() => {
  const _ = now.value;
  const ongoing = expeditions.ongoing;
  const filled = ongoing.map((o) => ({ type: 'active', ...o }));
  const empties = Array.from({ length: Math.max(0, expeditions.slotCount - ongoing.length) }, () => ({ type: 'empty' }));
  return [...filled, ...empties];
});

function fmtDuration(ms) {
  const s = Math.ceil(ms / 1000);
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${String(Math.floor((s % 3600) / 60)).padStart(2, '0')}m`;
  if (s >= 60) return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`;
  return `${s}s`;
}

const toast = ref(null);
function notify(message, tone = 'success') {
  toast.value = { message, tone };
  setTimeout(() => (toast.value = null), 2600);
}

function reclamer(monumentId) {
  const r = expeditions.reclamer(monumentId);
  if (!r) return;
  const parts = [`+${r.reward.or} Or`];
  if (r.reward.pointsTech) parts.push(`+${r.reward.pointsTech} Techno`);
  if (r.reward.cristaux) parts.push(`+${r.reward.cristaux} Cristaux`);
  notify(`${r.def.nom} de retour : ${parts.join(', ')}`);
}

// --- Lancement ---
const launchFor = ref(null); // slot vide cliqué -> ouvre le choix de monument
const picked = ref(null); // monument choisi -> montre les expéditions
const previews = computed(() =>
  picked.value ? expeditionPreviews(picked.value.def.rarete, picked.value.entry.niveau) : [],
);

function openLaunch() {
  picked.value = null;
  launchFor.value = true;
}
function lancer(expeditionId) {
  if (!picked.value) return;
  const ok = expeditions.lancer(picked.value.id, expeditionId);
  if (ok) {
    notify(`${picked.value.def.nom} part en ${EXPEDITIONS[expeditionId].nom.toLowerCase()}.`);
    launchFor.value = null;
    picked.value = null;
  }
}
</script>

<template>
  <div class="space-y-4 p-4 pb-6">
    <h1 class="text-xl font-bold">Terrain</h1>
    <p class="text-sm text-ink-soft">
      Envoie un monument en expédition. Il revient avec de l'Or, des Points techno et des Cristaux —
      des ressources que la Farm ne donne pas. Un monument en Farm ne peut pas partir en même temps.
    </p>

    <section class="space-y-2">
      <h2 class="section-label">Expéditions — {{ expeditions.ongoing.length }}/{{ expeditions.slotCount }}</h2>
      <div class="space-y-2">
        <div v-for="(slot, i) in slots" :key="i">
          <!-- Emplacement occupé -->
          <div v-if="slot.type === 'active'" class="panel flex items-center gap-3 p-2.5">
            <div class="card-photo h-16 w-14 shrink-0">
              <MonumentModel :def="slot.def" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate font-display text-sm font-bold uppercase">{{ slot.def.nom }}</p>
              <p class="typewriter flex items-center gap-1 text-[0.6rem] uppercase tracking-wider" :style="{ color: '#9fb6d4' }">
                <AppIcon :name="slot.exp.icon" class="h-3 w-3" />{{ slot.exp.nom }}
              </p>
              <p v-if="!slot.done" class="tabular mt-0.5 flex items-center gap-1 text-xs text-encre">
                <AppIcon name="hourglass" class="h-3 w-3" />{{ fmtDuration(slot.remainingMs) }}
              </p>
              <p v-else class="tabular mt-0.5 flex items-center gap-1 text-xs font-bold text-succes">
                <AppIcon name="check" class="h-3 w-3" weight="bold" />De retour
              </p>
            </div>
            <button v-if="slot.done" type="button" class="btn-primary shrink-0 px-4 py-2 text-xs" @click="reclamer(slot.monumentId)">
              Récupérer
            </button>
            <button v-else type="button" class="btn-ghost shrink-0 px-3 py-2 text-[0.65rem]" @click="expeditions.rappeler(slot.monumentId)">
              Rappeler
            </button>
          </div>

          <!-- Emplacement libre -->
          <button
            v-else
            type="button"
            class="panel flex w-full items-center justify-center gap-2 p-4 text-ink-faint"
            @click="openLaunch"
          >
            <AppIcon name="plus" class="h-5 w-5" />
            <span class="typewriter text-xs uppercase tracking-wider">Envoyer un monument</span>
          </button>
        </div>
      </div>
    </section>

    <!-- Choix du monument -->
    <Modal v-if="launchFor && !picked" title="Choisir un monument" @close="launchFor = null">
      <div v-if="expeditions.available.length === 0" class="py-6 text-center text-sm text-ink-soft">
        Aucun monument disponible. Ceux placés en Farm ou déjà en expédition ne peuvent pas partir.
      </div>
      <div v-else class="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">
        <button v-for="m in expeditions.available" :key="m.id" type="button" class="text-left" @click="picked = m">
          <div class="card-photo aspect-square">
            <MonumentModel :def="m.def" />
          </div>
          <p class="typewriter mt-1 truncate text-[0.6rem] uppercase" :style="{ color: RARITY_COLORS[m.def.rarete] }">
            {{ RARITY_LABELS[m.def.rarete] }}
          </p>
          <p class="truncate text-xs font-bold">{{ m.def.nom }}</p>
        </button>
      </div>
    </Modal>

    <!-- Choix de l'expédition pour le monument -->
    <Modal v-if="picked" :title="picked.def.nom" @close="picked = null">
      <p class="typewriter mb-3 flex items-center gap-1 text-xs uppercase tracking-wider" :style="{ color: RARITY_COLORS[picked.def.rarete] }">
        <AppIcon :name="RARITY_ICONS[picked.def.rarete]" class="h-3.5 w-3.5" weight="fill" />
        {{ RARITY_LABELS[picked.def.rarete] }} · Niv. {{ picked.entry.niveau }}
      </p>
      <div class="space-y-2">
        <button
          v-for="exp in previews"
          :key="exp.id"
          type="button"
          class="panel flex w-full items-center gap-3 p-3 text-left"
          @click="lancer(exp.id)"
        >
          <span class="icon-chip" style="--chip-tint: var(--color-accent)">
            <AppIcon :name="exp.icon" class="h-5 w-5" />
          </span>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-bold">{{ exp.nom }}</p>
            <p class="tabular flex flex-wrap items-center gap-x-2 text-[0.65rem] text-ink-soft">
              <span class="flex items-center gap-0.5"><AppIcon name="coin" class="h-3 w-3 text-or" />{{ exp.gains.or }}</span>
              <span v-if="exp.gains.pointsTech" class="flex items-center gap-0.5"><AppIcon name="sparkles" class="h-3 w-3" />{{ exp.gains.pointsTech }}</span>
              <span v-if="exp.gains.cristaux" class="flex items-center gap-0.5"><AppIcon name="gem" class="h-3 w-3" />{{ exp.gains.cristaux }}</span>
            </p>
          </div>
          <span class="typewriter shrink-0 text-[0.65rem] uppercase tracking-wider text-encre">
            {{ fmtDuration(exp.durationMs) }}
          </span>
        </button>
      </div>
    </Modal>

    <Toast v-if="toast" :message="toast.message" :tone="toast.tone" />
  </div>
</template>
