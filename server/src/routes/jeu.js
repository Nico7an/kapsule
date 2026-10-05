import { randomBytes } from 'node:crypto';
import { exigerMembre } from '../gardes.js';
import { transaction } from '../db.js';
import { questionPublique, estCorrecte } from '../contenu/index.js';
import {
  BOUCLIERS, BADGES, BONUS_BADGE, calculerXp, etoiles, niveau, nouvelleSerie, jourLocal, heureLocale, badgesGagnes, serieEffective,
} from '../jeu.js';
import {
  arbreJoueur, leconVisible, classementSemaine, classementGeneral, classementLecon, rangDans, profilPublic, xpDuJour, progression,
} from '../requetes.js';

const DUREE_MAX_PARTIE = 2 * 3600_000;

export default async function routesJeu(app) {
  const { db } = app;
  app.addHook('preHandler', exigerMembre);

  app.get('/parcours', async (req) => arbreJoueur(db, req.user));

  // --- Partie --------------------------------------------------------------------

  app.post('/lecons/:id/demarrer', async (req, reply) => {
    const lecon = leconVisible(db, req.user.org_id, req.params.id);
    if (!lecon) return reply.code(404).send({ erreur: 'Leçon introuvable' });
    const arbre = arbreJoueur(db, req.user);
    const noeud = arbre.flatMap((p) => p.lecons).find((l) => l.id === lecon.id);
    if (!noeud?.ouverte) return reply.code(403).send({ erreur: 'Terminez d\'abord la leçon précédente' });

    // Une seule partie ouverte à la fois par joueur et par leçon.
    db.prepare('DELETE FROM runs WHERE user_id = ? AND (lesson_id = ? OR started_at < ?) AND finished = 0').run(req.user.id, lecon.id, Date.now() - DUREE_MAX_PARTIE);
    const id = randomBytes(16).toString('base64url');
    db.prepare('INSERT INTO runs (id, user_id, org_id, lesson_id, started_at) VALUES (?, ?, ?, ?, ?)').run(id, req.user.id, req.user.org_id, lecon.id, Date.now());
    const questions = JSON.parse(lecon.questions);
    const parcours = db.prepare('SELECT title, color FROM paths WHERE id = ?').get(lecon.path_id);
    return {
      partie: id,
      lecon: { id: lecon.id, titre: lecon.title, parcours: parcours.title, couleur: parcours.color, dejaReussie: noeud.reussie },
      boucliers: BOUCLIERS,
      questions: questions.map(questionPublique),
    };
  });

  /** Charge une partie en cours du joueur, avec sa leçon. */
  function partieEnCours(req, reply) {
    const run = db.prepare('SELECT * FROM runs WHERE id = ? AND user_id = ?').get(String(req.params.partie), req.user.id);
    if (!run || run.started_at < Date.now() - DUREE_MAX_PARTIE) { reply.code(404).send({ erreur: 'Partie introuvable ou expirée' }); return null; }
    if (run.finished) { reply.code(409).send({ erreur: 'Partie déjà terminée' }); return null; }
    const lecon = db.prepare('SELECT * FROM lessons WHERE id = ?').get(run.lesson_id);
    return { run, lecon, questions: JSON.parse(lecon.questions), reponses: JSON.parse(run.answers) };
  }

  const erreurs = (reponses) => Object.values(reponses).filter((r) => !r.ok).length;

  app.post('/parties/:partie/repondre', async (req, reply) => {
    const p = partieEnCours(req, reply);
    if (!p) return;
    const { question, reponse } = req.body ?? {};
    const q = p.questions.find((x) => x.id === question);
    if (!q) return reply.code(400).send({ erreur: 'Question inconnue' });

    // On garde la première réponse : la renvoyer ne permet pas de « réessayer ».
    let r = p.reponses[q.id];
    if (!r) {
      if (erreurs(p.reponses) >= BOUCLIERS) return reply.code(409).send({ erreur: 'Plus de boucliers' });
      r = { ok: estCorrecte(q, reponse), t: Date.now() };
      p.reponses[q.id] = r;
      db.prepare('UPDATE runs SET answers = ? WHERE id = ?').run(JSON.stringify(p.reponses), p.run.id);
    }
    const restants = Math.max(0, BOUCLIERS - erreurs(p.reponses));
    return {
      correct: r.ok,
      reponse: q.reponse,
      explication: q.explication,
      boucliers: restants,
      compromis: restants === 0,
      termine: restants === 0 || Object.keys(p.reponses).length === p.questions.length,
    };
  });

  app.post('/parties/:partie/terminer', async (req, reply) => {
    const p = partieEnCours(req, reply);
    if (!p) return;
    const { run, lecon, questions, reponses } = p;
    const echec = erreurs(reponses) >= BOUCLIERS;
    if (!echec && Object.keys(reponses).length < questions.length) return reply.code(400).send({ erreur: 'Partie incomplète' });

    const u = req.user;
    const maintenant = new Date();
    const dureeMs = Math.min(Date.now() - run.started_at, DUREE_MAX_PARTIE);
    const resultats = questions.filter((q) => reponses[q.id]).sort((a, b) => reponses[a.id].t - reponses[b.id].t).map((q) => reponses[q.id].ok);
    const correct = resultats.filter(Boolean).length;
    const total = questions.length;
    const historique = db.prepare('SELECT MAX(failed = 0) AS reussie, MAX(failed) AS ratee FROM attempts WHERE user_id = ? AND lesson_id = ?').get(u.id, lecon.id);
    const dejaReussie = !!historique.reussie;
    const xp = calculerXp({ resultats, dureeMs, echec, dejaReussie });
    const nbEtoiles = etoiles(correct, total, echec);

    const classementAvant = classementSemaine(db, u.org_id);
    const rangAvant = rangDans(classementAvant, u.id);
    const niveauAvant = niveau(u.xp);

    const resultat = transaction(db, () => {
      db.prepare('UPDATE runs SET finished = 1 WHERE id = ?').run(run.id);
      const detail = Object.fromEntries(questions.filter((q) => reponses[q.id]).map((q) => [q.id, reponses[q.id].ok]));
      db.prepare(`INSERT INTO attempts (user_id, org_id, lesson_id, correct, total, failed, stars, xp, duration_ms, answers) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(u.id, u.org_id, lecon.id, correct, total, echec ? 1 : 0, nbEtoiles, xp.total, dureeMs, JSON.stringify(detail));
      if (xp.total) db.prepare('INSERT INTO xp_events (user_id, org_id, amount, reason) VALUES (?, ?, ?, ?)').run(u.id, u.org_id, xp.total, `lecon:${lecon.id}`);

      // Série : seule une leçon réussie la prolonge.
      const aujourdHui = jourLocal(maintenant);
      const serie = echec ? serieEffective(u, aujourdHui) : nouvelleSerie(u, aujourdHui);
      if (!echec) {
        db.prepare('UPDATE users SET streak = ?, best_streak = MAX(best_streak, ?), last_active_day = ? WHERE id = ?').run(serie, serie, aujourdHui, u.id);
      }
      db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(xp.total, u.id);

      // Badges
      const arbre = arbreJoueur(db, u);
      const parcours = arbre.find((pa) => pa.lecons.some((l) => l.id === lecon.id));
      const communs = arbre.filter((pa) => !pa.defi);
      const parcoursTermine = !echec && !dejaReussie && parcours && parcours.faites === parcours.total;
      const tousParcours = !echec && communs.length > 0 && communs.every((pa) => pa.faites === pa.total);
      const xpApresPartie = u.xp + xp.total;
      const classementApres = classementSemaine(db, u.org_id);
      const participants = classementApres.filter((x) => x.xp_periode > 0).length;
      const deja = new Set(db.prepare('SELECT badge_id FROM user_badges WHERE user_id = ?').all(u.id).map((b) => b.badge_id));
      const nouveaux = badgesGagnes({
        echec, correct, total, dureeMs, meilleurCombo: xp.meilleurCombo, serie, xp: xpApresPartie,
        heure: heureLocale(maintenant), parcoursTermine, tousParcours, dejaRatee: !!historique.ratee,
        premierDeLaSemaine: participants >= 3 && classementApres[0]?.id === u.id,
      }, deja);
      for (const b of nouveaux) {
        db.prepare('INSERT INTO user_badges (user_id, badge_id) VALUES (?, ?)').run(u.id, b);
        db.prepare('INSERT INTO xp_events (user_id, org_id, amount, reason) VALUES (?, ?, ?, ?)').run(u.id, u.org_id, BONUS_BADGE, `badge:${b}`);
      }
      const bonus = nouveaux.length * BONUS_BADGE;
      if (bonus) db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(bonus, u.id);
      return { serie, nouveaux, bonus };
    });

    const apres = db.prepare('SELECT * FROM users WHERE id = ?').get(u.id);
    const classementFinal = classementSemaine(db, u.org_id);
    const rangApres = rangDans(classementFinal, u.id);
    // Qui vient-on de dépasser ?
    const depasses = rangAvant && rangApres && rangApres < rangAvant
      ? classementAvant.slice(rangApres - 1, rangAvant - 1).filter((x) => x.id !== u.id).map((x) => x.name)
      : [];
    const org = db.prepare('SELECT daily_goal FROM orgs WHERE id = ?').get(u.org_id);
    const niveauApres = niveau(apres.xp);
    return {
      echec, correct, total, dureeMs, etoiles: nbEtoiles,
      xp: { gagne: xp.total + resultat.bonus, lignes: [...xp.lignes, ...(resultat.bonus ? [{ cle: 'badges', libelle: `Badge${resultat.nouveaux.length > 1 ? 's' : ''} débloqué${resultat.nouveaux.length > 1 ? 's' : ''}`, xp: resultat.bonus }] : [])] },
      meilleurCombo: xp.meilleurCombo,
      niveauAvant, niveauApres, montee: niveauApres.niveau > niveauAvant.niveau,
      serie: resultat.serie, serieProlongee: !echec && u.last_active_day !== jourLocal(maintenant),
      badges: resultat.nouveaux.map((id) => BADGES.find((b) => b.id === id)),
      classement: { avant: rangAvant, apres: rangApres, depasses, total: classementFinal.length },
      objectif: { fait: xpDuJour(db, u.id), cible: org.daily_goal },
    };
  });

  // --- Classements (visibles de toute l'organisation, et d'elle seule) ------------------

  app.get('/classement', async (req) => {
    const periode = req.query?.periode === 'general' ? 'general' : 'semaine';
    const liste = periode === 'general' ? classementGeneral(db, req.user.org_id) : classementSemaine(db, req.user.org_id);
    return {
      periode,
      joueurs: liste.map((u, i) => ({ rang: i + 1, ...profilPublic(u), xpPeriode: u.xp_periode, moi: u.id === req.user.id })),
    };
  });

  app.get('/lecons/:id/classement', async (req, reply) => {
    const lecon = leconVisible(db, req.user.org_id, req.params.id);
    if (!lecon) return reply.code(404).send({ erreur: 'Leçon introuvable' });
    const lignes = classementLecon(db, req.user.org_id, lecon.id);
    return {
      lecon: { id: lecon.id, titre: lecon.title },
      joueurs: lignes.map((l, i) => ({
        rang: i + 1, id: l.user_id, nom: l.name, avatar: l.avatar, correct: l.correct, total: l.total,
        dureeMs: l.duration_ms, etoiles: l.stars, niveau: niveau(l.xp).niveau, moi: l.user_id === req.user.id,
      })),
    };
  });

  // --- Profil de jeu -------------------------------------------------------------------

  app.get('/badges', async (req) => {
    const obtenus = new Map(db.prepare('SELECT badge_id, earned_at FROM user_badges WHERE user_id = ?').all(req.user.id).map((b) => [b.badge_id, b.earned_at]));
    const membres = db.prepare('SELECT COUNT(*) AS n FROM users WHERE org_id = ? AND disabled = 0').get(req.user.org_id).n;
    const repartition = new Map(db.prepare(`SELECT b.badge_id, COUNT(*) AS n FROM user_badges b JOIN users u ON u.id = b.user_id
      WHERE u.org_id = ? AND u.disabled = 0 GROUP BY b.badge_id`).all(req.user.org_id).map((r) => [r.badge_id, r.n]));
    return BADGES.map((b) => ({ ...b, obtenu: obtenus.get(b.id) ?? null, partOrganisation: membres ? Math.round(100 * (repartition.get(b.id) ?? 0) / membres) : 0 }));
  });

  app.get('/statistiques', async (req) => {
    const u = req.user;
    const s = db.prepare(`SELECT COUNT(*) AS parties, COALESCE(SUM(correct), 0) AS bonnes, COALESCE(SUM(total), 0) AS questions,
      COALESCE(SUM(duration_ms), 0) AS temps FROM attempts WHERE user_id = ?`).get(u.id);
    const prog = progression(db, u.id);
    const lecons = [...prog.values()].filter((p) => p.reussie).length;
    const parfaites = [...prog.values()].filter((p) => p.etoiles === 3).length;
    // XP des 7 derniers jours, pour le petit graphique du profil.
    const jours = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400_000);
      jours.push(jourLocal(d));
    }
    const evenements = db.prepare('SELECT amount, created_at FROM xp_events WHERE user_id = ? AND created_at >= ?').all(u.id, new Date(Date.now() - 8 * 86400_000).toISOString());
    const parJour = Object.fromEntries(jours.map((j) => [j, 0]));
    for (const e of evenements) {
      const j = jourLocal(new Date(e.created_at));
      if (j in parJour) parJour[j] += e.amount;
    }
    return {
      parties: s.parties, precision: s.questions ? Math.round(100 * s.bonnes / s.questions) : null,
      tempsMinutes: Math.round(s.temps / 60000), lecons, parfaites,
      semaine: jours.map((j) => ({ jour: j, xp: parJour[j] })),
      rangSemaine: rangDans(classementSemaine(db, u.org_id), u.id),
    };
  });
}
