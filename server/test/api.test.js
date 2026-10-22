import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { ouvrirBase } from '../src/db.js';
import { construireApp } from '../src/app.js';
import { synchroniserCatalogue } from '../src/contenu/index.js';
import { CATALOGUE } from '../src/contenu/catalogue.js';
import { hacherMotDePasse } from '../src/auth.js';
import { calculerXp, niveau, minuitParisUTC, lundi, heureLocale } from '../src/jeu.js';
import { reconfigurerTransporteur } from '../src/email.js';

let db, app;
const MDP = 'motdepasse-solide';

/** Petit client qui garde son cookie de session. */
function client() {
  let cookie = '';
  const appel = async (method, url, payload) => {
    const r = await app.inject({
      method, url, payload,
      headers: { ...(cookie ? { cookie } : {}), ...(method !== 'GET' ? { 'x-kapsule': '1' } : {}) },
    });
    const sc = r.headers['set-cookie'];
    if (sc) cookie = [sc].flat()[0].split(';')[0];
    let corps = r.body;
    try { corps = JSON.parse(r.body); } catch { /* CSV */ }
    return { statut: r.statusCode, corps };
  };
  return {
    get: (u) => appel('GET', u), post: (u, p) => appel('POST', u, p ?? {}), patch: (u, p) => appel('PATCH', u, p),
    put: (u, p) => appel('PUT', u, p), del: (u, p) => appel('DELETE', u, p ?? {}),
  };
}

const bonnesReponses = (leconId) => {
  const l = CATALOGUE.flatMap((p) => p.lecons).find((x) => x.id === leconId);
  return Object.fromEntries(l.questions.map((q) => [q.id, q.reponse]));
};
const mauvaise = (r) => (Array.isArray(r) ? [] : r === 0 ? 1 : 0);

async function jouer(c, leconId, { erreurs = 0 } = {}) {
  const d = await c.post(`/api/lecons/${leconId}/demarrer`);
  assert.equal(d.statut, 200, JSON.stringify(d.corps));
  const rep = bonnesReponses(leconId);
  let n = 0;
  for (const q of d.corps.questions) {
    const r = await c.post(`/api/parties/${d.corps.partie}/repondre`, { question: q.id, reponse: n++ < erreurs ? mauvaise(rep[q.id]) : rep[q.id] });
    if (r.corps.compromis) break;
  }
  return c.post(`/api/parties/${d.corps.partie}/terminer`);
}

let orgA, orgB;
const alice = client(), bob = client(), adminA = client(), adminB = client(), carol = client();

before(async () => {
  db = ouvrirBase(':memory:');
  synchroniserCatalogue(db);
  app = construireApp({ db, cookieSecurise: false });
  await app.ready();
  const h = hacherMotDePasse(MDP);
  orgA = Number(db.prepare("INSERT INTO orgs (name, invite_code) VALUES ('Alpha', 'ALPHA123')").run().lastInsertRowid);
  orgB = Number(db.prepare("INSERT INTO orgs (name, invite_code) VALUES ('Beta', 'BETA4567')").run().lastInsertRowid);
  const ins = db.prepare('INSERT INTO users (org_id, email, name, password_hash, role) VALUES (?, ?, ?, ?, ?)');
  ins.run(orgA, 'admin@a.fr', 'Admin A', h, 'admin');
  ins.run(orgB, 'admin@b.fr', 'Admin B', h, 'admin');
  ins.run(orgB, 'bob@b.fr', 'Bob', h, 'learner');
  for (const [c, e] of [[adminA, 'admin@a.fr'], [adminB, 'admin@b.fr'], [bob, 'bob@b.fr']]) {
    assert.equal((await c.post('/api/auth/connexion', { email: e, motDePasse: MDP })).statut, 200);
  }
});

after(() => app.close());

test('le catalogue est chargé et valide', () => {
  const n = db.prepare('SELECT COUNT(*) AS n FROM lessons WHERE org_id IS NULL AND published = 1').get().n;
  assert.equal(n, CATALOGUE.reduce((s, p) => s + p.lecons.length, 0));
});

