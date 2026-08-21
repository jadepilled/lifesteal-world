import releases from '../../../src/data/generated/releases.json';

interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  SOUNDCLOUD_CLIENT_ID?: string;
  SOUNDCLOUD_CLIENT_SECRET?: string;
  SPOTIFY_CLIENT_ID?: string;
  SPOTIFY_CLIENT_SECRET?: string;
}

type PlatformLink = {
  platform: string;
  url: string;
  platformId?: string;
};

type ReleaseRecord = {
  canonicalId: string;
  links: PlatformLink[];
  metrics: Array<{ platform: string; kind: string; value: number; asOf: string }>;
};

type Metric = {
  canonicalId: string;
  platform: string;
  kind: 'plays' | 'popularity';
  value: number;
  asOf: string;
};

const catalogue = releases as ReleaseRecord[];
const consentVersion = 'mailing-list-v1-2026-08-21';

const json = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...init.headers,
    },
  });

const allowedOrigin = (request: Request, env: Env) => {
  const origin = request.headers.get('Origin');
  if (!origin) return null;
  const allowed = env.ALLOWED_ORIGINS.split(',').map((item) => item.trim());
  return allowed.includes(origin) ? origin : null;
};

const withCors = (response: Response, request: Request, env: Env) => {
  const origin = allowedOrigin(request, env);
  if (!origin) return response;
  const headers = new Headers(response.headers);
  headers.set('Access-Control-Allow-Origin', origin);
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  headers.set('Access-Control-Allow-Headers', 'Content-Type');
  headers.set('Vary', 'Origin');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

const digest = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(hash)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
};

const validEmail = (value: string) =>
  value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/u.test(value);

const checkRateLimit = async (request: Request, env: Env) => {
  const now = new Date();
  const expiry = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
  const address = request.headers.get('CF-Connecting-IP') ?? 'local';
  const key = await digest(`${now.toISOString().slice(0, 10)}:${address}`);
  await env.DB.prepare('DELETE FROM rate_limits WHERE expires_at < ?')
    .bind(now.toISOString())
    .run();
  const current = await env.DB.prepare('SELECT attempts FROM rate_limits WHERE key = ?')
    .bind(key)
    .first<{ attempts: number }>();
  if ((current?.attempts ?? 0) >= 5) return false;
  await env.DB.prepare(
    `INSERT INTO rate_limits (key, attempts, expires_at) VALUES (?, 1, ?)
     ON CONFLICT(key) DO UPDATE SET attempts = attempts + 1`,
  )
    .bind(key, expiry)
    .run();
  return true;
};

const subscribe = async (request: Request, env: Env) => {
  if (!allowedOrigin(request, env))
    return json({ ok: false, error: 'Origin not allowed' }, { status: 403 });
  if (!(await checkRateLimit(request, env))) {
    return json({ ok: false, error: 'Please try again later' }, { status: 429 });
  }

  let payload: { email?: unknown; company?: unknown; source?: unknown; page?: unknown };
  try {
    payload = await request.json();
  } catch {
    return json({ ok: false, error: 'Invalid request' }, { status: 400 });
  }
  if (typeof payload.company === 'string' && payload.company.trim()) {
    return json({ ok: true }, { status: 202 });
  }

  const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  if (!validEmail(email))
    return json({ ok: false, error: 'Enter a valid email address' }, { status: 400 });
  const source = typeof payload.source === 'string' ? payload.source.slice(0, 80) : 'website';
  const page = typeof payload.page === 'string' ? payload.page.slice(0, 500) : null;
  const now = new Date().toISOString();
  const id = crypto.randomUUID();
  const signature = `LST-${Date.now().toString(36).toUpperCase()}-${id.slice(0, 8).toUpperCase()}`;
  const unsubscribeToken =
    crypto.randomUUID().replaceAll('-', '') + crypto.randomUUID().replaceAll('-', '');
  const emailHash = await digest(email);

  await env.DB.prepare(
    `INSERT INTO subscribers
      (id, email, email_hash, signature, unsubscribe_token, status, source, page, consent_version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'subscribed', ?, ?, ?, ?, ?)
     ON CONFLICT(email) DO UPDATE SET
       status = 'subscribed', source = excluded.source, page = excluded.page,
       consent_version = excluded.consent_version, updated_at = excluded.updated_at`,
  )
    .bind(id, email, emailHash, signature, unsubscribeToken, source, page, consentVersion, now, now)
    .run();

  const stored = await env.DB.prepare('SELECT signature FROM subscribers WHERE email = ?')
    .bind(email)
    .first<{ signature: string }>();
  return json({ ok: true, signature: stored?.signature ?? signature }, { status: 201 });
};

