// Monuments possédés + ouverture de boosters (brief §8/§9) + fusion des
// doublons (brief §11). Un booster donne toujours UN SEUL monument.
import { defineStore } from 'pinia';
import { BOOSTERS } from '../data/boosters.js';
import { SETS } from '../data/sets.js';
import { EPOQUES, MONUMENTS, REGIONS, SCORED_MONUMENTS, monumentDef } from '../data/monuments.js';
import { BOOSTER_COST_GROWTH, LEVELING } from '../data/economy.js';
import { openBooster } from '../engine/gacha.js';
import { canFuse, fuse } from '../engine/fusion.js';
import { ameliorationCost, canAmeliorer } from '../engine/upgrades.js';
import { createRng, freshSeed } from '../engine/rng.js';
import { useMetaStore } from './meta.js';
import { useMissionsStore } from './missions.js';
import { usePlayerStore } from './player.js';
import { useTreesStore } from './trees.js';
import { useEventsStore } from './events.js';
import { usePrestigeStore } from './prestige.js';

export const useCollectionStore = defineStore('collection', {
  state: () => ({
    // { [monumentId]: { niveau, doublons } }
    owned: {},
    newlyAcquired: [],
    // { [boosterId]: nombre déjà acheté } — fait grimper le coût à chaque
    // achat du même palier (cf. data/economy.js#BOOSTER_COST_GROWTH).
    boostersPurchased: {},
  }),
  getters: {
    // Ne compte que les raretés scorées : un secret trouvé ne doit pas
    // afficher "13/12" (cf. data/rarity.js#SCORED_RARITIES).
    ownedCount: (state) => SCORED_MONUMENTS.filter((m) => state.owned[m.id]).length,
    secretsOwned: (state) => MONUMENTS.filter((m) => m.rarete === 'secret' && state.owned[m.id]).length,
    secretsTotal: () => MONUMENTS.filter((m) => m.rarete === 'secret').length,
    isOwned: (state) => (id) => Boolean(state.owned[id]),
    ownedEntry: (state) => (id) => state.owned[id] ?? null,
    isNew: (state) => (id) => state.newlyAcquired.includes(id),
    canFuse: (state) => (id) => canFuse(state.owned[id]),
    // Améliorations par monument (puits d'Or dédié, engine/upgrades.js).
    ameliorationCost: (state) => (id) => {
      const def = monumentDef(id);
      const entry = state.owned[id];
      if (!def || !entry) return null;
      return ameliorationCost(def.rarete, entry.ameliorations ?? 0);
    },
    canAmeliorer: (state) => (id) => {
      const entry = state.owned[id];
      return Boolean(entry) && canAmeliorer(entry.ameliorations ?? 0);
    },
    totalCollectionValue: (state) => {
      let total = 0;
      for (const [id, entry] of Object.entries(state.owned)) {
        const def = monumentDef(id);
        if (def) total += def.valeurCollection * (1 + 0.25 * (entry.niveau - 1));
      }
      return Math.round(total);
    },
    // Collections régionales/historiques (brief §10) : compléter une
    // région/époque donne un bonus de revenu. Région -> bonus limité aux
    // monuments de cette région ; époque -> bonus global (exemples du
    // brief : Europe complète = +10% revenus européens, Antiquité
    // complète = +5% revenus globaux).
    regionCompletion(state) {
      const result = {};
      for (const region of REGIONS) {
        const monuments = SCORED_MONUMENTS.filter((m) => m.region === region);
        const owned = monuments.filter((m) => state.owned[m.id]).length;
        // `total > 0 &&` : une région sans aucun monument dans le
        // catalogue actuel ne doit jamais compter comme "complétée"
        // (0 possédé === 0 total serait vrai sans cette garde) — cas
        // réel depuis la réduction du catalogue à 12 monuments, certaines
        // régions/époques n'ont plus aucune entrée.
        result[region] = { owned, total: monuments.length, complete: monuments.length > 0 && owned === monuments.length };
      }
      return result;
    },
    epoqueCompletion(state) {
      const result = {};
      for (const epoque of EPOQUES) {
        const monuments = SCORED_MONUMENTS.filter((m) => m.epoque === epoque);
        const owned = monuments.filter((m) => state.owned[m.id]).length;
        result[epoque] = { owned, total: monuments.length, complete: monuments.length > 0 && owned === monuments.length };
      }
      return result;
    },
    // État de chaque set thématique (data/sets.js) : possédés / total et
    // complet. Les secrets ne peuvent pas figurer dans un set (aucun set n'en
    // liste), donc rien à exclure ici.
    setsCompletion(state) {
      return SETS.map((set) => {
        const owned = set.monumentIds.filter((id) => state.owned[id]).length;
        return { ...set, owned, total: set.monumentIds.length, complete: owned === set.monumentIds.length };
      });
    },
    // Bonus permanent cumulé des sets complétés — s'ajoute au bonus global.
    setsBonusPct() {
      return this.setsCompletion.filter((s) => s.complete).reduce((sum, s) => sum + s.bonusPct, 0);
    },
    globalCollectionBonusPct() {
      const completedEpoques = Object.values(this.epoqueCompletion).filter((e) => e.complete).length;
      return completedEpoques * 5 + this.setsBonusPct;
    },
    regionBonusPct() {
      const bonuses = {};
      for (const [region, c] of Object.entries(this.regionCompletion)) {
        bonuses[region] = c.complete ? 10 : 0;
      }
      return bonuses;
    },
    bonusPctForMonument() {
      return (def) => this.globalCollectionBonusPct + (this.regionBonusPct[def.region] ?? 0);
    },
  },
  actions: {
    // Monument offert au tout premier lancement d'une partie. Sans lui, un
    // nouveau joueur démarre à 0 Or/s : la Farm ne produit rien tant qu'il
    // n'a pas ouvert un booster ET placé le résultat, ce qui est le vrai mur
    // du début de partie ("le jeu est un peu dur a commencer"). On donne un
    // Peu commun et non un Commun pour que la Farm démarre à un débit qui se
    // voit, sans pour autant offrir une carte rare.
    accorderMonumentDeDepart() {
      if (Object.keys(this.owned).length > 0) return null;
      const pool = SCORED_MONUMENTS.filter((m) => m.rarete === 'peu_commun');
      if (pool.length === 0) return null;
      const meta = useMetaStore();
      const rng = createRng(freshSeed(meta.nextNonce()));
      const def = rng.pick(pool);
      this.owned[def.id] = { niveau: 1, doublons: 0, ameliorations: 0 };
      this.newlyAcquired.push(def.id);
      return def;
    },
    clearNewlyAcquired() {
      this.newlyAcquired = [];
    },
    // Améliore un monument contre de l'Or (puits d'Or dédié). Le coût grimpe
    // avec le niveau d'amélioration et la puissance de rareté du monument.
    ameliorer(id) {
      const entry = this.owned[id];
      const def = monumentDef(id);
      if (!entry || !def || !canAmeliorer(entry.ameliorations ?? 0)) return false;
      const cost = ameliorationCost(def.rarete, entry.ameliorations ?? 0);
      if (!usePlayerStore().debit('or', cost)) return false;
      entry.ameliorations = (entry.ameliorations ?? 0) + 1;
      return true;
    },
    _addOrIncrementDoublon(defId) {
      if (this.owned[defId]) {
        this.owned[defId].doublons += 1;
        return { defId, duplicate: true };
      }
      this.owned[defId] = { niveau: 1, doublons: 0, ameliorations: 0 };
      this.newlyAcquired.push(defId);
      const def = monumentDef(defId);
      if (def && (this.regionCompletion[def.region]?.complete || this.epoqueCompletion[def.epoque]?.complete)) {
        useMissionsStore().trackEvent('collectionCompleted', 1);
      }
      return { defId, duplicate: false };
    },
    // Un booster est soit un des trois statiques, soit le booster événement
    // de la semaine (résolu depuis le store events). Tout le reste du flux
    // (coût croissant, tirage, XP) est identique.
    _booster(boosterId) {
      if (boosterId === 'event') return useEventsStore().booster;
      return BOOSTERS[boosterId] ?? null;
    },
    boosterCost(boosterId) {
      const booster = this._booster(boosterId);
      if (!booster) return null;
      const trees = useTreesStore();
      const reduction = trees.treeBonuses.boosterCostReductionPct ?? 0;
      const purchased = this.boostersPurchased[boosterId] ?? 0;
      const escalated = booster.cout * BOOSTER_COST_GROWTH ** purchased;
      return Math.max(1, Math.round(escalated * (1 - reduction / 100)));
    },
    // Coût total pour `quantity` ouvertures d'affilée, en simulant la
    // progression du coût croissant SANS muter l'état (pur, pour affichage
    // uniquement) — chaque achat successif part du palier déjà atteint.
    estimateBulkCost(boosterId, quantity) {
      const booster = this._booster(boosterId);
      if (!booster) return 0;
      const trees = useTreesStore();
      const reduction = trees.treeBonuses.boosterCostReductionPct ?? 0;
      const purchased = this.boostersPurchased[boosterId] ?? 0;
      let total = 0;
      for (let i = 0; i < quantity; i += 1) {
        const escalated = booster.cout * BOOSTER_COST_GROWTH ** (purchased + i);
        total += Math.max(1, Math.round(escalated * (1 - reduction / 100)));
      }
      return total;
    },
    // Tire un seul monument sans débiter ni journaliser — brique commune à
    // ouvrirBooster (x1, journalisé individuellement) et ouvrirBoosters
    // (bulk, un seul journal groupé pour ne pas noyer le fil d'activité de
    // 20 entrées max sous 100 lignes identiques).
    _pullOne(boosterId) {
      const booster = this._booster(boosterId);
      const trees = useTreesStore();
      const meta = useMetaStore();
      const rng = createRng(freshSeed(meta.nextNonce()));
      // La chance de rareté combine le bonus d'arbre (Booster) et le perk de
      // prestige permanent « Œil du collectionneur » (engine/prestige.js).
      const luck = (trees.treeBonuses.rarityLuckPct ?? 0) + usePrestigeStore().perkLuckPct;
      const pull = openBooster(rng, booster, luck);
      const result = this._addOrIncrementDoublon(pull.id);
      usePlayerStore().addXp(LEVELING.xpPerBooster);
      useMissionsStore().trackEvent('boosterOpened', 1);
      return { def: pull, duplicate: result.duplicate };
    },
    ouvrirBooster(boosterId) {
      const booster = this._booster(boosterId);
      if (!booster) return null;
      const player = usePlayerStore();
      const cost = this.boosterCost(boosterId);
      if (!player.debit('or', cost)) return null;
      this.boostersPurchased[boosterId] = (this.boostersPurchased[boosterId] ?? 0) + 1;

      const result = this._pullOne(boosterId);

      return result;
    },
    // Ouverture groupée (x5/x10/x100, retour utilisateur : "un bouton pour
    // ouvrir 5 ou 10 booster aussi c'est pas mal voir 100 aussi"). S'arrête
    // net dès que l'Or manque plutôt que d'exiger le coût total d'avance,
    // pour laisser un joueur "presque assez riche" quand même ouvrir ce
    // qu'il peut.
    ouvrirBoosters(boosterId, quantity) {
      const booster = this._booster(boosterId);
      if (!booster) return [];
      const player = usePlayerStore();
      const results = [];
      let totalCost = 0;
      for (let i = 0; i < quantity; i += 1) {
        const cost = this.boosterCost(boosterId);
        if (!player.debit('or', cost)) break;
        this.boostersPurchased[boosterId] = (this.boostersPurchased[boosterId] ?? 0) + 1;
        totalCost += cost;
        results.push(this._pullOne(boosterId));
      }
      return results;
    },
    // Fusionne tout ce qui est fusionnable, en repassant tant qu'une fusion
    // en débloque une autre : trois doublons de niveau 1 donnent un niveau 2,
    // et trois niveaux 2 donnent un niveau 3 — s'arrêter après un seul tour
    // laisserait des fusions évidentes non faites. Avec 35 monuments, le
    // faire fiche par fiche est fastidieux.
    fusionnerTout() {
      let total = 0;
      let encore = true;
      while (encore) {
        encore = false;
        for (const id of Object.keys(this.owned)) {
          if (!this.canFuse(id)) continue;
          if (this.fusionner(id)) {
            total += 1;
            encore = true;
          }
        }
      }
      return total;
    },
    fusionner(monumentId) {
      const entry = this.owned[monumentId];
      const result = fuse(entry);
      if (!result) return false;
      this.owned[monumentId] = result;

      const player = usePlayerStore();
      player.addXp(LEVELING.xpPerFusion);
      useMissionsStore().trackEvent('monumentFused', 1);
      return true;
    },
  },
  persist: true,
});

export { MONUMENTS, SCORED_MONUMENTS, monumentDef };
