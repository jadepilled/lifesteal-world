import artistData from '../data/artists.json';
import presaveData from '../data/presaves.json';
import radioData from '../data/radio.json';
import generatedReleaseData from '../data/generated/releases.json';
import {
  artistsSchema,
  generatedReleasesSchema,
  presavesSchema,
  radioTracksSchema,
} from './schema';

export const artists = artistsSchema.parse(artistData);
export const releases = generatedReleasesSchema
  .parse(generatedReleaseData)
  .filter((release) => release.status !== 'archived')
  .sort((left, right) => {
    if (!left.releaseDate && !right.releaseDate) return left.title.localeCompare(right.title);
    if (!left.releaseDate) return -1;
    if (!right.releaseDate) return 1;
    return right.releaseDate.localeCompare(left.releaseDate);
  });
export const presaves = presavesSchema.parse(presaveData);
export const radioTracks = radioTracksSchema
  .parse(radioData)
  .filter((track) => track.enabled)
  .sort((left, right) => left.order - right.order);

export const artistById = new Map(artists.map((artist) => [artist.id, artist]));

export function releaseArtists(artistIds: string[]) {
  return artistIds.map((id) => artistById.get(id)).filter((artist) => artist !== undefined);
}
