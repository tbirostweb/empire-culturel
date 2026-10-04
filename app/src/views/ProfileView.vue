<script setup>
import { computed, ref } from 'vue';
import { usePlayerStore } from '../stores/player.js';
import { useCollectionStore } from '../stores/collection.js';
import { useFarmStore } from '../stores/farm.js';
import { useMissionsStore } from '../stores/missions.js';
import { usePrestigeStore } from '../stores/prestige.js';
import { useRankingsStore } from '../stores/rankings.js';
import { MONUMENTS, SCORED_MONUMENTS } from '../data/monuments.js';
import { MISSION_TEMPLATES } from '../data/missions.js';
import { PRESTIGE_PERKS } from '../data/prestigePerks.js';
import { PRESTIGE } from '../data/economy.js';
import { logout, activeProfile, deleteProfile } from '../utils/profiles.js';
import ResourceBlock from '../components/ui/ResourceBlock.vue';
import Modal from '../components/ui/Modal.vue';
import AppIcon from '../components/icons/AppIcon.vue';

const player = usePlayerStore();
const collection = useCollectionStore();
const farm = useFarmStore();
const missions = useMissionsStore();
const prestige = usePrestigeStore();
const rankings = useRankingsStore();

missions.refreshIfNeeded();

const editingPseudo = ref(false);
const pseudoDraft = ref(player.pseudo);
function savePseudo() {
  player.setPseudo(pseudoDraft.value);
  editingPseudo.value = false;
}

const xpPct = computed(() => Math.min(100, (player.xp / player.xpForNext) * 100));

function missionLabel(templateId) {
  return MISSION_TEMPLATES.find((t) => t.id === templateId)?.label ?? '';
}
function missionTarget(templateId) {
  return MISSION_TEMPLATES.find((t) => t.id === templateId)?.target ?? 0;
}

const showPrestigeConfirm = ref(false);
function confirmPrestige() {
  prestige.faireLePrestige();
  showPrestigeConfirm.value = false;
}

// Crédits construits depuis le catalogue lui-même : impossible d'oublier
// d'attribuer un monument ajouté plus tard, et impossible que la liste
// mentionne un modèle qui n'est plus embarqué.
const showCredits = ref(false);
const credits = computed(() =>
  MONUMENTS.filter((m) => m.credit).map((m) => ({
    nom: m.nom,
    auteur: m.credit.auteur,
    licence: m.credit.licence,
    url: m.credit.url,
  })),
);
const creditsManquants = computed(() => MONUMENTS.filter((m) => !m.credit).length);

// Déconnexion : range la partie dans l'espace du profil et revient à l'écran
// d'inscription. Rien n'est perdu — c'est la différence avec "Supprimer le
// compte" juste en dessous.
const profilCourant = activeProfile();
function seDeconnecter() {
  logout();
  window.location.reload();
}

// "Supprimer le compte" plutôt que "Réinitialiser ma progression" : c'est
// le libellé attendu par le joueur, et l'effet est bien celui-là. Sans
// backend (cf. CLAUDE.md), un compte N'EST que le localStorage de cet
// appareil — l'effacer est donc littéralement la suppression du compte.
// Distinct du Prestige : ici on perd tout, y compris les Cristaux.
const showResetConfirm = ref(false);
function deleteAccount() {
  // `localStorage.clear()` efface AUSSI l'index des profils et les
  // sauvegardes des autres profils de l'appareil — ce qui n'est pas ce que
  // "supprimer MON compte" veut dire. On ne retire donc que ce profil-ci.
  if (profilCourant) deleteProfile(profilCourant.id);
  else localStorage.clear();
  window.location.reload();
}

</script>

