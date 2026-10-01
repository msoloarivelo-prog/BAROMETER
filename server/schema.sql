-- Outil de Diagnostic Organisationnel: database schema.
-- Applied at every start (idempotent).

CREATE TABLE IF NOT EXISTS orgs (
  id          TEXT PRIMARY KEY,
  data        JSONB NOT NULL,
  version     INTEGER NOT NULL DEFAULT 1,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by  INTEGER
);

-- Earlier versions of each organisation (safety net: at most one snapshot
-- per hour and per organisation, the latest 100 are kept).
CREATE TABLE IF NOT EXISTS org_versions (
  id          SERIAL PRIMARY KEY,
  org_id      TEXT NOT NULL,
  version     INTEGER NOT NULL,
  data        JSONB NOT NULL,
  saved_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  saved_by    INTEGER
);
CREATE INDEX IF NOT EXISTS org_versions_org ON org_versions (org_id, saved_at DESC);

CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  email          TEXT NOT NULL UNIQUE,
  name           TEXT NOT NULL DEFAULT '',
  password_hash  TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('facilitator', 'org')),
  org_id         TEXT REFERENCES orgs (id) ON DELETE SET NULL,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login     TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions (user_id);

-- Evidence files (PDF).
CREATE TABLE IF NOT EXISTS files (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL,
  name         TEXT NOT NULL,
  size         INTEGER NOT NULL,
  data         BYTEA NOT NULL,
  uploaded_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  uploaded_by  INTEGER
);
CREATE INDEX IF NOT EXISTS files_org ON files (org_id);

-- Shared settings (calculation method and pillar weights).
CREATE TABLE IF NOT EXISTS settings (
  key    TEXT PRIMARY KEY,
  value  JSONB NOT NULL
);
