import assert from 'node:assert/strict';
import test from 'node:test';
import {
  accessibleCopyName,
  copyLabel,
  copyStatusMessage,
  copyWithProviders,
  textToCopy,
} from '../src/lib/copy.ts';

test('copy labels cover idle, success, and failure', () => {
  assert.equal(copyLabel('idle'), 'Copy');
  assert.equal(copyLabel('success'), 'Copied');
  assert.equal(copyLabel('failure'), 'Copy failed');
  assert.match(copyStatusMessage('success'), /clipboard/i);
  assert.match(copyStatusMessage('failure'), /manually/i);
  assert.equal(copyStatusMessage('idle'), '');
  assert.equal(accessibleCopyName('failure', 'positive prompt'), 'Copy failed positive prompt');
});

test('exact copy keeps internal spacing and line breaks', () => {
  const prompt = '  first line\n\nsecond  line\n';
  assert.equal(textToCopy(prompt, 'exact'), prompt.replace(/\r\n/g, '\n'));
  assert.equal(textToCopy('line\r\nnext', 'exact'), 'line\nnext');
});

test('fenced copy drops one wrapping newline only', () => {
  assert.equal(textToCopy('\n  keep\n\nspaces\n', 'fenced'), '  keep\n\nspaces');
  assert.equal(textToCopy('no wrap', 'fenced'), 'no wrap');
});

test('copy providers report success and failure', async () => {
  assert.equal(await copyWithProviders('', { clipboard: async () => undefined }), 'failure');
  assert.equal(await copyWithProviders('prompt', { clipboard: async () => undefined }), 'success');
  assert.equal(
    await copyWithProviders('prompt', {
      clipboard: async () => {
        throw new Error('denied');
      },
      legacy: () => true,
    }),
    'success',
  );
  assert.equal(
    await copyWithProviders('prompt', {
      clipboard: async () => {
        throw new Error('denied');
      },
      legacy: () => false,
    }),
    'failure',
  );
  assert.equal(
    await copyWithProviders('prompt', {
      clipboard: async () => {
        throw new Error('denied');
      },
      legacy: () => {
        throw new Error('legacy failed');
      },
    }),
    'failure',
  );
  assert.equal(await copyWithProviders('prompt', {}), 'failure');
});
