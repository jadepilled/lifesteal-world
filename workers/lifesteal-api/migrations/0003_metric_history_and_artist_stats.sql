CREATE TABLE IF NOT EXISTS metric_history (
  canonical_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  kind TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 0),
  captured_at TEXT NOT NULL,
  source_url TEXT,
  PRIMARY KEY (canonical_id, platform, kind, captured_at)
);

CREATE INDEX IF NOT EXISTS metric_history_lookup
  ON metric_history (canonical_id, platform, kind, captured_at DESC);

INSERT OR IGNORE INTO metric_history
  (canonical_id, platform, kind, value, captured_at, source_url)
SELECT canonical_id, platform, kind, value, captured_at, source_url
FROM platform_metrics;

CREATE TABLE IF NOT EXISTS artist_metrics (
  artist_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  kind TEXT NOT NULL,
  value INTEGER NOT NULL CHECK (value >= 0),
  captured_at TEXT NOT NULL,
  source_url TEXT,
  PRIMARY KEY (artist_id, platform, kind)
);

INSERT INTO artist_metrics (artist_id, platform, kind, value, captured_at, source_url)
VALUES
  ('hazelmere', 'soundcloud', 'followers', 443, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/'),
  ('starstrike', 'soundcloud', 'followers', 3, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/starstrike/'),
  ('starstrike', 'spotify', 'monthly_listeners', 30, '2026-08-21T05:30:00.000Z', 'https://open.spotify.com/artist/4MkRcUXF9bFAN8mxl8Cc7h')
ON CONFLICT(artist_id, platform, kind) DO UPDATE SET
  value = excluded.value,
  captured_at = excluded.captured_at,
  source_url = excluded.source_url;
