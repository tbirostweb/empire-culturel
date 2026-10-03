// Identité, 3 ressources, niveau joueur (brief §14/§15). Seul store
// autorisé à modifier les ressources (pas d'équivalent "wallet.js" séparé
// — app 100% client-only, pas de ledger serveur à tenir cohérent).
import { defineStore } from 'pinia';
import { LEVELING } from '../data/economy.js';

function xpToNextLevel(niveau) {
  return LEVELING.xpBase + (niveau - 1) * LEVELING.xpPerLevel;
}

export const usePlayerStore = defineStore('player', {
  state: () => ({
    pseudo: 'Collectionneur',
    niveauJoueur: 1,
    xp: 0,
    resources: { or: 300, cristaux: 20, pointsTech: 0 },
    // Or CUMULÉ gagné, jamais dépensé/décrémenté — c'est la mesure du
    // classement (stores/rankings.js), qui compare "combien tu as gagné" et
    // non "combien il te reste" : sinon ouvrir des boosters, qui est
    // exactement ce qu'on veut encourager, ferait CHUTER ton rang.
    // `orGagneTotal` survit au prestige (accompli reste accompli),
    // `orGagneSaison` est remis à zéro à chaque nouvelle saison.
    orGagneTotal: 0,
    orGagneSaison: 0,
  }),
  getters: {
    xpForNext: (state) => xpToNextLevel(state.niveauJoueur),
  },
  actions: {
    credit(resource, amount) {
      if (amount <= 0) return;
      this.resources[resource] = Math.round((this.resources[resource] ?? 0) + amount);
      if (resource === 'or') {
        this.orGagneTotal = Math.round(this.orGagneTotal + amount);
        this.orGagneSaison = Math.round(this.orGagneSaison + amount);
      }
    },
    resetSeasonEarnings() {
      this.orGagneSaison = 0;
    },
    creditMany(rewards = {}) {
      for (const [resource, amount] of Object.entries(rewards)) {
        if (amount) this.credit(resource, amount);
      }
    },
    debit(resource, amount) {
      if ((this.resources[resource] ?? 0) < amount) return false;
      this.resources[resource] -= amount;
      return true;
    },
    setPseudo(pseudo) {
      const trimmed = pseudo.trim();
      if (trimmed) this.pseudo = trimmed;
    },
    addXp(amount) {
      this.xp += amount;
      while (this.niveauJoueur < LEVELING.maxLevel && this.xp >= xpToNextLevel(this.niveauJoueur)) {
        this.xp -= xpToNextLevel(this.niveauJoueur);
        this.niveauJoueur += 1;
        this.credit('pointsTech', 3);
      }
    },
  },
  persist: true,
});
