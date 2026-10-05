# 🛡️ Cyber — Plateforme Ludique de Formation en Cybersécurité

**Cyber** est une plateforme d'apprentissage et de sensibilisation à la cybersécurité pensée comme un jeu d'arcade éducatif (dans l'esprit de Duolingo). Elle combine gamification poussée, isolation stricte multi-organisations et tableaux de bord d'administration détaillés.

---

## 🎮 Fonctionnalités

### Expérience Apprenant (Ultra-ludique)
- **Parcours en arborescence serpentant** avec thématiques concrètes :
  - *Les réflexes de base* (mots de passe, 2FA/MFA, mises à jour)
  - *Hameçonnage & ingénierie sociale* (analyse d'e-mails suspects, SMS frauduleux, arnaque au président)
  - *Mobilité & télétravail* (Wi-Fi public, clés USB inconnues, verrouillage de poste)
  - *Protection des données & RGPD* (fichiers sensibles, partage externe, violations)
  - *Réaction aux incidents* (rançongiciels, réflexes d'alerte, déconnexion)
- **Mascotte « Bitou »** qui réagit aux actions (encouragements, avertissements, fierté).
- **Mécanique de jeu** :
  - 3 boucliers d'intégrité par leçon (alerte « Système compromis » en cas d'épuisement).
  - Multiplicateurs de combo (flammes de série).
  - Points d'expérience (XP) et niveaux avec grades de sécurité.
  - Séries quotidiennes (*streaks*) pour ancrer l'habitude.
  - Badges de succès déblocables (Sans-faute, Pare-feu humain, Maître de la série, etc.).
  - Effets sonores procéduraux (Web Audio API) et confettis de victoire.

### Compétition et Classements
- **Podium et classements publics au sein de l'organisation** :
  - Vue hebdomadaire (remise à zéro le lundi) et classement général.
  - Calcul de l'écart d'XP nécessaire pour doubler le joueur précédent.
  - Classement spécifique à chaque questionnaire / leçon.

### Isolation Multi-Organisations
- **Séparation hermétique** : Chaque organisation évolue dans son propre espace étanche.
- L'organisation est déduite exclusivement côté serveur depuis la session signée ; aucune donnée d'une organisation ne peut être consultée par une autre.

### Tableau de Bord Administrateur
- **Indicateurs clés (KPIs)** : Taux d'actifs sur 7 jours, volume de leçons réussies, heures de formation cumulées, taux de précision global, séries en cours.
- **Histogramme d'activité** sur les 30 derniers jours (avec survol interactif et repères week-end).
- **Podium de l'équipe** de la semaine.
- **Avancement moyen par parcours** thématique.
- **Questions les plus échouées** pour identifier les axes de remédiation en équipe.
- **Gestion des apprenants** : Ajout avec mot de passe temporaire, réinitialisation, désactivation, statut de complétion, relance des inactifs (>14 jours).
- **Lien d'invitation sécurisé** avec régénération en un clic.
- **Export CSV** conforme RGPD avec protection contre les injections de formules.
- **Défis maison** : Module de création de leçons et questionnaires personnalisés (politiques internes, chartes sécurité).

### Espace Plateforme (Super-administrateur)
- Vue agrégée des organisations enregistrées.
- Création d'organisations avec provisionnement automatique du premier administrateur.
- Suppression sécurisée avec confirmation explicite du nom.
- Préservation de la confidentialité : les données individuelles des apprenants restent inaccessibles au super-admin.

---

## 🏗️ Architecture

- **Conteneur unique** : Une image Docker alpine/bookworm légère basée sur Node 24.
- **Serveur API** : Fastify avec validation, cookies de session `httpOnly`, en-têtes de sécurité (CSP strict, anti-CSRF `x-cyber`).
- **Base de données** : SQLite intégrée native (`node:sqlite`), mode WAL, stockée dans le volume persistant `/data`.
- **Frontend** : Application monopage (SPA) React 19 + TypeScript + Vite, précompilée et servie directement par Fastify avec mise en cache optimisée des assets.

---

## 🚀 Mise en route locale

### Prérequis
- Node.js ≥ 24.x
- npm

### Installation & Lancement en développement

```bash
# 1. Dépendances du serveur et du web
cd server && npm install
cd ../web && npm install
cd ..

# 2. Compiler l'interface
cd web && npm run build && cd ..

# 3. Lancer le serveur (port 3000 par défaut)
CYBER_ADMIN_EMAIL=admin@plateforme.local \
CYBER_ADMIN_PASSWORD=ChangeMoi123! \
CYBER_DEMO_EMAIL=admin@demo.local \
CYBER_DEMO_PASSWORD=DemoCyber123! \
npm --prefix server start
```

Rendez-vous sur [http://localhost:3000](http://localhost:3000).

### Tests automatisés

```bash
cd server && npm test
```

---

## 🐳 Déploiement Docker & Portainer

Le projet s'intègre avec **Portainer** et le reverse proxy **Traefik**.

### Variables d'environnement (.env)

| Variable | Description | Valeur par défaut |
|---|---|---|
| `CYBER_HOST` | Nom de domaine routé par Traefik | `cyber.nico7an.fr` |
| `CYBER_IMAGE` | Nom/tag de l'image Docker | `cyber:latest` |
| `CYBER_MIDDLEWARES` | Middleware Traefik (IP whitelist ou public) | `tailscale-whitelist@file` |
| `CYBER_ADMIN_EMAIL` | E-mail du compte super-administrateur | `admin@plateforme.local` |
| `CYBER_ADMIN_PASSWORD` | Mot de passe du super-admin au premier boot | `ChangeMoi123!` |
| `CYBER_DEMO_EMAIL` | E-mail de l'admin de l'organisation démo | `admin@demo.local` |
| `CYBER_DEMO_PASSWORD` | Mot de passe de l'admin démo | `DemoCyber123!` |

### Déploiement automatique

Le script `scripts/deployer.sh` :
1. Exécute la suite de tests automatisés.
2. Compile l'image Docker étiquetée avec le hash Git courant et le tag `latest`.
3. Crée ou met à jour la stack dans Portainer via son API.
4. Attend la validation du point de contrôle de santé `/api/sante`.

```bash
./scripts/deployer.sh
```

### Déploiement manuel dans Portainer
1. Dans Portainer : *Stacks* → *Add stack* → *Web editor*.
2. Nom : `cyber`.
3. Collez le contenu de [docker-compose.yml](file:///home/nico/Documents/cyber/docker-compose.yml).
4. Renseignez les variables d'environnement.
5. Déployez la pile.
