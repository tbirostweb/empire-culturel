<script setup>
// Écran de connexion / inscription, affiché tant qu'aucun profil n'est actif.
//
// IMPORTANT — ce que cet écran est et n'est pas. Il n'y a pas de backend (cf.
// CLAUDE.md) : rien n'est envoyé nulle part, rien n'est vérifié à distance,
// et une partie ne suit PAS l'utilisateur d'un appareil à l'autre. L'email
// sert d'identifiant pour retrouver sa partie sur ce téléphone, le mot de
// passe sépare plusieurs joueurs qui partagent l'appareil. L'écran le dit
// explicitement : laisser croire à un compte en ligne ferait perdre sa
// progression à quelqu'un qui change de téléphone en pensant la retrouver.
//
// Le mot de passe n'est jamais stocké en clair (PBKDF2 salé, cf.
// utils/profiles.js) — non pas parce que ça sécuriserait quoi que ce soit
// ici, mais parce que les gens réutilisent leurs mots de passe.
import { computed, ref } from 'vue';
import {
  createProfile,
  listProfiles,
  switchProfile,
  deleteProfile,
  findByEmail,
  verifyPassword,
  isEmailValid,
  lastEmail,
} from '../../utils/profiles.js';
import AppIcon from '../icons/AppIcon.vue';

const emit = defineEmits(['ready']);

const profiles = ref(listProfiles());
// On ouvre sur la connexion s'il existe déjà une partie sur l'appareil,
// sinon directement sur l'inscription : demander de « se connecter » à
// quelqu'un qui n'a pas encore de partie n'aurait aucun sens.
const mode = ref(profiles.value.length > 0 ? 'connexion' : 'inscription');

const email = ref(lastEmail());
const motDePasse = ref('');
const nom = ref('');
const erreur = ref('');
const enCours = ref(false);
const confirmDelete = ref(null);

const titre = computed(() => (mode.value === 'connexion' ? 'Content de te revoir' : 'Commence ta collection'));

function bascule() {
  mode.value = mode.value === 'connexion' ? 'inscription' : 'connexion';
  erreur.value = '';
  motDePasse.value = '';
}

async function connecter() {
  erreur.value = '';
  const profil = findByEmail(email.value);
  if (!profil) {
    erreur.value = "Aucune partie avec cet email sur cet appareil.";
    return;
  }
  enCours.value = true;
  try {
    if (!(await verifyPassword(profil, motDePasse.value))) {
      erreur.value = 'Mot de passe incorrect.';
      return;
    }
    switchProfile(profil.id);
    emit('ready');
  } finally {
    enCours.value = false;
  }
}

async function inscrire() {
  erreur.value = '';
  if (!nom.value.trim()) {
    erreur.value = 'Choisis un nom de collectionneur.';
    return;
  }
  if (!isEmailValid(email.value)) {
    erreur.value = 'Cet email ne semble pas valide.';
    return;
  }
  if (findByEmail(email.value)) {
    erreur.value = 'Une partie existe déjà avec cet email sur cet appareil.';
    return;
  }
  if (motDePasse.value.length < 4) {
    erreur.value = 'Le mot de passe doit faire au moins 4 caractères.';
    return;
  }
  enCours.value = true;
  try {
    await createProfile({ nom: nom.value, email: email.value, motDePasse: motDePasse.value });
    emit('ready');
  } finally {
    enCours.value = false;
  }
}

// Reprise en un tap pour les parties créées avant l'ajout des mots de passe :
// leur redemander un mot de passe qu'elles n'ont jamais eu serait une impasse.
function reprendreSansMdp(id) {
  switchProfile(id);
  emit('ready');
}

function supprimer(id) {
  deleteProfile(id);
  profiles.value = listProfiles();
  confirmDelete.value = null;
  if (profiles.value.length === 0) mode.value = 'inscription';
}

const sansMotDePasse = computed(() => profiles.value.filter((p) => !p.pwd));
</script>