test('inscription par lien d\'invitation', async () => {
  assert.equal((await alice.get('/api/auth/invitation/alpha123')).corps.organisation, 'Alpha');
  assert.equal((await alice.post('/api/auth/inscription', { code: 'NOPE', nom: 'X', email: 'x@a.fr', motDePasse: MDP })).statut, 404);
  assert.equal((await alice.post('/api/auth/inscription', { code: 'ALPHA123', nom: 'Alice', email: 'alice@a.fr', motDePasse: 'court' })).statut, 400);
  const r = await alice.post('/api/auth/inscription', { code: 'ALPHA123', nom: 'Alice', email: 'alice@a.fr', motDePasse: MDP });
  assert.equal(r.statut, 201);
  assert.equal(r.corps.organisation.nom, 'Alpha');
  assert.equal(r.corps.role, 'learner');
  assert.equal((await carol.post('/api/auth/inscription', { code: 'ALPHA123', nom: 'Carol', email: 'carol@a.fr', motDePasse: MDP })).statut, 201);
  assert.equal((await client().post('/api/auth/inscription', { code: 'ALPHA123', nom: 'Doublon', email: 'ALICE@a.fr', motDePasse: MDP })).statut, 409);
});

test('connexion : mauvais mot de passe refusé', async () => {
  assert.equal((await client().post('/api/auth/connexion', { email: 'alice@a.fr', motDePasse: 'faux-mot-de-passe' })).statut, 401);
});

test('les requêtes d\'écriture sans en-tête anti-CSRF sont refusées', async () => {
  const r = await app.inject({ method: 'POST', url: '/api/auth/connexion', payload: { email: 'alice@a.fr', motDePasse: MDP } });
  assert.equal(r.statusCode, 403);
});

test('les questions envoyées au joueur ne contiennent pas les réponses', async () => {
  const d = await alice.post('/api/lecons/reflexes-mdp/demarrer');
  assert.equal(d.statut, 200);
  for (const q of d.corps.questions) {
    assert.equal(q.reponse, undefined);
    assert.equal(q.explication, undefined);
  }
});

test('une leçon verrouillée ne peut pas être lancée', async () => {
  assert.equal((await alice.post('/api/lecons/reflexes-mfa/demarrer')).statut, 403);
});

test('partie sans faute : XP, étoiles, badges, série', async () => {
  const r = await jouer(alice, 'reflexes-mdp');
  assert.equal(r.statut, 200, JSON.stringify(r.corps));
  assert.equal(r.corps.echec, false);
  assert.equal(r.corps.etoiles, 3);
  assert.equal(r.corps.correct, r.corps.total);
  assert.ok(r.corps.xp.gagne > 60);
  assert.equal(r.corps.serie, 1);
  const badges = r.corps.badges.map((b) => b.id);
  assert.ok(badges.includes('premier-pas') && badges.includes('sans-faute') && badges.includes('combo-5'));
  const moi = (await alice.get('/api/moi')).corps;
  assert.equal(moi.xp, r.corps.xp.gagne);
  assert.equal(moi.serie, 1);
  // La leçon suivante est maintenant ouverte.
  const arbre = (await alice.get('/api/parcours')).corps;
  assert.equal(arbre[0].lecons[1].ouverte, true);
});

test('rejouer une leçon réussie rapporte moitié moins', async () => {
  const r = await jouer(alice, 'reflexes-mdp');
  assert.ok(r.corps.xp.lignes.some((l) => l.cle === 'revision'));
});

