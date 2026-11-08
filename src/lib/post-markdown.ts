import { parseDocument } from 'yaml';
import { isSitePath } from './paths.ts';
import { canonicalYoutubeUrl } from './youtube.ts';

export type ResultKind = 'image' | 'video';

export type PostInput = {
  title: string;
  summary: string;
  date: string;
  updated: string;
  tool: string;
  model: string;
  category: ResultKind;
  tags: string[];
  draft: boolean;
  cover: string;
  coverAlt: string;
  videoUrl: string;
  steps: Array<{ title: string; body: string }>;
  positivePrompt: string;
  negativePrompt: string;
  settings: Array<{ label: string; value: string }>;
  tips: string[];
  results: Array<{ src: string; alt: string; caption: string; kind: ResultKind }>;
  notes: string;
};

export type BuildResult = {
  errors: string[];
  markdown: string;
  filename: string;
  videoUrl: string;
  preview: string;
};

export type ParseResult =
  | { ok: true; input: PostInput; warnings: string[] }
  | { ok: false; error: string };

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|svg|avif)$/i;
const VIDEO_EXT = /\.(mp4|webm)$/i;
const RESERVED_BASENAME = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])$/i;

const HEADER_COMMENTS = [
  '# Copy this file into content/posts and rename it.',
  '# Use lowercase words and hyphens, then .md. Example: soft-window-portrait.md',
  '# Lines that start with # are notes. They are not shown on the site.',
  '# Leave draft as true until the tutorial is ready.',
  '# A public GitHub repository still shows this file to anyone, even when draft is true.',
  '# Do not put passwords, API keys, or private pictures in the file.',
];

