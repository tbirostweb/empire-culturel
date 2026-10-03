<script setup>
import { computed, onUnmounted, ref } from 'vue';
import {
  MONUMENTS,
  SCORED_MONUMENTS,
  REGIONS,
  REGION_LABELS,
  REGION_ICONS,
  EPOQUES,
  EPOQUE_LABELS,
  EPOQUE_ICONS,
} from '../data/monuments.js';
import { RARITIES, RARITY_COLORS, RARITY_ICONS, RARITY_LABELS, SCORED_RARITIES } from '../data/rarity.js';
import { useCollectionStore } from '../stores/collection.js';
import MonumentGrid from '../components/monuments/MonumentGrid.vue';
import MonumentDetail from '../components/monuments/MonumentDetail.vue';
import Modal from '../components/ui/Modal.vue';
import Toast from '../components/ui/Toast.vue';
import AppIcon from '../components/icons/AppIcon.vue';

const collection = useCollectionStore();

// Un seul contrôle : le tri. Les quatre filtres (région / époque / rareté /
// possédés) ont été retirés sur retour utilisateur — avec un catalogue de
// 12 monuments qui tient en trois écrans, filtrer ne servait à rien et
// mangeait la moitié de la page avant la première carte.
const sortBy = ref('rarete');
// Recherche : avec 12 monuments on parcourait la grille des yeux, avec 35 ce
// n'est plus vrai. Filtre sur le nom ET le pays (on cherche autant "Égypte"
// que "Sphinx"), insensible aux accents pour que "perou" trouve "Pérou".
const recherche = ref('');
const sansAccent = (v) => v.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const selectedDefId = ref(null);

// Les monuments SECRETS non découverts sont retirés de la grille : c'est ce
// qui fait d'eux des secrets. On ne doit pas pouvoir lire à l'avance ce qu'on
// cherche — sinon ce ne serait qu'un palier de rareté de plus. Une fois
// trouvés, ils apparaissent normalement.
const entries = computed(() => {
  const q = sansAccent(recherche.value.trim());
  const list = MONUMENTS.filter((def) => def.rarete !== 'secret' || collection.isOwned(def.id))
    .filter((def) => !q || sansAccent(`${def.nom} ${def.pays}`).includes(q))
    .map((def) => ({ def, entry: collection.ownedEntry(def.id) }));
  if (sortBy.value === 'rarete') list.sort((a, b) => RARITIES.indexOf(b.def.rarete) - RARITIES.indexOf(a.def.rarete));
  if (sortBy.value === 'region') list.sort((a, b) => REGIONS.indexOf(a.def.region) - REGIONS.indexOf(b.def.region));
  if (sortBy.value === 'niveau') list.sort((a, b) => (b.entry?.niveau ?? 0) - (a.entry?.niveau ?? 0));
  return list;
});

// Navigation précédent/suivant depuis la modale : suit l'ordre AFFICHÉ
// (donc le tri courant), pas l'ordre du catalogue.
const selectedIndex = computed(() => entries.value.findIndex((e) => e.def.id === selectedDefId.value));
const selectedDef = computed(() => entries.value[selectedIndex.value]?.def ?? null);
const hasPrev = computed(() => selectedIndex.value > 0);
const hasNext = computed(() => selectedIndex.value >= 0 && selectedIndex.value < entries.value.length - 1);
function goPrev() {
  if (hasPrev.value) selectedDefId.value = entries.value[selectedIndex.value - 1].def.id;
}
function goNext() {
  if (hasNext.value) selectedDefId.value = entries.value[selectedIndex.value + 1].def.id;
}

// Régions et époques réunies en une seule liste "séries", filtrée sur celles
// qui ont au moins un monument : depuis la réduction du catalogue à 12,
// `afrique`/`oceanie`/`renaissance` sont vides, et afficher "0/0" pour elles
// n'aurait aucun sens.
// `bonus` : ce que la série rapporte UNE FOIS complétée. Une région donne
// +10% aux monuments de cette région seulement, une époque +5% sur tous les
// revenus (brief §10) — deux effets différents, que le tableau doit
// distinguer, sinon "Asie 2/2 ✓" à côté d'un total "+0% global" se lit comme
// un bug alors que c'est le fonctionnement voulu.
const series = computed(() => [
  ...REGIONS.filter((r) => collection.regionCompletion[r].total > 0).map((r) => ({
    key: `r-${r}`,
    label: REGION_LABELS[r],
    icon: REGION_ICONS[r],
    bonus: '+10% région',
    ...collection.regionCompletion[r],
  })),
  ...EPOQUES.filter((e) => collection.epoqueCompletion[e].total > 0).map((e) => ({
    key: `e-${e}`,
    label: EPOQUE_LABELS[e],
    icon: EPOQUE_ICONS[e],
    bonus: '+5% global',
    ...collection.epoqueCompletion[e],
  })),
]);

