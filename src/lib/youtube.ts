const HOSTS = new Set(['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com']);

export function youtubeId(input: string): string | null {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return null;
  }
  const host = url.hostname.replace(/^www\./, '').toLowerCase();
  if (!HOSTS.has(host)) return null;
  let id = '';
  if (host === 'youtu.be') {
    id = url.pathname.split('/').filter(Boolean)[0] ?? '';
  } else if (url.pathname === '/watch') {
    id = url.searchParams.get('v') ?? '';
  } else {
    const match = url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/);
    id = match?.[1] ?? '';
  }
  if (!/^[\w-]{6,}$/.test(id)) return null;
  return id;
}

export function youtubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

/**
 * Blank stays blank. A recognized YouTube URL, including Shorts, youtu.be,
 * and links without a scheme, becomes a standard watch URL. Anything else is null.
 */
export function canonicalYoutubeUrl(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return '';
  const candidates = [trimmed];
  if (!/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    candidates.push(`https://${trimmed.replace(/^\/+/, '')}`);
  }
  for (const candidate of candidates) {
    const id = youtubeId(candidate);
    if (id) return `https://www.youtube.com/watch?v=${id}`;
  }
  return null;
}
