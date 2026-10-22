import Fastify from 'fastify';
import cookie from '@fastify/cookie';
import statique from '@fastify/static';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { lireSession, COOKIE, creerLimiteur } from './auth.js';
import { ErreurValidation } from './contenu/index.js';
import routesAuth from './routes/auth.js';
import routesJeu from './routes/jeu.js';
import routesAdmin from './routes/admin.js';

const CSP = [
  "default-src 'self'",
  "img-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "script-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "form-action 'self'",
].join('; ');

/**
 * @param {{ db: import('node:sqlite').DatabaseSync, statiques?: string, logger?: boolean | object, cookieSecurise?: boolean }} options
 */
export function construireApp({ db, statiques, logger = false, cookieSecurise = true }) {
  const app = Fastify({
    logger,
    // Un seul proxy devant nous (Traefik) : on ne croit que la dernière adresse de
    // X-Forwarded-For, sinon un client pourrait s'inventer une IP et contourner
    // les limites de demandes de code.
    trustProxy: 1,
    bodyLimit: 256 * 1024,
  });

  app.decorate('db', db);
  app.decorate('limiteurConnexion', creerLimiteur());
  app.decorate('cookieSecurise', cookieSecurise);
  app.decorateRequest('user', null);
  app.register(cookie);

  app.addHook('onRequest', async (req, reply) => {
    if (!req.url.startsWith('/api/')) return;
    // Protection CSRF : un site tiers ne peut pas ajouter d'en-tête personnalisé
    // à une requête sans passer par une requête CORS préalable, que l'on refuse.
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.headers['x-kapsule'] !== '1') {
      return reply.code(403).send({ erreur: 'Requête refusée' });
    }
    req.user = lireSession(db, req.cookies?.[COOKIE]);
  });

  app.addHook('onSend', async (req, reply, charge) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.url.startsWith('/api/')) reply.header('Cache-Control', 'no-store');
    else reply.header('Content-Security-Policy', CSP);
    return charge;
  });

  app.setErrorHandler((err, req, reply) => {
    if (err instanceof ErreurValidation || (err.statusCode && err.statusCode < 500)) {
      return reply.code(err.statusCode ?? 400).send({ erreur: err.validation ? 'Requête invalide' : err.message });
    }
    req.log.error(err);
    return reply.code(500).send({ erreur: 'Erreur interne' });
  });

  // Interrogé toutes les 30 s par le healthcheck Docker : hors journal pour ne pas noyer le reste.
  app.get('/api/sante', { logLevel: 'silent' }, async () => ({ ok: true }));
  app.register(routesAuth, { prefix: '/api' });
  app.register(routesJeu, { prefix: '/api' });
  app.register(routesAdmin, { prefix: '/api/admin' });

  const aDesStatiques = statiques && existsSync(join(statiques, 'index.html'));
  if (aDesStatiques) {
    app.register(statique, {
      root: statiques,
      // fastify-static ≥ 10 passe la réponse Fastify, plus la réponse Node brute.
      setHeaders(reply, chemin) {
        reply.header('Cache-Control', chemin.includes(`${join(statiques, 'assets')}`) ? 'public, max-age=31536000, immutable' : 'no-cache');
      },
    });
  }
  app.setNotFoundHandler((req, reply) => {
    // Un fichier d'interface absent est une vraie 404, pas une page HTML.
    if (req.url.startsWith('/api/') || req.url.startsWith('/assets/') || !aDesStatiques || req.method !== 'GET') {
      return reply.code(404).send({ erreur: 'Introuvable' });
    }
    // Application monopage : toute autre URL renvoie l'interface.
    return reply.header('Cache-Control', 'no-cache').sendFile('index.html');
  });

  return app;
}
