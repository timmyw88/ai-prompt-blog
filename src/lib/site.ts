import raw from '../../site.config.json' with { type: 'json' };

export type SiteConfig = {
  title: string;
  tagline: string;
  description: string;
  author: string;
  locale: string;
  brandingNotice: boolean;
  site: string;
  base: string;
  social: {
    youtube: string;
    facebook: string;
    github: string;
  };
  ads: {
    enabled: boolean;
  };
};

function requiredString(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`site.config.json: "${key}" must be a non-empty string.`);
  }
  return value.trim();
}

function siteOrigin(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('site.config.json: "site" must be an https URL.');
  }
  if (url.protocol !== 'https:') {
    throw new Error('site.config.json: "site" must start with https://');
  }
  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(
      'site.config.json: "site" must be an origin such as https://example.github.io. Put a project path in "base", or let the GitHub Action set it.',
    );
  }
  return url.origin;
}

function optionalHttps(value: unknown, key: string): string {
  if (typeof value !== 'string' || value.trim() === '') return '';
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`site.config.json: social.${key} must be an https URL, or empty.`);
  }
  if (url.protocol !== 'https:') {
    throw new Error(`site.config.json: social.${key} must start with https://`);
  }
  return url.toString();
}

function parse(input: unknown): SiteConfig {
  if (!input || typeof input !== 'object') {
    throw new Error('site.config.json must be a JSON object.');
  }
  const source = input as Record<string, unknown>;
  const socialRaw =
    source.social && typeof source.social === 'object'
      ? (source.social as Record<string, unknown>)
      : {};
  const adsRaw =
    source.ads && typeof source.ads === 'object' ? (source.ads as Record<string, unknown>) : {};
  const enabled = adsRaw.enabled ?? false;
  if (typeof enabled !== 'boolean') {
    throw new Error('site.config.json: ads.enabled must be true or false.');
  }
  const brandingNotice = source.brandingNotice ?? true;
  if (typeof brandingNotice !== 'boolean') {
    throw new Error('site.config.json: brandingNotice must be true or false.');
  }
  const locale = requiredString(source, 'locale');
  if (!/^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/.test(locale)) {
    throw new Error('site.config.json: locale must look like en or en-US.');
  }
  const base = typeof source.base === 'string' && source.base.trim() ? source.base.trim() : '/';
  return {
    title: requiredString(source, 'title'),
    tagline: requiredString(source, 'tagline'),
    description: requiredString(source, 'description'),
    author: requiredString(source, 'author'),
    locale,
    brandingNotice,
    site: siteOrigin(requiredString(source, 'site')),
    base,
    social: {
      youtube: optionalHttps(socialRaw.youtube, 'youtube'),
      facebook: optionalHttps(socialRaw.facebook, 'facebook'),
      github: optionalHttps(socialRaw.github, 'github'),
    },
    ads: { enabled },
  };
}

export const site = parse(raw);

export function socialLinks(): Array<{ label: string; href: string }> {
  return [
    { label: 'YouTube', href: site.social.youtube },
    { label: 'Facebook', href: site.social.facebook },
    { label: 'GitHub', href: site.social.github },
  ].filter((link) => link.href);
}

export function monogram(title: string): string {
  const letters = title
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
  return letters || '•';
}
