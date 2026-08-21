import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp from 'sharp';
import { extractPalette } from '../src/lib/palette';

const releases = [
  {
    id: 'starstrike-song-of-the-seas',
    artwork: 'https://i1.sndcdn.com/artworks-30bQGGO9kGGLpFvJ-uzzbaQ-t1080x1080.jpg',
  },
  {
    id: 'starstrike-shut-up-n-kiss-me',
    artwork: 'https://i1.sndcdn.com/artworks-RxZBVJWi2dSTdzHE-Umg0cA-t1080x1080.jpg',
  },
  {
    id: 'starstrike-starwrld',
    artwork: 'https://i1.sndcdn.com/artworks-u2zoWF46CZfKu9T1-rvgzXw-t1080x1080.jpg',
  },
  {
    id: 'hazelmere-neverguessed',
    artwork: 'https://i1.sndcdn.com/artworks-9fBEsENZVJywiPV6-iDIR0g-t1080x1080.jpg',
  },
  {
    id: 'starstrike-katana',
    artwork: 'https://i1.sndcdn.com/artworks-57FSCEZ8ImsEjyrB-z1F5Yw-t1080x1080.jpg',
  },
  {
    id: 'starstrike-echoes-of-hoenn',
    artwork: 'https://i1.sndcdn.com/artworks-YEiKu1uKvzaImCB4-OywMkA-t1080x1080.jpg',
  },
  {
    id: 'starstrike-the-one-that-got-away',
    artwork: 'https://i.scdn.co/image/ab67616d0000b2739f23835d8989bbdc26cd57bb',
  },
  {
    id: 'starstrike-internet-depression-club',
    artwork: 'https://i.scdn.co/image/ab67616d0000b273782167dd51e719894215a76b',
  },
  {
    id: 'starstrike-flow',
    artwork: 'https://i.scdn.co/image/ab67616d0000b27345d8986cd801e7dbe7b4625d',
  },
] as const;

const output = resolve(import.meta.dirname, '../public/assets/releases');
await mkdir(output, { recursive: true });

const results = [];
for (const release of releases) {
  const response = await fetch(release.artwork);
  if (!response.ok) throw new Error(`${release.id}: artwork request failed (${response.status})`);
  const source = Buffer.from(await response.arrayBuffer());
  const square = sharp(source).resize(1080, 1080, { fit: 'cover', position: 'centre' });
  await square
    .clone()
    .webp({ quality: 88 })
    .toFile(resolve(output, `${release.id}.webp`));
  await square
    .clone()
    .resize(800, 800)
    .webp({ quality: 86 })
    .toFile(resolve(output, `${release.id}-800.webp`));
  await square
    .clone()
    .resize(540, 540)
    .webp({ quality: 84 })
    .toFile(resolve(output, `${release.id}-540.webp`));
  results.push({ id: release.id, palette: await extractPalette(source) });
}

console.log(JSON.stringify(results, null, 2));
