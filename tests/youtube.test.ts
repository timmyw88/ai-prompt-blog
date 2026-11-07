import assert from 'node:assert/strict';
import test from 'node:test';
import { youtubeEmbedUrl, youtubeId } from '../src/lib/youtube.ts';

test('accepts common YouTube links and rejects other hosts', () => {
  assert.equal(youtubeId('https://www.youtube.com/watch?v=abc_DE-12'), 'abc_DE-12');
  assert.equal(youtubeId('https://youtu.be/abc_DE-12'), 'abc_DE-12');
  assert.equal(youtubeId('https://www.youtube.com/shorts/abc_DE-12'), 'abc_DE-12');
  assert.equal(youtubeId('https://www.youtube-nocookie.com/embed/abc_DE-12'), 'abc_DE-12');
  assert.equal(youtubeId('https://example.com/watch?v=abc_DE-12'), null);
  assert.equal(youtubeId('javascript:alert(1)'), null);
  assert.equal(youtubeId(''), null);
  assert.equal(
    youtubeEmbedUrl('abc_DE-12'),
    'https://www.youtube-nocookie.com/embed/abc_DE-12?rel=0',
  );
});
