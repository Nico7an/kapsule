// Organisation de démonstration : une quinzaine de joueurs fictifs et trois
// semaines d'activité simulée, pour découvrir les classements et le tableau de
// bord sans attendre de vrais apprenants. Créée une seule fois ; on la
// supprime depuis l'espace plateforme quand elle ne sert plus.
import { transaction } from './db.js';
import { hacherMotDePasse, codeInvitation } from './auth.js';
import { calculerXp, etoiles, jourLocal, decalerJour, minuitParisUTC, BADGES } from './jeu.js';
import { parcoursVisibles } from './requetes.js';
import { AVATARS } from './routes/auth.js';

export const NOM_DEMO = 'Acme Industries (démo)';

const JOUEURS = [
  ['Inès Haddad', 0.95, 0.92], ['Lucas Moreau', 0.9, 0.85], ['Chloé Bernard', 0.8, 0.9], ['Hugo Petit', 0.75, 0.7],
  ['Sarah Lefèvre', 0.7, 0.8], ['Mamadou Diallo', 0.65, 0.88], ['Léa Fontaine', 0.6, 0.75], ['Thomas Roux', 0.5, 0.65],
  ['Camille Garnier', 0.45, 0.82], ['Yanis Benali', 0.4, 0.7], ['Emma Lambert', 0.35, 0.6], ['Nathan Chevalier', 0.25, 0.72],
  ['Jade Mercier', 0.15, 0.68], ['Paul Girard', 0.08, 0.55], ['Zoé Faure', 0, 0.5],
];

function hasard(graine) {
  let s = graine;
  return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; };
}

export function creerDemo(db, { email, motDePasse }) {
  if (db.prepare('SELECT 1 FROM orgs WHERE name = ?').get(NOM_DEMO)) return false;
  const alea = hasard(42);
  transaction(db, () => {
    const org = Number(db.prepare('INSERT INTO orgs (name, invite_code) VALUES (?, ?)').run(NOM_DEMO, codeInvitation()).lastInsertRowid);
    const hash = hacherMotDePasse(motDePasse);
    db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar) VALUES (?, ?, 'Admin Démo', ?, 'admin', 'hibou')`).run(org, email, hash);

    const lecons = parcoursVisibles(db, org).flatMap((p) => p.lecons.map((l) => ({ ...l, questions: JSON.parse(l.questions) })));
    const aujourdHui = jourLocal();
    const insAttempt = db.prepare(`INSERT INTO attempts (user_id, org_id, lesson_id, correct, total, failed, stars, xp, duration_ms, answers, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const insXp = db.prepare('INSERT INTO xp_events (user_id, org_id, amount, reason, created_at) VALUES (?, ?, ?, ?, ?)');
    const insBadge = db.prepare('INSERT OR IGNORE INTO user_badges (user_id, badge_id, earned_at) VALUES (?, ?, ?)');

    JOUEURS.forEach(([nom, assiduite, niveauJoueur], i) => {
      const email = `${nom.toLowerCase().normalize('NFD').replace(/[^a-z ]/g, '').replace(' ', '.')}@acme.example`;
      const uid = Number(db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar, created_at) VALUES (?, ?, ?, ?, 'learner', ?, ?)`)
        .run(org, email, nom, hash, AVATARS[i % AVATARS.length], `${decalerJour(aujourdHui, -24)}T08:00:00Z`).lastInsertRowid);
      let xpTotal = 0, prochaine = 0;
      const joursActifs = [];
      const badges = new Map();
      for (let j = -21; j <= 0; j++) {
        if (alea() > assiduite) continue;
        const jour = decalerJour(aujourdHui, j);
        const debut = Date.parse(minuitParisUTC(jour));
        let reussiCeJour = false;
        const parties = 1 + Math.floor(alea() * 3);
        for (let k = 0; k < parties && prochaine < lecons.length; k++) {
          const lecon = lecons[prochaine];
          const quand = new Date(Math.min(Date.now() - 60_000, debut + (8 + alea() * 12) * 3600_000 + k * 600_000));
          const resultats = [];
          let erreurs = 0;
          const detail = {};
          for (const q of lecon.questions) {
            const ok = alea() < niveauJoueur;
            resultats.push(ok); detail[q.id] = ok;
            if (!ok && ++erreurs >= 3) break;
          }
          const echec = erreurs >= 3;
          const correct = resultats.filter(Boolean).length;
          const duree = Math.round((5 + alea() * 12) * 1000 * resultats.length);
          const xp = calculerXp({ resultats, dureeMs: duree, echec, dejaReussie: false });
          const iso = quand.toISOString().slice(0, 19) + 'Z';
          insAttempt.run(uid, org, lecon.id, correct, lecon.questions.length, echec ? 1 : 0, etoiles(correct, lecon.questions.length, echec), xp.total, duree, JSON.stringify(detail), iso);
          if (xp.total) insXp.run(uid, org, xp.total, `lecon:${lecon.id}`, iso);
          xpTotal += xp.total;
          if (!echec) {
            prochaine++; reussiCeJour = true;
            if (!badges.has('premier-pas')) badges.set('premier-pas', iso);
            if (correct === lecon.questions.length && !badges.has('sans-faute')) badges.set('sans-faute', iso);
          }
          if (xp.meilleurCombo >= 5 && !badges.has('combo-5')) badges.set('combo-5', iso);
        }
        if (reussiCeJour) joursActifs.push(jour);
      }
      // Série : jours consécutifs se terminant aujourd'hui ou hier.
      let serie = 0, meilleure = 0, courante = 0, precedent = null;
      for (const jour of joursActifs) {
        courante = precedent && decalerJour(precedent, 1) === jour ? courante + 1 : 1;
        meilleure = Math.max(meilleure, courante);
        precedent = jour;
      }
      if (precedent && precedent >= decalerJour(aujourdHui, -1)) serie = courante;
      if (meilleure >= 3) badges.set('serie-3', `${precedent}T18:00:00Z`);
      if (meilleure >= 7) badges.set('serie-7', `${precedent}T18:00:00Z`);
      if (xpTotal >= 500) badges.set('xp-500', `${precedent}T18:00:00Z`);
      for (const [b, quand] of badges) {
        if (!BADGES.some((x) => x.id === b)) continue;
        insBadge.run(uid, b, quand);
        insXp.run(uid, org, 25, `badge:${b}`, quand);
        xpTotal += 25;
      }
      db.prepare('UPDATE users SET xp = ?, streak = ?, best_streak = ?, last_active_day = ? WHERE id = ?').run(xpTotal, serie, meilleure, precedent, uid);
    });
  });
  return true;
}
