// Profils LOCAUX (inscription / déconnexion / changement de compte).
//
// Il n'y a pas de backend (cf. CLAUDE.md — Architecture non négociable) : un
// "compte" ici n'est qu'un jeu de clés dans le localStorage de cet appareil.
// Aucun mot de passe n'est demandé et aucune donnée ne quitte le téléphone —
// l'écran d'inscription ne sert qu'à nommer une sauvegarde et à pouvoir en
// tenir plusieurs (partager l'appareil, repartir de zéro sans tout perdre).
// Ne jamais laisser croire à l'utilisateur qu'il s'agit d'un compte en ligne.
//
// Implémentation volontairement extérieure aux stores : plutôt que de
// préfixer la clé de persistance de chaque store Pinia (ce qui obligerait à
// toucher les huit stores et à gérer leur réhydratation à chaud), on
// SNAPSHOTE les clés de jeu vers `profil:<id>:<clé>` au moment de quitter un
// profil, et on les restaure au moment d'en activer un autre — puis on
// recharge la page. Le rechargement garantit que chaque store repart d'un
// état propre, sans réhydratation partielle à gérer.

// Toutes les clés écrites par les stores persistés (`persist: true` utilise
// l'id du store comme clé). À tenir à jour si un store persisté est ajouté.
const GAME_KEYS = ['player', 'collection', 'farm', 'meta', 'missions', 'trees', 'prestige', 'rankings', 'expeditions', 'rivalries'];

const INDEX_KEY = 'profils';
const ACTIVE_KEY = 'profilActif';
const LAST_EMAIL_KEY = 'dernierEmail';

// --- Mot de passe ----------------------------------------------------------
// ATTENTION à ne pas se méprendre sur ce que ça protège. Sans backend, tout
// se passe dans le navigateur : quelqu'un qui a accès à l'appareil peut lire
// le localStorage et contourner l'écran. Ce n'est PAS de la sécurité, c'est
// une barrière de confort entre plusieurs personnes qui partagent un
// téléphone.
//
// On stocke malgré tout un HACHÉ SALÉ et jamais le mot de passe en clair :
// les gens réutilisent leurs mots de passe, et laisser traîner celui d'un
// joueur en clair dans son localStorage l'exposerait bien au-delà de ce jeu.
// PBKDF2 plutôt qu'un simple SHA-256 pour que le haché ne soit pas
// attaquable par simple table de correspondance.
// Les profils existants gardent leur nombre d'itérations (`pwd.iter`, absent
// = 150 000, valeur historique) pour rester vérifiables ; les nouveaux
// utilisent la valeur courante.
const LEGACY_PBKDF2_ITERATIONS = 150_000;
const PBKDF2_ITERATIONS = 600_000;
export const MIN_PASSWORD_LENGTH = 8;
const MAX_NAME_LENGTH = 20;

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, saltHex, iterations = PBKDF2_ITERATIONS) {
  const enc = new TextEncoder();
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    key,
    256,
  );
  return { hash: toHex(bits), salt: toHex(salt), iter: iterations };
}

export function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

// Validation volontairement permissive : on ne peut pas envoyer de mail de
// confirmation, donc refuser une adresse exotique n'apporterait rien — il
// s'agit seulement d'attraper les fautes de frappe évidentes.
export function isEmailValid(email) {
  const e = normalizeEmail(email);
  return e.length >= 5 && e.includes('@') && e.indexOf('@') < e.lastIndexOf('.');
}

export function lastEmail() {
  return localStorage.getItem(LAST_EMAIL_KEY) ?? '';
}

export function findByEmail(email) {
  const e = normalizeEmail(email);
  return readIndex().find((p) => normalizeEmail(p.email) === e) ?? null;
}

export async function verifyPassword(profile, password) {
  if (!profile?.pwd) return true; // profil créé avant l'ajout des mots de passe
  const { hash } = await hashPassword(password, profile.pwd.salt, profile.pwd.iter ?? LEGACY_PBKDF2_ITERATIONS);
  return hash === profile.pwd.hash;
}

function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    // Données de stockage non fiables (modifiables localement) : on écarte
    // toute entrée qui n'a pas la forme attendue plutôt que de planter.
    return parsed.filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && typeof p.nom === 'string');
  } catch {
    // localStorage corrompu ou indisponible (navigation privée sur certains
    // navigateurs) : on repart d'une liste vide plutôt que de planter au
    // démarrage de l'app.
    return [];
  }
}

export function listProfiles() {
  return readIndex();
}

export function activeProfileId() {
  return localStorage.getItem(ACTIVE_KEY);
}

export function activeProfile() {
  const id = activeProfileId();
  return readIndex().find((p) => p.id === id) ?? null;
}

function snapshotKey(profileId, key) {
  return `profil:${profileId}:${key}`;
}

// Recopie l'état de jeu courant dans l'espace du profil, puis efface les clés
// courantes. Appelé avant toute bascule.
// Écritures groupées avec retour arrière : si une écriture échoue en cours de
// route (quota localStorage dépassé…), toutes les clés déjà touchées
// retrouvent leur valeur d'origine — jamais d'état à moitié basculé.
function atomically(fn) {
  const original = new Map();
  const remember = (key) => {
    if (!original.has(key)) original.set(key, localStorage.getItem(key));
  };
  const tx = {
    set(key, value) {
      remember(key);
      localStorage.setItem(key, value);
    },
    del(key) {
      remember(key);
      localStorage.removeItem(key);
    },
  };
  try {
    return fn(tx);
  } catch (err) {
    for (const [key, value] of original) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        /* restauration au mieux : on continue pour rétablir le maximum de clés */
      }
    }
    throw err;
  }
}

