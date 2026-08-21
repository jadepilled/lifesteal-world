import { execFile } from 'node:child_process';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import figlet from 'figlet';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const sourceRoot = path.resolve(process.argv[2] ?? 'radio-library');
const outputRoot = path.resolve(process.argv[3] ?? '.radio-staging');
const tracksRoot = path.join(outputRoot, 'tracks');
const artworkRoot = path.join(outputRoot, 'artwork');
const audioExtensions = ['.mp3', '.m4a', '.ogg', '.flac', '.wav', '.aac'];

type Probe = {
  format?: { duration?: string; tags?: Record<string, string> };
  streams?: Array<{ codec_type?: string; duration?: string }>;
};

type AlbumDefaults = { album: string; artist: string; year: number };

const albumDefaults: Array<[RegExp, AlbumDefaults]> = [
  [
    /sematary|grave.house/i,
    { album: 'GRAVE HOUSE', artist: 'SEMATARY & GHOST MOUNTAIN', year: 2019 },
  ],
  [/ebay|gluee/i, { album: 'GLUEE', artist: 'Bladee', year: 2014 }],
  [/red.light/i, { album: 'Red Light', artist: 'Bladee', year: 2018 }],
  [/dg-2017/i, { album: 'D&G', artist: 'Bladee', year: 2017 }],
  [/summer.knights/i, { album: 'Summer Knights', artist: 'Joey Bada$$', year: 2013 }],
  [/unknown.memory/i, { album: 'Unknown Memory', artist: 'Yung Lean', year: 2014 }],
  [/unknown.death/i, { album: 'Unknown Death 2002', artist: 'Yung Lean', year: 2013 }],
];

const walk = async (root: string): Promise<string[]> => {
  const entries = await readdir(root, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map((entry) => {
      const target = path.join(root, entry.name);
      return entry.isDirectory() ? walk(target) : Promise.resolve([target]);
    }),
  );
  return nested.flat();
};

const slug = (value: string) =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 72) || 'track';

const renderAsciiTitle = (value: string) =>
  figlet
    .textSync(value.toUpperCase(), {
      font: 'Slant',
      horizontalLayout: 'fitted',
      verticalLayout: 'fitted',
      whitespaceBreak: true,
    })
    .trimEnd();

const cleanTitle = (file: string) =>
  path
    .basename(file, path.extname(file))
    .replace(/^\d+(?:\.\d+)?[.\s_-]+/u, '')
    .replace(/^SEMATARY\s*&\s*GHOST MOUNTAIN\s*-\s*/iu, '')
    .replace(/\s+-?Prod\..*$/iu, '')
    .replaceAll('_', ' ')
    .trim();

const getDefaults = (file: string) =>
  albumDefaults.find(([pattern]) => pattern.test(file))?.[1] ?? {
    album: path.basename(path.dirname(file)),
    artist: 'LIFESTEAL RADIO',
    year: new Date().getFullYear(),
  };

const probe = async (file: string) => {
  const { stdout } = await execFileAsync(
    'ffprobe',
    [
      '-v',
      'error',
      '-show_entries',
      'format=duration:format_tags=artist,album,title,date,year',
      '-show_entries',
      'stream=codec_type,duration',
      '-of',
      'json',
      file,
    ],
    { maxBuffer: 1024 * 1024 * 4 },
  );
  return JSON.parse(stdout) as Probe;
};

const run = (command: string, args: string[]) =>
  new Promise<void>((resolve, reject) => {
    const child = execFile(command, args, { windowsHide: true }, (error) =>
      error ? reject(error) : resolve(),
    );
    child.stdout?.resume();
    child.stderr?.resume();
  });

const hex = (red: number, green: number, blue: number) =>
  `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`;

