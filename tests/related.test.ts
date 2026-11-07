import assert from 'node:assert/strict';
import test from 'node:test';
import { relatedPosts } from '../src/lib/related.ts';

const posts = [
  {
    id: 'portrait',
    data: { date: new Date('2026-02-12'), tool: 'Example Image App', category: 'image', tags: ['lighting', 'beginner'] },
  },
  {
    id: 'still',
    data: { date: new Date('2026-04-03'), tool: 'Example Image App', category: 'image', tags: ['lighting', 'product'] },
  },
  {
    id: 'video',
    data: { date: new Date('2026-06-18'), tool: 'Example Video App', category: 'video', tags: ['motion'] },
  },
];

test('related posts need a shared tool, format, or topic', () => {
  const related = relatedPosts(posts[0], posts).map((post) => post.id);
  assert.deepEqual(related, ['still']);
  assert.deepEqual(relatedPosts(posts[2], posts), []);
});
