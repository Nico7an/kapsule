// Requêtes partagées entre les routes. Chaque fonction prend l'organisation en
// paramètre explicite : c'est ici que se joue l'étanchéité entre organisations.
import { niveau, serieEffective, lundi, jourLocal, minuitParisUTC } from './jeu.js';
import { categorieDe } from './contenu/index.js';

/** Profil public d'un membre, tel que le voient ses collègues. */
export function profilPublic(u) {
  return { id: u.id, nom: u.name, avatar: u.avatar, xp: u.xp, serie: serieEffective(u), ...niveau(u.xp) };
}

// Exclut ce que l'organisation a supprimé du catalogue commun (table org_hidden).
const PARCOURS_MASQUES = `SELECT target_id FROM org_hidden WHERE org_id = ? AND kind = 'path'`;
const LECONS_MASQUEES = `SELECT target_id FROM org_hidden WHERE org_id = ? AND kind = 'lesson'`;

/** Parcours visibles par une organisation : catalogue commun (moins ce qu'elle a supprimé) + ses défis. */
export function parcoursVisibles(db, orgId) {
  const paths = db.prepare(`SELECT * FROM paths WHERE (org_id IS NULL OR org_id = ?) AND id NOT IN (${PARCOURS_MASQUES})
    ORDER BY org_id IS NOT NULL, position, title`).all(orgId, orgId);
  const lecons = db.prepare(`SELECT id, path_id, org_id, unit, title, position, questions FROM lessons
    WHERE published = 1 AND (org_id IS NULL OR org_id = ?) AND id NOT IN (${LECONS_MASQUEES}) ORDER BY position, title`).all(orgId, orgId);
  return paths
    .map((p) => ({ ...p, lecons: lecons.filter((l) => l.path_id === p.id) }))
    .filter((p) => p.lecons.length);
}

/** Leçon visible par l'organisation, ou null. */
export function leconVisible(db, orgId, leconId) {
  return db.prepare(`SELECT * FROM lessons WHERE id = ? AND published = 1 AND (org_id IS NULL OR org_id = ?)
    AND id NOT IN (${LECONS_MASQUEES}) AND path_id NOT IN (${PARCOURS_MASQUES})`).get(leconId, orgId, orgId, orgId) ?? null;
}

/** Meilleur résultat par leçon pour un joueur. */
export function progression(db, userId) {
  const lignes = db.prepare(`SELECT lesson_id, MAX(stars) AS etoiles, MAX(failed = 0) AS reussie, COUNT(*) AS essais
    FROM attempts WHERE user_id = ? GROUP BY lesson_id`).all(userId);
  return new Map(lignes.map((l) => [l.lesson_id, l]));
}

/** Arbre des parcours avec étoiles et verrous, pour un joueur. */
export function arbreJoueur(db, user) {
  const prog = progression(db, user.id);
  return parcoursVisibles(db, user.org_id).map((p) => {
    let precedenteReussie = true;
    const lecons = p.lecons.map((l) => {
      const pr = prog.get(l.id);
      const reussie = !!pr?.reussie;
      // Les défis d'organisation sont tous ouverts ; dans le catalogue, une
      // leçon s'ouvre quand la précédente est réussie.
      // Une leçon déjà réussie reste ouverte, même si une leçon a été ajoutée avant elle.
      const ouverte = p.org_id !== null || precedenteReussie || reussie;
      precedenteReussie = reussie;
      return { id: l.id, titre: l.title, unite: l.unit, nbQuestions: JSON.parse(l.questions).length, etoiles: pr?.etoiles ?? 0, reussie, ouverte };
    });
    const faites = lecons.filter((l) => l.reussie).length;
    return {
      id: p.id, titre: p.title, description: p.description, couleur: p.color, icone: p.icon,
      categorie: categorieDe(p), defi: p.org_id !== null, lecons, faites, total: lecons.length,
    };
  });
}

/** Début de la semaine en cours (lundi 0 h, Paris) au format ISO UTC. */
export const debutSemaine = () => minuitParisUTC(lundi());
export const debutJour = (jour = jourLocal()) => minuitParisUTC(jour);

export function classementSemaine(db, orgId) {
  return db.prepare(`SELECT u.*, COALESCE(SUM(e.amount), 0) AS xp_periode
    FROM users u LEFT JOIN xp_events e ON e.user_id = u.id AND e.created_at >= ?
    WHERE u.org_id = ? AND u.disabled = 0
    GROUP BY u.id ORDER BY xp_periode DESC, u.xp DESC, u.name COLLATE NOCASE`).all(debutSemaine(), orgId);
}

export function classementGeneral(db, orgId) {
  return db.prepare(`SELECT u.*, u.xp AS xp_periode FROM users u WHERE u.org_id = ? AND u.disabled = 0
    ORDER BY u.xp DESC, u.name COLLATE NOCASE`).all(orgId);
}

export function rangDans(classement, userId) {
  const i = classement.findIndex((u) => u.id === userId);
  return i < 0 ? null : i + 1;
}

/** Classement d'un questionnaire : meilleure tentative réussie de chacun. */
export function classementLecon(db, orgId, leconId) {
  const lignes = db.prepare(`SELECT a.user_id, a.correct, a.total, a.duration_ms, a.stars, a.created_at, u.name, u.avatar, u.xp
    FROM attempts a JOIN users u ON u.id = a.user_id
    WHERE a.org_id = ? AND a.lesson_id = ? AND a.failed = 0 AND u.disabled = 0
    ORDER BY a.correct * 1.0 / a.total DESC, a.duration_ms ASC`).all(orgId, leconId);
  const vus = new Set();
  return lignes.filter((l) => !vus.has(l.user_id) && vus.add(l.user_id));
}

export function xpDuJour(db, userId) {
  return db.prepare('SELECT COALESCE(SUM(amount), 0) AS xp FROM xp_events WHERE user_id = ? AND created_at >= ?').get(userId, debutJour()).xp;
}
