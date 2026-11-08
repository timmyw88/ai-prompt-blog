import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseFrontmatter } from '@astrojs/internal-helpers/frontmatter';
import matter from 'gray-matter';
import { postSchema } from '../src/lib/post-schema.ts';
import {
  buildPostFile,
  formatLocalDate,
  isCalendarDate,
  parsePostMarkdown,
  previewPlainText,
  safeMarkdownBasename,
  slugFromTitle,
  type PostInput,
} from '../src/lib/post-markdown.ts';
import { youtubeId } from '../src/lib/youtube.ts';

const base = (): PostInput => ({
  title: 'A cup',
  summary: 'One sentence.',
  date: '2026-11-08',
  updated: '',
  tool: 'ChatGPT',
  model: '',
  category: 'image',
  tags: [],
  draft: true,
  cover: '',
  coverAlt: '',
  videoUrl: '',
  steps: [],
  positivePrompt: '',
  negativePrompt: '',
  settings: [],
  tips: [],
  results: [],
  notes: '',
});

function load(markdown: string) {
  const astroParsed = parseFrontmatter(markdown);
  const grayParsed = matter(markdown);
  const astro = postSchema.safeParse(astroParsed.frontmatter);
  const gray = postSchema.safeParse(grayParsed.data);
  assert.equal(astro.success, true, JSON.stringify(astro.error?.issues ?? []));
  assert.equal(gray.success, true, JSON.stringify(gray.error?.issues ?? []));
  if (!astro.success || !gray.success) throw new Error('schema failed');
  return { astro: astro.data, gray: gray.data, astroBody: astroParsed.content, grayBody: grayParsed.content };
}

test('local dates use the computer calendar, not UTC shifting', () => {
  assert.equal(formatLocalDate(new Date(2026, 10, 8)), '2026-11-08');
  assert.equal(formatLocalDate(new Date(2026, 0, 1, 0, 30)), '2026-01-01');
  assert.equal(isCalendarDate('2024-02-29'), true);
  assert.equal(isCalendarDate('2026-02-29'), false);
  assert.equal(isCalendarDate('2026-11-31'), false);
  assert.equal(isCalendarDate('2026-13-01'), false);
  assert.equal(isCalendarDate('11/08/2026'), false);
});

test('file names stay a single safe markdown basename', () => {
  assert.equal(slugFromTitle('Create a 2027 Vision Board!'), 'create-a-2027-vision-board');
  assert.equal(slugFromTitle('Café naïve'), 'cafe-naive');
  assert.equal(
    slugFromTitle('Window light: "café" <script>alert(1)</script>'),
    'window-light-cafe-script-alert-1-script',
  );
  assert.equal(slugFromTitle('日本語'), 'tutorial');
  assert.equal(slugFromTitle(''), 'tutorial');
  assert.equal(safeMarkdownBasename('../secret.md'), 'secret.md');
  assert.equal(safeMarkdownBasename('folder\\my file.md'), 'my-file.md');
  assert.equal(safeMarkdownBasename('2027-Vision-Board.md'), '2027-Vision-Board.md');
  assert.equal(safeMarkdownBasename('CON.md'), 'tutorial.md');
  assert.equal(safeMarkdownBasename('---'), 'tutorial.md');
  assert.equal(safeMarkdownBasename('.md'), 'tutorial.md');
});