<template>
  <div class="gate">
    <div class="gate-card panel">
      <p class="section-label">Empire Culturel</p>
      <h1 class="gate-title">{{ titre }}</h1>

      <form class="gate-form" @submit.prevent="mode === 'connexion' ? connecter() : inscrire()">
        <label v-if="mode === 'inscription'" class="gate-field">
          <span class="gate-label">Nom de collectionneur</span>
          <input v-model="nom" class="input" maxlength="20" autocomplete="nickname" placeholder="Théo" />
        </label>

        <label class="gate-field">
          <span class="gate-label">Email</span>
          <input
            v-model="email"
            class="input"
            type="email"
            autocomplete="email"
            inputmode="email"
            placeholder="toi@exemple.fr"
            @input="erreur = ''"
          />
        </label>

        <label class="gate-field">
          <span class="gate-label">Mot de passe</span>
          <input
            v-model="motDePasse"
            class="input"
            type="password"
            :autocomplete="mode === 'connexion' ? 'current-password' : 'new-password'"
            placeholder="••••••"
            @input="erreur = ''"
          />
        </label>

        <p v-if="erreur" class="gate-erreur">{{ erreur }}</p>

        <button type="submit" class="btn-primary w-full" :disabled="enCours">
          {{ enCours ? 'Un instant…' : mode === 'connexion' ? 'Se connecter' : 'Créer ma partie' }}
        </button>
      </form>

      <button type="button" class="gate-bascule" @click="bascule">
        {{ mode === 'connexion' ? "Pas encore de partie ? En créer une" : "J'ai déjà une partie — me connecter" }}
      </button>

      <!-- Parties d'avant l'ajout des mots de passe : reprise directe. -->
      <template v-if="sansMotDePasse.length > 0">
        <div class="rule-double my-4" />
        <p class="section-label">Parties sans mot de passe</p>
        <ul class="gate-list">
          <li v-for="p in sansMotDePasse" :key="p.id">
            <button type="button" class="gate-profile" @click="reprendreSansMdp(p.id)">
              <span class="gate-avatar">{{ p.nom.charAt(0).toUpperCase() }}</span>
              <span class="min-w-0 flex-1 text-left font-display font-bold">{{ p.nom }}</span>
              <AppIcon name="chevron-right" class="h-4 w-4 shrink-0 text-ink-faint" />
            </button>
            <button type="button" class="gate-delete" :aria-label="`Supprimer ${p.nom}`" @click="confirmDelete = confirmDelete === p.id ? null : p.id">
              <AppIcon name="close" class="h-3.5 w-3.5" />
            </button>
            <p v-if="confirmDelete === p.id" class="gate-confirm">
              Supprimer « {{ p.nom }} » et sa progression ?
              <button type="button" class="gate-confirm-yes" @click="supprimer(p.id)">Supprimer</button>
              <button type="button" class="gate-confirm-no" @click="confirmDelete = null">Annuler</button>
            </p>
          </li>
        </ul>
      </template>

      <p class="gate-note">
        <AppIcon name="lock" class="mr-1 inline h-3 w-3" />
        Ta partie reste <strong>sur cet appareil</strong>. L'email et le mot de passe servent à la
        retrouver ici et à séparer plusieurs joueurs — rien n'est envoyé sur internet, et rien
        n'est récupérable depuis un autre téléphone. <strong>N'utilise pas un mot de passe
        important.</strong>
      </p>
    </div>
  </div>
</template>

<style scoped>
.gate {
  display: flex;
  min-height: 100dvh;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
  background: var(--color-fond);
}
.gate-card {
  width: 100%;
  max-width: 26rem;
  padding: 1.5rem;
}
.gate-title {
  margin: 0.25rem 0 1.1rem;
  font-family: var(--font-display);
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1.15;
}
.gate-form {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}
.gate-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}
.gate-label {
  font-family: var(--font-mono);
  font-size: 0.62rem;
  text-transform: uppercase;
  letter-spacing: 0.14em;
  color: var(--color-ink-faint);
}
.gate-erreur {
  margin: 0;
  font-size: 0.78rem;
  color: var(--color-danger);
}
.gate-bascule {
  margin-top: 0.8rem;
  width: 100%;
  font-size: 0.78rem;
  color: var(--color-encre);
  text-decoration: underline;
}
.gate-list {
  margin: 0.5rem 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}
.gate-list li {
  position: relative;
}
.gate-profile {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.7rem;
  padding: 0.55rem 2rem 0.55rem 0.55rem;
  border: 1px solid var(--color-liseret);
  border-radius: 3px;
  background: var(--color-surface-soft);
  transition: transform 0.12s ease;
}
.gate-profile:active {
  transform: scale(0.98);
}
.gate-avatar {
  display: flex;
  height: 2rem;
  width: 2rem;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  background: var(--color-accent);
  color: #fff;
  font-family: var(--font-display);
  font-weight: 700;
}
.gate-delete {
  position: absolute;
  right: 0.4rem;
  top: 0.65rem;
  display: flex;
  height: 1.5rem;
  width: 1.5rem;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  color: var(--color-ink-faint);
}
.gate-delete:hover {
  color: var(--color-danger);
}
.gate-confirm {
  margin: 0.35rem 0 0;
  font-size: 0.75rem;
  color: var(--color-ink-soft);
}
.gate-confirm-yes,
.gate-confirm-no {
  margin-left: 0.4rem;
  font-weight: 700;
  text-decoration: underline;
}
.gate-confirm-yes {
  color: var(--color-danger);
}
.gate-note {
  margin: 1.25rem 0 0;
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--color-ink-faint);
  border-top: 1px solid var(--color-liseret);
  padding-top: 0.75rem;
}
</style>
