INSERT INTO platform_metrics (canonical_id, platform, kind, value, captured_at, source_url)
VALUES
  ('hazelmere-audioclub', 'soundcloud', 'plays', 1614, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/audioclub'),
  ('hazelmere-life-is-beautiful', 'soundcloud', 'plays', 210, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/lifeisbeautiful'),
  ('hazelmere-neverguessed', 'soundcloud', 'plays', 160, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/neverguessed'),
  ('starstrike-song-of-the-seas', 'soundcloud', 'plays', 983, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/song-of-the-seas'),
  ('starstrike-shut-up-n-kiss-me', 'soundcloud', 'plays', 1466, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/shut-up-n-kiss-me'),
  ('starstrike-starwrld', 'soundcloud', 'plays', 2990, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/starwrld-prod-nightclub20xx'),
  ('starstrike-katana', 'soundcloud', 'plays', 582, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/katana'),
  ('starstrike-echoes-of-hoenn', 'soundcloud', 'plays', 346, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/echoes-of-hoenn'),
  ('starstrike-the-one-that-got-away', 'soundcloud', 'plays', 1666, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/the-one-that-got-away'),
  ('starstrike-internet-depression-club', 'soundcloud', 'plays', 3591, '2026-08-21T05:30:00.000Z', 'https://soundcloud.com/hazelmere/internet-depression-club')
ON CONFLICT(canonical_id, platform, kind) DO UPDATE SET
  value = excluded.value,
  captured_at = excluded.captured_at,
  source_url = excluded.source_url;

INSERT OR IGNORE INTO metric_history
  (canonical_id, platform, kind, value, captured_at, source_url)
SELECT canonical_id, platform, kind, value, captured_at, source_url
FROM platform_metrics
WHERE platform = 'soundcloud' AND kind = 'plays';
