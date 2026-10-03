// Timestamps et compteurs transverses : dernière session (revenus Farm
// hors-ligne), streak de connexion, saison de classement en cours, nonce
// pour les tirages non rejouables (boosters).
import { defineStore } from 'pinia';
import { RANKINGS, STREAK } from '../data/economy.js';
import { usePlayerStore } from './player.js';
import { useTreesStore } from './trees.js';

function localDateKey(date = new Date()) {
  const tz = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - tz).toISOString().slice(0, 10);
}

function daysBetween(fromKey, toKey) {
  const from = new Date(`${fromKey}T00:00:00Z`);
  const to = new Date(`${toKey}T00:00:00Z`);
  return Math.round((to - from) / 86_400_000);
}

// Semaine ISO de saison (30 jours) : clé stable tout le mois, comme
// l'ancien reset hebdomadaire de ladder.
export function currentSeasonKey(date = new Date()) {
  const start = new Date(Date.UTC(2026, 0, 1)); // ancre arbitraire fixe
  const days = Math.floor((date - start) / 86_400_000);
  const season = Math.floor(days / RANKINGS.seasonDurationDays);
  return `S${season}`;
}

export const useMetaStore = defineStore('meta', {
  state: () => ({
    lastSeen: Date.now(),
    lastLoginDate: null,
    streakCount: 0,
    rngNonce: 0,
  }),
  getters: {
    canClaimStreak: (state) => state.lastLoginDate !== localDateKey(),
    pendingStreakDay(state) {
      if (!state.canClaimStreak) return state.streakCount || 1;
      const today = localDateKey();
      const gap = state.lastLoginDate ? daysBetween(state.lastLoginDate, today) : null;
      const consecutive = gap !== null && gap - 1 <= STREAK.toleranceDays;
      const day = consecutive ? state.streakCount + 1 : 1;
      return Math.min(day, STREAK.maxDay);
    },
    pendingStreakReward() {
      const trees = useTreesStore();
      const bonusPct = trees.treeBonuses.streakRewardPct ?? 0;
      const or = Math.round(STREAK.rewardOrPerDay * this.pendingStreakDay * (1 + bonusPct / 100));
      const cristaux = this.pendingStreakDay >= STREAK.crystalDay ? STREAK.crystalReward : 0;
      return { or, cristaux };
    },
  },
  actions: {
    touchLastSeen() {
      this.lastSeen = Date.now();
    },
    nextNonce() {
      this.rngNonce += 1;
      return this.rngNonce;
    },
    claimStreak() {
      if (!this.canClaimStreak) return null;
      const day = this.pendingStreakDay;
      const reward = this.pendingStreakReward;
      this.streakCount = day;
      this.lastLoginDate = localDateKey();
      usePlayerStore().creditMany(reward);
      return { day, reward };
    },
  },
  persist: true,
});