<template>
  <div class="space-y-4 p-4 pb-6">
    <h1 class="text-xl font-bold">Profil</h1>

    <div class="hero-card">
      <div class="hero-card-glow" />
      <div class="relative flex items-center gap-3">
        <div class="flex h-14 w-14 items-center justify-center rounded-sm text-lg font-bold" style="background: var(--color-accent-soft); color: var(--color-accent)">
          {{ player.pseudo.charAt(0).toUpperCase() }}
        </div>
        <div class="min-w-0 flex-1">
          <div v-if="!editingPseudo" class="flex items-center gap-2">
            <p class="truncate font-display text-lg font-bold">{{ player.pseudo }}</p>
            <button type="button" aria-label="Modifier le pseudo" @click="editingPseudo = true">
              <AppIcon name="pencil" class="h-4 w-4 text-ink-soft" aria-hidden="true" />
            </button>
          </div>
          <div v-else class="flex items-center gap-2">
            <input v-model="pseudoDraft" class="input py-1.5 text-sm text-ink" maxlength="20" aria-label="Pseudo" />
            <button type="button" class="btn-primary px-3 py-1.5 text-xs" @click="savePseudo">OK</button>
          </div>
          <p class="tabular text-xs text-ink-soft">Prestige {{ prestige.count }} · Rang saison #{{ rankings.seasonRank }}</p>
        </div>
      </div>
      <div class="relative mt-3 space-y-1">
        <div class="flex items-center justify-between text-xs text-ink-soft">
          <span>Niveau {{ player.niveauJoueur }}</span>
          <span class="tabular">{{ Math.round(player.xp) }} / {{ player.xpForNext }} XP</span>
        </div>
        <div class="progress-track">
          <div class="progress-fill" :style="{ width: `${xpPct}%` }" />
        </div>
      </div>
    </div>

    <section class="grid grid-cols-3 gap-2">
      <ResourceBlock icon="coin" label="Or" :value="player.resources.or" />
      <ResourceBlock icon="gem" label="Cristaux" :value="player.resources.cristaux" />
      <ResourceBlock icon="sparkles" label="Techno" :value="player.resources.pointsTech" />
    </section>

    <section class="grid grid-cols-3 gap-2">
      <div class="panel p-3 text-center">
        <p class="tabular text-lg font-bold text-succes">{{ collection.ownedCount }}/{{ SCORED_MONUMENTS.length }}</p>
        <p class="text-xs text-ink-faint">Monuments</p>
      </div>
      <div class="panel p-3 text-center">
        <p class="tabular text-lg font-bold text-accent">{{ collection.totalCollectionValue.toLocaleString('fr-FR') }}</p>
        <p class="text-xs text-ink-faint">Valeur Empire</p>
      </div>
      <div class="panel p-3 text-center">
        <p class="tabular text-lg font-bold">{{ farm.ratePerSecond.toFixed(1) }}/s</p>
        <p class="text-xs text-ink-faint">Revenu Farm</p>
      </div>
    </section>

    <section class="panel space-y-3 p-4">
      <div class="flex items-center justify-between">
        <h2 class="section-label">Missions du jour</h2>
      </div>
      <div v-for="mission in missions.active" :key="mission.templateId" class="space-y-1">
        <div class="flex items-center justify-between text-sm">
          <span>{{ missionLabel(mission.templateId) }}</span>
          <button
            v-if="mission.progress >= missionTarget(mission.templateId) && !mission.claimed"
            type="button"
            class="btn-primary px-3 py-1 text-xs"
            @click="missions.claim(mission.templateId)"
          >
            Réclamer
          </button>
          <span v-else class="tabular text-xs text-ink-faint">{{ Math.floor(mission.progress) }}/{{ missionTarget(mission.templateId) }}</span>
        </div>
        <div class="progress-track light">
          <div
            class="h-full rounded-sm transition-all"
            :class="mission.claimed ? 'bg-succes' : 'bg-accent'"
            :style="{ width: `${Math.min(100, (mission.progress / missionTarget(mission.templateId)) * 100)}%` }"
          />
        </div>
      </div>
    </section>

    <section class="panel space-y-3 p-4">
      <div class="flex items-center justify-between">
        <h2 class="section-label">Prestige</h2>
        <span class="tabular flex items-center gap-1 text-xs font-bold" style="color: var(--color-encre)">
          <AppIcon name="prestige" class="h-3.5 w-3.5" />{{ prestige.renommee }} Renommée
        </span>
      </div>
      <p class="text-sm text-ink-soft">
        Réinitialise ta collection, ta Farm et ton arbre technologique contre un bonus permanent de revenus.
        Actuel : <span class="font-semibold text-accent">+{{ prestige.bonusPct }}%</span> — prochain : +{{ prestige.nextBonusPct }}%.
        Chaque prestige rapporte de la <strong>Renommée</strong>, à investir dans des atouts permanents ci-dessous.
      </p>

      <!-- Arbre de perks : méta-progression permanente, jamais réinitialisée
           par un prestige (contrairement à tout le reste). -->
      <div class="space-y-2">
        <div v-for="perk in PRESTIGE_PERKS" :key="perk.id" class="rounded-sm border p-2.5" style="border-color: var(--color-liseret)">
          <div class="flex items-center gap-2">
            <AppIcon :name="perk.icon" class="h-4 w-4 shrink-0" style="color: var(--color-encre)" />
            <span class="min-w-0 flex-1 truncate text-sm font-bold">{{ perk.nom }}</span>
            <span class="tabular shrink-0 text-[0.65rem] text-ink-faint">Niv {{ prestige.perkLevel(perk.id) }}/{{ perk.maxLevel }}</span>
          </div>
          <p class="mt-0.5 text-xs text-ink-soft">{{ perk.description }}</p>
          <button
            type="button"
            class="btn-ghost mt-2 w-full text-xs"
            :disabled="prestige.perkCost(perk.id) == null || !prestige.canBuyPerk(perk.id)"
            @click="prestige.acheterPerk(perk.id)"
          >
            <template v-if="prestige.perkCost(perk.id) == null">Niveau maximum</template>
            <template v-else>Investir — {{ prestige.perkCost(perk.id) }} Renommée</template>
          </button>
        </div>
      </div>

      <p v-if="!prestige.canPrestige" class="text-xs text-ink-faint">
        Débloqué au niveau {{ PRESTIGE.minLevel }} avec au moins {{ PRESTIGE.minMonuments }} monuments possédés
        (actuellement niveau {{ player.niveauJoueur }}, {{ collection.ownedCount }} monument{{ collection.ownedCount > 1 ? 's' : '' }}).
      </p>
      <p v-else class="typewriter text-xs" style="color: var(--color-encre)">
        Ce prestige rapporterait +{{ prestige.renommeePreview }} Renommée.
      </p>
      <button type="button" class="btn-danger w-full" :disabled="!prestige.canPrestige" @click="showPrestigeConfirm = true">
        Faire un Prestige
      </button>
    </section>

    <!-- Écran de crédits : 39 des 41 modèles 3D sont sous CC BY, dont
         l'attribution est une obligation légale et non une politesse. La
         liste est construite depuis `data/monuments.js#credit`, donc elle
         ne peut pas se désynchroniser du catalogue réellement embarqué. -->
    <button type="button" class="btn-ghost w-full" @click="showCredits = true">
      Crédits des modèles 3D
    </button>

    <!-- Déconnexion ≠ suppression : elle range la partie en cours et renvoie
         à l'écran d'inscription, sans rien effacer. Se reconnecter au même
         profil retrouve tout. -->
    <button type="button" class="btn-ghost w-full" @click="seDeconnecter">Se déconnecter</button>

    <button type="button" class="btn-danger w-full" @click="showResetConfirm = true">Supprimer le compte</button>

    <Modal v-if="showCredits" title="Crédits des modèles 3D" @close="showCredits = false">
      <div class="space-y-3">
        <p class="text-sm text-ink-soft">
          Les monuments de ce jeu sont des modèles 3D créés par des tiers et utilisés sous licence
          Creative Commons. Merci à leurs auteurs.
        </p>
        <div class="max-h-80 space-y-1.5 overflow-y-auto pr-1">
          <div
            v-for="c in credits"
            :key="c.nom"
            class="flex flex-wrap items-baseline gap-x-2 border-b pb-1.5 text-xs"
            style="border-color: var(--color-liseret)"
          >
            <span class="font-display font-bold">{{ c.nom }}</span>
            <span class="text-ink-soft">{{ c.auteur }}</span>
            <a
              v-if="c.url"
              :href="c.url"
              target="_blank"
              rel="noopener"
              class="typewriter ml-auto text-[0.6rem] uppercase tracking-wider"
              style="color: var(--color-encre)"
            >{{ c.licence }}</a>
            <span v-else class="typewriter ml-auto text-[0.6rem] uppercase tracking-wider text-ink-faint">
              {{ c.licence }}
            </span>
          </div>
        </div>
        <p v-if="creditsManquants > 0" class="typewriter text-[0.65rem] text-danger">
          {{ creditsManquants }} modèle{{ creditsManquants > 1 ? 's' : '' }} sans provenance identifiée —
          voir monuments/CREDITS.md.
        </p>
      </div>
    </Modal>

    <Modal v-if="showPrestigeConfirm" title="Faire un Prestige ?" @close="showPrestigeConfirm = false">
      <p class="text-sm text-ink-soft">
        Ta collection, ta Farm et ton arbre technologique seront réinitialisés. Tu gardes tes Cristaux, tes atouts de
        prestige et tu gagnes <strong style="color: var(--color-encre)">+{{ prestige.renommeePreview }} Renommée</strong>.
        Ton bonus de prestige devient +{{ prestige.nextBonusPct }}%.
        <template v-if="prestige.effects.keepMonuments > 0">
          Tes {{ prestige.effects.keepMonuments }} meilleurs monuments sont conservés (Héritage).
        </template>
        Cette action est irréversible.
      </p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="btn-ghost flex-1" @click="showPrestigeConfirm = false">Annuler</button>
        <button type="button" class="btn-danger flex-1" @click="confirmPrestige">Confirmer</button>
      </div>
    </Modal>

    <Modal v-if="showResetConfirm" title="Supprimer le compte ?" @close="showResetConfirm = false">
      <p class="text-sm text-ink-soft">
        Ton compte et toute ta progression (monuments, ressources, niveau, technologie, prestige) seront
        définitivement effacés de cet appareil. Cette action est irréversible.
      </p>
      <div class="mt-4 flex gap-2">
        <button type="button" class="btn-ghost flex-1" @click="showResetConfirm = false">Annuler</button>
        <button type="button" class="btn-danger flex-1" @click="deleteAccount">Confirmer</button>
      </div>
    </Modal>
  </div>
</template>
