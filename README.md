# Kapsule — comprendre toute la boîte, en 3 minutes par jour

**Kapsule** est une plateforme d'apprentissage ludique (dans l'esprit de Duolingo) pour comprendre le travail de toute l'entreprise : les métiers des collègues (dev, DevOps, marketing, commerciaux, Customer Success, CTO, CEO), le droit des sociétés et le quotidien des clients (avocats, experts-comptables, juristes d'entreprise), la cybersécurité, ainsi que la formation et l'inclusion (troubles dys, CFA). Elle combine gamification, isolation stricte multi-organisations et tableaux de bord d'administration.

kapsule.nico7an.fr

---

## 🎮 Fonctionnalités

### Expérience Apprenant (Ultra-ludique)
- **Parcours en arborescence serpentant**, par exemple en cybersécurité :
  - *Les réflexes de base* (mots de passe, 2FA/MFA, mises à jour)
  - *Hameçonnage & ingénierie sociale* (analyse d'e-mails suspects, SMS frauduleux, arnaque au président)
  - *Mobilité & télétravail* (Wi-Fi public, clés USB inconnues, verrouillage de poste)
  - *Protection des données & RGPD* (fichiers sensibles, partage externe, violations)
  - *Réaction aux incidents* (rançongiciels, réflexes d'alerte, déconnexion)
- **Mascotte « Kapi »**, une gélule qui réagit aux actions (encouragements, avertissements, fierté).
- **Mécanique de jeu** :
  - 3 vies par leçon (« Plus de vies » au bout de trois erreurs).
  - Multiplicateurs de combo (flammes de série).
  - Points d'expérience (XP) et niveaux avec grades (Curieux → Légende).
  - Séries quotidiennes (*streaks*) pour ancrer l'habitude.
  - Badges de succès déblocables (Sans faute, Couteau suisse, Inarrêtable, etc.).
  - Effets sonores procéduraux (Web Audio API) et confettis de victoire.

### Catégories de formation
Le sélecteur de la page *Apprendre* regroupe les parcours par famille :
- **Cybersécurité** : les cinq parcours ci-dessus.
- **Droit des sociétés** : l'essentiel (formes de société, titres, assemblées, approbation des comptes), puis le quotidien des avocats en droit des sociétés, des experts-comptables et des juristes d'entreprise.
- **Métiers de l'entreprise** : développeurs, DevOps, marketing, commerciaux, Customer Success, CTO et CEO, pour comprendre le travail des collègues.
- **Formation et inclusion** : découvrir les troubles dys, découvrir les CFA (rôle, administration, formateurs, référent handicap, financeurs, place dans l'éducation).
- **Défis maison** : les questionnaires créés par l'organisation.

Un administrateur peut supprimer, pour sa seule organisation, n'importe quel parcours ou leçon du catalogue (page *Défis* › *Défis standard*), et le restaurer plus tard.

Chaque parcours droit, métiers et formation s'ouvre sur une leçon « lexique » (les mots du métier, définis simplement) et se termine par une leçon « niveau expert », plus difficile.

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

### Inscription en libre-service
- N'importe qui crée l'espace de son organisation depuis l'écran de connexion (« Créer mon organisation ») et en devient l'administrateur.
- Rien n'est créé avant la validation du code reçu par e-mail : impossible de réserver un nom ou d'ouvrir un espace avec une adresse qu'on ne possède pas.
- Les collègues rejoignent ensuite l'espace par le lien d'invitation ou une invitation e-mail de l'administrateur.

---

## 🏗️ Architecture

- **Conteneur unique** : Une image Docker alpine/bookworm légère basée sur Node 24.
- **Serveur API** : Fastify avec validation, cookies de session `httpOnly`, en-têtes de sécurité (CSP strict, anti-CSRF `x-kapsule`).
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
npm --prefix server start
```

Rendez-vous sur [http://localhost:3000](http://localhost:3000). Sans `SMTP_EMAIL` / `SMTP_PASSWORD` et hors production, les codes de connexion s'affichent dans la console du serveur au lieu d'être envoyés.

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
| `KAPSULE_HOST` | Nom de domaine routé par Traefik | `kapsule.nico7an.fr` |
| `KAPSULE_ANCIEN_HOST` | Ancien domaine, redirigé en permanence vers le nouveau | `cyber.nico7an.fr` |
| `KAPSULE_IMAGE` | Nom/tag de l'image Docker | `kapsule:latest` |
| `KAPSULE_MIDDLEWARES` | Middleware Traefik : `public-shield@file` (ouvert, en-têtes + limitation de débit) ou `tailscale-whitelist@file` (privé) | `public-shield@file` |
| `KAPSULE_URL` | URL publique, utilisée dans les liens des e-mails | `https://kapsule.nico7an.fr` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_SECURE` | Serveur d'envoi | `ssl0.ovh.net` / `465` / `true` |
| `SMTP_EMAIL` / `SMTP_PASSWORD` | Identifiants de la boîte d'envoi (obligatoires). Le mot de passe se saisit dans l'env de la stack Portainer : `deployer.sh` ne l'écrase jamais | — |
| `SMTP_FROM` | Expéditeur affiché | `Kapsule <contact@nico7an.fr>` |

Au démarrage, le serveur teste la connexion SMTP et l'écrit dans le journal (`SMTP opérationnel` ou `SMTP inutilisable …`). Chaque envoi est journalisé (`E-mail envoyé` / `Échec d'envoi d'e-mail`) ; les codes eux-mêmes ne sont jamais écrits dans les journaux en production. Si l'envoi échoue, l'utilisateur reçoit une erreur explicite au lieu d'un faux « code envoyé ».

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
2. Nom : `kapsule`.
3. Collez le contenu de [docker-compose.yml](file:///home/nico/Documents/kapsule/docker-compose.yml).
4. Renseignez les variables d'environnement.
5. Déployez la pile.
