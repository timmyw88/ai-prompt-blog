import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import matter from 'gray-matter';

const base = process.argv[2] === '--base' ? process.argv[3] : '/';
if (!base?.startsWith('/')) {
  console.error('Usage: node scripts/verify-dist.mjs --base /');
  process.exit(1);
}

const root = 'dist';
const failures = [];

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) files.push(...walk(path));
    else files.push(path);
  }
  return files;
}

function fail(message) {
  failures.push(message);
}

function decode(html) {
  return html
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"');
}

function stripTrailingNewline(value) {
  return value.endsWith('\n') ? value.slice(0, -1) : value;
}

function prefixed(path) {
  const clean = String(path).replace(/^\/+/, '');
  const prefix = !base || base === '/' ? '/' : base.endsWith('/') ? base : `${base}/`;
  return `${prefix}${clean}`.replace(/\/{2,}/g, '/');
}

function youtubeIdFromUrl(input) {
  try {
    const url = new URL(String(input).trim());
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (!['youtube.com', 'm.youtube.com', 'youtu.be', 'youtube-nocookie.com'].includes(host)) return '';
    if (host === 'youtu.be') return url.pathname.split('/').filter(Boolean)[0] ?? '';
    if (url.pathname === '/watch') return url.searchParams.get('v') ?? '';
    return url.pathname.match(/^\/(?:embed|shorts|live)\/([^/?#]+)/)?.[1] ?? '';
  } catch {
    return '';
  }
}

function loadPosts() {
  return readdirSync('content/posts')
    .filter((name) => name.endsWith('.md'))
    .map((name) => {
      const parsed = matter(readFileSync(join('content/posts', name), 'utf8'));
      return { id: name.replace(/\.md$/, ''), data: parsed.data ?? {}, body: parsed.content ?? '' };
    });
}

const files = walk(root);
const htmlFiles = files.filter((file) => file.endsWith('.html'));
const html = htmlFiles.map((file) => readFileSync(file, 'utf8')).join('\n');
const config = JSON.parse(readFileSync('site.config.json', 'utf8'));
const banned = [
  'googlesyndication',
  'google-analytics',
  'googletagmanager',
  'doubleclick.net',
  'facebook.com/tr',
  'ca-pub-',
  'adsbygoogle',
];
const shippedDemo = [
  '/media/examples/',
  'aqz-KE-bpKQ',
  'Big Buck Bunny',
  'Template archive',
  'labelled examples',
  'Sample content shipped with the template',
  'not a lesson from the site owner',
  'not lessons from the site owner',
  'Edit this page before you publish',
];

for (const term of banned) {
  if (html.toLowerCase().includes(term.toLowerCase())) fail(`found ${term}`);
}
for (const term of shippedDemo) {
  if (html.includes(term)) fail(`shipped demo content still published: ${term}`);
}
if (/<\w[^>]*\son(?:error|load|click)\s*=/i.test(html)) fail('found an inline event handler');
if (/\s(?:href|src)\s*=\s*["']\s*javascript:/i.test(html)) fail('found a javascript URL');
if (/<script(?![^>]*type\s*=\s*["'](?:module|application\/(?:ld\+)?json)["'])/i.test(html)) {
  fail('found an unexpected script tag');
}
if (!config.ads.enabled && html.includes('Ad slot is on')) fail('ad placeholder rendered while ads are off');

for (const name of ['index.html', '404.html', 'sitemap.xml', 'rss.xml', 'robots.txt', 'search-index.json']) {
  if (!existsSync(join(root, name))) fail(`missing ${name}`);
}

const index = readFileSync(join(root, 'index.html'), 'utf8');
const guideHref = `${base}guide/`.replace(/\/{2,}/g, '/');
if (!index.includes(`href="${guideHref}"`) && !index.includes(`href="${base === '/' ? '/guide/' : guideHref}"`)) {
  fail(`index is missing the guide link for base ${base}`);
}
if (base === '/' && index.includes('/ai-prompt-blog/')) fail('default build contains a project base path');
if (base !== '/' && !index.includes(base)) fail(`index is missing base ${base}`);
if (base !== '/' && html.includes('src="/media/')) fail('a root media path skipped the project base');

const search = JSON.parse(readFileSync(join(root, 'search-index.json'), 'utf8'));
if (!Array.isArray(search)) fail('search index is not an array');
const searchIds = new Set(search.map((item) => item?.id));

const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const origin = 'https://example.github.io';
if (!sitemap.includes(`${origin}${base === '/' ? '/' : base}`)) fail('sitemap origin or base is wrong');

const posts = loadPosts();
if (!posts.some((post) => post.data.draft !== true)) fail('expected at least one published tutorial');

for (const post of posts) {
  const pagePath = join(root, 'posts', post.id, 'index.html');
  const published = post.data.draft !== true;
  if (!published) {
    if (existsSync(pagePath)) fail(`draft tutorial was published: ${post.id}`);
    if (searchIds.has(post.id)) fail(`draft leaked into search index: ${post.id}`);
    if (html.includes(`/posts/${post.id}/`)) fail(`draft tutorial was linked: ${post.id}`);
    continue;
  }

  if (!existsSync(pagePath)) {
    fail(`missing published tutorial ${post.id}`);
    continue;
  }
  if (!searchIds.has(post.id)) fail(`${post.id} is missing from the search index`);

  const page = readFileSync(pagePath, 'utf8');
  const positive = typeof post.data.positivePrompt === 'string' ? post.data.positivePrompt.replace(/\r\n/g, '\n') : '';
  if (positive.trim()) {
    const match = page.match(/<code[^>]*id="positive-prompt"[^>]*>([\s\S]*?)<\/code>/);
    if (!match) fail(`${post.id}: positive prompt code block missing`);
    else {
      const rendered = stripTrailingNewline(decode(match[1]));
      const expected = stripTrailingNewline(positive);
      if (rendered !== expected) fail(`${post.id}: prompt formatting was not preserved`);
    }
    if (!page.includes('data-copy-for="positive-prompt"')) fail(`${post.id}: positive prompt has no copy button`);
  }

  const negative = typeof post.data.negativePrompt === 'string' ? post.data.negativePrompt : '';
  if (negative.trim() && !page.includes('data-copy-for="negative-prompt"')) {
    fail(`${post.id}: negative prompt has no copy button`);
  }

  const media = [];
  if (typeof post.data.cover === 'string' && post.data.cover.startsWith('/')) media.push(post.data.cover);
  if (Array.isArray(post.data.results)) {
    for (const result of post.data.results) {
      if (result && typeof result.src === 'string' && result.src.startsWith('/')) media.push(result.src);
    }
  }
  for (const match of post.body.matchAll(/\]\((\/media\/[^)\s]+)\)/g)) media.push(match[1]);
  for (const path of media) {
    const expected = prefixed(path);
    if (!page.includes(expected)) fail(`${post.id}: media ${path} was not prefixed with ${base}`);
    if (post.data.cover === path && !index.includes(expected)) {
      fail(`archive thumbnail missing ${expected}`);
    }
  }

  const videoUrl = typeof post.data.videoUrl === 'string' ? post.data.videoUrl.trim() : '';
  if (videoUrl) {
    const id = youtubeIdFromUrl(videoUrl);
    if (!id) fail(`${post.id}: could not read a YouTube id from videoUrl`);
    else if (!page.includes(`https://www.youtube-nocookie.com/embed/${id}`)) {
      fail(`${post.id}: video is not a nocookie embed`);
    }
    if (page.includes('youtube.com/embed')) fail(`${post.id}: video uses the tracking embed host`);
  }
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Verified dist for base ${base}`);
