import { ouvrirBase } from './db.js';
import { construireApp } from './app.js';
import { synchroniserCatalogue } from './contenu/index.js';
import { hacherMotDePasse, purgerSessions, purgerOtps } from './auth.js';
import { creerDemo } from './demo.js';

const env = process.env;
const db = ouvrirBase(env.CYBER_DB ?? 'data/cyber.db');
synchroniserCatalogue(db);

// Premier démarrage : le compte plateforme est créé depuis l'environnement.
if (env.CYBER_ADMIN_EMAIL && !db.prepare("SELECT 1 FROM users WHERE role = 'superadmin'").get()) {
  const hash = env.CYBER_ADMIN_PASSWORD ? hacherMotDePasse(env.CYBER_ADMIN_PASSWORD) : '';
  db.prepare(`INSERT INTO users (org_id, email, name, password_hash, role, avatar) VALUES (NULL, ?, 'Plateforme', ?, 'superadmin', 'robot')`)
    .run(env.CYBER_ADMIN_EMAIL.trim().toLowerCase(), hash);
  console.log(`Compte plateforme créé : ${env.CYBER_ADMIN_EMAIL}`);
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
