// Base SQLite intégrée à Node (node:sqlite) : un seul fichier, aucune
// dépendance native, une sauvegarde du répertoire data/ suffit.
//
// Isolation des organisations : toutes les tables de données d'apprentissage
// portent org_id, et chaque requête des routes le prend dans la session, jamais
// dans la requête du client.
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = `
CREATE TABLE IF NOT EXISTS orgs (
  id           INTEGER PRIMARY KEY,
  name         TEXT NOT NULL,
  invite_code  TEXT NOT NULL UNIQUE,
  daily_goal   INTEGER NOT NULL DEFAULT 50,
  created_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);

CREATE TABLE IF NOT EXISTS users (
  id              INTEGER PRIMARY KEY,
  org_id          INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  email           TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name            TEXT NOT NULL,
  password_hash   TEXT NOT NULL,
  role            TEXT NOT NULL CHECK (role IN ('superadmin','admin','learner')),
  avatar          TEXT NOT NULL DEFAULT 'renard',
  xp              INTEGER NOT NULL DEFAULT 0,
  streak          INTEGER NOT NULL DEFAULT 0,
  best_streak     INTEGER NOT NULL DEFAULT 0,
  last_active_day TEXT,
  sound           INTEGER NOT NULL DEFAULT 1,
  disabled        INTEGER NOT NULL DEFAULT 0,
  must_change_pw  INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  CHECK ((role = 'superadmin') = (org_id IS NULL))
);
CREATE INDEX IF NOT EXISTS users_org ON users(org_id);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL
);

-- Parcours : org_id NULL = catalogue commun, sinon défis propres à une organisation.
CREATE TABLE IF NOT EXISTS paths (
  id          TEXT PRIMARY KEY,
  org_id      INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  color       TEXT NOT NULL DEFAULT 'jaune',
  icon        TEXT NOT NULL DEFAULT 'bouclier',
  position    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS lessons (
  id         TEXT PRIMARY KEY,
  path_id    TEXT NOT NULL REFERENCES paths(id) ON DELETE CASCADE,
  org_id     INTEGER REFERENCES orgs(id) ON DELETE CASCADE,
  unit       TEXT NOT NULL DEFAULT '',
  title      TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  questions  TEXT NOT NULL,
  published  INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS lessons_path ON lessons(path_id, position);

-- Partie en cours : les réponses sont enregistrées au fil de l'eau, côté
-- serveur, pour que le score final ne dépende pas de ce qu'affirme le client.
CREATE TABLE IF NOT EXISTS runs (
  id          TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id      INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lesson_id   TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  started_at  INTEGER NOT NULL,
  answers     TEXT NOT NULL DEFAULT '{}',
  finished    INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS attempts (
  id          INTEGER PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id      INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  lesson_id   TEXT NOT NULL REFERENCES lessons(id) ON DELETE CASCADE,
  correct     INTEGER NOT NULL,
  total       INTEGER NOT NULL,
  failed      INTEGER NOT NULL DEFAULT 0,
  stars       INTEGER NOT NULL DEFAULT 0,
  xp          INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  answers     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS attempts_org ON attempts(org_id, created_at);
CREATE INDEX IF NOT EXISTS attempts_user ON attempts(user_id, lesson_id);

CREATE TABLE IF NOT EXISTS xp_events (
  id         INTEGER PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  org_id     INTEGER NOT NULL REFERENCES orgs(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL,
  reason     TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
);
CREATE INDEX IF NOT EXISTS xp_events_org ON xp_events(org_id, created_at);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id  TEXT NOT NULL,
  earned_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
  PRIMARY KEY (user_id, badge_id)
);
`;

/** @param {string} chemin fichier SQLite, ou ':memory:' pour les tests */
export function ouvrirBase(chemin) {
  if (chemin !== ':memory:') mkdirSync(dirname(chemin), { recursive: true });
  const db = new DatabaseSync(chemin);
  db.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;');
  db.exec(SCHEMA);
  return db;
}

/** Exécute fn dans une transaction ; annule tout en cas d'exception. */
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const r = fn();
    db.exec('COMMIT');
    return r;
  } catch (e) {
    db.exec('ROLLBACK');
    throw e;
  }
}