test('blank optional fields still make a valid draft file', () => {
  const input = base();
  input.title = 'Hello: "world" # café';
  input.summary = 'A line with: a colon and # hash.';
  input.steps = [{ title: '  ', body: '' }];
  input.negativePrompt = '   \r\n';
  input.tips = [' ', ''];
  input.results = [{ src: '', alt: '', caption: '', kind: 'image' }];
  const built = buildPostFile(input, 'Hello World');
  assert.deepEqual(built.errors, []);
  assert.equal(built.filename, 'Hello-World.md');
  assert.match(built.markdown, /draft: true/);
  assert.match(built.markdown, /example: false/);
  assert.doesNotMatch(built.markdown, /Write extra notes under this line/);
  const loaded = load(built.markdown);
  assert.equal(loaded.astro.draft, true);
  assert.equal(loaded.astro.example, false);
  assert.equal(loaded.astro.updated, undefined);
  assert.equal(loaded.astro.model, undefined);
  assert.equal(loaded.astro.cover, undefined);
  assert.equal(loaded.astro.videoUrl, undefined);
  assert.equal(loaded.astro.positivePrompt, undefined);
  assert.equal(loaded.astro.negativePrompt, undefined);
  assert.deepEqual(loaded.astro.steps, []);
  assert.deepEqual(loaded.astro.results, []);
  assert.equal(loaded.astro.title, 'Hello: "world" # café');
  assert.equal(loaded.astroBody.trim(), '');
  assert.equal(JSON.stringify(loaded.astro.tags), JSON.stringify(loaded.gray.tags));
});

test('invalid dates, media, and a partial step are refused', () => {
  const badDate = buildPostFile({ ...base(), date: '2026-02-29' }, 'post');
  assert.ok(badDate.errors.some((error) => error.includes('YYYY-MM-DD')));
  assert.equal(badDate.markdown, '');
  const badUpdated = buildPostFile({ ...base(), updated: '2026-11-31' }, 'post');
  assert.ok(badUpdated.errors.some((error) => error.includes('updated')));
  const cover = buildPostFile({ ...base(), cover: '/media/cover.png' }, 'post');
  assert.ok(cover.errors.some((error) => error.includes('Describe the cover')));
  const remote = buildPostFile(
    { ...base(), cover: 'https://example.com/a.png', coverAlt: 'Remote' },
    'post',
  );
  assert.ok(remote.errors.some((error) => error.includes('/media/')));
  const step = buildPostFile({ ...base(), steps: [{ title: 'Only a title', body: '' }] }, 'post');
  assert.ok(step.errors.some((error) => error.startsWith('Step 1')));
  const video = buildPostFile({ ...base(), videoUrl: 'https://vimeo.com/1' }, 'post');
  assert.ok(video.errors.some((error) => error.includes('YouTube')));
  const published = buildPostFile({ ...base(), draft: false }, 'post');
  assert.deepEqual(published.errors, []);
  assert.match(published.markdown, /draft: false/);
  assert.equal(load(published.markdown).astro.draft, false);
});

