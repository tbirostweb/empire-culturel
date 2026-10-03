// Emplacements actifs (brief §12) : les monuments placés ici génèrent de
// l'Or en continu. 2 slots au départ, extensible via l'arbre technologique.
//
// Modèle d'emplacements À POSITION STABLE (`slots` = tableau [id|null] indexé
// par emplacement, pas une liste compacte) : c'est indispensable pour la
// SPÉCIALISATION d'emplacement (data/economy.js#SLOT_SPEC), qui lie une région
// de prédilection à un emplacement précis. Avec une liste compacte, retirer un
// monument décalait tous les suivants et la spécialisation aurait "glissé"
// d'un emplacement à l'autre. `slotSpecs` est parallèle à `slots`.
import { defineStore } from 'pinia';
import { SLOT_SPEC } from '../data/economy.js';
import { monumentDef } from '../data/monuments.js';
import { farmRatePerSecond, farmSlotCount, monumentEffectiveRevenue, offlineEarnings } from '../engine/farm.js';
import { useCollectionStore } from './collection.js';
import { useMetaStore } from './meta.js';
import { useMissionsStore } from './missions.js';
import { usePlayerStore } from './player.js';
import { usePrestigeStore } from './prestige.js';
import { useTreesStore } from './trees.js';

export const useFarmStore = defineStore('farm', {
  state: () => ({
    slots: [], // [monumentId | null], indexé par emplacement (position stable)
    slotSpecs: [], // [region | null], parallèle à slots
  }),
  getters: {
    slotCount() {
      return farmSlotCount(useTreesStore().treeBonuses);
    },
    // Vues normalisées de longueur `slotCount` : comblent les trous par null et
    // ignorent tout débordement si le nombre d'emplacements a diminué.
    paddedSlots(state) {
      const n = this.slotCount;
      return Array.from({ length: n }, (_, i) => state.slots[i] ?? null);
    },
    specs(state) {
      const n = this.slotCount;
      return Array.from({ length: n }, (_, i) => state.slotSpecs[i] ?? null);
    },
    // Liste compacte des ids placés — conservée pour les appelants qui ne se
    // soucient pas des positions (comptage, "possède et placé ?").
    active(state) {
      return state.slots.filter(Boolean);
    },
    placedCount() {
      return this.active.length;
    },
    isFull() {
      return this.placedCount >= this.slotCount;
    },
    isPlaced: (state) => (id) => state.slots.includes(id),
    slotSpec: (state) => (index) => state.slotSpecs[index] ?? null,
    ratePerSecond() {
      const collection = useCollectionStore();
      const trees = useTreesStore();
      const prestige = usePrestigeStore();
      return farmRatePerSecond(
        this.paddedSlots,
        this.specs,
        collection.owned,
        monumentDef,
        trees.treeBonuses,
        prestige.bonusPct,
        collection.bonusPctForMonument,
      );
    },
  },
  actions: {
    _ensureLen(key, n) {
      while (this[key].length < n) this[key].push(null);
    },
    placer(monumentId) {
      const collection = useCollectionStore();
      if (!collection.isOwned(monumentId) || this.isPlaced(monumentId) || this.isFull) return false;
      const n = this.slotCount;
      this._ensureLen('slots', n);
      // Premier emplacement libre dans la plage active.
      const idx = this.slots.findIndex((s, i) => i < n && !s);
      if (idx === -1) return false;
      this.slots[idx] = monumentId;
      return true;
    },
    retirer(monumentId) {
      const idx = this.slots.indexOf(monumentId);
      if (idx !== -1) this.slots[idx] = null;
    },
    // Spécialise un emplacement vers une région (puits de Points techno), ou la
    // retire (region == null, gratuit). Ne repaie pas si la région est déjà en
    // place.
    specialiser(index, region) {
      if (index < 0 || index >= this.slotCount) return false;
      this._ensureLen('slotSpecs', this.slotCount);
      if (region == null) {
        this.slotSpecs[index] = null;
        return true;
      }
      if (this.slotSpecs[index] === region) return true;
      if (!usePlayerStore().debit('pointsTech', SLOT_SPEC.cost)) return false;
      this.slotSpecs[index] = region;
      return true;
    },
    // "Placer les meilleurs" : remplit les emplacements avec les monuments
    // possédés au plus fort revenu effectif. Classe sur le revenu RÉEL (niveau
    // de fusion + amélioration + bonus d'arbre/prestige/collection compris, via
    // engine/farm.js#monumentEffectiveRevenue), pas sur la rareté seule : un
    // Rare monté peut rapporter plus qu'un Épique niveau 1. Les
    // spécialisations d'emplacement (positionnelles) sont CONSERVÉES.
    placerLesMeilleurs() {
      const collection = useCollectionStore();
      const trees = useTreesStore();
      const prestige = usePrestigeStore();
      const n = this.slotCount;
      const best = Object.keys(collection.owned)
        .map((id) => ({ id, def: monumentDef(id), entry: collection.owned[id] }))
        .filter((m) => m.def)
        .map((m) => ({
          id: m.id,
          revenue: monumentEffectiveRevenue(m.entry, m.def, trees.treeBonuses, prestige.bonusPct, collection.bonusPctForMonument(m.def)),
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, n)
        .map((m) => m.id);
      const newSlots = Array.from({ length: n }, (_, i) => best[i] ?? null);
      const changed = this.paddedSlots.some((id, i) => id !== newSlots[i]);
      this.slots = newSlots;
      return changed;
    },
    // À appeler à chaque montage de l'app (App.vue) : crédite le revenu
    // généré pendant l'absence, plafonné (data/economy.js#FARM.offlineCapHours,
    // étendu par l'arbre technologique et le perk de prestige « Intendance »).
    collecterHorsLigne() {
      const meta = useMetaStore();
      const now = Date.now();
      const trees = useTreesStore();
      const bonuses = {
        ...trees.treeBonuses,
        offlineCapPct: (trees.treeBonuses.offlineCapPct ?? 0) + usePrestigeStore().perkOfflineCapPct,
      };
      const result = offlineEarnings(this.ratePerSecond, meta.lastSeen, now, bonuses);
      meta.touchLastSeen();
      if (result.or > 0) {
        usePlayerStore().credit('or', result.or);
        useMissionsStore().trackEvent('goldEarned', result.or);
      }
      return result;
    },
  },
  persist: true,
});