// La répartition par rareté n'affiche QUE les paliers scorés : lister
// "secret 0/4" révélerait d'emblée combien il en existe. Un compteur à part,
// sans total tant que rien n'est trouvé, laisse deviner qu'il y a quelque
// chose sans dire quoi ni combien.
// Bouton "Tout fusionner" : n'apparaît que s'il y a effectivement quelque
// chose à fusionner, pour ne pas encombrer l'écran le reste du temps.
const fusionnables = computed(() => MONUMENTS.filter((m) => collection.canFuse(m.id)).length);
const toast = ref(null);
function fusionnerTout() {
  const n = collection.fusionnerTout();
  toast.value = { message: n > 0 ? `${n} fusion${n > 1 ? 's' : ''} effectuée${n > 1 ? 's' : ''}.` : 'Rien à fusionner.', tone: n > 0 ? 'success' : 'default' };
  setTimeout(() => (toast.value = null), 2400);
}

const raretyBreakdown = computed(() => {
  const groups = {};
  for (const r of SCORED_RARITIES) groups[r] = { owned: 0, total: 0 };
  for (const def of SCORED_MONUMENTS) {
    groups[def.rarete].total += 1;
    if (collection.isOwned(def.id)) groups[def.rarete].owned += 1;
  }
  return groups;
});

onUnmounted(() => collection.clearNewlyAcquired());
</script>