test('anti-triche : la première réponse est définitive, la partie doit être complète', async () => {
  const d = await carol.post('/api/lecons/reflexes-mdp/demarrer');
  const rep = bonnesReponses('reflexes-mdp');
  const q = d.corps.questions[0];
  const r1 = await carol.post(`/api/parties/${d.corps.partie}/repondre`, { question: q.id, reponse: mauvaise(rep[q.id]) });
  assert.equal(r1.corps.correct, false);
  const r2 = await carol.post(`/api/parties/${d.corps.partie}/repondre`, { question: q.id, reponse: rep[q.id] });
  assert.equal(r2.corps.correct, false);
  assert.equal((await carol.post(`/api/parties/${d.corps.partie}/terminer`)).statut, 400);
  // La partie d'un autre joueur est inaccessible.
  assert.equal((await alice.post(`/api/parties/${d.corps.partie}/repondre`, { question: q.id, reponse: 0 })).statut, 404);
});

test('trois erreurs : système compromis', async () => {
  const r = await jouer(carol, 'reflexes-mdp', { erreurs: 3 });
  assert.equal(r.statut, 200);
  assert.equal(r.corps.echec, true);
  assert.equal(r.corps.etoiles, 0);
  // Hors bonus de badges : selon l'heure du test, « Noctambule » ou « Lève-tôt »
  // peuvent s'ajouter sans rapport avec l'échec.
  const xpHorsBadges = r.corps.xp.lignes.filter((l) => l.cle !== 'badges').reduce((n, l) => n + l.xp, 0);
  assert.ok(xpHorsBadges <= 10);
  // Réussir ensuite débloque « Résilient ».
  const r2 = await jouer(carol, 'reflexes-mdp');
  assert.ok(r2.corps.badges.some((b) => b.id === 'resilient'));
});

test('classement : chacun ne voit que son organisation', async () => {
  await jouer(bob, 'reflexes-mdp');
  const a = (await alice.get('/api/classement')).corps.joueurs.map((j) => j.nom);
  const b = (await bob.get('/api/classement?periode=general')).corps.joueurs.map((j) => j.nom);
  assert.deepEqual(a.sort(), ['Admin A', 'Alice', 'Carol']);
  assert.deepEqual(b.sort(), ['Admin B', 'Bob']);
  const la = (await alice.get('/api/lecons/reflexes-mdp/classement')).corps.joueurs;
  assert.deepEqual(la.map((j) => j.nom).sort(), ['Alice', 'Carol']);
  // Une seule ligne par joueur : sa meilleure tentative (Carol a raté puis réussi).
  assert.ok(la.every((j) => j.correct === j.total));
});

test('admin : ne voit et ne modifie que les membres de son organisation', async () => {
  const bobId = db.prepare("SELECT id FROM users WHERE email = 'bob@b.fr'").get().id;
  const membres = (await adminA.get('/api/admin/membres')).corps.membres.map((m) => m.email);
  assert.ok(membres.includes('alice@a.fr') && !membres.includes('bob@b.fr'));
  assert.equal((await adminA.get(`/api/admin/membres/${bobId}`)).statut, 404);
  assert.equal((await adminA.patch(`/api/admin/membres/${bobId}`, { desactive: true })).statut, 404);
  assert.equal((await adminA.post(`/api/admin/membres/${bobId}/reinitialiser`)).statut, 404);
  assert.equal((await adminA.del(`/api/admin/membres/${bobId}`)).statut, 404);
  const vue = (await adminA.get('/api/admin/vue-ensemble')).corps;
  assert.equal(vue.indicateurs.membres, 3);
  assert.ok(!vue.podium.some((p) => p.nom === 'Bob'));
  const csv = (await adminA.get('/api/admin/export.csv')).corps;
  assert.ok(csv.includes('alice@a.fr') && !csv.includes('bob@b.fr'));
});

test('rôles : un apprenant n\'accède pas à l\'admin', async () => {
  assert.equal((await alice.get('/api/admin/vue-ensemble')).statut, 403);
  // L'ancien espace plateforme n'existe plus.
  assert.equal((await adminA.get('/api/plateforme/organisations')).statut, 404);
});

