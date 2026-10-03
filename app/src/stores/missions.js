// Missions quotidiennes (brief §16) : tirage déterministe par jour (même
// principe que la boutique du jour de l'ancien jeu), progression suivie
// via `trackEvent()` appelé par les autres stores (collection, farm).
import { defineStore } from 'pinia';
import { MISSION_TEMPLATES } from '../data/missions.js';
import { MISSIONS } from '../data/economy.js';
import { createRng } from '../engine/rng.js';
import { usePlayerStore } from './player.js';

function todayKey() {
  const tz = new Date().getTimezoneOffset() * 60_000;
  return new Date(Date.now() - tz).toISOString().slice(0, 10);
}

export const useMissionsStore = defineStore('missions', {
  state: () => ({
    dayKey: null,
    missions: [], // [{ templateId, progress, claimed }]
  }),
  getters: {
    active(state) {
      return state.missions.map((m) => ({ ...m, template: MISSION_TEMPLATES.find((t) => t.id === m.templateId) }));
    },
  },
  actions: {
    refreshIfNeeded() {
      const today = todayKey();
      if (this.dayKey === today) return;
      const rng = createRng(`missions:${today}`);
      const shuffled = rng.shuffle(MISSION_TEMPLATES);
      this.missions = shuffled.slice(0, MISSIONS.dailyCount).map((t) => ({ templateId: t.id, progress: 0, claimed: false }));
      this.dayKey = today;
    },
    trackEvent(eventName, amount = 1) {
      this.refreshIfNeeded();
      for (const mission of this.missions) {
        const template = MISSION_TEMPLATES.find((t) => t.id === mission.templateId);
        if (template?.trackedEvent === eventName && mission.progress < template.target) {
          mission.progress = Math.min(template.target, mission.progress + amount);
        }
      }
    },
    claim(templateId) {
      const mission = this.missions.find((m) => m.templateId === templateId);
      const template = MISSION_TEMPLATES.find((t) => t.id === templateId);
      if (!mission || !template || mission.claimed || mission.progress < template.target) return false;
      mission.claimed = true;
      usePlayerStore().creditMany({ or: MISSIONS.rewardOr, pointsTech: MISSIONS.rewardPointsTech });
      return true;
    },
  },
  persist: true,
});
