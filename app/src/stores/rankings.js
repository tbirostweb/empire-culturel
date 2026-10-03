// Classement saisonnier (brief §19) : app 100% client-only, pas de vrais
// autres joueurs — cf. engine/rankings.js. Le score est l'OR GAGNÉ cumulé
// (stores/player.js), pas un score composite recalculé : c'est la seule
// valeur que le joueur voit monter en continu.
//
// Contrairement à la v1, ce store PERSISTE quelque chose : les trois rivaux
// de la saison et la date de son début. Ils ne peuvent pas être re-dérivés à
// la volée, puisque leur allure est calée une seule fois sur le débit du
// joueur au début de la saison — c'est précisément ce qui rend le
// dépassement possible quand il progresse ensuite.
import { defineStore } from 'pinia';
import { RANKINGS } from '../data/economy.js';
import { buildLeaderboard, generateSeasonRivals } from '../engine/rankings.js';
import { currentSeasonKey } from './meta.js';
import { useFarmStore } from './farm.js';
import { usePlayerStore } from './player.js';

const SEASON_MS = RANKINGS.seasonDurationDays * 86_400_000;

// Incrémenter à chaque rééquilibrage qui change l'ordre de grandeur des
// revenus. Les rivaux sont calés UNE SEULE FOIS sur le débit du joueur au
// début de la saison ; après une refonte de l'économie (revenus divisés par
// ~20), les rivaux d'une saison déjà commencée resteraient calibrés sur
// l'ancienne échelle et deviendraient définitivement inatteignables. Ce
// compteur force leur recalibrage sans attendre la fin de la saison.
const BALANCE_VERSION = 2;

export const useRankingsStore = defineStore('rankings', {
  state: () => ({
    seasonKey: null,
    seasonStartedAt: null,
    balanceVersion: BALANCE_VERSION,
    rivals: [],
    // Récompense de la saison écoulée, en attente de réclamation. Jamais
    // créditée automatiquement — même principe que la connexion quotidienne
    // (stores/meta.js) : le joueur doit voir ce qu'il gagne.
    pendingReward: null, // { rang, cristaux, pointsTech, seasonKey }
  }),
  getters: {
    elapsedSeconds: (state) => (state.seasonStartedAt ? Math.max(0, (Date.now() - state.seasonStartedAt) / 1000) : 0),
    secondsLeft: (state) => (state.seasonStartedAt ? Math.max(0, (state.seasonStartedAt + SEASON_MS - Date.now()) / 1000) : SEASON_MS / 1000),
    daysLeft() {
      return Math.ceil(this.secondsLeft / 86_400);
    },
    leaderboard(state) {
      const player = usePlayerStore();
      return buildLeaderboard(state.rivals, this.elapsedSeconds, player.pseudo, player.orGagneSaison);
    },
    seasonRank() {
      return this.leaderboard.find((e) => e.isPlayer)?.rang ?? null;
    },
    // Écart avec le concurrent juste devant, et temps estimé pour le
    // rattraper au débit actuel. C'est la seule information du tableau sur
    // laquelle le joueur peut agir : sans elle il voit un rang, pas un
    // objectif.
    nextTarget(state) {
      const board = this.leaderboard;
      const i = board.findIndex((e) => e.isPlayer);
      if (i <= 0) return null; // déjà premier, ou joueur introuvable
      const ahead = board[i - 1];
      const gap = ahead.score - board[i].score;
      const rival = state.rivals.find((r) => r.nom === ahead.nom);
      const myRate = useFarmStore().ratePerSecond;
      // On ne rattrape que si on produit plus vite que lui.
      const closing = myRate - (rival?.ratePerSecond ?? 0);
      return {
        nom: ahead.nom,
        rang: ahead.rang,
        gap,
        secondsToCatch: closing > 0 ? gap / closing : null,
      };
    },
    // Ce que le joueur toucherait si la saison se terminait maintenant.
    currentReward() {
      const rank = this.seasonRank;
      return rank ? (RANKINGS.seasonRewards[rank - 1] ?? RANKINGS.seasonRewards.at(-1)) : null;
    },
  },
  actions: {
    // Appelée au montage de l'app et à l'ouverture de l'onglet Classement.
    // Démarre la saison courante si besoin, et clôture la précédente.
    syncSeason() {
      const key = currentSeasonKey();
      const stale = this.balanceVersion !== BALANCE_VERSION;
      if (this.seasonKey === key && this.rivals.length && !stale) return;

      const player = usePlayerStore();
      // Recalibrage après refonte de l'économie : on garde la saison en cours
      // et les gains du joueur, on ne remplace QUE les rivaux. Clôturer la
      // saison serait injuste (le joueur perdrait sa progression), et la
      // laisser telle quelle la rendrait injouable.
      if (stale && this.seasonKey === key && this.rivals.length) {
        this.balanceVersion = BALANCE_VERSION;
        this.rivals = generateSeasonRivals(`season:${key}`, useFarmStore().ratePerSecond);
        return;
      }
      if (this.seasonKey && this.rivals.length) {
        // Clôture : on fige le rang atteint AVANT de remettre les compteurs
        // à zéro, sinon le classement final serait calculé sur une saison
        // déjà vidée.
        const rank = this.seasonRank ?? RANKINGS.seasonRewards.length;
        const reward = RANKINGS.seasonRewards[rank - 1] ?? RANKINGS.seasonRewards.at(-1);
        this.pendingReward = { rang: rank, seasonKey: this.seasonKey, ...reward };
      }

      const farm = useFarmStore();
      this.seasonKey = key;
      this.seasonStartedAt = Date.now();
      this.balanceVersion = BALANCE_VERSION;
      this.rivals = generateSeasonRivals(`season:${key}`, farm.ratePerSecond);
      player.resetSeasonEarnings();
    },
    claimSeasonReward() {
      if (!this.pendingReward) return null;
      const { cristaux, pointsTech, rang } = this.pendingReward;
      usePlayerStore().creditMany({ cristaux, pointsTech });
      this.pendingReward = null;
      return { rang, cristaux, pointsTech };
    },
  },
  persist: true,
});
