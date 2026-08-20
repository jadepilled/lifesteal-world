import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  artistsSchema,
  generatedReleasesSchema,
  presavesSchema,
  radioTracksSchema,
} from '../src/lib/schema';
import { contrastRatio } from '../src/lib/palette';

const root = resolve(import.meta.dirname, '..');
const readJson = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8')) as unknown;

const artists = artistsSchema.parse(readJson('src/data/artists.json'));
const releases = generatedReleasesSchema.parse(readJson('src/data/generated/releases.json'));
const presaves = presavesSchema.parse(readJson('src/data/presaves.json'));
const radioTracks = radioTracksSchema.parse(readJson('src/data/radio.json'));
const errors: string[] = [];

function unique(values: string[], label: string) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  if (duplicates.length)
    errors.push(`${label} contains duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
}

function verifyLocalAsset(path: string, label: string) {
  if (!path.startsWith('/assets/')) return;
  if (!existsSync(resolve(root, 'public', path.slice(1))))
    errors.push(`${label} references missing asset ${path}`);
}

unique(
  artists.map((artist) => artist.id),
  'artists',
);
unique(
  artists.map((artist) => artist.slug),
  'artist slugs',
);
unique(
  releases.map((release) => release.canonicalId),
  'releases',
);
unique(
  presaves.map((presave) => presave.id),
  'presaves',
);
unique(
  radioTracks.map((track) => track.id),
  'radio tracks',
);

const artistIds = new Set(artists.map((artist) => artist.id));
const releaseIds = new Set(releases.map((release) => release.canonicalId));

for (const artist of artists) {
  verifyLocalAsset(artist.portrait.src, `artist ${artist.id}`);
  if (artist.mark) verifyLocalAsset(artist.mark.src, `artist ${artist.id}`);
}

for (const release of releases) {
  for (const artistId of release.artistIds) {
    if (!artistIds.has(artistId))
      errors.push(`release ${release.canonicalId} references unknown artist ${artistId}`);
  }
  verifyLocalAsset(release.artwork.src, `release ${release.canonicalId}`);
  for (const surface of [release.palette.background, release.palette.surface]) {
    if (contrastRatio(release.palette.foreground, surface) < 4.5) {
      errors.push(`release ${release.canonicalId} palette fails AA contrast on ${surface}`);
    }
  }
}

for (const presave of presaves) {
  if (!artistIds.has(presave.artistId))
    errors.push(`presave ${presave.id} references unknown artist ${presave.artistId}`);
  if (!releaseIds.has(presave.releaseId))
    errors.push(`presave ${presave.id} references unknown release ${presave.releaseId}`);
  if (presave.status === 'active' && !presave.smartlinkUrl)
    errors.push(`active presave ${presave.id} has no smartlink URL`);
  verifyLocalAsset(presave.artwork.src, `presave ${presave.id}`);
}

for (const track of radioTracks) verifyLocalAsset(track.artwork.src, `radio track ${track.id}`);

if (errors.length) {
  console.error(`Data validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}

console.log(
  `Validated ${artists.length} artists, ${releases.length} releases, ${presaves.length} presaves, and ${radioTracks.length} radio tracks.`,
);