export function normalizeNewlines(value: string): string {
  return value.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\u2028|\u2029/g, '\n');
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function safeMarkdownBasename(input: string): string {
  const trimmed = input.trim().replace(/\\/g, '/');
  const segment = trimmed.split('/').filter(Boolean).pop() ?? '';
  const withoutExt = segment.replace(/\.md$/i, '');
  const ascii = withoutExt.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
  const slug = ascii
    .replace(/[^A-Za-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
    .replace(/-+$/g, '');
  if (!slug || slug === '.' || slug === '..' || RESERVED_BASENAME.test(slug)) return 'tutorial.md';
  return `${slug}.md`;
}

export function slugFromTitle(title: string): string {
  // A title is not a path. Slashes stay in the name as word breaks.
  const flattened = title.replace(/[\\/]+/g, ' ');
  return safeMarkdownBasename(flattened).replace(/\.md$/i, '').toLowerCase() || 'tutorial';
}

export function yamlDoubleQuoted(value: string): string {
  let out = '"';
  for (const ch of normalizeNewlines(value)) {
    switch (ch) {
      case '\\':
        out += '\\\\';
        break;
      case '"':
        out += '\\"';
        break;
      case '\n':
        out += '\\n';
        break;
      case '\t':
        out += '\\t';
        break;
      default: {
        const code = ch.codePointAt(0) ?? 0;
        if (code < 0x20 || code === 0x7f) out += `\\u${code.toString(16).padStart(4, '0')}`;
        else out += ch;
      }
    }
  }
  return `${out}"`;
}

function promptText(value: string): string {
  const text = normalizeNewlines(value).replace(/^\n+/, '').replace(/\n+$/, '');
  return text.trim() === '' ? '' : text;
}

function needsQuotedPrompt(value: string): boolean {
  return /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/.test(value);
}

function trimOuterBlankLines(value: string): string {
  const lines = normalizeNewlines(value).split('\n');
  while (lines.length > 0 && lines[0].trim() === '') lines.shift();
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') lines.pop();
  return lines.join('\n');
}

function cleanList(values: string[], limit: number): string[] {
  return values.map((value) => value.trim()).filter(Boolean).slice(0, limit);
}

export function safeMediaSrc(path: string, kind: ResultKind | 'cover'): string {
  const trimmed = path.trim();
  return mediaError(trimmed, kind) ? '' : trimmed;
}

function mediaError(path: string, kind: ResultKind | 'cover'): string | null {
  if (!isSitePath(path)) return 'Use a path like /media/your-file.jpg';
  if (kind === 'video') {
    if (!VIDEO_EXT.test(path)) return 'Video files must end in .mp4 or .webm';
    return null;
  }
  if (!IMAGE_EXT.test(path)) return 'Image files must end in .png, .jpg, .webp, .gif, .svg, or .avif';
  return null;
}

function pushPrompt(lines: string[], key: string, value: string) {
  if (!value) {
    lines.push(`${key}: ""`);
    return;
  }
  if (needsQuotedPrompt(value)) {
    lines.push(`${key}: ${yamlDoubleQuoted(value)}`);
    return;
  }
  lines.push(`${key}: |2`);
  for (const line of value.split('\n')) lines.push(line.length === 0 ? '' : `  ${line}`);
}

export function buildPostFile(input: PostInput, filenameInput: string): BuildResult {
  const errors: string[] = [];
  const title = input.title.trim();
  const summary = input.summary.trim();
  const date = input.date.trim();
  const updated = input.updated.trim();
  const tool = input.tool.trim();
  const model = input.model.trim();
  const category = input.category;
  const enteredTags = input.tags.map((tag) => tag.trim()).filter(Boolean);
  if (enteredTags.length > 50) errors.push('Use 50 topics or fewer.');
  const tags = enteredTags.slice(0, 50);
  const cover = input.cover.trim();
  const coverAlt = input.coverAlt.trim();
  const videoRaw = input.videoUrl.trim();
  const videoUrl = canonicalYoutubeUrl(videoRaw);
  const positivePrompt = promptText(input.positivePrompt);
  const negativePrompt = promptText(input.negativePrompt);
  const notes = trimOuterBlankLines(input.notes);
  const filename = safeMarkdownBasename(filenameInput.trim() || slugFromTitle(title));

  if (!title) errors.push('Enter a title.');
  if (title.length > 200) errors.push('Use a title of 200 characters or fewer.');
  if (!summary) errors.push('Enter a summary.');
  if (summary.length > 500) errors.push('Use a summary of 500 characters or fewer.');
  if (!date) errors.push('Enter a date.');
  else if (!isCalendarDate(date)) errors.push('Enter a real date as YYYY-MM-DD.');
  if (updated && !isCalendarDate(updated)) errors.push('Enter a real updated date as YYYY-MM-DD, or leave it blank.');
  if (!tool) errors.push('Enter the app name.');
  if (category !== 'image' && category !== 'video') errors.push('Choose Image or Video for the result.');
  if (cover) {
    const problem = mediaError(cover, 'cover');
    if (problem) errors.push(`Cover image: ${problem}.`);
    if (!coverAlt) errors.push('Describe the cover image.');
  }
  if (videoUrl === null) errors.push('Enter a YouTube link, including a Short, or leave the lesson video blank.');
  if (positivePrompt.length > 200_000) errors.push('The positive prompt is too long.');
  if (negativePrompt.length > 200_000) errors.push('The negative prompt is too long.');
  if (notes.length > 200_000) errors.push('The notes are too long.');

  const steps: Array<{ title: string; body: string }> = [];
  input.steps.forEach((step, index) => {
    const stepTitle = step.title.trim();
    const stepBody = normalizeNewlines(step.body).trim();
    if (!stepTitle && !stepBody) return;
    if (!stepTitle || !stepBody) errors.push(`Step ${index + 1} needs both a title and the text.`);
    else steps.push({ title: stepTitle, body: stepBody });
  });
  if (steps.length > 100) errors.push('Use 100 steps or fewer.');

  const settings: Array<{ label: string; value: string }> = [];
  input.settings.forEach((setting, index) => {
    const label = setting.label.trim();
    const value = normalizeNewlines(setting.value).trim();
    if (!label && !value) return;
    if (!label || !value) errors.push(`Setting ${index + 1} needs both a label and a value.`);
    else settings.push({ label, value });
  });
  if (settings.length > 50) errors.push('Use 50 settings or fewer.');

  const tips = cleanList(input.tips, 100);
  const results: PostInput['results'] = [];
  input.results.forEach((result, index) => {
    const src = result.src.trim();
    const alt = result.alt.trim();
    const caption = result.caption.trim();
    const kind = result.kind === 'video' ? 'video' : 'image';
    if (!src && !alt && !caption) return;
    const problem = src ? mediaError(src, kind) : 'Use a path like /media/your-file.jpg';
    if (problem) errors.push(`Result ${index + 1}: ${problem}.`);
    if (!alt) errors.push(`Result ${index + 1} needs a description.`);
    if (!problem && alt) results.push({ src, alt, caption, kind });
  });
  if (results.length > 40) errors.push('Use 40 result files or fewer.');

  if (errors.length > 0) {
    return { errors, markdown: '', filename, videoUrl: videoUrl ?? '', preview: '' };
  }

  const cleaned: PostInput = {
    title,
    summary,
    date,
    updated,
    tool,
    model,
    category,
    tags,
    draft: input.draft !== false,
    cover,
    coverAlt: cover ? coverAlt : '',
    videoUrl: videoUrl ?? '',
    steps,
    positivePrompt,
    negativePrompt,
    settings,
    tips,
    results,
    notes,
  };

  const lines: string[] = ['---', ...HEADER_COMMENTS, ''];
  lines.push('# The title viewers see.');
  lines.push(`title: ${yamlDoubleQuoted(cleaned.title)}`);
  lines.push('');
  lines.push('# One or two sentences for the archive card and for search.');
  lines.push(`summary: ${yamlDoubleQuoted(cleaned.summary)}`);
  lines.push('');
  lines.push('# Year-month-day. Use a real date.');
  lines.push(`date: ${cleaned.date}`);
  lines.push('');
  lines.push('# Optional. Add a line like the next one if you revise the tutorial.');
  lines.push(cleaned.updated ? `updated: ${cleaned.updated}` : '# updated: 2026-11-07');
  lines.push('');
  lines.push('# The app you show in the video.');
  lines.push(`tool: ${yamlDoubleQuoted(cleaned.tool)}`);
  lines.push('');
  lines.push('# Optional. The model name, if you want viewers to see it. Leave blank if you do not.');
  lines.push(`model: ${yamlDoubleQuoted(cleaned.model)}`);
  lines.push('');
  lines.push('# Required. Type image or video. No other word.');
  lines.push(`category: ${yamlDoubleQuoted(cleaned.category)}`);
  lines.push('');
  lines.push('# Optional topics for the filter. Keep them short.');
  if (cleaned.tags.length === 0) lines.push('tags: []');
  else {
    lines.push('tags:');
    for (const tag of cleaned.tags) lines.push(`  - ${yamlDoubleQuoted(tag)}`);
  }
  lines.push('');
  lines.push('# true hides the tutorial from the built site. false shows it.');
  lines.push(`draft: ${cleaned.draft ? 'true' : 'false'}`);
  lines.push('');
  lines.push('# Leave false for your own lessons. true adds an Example badge.');
  lines.push('example: false');
  lines.push('');
  lines.push('# Optional picture. Put the file in public/media, then use a path that starts with /media/');
  lines.push(`cover: ${yamlDoubleQuoted(cleaned.cover)}`);
  lines.push(`coverAlt: ${yamlDoubleQuoted(cleaned.coverAlt)}`);
  lines.push('');
  lines.push('# Optional. A full YouTube link, or leave blank.');
  lines.push(`videoUrl: ${yamlDoubleQuoted(cleaned.videoUrl)}`);
  lines.push('');
  if (cleaned.steps.length === 0) lines.push('steps: []');
  else {
    lines.push('steps:');
    for (const step of cleaned.steps) {
      lines.push(`  - title: ${yamlDoubleQuoted(step.title)}`);
      lines.push(`    body: ${yamlDoubleQuoted(step.body)}`);
    }
  }
  lines.push('');
  pushPrompt(lines, 'positivePrompt', cleaned.positivePrompt);
  lines.push('');
  pushPrompt(lines, 'negativePrompt', cleaned.negativePrompt);
  lines.push('');
  if (cleaned.settings.length === 0) lines.push('settings: []');
  else {
    lines.push('settings:');
    for (const setting of cleaned.settings) {
      lines.push(`  - label: ${yamlDoubleQuoted(setting.label)}`);
      lines.push(`    value: ${yamlDoubleQuoted(setting.value)}`);
    }
  }
  lines.push('');
  if (cleaned.tips.length === 0) lines.push('tips: []');
  else {
    lines.push('tips:');
    for (const tip of cleaned.tips) lines.push(`  - ${yamlDoubleQuoted(tip)}`);
  }
  lines.push('');
  if (cleaned.results.length === 0) {
    lines.push('results: []');
    lines.push('# To show a picture, replace the results line with:');
    lines.push('# results:');
    lines.push('#   - src: "/media/your-result.jpg"');
    lines.push('#     alt: "Describe the picture for someone who cannot see it."');
    lines.push('#     caption: "Optional caption."');
    lines.push('#     kind: "image"');
    lines.push('# For a video file you upload yourself, use kind video and an mp4 or webm path:');
    lines.push('#   - src: "/media/your-clip.mp4"');
    lines.push('#     alt: "Describe what moves."');
    lines.push('#     kind: "video"');
  } else {
    lines.push('results:');
    for (const result of cleaned.results) {
      lines.push(`  - src: ${yamlDoubleQuoted(result.src)}`);
      lines.push(`    alt: ${yamlDoubleQuoted(result.alt)}`);
      if (result.caption) lines.push(`    caption: ${yamlDoubleQuoted(result.caption)}`);
      lines.push(`    kind: ${yamlDoubleQuoted(result.kind)}`);
    }
  }
  lines.push('---');
  if (cleaned.notes) {
    lines.push('');
    lines.push(cleaned.notes);
  }
  const markdown = `${lines.join('\n').replace(/\n*$/, '\n')}`;
  return {
    errors: [],
    markdown,
    filename,
    videoUrl: cleaned.videoUrl,
    preview: previewPlainText(cleaned),
  };
}

export function previewPlainText(input: PostInput): string {
  const lines = [
    input.title.trim(),
    input.summary.trim(),
    input.draft ? 'Draft: hidden until you set draft to false and commit the file.' : 'draft: false. Commit the file yourself. This page does not publish it.',
    `Date: ${input.date.trim()}`,
  ];
  if (input.updated.trim()) lines.push(`Updated: ${input.updated.trim()}`);
  lines.push(`App: ${input.tool.trim()}`);
  if (input.model.trim()) lines.push(`Model: ${input.model.trim()}`);
  lines.push(`Result category: ${input.category}`);
  if (input.tags.some((tag) => tag.trim())) lines.push(`Topics: ${input.tags.map((tag) => tag.trim()).filter(Boolean).join(', ')}`);
  if (input.cover.trim()) lines.push(`Cover: ${input.cover.trim()}`);
  if (input.videoUrl.trim()) lines.push(`Lesson video: ${input.videoUrl.trim()}`);
  const steps = input.steps.filter((step) => step.title.trim() || step.body.trim());
  if (steps.length) {
    lines.push('', 'Steps');
    steps.forEach((step, index) => lines.push(`${index + 1}. ${step.title.trim()}`, step.body.trim()));
  }
  if (promptText(input.positivePrompt)) lines.push('', 'Positive prompt', promptText(input.positivePrompt));
  if (promptText(input.negativePrompt)) lines.push('', 'Negative prompt', promptText(input.negativePrompt));
  const settings = input.settings.filter((setting) => setting.label.trim() || setting.value.trim());
  if (settings.length) {
    lines.push('', 'Settings');
    for (const setting of settings) lines.push(`${setting.label.trim()}: ${setting.value.trim()}`);
  }
  const tips = input.tips.map((tip) => tip.trim()).filter(Boolean);
  if (tips.length) {
    lines.push('', 'Tips');
    for (const tip of tips) lines.push(`- ${tip}`);
  }
  const results = input.results.filter((result) => result.src.trim() || result.alt.trim());
  if (results.length) {
    lines.push('', 'Result media');
    for (const result of results) {
      lines.push(`${result.kind}: ${result.src.trim()}`);
      lines.push(result.alt.trim());
      if (result.caption.trim()) lines.push(result.caption.trim());
    }
  }
  const notes = trimOuterBlankLines(input.notes);
  if (notes) lines.push('', 'Notes', notes);
  return `${lines.join('\n').replace(/\n*$/, '\n')}`;
}

const FRONTMATTER_RE = /(?:^\uFEFF?|^\s*\n)(?:---|\+\+\+)([\s\S]*?\n)(?:---|\+\+\+)/;

function asText(value: unknown): string {
  if (typeof value === 'string') return normalizeNewlines(value);
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function asDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value.trim())) return value.trim().slice(0, 10);
  return '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date);
}

