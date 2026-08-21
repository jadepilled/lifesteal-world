import { z } from 'zod';

const httpUrl = z.url().refine((value) => /^https:\/\//.test(value), {
  message: 'Public URLs must use HTTPS',
});

export const imageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().min(1),
  focalPoint: z.string().optional(),
});

export const paletteSchema = z.object({
  background: z.string().regex(/^#[0-9a-f]{6}$/i),
  surface: z.string().regex(/^#[0-9a-f]{6}$/i),
  foreground: z.string().regex(/^#[0-9a-f]{6}$/i),
  accent: z.string().regex(/^#[0-9a-f]{6}$/i),
  glow: z.string().regex(/^#[0-9a-f]{6}$/i),
});

export const artistSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(1),
  genres: z.array(z.string().min(1)).min(1),
  activeYears: z.string().min(1),
  location: z.string().min(1),
  biography: z.string().min(40),
  portrait: imageSchema,
  mark: imageSchema.optional(),
  palette: paletteSchema,
  spotifyArtistId: z.string().nullable(),
  soundcloudProfileUrl: httpUrl.nullable(),
  metricsSnapshot: z.object({
    plays30d: z.number().int().nonnegative().nullable(),
    soundcloudFollowers: z.number().int().nonnegative().nullable(),
    spotifyMonthlyListeners: z.number().int().nonnegative().nullable(),
    asOf: z.iso.datetime(),
  }),
  links: z.array(
    z.object({
      label: z.string().min(1),
      platform: z.enum(['instagram', 'soundcloud', 'spotify', 'youtube-music', 'tidal', 'website']),
      url: httpUrl,
    }),
  ),
});

export const platformLinkSchema = z.object({
  platform: z.enum([
    'spotify',
    'soundcloud',
    'youtube-music',
    'tidal',
    'bandcamp',
    'apple-music',
    'other',
  ]),
  url: httpUrl,
  platformId: z.string().optional(),
});

export const generatedReleaseSchema = z.object({
  canonicalId: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  version: z.string().nullable().default(null),
  artistIds: z.array(z.string()).min(1),
  album: z.string().min(1),
  releaseType: z.enum(['single', 'ep', 'album', 'compilation']),
  genres: z.array(z.string().min(1)).min(1),
  status: z.enum(['upcoming', 'released', 'archived']),
  releaseDate: z.iso.date().nullable(),
  durationMs: z.number().int().positive().nullable(),
  isrc: z.string().nullable(),
  biography: z.string().min(1),
  artwork: imageSchema.extend({
    source: z.enum(['local', 'spotify', 'soundcloud']),
  }),
  palette: paletteSchema,
  links: z.array(platformLinkSchema),
  metrics: z.array(
    z.object({
      platform: z.string().min(1),
      kind: z.enum(['plays', 'popularity']),
      value: z.number().int().nonnegative(),
      asOf: z.iso.datetime(),
    }),
  ),
  provenance: z.array(
    z.object({
      source: z.enum(['local', 'spotify', 'soundcloud']),
      sourceId: z.string(),
      fetchedAt: z.iso.datetime().nullable(),
    }),
  ),
});

export const presaveSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  releaseId: z.string(),
  title: z.string().min(1),
  artistId: z.string(),
  copy: z.string().min(1),
  artwork: imageSchema,
  palette: paletteSchema,
  status: z.enum(['coming-soon', 'active', 'released']),
  smartlinkUrl: httpUrl.nullable(),
  downloadUrl: httpUrl.nullable(),
});

export const radioTrackSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  label: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  artist: z.string().min(1),
  album: z.string().min(1),
  title: z.string().min(1),
  audioFilename: z.string().min(1),
  artwork: imageSchema,
  durationMs: z.number().int().positive(),
  explicit: z.boolean(),
  credits: z.string().min(1),
  enabled: z.boolean(),
  order: z.number().int().nonnegative(),
});

export const artistsSchema = z.array(artistSchema).min(1);
export const generatedReleasesSchema = z.array(generatedReleaseSchema);
export const presavesSchema = z.array(presaveSchema);
export const radioTracksSchema = z.array(radioTrackSchema);

export type Artist = z.infer<typeof artistSchema>;
export type GeneratedRelease = z.infer<typeof generatedReleaseSchema>;
export type Presave = z.infer<typeof presaveSchema>;
export type RadioTrack = z.infer<typeof radioTrackSchema>;
export type Palette = z.infer<typeof paletteSchema>;
