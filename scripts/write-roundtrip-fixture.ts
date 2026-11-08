import { readFileSync, writeFileSync } from 'node:fs';
import matter from 'gray-matter';
import { buildPostFile } from '../src/lib/post-markdown.ts';
import { postSchema } from '../src/lib/post-schema.ts';

const original = postSchema.parse(matter(readFileSync('content/posts/my-first-tutorial.md', 'utf8')).data);
const positivePrompt = [
  original.positivePrompt ?? '',
  '',
  '---',
  '```',
  'key: "value" # hash',
  'café 日本語 🎨',
  'tab\tstay',
  'trail   ',
].join('\n');

const built = buildPostFile(
  {
    title: 'Post builder schema fixture: "quotes" # hash',
    summary: 'Temporary file used to prove the content loader accepts generator output.',
    date: '2026-11-07',
    updated: '2026-11-08',
    tool: 'ChatGPT',
    model: '',
    category: 'image',
    tags: ['calendar', '#hash'],
    draft: true,
    cover: '/media/2027-Calendar.png',
    coverAlt: 'Personalised 2027 calendar created with a photo using ChatGPT',
    videoUrl: 'https://youtube.com/shorts/PmcIMtN8-eI',
    steps: [{ title: 'Upload: "photo"', body: 'Paste the prompt.\n---\n```' }],
    positivePrompt,
    negativePrompt: '',
    settings: [{ label: 'Steps', value: '30' }],
    tips: ['Check the dates.'],
    results: [],
    notes: 'Fixture notes. <script>alert(1)</script>',
  },
  'post-builder-roundtrip',
);

if (built.errors.length > 0) {
  console.error(built.errors.join('\n'));
  process.exit(1);
}

writeFileSync('content/posts/post-builder-roundtrip.md', built.markdown);
console.log('Wrote content/posts/post-builder-roundtrip.md');
