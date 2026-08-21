-- User-supplied platform dashboards are the source for Spotify stream counts.
-- The Flow SoundCloud count was also confirmed against its public track page.
INSERT INTO platform_metrics (canonical_id, platform, kind, value, captured_at, source_url)
VALUES
  ('starstrike-flow', 'soundcloud', 'plays', 754, '2026-08-21T10:18:30.000Z', 'https://soundcloud.com/hazelmere/flow'),
  ('starstrike-flow', 'spotify', 'plays', 419, '2026-08-21T10:18:30.000Z', 'https://open.spotify.com/track/0fEazO7AwSWNHOu0NoriiO'),
  ('starstrike-internet-depression-club', 'spotify', 'plays', 4967, '2026-08-21T10:18:30.000Z', 'https://open.spotify.com/track/7zVToCOmfS1dfz9M4eIKC9'),
  ('starstrike-the-one-that-got-away', 'spotify', 'plays', 5024, '2026-08-21T10:18:30.000Z', 'https://open.spotify.com/track/00641hz6e2MgdUcmtabYNm')
ON CONFLICT(canonical_id, platform, kind) DO UPDATE SET
  value = excluded.value,
  captured_at = excluded.captured_at,
  source_url = excluded.source_url;

INSERT OR IGNORE INTO metric_history
  (canonical_id, platform, kind, value, captured_at, source_url)
SELECT canonical_id, platform, kind, value, captured_at, source_url
FROM platform_metrics
WHERE canonical_id IN (
  'starstrike-flow',
  'starstrike-internet-depression-club',
  'starstrike-the-one-that-got-away'
) AND kind = 'plays';
