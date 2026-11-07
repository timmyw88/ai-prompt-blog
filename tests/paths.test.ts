import assert from 'node:assert/strict';
import test from 'node:test';
import { isRasterPath, isSafeLink, isSitePath } from '../src/lib/paths.ts';
import { joinBase } from '../src/lib/urls.ts';

test('site paths stay on this site', () => {
  assert.equal(isSitePath('/media/cup.jpg'), true);
  assert.equal(isSitePath('/media/../secret.jpg'), false);
  assert.equal(isSitePath('//evil.example/a.jpg'), false);
  assert.equal(isSitePath('https://evil.example/a.jpg'), false);
  assert.equal(isSitePath('/media/my file.jpg'), false);
});

test('links allow http(s), mailto, and relative URLs only', () => {
  assert.equal(isSafeLink('https://example.com/a?b=1'), true);
  assert.equal(isSafeLink('mailto:a@example.com'), true);
  assert.equal(isSafeLink('/guide/'), true);
  assert.equal(isSafeLink('#steps'), true);
  assert.equal(isSafeLink('javascript:alert(1)'), false);
  assert.equal(isSafeLink('JavaScript:alert(1)'), false);
  assert.equal(isSafeLink('data:text/html,hi'), false);
  assert.equal(isSafeLink('//evil.example'), false);
  assert.equal(isSafeLink('https://user:pass@example.com'), false);
});

test('base joining covers user sites and project sites', () => {
  assert.equal(joinBase('/', '/'), '/');
  assert.equal(joinBase('/', 'guide/'), '/guide/');
  assert.equal(joinBase('/ai-prompt-blog', '/media/a.png'), '/ai-prompt-blog/media/a.png');
  assert.equal(joinBase('/ai-prompt-blog/', 'posts/tutorial/'), '/ai-prompt-blog/posts/tutorial/');
  assert.equal(joinBase('/', 'https://example.com'), 'https://example.com');
});

test('raster paths are the ones used for link previews', () => {
  assert.equal(isRasterPath('/media/a.jpg'), true);
  assert.equal(isRasterPath('/media/a.svg'), false);
});
