import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import sharp from 'sharp';
import artistsJson from '../src/data/artists.json';
import { extractPalette } from '../src/lib/palette';
import { generatedReleaseSchema, type GeneratedRelease, type Palette } from '../src/lib/schema';

const root = resolve(import.meta.dirname, '..');
const cataloguePath = resolve(root, 'src/data/generated/releases.json');
const artworkDirectory = resolve(root, 'public/assets/releases');
const cli = createInterface({ input: stdin, output: stdout });
const argument = (name: string) => {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const sourceArgument = argument('--source');

if (process.argv.includes('--help')) {
  stdout.write(
    [
      'LIFESTEAL release importer',
      '',
      'npm run release:add',
      'npm run release:add -- --source https://soundcloud.com/...',
      'npm run release:add -- --source https://open.spotify.com/track/... --deploy',
      '',
      'Provider metadata is only a starting point: every field is editable before confirmation.',
      'Spotify full metadata uses SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET when present;',
      'without them the importer falls back to Spotify oEmbed and asks for the missing fields.',
      '',
    ].join('\n'),
  );
  process.exit(0);
}

type Draft = Partial<GeneratedRelease> & {
  remoteArtwork?: string;
  sourcePlatform?: 'local' | 'spotify' | 'soundcloud';
};

const ask = async (label: string, fallback = '') => {
  const answer = (await cli.question(`${label}${fallback ? ` [${fallback}]` : ''}: `)).trim();
  return answer || fallback;
};
const askNullable = async (label: string, fallback: string | null = null) => {
  const value = await ask(label, fallback ?? '');
  return value || null;
};
const yes = async (label: string, fallback = false) => {
  const answer = (await ask(`${label} (y/n)`, fallback ? 'y' : 'n')).toLowerCase();
  return answer === 'y' || answer === 'yes';
};
const commaList = (value: string) => [
  ...new Set(
    value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean),
  ),
];
const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const isoDate = (value: unknown) =>
  typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value) ? value.slice(0, 10) : null;

const walkFor = (
  value: unknown,
  predicate: (record: Record<string, unknown>) => boolean,
): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null;
  if (!Array.isArray(value) && predicate(value as Record<string, unknown>))
    return value as Record<string, unknown>;
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    const found = walkFor(child, predicate);
    if (found) return found;
  }
  return null;
};

const importSoundCloud = async (url: string): Promise<Draft> => {
  const response = await fetch(url, { headers: { 'User-Agent': 'LIFESTEAL-catalogue/1.0' } });
  if (!response.ok) throw new Error(`SoundCloud returned ${response.status}.`);
  const html = await response.text();
  const encoded = html.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);\s*<\/script>/s)?.[1];
  if (!encoded) throw new Error('SoundCloud hydration data was not found.');
  const normalizedUrl = url.replace(/\/$/, '').split('?')[0];
  const track = walkFor(
    JSON.parse(encoded),
    (record) => String(record.permalink_url ?? '').replace(/\/$/, '') === normalizedUrl,
  );
  if (!track) throw new Error('The supplied SoundCloud URL did not resolve to a track.');
  const platformId = String(track.id);
  const now = new Date().toISOString();
  const artwork =
    typeof track.artwork_url === 'string'
      ? track.artwork_url.replace(/-large\.(jpg|png)$/i, '-t1080x1080.$1')
      : undefined;
  const genre = typeof track.genre === 'string' ? track.genre.trim() : '';
  const tags =
    typeof track.tag_list === 'string'
      ? (track.tag_list.match(/"[^"]+"|\S+/g)?.map((tag) => tag.replace(/^"|"$/g, '')) ?? [])
      : [];
  const username =
    typeof (track.user as Record<string, unknown> | undefined)?.username === 'string'
      ? String((track.user as Record<string, unknown>).username)
      : '';
  return {
    title: String(track.title ?? ''),
    album: String(track.title ?? ''),
    releaseDate: isoDate(track.release_date) ?? isoDate(track.created_at),
    durationMs: typeof track.duration === 'number' ? track.duration : null,
    biography: typeof track.description === 'string' ? track.description.split('\n')[0] : '',
    genres: [...new Set([genre, ...tags].filter(Boolean))].slice(0, 6),
    links: [{ platform: 'soundcloud', url, platformId }],
    metrics:
      typeof track.playback_count === 'number'
        ? [{ platform: 'soundcloud', kind: 'plays', value: track.playback_count, asOf: now }]
        : [],
    provenance: [{ source: 'soundcloud', sourceId: platformId, fetchedAt: now }],
    remoteArtwork: artwork,
    sourcePlatform: 'soundcloud',
    artistIds: artistsJson
      .filter((artist) => artist.displayName.toLowerCase() === username.toLowerCase())
      .map((artist) => artist.id),
  };
};

