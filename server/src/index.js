import { ouvrirBase } from './db.js';
import { construireApp } from './app.js';
import { synchroniserCatalogue } from './contenu/index.js';
import { hacherMotDePasse, purgerSessions, purgerOtps } from './auth.js';
import { creerDemo } from './demo.js';

const env = process.env;
const db = ouvrirBase(env.CYBER_DB ?? 'data/cyber.db');
synchroniserCatalogue(db);

// Synchronisation du compte super-administrateur depuis l'environnement.
if (env.CYBER_ADMIN_EMAIL) {
  const adminEmail = env.CYBER_ADMIN_EMAIL.trim().toLowerCase();
  const superadmin = db.prepare("SELECT id, email FROM users WHERE role = 'superadmin'").get();
  if (!superadmin) {
    db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar) VALUES (NULL, ?, 'Plateforme', '', 'superadmin', 'robot')`)
      .run(adminEmail);
    console.log(`Compte plateforme créé : ${adminEmail}`);
  } else if (superadmin.email !== adminEmail) {
    db.prepare(`UPDATE users SET email = ? WHERE id = ?`).run(adminEmail, superadmin.id);
    console.log(`Compte plateforme synchronisé : ${superadmin.email} -> ${adminEmail}`);
  }
}

if (env.CYBER_DEMO_EMAIL && creerDemo(db, { email: env.CYBER_DEMO_EMAIL, motDePasse: env.CYBER_DEMO_PASSWORD ?? 'demo' })) {
  console.log(`Organisation de démonstration créée (admin : ${env.CYBER_DEMO_EMAIL})`);
}

purgerSessions(db);
purgerOtps(db);
setInterval(() => {
  purgerSessions(db);
  purgerOtps(db);
  db.prepare('DELETE FROM runs WHERE started_at < ?').run(Date.now() - 24 * 3600_000);
}, 3600_000).unref();

const app = construireApp({
  db,
  statiques: env.CYBER_STATIQUES ?? new URL('../../web/dist', import.meta.url).pathname,
  logger: { level: env.LOG_LEVEL ?? 'info' },
  cookieSecurise: env.CYBER_COOKIE_SECURISE !== '0',
});

const arreter = async () => { await app.close(); db.close(); process.exit(0); };
process.on('SIGTERM', arreter);
process.on('SIGINT', arreter);

await app.listen({ host: '0.0.0.0', port: Number(env.PORT ?? 3000) });
