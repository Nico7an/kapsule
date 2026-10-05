import {
  COOKIE, creerSession, supprimerSession, hacherMotDePasse, verifierMotDePasse, HACHAGE_FACTICE,
} from '../auth.js';
import { exigerConnexion } from '../gardes.js';
import { niveau, serieEffective, jourLocal } from '../jeu.js';
import { xpDuJour } from '../requetes.js';

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
    doitChangerMotDePasse: !!u.must_change_pw,
    xp: u.xp, ...niveau(u.xp),
    serie: serieEffective(u), meilleureSerie: u.best_streak, actifAujourdHui: u.last_active_day === jourLocal(),
    badges,
    organisation: org ? { id: org.id, nom: org.name } : null,
    objectif: org ? { fait: xpDuJour(db, u.id), cible: org.daily_goal } : null,
  };
}

export default async function routesAuth(app) {
  const { db } = app;

  const poserCookie = (reply, jeton, maxAge) => reply.setCookie(COOKIE, jeton, {
    path: '/', httpOnly: true, sameSite: 'lax', secure: app.cookieSecurise, maxAge,
  });

  app.post('/auth/connexion', async (req, reply) => {
    const { email, motDePasse } = req.body ?? {};
    if (typeof email !== 'string' || typeof motDePasse !== 'string') return reply.code(400).send({ erreur: 'E-mail et mot de passe requis' });
    const cle = `${req.ip}|${email.toLowerCase()}`;
    if (app.limiteurConnexion.depasse(cle)) return reply.code(429).send({ erreur: 'Trop d\'essais. Réessayez dans un quart d\'heure.' });
    const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim());
    const ok = verifierMotDePasse(motDePasse, u?.password_hash ?? HACHAGE_FACTICE) && u && !u.disabled;
    if (!ok) return reply.code(401).send({ erreur: 'E-mail ou mot de passe incorrect' });
    app.limiteurConnexion.reinitialiser(cle);
    const { jeton, maxAge } = creerSession(db, u.id);
    poserCookie(reply, jeton, maxAge);
    return vueMoi(db, u);
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

  app.post('/auth/inscription', async (req, reply) => {
    const { code, nom, email, motDePasse, avatar } = req.body ?? {};
    if (app.limiteurConnexion.depasse(`inscription|${req.ip}`)) return reply.code(429).send({ erreur: 'Trop d\'essais. Réessayez plus tard.' });
    const org = typeof code === 'string' ? db.prepare('SELECT id FROM orgs WHERE invite_code = ?').get(code.toUpperCase()) : null;
    if (!org) return reply.code(404).send({ erreur: 'Lien d\'invitation invalide ou expiré' });
    const erreur = verifierNom(nom) ?? (!emailValide(email) ? 'Adresse e-mail invalide' : null) ?? verifierNouveauMotDePasse(motDePasse);
    if (erreur) return reply.code(400).send({ erreur });
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email.trim())) {
      return reply.code(409).send({ erreur: 'Un compte existe déjà avec cette adresse' });
    }
    const { lastInsertRowid } = db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar) VALUES (?, ?, ?, ?, 'learner', ?)`)
      .run(org.id, email.trim(), nom.trim(), hacherMotDePasse(motDePasse), AVATARS.includes(avatar) ? avatar : AVATARS[Math.floor(Math.random() * AVATARS.length)]);
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
    const { actuel, nouveau } = req.body ?? {};
    if (typeof actuel !== 'string' || !verifierMotDePasse(actuel, req.user.password_hash)) {
      return reply.code(400).send({ erreur: 'Mot de passe actuel incorrect' });
    }
    const e = verifierNouveauMotDePasse(nouveau);
    if (e) return reply.code(400).send({ erreur: e });
    if (nouveau === actuel) return reply.code(400).send({ erreur: 'Choisissez un mot de passe différent' });
    db.prepare('UPDATE users SET password_hash = ?, must_change_pw = 0 WHERE id = ?').run(hacherMotDePasse(nouveau), req.user.id);
    // Les autres sessions sont fermées ; celle-ci reste ouverte.
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(req.user.id);
    const { jeton, maxAge } = creerSession(db, req.user.id);
    poserCookie(reply, jeton, maxAge);
    return { ok: true };
  });
}
