# Yoga Studio

Application web full-stack de gestion d'un studio de yoga : planning des sessions, professeurs et inscriptions des utilisateurs.

## Sommaire

1. [Stack technique](#stack-technique)
2. [Fonctionnalités](#fonctionnalités)
3. [Installation](#installation)
4. [Utilisation](#utilisation)
5. [Lancer les tests](#lancer-les-tests)
6. [Générer les rapports de couverture](#générer-les-rapports-de-couverture)
7. [API](#api)
8. [Structure du projet](#structure-du-projet)
9. [Dépannage](#dépannage)

## Stack technique

**Backend** : Node.js 22 LTS, Express 4, TypeScript (strict), Prisma, PostgreSQL 16, JWT, bcrypt

**Frontend** : React 19, TypeScript (strict), Vite 7, TailwindCSS 4, React Router 6, Axios

**Tests** : Vitest, React Testing Library, Playwright, `@vitest/coverage-v8`

**Infrastructure** : Docker + Docker Compose (conteneur PostgreSQL)

## Fonctionnalités

- **Authentification** : inscription et connexion (JWT).
- **Sessions** : liste, détail, création / modification / suppression (administrateur), inscription et désinscription (utilisateur).
- **Professeurs** : liste et détail.
- **Profil** : consultation et suppression de son compte.

## Installation

### Prérequis

- Node.js 22 LTS ou supérieur
- npm
- Docker et Docker Compose

### 1. Cloner le dépôt

```bash
git clone https://github.com/MarouaneDmy/Yoga-Studio.git
cd Yoga-Studio
```

### 2. Installer les dépendances

```bash
cd backend && npm install
cd ../frontend && npm install
```

### 3. Configurer les variables d'environnement

Dans `backend/`, créer le fichier `.env` à partir de l'exemple :

```bash
cd ../backend
cp .env.example .env
```

Valeurs par défaut (compatibles avec le `docker-compose.yml`) :

```env
DATABASE_URL="postgresql://yogauser:yogapass@localhost:5432/yogastudio"
JWT_SECRET="your-secret-key-change-me-in-production"
PORT=8080
NODE_ENV=development
```

> `NODE_ENV=development` est nécessaire pour le bouton « Promote to Admin (Dev) » de la page profil.

### 4. Démarrer PostgreSQL

Depuis la racine du projet :

```bash
docker-compose up -d
```

### 5. Créer la base et insérer les données de démonstration

```bash
cd backend
npm run prisma:migrate
npm run prisma:seed
```

Le seed crée :

| Type           | Identifiant       | Mot de passe |
| -------------- | ----------------- | ------------ |
| Administrateur | `yoga@studio.com` | `test!1234`  |
| Utilisateur    | `user@test.com`   | `test!1234`  |

ainsi que 3 professeurs et 4 sessions.

## Utilisation

Lancer le backend (terminal 1) :

```bash
cd backend
npm run dev
```

L'API est disponible sur `http://localhost:8080` (vérification : `GET /api/health`).

Lancer le frontend (terminal 2) :

```bash
cd frontend
npm run dev
```

L'application est disponible sur `http://localhost:3000`. Connectez-vous avec l'un des comptes ci-dessus, ou créez un compte via la page d'inscription.

| Rôle           | Ce que l'on peut faire                                                                               |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| Utilisateur    | Consulter les sessions et professeurs, rejoindre / quitter une session, voir et supprimer son profil |
| Administrateur | Tout ce qui précède, plus créer, modifier et supprimer des sessions                                  |

### Autres scripts

**Backend** (`backend/`)

```bash
npm run build            # Compile le TypeScript
npm start                # Lance la version compilée
npm run prisma:generate  # Génère le client Prisma
npm run prisma:studio    # Ouvre Prisma Studio
```

**Frontend** (`frontend/`)

```bash
npm run build            # Build de production
npm run preview          # Prévisualise le build
```

## Lancer les tests

Le projet comporte quatre niveaux de tests :

| Niveau                                                       | Outil                          | Dossier                                                             | Pré-requis                                                         |
| ------------------------------------------------------------ | ------------------------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Back : unitaires (utils, services, middlewares, controllers) | Vitest                         | `backend/src/**/*.test.ts`                                          | Aucun (Prisma est mocké)                                           |
| Back : intégration (API appelée en HTTP avec `fetch`)        | Vitest                         | `backend/tests/integration/api.integration.test.ts`                 | PostgreSQL démarrée et migrée (voir [Installation](#installation)) |
| Front : composants et pages                                  | Vitest + React Testing Library | `frontend/src/**/*.test.tsx` (setup : `frontend/src/test/setup.ts`) | Aucun                                                              |
| E2E : parcours complets dans le navigateur                   | Playwright                     | `frontend/e2e/`                                                     | Base + backend + frontend lancés                                   |

### Tests du backend

```bash
cd backend
npm test            # tests unitaires + intégration, exécution unique
npm run test:watch  # mode watch
```

- Les **tests unitaires** sont placés à côté du code qu'ils testent (`*.test.ts` dans `src/`).
- Les **tests d'intégration** sont dans `tests/integration/` : ils interrogent l'API avec `fetch`, route par route.

### Tests du frontend

```bash
cd frontend
npm test            # exécution unique
npm run test:watch  # mode watch
```

### Tests end-to-end (Playwright)

1. Installer les navigateurs de Playwright (une seule fois) :

   ```bash
   cd frontend
   npx playwright install
   ```

2. Préparer l'environnement : PostgreSQL démarré, base **migrée et seedée**, backend lancé (`npm run dev` dans `backend/`). Le frontend est démarré automatiquement par Playwright, ou manuellement avec `npm run dev`.

3. Lancer les tests :

   ```bash
   cd frontend
   npm run test:e2e
   ```

   Options utiles :

   ```bash
   npx playwright test --ui        # interface interactive
   npx playwright test --headed    # navigateur visible
   npx playwright show-report      # rapport HTML des derniers tests
   ```

Remarques :

- Les specs utilisent les comptes du seed (`yoga@studio.com`, `user@test.com`) et créent des comptes jetables (`e2e.*@test.com`). Pour repartir d'une base propre : `cd backend && npx prisma migrate reset` (réapplique les migrations et relance le seed).
- Les tests de promotion en administrateur nécessitent un backend en `NODE_ENV=development` et un frontend servi par `vite` (mode dev). Ils sont ignorés automatiquement avec un build de production.

## Générer les rapports de couverture

Un seuil minimal de **80 %** est exigé pour chaque indicateur : instructions (_statements_), branches, fonctions et lignes. Les commandes échouent si un indicateur est sous ce seuil.

| Périmètre | Commande                               | Rapport HTML                   |
| --------- | -------------------------------------- | ------------------------------ |
| Backend   | `cd backend && npm run test:coverage`  | `backend/coverage/index.html`  |
| Frontend  | `cd frontend && npm run test:coverage` | `frontend/coverage/index.html` |

Chaque commande affiche aussi un tableau récapitulatif dans le terminal. Les seuils et les fichiers pris en compte sont configurés dans `backend/vitest.config.ts` et `frontend/vitest.config.ts`. Pour consulter un rapport, ouvrir le fichier `index.html` correspondant dans un navigateur : il détaille, fichier par fichier, les lignes et branches non couvertes.

### Rapport des tests E2E

Les tests Playwright produisent un rapport d'exécution (tests réussis, échoués, ignorés, captures et traces) :

```bash
cd frontend
npx playwright show-report
```

## API

### Santé

- `GET /api/health` : état de l'API

### Authentification

- `POST /api/auth/register` : création de compte
- `POST /api/auth/login` : connexion, retourne un JWT

### Sessions (JWT requis)

- `GET /api/session` : liste des sessions
- `GET /api/session/:id` : détail d'une session
- `POST /api/session` : création (admin)
- `PUT /api/session/:id` : modification (admin)
- `DELETE /api/session/:id` : suppression (admin)
- `POST /api/session/:id/participate/:userId` : rejoindre une session
- `DELETE /api/session/:id/participate/:userId` : quitter une session

### Professeurs (JWT requis)

- `GET /api/teacher` : liste des professeurs
- `GET /api/teacher/:id` : détail d'un professeur

### Utilisateurs (JWT requis)

- `GET /api/user/:id` : détail d'un utilisateur
- `DELETE /api/user/:id` : suppression de son propre compte
- `POST /api/user/promote-admin` : se promouvoir administrateur (**développement uniquement**)

Les routes protégées attendent l'en-tête `Authorization: Bearer <token>`.

Le schéma de la base de données est défini dans `backend/prisma/schema.prisma`.

## Structure du projet

```
Yoga-Studio/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Gestionnaires de requêtes
│   │   ├── services/         # Logique métier
│   │   ├── middleware/       # Authentification, gestion des erreurs
│   │   ├── dto/              # Schémas de validation
│   │   ├── utils/            # JWT, AppError, catchAsync, client Prisma
│   │   ├── routes/           # Routes de l'API
│   │   └── app.ts            # Configuration de l'application Express
│   ├── prisma/
│   │   ├── schema.prisma     # Schéma de la base
│   │   └── seed.ts           # Données de démonstration
│   ├── tests/
│   │   └── integration/
│   │       └── api.integration.test.ts   # Tests d'intégration de l'API
│   └── vitest.config.ts
├── frontend/
│   ├── src/
│   │   ├── pages/            # Pages React
│   │   ├── components/       # Composants réutilisables
│   │   ├── services/         # Appels API
│   │   ├── hooks/            # Hooks personnalisés
│   │   ├── test/             # Configuration des tests (setup.ts)
│   │   └── types/            # Types TypeScript
│   ├── e2e/                  # Specs Playwright
│   ├── playwright.config.ts
│   ├── vite.config.ts
│   └── vitest.config.ts
├── docker-compose.yml
└── README.md
```

## Dépannage

### Connexion à la base impossible

```bash
docker ps                          # PostgreSQL tourne-t-il ?
docker-compose restart postgres
docker-compose logs postgres
```

### Port déjà utilisé

```bash
lsof -i :8080   # backend
lsof -i :3000   # frontend
kill -9 <PID>
```

### Problèmes Prisma

```bash
npx prisma migrate reset   # ATTENTION : supprime toutes les données puis relance le seed
npx prisma generate
```

### Les tests E2E échouent avec des erreurs de connexion ou de données

Vérifier que le backend est lancé, que la base est seedée (voir [Installation](#installation)) et que les ports 8080 et 3000 sont libres. En cas de doute, réinitialiser la base avec `npx prisma migrate reset`.

## Licence

MIT
