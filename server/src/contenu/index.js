import { CATALOGUE } from './catalogue.js';
import { CATEGORIES, CATEGORIE_DEFIS } from './categories.js';
import { transaction } from '../db.js';

export class ErreurValidation extends Error {
  constructor(message) { super(message); this.statusCode = 400; }
}

const COULEURS = ['jaune', 'orange', 'vert', 'bleu', 'rouge', 'rose'];
export const ICONES = ['cadenas', 'hamecon', 'valise', 'dossier', 'sirene', 'bouclier', 'cible', 'eclair',
  'balance', 'marteau', 'calculatrice', 'immeuble', 'code', 'megaphone', 'tendance', 'casque', 'puce', 'boussole', 'infini', 'livre', 'diplome'];

const texte = (v, max, quoi) => {
  if (typeof v !== 'string' || !v.trim()) throw new ErreurValidation(`${quoi} manquant`);
  if (v.length > max) throw new ErreurValidation(`${quoi} trop long (${max} caractères max)`);
  return v.trim();
};

/** Valide et normalise une liste de questions (catalogue ou défi d'organisation). */
export function validerQuestions(questions) {
  if (!Array.isArray(questions) || questions.length < 1) throw new ErreurValidation('Il faut au moins une question');
  if (questions.length > 30) throw new ErreurValidation('30 questions au maximum');
  const ids = new Set();
  return questions.map((q, i) => {
    const n = `Question ${i + 1}`;
    if (!q || typeof q !== 'object') throw new ErreurValidation(`${n} invalide`);
    const id = q.id ? texte(q.id, 40, `${n} : identifiant`) : `q${i + 1}`;
    if (ids.has(id)) throw new ErreurValidation(`${n} : identifiant en double`);
    ids.add(id);
    if (q.type !== 'unique' && q.type !== 'multiple') throw new ErreurValidation(`${n} : type inconnu`);
    const choix = Array.isArray(q.choix) ? q.choix.map((c, j) => texte(c, 200, `${n}, choix ${j + 1}`)) : [];
    if (choix.length < 2 || choix.length > 6) throw new ErreurValidation(`${n} : entre 2 et 6 choix`);
    let reponse;
    if (q.type === 'unique') {
      if (!Number.isInteger(q.reponse) || q.reponse < 0 || q.reponse >= choix.length) throw new ErreurValidation(`${n} : bonne réponse à cocher`);
      reponse = q.reponse;
    } else {
      if (!Array.isArray(q.reponse) || !q.reponse.length) throw new ErreurValidation(`${n} : au moins une bonne réponse`);
      reponse = [...new Set(q.reponse)].sort((a, b) => a - b);
      if (reponse.some((r) => !Number.isInteger(r) || r < 0 || r >= choix.length)) throw new ErreurValidation(`${n} : bonne réponse invalide`);
    }
    const sortie = {
      id, type: q.type,
      enonce: texte(q.enonce, 500, `${n} : énoncé`),
      choix, reponse,
      explication: typeof q.explication === 'string' ? q.explication.trim().slice(0, 800) : '',
    };
    if (q.support) sortie.support = validerSupport(q.support, n);
    return sortie;
  });
}

function validerSupport(s, n) {
  const opt = (v, max) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  if (s.type === 'email') return { type: 'email', de: texte(s.de, 200, `${n} : expéditeur`), objet: opt(s.objet, 200) ?? '', corps: opt(s.corps, 2000) ?? '', ...(s.lien ? { lien: opt(s.lien, 100) } : {}) };
  if (s.type === 'sms') return { type: 'sms', de: texte(s.de, 60, `${n} : expéditeur`), corps: texte(s.corps, 600, `${n} : SMS`) };
  if (s.type === 'url') return { type: 'url', url: texte(s.url, 300, `${n} : adresse`) };
  throw new ErreurValidation(`${n} : support inconnu`);
}

/** Ce que voit le joueur avant de répondre : ni bonne réponse, ni explication. */
export function questionPublique(q) {
  const { reponse, explication, ...reste } = q;
  return { ...reste, nbReponses: q.type === 'multiple' ? q.reponse.length : 1 };
}

export function estCorrecte(q, reponse) {
  if (q.type === 'unique') return Number.isInteger(reponse) && reponse === q.reponse;
  if (!Array.isArray(reponse)) return false;
  const r = [...new Set(reponse)].sort((a, b) => a - b);
  return r.length === q.reponse.length && r.every((v, i) => v === q.reponse[i]);
}

/**
 * Réécrit le catalogue commun en base. Les leçons retirées du catalogue sont
 * dépubliées plutôt que supprimées, pour ne pas effacer l'historique des
 * joueurs.
 */
export function synchroniserCatalogue(db) {
  transaction(db, () => {
    const presentes = new Set();
    const upPath = db.prepare(`INSERT INTO paths (id, org_id, title, description, color, icon, position) VALUES (?, NULL, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET title = excluded.title, description = excluded.description, color = excluded.color, icon = excluded.icon, position = excluded.position`);
    const upLecon = db.prepare(`INSERT INTO lessons (id, path_id, org_id, unit, title, position, questions, published) VALUES (?, ?, NULL, ?, ?, ?, ?, 1)
      ON CONFLICT(id) DO UPDATE SET path_id = excluded.path_id, unit = excluded.unit, title = excluded.title, position = excluded.position,
        questions = excluded.questions, published = 1,
        updated_at = CASE WHEN lessons.questions = excluded.questions THEN lessons.updated_at ELSE strftime('%Y-%m-%dT%H:%M:%SZ','now') END`);
    CATALOGUE.forEach((p, i) => {
      if (!COULEURS.includes(p.couleur) || !ICONES.includes(p.icone)) throw new Error(`Parcours ${p.id} : couleur ou icône inconnue`);
      if (!CATEGORIES.some((c) => c.id === p.categorie && c.id !== CATEGORIE_DEFIS)) throw new Error(`Parcours ${p.id} : catégorie inconnue`);
      upPath.run(p.id, p.titre, p.description, p.couleur, p.icone, i);
      p.lecons.forEach((l, j) => {
        const questions = validerQuestions(l.questions);
        upLecon.run(l.id, p.id, l.unite, l.titre, j, JSON.stringify(questions));
        presentes.add(l.id);
      });
    });
    for (const { id } of db.prepare('SELECT id FROM lessons WHERE org_id IS NULL AND published = 1').all()) {
      if (!presentes.has(id)) db.prepare('UPDATE lessons SET published = 0 WHERE id = ?').run(id);
    }
  });
}

export { COULEURS };

const CATEGORIE_PAR_PARCOURS = new Map(CATALOGUE.map((p) => [p.id, p.categorie]));
const CATEGORIES_PAR_ID = new Map(CATEGORIES.map((c) => [c.id, c]));

/** Catégorie d'un parcours : celle du catalogue, ou « défis maison » pour une organisation. */
export function categorieDe(parcours) {
  const id = parcours.org_id !== null ? CATEGORIE_DEFIS : CATEGORIE_PAR_PARCOURS.get(parcours.id) ?? CATEGORIE_DEFIS;
  const { titre, famille, icone } = CATEGORIES_PAR_ID.get(id);
  return { id, titre, famille, icone };
}
