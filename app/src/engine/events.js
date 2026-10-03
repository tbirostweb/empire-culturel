// Événement hebdomadaire — un thème (région) tourne chaque semaine et débloque
// un booster événement à prix réduit dont les chances sont orientées vers les
// monuments de la région du thème. Déterministe par semaine (même patron que
// la saison de classement / les missions du jour) : tout le monde a le même
// thème la même semaine, sans backend.
import { REGIONS, REGION_LABELS } from '../data/monuments.js';
import { createRng } from './rng.js';

const WEEK_MS = 7 * 86_400_000;
// Ancre arbitraire fixe (même que la saison de classement) pour que le
// découpage en semaines soit stable.
const ANCHOR = Date.UTC(2026, 0, 5); // un lundi

export function currentEventWindow(now = Date.now()) {
  const week = Math.floor((now - ANCHOR) / WEEK_MS);
  const startsAt = ANCHOR + week * WEEK_MS;
  return { week, startsAt, endsAt: startsAt + WEEK_MS };
}

// Régions ayant réellement des monuments (afrique/oceanie en ont peu mais > 0 ;
// on exclut celles à 0 pour ne pas proposer un booster événement vide). Calculé
// à l'appel plutôt qu'importé en dur pour rester juste si le catalogue change.
function themedRegions(monuments) {
  return REGIONS.filter((r) => monuments.some((m) => m.region === r && m.rarete !== 'secret'));
}

// L'événement de la semaine : région-thème + définition du booster événement.
// `monuments` passé en paramètre (pas importé) pour garder le moteur pur.
export function currentEvent(monuments, now = Date.now()) {
  const win = currentEventWindow(now);
  const pool = themedRegions(monuments);
  const region = createRng(`event:${win.week}`).pick(pool);
  return {
    ...win,
    region,
    regionLabel: REGION_LABELS[region],
    booster: {
      id: 'event',
      nom: `Booster ${REGION_LABELS[region]}`,
      description: `Chances orientées vers les monuments d'${REGION_LABELS[region]}. Prix réduit cette semaine.`,
      cout: 140,
      // Table de rareté généreuse (proche de l'Argent) — l'intérêt est le
      // biais régional, pas des probabilités folles.
      weights: { commun: 30, peu_commun: 32, rare: 24, epique: 8, legendaire: 1.4, mythique: 0.2, secret: 0.02 },
      themeRegion: region,
      themeBias: 0.7, // 70% du temps, le monument tiré est de la région-thème
    },
  };
}
