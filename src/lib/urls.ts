function envValue(name: 'BASE_URL' | 'SITE'): string {
  const env = (import.meta as { env?: { BASE_URL?: string; SITE?: string } }).env;
  const value = env?.[name];
  return typeof value === 'string' ? value : '';
}

export function joinBase(base: string, path: string): string {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) return path;
  const prefix = !base || base === '/' ? '/' : base.endsWith('/') ? base : `${base}/`;
  if (!path || path === '/') return prefix;
  return `${prefix}${path.replace(/^\/+/, '')}`;
}

export function withBase(path: string): string {
  return joinBase(envValue('BASE_URL') || '/', path);
}

export function pageHref(path = ''): string {
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!clean) return joinBase(envValue('BASE_URL') || '/', '/');
  return joinBase(envValue('BASE_URL') || '/', `${clean}/`);
}

export function absoluteUrl(path: string): string {
  const origin = envValue('SITE').replace(/\/$/, '');
  const joined = joinBase(envValue('BASE_URL') || '/', path);
  return origin ? `${origin}${joined}` : joined;
}

export function absoluteFromPathname(pathname: string): string {
  const origin = envValue('SITE').replace(/\/$/, '');
  const path = pathname.startsWith('/') ? pathname : `/${pathname}`;
  return origin ? `${origin}${path}` : path;
}

export function isCurrentPath(pathname: string, href: string): boolean {
  const normalize = (value: string) => (value.endsWith('/') ? value : `${value}/`);
  return normalize(pathname) === normalize(href);
}
