<script setup>
import { computed } from 'vue';
import { RARITY_COLORS, RARITY_ICONS, RARITY_LABELS } from '../../data/rarity.js';
import { REGION_ICONS } from '../../data/monuments.js';
import { useCollectionStore } from '../../stores/collection.js';
import MonumentModel from './MonumentModel.vue';
import AppIcon from '../icons/AppIcon.vue';

const props = defineProps({
  def: { type: Object, required: true },
  entry: { type: Object, default: null }, // { niveau, doublons } | null
});
defineEmits(['click']);

const collection = useCollectionStore();
const isNew = computed(() => Boolean(props.entry) && collection.isNew(props.def.id));
// Assez de doublons pour fusionner : rien ne le signalait, il fallait ouvrir
// chaque fiche une par une pour découvrir qu'une fusion était possible.
const canFuse = computed(() => Boolean(props.entry) && collection.canFuse(props.def.id));
</script>

<template>
  <!-- Tuile "photo montée dans un album" : le monument est un tirage collé
       sur une fiche de papier, et son nom est une LÉGENDE sous la photo, pas
       du texte blanc posé sur un voile noir dégradé comme dans la version
       précédente (l'élément que l'utilisateur a explicitement pointé). Tout
       ce qui devait être lisible passe donc sur du papier, plus sur l'image :
       plus aucun texte n'a besoin d'un voile pour ressortir. -->
  <button type="button" class="monument-card card-tile-tilt" :class="{ 'is-locked': !entry }" @click="$emit('click')">
    <div class="monument-card-mount">
      <div class="card-photo" :class="{ locked: !entry }">
        <MonumentModel :def="def" />
      </div>

      <span
        v-if="entry?.doublons > 0"
        class="monument-card-dupes typewriter"
        :class="{ 'is-fusable': canFuse }"
      >
        <AppIcon v-if="canFuse" name="sparkles" class="h-2.5 w-2.5" weight="fill" />
        ×{{ entry.doublons + 1 }}
      </span>
      <span v-if="isNew" class="stamp monument-card-new" :style="{ color: RARITY_COLORS[def.rarete] }">
        <AppIcon name="sparkles" class="mr-1 h-3 w-3" weight="fill" />Nouveau
      </span>
      <span v-if="!entry" class="monument-card-lock">
        <AppIcon name="lock" class="h-3 w-3" />
      </span>
      <!-- Niveau posé SUR la photo plutôt qu'à côté du tampon : la tuile ne
           fait qu'environ 112px de large et "LÉGENDAIRE" + "Niv. 1" sur une
           même ligne débordait. -->
      <span v-else class="monument-card-level typewriter">Niv.&nbsp;{{ entry.niveau }}</span>
    </div>

    <div class="monument-card-caption">
      <p class="monument-card-name">{{ def.nom }}</p>
      <!-- Le pays occupe seul sa ligne : accolé au niveau, il se faisait
           tronquer sur les noms de pays un peu longs ("Royaume-Uni · Niv…").
           Le niveau part donc sur la ligne du tampon, où il reste lisible. -->
      <p class="monument-card-meta typewriter flex items-center gap-1">
        <AppIcon :name="REGION_ICONS[def.region]" class="h-3 w-3 shrink-0" />
        <span class="truncate">{{ def.pays }}</span>
      </p>
      <span class="stamp monument-card-stamp" :style="{ color: RARITY_COLORS[def.rarete] }">
        <AppIcon :name="RARITY_ICONS[def.rarete]" class="mr-1 h-3 w-3 shrink-0" weight="fill" />
        {{ RARITY_LABELS[def.rarete] }}
      </span>
    </div>
  </button>
</template>

<style scoped>
.monument-card {
  width: 100%;
  text-align: left;
  border-radius: 1px;
  padding: 0.4rem 0.4rem 0.55rem;
  background: var(--color-surface);
  border: 1px solid var(--color-liseret);
}
.monument-card.is-locked {
  background: color-mix(in srgb, var(--color-surface-soft) 55%, var(--color-surface));
}

.monument-card-mount {
  position: relative;
}

/* Coin de photo replié, en haut à droite du tirage — le seul ornement
   "scrapbook" de la tuile, en pur CSS (aucune image, cf. CSP). */
.monument-card-mount::after {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 14px;
  height: 14px;
  background: linear-gradient(225deg, var(--color-surface) 50%, transparent 50%);
  border-left: 1px solid var(--color-liseret);
  border-bottom: 1px solid var(--color-liseret);
  pointer-events: none;
}

.monument-card-dupes {
  position: absolute;
  left: 0.3rem;
  top: 0.3rem;
  display: inline-flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.6rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  padding: 0.05rem 0.3rem;
  color: var(--color-surface);
  background: var(--color-ink);
  border-radius: 2px;
}
/* Assez de doublons pour fusionner : le compteur passe en accent d'action.
   C'est une invitation à agir, donc la même couleur que les CTA. */
.monument-card-dupes.is-fusable {
  background: var(--color-accent);
  color: #06262b;
}

/* En HAUT et non en bas : en bas le tampon "Nouveau" chevauchait l'étiquette
   de niveau, présente exactement sur les mêmes cartes (un monument fraîchement
   obtenu est forcément possédé, donc a un niveau). */
.monument-card-new {
  position: absolute;
  left: 50%;
  top: 0.35rem;
  transform: translateX(-50%) rotate(-4deg);
  background: color-mix(in srgb, var(--color-surface) 88%, currentColor);
}

.monument-card-lock {
  position: absolute;
  right: 0.3rem;
  bottom: 0.3rem;
  display: flex;
  height: 1.2rem;
  width: 1.2rem;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  color: var(--color-ink-soft);
  background: var(--color-surface);
  border: 1px solid var(--color-liseret);
}

.monument-card-caption {
  margin-top: 0.45rem;
}
.monument-card-name {
  font-family: var(--font-display);
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.is-locked .monument-card-name {
  color: var(--color-ink-soft);
}
.monument-card-meta {
  margin-top: 0.1rem;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--color-ink-faint);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.monument-card-stamp {
  margin-top: 0.4rem;
}
.monument-card-level {
  position: absolute;
  right: 0.3rem;
  bottom: 0.3rem;
  font-size: 0.55rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  padding: 0.05rem 0.28rem;
  border-radius: 2px;
  color: var(--color-ink-soft);
  background: var(--color-surface);
  border: 1px solid var(--color-liseret);
}
</style>