const unsubscribe = async (request: Request, env: Env) => {
  const token = new URL(request.url).searchParams.get('token');
  if (!token || !/^[a-f0-9]{64}$/i.test(token)) {
    return new Response('Invalid unsubscribe link.', { status: 400 });
  }
  const result = await env.DB.prepare(
    `UPDATE subscribers SET status = 'unsubscribed', updated_at = ? WHERE unsubscribe_token = ?`,
  )
    .bind(new Date().toISOString(), token)
    .run();
  return new Response(
    result.meta.changes ? 'You have been unsubscribed.' : 'This link is no longer active.',
    {
      status: result.meta.changes ? 200 : 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    },
  );
};

const getClientToken = async (provider: 'soundcloud' | 'spotify', id?: string, secret?: string) => {
  if (!id || !secret) return null;
  const endpoint =
    provider === 'soundcloud'
      ? 'https://secure.soundcloud.com/oauth/token'
      : 'https://accounts.spotify.com/api/token';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!response.ok) return null;
  const body = (await response.json()) as { access_token?: string };
  return body.access_token ?? null;
};

const findPlaybackCount = (value: unknown, expectedId: string): number | null => {
  if (!value || typeof value !== 'object') return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPlaybackCount(item, expectedId);
      if (found !== null) return found;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  if (String(record.id) === expectedId && typeof record.playback_count === 'number') {
    return record.playback_count;
  }
  for (const child of Object.values(record)) {
    const found = findPlaybackCount(child, expectedId);
    if (found !== null) return found;
  }
  return null;
};

