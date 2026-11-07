import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

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

for (const term of banned) {
  if (html.toLowerCase().includes(term.toLowerCase())) fail(`found ${term}`);
}
if (/<\w[^>]*\son(?:error|load|click)\s*=/i.test(html)) fail('found an inline event handler');
if (/\s(?:href|src)\s*=\s*["']\s*javascript:/i.test(html)) fail('found a javascript URL');
if (/<script(?![^>]*type\s*=\s*["'](?:module|application\/(?:ld\+)?json)["'])/i.test(html)) {
  fail('found an unexpected script tag');
}
if (html.includes('Example draft: this file stays off the site')) fail('draft tutorial was published');
if (!config.ads.enabled && html.includes('Ad slot is on')) fail('ad placeholder rendered while ads are off');

for (const name of ['index.html', '404.html', 'sitemap.xml', 'rss.xml', 'robots.txt', 'search-index.json']) {
  if (!existsSync(join(root, name))) fail(`missing ${name}`);
}

const index = readFileSync(join(root, 'index.html'), 'utf8');
const guideHref = `${base}guide/`.replace(/\/{2,}/g, '/');
if (!index.includes(`href="${guideHref}"`) && !index.includes(`href="${base === '/' ? '/guide/' : guideHref}"`)) {
  fail(`index is missing the guide link for base ${base}`);
}
if (base === '/' && index.includes('/prompt-ledger/')) fail('default build contains a project base path');
if (base !== '/' && !index.includes(base)) fail(`index is missing base ${base}`);

const search = JSON.parse(readFileSync(join(root, 'search-index.json'), 'utf8'));
if (!Array.isArray(search)) fail('search index is not an array');
if (JSON.stringify(search).includes('Example draft:')) fail('draft leaked into search index');

const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
const origin = 'https://example.github.io';
if (!sitemap.includes(`${origin}${base === '/' ? '/' : base}`)) fail('sitemap origin or base is wrong');

const portraitPath = join(root, 'posts/example-window-light-portrait/index.html');
if (existsSync(portraitPath)) {
  const portrait = readFileSync(portraitPath, 'utf8');
  const match = portrait.match(/<code[^>]*id="positive-prompt"[^>]*>([\s\S]*?)<\/code>/);
  if (!match) fail('positive prompt code block missing');
  else {
    const text = decode(match[1]);
    if (!text.includes('tall window,\novercast daylight,')) {
      fail(`prompt formatting was not preserved:\n${JSON.stringify(text)}`);
    }
  }
  if (!portrait.includes('data-copy-for="positive-prompt"')) fail('positive prompt has no copy button');
  if (!portrait.includes('data-copy-for="negative-prompt"')) fail('negative prompt has no copy button');
  const expectedMedia = `${base}media/examples/portrait-result.svg`.replace(/\/{2,}/g, '/');
  if (!portrait.includes(expectedMedia)) fail(`result image was not prefixed with ${base}`);
  if (base !== '/' && portrait.includes('src="/media/')) fail('a root media path skipped the project base');
}

const videoPath = join(root, 'posts/example-ceramic-cup-move/index.html');
if (existsSync(videoPath)) {
  const video = readFileSync(videoPath, 'utf8');
  if (!video.includes('https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ')) {
    fail('sample video is not a nocookie embed');
  }
  if (video.includes('youtube.com/embed')) fail('sample video uses the tracking embed host');
}

if (failures.length) {
  console.error(failures.map((item) => `- ${item}`).join('\n'));
  process.exit(1);
}

console.log(`Verified dist for base ${base}`);
