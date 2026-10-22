import { randomBytes, randomInt, scryptSync, timingSafeEqual, createHash } from 'node:crypto';

const SESSION_JOURS = 30;
export const COOKIE = 'kapsule_session';

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

/** Génère un code numérique à 6 chiffres (100000 - 999999). */
export function genererOtp() {
  return String(randomInt(100000, 1000000));
}

/** Enregistre un code OTP en base (valable 15 minutes). */
export function creerOtp(db, { email, type = 'connexion', orgId = null, invitedBy = null, metadata = {} }) {
  const e = email.trim().toLowerCase();
  db.prepare('DELETE FROM otp_codes WHERE email = ? AND type = ?').run(e, type);
  const code = genererOtp();
  const hash = sha256(code);
  const expire = Date.now() + 15 * 60_000;
  db.prepare(`
    INSERT INTO otp_codes (email, code_hash, type, org_id, invited_by, metadata, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(e, hash, type, orgId, invitedBy, JSON.stringify(metadata), expire);
  return code;
}

/** Valide un code OTP et le consomme immédiatement. */
export function validerOtp(db, { email, code, type }) {
  const e = String(email || '').trim().toLowerCase();
  // Seuls les chiffres comptent : un copier-coller « 123 456 » ou avec du texte autour passe.
  const c = String(code || '').replace(/\D/g, '');
  if (!e || !c || c.length !== 6) throw new Error('Code invalide');

  const maintenant = Date.now();
  db.prepare('DELETE FROM otp_codes WHERE expires_at <= ?').run(maintenant);

  let requete = 'SELECT * FROM otp_codes WHERE email = ? AND expires_at > ?';
  const params = [e, maintenant];
  // Un code ne vaut que pour l'usage prévu (un code d'inscription n'ouvre pas de session).
  if (type) {
    const types = [type].flat();
    requete += ` AND type IN (${types.map(() => '?').join(', ')})`;
    params.push(...types);
  }
  requete += ' ORDER BY id DESC LIMIT 1';

  const r = db.prepare(requete).get(...params);
  if (!r) throw new Error('Code expiré ou introuvable. Demandez un nouveau code.');

  if (r.attempts >= 5) {
    db.prepare('DELETE FROM otp_codes WHERE id = ?').run(r.id);
    throw new Error('Trop d\'essais infructueux. Veuillez demander un nouveau code.');
  }

  db.prepare('UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ?').run(r.id);

  const hashSaisi = Buffer.from(sha256(c));
  const hashStocke = Buffer.from(r.code_hash);
  if (hashSaisi.length !== hashStocke.length || !timingSafeEqual(hashSaisi, hashStocke)) {
    const restants = 5 - (r.attempts + 1);
    throw new Error(`Code incorrect (${restants} essai${restants > 1 ? 's' : ''} restant${restants > 1 ? 's' : ''})`);
  }

  // Code valide : on le détruit pour empêcher toute réutilisation
  db.prepare('DELETE FROM otp_codes WHERE id = ?').run(r.id);
  return {
    id: r.id,
    email: r.email,
    type: r.type,
    orgId: r.org_id,
    invitedBy: r.invited_by,
    metadata: JSON.parse(r.metadata || '{}'),
  };
}

export function purgerOtps(db) {
  db.prepare('DELETE FROM otp_codes WHERE expires_at <= ?').run(Date.now());
}

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
