export function isSitePath(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('/')) return false;
  if (value.startsWith('//')) return false;
  if (value.includes('\\') || value.includes('..')) return false;
  if (/[\u0000-\u001F\s]/.test(value)) return false;
  return true;
}

export function isSafeLink(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || /[\u0000-\u001F\u007F]/.test(trimmed)) return false;
  if (trimmed.startsWith('//') || trimmed.includes('\\')) return false;
  if (
    trimmed.startsWith('#') ||
    trimmed.startsWith('/') ||
    trimmed.startsWith('./') ||
    trimmed.startsWith('../')
  ) {
    return !/javascript:/i.test(trimmed);
  }
  try {
    const url = new URL(trimmed);
    if (url.username || url.password) return false;
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch {
    return false;
  }
}

export function isRasterPath(path: string): boolean {
  return /\.(png|jpe?g|gif|webp|avif)$/i.test(path);
}
