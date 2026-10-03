<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { RANKINGS } from '../data/economy.js';
import { useRankingsStore } from '../stores/rankings.js';
import { useRivalriesStore } from '../stores/rivalries.js';
import { usePlayerStore } from '../stores/player.js';
import { rivalLiveScore } from '../engine/rivalries.js';
import AppIcon from '../components/icons/AppIcon.vue';
import Toast from '../components/ui/Toast.vue';

const rankings = useRankingsStore();
const rivalries = useRivalriesStore();
const player = usePlayerStore();

// Démarre/clôture la saison ET le duel à l'ouverture de l'onglet. Les deux
// syncs sont idempotents dans leur période courante.
onMounted(() => {
  rankings.syncSeason();
  rivalries.syncDuel();
});

// Horloge locale à la seconde : le score "live" du rival et le compte à
// rebours du duel dépendent de l'heure, que les getters Pinia ne peuvent pas
// suivre réactivement (cf. stores/rivalries.js). On les recalcule ici.
const now = ref(Date.now());
let clock = null;
onMounted(() => {
  clock = setInterval(() => (now.value = Date.now()), 1000);
});
onUnmounted(() => clock && clearInterval(clock));

const duelSecondsLeft = computed(() =>
  rivalries.endsAt ? Math.max(0, (rivalries.endsAt - now.value) / 1000) : 0,
);
const duelPlayerScore = computed(() => rivalries.playerScore);
const duelRivalScore = computed(() =>
  rivalLiveScore(
    rivalries.rivalRate,
    rivalries.rivalTarget,
    rivalries.startedAt ? (now.value - rivalries.startedAt) / 1000 : 0,
  ),
);
const duelPlayerPct = computed(() =>
  rivalries.rivalTarget > 0 ? Math.min(100, (duelPlayerScore.value / rivalries.rivalTarget) * 100) : 0,
);
const duelRivalPct = computed(() =>
  rivalries.rivalTarget > 0 ? Math.min(100, (duelRivalScore.value / rivalries.rivalTarget) * 100) : 0,
);
const duelLeading = computed(() => duelPlayerScore.value >= duelRivalScore.value);

const toast = ref(null);
function showToast(message, tone = 'success', ms = 2800) {
  toast.value = { message, tone };
  setTimeout(() => (toast.value = null), ms);
}
function claim() {
  const result = rankings.claimSeasonReward();
  if (!result) return;
  showToast(`Saison clôturée #${result.rang} : +${result.cristaux} Cristaux, +${result.pointsTech} Points techno`);
}
function claimDuel() {
  const result = rivalries.claimReward();
  if (!result) return;
  showToast(`Duel remporté contre ${result.rivalNom} : +${result.cristaux} Cristaux, +${result.pointsTech} Points techno`);
}

const fmt = (n) => Math.round(n).toLocaleString('fr-FR');
// Durée compacte : au-delà de quelques jours, la précision ne veut plus rien
// dire et "3 j" est plus honnête que "3 j 4 h 12 min".
function dureeCourte(sec) {
  if (sec < 60) return `${Math.ceil(sec)} s`;
  if (sec < 3600) return `${Math.ceil(sec / 60)} min`;
  if (sec < 86_400) return `${Math.round(sec / 3600)} h`;
  return `${Math.round(sec / 86_400)} j`;
}
const rewardForRank = (rang) => RANKINGS.seasonRewards[rang - 1] ?? RANKINGS.seasonRewards.at(-1);
const myReward = computed(() => rankings.currentReward);
</script>

