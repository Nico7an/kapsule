import { randomBytes, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const SESSION_JOURS = 30;
export const COOKIE = 'cyber_session';

export function hacherMotDePasse(mdp) {
  const sel = randomBytes(16);
  const h = scryptSync(mdp, sel, 64, { N: 16384, r: 8, p: 1 });
  return `scrypt$${sel.toString('base64')}$${h.toString('base64')}`;
}

export function verifierMotDePasse(mdp, stocke) {
  const [algo, sel, h] = String(stocke).split('$');
  if (algo !== 'scrypt' || !sel || !h) return false;
  const attendu = Buffer.from(h, 'base64');
  const calcule = scryptSync(mdp, Buffer.from(sel, 'base64'), attendu.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(attendu, calcule);
}

/** Un hachage factice pour que les e-mails inconnus coûtent autant qu'un vrai essai. */
export const HACHAGE_FACTICE = hacherMotDePasse(randomBytes(12).toString('hex'));

const sha256 = (s) => createHash('sha256').update(s).digest('hex');

export function creerSession(db, userId) {
  const jeton = randomBytes(32).toString('base64url');
  const expire = Date.now() + SESSION_JOURS * 86400_000;
  db.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').run(sha256(jeton), userId, expire);
  return { jeton, maxAge: SESSION_JOURS * 86400 };
}

export function lireSession(db, jeton) {
  if (!jeton) return null;
  const u = db.prepare(`
    SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token_hash = ? AND s.expires_at > ? AND u.disabled = 0`).get(sha256(jeton), Date.now());
  return u ?? null;
}

export function supprimerSession(db, jeton) {
  if (jeton) db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(sha256(jeton));
}

export function purgerSessions(db) {
  db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(Date.now());
}

/** Code d'invitation lisible (sans 0/O, 1/I). */
export function codeInvitation() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const octets = randomBytes(8);
  return Array.from(octets, (o) => alphabet[o % alphabet.length]).join('');
}

/** Mot de passe temporaire donné par un admin (à changer à la connexion). */
export function motDePasseTemporaire() {
  return randomBytes(9).toString('base64url');
}

/**
 * Limiteur en mémoire pour la connexion : 10 essais par quart d'heure et par
 * clé (IP + e-mail). Suffisant pour un seul conteneur.
 */
export function creerLimiteur({ max = 10, fenetreMs = 15 * 60_000 } = {}) {
  const essais = new Map();
  return {
    depasse(cle) {
      const maintenant = Date.now();
      const e = essais.get(cle);
      if (!e || e.debut + fenetreMs < maintenant) {
        essais.set(cle, { debut: maintenant, n: 1 });
        if (essais.size > 10_000) for (const [k, v] of essais) if (v.debut + fenetreMs < maintenant) essais.delete(k);
        return false;
      }
      e.n += 1;
      return e.n > max;
    },
    reinitialiser(cle) { essais.delete(cle); },
  };
}
