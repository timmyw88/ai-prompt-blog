import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import matter from 'gray-matter';
import { postSchema } from '../src/lib/post-schema.ts';

const secretPattern = /ca-pub-|BEGIN PRIVATE KEY|api_key\s*[:=]|AKIA[0-9A-Z]{16}/i;

test('every tutorial file matches the portable schema', () => {
  const files = readdirSync('content/posts').filter((name) => name.endsWith('.md'));
  assert.ok(files.length >= 1);
  for (const name of files) {
    const raw = readFileSync(`content/posts/${name}`, 'utf8');
    assert.doesNotMatch(raw, secretPattern);
    const parsed = matter(raw);
    const result = postSchema.safeParse(parsed.data);
    assert.equal(result.success, true, `${name} ${JSON.stringify(result.error?.issues ?? [])}`);
    if (result.success && result.data.example) {
      assert.match(result.data.summary, /not a lesson from the site owner/);
    }
  }
});

test('the blank template is valid and unpublished by default', () => {
  const raw = readFileSync('templates/new-post.md', 'utf8');
  const parsed = matter(raw);
  const result = postSchema.safeParse(parsed.data);
  assert.equal(result.success, true, JSON.stringify(result.error?.issues ?? []));
  if (result.success) {
    assert.equal(result.data.draft, true);
    assert.equal(result.data.example, false);
  }
});

test('shipped config does not enable ads or invent a publisher id', () => {
  const config = JSON.parse(readFileSync('site.config.json', 'utf8'));
  assert.equal(config.ads.enabled, false);
  assert.deepEqual(Object.keys(config.ads), ['enabled']);
  assert.equal(JSON.stringify(config).includes('ca-pub'), false);
});