test('the calendar prompt and hostile YAML characters round-trip', () => {
  const original = postSchema.parse(matter(readFileSync('content/posts/my-first-tutorial.md', 'utf8')).data);
  const edge = [
    original.positivePrompt ?? '',
    '',
    '---',
    '+++',
    '```',
    '```js',
    'key: "value" # hash',
    'emoji café naïve 日本語 🎨',
    '  indented',
    'trailing spaces   ',
    "quotes 'single' and \"double\"",
    'tab\tinside',
    'back\\slash',
  ].join('\n');
  const input: PostInput = {
    title: 'Post builder schema fixture: "quotes" # hash café',
    summary: 'Summary with: colon, "quotes", and a # hash.',
    date: '2026-11-07',
    updated: '2026-11-08',
    tool: 'ChatGPT: images',
    model: 'Model: "name" #1',
    category: 'image',
    tags: ['calendar', '#hash', 'café'],
    draft: true,
    cover: '/media/2027-Calendar.png',
    coverAlt: 'Alt: "quoted" #1',
    videoUrl: 'https://youtube.com/shorts/PmcIMtN8-eI?feature=share',
    steps: [
      { title: 'Upload: your "photo"', body: 'Open ChatGPT.\nThen paste.\n---\n```' },
      { title: '', body: '' },
    ],
    positivePrompt: edge.replace(/\n/g, '\r\n'),
    negativePrompt: 'avoid: blur\n\n---\n```\n# not a comment',
    settings: [
      { label: 'Steps: count', value: '30' },
      { label: 'Flag', value: 'true' },
    ],
    tips: ['Check: dates # carefully', 'Keep the face.'],
    results: [
      {
        src: '/media/2027-Calendar.png',
        alt: 'Describe: the "picture"',
        caption: 'Optional: caption',
        kind: 'image',
      },
      { src: '/media/clip.mp4', alt: 'What moves', caption: '', kind: 'video' },
    ],
    notes: 'Notes with <script>alert(1)</script>\n\n---\nnot frontmatter\n\n```text\nanother prompt\n```',
  };
  const built = buildPostFile(input, '../etc/post-builder-roundtrip.md');
  assert.deepEqual(built.errors, []);
  assert.equal(built.filename, 'post-builder-roundtrip.md');
  assert.equal(built.videoUrl, 'https://www.youtube.com/watch?v=PmcIMtN8-eI');
  const windows = built.markdown.replace(/\n/g, '\r\n');
  for (const source of [built.markdown, windows]) {
    const loaded = load(source);
    assert.equal(loaded.astro.positivePrompt, edge);
    assert.equal(loaded.gray.positivePrompt, edge);
    assert.equal(loaded.astro.negativePrompt, 'avoid: blur\n\n---\n```\n# not a comment');
    assert.equal(loaded.astro.title, input.title);
    assert.equal(loaded.astro.draft, true);
    assert.equal(loaded.astro.example, false);
    assert.equal(loaded.astro.settings[0].value, '30');
    assert.equal(loaded.astro.settings[1].value, 'true');
    assert.equal(loaded.astro.steps[0].body, 'Open ChatGPT.\nThen paste.\n---\n```');
    assert.equal(loaded.astro.results[1].kind, 'video');
    assert.equal(loaded.astro.videoUrl, 'https://www.youtube.com/watch?v=PmcIMtN8-eI');
    assert.equal(loaded.astro.date.toISOString().slice(0, 10), '2026-11-07');
    assert.equal(loaded.astro.updated?.toISOString().slice(0, 10), '2026-11-08');
    assert.match(loaded.astroBody, /<script>alert\(1\)<\/script>/);
    assert.match(loaded.grayBody, /not frontmatter/);
    assert.equal(JSON.stringify(loaded.astro.steps), JSON.stringify(loaded.gray.steps));
  }
  const again = parsePostMarkdown(built.markdown);
  assert.equal(again.ok, true);
  if (again.ok) {
    const rebuilt = buildPostFile(again.input, built.filename);
    assert.deepEqual(rebuilt.errors, []);
    assert.equal(load(rebuilt.markdown).astro.positivePrompt, edge);
  }
  const preview = previewPlainText(input);
  assert.match(preview, /<script>alert\(1\)<\/script>/);
  assert.match(preview, /Draft: hidden until you set draft to false/);
  const listed = previewPlainText({ ...input, draft: false });
  assert.match(listed, /This page does not publish it/);
});

test('existing tutorials and the template import without dropping prompts', () => {
  for (const path of [
    'content/posts/my-first-tutorial.md',
    'content/posts/2027-Vision-Board.md',
    'templates/new-post.md',
  ]) {
    const raw = readFileSync(path, 'utf8');
    const original = postSchema.parse(matter(raw).data);
    const parsed = parsePostMarkdown(raw);
    assert.equal(parsed.ok, true, path);
    if (!parsed.ok) continue;
    assert.equal(parsed.input.positivePrompt.trim(), (original.positivePrompt ?? '').trim());
    const built = buildPostFile(
      { ...parsed.input, videoUrl: parsed.input.videoUrl },
      path.split('/').pop() ?? 'post.md',
    );
    assert.deepEqual(built.errors, [], `${path} ${built.errors.join('; ')}`);
    const loaded = load(built.markdown);
    assert.equal(loaded.astro.positivePrompt, original.positivePrompt);
    assert.equal(loaded.astro.title, original.title);
    assert.equal(loaded.astro.example, false);
    if (original.videoUrl) assert.equal(youtubeId(loaded.astro.videoUrl ?? ''), youtubeId(original.videoUrl));
  }
});

test('a control character in a prompt is quoted instead of breaking the block', () => {
  const built = buildPostFile({ ...base(), positivePrompt: 'keep\u0001this' }, 'post');
  assert.deepEqual(built.errors, []);
  assert.equal(load(built.markdown).astro.positivePrompt, 'keep\u0001this');
});
