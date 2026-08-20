const base = import.meta.env.BASE_URL.replace(/\/$/, '');

export function withBase(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  if (!path.startsWith('/')) return path;
  return `${base}${path}` || '/';
}