// Recopie l'état de jeu courant dans l'espace du profil (toutes les copies
// d'abord), puis efface les clés courantes. Appelé avant toute bascule.
function stashCurrent(tx) {
  const id = activeProfileId();
  if (!id) return;
  for (const key of GAME_KEYS) {
    const value = localStorage.getItem(key);
    if (value === null) tx.del(snapshotKey(id, key));
    else tx.set(snapshotKey(id, key), value);
  }
  for (const key of GAME_KEYS) tx.del(key);
}

// Restaure l'état d'un profil dans les clés que lisent les stores.
function restore(tx, profileId) {
  for (const key of GAME_KEYS) {
    const value = localStorage.getItem(snapshotKey(profileId, key));
    if (value === null) tx.del(key);
    else tx.set(key, value);
  }
}

function newProfileId() {
  if (globalThis.crypto?.randomUUID) return `p${globalThis.crypto.randomUUID()}`;
  return `p${Date.now().toString(36)}${[...crypto.getRandomValues(new Uint8Array(6))].map((b) => b.toString(16).padStart(2, '0')).join('')}`;
}

// Verrou : une seule création de profil à la fois (double clic / double
// soumission pendant la dérivation asynchrone du mot de passe).
let creating = false;

export async function createProfile({ nom, email, motDePasse }) {
  const trimmed = String(nom ?? '').trim();
  if (!trimmed) return null;
  if (creating) return null;
  creating = true;
  try {
    // Dérivation (asynchrone) AVANT toute écriture : si elle échoue, l'état
    // courant n'a pas été touché.
    const pwd = motDePasse ? await hashPassword(motDePasse) : null;
    const normalized = normalizeEmail(email);
    if (normalized && findByEmail(normalized)) throw new Error('email-existant');
    const profile = {
      id: newProfileId(),
      nom: trimmed.slice(0, MAX_NAME_LENGTH),
      email: normalized,
      cree: Date.now(),
    };
    if (pwd) profile.pwd = pwd;
    // Section synchrone et atomique : sauvegarde de l'ancien jeu, index,
    // profil actif. Nouveau profil = aucune sauvegarde à restaurer : les clés
    // de jeu sont effacées, les stores repartent de leurs valeurs par défaut
    // au rechargement.
    atomically((tx) => {
      stashCurrent(tx);
      tx.set(INDEX_KEY, JSON.stringify([...readIndex(), profile]));
      tx.set(ACTIVE_KEY, profile.id);
      if (profile.email) tx.set(LAST_EMAIL_KEY, profile.email);
    });
    return profile;
  } finally {
    creating = false;
  }
}

export function switchProfile(profileId) {
  if (profileId === activeProfileId()) return;
  const p = readIndex().find((x) => x.id === profileId);
  if (!p) throw new Error('profil-inconnu');
  atomically((tx) => {
    stashCurrent(tx);
    restore(tx, profileId);
    tx.set(ACTIVE_KEY, profileId);
    if (p.email) tx.set(LAST_EMAIL_KEY, p.email);
  });
}

// Déconnexion : on range la partie en cours et on retire le profil actif.
// Rien n'est supprimé — se reconnecter au même profil retrouve la partie.
export function logout() {
  atomically((tx) => {
    stashCurrent(tx);
    tx.del(ACTIVE_KEY);
  });
}

// Suppression définitive d'un profil ET de sa sauvegarde.
export function deleteProfile(profileId) {
  const target = readIndex().find((p) => p.id === profileId);
  const wasActive = profileId === activeProfileId();
  atomically((tx) => {
    // L'index est réécrit en premier : en cas d'échec, tout est annulé.
    tx.set(INDEX_KEY, JSON.stringify(readIndex().filter((p) => p.id !== profileId)));
    if (wasActive) {
      // Ne pas passer par `stashCurrent` : on s'apprête justement à tout jeter.
      for (const key of GAME_KEYS) tx.del(key);
      tx.del(ACTIVE_KEY);
    }
    for (const key of GAME_KEYS) tx.del(snapshotKey(profileId, key));
    // Minimisation : le dernier email mémorisé est une donnée personnelle
    // résiduelle ; on l'efface s'il appartenait au profil supprimé (ou s'il
    // ne reste plus aucun profil).
    const remaining = readIndex().filter((p) => p.id !== profileId);
    const last = localStorage.getItem(LAST_EMAIL_KEY);
    if (last !== null && (remaining.length === 0 || (target && normalizeEmail(target.email) === last))) {
      tx.del(LAST_EMAIL_KEY);
    }
  });
}

// Reprise des parties d'avant l'existence des profils : si des clés de jeu
// existent sans aucun profil déclaré, on les adopte dans un profil nommé
// plutôt que de les faire disparaître derrière l'écran d'inscription.
export function adoptLegacySaveIfAny() {
  if (activeProfileId() || readIndex().length > 0) return null;
  const hasSave = GAME_KEYS.some((k) => localStorage.getItem(k) !== null);
  if (!hasSave) return null;
  let nom = 'Ma partie';
  try {
    nom = JSON.parse(localStorage.getItem('player') ?? '{}').pseudo || nom;
  } catch {
    /* pseudo illisible : le nom par défaut fera l'affaire */
  }
  const profile = { id: newProfileId(), nom: String(nom).slice(0, MAX_NAME_LENGTH), cree: Date.now() };
  atomically((tx) => {
    tx.set(INDEX_KEY, JSON.stringify([profile]));
    tx.set(ACTIVE_KEY, profile.id);
  });
  return profile;
}
