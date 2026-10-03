// RNG seedable (mulberry32) : même seed => même séquence. Utilisé pour tout
// l'aléatoire du jeu (combats, invocations, decks bots, deals du jour,
// casino) — jamais de Math.random() ailleurs dans engine/.
//
// Pour le combat/les invocations/les decks bots : la reproductibilité est
// une feature (rejouer/débugger un combat, deck bot stable toute la
// semaine). Pour le casino : on sème avec une valeur non réutilisable
// (Date.now() + un nonce persistant, cf. stores/meta.js) pour qu'un tirage
// ne soit jamais prévisible/rejouable par le joueur — sans backend
// serveur-autoritaire, il n'y a de toute façon plus d'enjeu anti-triche
// multijoueur : un joueur qui trafique son propre localStorage ne prend
// rien à personne d'autre.
export function createRng(seed) {
  let a = hashSeed(seed) >>> 0;

  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(min, max) {
    return min + Math.floor(next() * (max - min + 1));
  }

  function pick(arr) {
    return arr[Math.floor(next() * arr.length)];
  }

  function weightedPick(entries, weightKey = 'weight') {
    const total = entries.reduce((sum, e) => sum + e[weightKey], 0);
    let roll = next() * total;
    for (const entry of entries) {
      roll -= entry[weightKey];
      if (roll <= 0) return entry;
    }
    return entries[entries.length - 1];
  }

  function shuffle(arr) {
    const copy = [...arr];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(next() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  return { next, int, pick, weightedPick, shuffle };
}

function hashSeed(seed) {
  if (typeof seed === 'number') return seed;
  let h = 0;
  for (const ch of String(seed)) h = (Math.imul(31, h) + ch.codePointAt(0)) | 0;
  return h;
}

// Seed non rejouable pour les tirages qui ne doivent jamais être
// prévisibles (casino). `nonce` doit venir d'un compteur persistant
// (stores/meta.js) incrémenté à chaque appel pour éviter deux tirages
// identiques si appelés dans la même milliseconde.
export function freshSeed(nonce) {
  return `${Date.now()}:${nonce}`;
}
