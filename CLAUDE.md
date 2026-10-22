# Guide de développement — Kapsule

Plateforme d'apprentissage ludique (style Duolingo) pour comprendre toute l'entreprise : métiers, droit des sociétés, cybersécurité. Multi-tenant, avec dashboards d'administration et déploiement Portainer / Docker sur kapsule.nico7an.fr (anciennement « Cyber », cyber.nico7an.fr redirige).

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
  - `src/requetes.js` : Requetes d'agrégation sécurisées filtrées par `org_id`. Les parcours et leçons du catalogue qu'une organisation a supprimés (table `org_hidden`, page admin « Défis » › « Défis standard ») y sont exclus pour elle seule, sans effacer l'historique ; ils restent restaurables
  - `src/contenu/` : Catalogue commun, réécrit en base à chaque démarrage. `categories.js` (catégories et familles affichées sur Apprendre), `catalogue.js` (cybersécurité, et assemblage final), `droit.js` (droit des sociétés : socle, avocats, experts-comptables, juristes d'entreprise), `metiers.js` (dev, DevOps, marketing, commerciaux, Customer Success, CTO, CEO). `lexique.js` (leçon de vocabulaire simple en tête de chaque parcours droit et métiers), `expert.js` (leçon « niveau expert » ajoutée en fin de ces parcours), `formation.js` (découverte des troubles dys et des CFA, lexique et niveau expert inclus). Chaque parcours déclare sa `categorie`
  - `src/email.js` : Envoi SMTP (nodemailer) des codes de connexion et invitations, vérification SMTP au démarrage
  - `src/organisations.js` : Création d'une organisation et de son premier administrateur (inscription en libre-service)
  - `src/routes/` : Routes d'authentification (connexion, inscription, création d'organisation), jeu et administration d'organisation
- `web/` : Frontend React 19 + TypeScript + Vite
  - `src/pages/` : Pages Apprendre (arborescence), Leçon (lecteur de questionnaire), Classement, Profil, Admin (Tableau, Membres, Défis, Organisation), Auth (connexion, rejoindre, créer une organisation)
  - `src/composants/` : Mascotte Kapi (gélule), jauges, compteurs, modales, avatars, icônes
  - `src/son.ts` : Moteur audio procédural (Web Audio API)
- `data/` : Répertoire volume persistant sur l'hôte (`kapsule.db`)
- `scripts/deployer.sh` : Script de build et de déploiement Portainer via son API

## Principes de sécurité

- L'`org_id` est déduit systématiquement de la session serveur, jamais accepté dans les charges utiles client.
- En-tête obligatoire `x-kapsule: 1` pour les requêtes POST/PATCH/DELETE (protection CSRF).
- Export CSV protégé contre l'injection de formules (`'` devant `=`, `+`, `-`, `@`).
- Les réponses aux questionnaires sont calculées au fil de l'eau en session côté serveur pour éviter la manipulation de score côté client.
