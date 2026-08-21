CREATE TABLE IF NOT EXISTS subscribers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_hash TEXT NOT NULL,
  signature TEXT NOT NULL UNIQUE,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'subscribed' CHECK (status IN ('subscribed', 'unsubscribed')),
  source TEXT NOT NULL,
  page TEXT,
  consent_version TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS subscribers_status_created
  ON subscribers (status, created_at DESC);

CREATE TABLE IF NOT EXISTS platform_metrics (
  canonical_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  kind TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 0),
  captured_at TEXT NOT NULL,
  source_url TEXT,
  PRIMARY KEY (canonical_id, platform, kind)
);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS rate_limits_expiry ON rate_limits (expires_at);
