// Gardes (preHandler) réutilisées par les routes.

export async function exigerConnexion(req, reply) {
  if (!req.user) return reply.code(401).send({ erreur: 'Connexion requise' });
}

/** Joueur d'une organisation (apprenant ou admin). */
export async function exigerMembre(req, reply) {
  if (!req.user) return reply.code(401).send({ erreur: 'Connexion requise' });
  if (!req.user.org_id) return reply.code(403).send({ erreur: 'Réservé aux membres d\'une organisation' });
}

export async function exigerAdmin(req, reply) {
  if (!req.user) return reply.code(401).send({ erreur: 'Connexion requise' });
  if (req.user.role !== 'admin' || !req.user.org_id) return reply.code(403).send({ erreur: 'Réservé aux administrateurs' });
}

export async function exigerSuperadmin(req, reply) {
  if (!req.user) return reply.code(401).send({ erreur: 'Connexion requise' });
  if (req.user.role !== 'superadmin') return reply.code(403).send({ erreur: 'Réservé à la plateforme' });
}
