// Événement hebdomadaire (engine/events.js). Ne PERSISTE rien : l'événement
// est entièrement déterministe par semaine, donc toujours recalculable — le
// store n'existe que pour exposer le résultat réactif aux vues et servir de
// point de résolution du "booster événement".
import { defineStore } from 'pinia';
import { currentEvent } from '../engine/events.js';
import { MONUMENTS } from '../data/monuments.js';

export const useEventsStore = defineStore('events', {
  state: () => ({
    // Rafraîchi par un getter recalculé ; on garde un `now` pour que le
    // compte à rebours de fin d'événement soit réactif si une vue le pousse.
    now: Date.now(),
  }),
  getters: {
    current(state) {
      return currentEvent(MONUMENTS, state.now);
    },
    booster() {
      return this.current.booster;
    },
    daysLeft(state) {
      return Math.max(1, Math.ceil((this.current.endsAt - state.now) / 86_400_000));
    },
  },
  actions: {
    tick() {
      this.now = Date.now();
    },
  },
});
