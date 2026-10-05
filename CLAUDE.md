# Guide de développement — Cyber

Plateforme d'apprentissage en cybersécurité ludique (style Duolingo), multi-tenant avec dashboards d'administration et déploiement Portainer / Docker.

## Commandes utiles

```bash
# Tests serveur
npm --prefix server test

# Compilation interface web
npm --prefix web run build

# Déploiement Portainer
./scripts/deployer.sh

# Construction Docker manuelle
docker compose -f docker-compose.yml -f docker-compose.build.yml build
```

## Architecture

- `server/` : Backend Fastify en ESM pur (Node 24)
  - `src/db.js` : Base SQLite native (`node:sqlite`), mode WAL, schémas, contraintes et transactions
  - `src/auth.js` : Hachage de mot de passe (scrypt natif), gestion des sessions en cookie httpOnly sécurisé, rate-limiting
  - `src/jeu.js` : Calcul anti-triche des scores, attribution d'XP, boucliers, séries, étoiles et badges
  - `src/requetes.js` : Requetes d'agrégation sécurisées filtrées par `org_id`
  - `src/contenu/` : Catalogue initial et modules de formation (réflexes, phishing, mobilité, RGPD, incident)
  - `src/demo.js` : Générateur d'organisation de démonstration pré-remplie (15 apprenants, 3 semaines d'activité)
  - `src/routes/` : Routes d'authentification, jeu, administration d'organisation et super-admin plateforme
- `web/` : Frontend React 19 + TypeScript + Vite
  - `src/pages/` : Pages Apprendre (arborescence), Leçon (lecteur de questionnaire), Classement, Profil, Admin (Tableau, Membres, Défis, Organisation), Plateforme
  - `src/composants/` : Mascotte Bitou, jauges, compteurs, modales, avatars, icônes
  - `src/son.ts` : Moteur audio procédural (Web Audio API)
- `data/` : Répertoire volume persistant sur l'hôte (`cyber.db`)
- `scripts/deployer.sh` : Script de build et de déploiement Portainer via son API

## Principes de sécurité

- L'`org_id` est déduit systématiquement de la session serveur, jamais accepté dans les charges utiles client.
- En-tête obligatoire `x-cyber: 1` pour les requêtes POST/PATCH/DELETE (protection CSRF).
- Export CSV protégé contre l'injection de formules (`'` devant `=`, `+`, `-`, `@`).
- Les réponses aux questionnaires sont calculées au fil de l'eau en session côté serveur pour éviter la manipulation de score côté client.