const spotifyToken = async () => {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return null;
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) return null;
  return ((await response.json()) as { access_token?: string }).access_token ?? null;
};

const importSpotify = async (url: string): Promise<Draft> => {
  const platformId = /track\/([A-Za-z0-9]+)/.exec(url)?.[1];
  if (!platformId) throw new Error('The supplied Spotify URL is not a track URL.');
  const token = await spotifyToken();
  const now = new Date().toISOString();
  if (token) {
    const response = await fetch(`https://api.spotify.com/v1/tracks/${platformId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (response.ok) {
      const track = (await response.json()) as Record<string, any>;
      const artistIds = (track.artists ?? [])
        .map(
          (artist: { id?: string }) =>
            artistsJson.find((candidate) => candidate.spotifyArtistId === artist.id)?.id,
        )
        .filter(Boolean);
      return {
        title: track.name,
        album: track.album?.name ?? track.name,
        releaseDate: isoDate(track.album?.release_date),
        durationMs: track.duration_ms ?? null,
        isrc: track.external_ids?.isrc ?? null,
        artistIds,
        links: [{ platform: 'spotify', url, platformId }],
        metrics: [],
        provenance: [{ source: 'spotify', sourceId: platformId, fetchedAt: now }],
        remoteArtwork: track.album?.images?.[0]?.url,
        sourcePlatform: 'spotify',
      };
    }
  }
  const response = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`);
  if (!response.ok) throw new Error(`Spotify returned ${response.status}.`);
  const embed = (await response.json()) as { title?: string; thumbnail_url?: string };
  return {
    title: embed.title ?? '',
    album: embed.title ?? '',
    links: [{ platform: 'spotify', url, platformId }],
    metrics: [],
    provenance: [{ source: 'spotify', sourceId: platformId, fetchedAt: now }],
    remoteArtwork: embed.thumbnail_url,
    sourcePlatform: 'spotify',
  };
};

const parseLinks = (value: string) =>
  value
    .split(';')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const [platform, url, platformId] = entry.split('|').map((part) => part.trim());
      return { platform, url, ...(platformId ? { platformId } : {}) };
    });

const source = sourceArgument ?? (await ask('SoundCloud/Spotify track URL (blank for manual)'));
let imported: Draft = {};
if (source) {
  stdout.write('Resolving provider metadata...\n');
  if (/soundcloud\.com/i.test(source)) imported = await importSoundCloud(source);
  else if (/open\.spotify\.com/i.test(source)) imported = await importSpotify(source);
  else
    throw new Error('Only SoundCloud and Spotify track URLs are supported for automatic import.');
}

const defaultArtist = imported.artistIds?.join(',') || artistsJson[0]?.id || '';
const artistIds = commaList(
  await ask(`Artist IDs (${artistsJson.map((artist) => artist.id).join(', ')})`, defaultArtist),
);
const title = await ask('Song title', imported.title ?? '');
const canonicalId = await ask('Canonical ID', slugify(`${artistIds[0] ?? 'artist'}-${title}`));
const releaseDate = await askNullable('Release date (YYYY-MM-DD)', imported.releaseDate ?? null);
const importedLinks = (imported.links ?? [])
  .map((link) => `${link.platform}|${link.url}|${link.platformId ?? ''}`)
  .join('; ');
const links = parseLinks(
  await ask('Platform links (platform|url|optional-id; ...)', importedLinks),
);
const artworkInput = await ask(
  'Artwork URL, local file, or existing /assets path',
  imported.remoteArtwork ?? `/assets/releases/${canonicalId}.webp`,
);
let artworkBuffer: Buffer | null = null;
let artworkPath = artworkInput;
if (/^https:\/\//i.test(artworkInput)) {
  const response = await fetch(artworkInput);
  if (!response.ok) throw new Error(`Artwork returned ${response.status}.`);
  artworkBuffer = Buffer.from(await response.arrayBuffer());
  artworkPath = `/assets/releases/${canonicalId}.webp`;
} else if (!artworkInput.startsWith('/assets/')) {
  const localPath = resolve(artworkInput);
  if (!existsSync(localPath)) throw new Error(`Artwork file not found: ${localPath}`);
  artworkBuffer = await readFile(localPath);
  artworkPath = `/assets/releases/${canonicalId}.webp`;
}

