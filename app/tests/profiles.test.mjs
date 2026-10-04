import test from 'node:test';
import assert from 'node:assert/strict';

// Harness localStorage synthétique (aucune donnée réelle). `capacity` simule
// un quota en caractères : une écriture qui ferait dépasser le total échoue.
function install({ capacity = Infinity } = {}) {
  const m = new Map();
  const size = () => [...m].reduce((n, [k, v]) => n + k.length + v.length, 0);
  globalThis.localStorage = {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem(k, v) {
      const prev = m.has(k) ? k.length + m.get(k).length : 0;
      if (size() - prev + k.length + String(v).length > capacity) throw new Error('QuotaExceededError');
      m.set(k, String(v));
    },
    removeItem: (k) => void m.delete(k),
  };
  m.size_ = size;
  return m;
}
const P = await import('../src/utils/profiles.js');
const GAME = { player: '{"pseudo":"A"}', collection: '{"x":1}', farm: '{"f":2}' };
const seed = (m) => Object.entries(GAME).forEach(([k, v]) => m.set(k, v));

test('suppression du dernier profil : aucune PII résiduelle', async () => {
  const m = install();
  const p = await P.createProfile({ nom: 'Test', email: 'Synth@Example.test', motDePasse: 'motdepasse1' });
  assert.equal(m.get('dernierEmail'), 'synth@example.test');
  P.deleteProfile(p.id);
  for (const [k, v] of m) assert.ok(!/synth@example/i.test(k + v), `résidu: ${k}`);
  assert.equal(m.has('dernierEmail'), false);
  assert.deepEqual(P.listProfiles(), []);
});

test('deux soumissions simultanées : un seul profil, IDs uniques', async () => {
  install();
  const args = { nom: 'Dup', email: 'a@b.test', motDePasse: 'motdepasse1' };
  const [r1, r2] = await Promise.allSettled([P.createProfile(args), P.createProfile(args)]);
  assert.equal(P.listProfiles().length, 1);
  assert.ok([r1, r2].some((r) => r.status === 'fulfilled' && r.value === null));
});

test('ids non collisionnels', async () => {
  install();
  const a = await P.createProfile({ nom: 'A', email: 'a@b.test' });
  const b = await P.createProfile({ nom: 'B', email: 'c@d.test' });
  assert.notEqual(a.id, b.id);
  assert.match(a.id, /^p[0-9a-f-]{36}$/);
});

async function scenario(op, { requireFailure = true } = {}) {
  // Mesure la capacité minimale qui permet l'opération, puis rejoue avec
  // chaque capacité inférieure : l'état doit rester strictement identique.
  const base = install();
  const a0 = await P.createProfile({ nom: 'A', email: 'a@b.test' });
  seed(base);
  const b0 = await P.createProfile({ nom: 'B', email: 'c@d.test' });
  P.switchProfile(a0.id);
  const startState = new Map(base);
  const startSize = base.size_();
  let failures = 0;
  for (let cap = startSize; cap < startSize + 400; cap += 7) {
    const m = install({ capacity: Infinity });
    for (const [k, v] of startState) m.set(k, v);
    // capacité limitée APRÈS reconstruction de l'état de départ
    const store = globalThis.localStorage;
    const realSet = store.setItem.bind(store);
    store.setItem = (k, v) => {
      const prev = m.has(k) ? k.length + m.get(k).length : 0;
      if (m.size_() - prev + k.length + String(v).length > cap) throw new Error('QuotaExceededError');
      realSet(k, v);
    };
    let failed = false;
    try {
      await op(a0, b0);
    } catch {
      failed = true;
    }
    if (failed) {
      failures++;
      assert.deepEqual([...m].sort(), [...startState].sort(), `état modifié après échec (capacité ${cap})`);
      assert.equal(P.activeProfileId(), a0.id);
    }
  }
  if (requireFailure) assert.ok(failures > 0, 'le quota simulé doit provoquer au moins un échec');
}

// Panne ponctuelle à la N-ième écriture (puis le stockage refonctionne).
async function failNth(op, min = 2) {
  const base = install();
  const a = await P.createProfile({ nom: 'A', email: 'a@b.test' });
  seed(base);
  const b = await P.createProfile({ nom: 'B', email: 'c@d.test' });
  P.switchProfile(a.id);
  const start = new Map(base);
  let failures = 0;
  for (let n = 1; n <= 40; n++) {
    const m = install();
    for (const [k, v] of start) m.set(k, v);
    const store = globalThis.localStorage;
    const realSet = store.setItem.bind(store);
    let count = 0;
    store.setItem = (k, v) => {
      if (++count === n) throw new Error('QuotaExceededError');
      realSet(k, v);
    };
    try {
      op(a, b);
    } catch {
      failures++;
      assert.deepEqual([...m].sort(), [...start].sort(), `état modifié après panne à l'écriture ${n}`);
    }
  }
  assert.ok(failures >= min, `pannes injectées: ${failures}`);
}

test('quota pendant switchProfile : état et progression strictement intacts', async () => {
  await scenario(async (a, b) => P.switchProfile(b.id), { requireFailure: false });
  await failNth((a, b) => P.switchProfile(b.id));
});

test('quota pendant createProfile : ancien profil entièrement récupérable', async () => {
  await scenario(async () => P.createProfile({ nom: 'C', email: 'e@f.test', motDePasse: 'motdepasse1' }));
});

test('quota pendant deleteProfile : rien de supprimé à moitié', async () => {
  await scenario(async (a, b) => P.deleteProfile(b.id), { requireFailure: false });
  await failNth((a, b) => P.deleteProfile(b.id), 1);
});

test('mot de passe : vérification, ancien profil 150000 itérations, mauvais mot de passe', async () => {
  install();
  const p = await P.createProfile({ nom: 'A', email: 'a@b.test', motDePasse: 'motdepasse1' });
  assert.equal(await P.verifyPassword(p, 'motdepasse1'), true);
  assert.equal(await P.verifyPassword(p, 'autre-mdp-xx'), false);
  const legacyHash = await P.hashPassword('ancien-mdp', undefined, 150_000);
  const legacy = { pwd: { hash: legacyHash.hash, salt: legacyHash.salt } }; // sans `iter`
  assert.equal(await P.verifyPassword(legacy, 'ancien-mdp'), true);
});

test('stockage corrompu / nom HTML / nom long : pas de crash', async () => {
  const m = install();
  m.set('profils', '{pas du json');
  assert.deepEqual(P.listProfiles(), []);
  m.set('profils', JSON.stringify([null, 1, { id: 3 }, { id: 'x', nom: 'ok' }]));
  assert.equal(P.listProfiles().length, 1);
  m.delete('profils');
  const p = await P.createProfile({ nom: '<img src=x onerror=alert(1)>'.repeat(5), email: 'a@b.test' });
  assert.ok(p.nom.length <= 20);
  assert.throws(() => P.switchProfile('inexistant'));
});

test('email dupliqué refusé sans effet de bord', async () => {
  install();
  await P.createProfile({ nom: 'A', email: 'a@b.test' });
  await assert.rejects(P.createProfile({ nom: 'B', email: 'A@B.test' }), /email-existant/);
  assert.equal(P.listProfiles().length, 1);
});
