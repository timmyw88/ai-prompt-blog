import assert from 'node:assert/strict';
import test from 'node:test';
import { youtubeEmbedUrl, youtubeId } from '../src/lib/youtube.ts';

test('accepts common YouTube links and rejects other hosts', () => {
  assert.equal(youtubeId('https://www.youtube.com/watch?v=aqz-KE-bpKQ'), 'aqz-KE-bpKQ');
  assert.equal(youtubeId('https://youtu.be/aqz-KE-bpKQ'), 'aqz-KE-bpKQ');
  assert.equal(youtubeId('https://www.youtube.com/shorts/aqz-KE-bpKQ'), 'aqz-KE-bpKQ');
  assert.equal(youtubeId('https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ'), 'aqz-KE-bpKQ');
  assert.equal(youtubeId('https://example.com/watch?v=aqz-KE-bpKQ'), null);
  assert.equal(youtubeId('javascript:alert(1)'), null);
  assert.equal(youtubeId(''), null);
  assert.equal(
    youtubeEmbedUrl('aqz-KE-bpKQ'),
    'https://www.youtube-nocookie.com/embed/aqz-KE-bpKQ?rel=0',
  );
});
