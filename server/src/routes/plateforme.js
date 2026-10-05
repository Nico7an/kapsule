// Espace « plateforme » (super-administrateur) : création et suppression des
// organisations. Il ne donne volontairement accès qu'à des agrégats, jamais au
// détail des apprenants : ce détail appartient à chaque organisation.
import { exigerSuperadmin } from '../gardes.js';
import { transaction } from '../db.js';
import { codeInvitation, creerOtp } from '../auth.js';
import { AVATARS, emailValide, verifierNom } from './auth.js';
import { envoyerBienvenueAdmin } from '../email.js';

export default async function routesPlateforme(app) {
  const { db } = app;
  app.addHook('preHandler', exigerSuperadmin);

  app.get('/organisations', async () => {
    const il7j = new Date(Date.now() - 7 * 86400_000).toISOString();
    return db.prepare(`SELECT o.id, o.name, o.created_at,
        (SELECT COUNT(*) FROM users u WHERE u.org_id = o.id) AS membres,
        (SELECT COUNT(*) FROM users u WHERE u.org_id = o.id AND u.role = 'admin') AS admins,
        (SELECT COUNT(DISTINCT a.user_id) FROM attempts a WHERE a.org_id = o.id AND a.created_at >= ?) AS actifs7,
        (SELECT COUNT(*) FROM attempts a WHERE a.org_id = o.id) AS parties
      FROM orgs o ORDER BY o.name COLLATE NOCASE`).all(il7j);
  });

  app.post('/organisations', async (req, reply) => {
    const { nom, adminNom, adminEmail } = req.body ?? {};
    if (typeof nom !== 'string' || !nom.trim() || nom.length > 80) return reply.code(400).send({ erreur: 'Nom d\'organisation invalide' });
    const e = verifierNom(adminNom) ?? (!emailValide(adminEmail) ? 'E-mail de l\'administrateur invalide' : null);
    if (e) return reply.code(400).send({ erreur: e });
    const emailNormalise = adminEmail.trim().toLowerCase();
    if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(emailNormalise)) return reply.code(409).send({ erreur: 'Un compte existe déjà avec cette adresse' });
    
    const id = transaction(db, () => {
      const { lastInsertRowid: orgId } = db.prepare('INSERT INTO orgs (name, invite_code) VALUES (?, ?)').run(nom.trim(), codeInvitation());
      db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar) VALUES (?, ?, ?, '', 'admin', ?)`)
        .run(orgId, emailNormalise, adminNom.trim(), AVATARS[0]);
      return Number(orgId);
    });

    const code = creerOtp(db, { email: emailNormalise, type: 'connexion', orgId: id });
    const baseUrl = process.env.CYBER_URL || `${req.protocol}://${req.host}`;
    const lien = `${baseUrl}/?email=${encodeURIComponent(emailNormalise)}&code=${code}`;

    await envoyerBienvenueAdmin({
      email: emailNormalise,
      nom: adminNom.trim(),
      organisation: nom.trim(),
      code,
      lienConnexion: lien,
    });

    return reply.code(201).send({
      id,
      code,
      motDePasseTemporaire: code,
      ...(process.env.NODE_ENV !== 'production' ? { devCode: code } : {}),
    });
  });

  app.delete('/organisations/:id', async (req, reply) => {
    const org = db.prepare('SELECT id, name FROM orgs WHERE id = ?').get(Number(req.params.id));
    if (!org) return reply.code(404).send({ erreur: 'Organisation introuvable' });
    if (req.body?.confirmation !== org.name) return reply.code(400).send({ erreur: 'Recopiez le nom exact de l\'organisation pour confirmer' });
    db.prepare('DELETE FROM orgs WHERE id = ?').run(org.id);
    return { ok: true };
  });
}
