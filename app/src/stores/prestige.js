// Prestige (brief §18) : reset une partie de la progression contre un bonus
// permanent croissant, infini. Les Cristaux premium (monnaie "réelle") ne sont
// jamais réinitialisés par un prestige.
//
// Approfondi (profondeur économique) d'une méta-progression : chaque prestige
// crédite de la RENOMMÉE (jamais réinitialisée), dépensée dans un arbre de
// PERKS PERMANENTS (data/prestigePerks.js) qui survivent aux prestiges
// suivants. C'est ce qui donne une raison de prestiger au-delà du +5%/reset.
import { defineStore } from 'pinia';
import { PRESTIGE } from '../data/economy.js';
import { PRESTIGE_PERKS } from '../data/prestigePerks.js';
import {
  meetsPrestigeRequirement,
  prestigeBonusPct,
  perkEffects,
  perkNextCost,
  renommeeGain,
} from '../engine/prestige.js';
import { monumentEffectiveRevenue } from '../engine/farm.js';
import { monumentDef } from '../data/monuments.js';
import { useCollectionStore } from './collection.js';
import { useFarmStore } from './farm.js';
import { usePlayerStore } from './player.js';
import { useTreesStore } from './trees.js';
import { useExpeditionsStore } from './expeditions.js';

export const usePrestigeStore = defineStore('prestige', {
  state: () => ({
    count: 0,
    // Renommée disponible + niveaux de perks achetés ({ [perkId]: niveau }).
    // Jamais réinitialisés (ni par un prestige, ni par autre chose que la
    // suppression du compte).
    renommee: 0,
    perks: {},
  }),
  getters: {
    // Effets agrégés de tous les perks possédés.
    effects: (state) => perkEffects(state.perks),
    // Bonus de revenu = part liée au nombre de prestiges + part permanente du
    // perk « Rente impériale ». Consommé par la Farm (stores/farm.js).
    bonusPct(state) {
      return prestigeBonusPct(state.count) + this.effects.revenuPct;
    },
    nextBonusPct(state) {
      return prestigeBonusPct(state.count + 1) + this.effects.revenuPct;
    },
    // Exposés aux stores qui appliquent les effets ailleurs qu'à la Farm.
    perkLuckPct() {
      return this.effects.luckPct;
    },
    perkOfflineCapPct() {
      return this.effects.offlineCapPct;
    },
    canPrestige() {
      const player = usePlayerStore();
      const collection = useCollectionStore();
      return meetsPrestigeRequirement(player.niveauJoueur, collection.ownedCount);
    },
    // Renommée que le prochain prestige rapporterait (aperçu pour l'UI).
    renommeePreview() {
      return renommeeGain(useCollectionStore().ownedCount);
    },
    // Helpers d'UI pour l'arbre de perks.
    perkLevel: (state) => (id) => state.perks[id] ?? 0,
    perkCost: (state) => (id) => perkNextCost(id, state.perks[id] ?? 0),
    canBuyPerk(state) {
      return (id) => {
        const cost = perkNextCost(id, state.perks[id] ?? 0);
        return cost != null && state.renommee >= cost;
      };
    },
  },
  actions: {
    acheterPerk(id) {
      const cost = perkNextCost(id, this.perks[id] ?? 0);
      if (cost == null || this.renommee < cost) return false;
      this.renommee -= cost;
      this.perks[id] = (this.perks[id] ?? 0) + 1;
      return true;
    },
    faireLePrestige() {
      if (!this.canPrestige) return this.count;
      const collection = useCollectionStore();
      const player = usePlayerStore();

      // Renommée gagnée AVANT le reset (dépend des monuments possédés).
      this.renommee += renommeeGain(collection.ownedCount);

      // Perk « Héritage » : on met de côté les N monuments au plus fort revenu
      // effectif de base AVANT le reset, pour les restaurer après. Clonés pour
      // survivre au $reset du store collection.
      const keepCount = this.effects.keepMonuments;
      const kept =
        keepCount > 0
          ? Object.entries(collection.owned)
              .map(([id, entry]) => ({ id, entry: { ...entry }, def: monumentDef(id) }))
              .filter((m) => m.def)
              .sort((a, b) => monumentEffectiveRevenue(b.entry, b.def) - monumentEffectiveRevenue(a.entry, a.def))
              .slice(0, keepCount)
          : [];

      this.count += 1;
      collection.$reset();
      useFarmStore().$reset();
      useTreesStore().$reset();
      // Les expéditions en cours font partie de la "run" remise à zéro : sans
      // ça, elles survivraient en référençant des monuments que la collection
      // ne possède plus (orphelines, réclamables sans récompense).
      useExpeditionsStore().$reset();

      for (const k of kept) collection.owned[k.id] = k.entry;

      player.niveauJoueur = 1;
      player.xp = 0;
      // Perk « Trésor de guerre » : pécule d'Or de départ après le reset.
      player.resources.or = PRESTIGE.resetOr + this.effects.startOr;
      player.resources.pointsTech = 0;
      return this.count;
    },
  },
  persist: true,
});

export { PRESTIGE_PERKS };