const paletteFromArtwork = async (file: string) => {
  const { data, info } = await sharp(file)
    .resize(48, 48, { fit: 'cover' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const bins = new Map<string, { count: number; rgb: [number, number, number] }>();
  for (let offset = 0; offset < data.length; offset += info.channels) {
    const rgb = [data[offset] ?? 0, data[offset + 1] ?? 0, data[offset + 2] ?? 0] as const;
    const luminance = rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    if (luminance < 18 || luminance > 244) continue;
    const quantized = rgb.map((channel) => Math.round(channel / 32) * 32) as [
      number,
      number,
      number,
    ];
    const key = quantized.join(',');
    const current = bins.get(key);
    bins.set(key, { count: (current?.count ?? 0) + 1, rgb: quantized });
  }
  const ranked = [...bins.values()].sort((left, right) => right.count - left.count);
  const chosen: Array<[number, number, number]> = [];
  for (const candidate of ranked) {
    if (
      chosen.every(
        (color) =>
          Math.hypot(
            color[0] - candidate.rgb[0],
            color[1] - candidate.rgb[1],
            color[2] - candidate.rgb[2],
          ) > 62,
      )
    ) {
      chosen.push(
        candidate.rgb.map((channel) => Math.min(255, channel)) as [number, number, number],
      );
    }
    if (chosen.length === 3) break;
  }
  while (chosen.length < 3) chosen.push(chosen.at(-1) ?? [255, 48, 79]);
  return chosen.map((color) => hex(...color));
};

const findArtwork = async (files: string[], audio: string, albumId: string) => {
  const explicit = files
    .filter((file) => /\.(?:jpe?g|png|webp)$/iu.test(file))
    .filter((file) => !/spectrogram|thumb/iu.test(file))
    .find((file) => /(?:^|[\\/])(cover|front|sk)\.(?:jpe?g|png|webp)$/iu.test(file));
  const target = path.join(artworkRoot, `${albumId}.webp`);
  if (explicit) {
    await sharp(explicit).resize(720, 720, { fit: 'cover' }).webp({ quality: 84 }).toFile(target);
    return target;
  }
  const extracted = path.join(outputRoot, `${albumId}-embedded.jpg`);
  try {
    await run('ffmpeg', [
      '-y',
      '-v',
      'error',
      '-i',
      audio,
      '-map',
      '0:v:0',
      '-frames:v',
      '1',
      extracted,
    ]);
    await sharp(extracted).resize(720, 720, { fit: 'cover' }).webp({ quality: 84 }).toFile(target);
  } catch {
    const defaults = getDefaults(audio);
    const escapeXml = (value: string) =>
      value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
    const placeholder = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="720"><rect width="720" height="720" fill="#030303"/><text x="50%" y="47%" fill="#f4f1ea" font-family="monospace" font-size="34" text-anchor="middle">${escapeXml(defaults.artist)}</text><text x="50%" y="55%" fill="#98958f" font-family="monospace" font-size="24" text-anchor="middle">${escapeXml(defaults.album)}</text></svg>`,
    );
    await sharp(placeholder).webp({ quality: 84 }).toFile(target);
  }
  return target;
};

await mkdir(tracksRoot, { recursive: true });
await mkdir(artworkRoot, { recursive: true });
const allFiles = await walk(sourceRoot);
const audioFiles = allFiles.filter((file) =>
  audioExtensions.includes(path.extname(file).toLowerCase()),
);
const grouped = new Map<string, string[]>();
audioFiles.forEach((file) => {
  const key = `${path.dirname(file).toLowerCase()}|${path.basename(file, path.extname(file)).toLowerCase()}`;
  grouped.set(key, [...(grouped.get(key) ?? []), file]);
});
const selected = [...grouped.values()]
  .map(
    (group) =>
      group.sort(
        (left, right) =>
          audioExtensions.indexOf(path.extname(left).toLowerCase()) -
          audioExtensions.indexOf(path.extname(right).toLowerCase()),
      )[0]!,
  )
  .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));

const albumRecords = new Map<string, { artwork: string; palette: string[] }>();
const usedIds = new Map<string, number>();
const records: Array<Record<string, unknown>> = [];
const existing = JSON.parse(
  await readFile(
    path.resolve(import.meta.dirname, '../radio-stack/catalogue.example.json'),
    'utf8',
  ),
) as Array<Record<string, unknown>>;
records.push(
  ...existing.map((track) => ({
    ...track,
    asciiTitle: renderAsciiTitle(String(track.title ?? 'STREAM OFFLINE')),
  })),
);

for (const [index, file] of selected.entries()) {
  const details = await probe(file).catch(() => ({}) as Probe);
  const tags = Object.fromEntries(
    Object.entries(details.format?.tags ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const defaults = getDefaults(file);
  const title = tags.title?.trim() || cleanTitle(file);
  const artist = tags.artist?.trim() || defaults.artist;
  const album = tags.album?.trim() || defaults.album;
  const year =
    Number.parseInt(tags.date ?? tags.year ?? String(defaults.year), 10) || defaults.year;
  const streamDuration = details.streams?.find((stream) => stream.codec_type === 'audio')?.duration;
  const durationMs = Math.max(
    1,
    Math.round(Number(details.format?.duration ?? streamDuration ?? 0) * 1000),
  );
  const baseId = slug(`${artist}-${title}`);
  const occurrence = usedIds.get(baseId) ?? 0;
  usedIds.set(baseId, occurrence + 1);
  const id = occurrence ? `${baseId}-${occurrence + 1}` : baseId;
  const albumId = slug(`${artist}-${album}`);
  if (!albumRecords.has(albumId)) {
    const albumFiles = allFiles.filter(
      (candidate) => getDefaults(candidate).album === defaults.album,
    );
    const art = await findArtwork(albumFiles, file, albumId);
    albumRecords.set(albumId, {
      artwork: `/artwork/${albumId}.webp`,
      palette: await paletteFromArtwork(art),
    });
  }
  const targetName = `${id}.mp3`;
  const target = path.join(tracksRoot, targetName);
  let ready = false;
  try {
    ready = (await stat(target)).size > 1024;
  } catch {
    ready = false;
  }
  if (!ready) {
    try {
      await run('ffmpeg', [
        '-y',
        '-v',
        'error',
        '-i',
        file,
        '-map',
        '0:a:0',
        '-vn',
        '-c:a',
        'libmp3lame',
        '-b:a',
        '128k',
        '-ar',
        '44100',
        '-ac',
        '2',
        '-metadata',
        `title=${title}`,
        '-metadata',
        `artist=${artist}`,
        '-metadata',
        `album=${album}`,
        target,
      ]);
    } catch {
      process.stdout.write(`\nSkipped damaged audio: ${file}\n`);
      continue;
    }
  }
  const albumRecord = albumRecords.get(albumId)!;
  records.push({
    id,
    label: 'LIFESTEAL RADIO',
    year,
    artist,
    album,
    title,
    asciiTitle: renderAsciiTitle(title),
    audioFilename: targetName,
    artwork: albumRecord.artwork,
    durationMs,
    palette: albumRecord.palette,
    enabled: true,
    order: index + existing.length + 1,
  });
  process.stdout.write(`\rPrepared ${index + 1}/${selected.length}: ${artist} — ${title}`);
}

await writeFile(path.join(outputRoot, 'catalogue.json'), `${JSON.stringify(records, null, 2)}\n`);
process.stdout.write(`\nPrepared ${records.length} radio tracks in ${outputRoot}\n`);
