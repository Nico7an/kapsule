import { ouvrirBase } from './db.js';
import { construireApp } from './app.js';
import { synchroniserCatalogue } from './contenu/index.js';
import { purgerSessions, purgerOtps } from './auth.js';
import { definirJournal, verifierSmtp } from './email.js';

const env = process.env;
const db = ouvrirBase(env.KAPSULE_DB ?? 'data/kapsule.db');
synchroniserCatalogue(db);

purgerSessions(db);
purgerOtps(db);
setInterval(() => {
  purgerSessions(db);
  purgerOtps(db);
  db.prepare('DELETE FROM runs WHERE started_at < ?').run(Date.now() - 24 * 3600_000);
}, 3600_000).unref();

const app = construireApp({
  db,
  statiques: env.KAPSULE_STATIQUES ?? new URL('../../web/dist', import.meta.url).pathname,
  logger: { level: env.LOG_LEVEL ?? 'info' },
  cookieSecurise: env.KAPSULE_COOKIE_SECURISE !== '0',
});

const arreter = async () => { await app.close(); db.close(); process.exit(0); };
process.on('SIGTERM', arreter);
process.on('SIGINT', arreter);

definirJournal(app.log.child({ module: 'email' }));

await app.listen({ host: '0.0.0.0', port: Number(env.PORT ?? 3000) });
// Sans attendre : un SMTP en panne ne doit pas empêcher le démarrage, mais doit se voir.
verifierSmtp();
