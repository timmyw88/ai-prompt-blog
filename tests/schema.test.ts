import assert from 'node:assert/strict';
import test from 'node:test';
import { postSchema } from '../src/lib/post-schema.ts';

const valid = {
  title: 'A cup',
  summary: 'One sentence.',
  date: '2026-04-03',
  tool: 'Example Image App',
  category: 'image',
  steps: [{ title: 'Start', body: 'Open the app.' }],
  positivePrompt: 'line one\nline two',
  results: [{ src: '/media/cup.jpg', alt: 'A cup on a table.', kind: 'image' }],
};

test('a minimal tutorial parses and keeps prompt line breaks', () => {
  const parsed = postSchema.parse(valid);
  assert.equal(parsed.positivePrompt, 'line one\nline two');
  assert.equal(parsed.draft, false);
  assert.equal(parsed.date.toISOString().slice(0, 10), '2026-04-03');
});

test('unsafe media, bad categories, and non-YouTube links fail', () => {
  assert.equal(postSchema.safeParse({ ...valid, category: 'audio' }).success, false);
  assert.equal(
    postSchema.safeParse({ ...valid, results: [{ src: 'https://evil.example/a.jpg', alt: 'x' }] }).success,
    false,
  );
  assert.equal(
    postSchema.safeParse({ ...valid, results: [{ src: '/media/../secret.jpg', alt: 'x' }] }).success,
    false,
  );
  assert.equal(postSchema.safeParse({ ...valid, videoUrl: 'javascript:alert(1)' }).success, false);
  assert.equal(postSchema.safeParse({ ...valid, cover: '/media/a.jpg' }).success, false);
  assert.equal(postSchema.safeParse({ ...valid, password: 'nope' }).success, false);
});