test('défis maison : invisibles des autres organisations', async () => {
  const defi = {
    titre: 'Notre charte informatique',
    questions: [
      { type: 'unique', enonce: 'Où signaler un e-mail suspect ?', choix: ['securite@alpha.fr', 'Nulle part'], reponse: 0, explication: 'Toujours.' },
      { type: 'multiple', enonce: 'Que verrouiller ?', choix: ['Poste', 'Téléphone', 'Plante'], reponse: [1, 0] },
    ],
  };
  assert.equal((await adminA.post('/api/admin/defis', { ...defi, questions: [{ ...defi.questions[0], reponse: 9 }] })).statut, 400);
  const c = await adminA.post('/api/admin/defis', defi);
  assert.equal(c.statut, 201);
  const id = c.corps.id;
  assert.ok((await alice.get('/api/parcours')).corps.some((p) => p.defi && p.lecons.some((l) => l.id === id)));
  assert.ok(!(await bob.get('/api/parcours')).corps.some((p) => p.lecons.some((l) => l.id === id)));
  assert.equal((await bob.post(`/api/lecons/${id}/demarrer`)).statut, 404);
  assert.equal((await bob.get(`/api/lecons/${id}/classement`)).statut, 404);
  assert.equal((await adminB.get(`/api/admin/defis/${id}`)).statut, 404);
  assert.equal((await adminB.put(`/api/admin/defis/${id}`, defi)).statut, 404);
  assert.equal((await adminB.del(`/api/admin/defis/${id}`)).statut, 404);
  // Alice peut le jouer, la réponse multiple est comparée sans tenir compte de l'ordre.
  const d = await alice.post(`/api/lecons/${id}/demarrer`);
  const r = await alice.post(`/api/parties/${d.corps.partie}/repondre`, { question: 'q2', reponse: [0, 1] });
  assert.equal(r.corps.correct, true);
});

test('admin : création de membre et connexion par code d\'invitation OTP', async () => {
  const r = await adminA.post('/api/admin/membres', { nom: 'Dan', email: 'dan@a.fr', role: 'learner' });
  assert.equal(r.statut, 201);
  assert.ok(r.corps.code);
  const dan = client();
  // Connexion de Dan avec son code OTP d'invitation
  const c = await dan.post('/api/auth/valider-code', { email: 'dan@a.fr', code: r.corps.code });
  assert.equal(c.statut, 200);
  assert.equal(c.corps.nom, 'Dan');
  assert.equal(c.corps.email, 'dan@a.fr');

  // Nouvelle demande de code pour se reconnecter
  const demande = await dan.post('/api/auth/demander-code', { email: 'dan@a.fr' });
  assert.equal(demande.statut, 200);
  assert.equal(demande.corps.existe, true);
  assert.ok(demande.corps.devCode);

  // Validation du nouveau code de connexion
  const reconnexion = await client().post('/api/auth/connexion', { email: 'dan@a.fr', code: demande.corps.devCode });
  assert.equal(reconnexion.statut, 200);

  // Demande de code pour une adresse inconnue : 404 explicite
  const inconnue = await client().post('/api/auth/demander-code', { email: 'inconnu@inconnu.fr' });
  assert.equal(inconnue.statut, 404);
  assert.equal(inconnue.corps.existe, false);
});

test('admin désactivé : session coupée', async () => {
  const id = db.prepare("SELECT id FROM users WHERE email = 'carol@a.fr'").get().id;
  assert.equal((await adminA.patch(`/api/admin/membres/${id}`, { desactive: true })).statut, 200);
  assert.equal((await carol.get('/api/moi')).statut, 401);
  const self = db.prepare("SELECT id FROM users WHERE email = 'admin@a.fr'").get().id;
  assert.equal((await adminA.patch(`/api/admin/membres/${self}`, { role: 'learner' })).statut, 400);
});

test('export CSV : pas d\'injection de formule', async () => {
  await alice.patch('/api/moi', { nom: '=HYPERLINK("http://x")' });
  const csv = (await adminA.get('/api/admin/export.csv')).corps;
  assert.ok(csv.includes(`"'=HYPERLINK(""http://x"")"`));
});

