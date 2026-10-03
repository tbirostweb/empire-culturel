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
const PBKDF2_ITERATIONS = 150_000;

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256,
  );
  return { hash: toHex(bits), salt: toHex(salt) };
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
  const { hash } = await hashPassword(password, profile.pwd.salt);
  return hash === profile.pwd.hash;
}

function readIndex() {
  try {
    const raw = localStorage.getItem(INDEX_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    // localStorage corrompu ou indisponible (navigation privée sur certains
    // navigateurs) : on repart d'une liste vide plutôt que de planter au
    // démarrage de l'app.
    return [];
  }
}

function writeIndex(list) {
  localStorage.setItem(INDEX_KEY, JSON.stringify(list));
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
function stashCurrent() {
  const id = activeProfileId();
  if (!id) return;
  for (const key of GAME_KEYS) {
    const value = localStorage.getItem(key);
    if (value === null) localStorage.removeItem(snapshotKey(id, key));
    else localStorage.setItem(snapshotKey(id, key), value);
    localStorage.removeItem(key);
  }
}

// Restaure l'état d'un profil dans les clés que lisent les stores.
function restore(profileId) {
  for (const key of GAME_KEYS) {
    const value = localStorage.getItem(snapshotKey(profileId, key));
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  }
}

export async function createProfile({ nom, email, motDePasse }) {
  const trimmed = String(nom ?? '').trim();
  if (!trimmed) return null;
  stashCurrent();
  const profile = {
    id: `p${Date.now().toString(36)}`,
    nom: trimmed.slice(0, 20),
    email: normalizeEmail(email),
    cree: Date.now(),
  };
  if (motDePasse) profile.pwd = await hashPassword(motDePasse);
  writeIndex([...readIndex(), profile]);
  // Nouveau profil = aucune sauvegarde à restaurer : les clés de jeu ont déjà
  // été effacées par `stashCurrent`, les stores repartiront de leurs valeurs
  // par défaut au rechargement.
  localStorage.setItem(ACTIVE_KEY, profile.id);
  if (profile.email) localStorage.setItem(LAST_EMAIL_KEY, profile.email);
  return profile;
}

export function switchProfile(profileId) {
  if (profileId === activeProfileId()) return;
  stashCurrent();
  restore(profileId);
  localStorage.setItem(ACTIVE_KEY, profileId);
  const p = readIndex().find((x) => x.id === profileId);
  if (p?.email) localStorage.setItem(LAST_EMAIL_KEY, p.email);
}

// Déconnexion : on range la partie en cours et on retire le profil actif.
// Rien n'est supprimé — se reconnecter au même profil retrouve la partie.
export function logout() {
  stashCurrent();
  localStorage.removeItem(ACTIVE_KEY);
}

// Suppression définitive d'un profil ET de sa sauvegarde.
export function deleteProfile(profileId) {
  const wasActive = profileId === activeProfileId();
  if (wasActive) {
    // Ne pas passer par `stashCurrent` : on s'apprête justement à tout jeter.
    for (const key of GAME_KEYS) localStorage.removeItem(key);
    localStorage.removeItem(ACTIVE_KEY);
  }
  for (const key of GAME_KEYS) localStorage.removeItem(snapshotKey(profileId, key));
  writeIndex(readIndex().filter((p) => p.id !== profileId));
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
  const profile = { id: `p${Date.now().toString(36)}`, nom, cree: Date.now() };
  writeIndex([profile]);
  localStorage.setItem(ACTIVE_KEY, profile.id);
  return profile;
}
