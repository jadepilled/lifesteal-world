import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../src/lib/palette';
import {
  artistsSchema,
  generatedReleasesSchema,
  presavesSchema,
  radioTracksSchema,
} from '../src/lib/schema';

const root = resolve(import.meta.dirname, '..');
const json = (path: string) => JSON.parse(readFileSync(resolve(root, path), 'utf8')) as unknown;

describe('checked-in content', () => {
  const artists = artistsSchema.parse(json('src/data/artists.json'));
  const releases = generatedReleasesSchema.parse(json('src/data/generated/releases.json'));
  const presaves = presavesSchema.parse(json('src/data/presaves.json'));
  const radio = radioTracksSchema.parse(json('src/data/radio.json'));

  it('has unique canonical IDs', () => {
    expect(new Set(releases.map((release) => release.canonicalId)).size).toBe(releases.length);
    expect(new Set(artists.map((artist) => artist.id)).size).toBe(artists.length);
  });

  it('deduplicates requested cross-platform releases', () => {
    expect(
      releases.filter((release) => release.canonicalId === 'starstrike-echoes-of-hoenn'),
    ).toHaveLength(1);
    const internetDepressionClub = releases.find(
      (release) => release.canonicalId === 'starstrike-internet-depression-club',
    );
    expect(internetDepressionClub?.links.map((link) => link.platform).sort()).toEqual([
      'soundcloud',
      'spotify',
    ]);
  });

  it('references existing artists and releases', () => {
    const artistIds = new Set(artists.map((artist) => artist.id));
    const releaseIds = new Set(releases.map((release) => release.canonicalId));
    releases
      .flatMap((release) => release.artistIds)
      .forEach((id) => expect(artistIds.has(id)).toBe(true));
    presaves.forEach((presave) => {
      expect(artistIds.has(presave.artistId)).toBe(true);
      expect(releaseIds.has(presave.releaseId)).toBe(true);
    });
  });

  it('keeps release text readable over generated surfaces', () => {
    releases.forEach((release) => {
      expect(
        contrastRatio(release.palette.foreground, release.palette.background),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(release.palette.foreground, release.palette.surface),
      ).toBeGreaterThanOrEqual(4.5);
    });
  });

  it('ships every local image named by the catalogue', () => {
    const imagePaths = [
      ...artists.map((artist) => artist.portrait.src),
      ...releases.map((release) => release.artwork.src),
      ...presaves.map((presave) => presave.artwork.src),
      ...radio.map((track) => track.artwork.src),
    ];
    imagePaths
      .filter((path) => path.startsWith('/assets/'))
      .forEach((path) => {
        expect(existsSync(resolve(root, 'public', path.slice(1))), path).toBe(true);
      });
  });
});
