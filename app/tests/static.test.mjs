import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const r = (p) => readFileSync(new URL(p, import.meta.url), 'utf8');

test('index.html : identité et métadonnées Empire Culturel', () => {
  const h = r('../index.html');
  assert.match(h, /<title>Empire Culturel/);
  assert.doesNotMatch(h, /Jeu de Cartes/);
  assert.match(h, /name="description"/);
  assert.match(h, /property="og:title"/);
  assert.doesNotMatch(h, /fonts\.googleapis|fonts\.gstatic/);
});

test('CSP : plus aucun hôte Google, nginx non privilégié 8080', () => {
  const n = r('../nginx.conf');
  assert.doesNotMatch(n, /googleapis|gstatic/);
  assert.match(n, /listen 8080;/);
  const d = r('../Dockerfile');
  assert.match(d, /nginx-unprivileged/);
  assert.match(d, /USER 101|USER nginx/);
});

test('service worker : cache versionné, préfixe app, modèles non cache-first', () => {
  const s = r('../public/sw.js');
  assert.match(s, /CACHE_PREFIX = 'empire-culturel-'/);
  assert.match(s, /startsWith\(CACHE_PREFIX\)/);
  assert.match(s, /\/assets\//);
});

test('politique de confidentialité : sans fausse affirmation, marqueurs explicites', () => {
  const p = r('../public/privacypolicy.html');
  assert.doesNotMatch(p, /espace réservé/);
  assert.match(p, /À COMPLÉTER/);
  assert.doesNotMatch(p, /googleapis|gstatic/);
});

test('.dockerignore exclut les variantes .env et secrets', () => {
  const d = readFileSync(new URL('../../.dockerignore', import.meta.url), 'utf8');
  for (const p of ['**/.env.*', '**/*.pem', '**/*.key']) assert.ok(d.includes(p), p);
  assert.ok(d.includes('!**/.env.example'));
});

test('modale accessible', () => {
  const m = r('../src/components/ui/Modal.vue');
  for (const t of ['role="dialog"', 'aria-modal="true"', 'aria-label=', 'Escape', 'focus']) assert.ok(m.includes(t), t);
});