const paletteDefaults = artworkBuffer
  ? await extractPalette(artworkBuffer)
  : ({
      background: '#000000',
      surface: '#131313',
      foreground: '#f8f6f1',
      accent: '#90ff9a',
      glow: '#b2ffb8',
    } satisfies Palette);
const palette: Palette = {
  background: await ask('Palette: background', paletteDefaults.background),
  surface: await ask('Palette: surface', paletteDefaults.surface),
  foreground: await ask('Palette: foreground', paletteDefaults.foreground),
  accent: await ask('Palette: accent', paletteDefaults.accent),
  glow: await ask('Palette: glow', paletteDefaults.glow),
};
const now = new Date().toISOString();
const release = generatedReleaseSchema.parse({
  canonicalId,
  title,
  version: await askNullable('Version / mix note', imported.version ?? null),
  artistIds,
  album: await ask('Album / release title', imported.album ?? title),
  releaseType: await ask(
    'Release type (single/ep/album/compilation)',
    imported.releaseType ?? 'single',
  ),
  genres: commaList(
    await ask('Genres (comma separated)', imported.genres?.join(', ') ?? 'Electronic'),
  ),
  status: await ask(
    'Status (upcoming/released/archived)',
    releaseDate && releaseDate > now.slice(0, 10) ? 'upcoming' : 'released',
  ),
  releaseDate,
  durationMs:
    Number(
      await ask('Duration in milliseconds (0 for unknown)', String(imported.durationMs ?? 0)),
    ) || null,
  isrc: await askNullable('ISRC', imported.isrc ?? null),
  biography: await ask(
    'Song biography',
    imported.biography ?? `${title} by ${artistIds.join(' + ')}.`,
  ),
  artwork: {
    src: artworkPath,
    alt: await ask('Artwork alt text', `Cover artwork for ${title}`),
    source: await ask(
      'Artwork source (local/spotify/soundcloud)',
      imported.sourcePlatform ?? 'local',
    ),
  },
  palette,
  links,
  metrics: imported.metrics ?? [],
  provenance: imported.provenance ?? [{ source: 'local', sourceId: canonicalId, fetchedAt: null }],
});

stdout.write(`\n${JSON.stringify(release, null, 2)}\n\n`);
if (!(await yes('Add this release and rebuild the project?'))) {
  cli.close();
  process.exit(0);
}

const current = JSON.parse(await readFile(cataloguePath, 'utf8')) as GeneratedRelease[];
if (current.some((item) => item.canonicalId === release.canonicalId)) {
  throw new Error(`A release with canonical ID ${release.canonicalId} already exists.`);
}
const next = [...current, release].sort(
  (left, right) =>
    (right.releaseDate ?? '').localeCompare(left.releaseDate ?? '') ||
    left.title.localeCompare(right.title),
);
const backup = `${cataloguePath}.before-add`;
await writeFile(backup, `${JSON.stringify(current, null, 2)}\n`, 'utf8');
await writeFile(cataloguePath, `${JSON.stringify(next, null, 2)}\n`, 'utf8');

if (artworkBuffer) {
  await mkdir(artworkDirectory, { recursive: true });
  const image = sharp(artworkBuffer).resize(1080, 1080, {
    fit: 'inside',
    withoutEnlargement: false,
  });
  await image
    .clone()
    .webp({ quality: 88 })
    .toFile(resolve(artworkDirectory, `${canonicalId}.webp`));
  await image
    .clone()
    .resize(800, 800, { fit: 'inside' })
    .webp({ quality: 86 })
    .toFile(resolve(artworkDirectory, `${canonicalId}-800.webp`));
  await image
    .clone()
    .resize(540, 540, { fit: 'inside' })
    .webp({ quality: 84 })
    .toFile(resolve(artworkDirectory, `${canonicalId}-540.webp`));
}

const validation = spawnSync(
  process.execPath,
  [resolve(root, 'node_modules/tsx/dist/cli.mjs'), resolve(root, 'scripts/validate-data.ts')],
  { cwd: root, stdio: 'inherit' },
);
if (validation.status !== 0) {
  await rename(backup, cataloguePath);
  throw new Error('Validation failed; the catalogue JSON was restored.');
}
await unlink(backup);
stdout.write(
  `\nAdded ${release.canonicalId}. The release index, responsive artwork, and Worker routing source are ready.\n`,
);
if (await yes('Deploy the refreshed metrics Worker now?', process.argv.includes('--deploy'))) {
  const deployment = spawnSync('npm', ['run', 'worker:deploy'], {
    cwd: root,
    stdio: 'inherit',
    shell: true,
  });
  if (deployment.status !== 0)
    throw new Error('The catalogue is valid, but Worker deployment failed.');
}
cli.close();