<template>
  <div class="space-y-4 p-4 pb-6">
    <div class="flex items-baseline justify-between gap-2">
      <h1 class="text-xl font-bold">Classement</h1>
      <span class="typewriter text-xs uppercase tracking-wider text-ink-soft">
        Saison · {{ rankings.daysLeft }}j restants
      </span>
    </div>
    <p class="text-xs text-ink-soft">
      Classé sur l'<strong>Or gagné</strong> depuis le début de la saison ({{ RANKINGS.seasonDurationDays }} jours).
      Tes trois rivaux sont simulés localement — cette app fonctionne sans serveur.
    </p>

    <!-- ═══ DUEL DE LA SEMAINE (rivalité active) ═══
         Mécanique distincte du classement saisonnier ci-dessous : un 1 contre
         1 hebdomadaire contre un rival tiré au sort, avec une cible chiffrée,
         un palmarès et une récompense qui monte avec la série de victoires. -->

    <!-- Duel précédent remporté : récompense à réclamer (jamais auto-créditée). -->
    <section v-if="rivalries.pendingReward" class="panel flex items-center gap-3 p-3" style="border-color: var(--color-succes)">
      <span class="icon-chip" style="--chip-tint: var(--color-succes)">
        <AppIcon name="trophy" class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold">Duel remporté — {{ rivalries.pendingReward.rivalNom }}</p>
        <p class="tabular text-xs text-ink-soft">
          Série {{ rivalries.pendingReward.streak }} · +{{ rivalries.pendingReward.cristaux }} Cristaux · +{{ rivalries.pendingReward.pointsTech }} Techno
        </p>
      </div>
      <button type="button" class="btn-primary shrink-0 text-xs" @click="claimDuel">Réclamer</button>
    </section>

    <!-- Duel précédent perdu : simple accusé de réception (le gagné passe par
         pendingReward ci-dessus). -->
    <section
      v-else-if="rivalries.lastResult && !rivalries.lastResult.won"
      class="panel flex items-center gap-3 p-3"
    >
      <span class="icon-chip" style="--chip-tint: var(--color-danger)">
        <AppIcon name="rivalry" class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold">Duel perdu — {{ rivalries.lastResult.rivalNom }}</p>
        <p class="tabular text-xs text-ink-soft">
          {{ fmt(rivalries.lastResult.playerScore) }} / {{ fmt(rivalries.lastResult.rivalTarget) }} Or
        </p>
      </div>
      <button type="button" class="btn-ghost shrink-0 text-xs" @click="rivalries.dismissLastResult()">OK</button>
    </section>

    <!-- Panneau du duel en cours : tête-à-tête vers une cible commune. Le
         liseré passe au vert quand tu mènes, au rouge quand tu es mené. -->
    <section
      v-if="rivalries.hasDuel"
      class="panel space-y-3 p-4"
      :style="{ borderColor: duelLeading ? 'var(--color-succes)' : 'var(--color-danger)' }"
    >
      <div class="flex items-center justify-between">
        <span class="section-label">Duel de la semaine</span>
        <span class="typewriter text-[0.65rem] uppercase tracking-wider" :class="duelSecondsLeft > 0 ? 'text-ink-soft' : 'text-danger'">
          {{ duelSecondsLeft > 0 ? dureeCourte(duelSecondsLeft) + ' restant' : 'terminé' }}
        </span>
      </div>

      <div class="flex items-start gap-3">
        <span class="icon-chip" style="--chip-tint: var(--color-danger)">
          <AppIcon name="rivalry" class="h-5 w-5" />
        </span>
        <div class="min-w-0 flex-1">
          <p class="text-sm font-bold">{{ rivalries.rival.nom }}</p>
          <p class="text-xs italic text-ink-soft">{{ rivalries.rival.persona }}</p>
        </div>
      </div>

      <div class="space-y-2">
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-accent">Toi</span>
            <span class="tabular font-bold">{{ fmt(duelPlayerScore) }}</span>
          </div>
          <div class="progress-track"><div class="h-full bg-accent transition-all" :style="{ width: duelPlayerPct + '%' }" /></div>
        </div>
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs">
            <span class="font-semibold text-danger">{{ rivalries.rival.nom.split(' ')[0] }}</span>
            <span class="tabular font-bold">{{ fmt(duelRivalScore) }}</span>
          </div>
          <div class="progress-track"><div class="h-full bg-danger transition-all" :style="{ width: duelRivalPct + '%' }" /></div>
        </div>
      </div>

      <div class="flex items-center justify-between border-t pt-2 text-xs" style="border-color: var(--color-liseret)">
        <span class="text-ink-soft">Cible : <span class="tabular font-bold text-ink">{{ fmt(rivalries.rivalTarget) }}</span> Or</span>
        <span v-if="rivalries.potentialReward" class="tabular flex items-center gap-1 text-succes">
          Gain <AppIcon name="gem" class="h-3 w-3" />{{ rivalries.potentialReward.cristaux }}
          <AppIcon name="sparkles" class="ml-1 h-3 w-3" />{{ rivalries.potentialReward.pointsTech }}
        </span>
      </div>

      <p v-if="rivalries.targetReached" class="flex items-center gap-1.5 text-xs font-bold text-succes">
        <AppIcon name="sealcheck" weight="fill" class="h-4 w-4" /> Victoire acquise — la cible est atteinte.
      </p>
      <p v-else-if="duelLeading" class="text-xs text-succes">Tu mènes — garde le rythme jusqu'à dimanche.</p>
      <p v-else class="text-xs text-danger">{{ rivalries.rival.nom.split(' ')[0] }} est devant. Accélère ta Farm.</p>

      <div class="typewriter flex items-center gap-3 border-t pt-2 text-[0.65rem] uppercase tracking-wider text-ink-faint" style="border-color: var(--color-liseret)">
        <span>{{ rivalries.record.wins }} victoire{{ rivalries.record.wins > 1 ? 's' : '' }}</span>
        <span>{{ rivalries.record.losses }} défaite{{ rivalries.record.losses > 1 ? 's' : '' }}</span>
        <span v-if="rivalries.record.streak > 0" class="ml-auto text-succes">Série de {{ rivalries.record.streak }}</span>
      </div>
    </section>

    <!-- Pas de duel cette semaine (app rejointe trop tard dans la semaine). -->
    <section v-else class="panel p-3">
      <p class="text-xs text-ink-soft">Aucun duel en cours — le prochain démarre lundi.</p>
    </section>

    <!-- Récompense de la saison précédente, à réclamer. -->
    <section v-if="rankings.pendingReward" class="panel flex items-center gap-3 p-3" style="border-color: var(--color-accent)">
      <span class="icon-chip" style="--chip-tint: var(--color-accent)">
        <AppIcon name="trophy" class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold">Saison terminée — #{{ rankings.pendingReward.rang }}</p>
        <p class="tabular text-xs text-ink-soft">
          +{{ rankings.pendingReward.cristaux }} Cristaux · +{{ rankings.pendingReward.pointsTech }} Points techno
        </p>
      </div>
      <button type="button" class="btn-primary shrink-0 text-xs" @click="claim">Réclamer</button>
    </section>

    <section class="panel divide-y" style="border-color: var(--color-liseret)">
      <div
        v-for="entry in rankings.leaderboard"
        :key="entry.rang + entry.nom"
        class="flex items-center gap-3 p-3"
        :class="entry.isPlayer ? 'bg-accent-soft' : ''"
        style="border-color: var(--color-liseret)"
      >
        <span
          class="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded-sm text-xs font-bold"
          :class="entry.rang === 1 ? 'bg-legendaire text-fond' : 'bg-surface-soft text-ink-soft'"
        >
          {{ entry.rang }}
        </span>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold" :class="entry.isPlayer ? 'text-accent' : ''">
            {{ entry.nom }}<span v-if="entry.isPlayer"> (toi)</span>
          </p>
          <!-- Icône + récompense de fin de saison pour CHAQUE place : on voit
               d'un coup d'oeil ce qu'on gagne, et ce qu'on gagnerait en
               montant d'un rang. -->
          <p class="tabular flex items-center gap-1 text-[0.65rem] text-ink-faint">
            <AppIcon name="gem" class="h-3 w-3" />
            {{ rewardForRank(entry.rang).cristaux }}
            <AppIcon name="sparkles" class="ml-1 h-3 w-3" />
            {{ rewardForRank(entry.rang).pointsTech }}
          </p>
        </div>
        <span class="tabular shrink-0 text-sm font-bold">{{ fmt(entry.score) }}</span>
      </div>
    </section>

    <!-- Objectif actionnable : un rang seul ne dit pas quoi faire. -->
    <section v-if="rankings.nextTarget" class="panel flex items-center gap-3 p-3">
      <span class="icon-chip" style="--chip-tint: var(--color-encre)">
        <AppIcon name="target" class="h-5 w-5" />
      </span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-bold">Passer #{{ rankings.nextTarget.rang }}</p>
        <p class="tabular text-xs text-ink-soft">
          {{ fmt(rankings.nextTarget.gap) }} Or d'écart avec {{ rankings.nextTarget.nom }}
        </p>
      </div>
      <span class="typewriter shrink-0 text-right text-[0.65rem] uppercase tracking-wider" :class="rankings.nextTarget.secondsToCatch ? 'text-succes' : 'text-danger'">
        {{ rankings.nextTarget.secondsToCatch ? `~${dureeCourte(rankings.nextTarget.secondsToCatch)}` : 'il va plus vite' }}
      </span>
    </section>

    <section class="panel space-y-1 p-3">
      <p class="section-label">Ton total</p>
      <div class="flex items-baseline justify-between">
        <span class="text-xs text-ink-soft">Or gagné cette saison</span>
        <span class="tabular text-sm font-bold">{{ fmt(player.orGagneSaison) }}</span>
      </div>
      <div class="flex items-baseline justify-between">
        <span class="text-xs text-ink-soft">Or gagné depuis toujours</span>
        <span class="tabular text-sm font-bold">{{ fmt(player.orGagneTotal) }}</span>
      </div>
      <div v-if="myReward" class="flex items-baseline justify-between border-t pt-1" style="border-color: var(--color-liseret)">
        <span class="text-xs text-ink-soft">Si la saison finissait maintenant</span>
        <span class="tabular text-sm font-bold text-accent">
          {{ myReward.cristaux }} Cristaux · {{ myReward.pointsTech }} Techno
        </span>
      </div>
    </section>

    <Toast v-if="toast" :message="toast.message" :tone="toast.tone" />
  </div>
</template>
