// Tableau de bord d'un administrateur d'organisation. Toutes les requêtes sont
// bornées à req.user.org_id : un admin ne voit jamais une autre organisation.
import { randomBytes } from 'node:crypto';
import { exigerAdmin } from '../gardes.js';
import { transaction } from '../db.js';
import { hacherMotDePasse, motDePasseTemporaire, codeInvitation, creerOtp } from '../auth.js';
import { validerQuestions, ErreurValidation, categorieDe } from '../contenu/index.js';
import { niveau, serieEffective, jourLocal, BADGES } from '../jeu.js';
import { parcoursVisibles, classementSemaine, progression, debutSemaine } from '../requetes.js';
import { AVATARS, emailValide, verifierNom } from './auth.js';
import { envoyerInvitationMembre } from '../email.js';

const JOUR = 86400_000;

export default async function routesAdmin(app) {
  const { db } = app;
  app.addHook('preHandler', exigerAdmin);

  /** Membre de l'organisation de l'admin, ou null. */
  const membre = (req, id) => db.prepare('SELECT * FROM users WHERE id = ? AND org_id = ?').get(Number(id), req.user.org_id) ?? null;

  // --- Vue d'ensemble -------------------------------------------------------------------

  app.get('/vue-ensemble', async (req) => {
    const org = req.user.org_id;
    const il7j = new Date(Date.now() - 7 * JOUR).toISOString();
    const il30j = new Date(Date.now() - 30 * JOUR).toISOString();
    const membres = db.prepare('SELECT * FROM users WHERE org_id = ? AND disabled = 0').all(org);
    const actifs7 = db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM attempts WHERE org_id = ? AND created_at >= ?').get(org, il7j).n;
    const actifsPrec = db.prepare('SELECT COUNT(DISTINCT user_id) AS n FROM attempts WHERE org_id = ? AND created_at >= ? AND created_at < ?')
      .get(org, new Date(Date.now() - 14 * JOUR).toISOString(), il7j).n;
    const totaux = db.prepare(`SELECT COUNT(*) AS parties, COALESCE(SUM(failed = 0), 0) AS reussies, COALESCE(SUM(correct), 0) AS bonnes,
      COALESCE(SUM(total), 0) AS questions, COALESCE(SUM(duration_ms), 0) AS temps FROM attempts WHERE org_id = ?`).get(org);
    const xpSemaine = db.prepare('SELECT COALESCE(SUM(amount), 0) AS xp FROM xp_events WHERE org_id = ? AND created_at >= ?').get(org, debutSemaine()).xp;

    // Activité quotidienne sur 30 jours (fuseau de Paris)
    const jours = [];
    for (let i = 29; i >= 0; i--) jours.push(jourLocal(new Date(Date.now() - i * JOUR)));
    const activite = Object.fromEntries(jours.map((j) => [j, { jour: j, parties: 0, joueurs: new Set(), xp: 0 }]));
    for (const a of db.prepare('SELECT user_id, xp, created_at FROM attempts WHERE org_id = ? AND created_at >= ?').all(org, il30j)) {
      const j = activite[jourLocal(new Date(a.created_at))];
      if (j) { j.parties++; j.joueurs.add(a.user_id); j.xp += a.xp; }
    }

    // Avancement par parcours
    const parcours = parcoursVisibles(db, org);
    const reussites = db.prepare('SELECT DISTINCT a.user_id, a.lesson_id FROM attempts a JOIN users u ON u.id = a.user_id WHERE a.org_id = ? AND a.failed = 0 AND u.disabled = 0').all(org);
    const parMembre = new Map();
    for (const r of reussites) {
      if (!parMembre.has(r.user_id)) parMembre.set(r.user_id, new Set());
      parMembre.get(r.user_id).add(r.lesson_id);
    }
    const avancement = parcours.map((p) => {
      const ids = p.lecons.map((l) => l.id);
      let somme = 0, termines = 0, commences = 0;
      for (const m of membres) {
        const faites = ids.filter((id) => parMembre.get(m.id)?.has(id)).length;
        somme += faites / ids.length;
        if (faites === ids.length) termines++;
        if (faites > 0) commences++;
      }
      return { id: p.id, titre: p.title, couleur: p.color, icone: p.icon, defi: p.org_id !== null, lecons: ids.length,
        moyenne: membres.length ? Math.round(100 * somme / membres.length) : 0, termines, commences };
    });

    return {
      organisation: db.prepare('SELECT name, invite_code, daily_goal FROM orgs WHERE id = ?').get(org),
      indicateurs: {
        membres: membres.length,
        actifs7, actifsPrec,
        parties: totaux.parties,
        lecons: totaux.reussies,
        precision: totaux.questions ? Math.round(100 * totaux.bonnes / totaux.questions) : null,
        heures: Math.round(totaux.temps / 360000) / 10,
        xpSemaine,
        seriesActives: membres.filter((m) => serieEffective(m) > 0).length,
      },
      activite: Object.values(activite).map((j) => ({ jour: j.jour, parties: j.parties, joueurs: j.joueurs.size, xp: j.xp })),
      avancement,
      questionsDifficiles: questionsDifficiles(org, parcours),
      podium: classementSemaine(db, org).slice(0, 5).map((u) => ({ id: u.id, nom: u.name, avatar: u.avatar, xp: u.xp_periode, niveau: niveau(u.xp).niveau })),
      inactifs: membres
        .filter((m) => !m.last_active_day || m.last_active_day < jourLocal(new Date(Date.now() - 14 * JOUR)))
        .map((m) => ({ id: m.id, nom: m.name, avatar: m.avatar, derniereActivite: m.last_active_day }))
        .slice(0, 12),
    };
  });

  /** Questions au plus fort taux d'erreur (au moins 3 réponses). */
  function questionsDifficiles(org, parcours) {
    const stats = new Map();
    for (const a of db.prepare('SELECT lesson_id, answers FROM attempts WHERE org_id = ?').all(org)) {
      for (const [qid, ok] of Object.entries(JSON.parse(a.answers))) {
        const cle = `${a.lesson_id}|${qid}`;
        const s = stats.get(cle) ?? { n: 0, ko: 0 };
        s.n++; if (!ok) s.ko++;
        stats.set(cle, s);
      }
    }
    const lecons = new Map(parcours.flatMap((p) => p.lecons.map((l) => [l.id, { ...l, parcours: p.title }])));
    return [...stats.entries()]
      .filter(([, s]) => s.n >= 3 && s.ko > 0)
      .map(([cle, s]) => {
        const [leconId, qid] = cle.split('|');
        const l = lecons.get(leconId);
        const q = l && JSON.parse(l.questions).find((x) => x.id === qid);
        return q ? { lecon: l.title, parcours: l.parcours, enonce: q.enonce, bonneReponse: [q.reponse].flat().map((i) => q.choix[i]).join(' · '), reponses: s.n, erreurs: Math.round(100 * s.ko / s.n) } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.erreurs - a.erreurs || b.reponses - a.reponses)
      .slice(0, 8);
  }

  // --- Membres ----------------------------------------------------------------------------

  function statsMembres(org) {
    const lignes = db.prepare(`SELECT user_id, COUNT(*) AS parties, COUNT(DISTINCT CASE WHEN failed = 0 THEN lesson_id END) AS lecons,
      SUM(correct) AS bonnes, SUM(total) AS questions, MAX(created_at) AS derniere FROM attempts WHERE org_id = ? GROUP BY user_id`).all(org);
    return new Map(lignes.map((l) => [l.user_id, l]));
  }

  const vueMembre = (u, s, rang) => ({
    id: u.id, nom: u.name, email: u.email, role: u.role, avatar: u.avatar, desactive: !!u.disabled,
    xp: u.xp, niveau: niveau(u.xp).niveau, grade: niveau(u.xp).grade, serie: serieEffective(u), meilleureSerie: u.best_streak,
    parties: s?.parties ?? 0, lecons: s?.lecons ?? 0, precision: s?.questions ? Math.round(100 * s.bonnes / s.questions) : null,
    derniereActivite: s?.derniere ?? null, inscrit: u.created_at, rangSemaine: rang ?? null,
  });

  app.get('/membres', async (req) => {
    const org = req.user.org_id;
    const stats = statsMembres(org);
    const rangs = new Map(classementSemaine(db, org).map((u, i) => [u.id, i + 1]));
    const total = parcoursVisibles(db, org).reduce((n, p) => n + p.lecons.length, 0);
    return {
      totalLecons: total,
      membres: db.prepare('SELECT * FROM users WHERE org_id = ? ORDER BY disabled, name COLLATE NOCASE').all(org).map((u) => vueMembre(u, stats.get(u.id), rangs.get(u.id))),
    };
  });

  app.get('/membres/:id', async (req, reply) => {
    const u = membre(req, req.params.id);
    if (!u) return reply.code(404).send({ erreur: 'Membre introuvable' });
    const org = req.user.org_id;
    const titres = new Map(db.prepare('SELECT id, title FROM lessons WHERE org_id IS NULL OR org_id = ?').all(org).map((l) => [l.id, l.title]));
    const prog = progression(db, u.id);
    const parcours = parcoursVisibles(db, org).map((p) => ({
      titre: p.title, couleur: p.color,
      lecons: p.lecons.map((l) => ({ titre: l.title, etoiles: prog.get(l.id)?.etoiles ?? 0, reussie: !!prog.get(l.id)?.reussie, essais: prog.get(l.id)?.essais ?? 0 })),
    }));
    const badges = new Map(db.prepare('SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?').all(u.id).map((b) => [b.badge_id, b.earned_at]));
    return {
      ...vueMembre(u, statsMembres(org).get(u.id), new Map(classementSemaine(db, org).map((x, i) => [x.id, i + 1])).get(u.id)),
      parcours,
      badges: BADGES.filter((b) => badges.has(b.id)).map((b) => ({ ...b, obtenu: badges.get(b.id) })),
      historique: db.prepare('SELECT lesson_id, correct, total, failed, stars, xp, duration_ms, created_at FROM attempts WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
        .all(u.id).map((a) => ({ lecon: titres.get(a.lesson_id) ?? a.lesson_id, correct: a.correct, total: a.total, echec: !!a.failed, etoiles: a.stars, xp: a.xp, dureeMs: a.duration_ms, date: a.created_at })),
    };
  });

  app.post('/membres', async (req, reply) => {
    const { nom, email, role } = req.body ?? {};
    const e = verifierNom(nom) ?? (!emailValide(email) ? 'Adresse e-mail invalide' : null) ?? (!['admin', 'learner'].includes(role) ? 'Rôle invalide' : null);
    if (e) return reply.code(400).send({ erreur: e });
    const emailNormalise = email.trim().toLowerCase();
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(emailNormalise)) return reply.code(409).send({ erreur: 'Un compte existe déjà avec cette adresse' });
    
    const org = db.prepare('SELECT name FROM orgs WHERE id = ?').get(req.user.org_id);
    const { lastInsertRowid } = db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar) VALUES (?, ?, ?, '', ?, ?)`)
      .run(req.user.org_id, emailNormalise, nom.trim(), role, AVATARS[Math.floor(Math.random() * AVATARS.length)]);
    
    const code = creerOtp(db, { email: emailNormalise, type: 'invitation', orgId: req.user.org_id, invitedBy: req.user.id });
    const baseUrl = process.env.KAPSULE_URL || `${req.protocol}://${req.host}`;
    const lien = `${baseUrl}/?email=${encodeURIComponent(emailNormalise)}&code=${code}`;

    const envoi = await envoyerInvitationMembre({
      email: emailNormalise,
      nom: nom.trim(),
      organisation: org?.name || 'Votre organisation',
      invitePar: req.user.name,
      code,
      lienConnexion: lien,
    });

    return reply.code(201).send({
      id: Number(lastInsertRowid),
      code,
      emailEnvoye: envoi.ok,
      ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    });
  });

  app.post('/membres/:id/inviter', async (req, reply) => {
    const u = membre(req, req.params.id);
    if (!u) return reply.code(404).send({ erreur: 'Membre introuvable' });
    const org = db.prepare('SELECT name FROM orgs WHERE id = ?').get(req.user.org_id);
    const code = creerOtp(db, { email: u.email, type: 'invitation', orgId: req.user.org_id, invitedBy: req.user.id });
    const baseUrl = process.env.KAPSULE_URL || `${req.protocol}://${req.host}`;
    const lien = `${baseUrl}/?email=${encodeURIComponent(u.email)}&code=${code}`;

    const envoi = await envoyerInvitationMembre({
      email: u.email,
      nom: u.name,
      organisation: org?.name || 'Votre organisation',
      invitePar: req.user.name,
      code,
      lienConnexion: lien,
    });

    return { ok: true, email: u.email, code, emailEnvoye: envoi.ok, ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}) };
  });

  app.patch('/membres/:id', async (req, reply) => {
    const u = membre(req, req.params.id);
    if (!u) return reply.code(404).send({ erreur: 'Membre introuvable' });
    const { role, desactive } = req.body ?? {};
    if (u.id === req.user.id && (role !== undefined || desactive !== undefined)) {
      return reply.code(400).send({ erreur: 'Vous ne pouvez pas modifier votre propre rôle ni vous désactiver' });
    }
    if (role !== undefined) {
      if (!['admin', 'learner'].includes(role)) return reply.code(400).send({ erreur: 'Rôle invalide' });
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(role, u.id);
    }
    if (desactive !== undefined) {
      db.prepare('UPDATE users SET disabled = ? WHERE id = ?').run(desactive ? 1 : 0, u.id);
      if (desactive) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
    }
    return { ok: true };
  });

  app.post('/membres/:id/reinitialiser', async (req, reply) => {
    const u = membre(req, req.params.id);
    if (!u) return reply.code(404).send({ erreur: 'Membre introuvable' });
    if (u.id === req.user.id) return reply.code(400).send({ erreur: 'Changez votre propre mot de passe depuis votre profil' });
    const mdp = motDePasseTemporaire();
    db.prepare('UPDATE users SET password_hash = ?, must_change_pw = 1 WHERE id = ?').run(hacherMotDePasse(mdp), u.id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(u.id);
    return { motDePasseTemporaire: mdp };
  });

  app.delete('/membres/:id', async (req, reply) => {
    const u = membre(req, req.params.id);
    if (!u) return reply.code(404).send({ erreur: 'Membre introuvable' });
    if (u.id === req.user.id) return reply.code(400).send({ erreur: 'Vous ne pouvez pas supprimer votre propre compte' });
    db.prepare('DELETE FROM users WHERE id = ?').run(u.id);
    return { ok: true };
  });

  app.get('/export.csv', async (req, reply) => {
    const org = req.user.org_id;
    const stats = statsMembres(org);
    const champ = (v) => {
      const s = String(v ?? '');
      // Neutralise l'injection de formules à l'ouverture dans un tableur.
      const sur = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
      return /[";\n]/.test(sur) ? `"${sur.replace(/"/g, '""')}"` : sur;
    };
    const lignes = [['Nom', 'E-mail', 'Rôle', 'Statut', 'XP', 'Niveau', 'Série', 'Leçons réussies', 'Parties', 'Précision (%)', 'Dernière activité', 'Inscription']];
    for (const u of db.prepare('SELECT * FROM users WHERE org_id = ? ORDER BY name COLLATE NOCASE').all(org)) {
      const v = vueMembre(u, stats.get(u.id));
      lignes.push([v.nom, v.email, v.role === 'admin' ? 'Admin' : 'Apprenant', v.desactive ? 'Désactivé' : 'Actif', v.xp, v.niveau, v.serie, v.lecons, v.parties, v.precision ?? '', v.derniereActivite ?? '', v.inscrit]);
    }
    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header('Content-Disposition', `attachment; filename="kapsule-membres-${jourLocal()}.csv"`);
    return '﻿' + lignes.map((l) => l.map(champ).join(';')).join('\r\n');
  });

  // --- Organisation ---------------------------------------------------------------------------

  app.patch('/organisation', async (req, reply) => {
    const { nom, objectif } = req.body ?? {};
    if (nom !== undefined) {
      if (typeof nom !== 'string' || !nom.trim() || nom.length > 80) return reply.code(400).send({ erreur: 'Nom invalide' });
      db.prepare('UPDATE orgs SET name = ? WHERE id = ?').run(nom.trim(), req.user.org_id);
    }
    if (objectif !== undefined) {
      if (![20, 30, 50, 80, 120].includes(objectif)) return reply.code(400).send({ erreur: 'Objectif invalide' });
      db.prepare('UPDATE orgs SET daily_goal = ? WHERE id = ?').run(objectif, req.user.org_id);
    }
    return db.prepare('SELECT name, invite_code, daily_goal FROM orgs WHERE id = ?').get(req.user.org_id);
  });

  app.post('/organisation/invitation', async (req) => {
    const code = codeInvitation();
    db.prepare('UPDATE orgs SET invite_code = ? WHERE id = ?').run(code, req.user.org_id);
    return { invite_code: code };
  });

  // --- Défis maison (questionnaires propres à l'organisation) ------------------------------------

  const idParcoursDefis = (org) => `org-${org}-defis`;

  function assurerParcoursDefis(req) {
    const id = idParcoursDefis(req.user.org_id);
    db.prepare(`INSERT OR IGNORE INTO paths (id, org_id, title, description, color, icon, position) VALUES (?, ?, ?, ?, 'rose', 'cible', 100)`)
      .run(id, req.user.org_id, 'Défis maison', 'Questionnaires préparés par votre organisation.');
    return id;
  }

  const defi = (req, id) => db.prepare('SELECT * FROM lessons WHERE id = ? AND org_id = ?').get(String(id), req.user.org_id) ?? null;

  app.get('/defis', async (req) => {
    const org = req.user.org_id;
    const stats = new Map(db.prepare(`SELECT lesson_id, COUNT(*) AS parties, COUNT(DISTINCT user_id) AS joueurs, SUM(correct) AS bonnes, SUM(total) AS questions
      FROM attempts WHERE org_id = ? GROUP BY lesson_id`).all(org).map((s) => [s.lesson_id, s]));
    return db.prepare('SELECT * FROM lessons WHERE org_id = ? ORDER BY position, updated_at DESC').all(org).map((l) => {
      const s = stats.get(l.id);
      return { id: l.id, titre: l.title, publie: !!l.published, nbQuestions: JSON.parse(l.questions).length, misAJour: l.updated_at,
        parties: s?.parties ?? 0, joueurs: s?.joueurs ?? 0, precision: s?.questions ? Math.round(100 * s.bonnes / s.questions) : null };
    });
  });

  app.get('/defis/:id', async (req, reply) => {
    const l = defi(req, req.params.id);
    if (!l) return reply.code(404).send({ erreur: 'Défi introuvable' });
    return { id: l.id, titre: l.title, publie: !!l.published, questions: JSON.parse(l.questions) };
  });

  const lireDefi = (body) => {
    const titre = typeof body?.titre === 'string' ? body.titre.trim() : '';
    if (!titre || titre.length > 80) throw new ErreurValidation('Titre requis (80 caractères max)');
    return { titre, publie: body.publie !== false, questions: validerQuestions(body.questions) };
  };

  app.post('/defis', async (req, reply) => {
    const d = lireDefi(req.body);
    const parcours = assurerParcoursDefis(req);
    const id = `org${req.user.org_id}-${randomBytes(5).toString('hex')}`;
    const position = db.prepare('SELECT COALESCE(MAX(position), -1) + 1 AS p FROM lessons WHERE path_id = ?').get(parcours).p;
    db.prepare(`INSERT INTO lessons (id, path_id, org_id, unit, title, position, questions, published) VALUES (?, ?, ?, 'Défis maison', ?, ?, ?, ?)`)
      .run(id, parcours, req.user.org_id, d.titre, position, JSON.stringify(d.questions), d.publie ? 1 : 0);
    return reply.code(201).send({ id });
  });

  app.put('/defis/:id', async (req, reply) => {
    const l = defi(req, req.params.id);
    if (!l) return reply.code(404).send({ erreur: 'Défi introuvable' });
    const d = lireDefi(req.body);
    transaction(db, () => {
      db.prepare(`UPDATE lessons SET title = ?, questions = ?, published = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') WHERE id = ?`)
        .run(d.titre, JSON.stringify(d.questions), d.publie ? 1 : 0, l.id);
      // Les parties en cours portent sur l'ancienne version : on les abandonne.
      db.prepare('DELETE FROM runs WHERE lesson_id = ? AND finished = 0').run(l.id);
    });
    return { ok: true };
  });

  app.delete('/defis/:id', async (req, reply) => {
    const l = defi(req, req.params.id);
    if (!l) return reply.code(404).send({ erreur: 'Défi introuvable' });
    db.prepare('DELETE FROM lessons WHERE id = ?').run(l.id);
    return { ok: true };
  });

  // --- Défis standard (catalogue commun) --------------------------------------------------
  // Une organisation peut supprimer un parcours ou une leçon du catalogue : ils
  // disparaissent pour ses membres seulement. L'historique (tentatives, XP) est
  // conservé, ce qui permet de restaurer à l'identique.

  app.get('/catalogue', async (req) => {
    const org = req.user.org_id;
    const masques = db.prepare('SELECT kind, target_id FROM org_hidden WHERE org_id = ?').all(org);
    const estMasque = (kind, id) => masques.some((m) => m.kind === kind && m.target_id === id);
    const lecons = db.prepare('SELECT id, path_id, unit, title, questions FROM lessons WHERE org_id IS NULL AND published = 1 ORDER BY position').all();
    return db.prepare('SELECT * FROM paths WHERE org_id IS NULL ORDER BY position, title').all()
      .map((p) => ({
        id: p.id, titre: p.title, description: p.description, couleur: p.color, icone: p.icon, categorie: categorieDe(p),
        supprime: estMasque('path', p.id),
        lecons: lecons.filter((l) => l.path_id === p.id)
          .map((l) => ({ id: l.id, titre: l.title, unite: l.unit, nbQuestions: JSON.parse(l.questions).length, supprimee: estMasque('lesson', l.id) })),
      }))
      .filter((p) => p.lecons.length);
  });

  const CIBLES = {
    parcours: { kind: 'path', existe: (id) => db.prepare('SELECT 1 FROM paths WHERE id = ? AND org_id IS NULL').get(id),
      lecons: (id) => db.prepare('SELECT id FROM lessons WHERE path_id = ?').all(id).map((l) => l.id) },
    lecons: { kind: 'lesson', existe: (id) => db.prepare('SELECT 1 FROM lessons WHERE id = ? AND org_id IS NULL').get(id), lecons: (id) => [id] },
  };

  const cible = (req, reply) => {
    const c = CIBLES[req.params.type];
    const id = String(req.params.id);
    if (!c || !c.existe(id)) { reply.code(404).send({ erreur: 'Contenu introuvable' }); return null; }
    return { ...c, id };
  };

  app.delete('/catalogue/:type/:id', async (req, reply) => {
    const c = cible(req, reply);
    if (!c) return;
    const org = req.user.org_id;
    transaction(db, () => {
      db.prepare('INSERT OR IGNORE INTO org_hidden (org_id, kind, target_id) VALUES (?, ?, ?)').run(org, c.kind, c.id);
      // Les parties en cours sur ce contenu ne peuvent plus aboutir.
      const fin = db.prepare('DELETE FROM runs WHERE org_id = ? AND lesson_id = ? AND finished = 0');
      for (const l of c.lecons(c.id)) fin.run(org, l);
    });
    return { ok: true };
  });

  app.post('/catalogue/:type/:id/restaurer', async (req, reply) => {
    const c = cible(req, reply);
    if (!c) return;
    db.prepare('DELETE FROM org_hidden WHERE org_id = ? AND kind = ? AND target_id = ?').run(req.user.org_id, c.kind, c.id);
    return { ok: true };
  });

}
