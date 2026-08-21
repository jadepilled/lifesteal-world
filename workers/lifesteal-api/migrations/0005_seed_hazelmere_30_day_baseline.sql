-- Each HAZELMERE track in the current catalogue was created after this timestamp:
-- AUDIOCLUB 2026-07-25, NEVERGUESSED 2026-07-28, LIFE IS BEAUTIFUL 2026-08-11.
-- Their exact play count at the start of the current 30-day window was therefore zero.
INSERT OR IGNORE INTO metric_history
  (canonical_id, platform, kind, value, captured_at, source_url)
VALUES
  ('hazelmere-audioclub', 'soundcloud', 'plays', 0, '2026-07-22T05:30:00.000Z', 'https://soundcloud.com/hazelmere/audioclub'),
  ('hazelmere-neverguessed', 'soundcloud', 'plays', 0, '2026-07-22T05:30:00.000Z', 'https://soundcloud.com/hazelmere/neverguessed'),
  ('hazelmere-life-is-beautiful', 'soundcloud', 'plays', 0, '2026-07-22T05:30:00.000Z', 'https://soundcloud.com/hazelmere/lifeisbeautiful');
