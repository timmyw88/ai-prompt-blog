import { readFileSync } from 'node:fs';
import { defineConfig } from 'astro/config';
import { satteri } from '@astrojs/markdown-satteri';
import { createSanitizePlugin } from './src/lib/sanitize-markdown.ts';

const file = JSON.parse(readFileSync(new URL('./site.config.json', import.meta.url), 'utf8'));

function origin(value) {
  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('The site URL must start with https://');
  }
  return url.origin;
}

const base = normalizeBase(process.env.BASE_PATH || file.base || '/');

function normalizeBase(input) {
  if (input == null || input === '' || input === '/') return '/';
  let base = String(input).trim();
  if (!base.startsWith('/')) base = `/${base}`;
  if (base.endsWith('/')) base = base.slice(0, -1);
  return !base || base === '/' ? '/' : base;
}

export default defineConfig({
  site: origin(process.env.SITE || file.site),
  base: normalizeBase(process.env.BASE_PATH || file.base || '/'),
  trailingSlash: 'always',
  // Keep prompt line breaks intact. The default JSX whitespace rules collapse them.
  compressHTML: false,
  server: {
    host: '127.0.0.1',
    port: 4731,
  },
  vite: {
    ssr: {
      external: ['satteri'],
    },
  },
  markdown: {
    syntaxHighlight: false,
    processor: satteri({
      features: { gfm: true, smartPunctuation: false },
      hastPlugins: [createSanitizePlugin(base)],
    }),
  },
});
