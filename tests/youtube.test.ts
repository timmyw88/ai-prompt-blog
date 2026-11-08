import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalYoutubeUrl, youtubeEmbedUrl, youtubeId } from '../src/lib/youtube.ts';

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

test('shorts and short links become a watch URL', () => {
  assert.equal(canonicalYoutubeUrl(''), '');
  assert.equal(canonicalYoutubeUrl('   '), '');
  assert.equal(
    canonicalYoutubeUrl('https://youtube.com/shorts/PmcIMtN8-eI'),
    'https://www.youtube.com/watch?v=PmcIMtN8-eI',
  );
  assert.equal(
    canonicalYoutubeUrl('https://www.youtube.com/shorts/PmcIMtN8-eI?feature=share'),
    'https://www.youtube.com/watch?v=PmcIMtN8-eI',
  );
  assert.equal(canonicalYoutubeUrl('https://youtu.be/qQm5S3Nvx9M'), 'https://www.youtube.com/watch?v=qQm5S3Nvx9M');
  assert.equal(
    canonicalYoutubeUrl('m.youtube.com/watch?v=qQm5S3Nvx9M'),
    'https://www.youtube.com/watch?v=qQm5S3Nvx9M',
  );
  assert.equal(canonicalYoutubeUrl('https://vimeo.com/123456'), null);
  assert.equal(canonicalYoutubeUrl('javascript:alert(1)'), null);
});
