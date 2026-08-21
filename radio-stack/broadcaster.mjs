import { spawn } from 'node:child_process';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.env.RADIO_ROOT ?? '/srv/lifesteal-radio';
const cataloguePath = process.env.RADIO_CATALOGUE ?? path.join(root, 'catalogue.json');
const publicPath = process.env.RADIO_PUBLIC ?? path.join(root, 'public');
const sourcePassword = process.env.ICECAST_SOURCE_PASSWORD;
const mount = process.env.ICECAST_MOUNT ?? 'stream.mp3';
const bitrateKbps = Number(process.env.RADIO_BITRATE_KBPS ?? 128);
const icecastUrl = `icecast://source:${sourcePassword}@127.0.0.1:8000/${mount}`;

if (!sourcePassword) throw new Error('ICECAST_SOURCE_PASSWORD is required');

let stopping = false;
let child;

const writeNowPlaying = async (value) => {
  await mkdir(publicPath, { recursive: true });
  const target = path.join(publicPath, 'now-playing.json');
  const temporary = `${target}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o644 });
  await rename(temporary, target);
};

const getTracks = async () => {
  const catalogue = JSON.parse(await readFile(cataloguePath, 'utf8'));
  if (!Array.isArray(catalogue)) throw new Error('Radio catalogue must be an array');
  return catalogue.filter((track) => track.enabled !== false);
};

const shuffle = (tracks, previousId) => {
  const queue = [...tracks];
  for (let index = queue.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [queue[index], queue[swap]] = [queue[swap], queue[index]];
  }
  if (queue.length > 1 && queue[0]?.id === previousId) {
    [queue[0], queue[1]] = [queue[1], queue[0]];
  }
  return queue;
};

const streamTrack = async (track) => {
  const startedAt = new Date();
  const durationMs = Number(track.durationMs ?? 0);
  await writeNowPlaying({
    status: 'online',
    id: track.id,
    artist: track.artist,
    title: track.title,
    titleAscii: track.asciiTitle,
    album: track.album,
    year: track.year,
    label: track.label,
    artwork: track.artwork,
    palette: track.palette,
    startedAt: startedAt.toISOString(),
    endsAt: durationMs ? new Date(startedAt.getTime() + durationMs).toISOString() : undefined,
    broadcast: {
      codec: 'MP3',
      bitrateKbps,
      sampleRate: 44100,
      channels: 2,
    },
  });

  const input = path.resolve(root, 'tracks', track.audioFilename);
  child = spawn(
    'ffmpeg',
    [
      '-hide_banner',
      '-loglevel',
      'warning',
      '-re',
      '-nostdin',
      '-i',
      input,
      '-vn',
      '-c:a',
      'libmp3lame',
      '-b:a',
      `${bitrateKbps}k`,
      '-ar',
      '44100',
      '-ac',
      '2',
      '-content_type',
      'audio/mpeg',
      '-f',
      'mp3',
      icecastUrl,
    ],
    { stdio: ['ignore', 'inherit', 'inherit'] },
  );
  await new Promise((resolve) => child.once('exit', resolve));
  child = undefined;
};

const run = async () => {
  let queue = [];
  let previousId;
  while (!stopping) {
    try {
      if (!queue.length) queue = shuffle(await getTracks(), previousId);
      if (!queue.length) {
        await writeNowPlaying({ status: 'offline', reason: 'NO ENABLED TRACKS' });
        await new Promise((resolve) => setTimeout(resolve, 5000));
        continue;
      }
      const track = queue.shift();
      previousId = track.id;
      await streamTrack(track);
    } catch (error) {
      console.error(error);
      await writeNowPlaying({ status: 'offline', reason: 'SOURCE RECOVERING' }).catch(() => {});
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
};

const stop = () => {
  stopping = true;
  child?.kill('SIGTERM');
};

process.on('SIGINT', stop);
process.on('SIGTERM', stop);

await run();