const soundcloudCount = async (link: PlatformLink, token: string | null) => {
  if (!link.platformId) return null;
  if (token) {
    const response = await fetch(
      `https://api.soundcloud.com/tracks/${encodeURIComponent(link.platformId)}`,
      {
        headers: { Authorization: `OAuth ${token}`, Accept: 'application/json' },
      },
    );
    if (response.ok) {
      const track = (await response.json()) as { playback_count?: number };
      if (typeof track.playback_count === 'number') return track.playback_count;
    }
  }

  // Public hydration is a last-known-count fallback if an API credential expires. It keeps
  // the display useful without ever treating page text as a different metric.
  const page = await fetch(link.url, { headers: { 'User-Agent': 'LIFESTEAL-metrics/1.0' } });
  if (!page.ok) return null;
  const html = await page.text();
  const hydration = html.match(/window\.__sc_hydration\s*=\s*(\[.*?\]);\s*<\/script>/s)?.[1];
  if (hydration) {
    try {
      return findPlaybackCount(JSON.parse(hydration), link.platformId);
    } catch {
      // Fall through to the narrow ID/count match below.
    }
  }
  const idIndex = html.indexOf(`\"id\":${link.platformId}`);
  if (idIndex < 0) return null;
  const window = html.slice(Math.max(0, idIndex - 2500), idIndex + 2500);
  const match = window.match(/\"playback_count\":(\d+)/);
  return match ? Number(match[1]) : null;
};

const upsertMetric = (env: Env, metric: Metric, sourceUrl: string) =>
  env.DB.prepare(
    `INSERT INTO platform_metrics (canonical_id, platform, kind, value, captured_at, source_url)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(canonical_id, platform, kind) DO UPDATE SET
       value = excluded.value, captured_at = excluded.captured_at, source_url = excluded.source_url`,
  )
    .bind(metric.canonicalId, metric.platform, metric.kind, metric.value, metric.asOf, sourceUrl)
    .run();

const refreshMetrics = async (env: Env) => {
  const capturedAt = new Date().toISOString();
  const soundcloudToken = await getClientToken(
    'soundcloud',
    env.SOUNDCLOUD_CLIENT_ID,
    env.SOUNDCLOUD_CLIENT_SECRET,
  );
  const soundcloudJobs = catalogue.flatMap((release) =>
    release.links
      .filter((link) => link.platform === 'soundcloud' && link.platformId)
      .map(async (link) => {
        const value = await soundcloudCount(link, soundcloudToken);
        if (value === null) return false;
        await upsertMetric(
          env,
          {
            canonicalId: release.canonicalId,
            platform: 'soundcloud',
            kind: 'plays',
            value,
            asOf: capturedAt,
          },
          link.url,
        );
        return true;
      }),
  );
  const settled = await Promise.allSettled(soundcloudJobs);

  const spotifyToken = await getClientToken(
    'spotify',
    env.SPOTIFY_CLIENT_ID,
    env.SPOTIFY_CLIENT_SECRET,
  );
  const spotifyLinks = catalogue.flatMap((release) =>
    release.links
      .filter((link) => link.platform === 'spotify' && link.platformId)
      .map((link) => ({ release, link })),
  );
  if (spotifyToken && spotifyLinks.length) {
    const ids = spotifyLinks
      .map(({ link }) => link.platformId)
      .filter(Boolean)
      .join(',');
    const response = await fetch(
      `https://api.spotify.com/v1/tracks?ids=${encodeURIComponent(ids)}`,
      {
        headers: { Authorization: `Bearer ${spotifyToken}` },
      },
    );
    if (response.ok) {
      const payload = (await response.json()) as {
        tracks?: Array<{ id: string; popularity?: number }>;
      };
      for (const track of payload.tracks ?? []) {
        const source = spotifyLinks.find(({ link }) => link.platformId === track.id);
        if (!source || typeof track.popularity !== 'number') continue;
        await upsertMetric(
          env,
          {
            canonicalId: source.release.canonicalId,
            platform: 'spotify',
            kind: 'popularity',
            value: track.popularity,
            asOf: capturedAt,
          },
          source.link.url,
        );
      }
    }
  }
  return settled.filter((result) => result.status === 'fulfilled' && result.value).length;
};

const metrics = async (env: Env) => {
  const result = await env.DB.prepare(
    `SELECT canonical_id AS canonicalId, platform, kind, value, captured_at AS asOf
     FROM platform_metrics ORDER BY canonical_id, platform`,
  ).all<Metric>();
  return json(
    { metrics: result.results, updatedAt: new Date().toISOString() },
    { headers: { 'Cache-Control': 'public, max-age=300, s-maxage=900' } },
  );
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS') {
      return withCors(new Response(null, { status: 204 }), request, env);
    }
    let response: Response;
    if (request.method === 'GET' && url.pathname === '/health') {
      response = json({ ok: true, service: 'lifesteal-signal-api' });
    } else if (request.method === 'GET' && url.pathname === '/metrics') {
      response = await metrics(env);
    } else if (request.method === 'POST' && url.pathname === '/subscribe') {
      response = await subscribe(request, env);
    } else if (request.method === 'GET' && url.pathname === '/unsubscribe') {
      response = await unsubscribe(request, env);
    } else {
      response = json({ ok: false, error: 'Not found' }, { status: 404 });
    }
    return withCors(response, request, env);
  },

  async scheduled(_controller: ScheduledController, env: Env, context: ExecutionContext) {
    context.waitUntil(refreshMetrics(env));
  },
} satisfies ExportedHandler<Env>;
