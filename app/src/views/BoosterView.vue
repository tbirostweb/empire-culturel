<script setup>
import { computed, onMounted, ref } from 'vue';
import { BOOSTERS, BOOSTER_IDS } from '../data/boosters.js';
import { RARITIES, RARITY_COLORS, RARITY_ICONS, RARITY_LABELS } from '../data/rarity.js';
import { useCollectionStore } from '../stores/collection.js';
import { usePlayerStore } from '../stores/player.js';
import { useEventsStore } from '../stores/events.js';
import BoosterOpeningModal from '../components/boosters/BoosterOpeningModal.vue';
import BulkOpeningResultModal from '../components/boosters/BulkOpeningResultModal.vue';
import Toast from '../components/ui/Toast.vue';
import AppIcon from '../components/icons/AppIcon.vue';

const collection = useCollectionStore();
const player = usePlayerStore();
const events = useEventsStore();

// L'événement est déterministe par semaine mais son store garde un `now` figé
// à sa création ; on le rafraîchit à l'ouverture de l'onglet pour que le
// thème et le compte à rebours soient justes même après plusieurs jours
// d'app ouverte.
onMounted(() => events.tick());

// Retour utilisateur : "un bouton pour ouvrir 5 ou 10 booster aussi c'est
// pas mal voir 100 aussi".
const BULK_QUANTITIES = [5, 10, 100];

// Le booster événement (id 'event') ne vit pas dans BOOSTERS : il est résolu
// depuis le store events. Ce helper unifie l'accès pour l'affichage et les
// toasts, sans réécrire tout le flux d'ouverture (qui passe déjà par
// collection._booster côté store).
const boosterDef = (id) => (id === 'event' ? events.booster : BOOSTERS[id]);

// Chances réelles par rareté, en % — les poids de data/boosters.js ne somment
// pas forcément à 100 (engine/gacha.js les normalise), donc on normalise ici
// aussi plutôt que d'afficher un poids brut trompeur. Les afficher est un
// vrai gain : le joueur choisissait jusqu'ici entre trois boosters sur la
// foi d'une phrase vague ("quelques Rares"), sans pouvoir comparer.
function oddsFor(weights) {
  const total = Object.values(weights).reduce((s, w) => s + w, 0);
  return RARITIES.map((r) => ({ rarete: r, pct: ((weights[r] ?? 0) / total) * 100 }));
}
const boosterOdds = computed(() => {
  const out = {};
  for (const id of BOOSTER_IDS) out[id] = oddsFor(BOOSTERS[id].weights);
  return out;
});
const eventOdds = computed(() => oddsFor(events.booster.weights));

// Sous 1%, "0%" serait faux et décevant ; on montre une décimale.
const fmtPct = (p) => (p >= 10 ? p.toFixed(0) : p >= 1 ? p.toFixed(1) : p.toFixed(2)).replace('.', ',');

const opening = ref(null); // { def, duplicate, boosterNom } | null
const bulkResult = ref(null); // { results, boosterNom, totalCost } | null
const toast = ref(null);

function showToast(message, tone = 'default') {
  toast.value = { message, tone };
  setTimeout(() => (toast.value = null), 2400);
}

function ouvrir(boosterId) {
  const result = collection.ouvrirBooster(boosterId);
  if (!result) {
    showToast("Pas assez d'Or.", 'danger');
    return;
  }
  opening.value = { ...result, boosterNom: boosterDef(boosterId).nom };
}

// S'arrête net dès que l'Or manque (cf. stores/collection.js#ouvrirBoosters)
// plutôt que d'exiger le coût total d'avance : un joueur "presque assez
// riche" peut quand même ouvrir ce qu'il peut se permettre.
function ouvrirEnMasse(boosterId, quantity) {
  const before = player.resources.or;
  const results = collection.ouvrirBoosters(boosterId, quantity);
  if (results.length === 0) {
    showToast("Pas assez d'Or.", 'danger');
    return;
  }
  bulkResult.value = { results, boosterNom: boosterDef(boosterId).nom, totalCost: before - player.resources.or };
}