test('règles du jeu', () => {
  assert.equal(niveau(0).niveau, 1);
  assert.equal(niveau(100).niveau, 2);
  assert.equal(niveau(299).niveau, 2);
  assert.equal(calculerXp({ resultats: [true, true, true], dureeMs: 60_000, echec: false, dejaReussie: false }).total, 30 + 3 + 20);
  assert.equal(minuitParisUTC('2026-01-15'), '2026-01-14T23:00:00Z');
  assert.equal(minuitParisUTC('2026-07-15'), '2026-07-14T22:00:00Z');
  assert.equal(lundi('2026-10-04'), '2026-09-28');
  assert.equal(heureLocale(new Date('2026-01-14T23:30:00Z')), 0);
  assert.equal(heureLocale(new Date('2026-07-14T20:00:00Z')), 22);
});

test('interface : fichiers statiques et repli de l\'application monopage', async () => {
  const { mkdtempSync, mkdirSync, writeFileSync } = await import('node:fs');
  const { join } = await import('node:path');
  const { tmpdir } = await import('node:os');
  const dist = mkdtempSync(join(tmpdir(), 'kapsule-dist-'));
  mkdirSync(join(dist, 'assets'));
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>Kapsule</title>');
  writeFileSync(join(dist, 'assets', 'app.js'), 'console.log(1)');
  const web = construireApp({ db, statiques: dist, cookieSecurise: false });
  const accueil = await web.inject({ url: '/classement' });
  assert.equal(accueil.statusCode, 200);
  assert.match(accueil.body, /Kapsule/);
  assert.match(accueil.headers['content-security-policy'], /default-src 'self'/);
  const js = await web.inject({ url: '/assets/app.js' });
  assert.equal(js.statusCode, 200);
  assert.match(js.headers['cache-control'], /immutable/);
  assert.equal((await web.inject({ url: '/api/inconnue' })).statusCode, 404);
  assert.equal((await web.inject({ url: '/assets/absent.js' })).statusCode, 404);
  // Un fichier ajouté après le démarrage est servi (pas de liste figée).
  writeFileSync(join(dist, 'assets', 'nouveau.js'), 'console.log(2)');
  assert.equal((await web.inject({ url: '/assets/nouveau.js' })).statusCode, 200);
  await web.close();
});

test('SMTP en panne : erreur explicite au lieu d\'un faux « code envoyé »', async () => {
  const avant = { ...process.env };
  Object.assign(process.env, { SMTP_HOST: '127.0.0.1', SMTP_PORT: '1', SMTP_SECURE: 'false', SMTP_EMAIL: 'x@x.fr', SMTP_PASSWORD: 'x' });
  reconfigurerTransporteur();
  try {
    const r = await client().post('/api/auth/demander-code', { email: 'dan@a.fr' });
    assert.equal(r.statut, 503);
    assert.equal(r.corps.devCode, undefined);
    const inv = await adminA.post('/api/admin/membres', { nom: 'Eve', email: 'eve@a.fr', role: 'learner' });
    assert.equal(inv.statut, 201);
    assert.equal(inv.corps.emailEnvoye, false);
  } finally {
    for (const k of ['SMTP_HOST', 'SMTP_PORT', 'SMTP_SECURE', 'SMTP_EMAIL', 'SMTP_PASSWORD']) {
      if (k in avant) process.env[k] = avant[k]; else delete process.env[k];
    }
    reconfigurerTransporteur();
  }
});

