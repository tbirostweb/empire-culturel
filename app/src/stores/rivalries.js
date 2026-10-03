// Duel hebdomadaire (mécanique "rivalités actives"). PERSISTE : le duel en
// cours (rival, cible, snapshot de l'Or du joueur au départ) et le palmarès
// (victoires/défaites/série). Comme la saison de classement, la cible du rival
// est calée une seule fois au début du duel et ne peut pas être re-dérivée à
// la volée.
//
// Le score du joueur est mesuré par DIFFÉRENCE de `player.orGagneTotal` (or
// cumulé, monotone, jamais décrémenté) entre le début du duel et maintenant —
// donc l'Or de la Farm, des expéditions ET des missions compte, puisque tout
// passe par player.credit('or').
import { defineStore } from 'pinia';
import { currentDuelWindow, pickRival, rivalTargetForWindow, duelReward } from '../engine/rivalries.js';
import { DUEL, rivalById } from '../data/rivalries.js';
import { useFarmStore } from './farm.js';
import { usePlayerStore } from './player.js';

export const useRivalriesStore = defineStore('rivalries', {
  state: () => ({
    week: null,
    // Instant où le duel a démarré pour ce joueur (l'inscription au duel de la
    // semaine, pas forcément le lundi). Le rival et le joueur courent la
    // fenêtre [startedAt, endsAt].
    startedAt: null,
    endsAt: null,
    rivalId: null,
    rivalRate: 0,
    rivalTarget: 0,
    difficulty: 1,
    // Snapshot de player.orGagneTotal à l'instant où le duel a démarré.
    playerStartOr: 0,
    record: { wins: 0, losses: 0, streak: 0 },
    // Récompense d'un duel gagné, en attente de réclamation manuelle (même
    // principe que la saison et la connexion quotidienne).
    pendingReward: null, // { rivalNom, cristaux, pointsTech, streak }
    // Dernier résultat, pour l'afficher une fois ("gagné/perdu contre X").
    lastResult: null, // { won, rivalNom, playerScore, rivalTarget }
  }),
  getters: {
    rival: (state) => rivalById(state.rivalId),
    hasDuel: (state) => state.rivalId != null && state.endsAt != null,
    // Or gagné par le joueur DEPUIS le début du duel. Réactif : orGagneTotal
    // change à chaque tick de Farm, donc ce getter se recalcule en direct.
    // Les valeurs qui dépendent de l'HORLOGE (score live du rival, compte à
    // rebours) ne sont volontairement PAS des getters : un getter Pinja ne
    // se recalcule que si une dépendance RÉACTIVE change, or Date.now() n'en
    // est pas une — ils resteraient figés. La vue les recalcule depuis un
    // `now` local rafraîchi à la seconde (cf. RankingsView), à partir des
    // champs bruts exposés ici (rivalRate, rivalTarget, weekStartsAt, endsAt).
    playerScore(state) {
      return Math.max(0, Math.round(usePlayerStore().orGagneTotal - state.playerStartOr));
    },
    // Cible déjà atteinte : la victoire est acquise même si le rival "produit"
    // encore jusqu'à la fin de la semaine (il est plafonné à sa cible).
    targetReached() {
      return this.playerScore >= this.rivalTarget;
    },
    // Récompense que le joueur toucherait s'il gagne ce duel (série +1).
    potentialReward(state) {
      if (!this.hasDuel) return null;
      return duelReward(state.difficulty, state.record.streak + 1);
    },
  },
  actions: {
    // Appelée au montage de l'app (après le rattrapage hors-ligne, pour que
    // l'Or gagné pendant l'absence compte dans le duel courant) et à
    // l'ouverture de l'onglet Classement. Idempotente dans une même semaine.
    syncDuel() {
      const win = currentDuelWindow();
      if (this.week === win.week) return; // semaine déjà traitée

      // 1) Clôture du duel précédent, s'il y en avait un d'actif.
      if (this.rivalId != null && this.endsAt != null) {
        const finalScore = this.playerScore;
        const won = finalScore >= this.rivalTarget;
        const nom = this.rival?.nom ?? 'Rival';
        if (won) {
          this.record.wins += 1;
          this.record.streak += 1;
          const reward = duelReward(this.difficulty, this.record.streak);
          this.pendingReward = { rivalNom: nom, ...reward, streak: this.record.streak };
        } else {
          this.record.losses += 1;
          this.record.streak = 0;
        }
        this.lastResult = { won, rivalNom: nom, playerScore: finalScore, rivalTarget: this.rivalTarget };
      }

      // 2) Démarrage du duel de la nouvelle semaine — sauf s'il reste trop peu
      // de temps (on ne lance pas un duel d'une heure ; le joueur reprend la
      // semaine suivante).
      this.week = win.week;
      const startedAt = Date.now();
      const remainingMs = win.endsAt - startedAt;
      if (remainingMs < DUEL.minWindowMs) {
        this.rivalId = null;
        this.endsAt = null;
        return;
      }
      const player = usePlayerStore();
      const chosen = pickRival(win.week);
      const { rate, target } = rivalTargetForWindow(
        useFarmStore().ratePerSecond,
        chosen.difficulty,
        remainingMs / 1000,
      );
      this.startedAt = startedAt;
      this.endsAt = win.endsAt;
      this.rivalId = chosen.id;
      this.rivalRate = rate;
      this.rivalTarget = target;
      this.difficulty = chosen.difficulty;
      this.playerStartOr = player.orGagneTotal;
    },
    claimReward() {
      if (!this.pendingReward) return null;
      const { cristaux, pointsTech, rivalNom, streak } = this.pendingReward;
      usePlayerStore().creditMany({ cristaux, pointsTech });
      this.pendingReward = null;
      return { cristaux, pointsTech, rivalNom, streak };
    },
    // Le joueur a lu le dernier résultat ; on l'efface pour ne pas le
    // ré-afficher à chaque ouverture.
    dismissLastResult() {
      this.lastResult = null;
    },
  },
  persist: true,
});
