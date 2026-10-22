// Création d'une organisation et de son premier administrateur (inscription
// en libre-service).
import { transaction } from './db.js';
import { codeInvitation } from './auth.js';

export function verifierNomOrganisation(db, nom) {
  if (typeof nom !== 'string' || !nom.trim()) return 'Nom d\'organisation manquant';
  if (nom.trim().length > 80) return 'Nom d\'organisation trop long (80 caractères max)';
  if (db.prepare('SELECT 1 FROM orgs WHERE name = ? COLLATE NOCASE').get(nom.trim())) return 'Une organisation porte déjà ce nom';
  return null;
}

/** Crée l'organisation et son administrateur ; renvoie leurs identifiants. */
export function creerOrganisation(db, { nom, adminNom, adminEmail, avatar }) {
  return transaction(db, () => {
    const orgId = Number(db.prepare('INSERT INTO orgs (name, invite_code) VALUES (?, ?)').run(nom.trim(), codeInvitation()).lastInsertRowid);
    const userId = Number(db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar) VALUES (?, ?, ?, '', 'admin', ?)`)
      .run(orgId, adminEmail, adminNom.trim(), avatar).lastInsertRowid);
    return { orgId, userId };
  });
}
