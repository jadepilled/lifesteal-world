INSERT INTO platform_metrics (canonical_id, platform, kind, value, captured_at, source_url)
VALUES
  ('hazelmere-audioclub', 'soundcloud', 'plays', 1614, '2026-08-21T04:11:31.000Z', 'https://soundcloud.com/hazelmere/audioclub'),
  ('hazelmere-life-is-beautiful', 'soundcloud', 'plays', 210, '2026-08-21T04:11:31.000Z', 'https://soundcloud.com/hazelmere/lifeisbeautiful')
ON CONFLICT(canonical_id, platform, kind) DO UPDATE SET
  value = excluded.value,
  captured_at = excluded.captured_at,
  source_url = excluded.source_url;
