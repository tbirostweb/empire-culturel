<script setup>
import { computed, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { monumentDef, REGIONS, REGION_LABELS, REGION_ICONS } from '../data/monuments.js';
import { SLOT_SPEC } from '../data/economy.js';
import { monumentEffectiveRevenue, slotSpecBonusPct } from '../engine/farm.js';
import { usePlayerStore } from '../stores/player.js';
import { useFarmStore } from '../stores/farm.js';
import { useCollectionStore } from '../stores/collection.js';
import { useMetaStore } from '../stores/meta.js';
import { useTreesStore } from '../stores/trees.js';
import { usePrestigeStore } from '../stores/prestige.js';
import MonumentModel from '../components/monuments/MonumentModel.vue';
import Modal from '../components/ui/Modal.vue';
import Toast from '../components/ui/Toast.vue';
import AppIcon from '../components/icons/AppIcon.vue';

const player = usePlayerStore();
const farm = useFarmStore();
const collection = useCollectionStore();
const meta = useMetaStore();
const trees = useTreesStore();
const prestige = usePrestigeStore();

const xpPct = computed(() => Math.min(100, (player.xp / player.xpForNext) * 100));

// Emplacements à position stable : on lit `paddedSlots[i]`/`specs[i]` (indexés
// par emplacement) et non une liste compacte, pour que la spécialisation reste
// attachée au bon emplacement. Une cellule vide renvoie un objet avec `id:
// null` (et sa spécialisation éventuelle), pour pouvoir spécialiser un
// emplacement avant même d'y placer un monument.
const activeSlots = computed(() =>
  Array.from({ length: farm.slotCount }, (_, i) => {
    const spec = farm.specs[i] ?? null;
    const id = farm.paddedSlots[i];
    if (!id) return { index: i, id: null, spec };
    const def = monumentDef(id);
    const entry = collection.ownedEntry(id);
    const specPct = slotSpecBonusPct(spec, def);
    // Revenu réel du monument (spécialisation d'emplacement comprise), pas une
    // mention vague : le joueur doit pouvoir comparer ses emplacements d'un
    // coup d'oeil.
    const revenue = monumentEffectiveRevenue(entry, def, trees.treeBonuses, prestige.bonusPct, collection.bonusPctForMonument(def), specPct);
    return { index: i, id, def, entry, revenue, spec, matched: specPct > 0 };
  }),
);

const availableToPlace = computed(() =>
  Object.keys(collection.owned)
    .filter((id) => !farm.isPlaced(id))
    .map((id) => monumentDef(id)),
);

const ownsNothing = computed(() => Object.keys(collection.owned).length === 0);
const canAutoPlace = computed(() => availableToPlace.value.length > 0 || farm.placedCount < farm.slotCount);

const pickerOpen = ref(false);
function openPicker() {
  pickerOpen.value = true;
}
function place(defId) {
  farm.placer(defId);
  pickerOpen.value = false;
}
function remove(defId) {
  farm.retirer(defId);
}

// Spécialisation d'emplacement (puits de Points techno).
const specSlotIndex = ref(null);
function openSpecPicker(index) {
  specSlotIndex.value = index;
}
function setSpec(region) {
  const ok = farm.specialiser(specSlotIndex.value, region);
  if (!ok && region != null) notify('Pas assez de Points techno.', 'default');
  specSlotIndex.value = null;
}

const toast = ref(null);
function notify(message, tone = 'success') {
  toast.value = { message, tone };
  setTimeout(() => (toast.value = null), 2400);
}

function placerLesMeilleurs() {
  if (ownsNothing.value) {
    notify('Aucun monument en collection — ouvre un booster.', 'default');
    return;
  }
  const changed = farm.placerLesMeilleurs();
  notify(changed ? 'Meilleurs monuments placés en Farm.' : 'Tes meilleurs monuments sont déjà placés.', changed ? 'success' : 'default');
}
function claimStreak() {
  const result = meta.claimStreak();
  if (!result) return;
  notify(`Jour ${result.day} réclamé : +${result.reward.or} Or${result.reward.cristaux ? `, +${result.reward.cristaux} Cristaux` : ''}`);
}
</script>

<template>
  <div class="space-y-4 p-4 pb-6">
    <!-- Le revenu par seconde est LE chiffre du jeu : c'est lui qui monte
         quand on progresse, et celui qu'on compare d'une session à l'autre.
         Il était relégué dans une petite pastille en haut à droite pendant
         que "Niveau 4" occupait la ligne principale. Inversé : le débit passe
         en gros chiffre, le niveau redevient une méta-information. -->
    <div class="hero-card">
      <div class="relative flex items-baseline justify-between gap-2">
        <span class="section-label">{{ player.pseudo }}</span>
        <span class="typewriter text-[0.65rem] uppercase tracking-wider text-ink-faint">
          Niveau {{ player.niveauJoueur }}
        </span>
      </div>
      <div class="relative mt-1 flex items-baseline gap-1.5">
        <AppIcon name="coin" class="h-6 w-6 shrink-0 self-center text-or" />
        <span class="tabular font-display text-4xl font-bold leading-none">{{ farm.ratePerSecond.toFixed(1) }}</span>
        <span class="typewriter text-sm text-ink-soft">Or / s</span>
      </div>
      <p v-if="farm.placedCount === 0" class="typewriter mt-1.5 text-[0.7rem] text-danger">
        Aucun monument en Farm — tu ne gagnes rien.
      </p>
      <div class="relative mt-3 space-y-1">
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${xpPct}%` }" />
        </div>
        <p class="tabular text-right text-[0.7rem] text-ink-soft">{{ Math.round(player.xp) }} / {{ player.xpForNext }} XP</p>
      </div>
    </div>

    <section
      class="panel flex items-center gap-3 p-3"
      :style="meta.canClaimStreak ? { borderColor: 'var(--color-accent)', background: 'var(--color-accent-soft)' } : {}"
    >
      <span class="icon-chip" style="--chip-tint: #c08818">
        <AppIcon name="flame" class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold">Connexion quotidienne</p>
        <p class="tabular text-xs text-ink-soft">Jour {{ meta.pendingStreakDay }}/7</p>
      </div>
      <button type="button" class="btn-primary shrink-0 text-xs" :disabled="!meta.canClaimStreak" @click="claimStreak">
        {{ meta.canClaimStreak ? 'Réclamer' : 'Fait' }}
      </button>
    </section>

    <section class="space-y-2">
      <div class="flex items-center justify-between gap-2">
        <h2 class="section-label">Farm — {{ farm.placedCount }}/{{ farm.slotCount }} emplacements</h2>
        <button type="button" class="btn-ghost shrink-0 px-3 py-1.5 text-xs" :disabled="!canAutoPlace" @click="placerLesMeilleurs">
          Placer les meilleurs
        </button>
      </div>
      <div class="grid grid-cols-2 gap-2">
        <!-- Chaque cellule = tuile (position stable) + bouton de spécialisation
             SOUS la tuile (frère, pas imbriqué : deux <button> ne peuvent pas
             s'emboîter). -->
        <div v-for="slot in activeSlots" :key="slot.index" class="flex flex-col gap-1">
          <div class="panel relative aspect-square overflow-hidden">
            <button v-if="!slot.id" type="button" class="flex h-full w-full flex-col items-center justify-center gap-1 px-2 text-ink-faint" @click="openPicker">
              <AppIcon name="plus" class="h-6 w-6" />
              <span class="text-xs font-semibold">Ajouter</span>
              <span class="typewriter text-center text-[0.6rem] leading-tight">un monument<br />qui rapporte</span>
            </button>
            <button v-else type="button" class="relative h-full w-full text-left" @click="remove(slot.id)">
              <MonumentModel :def="slot.def" />
              <span class="farm-slot-level typewriter">Niv.&nbsp;{{ slot.entry.niveau }}</span>
              <div class="photo-caption">
                <p class="truncate font-display text-xs font-bold">{{ slot.def.nom }}</p>
                <p class="tabular flex items-center gap-1 text-[0.65rem] font-bold text-succes">
                  <AppIcon name="income" class="h-3 w-3 shrink-0" />
                  +{{ slot.revenue.toFixed(1) }}/s
                </p>
              </div>
            </button>
          </div>
          <!-- État de spécialisation : vert si un monument de la bonne région
               est effectivement posé là (bonus actif), bleu encre si la région
               est fixée mais inexploitée, discret sinon. -->
          <button
            type="button"
            class="farm-spec-btn typewriter"
            :class="slot.matched ? 'is-matched' : slot.spec ? 'is-set' : ''"
            @click="openSpecPicker(slot.index)"
          >
            <template v-if="slot.spec">
              <AppIcon :name="REGION_ICONS[slot.spec]" class="h-3 w-3 shrink-0" />
              {{ REGION_LABELS[slot.spec] }}<span v-if="slot.matched"> +{{ SLOT_SPEC.matchPct }}%</span>
            </template>
            <template v-else>
              <AppIcon name="target" class="h-3 w-3 shrink-0" />Spécialiser
            </template>
          </button>
        </div>
      </div>
      <p class="text-xs text-ink-faint">Plus de slots via l'arbre technologique (Gestion). Spécialise un emplacement pour +{{ SLOT_SPEC.matchPct }}% aux monuments de sa région.</p>
    </section>

    <Modal v-if="pickerOpen" title="Placer un monument" @close="pickerOpen = false">
      <!-- Deux états vides DISTINCTS. Avant, ne posséder aucun monument
           affichait quand même "Tous tes monuments possédés sont déjà
           placés" : un joueur qui débute voyait donc une modale
           quasi-vide au message absurde, et en concluait que le bouton
           "Ajouter" ne marchait pas (bug remonté tel quel). -->
      <div v-if="ownsNothing" class="space-y-3 py-4 text-center">
        <p class="text-sm text-ink-soft">Tu n'as encore aucun monument.</p>
        <p class="typewriter text-xs text-ink-faint">Ouvre un booster pour commencer ta collection.</p>
        <RouterLink to="/boutique" class="btn-primary inline-block" @click="pickerOpen = false">Aller aux boosters</RouterLink>
      </div>
      <div v-else-if="availableToPlace.length === 0" class="py-6 text-center text-sm text-ink-soft">
        Tous tes monuments possédés sont déjà placés.
      </div>
      <div v-else class="grid max-h-80 grid-cols-3 gap-2 overflow-y-auto">
        <button v-for="def in availableToPlace" :key="def.id" type="button" class="card-photo aspect-square" @click="place(def.id)">
          <MonumentModel :def="def" />
          <p class="photo-caption truncate font-display text-[0.6rem] font-bold">{{ def.nom }}</p>
        </button>
      </div>
    </Modal>

    <Modal v-if="specSlotIndex !== null" title="Spécialiser l'emplacement" @close="specSlotIndex = null">
      <p class="text-sm text-ink-soft">
        Un monument de la région choisie, posé dans cet emplacement, gagne
        <span class="font-semibold text-succes">+{{ SLOT_SPEC.matchPct }}%</span> de revenus.
        Coûte <span class="tabular font-semibold">{{ SLOT_SPEC.cost }}</span> Points techno (tu en as {{ player.resources.pointsTech }}).
      </p>
      <div class="mt-3 grid grid-cols-2 gap-2">
        <button
          v-for="r in REGIONS"
          :key="r"
          type="button"
          class="btn-ghost flex items-center justify-center gap-1.5 text-sm"
          :class="{ 'ring-1 ring-accent': farm.slotSpec(specSlotIndex) === r }"
          :disabled="farm.slotSpec(specSlotIndex) !== r && player.resources.pointsTech < SLOT_SPEC.cost"
          @click="setSpec(r)"
        >
          <AppIcon :name="REGION_ICONS[r]" class="h-4 w-4" />
          {{ REGION_LABELS[r] }}
        </button>
      </div>
      <button
        v-if="farm.slotSpec(specSlotIndex)"
        type="button"
        class="btn-ghost mt-2 w-full text-xs text-ink-soft"
        @click="setSpec(null)"
      >
        Retirer la spécialisation
      </button>
    </Modal>

    <Toast v-if="toast" :message="toast.message" :tone="toast.tone" />
  </div>
</template>

<style scoped>
/* Étiquette de niveau posée sur l'illustration, même traitement que sur les
   tuiles de la Collection (MonumentTile.vue) pour rester cohérent. */
.farm-slot-level {
  position: absolute;
  right: 0.3rem;
  top: 0.3rem;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.05rem 0.28rem;
  border-radius: 2px;
  color: var(--color-ink-soft);
  background: var(--color-surface);
  border: 1px solid var(--color-liseret);
}

/* Bouton de spécialisation sous chaque emplacement : discret par défaut,
   coloré selon l'état (région fixée exploitée / fixée inexploitée). */
.farm-spec-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.3rem;
  width: 100%;
  padding: 0.28rem 0.4rem;
  border-radius: 2px;
  border: 1px solid var(--color-liseret);
  background: color-mix(in srgb, var(--color-fond) 40%, transparent);
  color: var(--color-ink-faint);
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.farm-spec-btn.is-set {
  border-color: var(--color-encre);
  color: var(--color-encre);
}
.farm-spec-btn.is-matched {
  border-color: var(--color-succes);
  color: var(--color-succes);
}
</style>