function notesAfterFrontmatter(source: string, match: RegExpExecArray): string {
  const closeAt = match.index + match[0].length;
  let notes = normalizeNewlines(source.slice(closeAt));
  if (notes.startsWith('\n')) notes = notes.slice(1);
  return notes.replace(/\n$/, '');
}

export function parsePostMarkdown(source: string): ParseResult {
  const text = normalizeNewlines(source);
  if (text.includes('\u0000')) return { ok: false, error: 'This file does not look like a Markdown tutorial.' };
  if (text.length > 1_000_000) return { ok: false, error: 'That file is too large for this form.' };
  if (/^\uFEFF?\s*\+\+\+/.test(text)) {
    return { ok: false, error: 'This form reads a Markdown file that starts with ---.' };
  }
  const match = FRONTMATTER_RE.exec(text);
  if (!match) return { ok: false, error: 'This file needs a --- block of fields at the top.' };
  let data: unknown;
  try {
    const document = parseDocument(match[1], {
      customTags: ['timestamp'],
      merge: true,
      schema: 'core',
    });
    if (document.errors.length > 0) {
      return { ok: false, error: 'The fields at the top of the file could not be read. Check quotes and colons.' };
    }
    data = document.toJS();
  } catch {
    return { ok: false, error: 'The fields at the top of the file could not be read. Check quotes and colons.' };
  }
  if (!isRecord(data)) return { ok: false, error: 'The fields at the top of the file need to be a list of named values.' };

  const warnings: string[] = [];
  const known = new Set([
    'title',
    'summary',
    'date',
    'updated',
    'tool',
    'model',
    'category',
    'tags',
    'draft',
    'example',
    'cover',
    'coverAlt',
    'videoUrl',
    'steps',
    'positivePrompt',
    'negativePrompt',
    'settings',
    'tips',
    'results',
  ]);
  const unknown = Object.keys(data).filter((key) => !known.has(key));
  if (unknown.length) warnings.push(`These fields are not kept: ${unknown.join(', ')}.`);

  const categoryText = asText(data.category).trim().toLowerCase();
  const category: ResultKind = categoryText === 'video' ? 'video' : 'image';
  if (categoryText && categoryText !== 'image' && categoryText !== 'video') {
    warnings.push('Category was not image or video. The form is using Image.');
  }

  let draft = true;
  if (typeof data.draft === 'boolean') draft = data.draft;
  else if (typeof data.draft === 'string' && /^(true|false)$/i.test(data.draft.trim())) draft = data.draft.trim().toLowerCase() === 'true';
  else if (data.draft == null) warnings.push('draft was missing. The form keeps the tutorial hidden until you change it.');
  else warnings.push('draft was not true or false. The form keeps the tutorial hidden.');

  if (data.example === true) warnings.push('example was true. The download will set example to false.');

  const tags = Array.isArray(data.tags) ? data.tags.map((tag) => asText(tag)) : data.tags == null ? [] : [asText(data.tags)];
  const tips = Array.isArray(data.tips) ? data.tips.map((tip) => asText(tip)) : [];
  const steps = Array.isArray(data.steps)
    ? data.steps.filter(isRecord).map((step) => ({ title: asText(step.title), body: asText(step.body) }))
    : [];
  const settings = Array.isArray(data.settings)
    ? data.settings.filter(isRecord).map((setting) => ({ label: asText(setting.label), value: asText(setting.value) }))
    : [];
  const results = Array.isArray(data.results)
    ? data.results.filter(isRecord).map((result) => {
        const kind: ResultKind = asText(result.kind).trim().toLowerCase() === 'video' ? 'video' : 'image';
        return {
          src: asText(result.src),
          alt: asText(result.alt),
          caption: asText(result.caption),
          kind,
        };
      })
    : [];

  const date = asDate(data.date);
  if (data.date != null && !date) warnings.push('The date could not be read. Enter it again.');
  const updated = asDate(data.updated);

  const input: PostInput = {
    title: asText(data.title),
    summary: asText(data.summary),
    date,
    updated,
    tool: asText(data.tool),
    model: asText(data.model),
    category,
    tags,
    draft,
    cover: asText(data.cover),
    coverAlt: asText(data.coverAlt),
    videoUrl: asText(data.videoUrl),
    steps,
    positivePrompt: asText(data.positivePrompt),
    negativePrompt: asText(data.negativePrompt),
    settings,
    tips,
    results,
    notes: notesAfterFrontmatter(text, match),
  };
  return { ok: true, input, warnings };
}
