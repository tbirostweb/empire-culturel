<script setup>
// Séquence d'ouverture de booster (brief §20) : le tirage (`pull`) est
// déjà entièrement décidé par le moteur pur (engine/gacha.js, appelé dans
// stores/collection.js) — ce composant ne fait que mettre en scène un
// résultat déjà figé, jamais de RNG ici. Intensité de la révélation
// proportionnelle à la rareté : simple pour Commun/Peu commun, pause +
// flash + léger shake pour Légendaire, encore plus marqué pour Mythique.
import { onBeforeUnmount, ref } from 'vue';
import { RARITY_COLORS, RARITY_ICONS, RARITY_LABELS } from '../../data/rarity.js';
import { REGION_ICONS } from '../../data/monuments.js';
import MonumentModel from '../monuments/MonumentModel.vue';
import AppIcon from '../icons/AppIcon.vue';

const props = defineProps({
  def: { type: Object, required: true },
  duplicate: { type: Boolean, default: false },
  boosterNom: { type: String, default: 'Booster' },
});
const emit = defineEmits(['close']);

const phase = ref('closed'); // closed | pre-card | card
const flashActive = ref(false);
const HIGH_RARITIES = ['legendaire', 'mythique'];

let timer = null;
onBeforeUnmount(() => {
  if (timer) clearTimeout(timer);
});

function startOpening() {
  if (HIGH_RARITIES.includes(props.def.rarete)) {
    phase.value = 'pre-card';
    const pause = props.def.rarete === 'mythique' ? 1400 : 900;
    timer = setTimeout(() => {
      phase.value = 'card';
      flashActive.value = true;
      timer = setTimeout(() => {
        flashActive.value = false;
      }, 550);
    }, pause);
  } else {
    phase.value = 'card';
  }
}

function close() {
  emit('close');
}
</script>

<template>
  <!-- Tout le contenu est posé sur une fiche de papier (`.panel`), jamais
       directement sur le voile : les couleurs de texte du thème sont des
       encres sombres, illisibles sur un fond noir. Le voile lui-même est un
       brun d'encre translucide plutôt qu'un noir pur, pour rester dans le
       registre papier. -->
  <div class="fixed inset-0 z-50 flex flex-col items-center justify-center p-4" style="background: color-mix(in srgb, var(--color-fond) 88%, black)">
    <div v-if="flashActive" class="legendary-flash" :style="{ background: RARITY_COLORS[def.rarete] }" />

    <div v-if="phase === 'closed'" class="panel flex flex-col items-center gap-4 p-6">
      <button type="button" class="pack-anticipation flex h-40 w-28 items-center justify-center border" style="border-color: var(--color-liseret); border-radius: 3px" @click="startOpening">
        <AppIcon name="treasure" class="h-10 w-10 text-accent" />
      </button>
      <p class="typewriter text-xs uppercase tracking-wider text-ink-soft">{{ boosterNom }} — touche pour ouvrir</p>
    </div>

    <div v-else-if="phase === 'pre-card'" class="panel flex flex-col items-center gap-3 p-6">
      <div class="pack-anticipation-glow h-40 w-28" :style="{ borderColor: RARITY_COLORS[def.rarete] }" />
      <p class="typewriter text-xs font-bold uppercase tracking-wider" :style="{ color: RARITY_COLORS[def.rarete] }">
        Un monument exceptionnel...
      </p>
    </div>

    <div
      v-else
      class="panel flex flex-col items-center gap-2 p-5"
      :class="HIGH_RARITIES.includes(def.rarete) ? 'pull-reveal-legendary' : 'pull-reveal-basic'"
    >
      <div class="card-photo h-52 w-40">
        <MonumentModel :def="def" />
      </div>
      <p class="mt-1 font-display text-xl font-bold">{{ def.nom }}</p>
      <p class="typewriter flex items-center gap-1 text-[0.65rem] uppercase tracking-wider text-ink-faint">
        <AppIcon :name="REGION_ICONS[def.region]" class="h-3 w-3" />
        {{ def.pays }}
      </p>
      <span class="stamp mt-1" :style="{ color: RARITY_COLORS[def.rarete] }">
        <AppIcon :name="RARITY_ICONS[def.rarete]" class="mr-1 h-3 w-3" weight="fill" />
        {{ RARITY_LABELS[def.rarete] }}
      </span>
      <p v-if="duplicate" class="typewriter mt-1 flex items-center gap-1 text-center text-[0.65rem] text-ink-soft">
        <AppIcon name="package" class="h-3 w-3 shrink-0" />
        Doublon — utilisable pour une fusion
      </p>
      <p v-else class="typewriter mt-1 flex items-center gap-1 text-[0.65rem] font-bold uppercase tracking-wider text-succes">
        <AppIcon name="check" class="h-3.5 w-3.5" weight="bold" />
        Nouveau monument !
      </p>
      <button type="button" class="btn-primary mt-3 w-full" @click="close">Continuer</button>
    </div>
  </div>
</template>
