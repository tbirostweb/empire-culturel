// Duel hebdomadaire (mécanique "rivalités actives") — pur, alimenté par
// engine/rng.js. Déterministe par semaine, comme l'événement (engine/events.js)
// et la saison de classement : sans backend, tout le monde a le même rival la
// même semaine, et le tirage est rejouable.
//
// La CIBLE du rival est calée sur le débit d'Or du joueur au début du duel ×
// la difficulté du rival × la DURÉE RÉELLE du duel (de l'inscription à la fin
// de la semaine), et non une semaine pleine. C'est ce qui rend le duel
// jouable même quand on le rejoint en milieu de semaine : le rival et le
// joueur courent la MÊME fenêtre. Comme la cible et le score du joueur
// s'échelonnent tous deux sur cette fenêtre, sa taille se simplifie —
// l'issue ne dépend que de la difficulté (le joueur doit battre en moyenne
// `débitInitial × difficulté`), pas du moment où l'on rejoint. Un rival < 1
// est donc gagnable en jouant normalement, un rival >= 1 exige d'améliorer sa
// Farm pendant le duel. Le plancher `minWindowMs` (data/rivalries.js) empêche
// le seul cas dégénéré : rejoindre à la dernière minute pour une cible
// dérisoire.
import { createRng } from './rng.js';
import { RIVAL_ROSTER, DUEL } from '../data/rivalries.js';

const WEEK_MS = 7 * 86_400_000;
// Même ancre (un lundi) que engine/events.js : les semaines de duel et
// d'événement sont alignées.
const ANCHOR = Date.UTC(2026, 0, 5);

export function currentDuelWindow(now = Date.now()) {
  const week = Math.floor((now - ANCHOR) / WEEK_MS);
  const startsAt = ANCHOR + week * WEEK_MS;
  return { week, startsAt, endsAt: startsAt + WEEK_MS };
}

// Rival de la semaine : tiré par graine de semaine. Le tirage uniforme suffit
// à faire tourner le roster ; on ne garantit pas "jamais deux fois de suite"
// (avec 5 rivaux, la probabilité est faible et retomber sur un nemesis une
// semaine de plus n'est pas un défaut).
export function pickRival(week) {
  return createRng(`duel:${week}`).pick(RIVAL_ROSTER);
}

// Débit et cible du rival sur la fenêtre réelle du duel. `target` = ce que le
// joueur doit avoir gagné d'ici la fin de la semaine pour l'emporter.
export function rivalTargetForWindow(playerRatePerSecond, difficulty, windowSeconds) {
  const base = Math.max(playerRatePerSecond, DUEL.minRate);
  const rate = base * difficulty;
  return { rate, target: Math.round(rate * Math.max(0, windowSeconds)) };
}

// Récompense d'une victoire : proportionnelle à la difficulté et à la série en
// cours (série = nombre de victoires consécutives, celle-ci comprise).
export function duelReward(difficulty, streak) {
  const mult = difficulty * (1 + Math.max(0, streak - 1) * (DUEL.streakRewardPct / 100));
  return {
    cristaux: Math.max(1, Math.round(DUEL.baseReward.cristaux * mult)),
    pointsTech: Math.max(1, Math.round(DUEL.baseReward.pointsTech * mult)),
  };
}

// Score "live" du rival pour la barre de progression : sa production depuis le
// début de la semaine, bornée à sa cible. Le joueur voit ainsi qu'il est mené
// s'il rejoint le duel en cours de semaine — ce qui est honnête (la cible
// couvre la semaine pleine) et motive à combler l'écart.
export function rivalLiveScore(rate, target, secondsSinceWeekStart) {
  return Math.min(target, Math.max(0, Math.round(rate * secondsSinceWeekStart)));
}
