// Orchestration des expéditions (engine/expeditions.js). Persiste les
// expéditions en cours par timestamp de fin — même patron que le rattrapage
// hors-ligne de la Farm : le temps réel fait foi côté client (pas de backend),
// une expédition terminée pendant que l'app était fermée est réclamable au
// retour.
import { defineStore } from 'pinia';
import { EXPEDITIONS, EXPEDITION_SLOTS } from '../data/expeditions.js';
import { expeditionReward } from '../engine/expeditions.js';
import { monumentDef } from '../data/monuments.js';
import { useCollectionStore } from './collection.js';
import { useFarmStore } from './farm.js';
import { usePlayerStore } from './player.js';
import { useMissionsStore } from './missions.js';

export const useExpeditionsStore = defineStore('expeditions', {
  state: () => ({
    // [{ monumentId, expeditionId, startedAt, endsAt }]
    active: [],
  }),
  getters: {
    slotCount: () => EXPEDITION_SLOTS,
    freeSlots(state) {
      return EXPEDITION_SLOTS - state.active.length;
    },
    isOnExpedition: (state) => (monumentId) => state.active.some((e) => e.monumentId === monumentId),
    // Vue enrichie de chaque expédition en cours (def monument, def
    // expédition, état terminé/en cours). Recalculée à la volée.
    ongoing(state) {
      const now = Date.now();
      return state.active.map((e) => {
        const def = monumentDef(e.monumentId);
        const exp = EXPEDITIONS[e.expeditionId];
        return {
          ...e,
          def,
          exp,
          done: now >= e.endsAt,
          remainingMs: Math.max(0, e.endsAt - now),
        };
      });
    },
    // Monuments possédés disponibles pour une expédition : ni déjà en
    // expédition, ni placés en Farm (un monument ne peut pas produire à deux
    // endroits en même temps — sinon l'expédition serait un revenu gratuit).
    available() {
      const collection = useCollectionStore();
      const farmStore = useFarmStore();
      return Object.keys(collection.owned)
        .filter((id) => !this.isOnExpedition(id) && !farmStore.isPlaced(id))
        .map((id) => ({ id, def: monumentDef(id), entry: collection.owned[id] }))
        .filter((m) => m.def);
    },
  },
  actions: {
    lancer(monumentId, expeditionId) {
      const exp = EXPEDITIONS[expeditionId];
      if (!exp || this.active.length >= EXPEDITION_SLOTS) return false;
      if (this.isOnExpedition(monumentId)) return false;
      const collection = useCollectionStore();
      if (!collection.isOwned(monumentId)) return false;
      const now = Date.now();
      this.active.push({ monumentId, expeditionId, startedAt: now, endsAt: now + exp.durationMs });
      return true;
    },
    // Réclamation manuelle (jamais auto-créditée — même principe que la
    // connexion quotidienne et la récompense de saison).
    reclamer(monumentId) {
      const idx = this.active.findIndex((e) => e.monumentId === monumentId);
      if (idx === -1) return null;
      const e = this.active[idx];
      if (Date.now() < e.endsAt) return null;
      const exp = EXPEDITIONS[e.expeditionId];
      const entry = useCollectionStore().owned[monumentId];
      const def = monumentDef(monumentId);
      if (!exp || !entry || !def) {
        this.active.splice(idx, 1);
        return null;
      }
      const reward = expeditionReward(exp, def.rarete, entry.niveau);
      const player = usePlayerStore();
      player.creditMany({ or: reward.or, pointsTech: reward.pointsTech, cristaux: reward.cristaux });
      if (reward.xp) player.addXp(reward.xp);
      useMissionsStore().trackEvent('expeditionDone', 1);
      this.active.splice(idx, 1);
      return { def, exp, reward };
    },
    // Rappel anticipé : on annule sans récompense (le monument redevient
    // disponible). Utile si le joueur veut le placer en Farm avant la fin.
    rappeler(monumentId) {
      this.active = this.active.filter((e) => e.monumentId !== monumentId);
    },
  },
  persist: true,
});
