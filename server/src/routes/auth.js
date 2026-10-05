import {
  COOKIE, creerSession, supprimerSession, hacherMotDePasse, verifierMotDePasse, HACHAGE_FACTICE,
  creerOtp, validerOtp,
} from '../auth.js';
import { exigerConnexion } from '../gardes.js';
import { niveau, serieEffective, jourLocal } from '../jeu.js';
import { xpDuJour } from '../requetes.js';
import { envoyerCodeConnexion, envoyerCodeRejoindre } from '../email.js';

export const AVATARS = ['renard', 'chat', 'hibou', 'panda', 'robot', 'pieuvre', 'grenouille', 'lapin', 'manchot', 'raton', 'tigre', 'licorne'];

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function verifierNouveauMotDePasse(mdp) {
  if (typeof mdp !== 'string' || mdp.length < 10) return 'Le mot de passe doit faire au moins 10 caractères';
  if (mdp.length > 200) return 'Mot de passe trop long';
  return null;
}

export function verifierNom(nom) {
  if (typeof nom !== 'string' || !nom.trim()) return 'Nom manquant';
  if (nom.trim().length > 60) return 'Nom trop long (60 caractères max)';
  return null;
}

export const emailValide = (e) => typeof e === 'string' && e.length <= 200 && EMAIL.test(e.trim());

/** Ce que le client sait de l'utilisateur connecté. */
export function vueMoi(db, u) {
  const org = u.org_id ? db.prepare('SELECT id, name, daily_goal FROM orgs WHERE id = ?').get(u.org_id) : null;
  const badges = db.prepare('SELECT COUNT(*) AS n FROM user_badges WHERE user_id = ?').get(u.id).n;
  return {
    id: u.id, nom: u.name, email: u.email, role: u.role, avatar: u.avatar, son: !!u.sound,
    doitChangerMotDePasse: false,
    xp: u.xp, ...niveau(u.xp),
    serie: serieEffective(u), meilleureSerie: u.best_streak, actifAujourdHui: u.last_active_day === jourLocal(),
    badges,
    organisation: org ? { id: org.id, nom: org.name } : null,
    objectif: org ? { fait: xpDuJour(db, u.id), cible: org.daily_goal } : null,
  };
}