<template>
  <div class="space-y-4 p-4 pb-6">
    <h1 class="text-xl font-bold">Collection</h1>

    <section class="panel space-y-2 p-4">
      <div class="flex items-center justify-between">
        <span class="section-label">Musée personnel</span>
        <span class="tabular text-base font-bold">{{ collection.ownedCount }}/{{ SCORED_MONUMENTS.length }}</span>
      </div>
      <div class="progress-track light">
        <div class="h-full bg-succes transition-all" :style="{ width: `${(collection.ownedCount / SCORED_MONUMENTS.length) * 100}%` }" />
      </div>
      <!-- Pictogramme de rareté plutôt qu'une pastille ronde uniforme : la
           forme dit LEQUEL des six paliers on regarde, ce qu'un simple point
           coloré n'indiquait pas (il fallait mémoriser l'ordre des teintes). -->
      <div class="flex flex-wrap gap-x-3 gap-y-1.5 text-xs">
        <span
          v-for="r in SCORED_RARITIES"
          :key="r"
          class="tabular flex items-center gap-1"
          :style="{ color: RARITY_COLORS[r] }"
          :title="RARITY_LABELS[r]"
        >
          <AppIcon :name="RARITY_ICONS[r]" class="h-3.5 w-3.5" weight="fill" />
          <span class="font-bold">{{ raretyBreakdown[r].owned }}/{{ raretyBreakdown[r].total }}</span>
        </span>
      </div>
      <!-- Les secrets vivent sur leur propre ligne, sans total tant qu'aucun
           n'est trouvé : on laisse deviner qu'il existe quelque chose, sans
           dire combien ni quoi. -->
      <div class="flex items-center gap-1.5 border-t pt-1.5 text-xs" style="border-color: var(--color-liseret)">
        <AppIcon name="rarity-secret" class="h-3.5 w-3.5" :style="{ color: RARITY_COLORS.secret }" weight="fill" />
        <span class="typewriter text-[0.65rem] uppercase tracking-wider" :style="{ color: RARITY_COLORS.secret }">Secrets</span>
        <span class="tabular ml-auto font-bold" :style="{ color: RARITY_COLORS.secret }">
          {{ collection.secretsOwned }}<template v-if="collection.secretsOwned > 0">/{{ collection.secretsTotal }}</template>
          <template v-else> trouvé</template>
        </span>
      </div>
    </section>

    <!-- Collections régionales/historiques : le moteur applique déjà ces
         bonus (engine/farm.js via stores/collection.js), mais rien ne les
         montrait — le joueur ne pouvait pas savoir qu'il lui manquait UN
         monument pour déclencher un +10%. C'est le principal levier
         "donne envie de compléter" du jeu, il doit être visible. -->
    <section class="panel space-y-2 p-4">
      <div class="flex items-center justify-between">
        <span class="section-label">Séries à compléter</span>
        <span class="tabular text-xs font-bold" :class="collection.globalCollectionBonusPct > 0 ? 'text-succes' : 'text-ink-faint'">
          +{{ collection.globalCollectionBonusPct }}% revenus
        </span>
      </div>
      <div class="space-y-1">
        <div v-for="s in series" :key="s.key" class="flex items-center gap-2 text-xs">
          <AppIcon :name="s.icon" class="h-3.5 w-3.5 shrink-0" :class="s.complete ? 'text-succes' : 'text-ink-faint'" />
          <span class="min-w-0 flex-1 truncate" :class="s.complete ? 'font-bold text-succes' : 'text-ink-soft'">{{ s.label }}</span>
          <span class="typewriter shrink-0 text-[0.6rem]" :class="s.complete ? 'text-succes' : 'text-ink-faint'">{{ s.bonus }}</span>
          <span class="tabular w-10 shrink-0 text-right font-bold" :class="s.complete ? 'text-succes' : 'text-ink-faint'">
            {{ s.owned }}/{{ s.total }}
          </span>
          <AppIcon
            :name="s.complete ? 'check' : 'lock'"
            class="h-3 w-3 shrink-0"
            :class="s.complete ? 'text-succes' : 'text-ink-faint opacity-40'"
            :weight="s.complete ? 'bold' : 'regular'"
          />
        </div>
      </div>
    </section>

    <!-- Sets thématiques (data/sets.js) : un TROISIÈME axe de collection,
         transversal aux régions/époques — réunir "les Sept Merveilles" est un
         but en soi. Chaque set complété accorde un bonus de revenu GLOBAL
         permanent (déjà appliqué par le moteur via setsBonusPct). Une barre de
         progression par set, car un set se joue sur 4 à 6 monuments précis :
         voir "4/6" en un coup d'oeil dit lesquels chercher. -->
    <section class="panel space-y-2 p-4">
      <div class="flex items-center justify-between">
        <span class="section-label">Sets thématiques</span>
        <span class="tabular text-xs font-bold" :class="collection.setsBonusPct > 0 ? 'text-succes' : 'text-ink-faint'">
          +{{ collection.setsBonusPct }}% global
        </span>
      </div>
      <div class="space-y-2">
        <div v-for="s in collection.setsCompletion" :key="s.id" class="space-y-1">
          <div class="flex items-center gap-2 text-xs">
            <AppIcon :name="s.icon" class="h-3.5 w-3.5 shrink-0" :class="s.complete ? 'text-succes' : 'text-ink-faint'" />
            <span class="min-w-0 flex-1 truncate" :class="s.complete ? 'font-bold text-succes' : 'text-ink-soft'">{{ s.nom }}</span>
            <span class="typewriter shrink-0 text-[0.6rem]" :class="s.complete ? 'text-succes' : 'text-ink-faint'">+{{ s.bonusPct }}%</span>
            <span class="tabular w-10 shrink-0 text-right font-bold" :class="s.complete ? 'text-succes' : 'text-ink-faint'">
              {{ s.owned }}/{{ s.total }}
            </span>
          </div>
          <div class="progress-track light h-1">
            <div
              class="h-full transition-all"
              :class="s.complete ? 'bg-succes' : 'bg-accent'"
              :style="{ width: `${(s.owned / s.total) * 100}%` }"
            />
          </div>
        </div>
      </div>
    </section>

    <button v-if="fusionnables > 0" type="button" class="btn-primary w-full text-sm" @click="fusionnerTout">
      Tout fusionner ({{ fusionnables }} possible{{ fusionnables > 1 ? 's' : '' }})
    </button>

    <div class="flex gap-2">
      <input v-model="recherche" class="input min-w-0 flex-1 text-xs" placeholder="Chercher un monument…" />
      <select v-model="sortBy" class="input w-auto shrink-0 text-xs">
        <option value="rarete">Trier : rareté</option>
        <option value="region">Trier : région</option>
        <option value="niveau">Trier : niveau</option>
      </select>
    </div>
    <p v-if="recherche && entries.length === 0" class="py-6 text-center text-sm text-ink-soft">
      Aucun monument ne correspond à « {{ recherche }} ».
    </p>

    <!-- `v-show` et non `v-if` : démonter la grille pour ouvrir un détail
         faisait perdre la position de défilement, et on revenait tout en
         haut de la liste en fermant la modale (bug remonté). Les 12 modèles
         ne consomment rien pendant ce temps — MonumentModel saute le rendu
         d'un canvas sans boîte de layout. -->
    <MonumentGrid v-show="!selectedDef" :monuments="entries" @select="selectedDefId = $event" />

    <Toast v-if="toast" :message="toast.message" :tone="toast.tone" />

    <Modal v-if="selectedDef" title="" @close="selectedDefId = null">
      <MonumentDetail
        :def="selectedDef"
        :has-prev="hasPrev"
        :has-next="hasNext"
        @prev="goPrev"
        @next="goNext"
      />
    </Modal>
  </div>
</template>
