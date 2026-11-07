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