export default async function routesAuth(app) {
  const { db } = app;
  const env = process.env;

  const poserCookie = (reply, jeton, maxAge) => reply.setCookie(COOKIE, jeton, {
    path: '/', httpOnly: true, sameSite: 'lax', secure: app.cookieSecurise, maxAge,
  });

  // Demande d'un code OTP de connexion par e-mail
  app.post('/auth/demander-code', async (req, reply) => {
    const { email } = req.body ?? {};
    if (!emailValide(email)) return reply.code(400).send({ erreur: 'Adresse e-mail invalide' });
    const e = email.trim().toLowerCase();
    console.log(`[AUTH] Demande de code OTP pour "${e}" (IP: ${req.ip})`);

    const cle = `code|${req.ip}|${e}`;
    if (app.limiteurConnexion.depasse(cle)) {
      console.warn(`[AUTH] Limiteur de requêtes dépassé pour "${e}" (IP: ${req.ip})`);
      return reply.code(429).send({ erreur: 'Trop de demandes. Réessayez dans un quart d\'heure.' });
    }

    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(e);
    if (!u || u.disabled) {
      console.warn(`[AUTH] Aucun compte actif trouvé pour "${e}". Aucun e-mail envoyé.`);
      return reply.code(404).send({
        erreur: `Aucun compte n'est associé à l'adresse "${e}". Vérifiez l'adresse ou demandez une invitation à votre administrateur.`,
        existe: false,
      });
    }

    const code = creerOtp(db, { email: u.email, type: 'connexion', orgId: u.org_id });
    const baseUrl = env.CYBER_URL || `${req.protocol}://${req.host}`;
    const lien = `${baseUrl}/?email=${encodeURIComponent(u.email)}&code=${code}`;

    console.log(`[AUTH] Code OTP généré pour ${u.email} : ${code} | Lien direct: ${lien}`);

    await envoyerCodeConnexion({
      email: u.email,
      prenom: u.name.split(' ')[0],
      code,
      lienConnexion: lien,
    });

    return {
      ok: true,
      existe: true,
      email: u.email,
      message: 'Code envoyé par e-mail',
      ...(env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    };
  });

  // Validation du code OTP de connexion
  app.post('/auth/valider-code', async (req, reply) => {
    const { email, code } = req.body ?? {};
    if (!email || !code) return reply.code(400).send({ erreur: 'E-mail et code requis' });
    const e = String(email).trim().toLowerCase();
    const cle = `valider|${req.ip}|${e}`;
    if (app.limiteurConnexion.depasse(cle)) {
      return reply.code(429).send({ erreur: 'Trop d\'essais. Réessayez plus tard.' });
    }

    try {
      validerOtp(db, { email: e, code });
    } catch (err) {
      return reply.code(400).send({ erreur: err.message });
    }

    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(e);
    if (!u || u.disabled) return reply.code(401).send({ erreur: 'Compte désactivé ou introuvable' });

    app.limiteurConnexion.reinitialiser(cle);
    const { jeton, maxAge } = creerSession(db, u.id);
    poserCookie(reply, jeton, maxAge);
    return vueMoi(db, u);
  });

  // Connexion combinée (OTP ou mot de passe en secours legacy)
  app.post('/auth/connexion', async (req, reply) => {
    const { email, code, motDePasse } = req.body ?? {};
    if (!email) return reply.code(400).send({ erreur: 'E-mail requis' });
    const e = String(email).trim().toLowerCase();

    if (code) {
      try {
        validerOtp(db, { email: e, code });
      } catch (err) {
        return reply.code(400).send({ erreur: err.message });
      }
      const u = db.prepare('SELECT * FROM users WHERE email = ?').get(e);
      if (!u || u.disabled) return reply.code(401).send({ erreur: 'Compte désactivé ou introuvable' });
      const { jeton, maxAge } = creerSession(db, u.id);
      poserCookie(reply, jeton, maxAge);
      return vueMoi(db, u);
    }

    if (motDePasse) {
      const cle = `${req.ip}|${e}`;
      if (app.limiteurConnexion.depasse(cle)) return reply.code(429).send({ erreur: 'Trop d\'essais. Réessayez dans un quart d\'heure.' });
      const u = db.prepare('SELECT * FROM users WHERE email = ?').get(e);
      const ok = verifierMotDePasse(motDePasse, u?.password_hash ?? HACHAGE_FACTICE) && u && !u.disabled;
      if (!ok) return reply.code(401).send({ erreur: 'E-mail ou mot de passe incorrect' });
      app.limiteurConnexion.reinitialiser(cle);
      const { jeton, maxAge } = creerSession(db, u.id);
      poserCookie(reply, jeton, maxAge);
      return vueMoi(db, u);
    }

    return reply.code(400).send({ erreur: 'Code de connexion requis' });
  });

  app.post('/auth/deconnexion', async (req, reply) => {
    supprimerSession(db, req.cookies?.[COOKIE]);
    reply.clearCookie(COOKIE, { path: '/' });
    return { ok: true };
  });

  app.get('/auth/invitation/:code', async (req, reply) => {
    const org = db.prepare('SELECT name FROM orgs WHERE invite_code = ?').get(String(req.params.code).toUpperCase());
    if (!org) return reply.code(404).send({ erreur: 'Lien d\'invitation invalide ou expiré' });
    return { organisation: org.name };
  });

  // Étape 1 d'inscription publique : envoi de l'OTP
  app.post('/auth/demander-inscription', async (req, reply) => {
    const { code, nom, email, avatar } = req.body ?? {};
    if (app.limiteurConnexion.depasse(`inscription|${req.ip}`)) return reply.code(429).send({ erreur: 'Trop d\'essais. Réessayez plus tard.' });
    const org = typeof code === 'string' ? db.prepare('SELECT id, name FROM orgs WHERE invite_code = ?').get(code.toUpperCase()) : null;
    if (!org) return reply.code(404).send({ erreur: 'Lien d\'invitation invalide ou expiré' });
    const erreur = verifierNom(nom) ?? (!emailValide(email) ? 'Adresse e-mail invalide' : null);
    if (erreur) return reply.code(400).send({ erreur });
    const e = email.trim().toLowerCase();
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(e)) {
      return reply.code(409).send({ erreur: 'Un compte existe déjà avec cette adresse' });
    }
    const otp = creerOtp(db, { email: e, type: 'inscription', orgId: org.id, metadata: { nom: nom.trim(), avatar, code } });
    await envoyerCodeRejoindre({ email: e, prenom: nom.trim().split(' ')[0], organisation: org.name, code: otp });
    return { ok: true, organisation: org.name, ...(env.NODE_ENV !== 'production' ? { devCode: otp } : {}) };
  });

  // Étape 2 d'inscription publique : validation du code et création de compte
  app.post('/auth/valider-inscription', async (req, reply) => {
    const { email, code } = req.body ?? {};
    if (!email || !code) return reply.code(400).send({ erreur: 'E-mail et code requis' });
    const e = String(email).trim().toLowerCase();
    let r;
    try {
      r = validerOtp(db, { email: e, code, type: 'inscription' });
    } catch (err) {
      return reply.code(400).send({ erreur: err.message });
    }
    const org = db.prepare('SELECT id, name FROM orgs WHERE id = ?').get(r.orgId);
    if (!org) return reply.code(404).send({ erreur: 'Organisation introuvable' });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(r.email)) {
      return reply.code(409).send({ erreur: 'Un compte existe déjà avec cette adresse' });
    }
    const { nom, avatar } = r.metadata;
    const { lastInsertRowid } = db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar) VALUES (?, ?, ?, '', 'learner', ?)`)
      .run(org.id, r.email, nom || 'Apprenant', AVATARS.includes(avatar) ? avatar : AVATARS[0]);
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
    const { jeton, maxAge } = creerSession(db, u.id);
    poserCookie(reply, jeton, maxAge);
    return reply.code(201).send(vueMoi(db, u));
  });

  // Route d'inscription compatible (avec mot de passe ou sans)
  app.post('/auth/inscription', async (req, reply) => {
    const { code, nom, email, motDePasse, avatar } = req.body ?? {};
    if (app.limiteurConnexion.depasse(`inscription|${req.ip}`)) return reply.code(429).send({ erreur: 'Trop d\'essais. Réessayez plus tard.' });
    const org = typeof code === 'string' ? db.prepare('SELECT id FROM orgs WHERE invite_code = ?').get(code.toUpperCase()) : null;
    if (!org) return reply.code(404).send({ erreur: 'Lien d\'invitation invalide ou expiré' });
    const erreur = verifierNom(nom) ?? (!emailValide(email) ? 'Adresse e-mail invalide' : null);
    if (erreur) return reply.code(400).send({ erreur });
    if (motDePasse && verifierNouveauMotDePasse(motDePasse)) {
      return reply.code(400).send({ erreur: verifierNouveauMotDePasse(motDePasse) });
    }
    const e = email.trim().toLowerCase();
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(e)) {
      return reply.code(409).send({ erreur: 'Un compte existe déjà avec cette adresse' });
    }
    const { lastInsertRowid } = db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar) VALUES (?, ?, ?, ?, 'learner', ?)`)
      .run(org.id, e, nom.trim(), motDePasse ? hacherMotDePasse(motDePasse) : '', AVATARS.includes(avatar) ? avatar : AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    const u = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);
    const { jeton, maxAge } = creerSession(db, u.id);
    poserCookie(reply, jeton, maxAge);
    return reply.code(201).send(vueMoi(db, u));
  });

  app.get('/moi', { preHandler: exigerConnexion }, async (req) => vueMoi(db, req.user));

  app.patch('/moi', { preHandler: exigerConnexion }, async (req, reply) => {
    const { nom, avatar, son } = req.body ?? {};
    if (nom !== undefined) {
      const e = verifierNom(nom);
      if (e) return reply.code(400).send({ erreur: e });
      db.prepare('UPDATE users SET name = ? WHERE id = ?').run(nom.trim(), req.user.id);
    }
    if (avatar !== undefined) {
      if (!AVATARS.includes(avatar)) return reply.code(400).send({ erreur: 'Avatar inconnu' });
      db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(avatar, req.user.id);
    }
    if (son !== undefined) db.prepare('UPDATE users SET sound = ? WHERE id = ?').run(son ? 1 : 0, req.user.id);
    return vueMoi(db, db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id));
  });

  app.post('/moi/mot-de-passe', { preHandler: exigerConnexion }, async (req, reply) => {
    const { nouveau } = req.body ?? {};
    const e = verifierNouveauMotDePasse(nouveau);
    if (e) return reply.code(400).send({ erreur: e });
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hacherMotDePasse(nouveau), req.user.id);
    return { ok: true };
  });
}
