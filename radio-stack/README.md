# LIFESTEAL radio

The production radio is a deliberately small native stack: Icecast provides one continuous MP3 mount, a dependency-free Node process schedules the catalogue and feeds FFmpeg, and nginx exposes only the public stream, artwork, health check, and sanitized now-playing JSON. It runs independently of the soultrader service.

## Add or change a track

For a folder or album-sized import, prepare an upload package locally first. The ingest command deduplicates alternate encodings, reads embedded tags and covers, creates artwork-derived palettes, skips damaged files, and normalizes audio to the station's low-overhead format:

```sh
npm run radio:ingest -- "C:\path\to\music" ".radio-staging"
```

Upload `.radio-staging/tracks/`, `.radio-staging/artwork/`, and the generated `catalogue.json` using SFTP or `scp`, then continue from step 3 below.

1. Open a fresh SSH/SFTP session so the `lifesteal-radio` group is active. Upload owned audio and artwork, for example:

   ```sh
   scp "new-track.mp3" jade@178.156.209.199:/srv/lifesteal-radio/tracks/
   scp "new-track.jpg" jade@178.156.209.199:/srv/lifesteal-radio/public/artwork/
   ```

   The set-group-ID directories keep new files inside the radio service group.

2. Edit `/srv/lifesteal-radio/catalogue.json`. Copy the shape from `catalogue.example.json`; filenames are relative to the two directories above. `durationMs` can be read with `ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 FILE` and multiplied by 1000.
3. Validate the JSON with `python3 -m json.tool /srv/lifesteal-radio/catalogue.json`.
4. Run `sudo systemctl restart lifesteal-radio` to begin using the new catalogue. Existing listeners reconnect automatically.
5. Check `https://radio.lifesteal.world/health`, `https://radio.lifesteal.world/now-playing.json`, and `sudo journalctl -u lifesteal-radio -n 50 --no-pager`.

Use `enabled: false` to keep a catalogue entry staged without broadcasting it. The scheduler uses a fresh shuffled bag for each complete rotation and prevents the previous track from immediately repeating when it reshuffles. `order` is retained only as editorial metadata. Audio is encoded once at 128 kbps MP3 to limit CPU and bandwidth; every listener joins the same live mount rather than starting an individual file.

Server passwords and Icecast source/admin credentials belong only in `/etc/lifesteal-radio.env` and `/etc/icecast2/icecast.xml`. They must never be committed.