function closeOpening() {
  const { def, duplicate } = opening.value;
  showToast(duplicate ? `${def.nom} (doublon) — utilisable en fusion.` : `${def.nom} obtenu !`, 'success');
  opening.value = null;
}

function closeBulkResult() {
  bulkResult.value = null;
}
</script>

<template>
  <div class="space-y-4 p-4 pb-6">
    <h1 class="text-xl font-bold">Boosters</h1>
    <p class="text-sm text-ink-soft">Chaque booster révèle un monument. Tous les monuments peuvent sortir de tous les boosters — seule la chance change.</p>

    <!-- Booster ÉVÉNEMENT de la semaine (engine/events.js) : une région-thème
         tourne chaque semaine, ce booster à prix réduit oriente 70% de ses
         tirages vers cette région. Encadré à part, avec l'accent cyan de la
         DA, pour qu'il se distingue nettement des trois boosters permanents —
         c'est une offre temporaire, elle doit se voir comme telle. -->
    <section class="panel event-panel space-y-3 p-4">
      <div class="flex items-center gap-3">
        <span class="icon-chip event-chip">
          <AppIcon name="calendar" class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2">
            <span class="section-label !text-accent">Événement</span>
            <span class="typewriter text-[0.6rem] uppercase tracking-wider text-ink-faint">
              {{ events.daysLeft }} jour{{ events.daysLeft > 1 ? 's' : '' }} restant{{ events.daysLeft > 1 ? 's' : '' }}
            </span>
          </div>
          <p class="text-sm font-bold">{{ events.booster.nom }}</p>
          <p class="text-xs text-ink-soft">{{ events.booster.description }}</p>
        </div>
      </div>

      <div class="flex items-center gap-2 rounded-sm border px-2.5 py-1.5" style="border-color: var(--color-accent-deep)">
        <AppIcon :name="`region-${events.current.region}`" class="h-4 w-4 shrink-0 text-accent" />
        <span class="typewriter text-[0.65rem] uppercase tracking-wider text-ink-soft">Thème</span>
        <span class="ml-auto text-xs font-bold text-accent">{{ events.current.regionLabel }}</span>
      </div>

      <div>
        <div class="odds-bar">
          <span
            v-for="o in eventOdds"
            :key="o.rarete"
            :style="{ width: `${o.pct}%`, background: RARITY_COLORS[o.rarete] }"
            :title="`${RARITY_LABELS[o.rarete]} — ${fmtPct(o.pct)}%`"
          />
        </div>
        <div class="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
          <span
            v-for="o in eventOdds"
            :key="o.rarete"
            class="tabular flex items-center gap-1 text-[0.65rem] font-bold"
            :style="{ color: RARITY_COLORS[o.rarete] }"
            :title="RARITY_LABELS[o.rarete]"
          >
            <AppIcon :name="RARITY_ICONS[o.rarete]" class="h-3 w-3" weight="fill" />
            {{ fmtPct(o.pct) }}%
          </span>
        </div>
      </div>
      <button
        type="button"
        class="btn-primary w-full text-sm"
        :disabled="player.resources.or < collection.boosterCost('event')"
        @click="ouvrir('event')"
      >
        Ouvrir — {{ collection.boosterCost('event') }} Or
      </button>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="qty in BULK_QUANTITIES"
          :key="qty"
          type="button"
          class="btn-ghost flex flex-col items-center gap-0.5 px-2 py-2"
          :disabled="player.resources.or < collection.boosterCost('event')"
          @click="ouvrirEnMasse('event', qty)"
        >
          <span class="text-xs font-semibold">×{{ qty }}</span>
          <span class="tabular text-[0.65rem] text-ink-faint">≈{{ collection.estimateBulkCost('event', qty) }} Or</span>
        </button>
      </div>
    </section>

    <section v-for="id in BOOSTER_IDS" :key="id" class="panel space-y-3 p-4">
      <div class="flex items-center gap-3">
        <span class="icon-chip" :style="{ '--chip-tint': id === 'bronze' ? '#a9703a' : id === 'argent' ? '#9CA3AF' : '#e8a93b' }">
          <AppIcon name="treasure" class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold">{{ BOOSTERS[id].nom }}</p>
          <p class="text-xs text-ink-soft">{{ BOOSTERS[id].description }}</p>
        </div>
      </div>

      <!-- Chances par rareté : pictogramme + pourcentage, et une jauge
           empilée qui donne la répartition d'un coup d'oeil. -->
      <div>
        <div class="odds-bar">
          <span
            v-for="o in boosterOdds[id]"
            :key="o.rarete"
            :style="{ width: `${o.pct}%`, background: RARITY_COLORS[o.rarete] }"
            :title="`${RARITY_LABELS[o.rarete]} — ${fmtPct(o.pct)}%`"
          />
        </div>
        <div class="mt-1.5 flex flex-wrap gap-x-2.5 gap-y-1">
          <span
            v-for="o in boosterOdds[id]"
            :key="o.rarete"
            class="tabular flex items-center gap-1 text-[0.65rem] font-bold"
            :style="{ color: RARITY_COLORS[o.rarete] }"
            :title="RARITY_LABELS[o.rarete]"
          >
            <AppIcon :name="RARITY_ICONS[o.rarete]" class="h-3 w-3" weight="fill" />
            {{ fmtPct(o.pct) }}%
          </span>
        </div>
      </div>
      <button
        type="button"
        class="btn-primary w-full text-sm"
        :disabled="player.resources.or < collection.boosterCost(id)"
        @click="ouvrir(id)"
      >
        Ouvrir — {{ collection.boosterCost(id) }} Or
      </button>
      <div class="grid grid-cols-3 gap-2">
        <button
          v-for="qty in BULK_QUANTITIES"
          :key="qty"
          type="button"
          class="btn-ghost flex flex-col items-center gap-0.5 px-2 py-2"
          :disabled="player.resources.or < collection.boosterCost(id)"
          @click="ouvrirEnMasse(id, qty)"
        >
          <span class="text-xs font-semibold">×{{ qty }}</span>
          <span class="tabular text-[0.65rem] text-ink-faint">≈{{ collection.estimateBulkCost(id, qty) }} Or</span>
        </button>
      </div>
    </section>

    <Toast v-if="toast" :message="toast.message" :tone="toast.tone" />
    <BoosterOpeningModal
      v-if="opening"
      :def="opening.def"
      :duplicate="opening.duplicate"
      :booster-nom="opening.boosterNom"
      @close="closeOpening"
    />
    <BulkOpeningResultModal
      v-if="bulkResult"
      :results="bulkResult.results"
      :booster-nom="bulkResult.boosterNom"
      :total-cost="bulkResult.totalCost"
      @close="closeBulkResult"
    />
  </div>
</template>

<style scoped>
/* Jauge empilée des chances par rareté : un seul trait fin, pas un
   graphique — on reste dans le registre "filet imprimé" de la DA. */
.odds-bar {
  display: flex;
  height: 6px;
  width: 100%;
  overflow: hidden;
  border-radius: 1px;
  border: 1px solid var(--color-liseret);
}
.odds-bar > span {
  height: 100%;
  min-width: 1px;
}

/* Le booster événement se démarque des trois permanents : liseré cyan et
   fond très légèrement teinté d'accent, sans virer au bloc de couleur pleine
   (on reste sur le papier-calque de la DA blueprint). */
.event-panel {
  border-color: var(--color-accent-deep);
  background:
    linear-gradient(color-mix(in srgb, var(--color-accent) 6%, transparent), color-mix(in srgb, var(--color-accent) 6%, transparent)),
    var(--color-surface);
}
.event-chip {
  --chip-tint: var(--color-accent);
}
</style>