test('création d\'organisation en libre-service par code e-mail', async () => {
  const fondateur = client();
  const demande = await fondateur.post('/api/auth/demander-creation', { organisation: 'Atelier Durand', nom: 'Zoé Durand', email: 'zoe@durand.fr', avatar: 'hibou' });
  assert.equal(demande.statut, 200);
  assert.ok(demande.corps.devCode);
  // Rien n'existe avant la validation du code.
  assert.equal(db.prepare('SELECT 1 FROM orgs WHERE name = ?').get('Atelier Durand'), undefined);
  // Un code de création n'ouvre pas de session par la route de connexion.
  assert.equal((await client().post('/api/auth/valider-code', { email: 'zoe@durand.fr', code: demande.corps.devCode })).statut, 400);

  const nouvelle = await fondateur.post('/api/auth/demander-creation', { organisation: 'Atelier Durand', nom: 'Zoé Durand', email: 'zoe@durand.fr', avatar: 'hibou' });
  // Code collé tel qu'on le copie d'un mail : espaces et texte autour sont ignorés.
  const c = nouvelle.corps.devCode;
  const r = await fondateur.post('/api/auth/valider-creation', { email: 'zoe@durand.fr', code: ` Code : ${c.slice(0, 3)} ${c.slice(3)}\n` });
  assert.equal(r.statut, 201);
  assert.equal(r.corps.role, 'admin');
  assert.equal(r.corps.organisation.nom, 'Atelier Durand');
  assert.equal(r.corps.avatar, 'hibou');
  // La fondatrice administre bien son espace, et seulement le sien.
  const membres = await fondateur.get('/api/admin/membres');
  assert.equal(membres.statut, 200);
  assert.deepEqual(membres.corps.membres.map((m) => m.email), ['zoe@durand.fr']);

  // Nom déjà pris (casse ignorée) et adresse déjà inscrite refusés.
  assert.equal((await client().post('/api/auth/demander-creation', { organisation: 'atelier durand', nom: 'X', email: 'x@x.fr' })).statut, 400);
  assert.equal((await client().post('/api/auth/demander-creation', { organisation: 'Autre', nom: 'X', email: 'zoe@durand.fr' })).statut, 409);
});

test('défis standard : une organisation supprime et restaure du catalogue pour elle seule', async () => {
  const cat = (await adminB.get('/api/admin/catalogue')).corps;
  assert.ok(cat.some((p) => p.id === 'decouverte-dys') && cat.some((p) => p.id === 'decouverte-cfa'));
  assert.equal((await bob.get('/api/admin/catalogue')).statut, 403);
  assert.equal((await adminB.del('/api/admin/catalogue/parcours/inconnu')).statut, 404);
  assert.equal((await adminB.del('/api/admin/catalogue/autre/reflexes')).statut, 404);

  // Suppression d'un parcours entier : il disparaît pour l'organisation B seulement.
  assert.equal((await adminB.del('/api/admin/catalogue/parcours/decouverte-cfa')).statut, 200);
  assert.ok(!(await bob.get('/api/parcours')).corps.some((p) => p.id === 'decouverte-cfa'));
  assert.equal((await bob.post('/api/lecons/cfa-lexique/demarrer')).statut, 404);
  assert.ok((await alice.get('/api/parcours')).corps.some((p) => p.id === 'decouverte-cfa'));
  assert.equal((await adminB.get('/api/admin/catalogue')).corps.find((p) => p.id === 'decouverte-cfa').supprime, true);

  // Suppression d'une leçon : la suivante prend sa place dans la progression.
  assert.equal((await adminB.del('/api/admin/catalogue/lecons/dys-lexique')).statut, 200);
  const dys = (await bob.get('/api/parcours')).corps.find((p) => p.id === 'decouverte-dys');
  assert.equal(dys.lecons[0].id, 'dys-comprendre');
  assert.equal(dys.lecons[0].ouverte, true);

  // Restauration à l'identique.
  assert.equal((await adminB.post('/api/admin/catalogue/parcours/decouverte-cfa/restaurer')).statut, 200);
  assert.equal((await adminB.post('/api/admin/catalogue/lecons/dys-lexique/restaurer')).statut, 200);
  const arbre = (await bob.get('/api/parcours')).corps;
  assert.ok(arbre.some((p) => p.id === 'decouverte-cfa'));
  assert.equal(arbre.find((p) => p.id === 'decouverte-dys').lecons[0].id, 'dys-lexique');
});
