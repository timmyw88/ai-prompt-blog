import assert from 'node:assert/strict';
import test from 'node:test';
import { isVisible, matchesQuery, toSearchRecord, uniqueLabels } from '../src/lib/search.ts';

const portrait = toSearchRecord({
  id: 'portrait',
  body: 'notes about a sweater',
  data: {
    title: 'Window portrait',
    summary: 'Soft light',
    tool: 'Example Image App',
    model: 'Example Model XL',
    category: 'image',
    tags: ['lighting', 'portrait'],
    steps: [{ title: 'Paste the prompt', body: 'Use both boxes.' }],
    positivePrompt: 'brown knitted sweater',
    negativePrompt: 'watermark',
    settings: [{ label: 'Steps', value: '28' }],
    tips: ['Lower the guidance'],
  },
});

test('search matches every word across prompts and notes', () => {
  assert.equal(matchesQuery(portrait.text, ''), true);
  assert.equal(matchesQuery(portrait.text, 'sweater guidance'), true);
  assert.equal(matchesQuery(portrait.text, 'ceramic'), false);
  assert.equal(matchesQuery('still-life linen', 'still life'), true);
});

test('filters combine format, tool, and topic', () => {
  assert.equal(isVisible(portrait, { query: 'window', category: 'image', tool: '', topic: '' }), true);
  assert.equal(isVisible(portrait, { query: '', category: 'video', tool: '', topic: '' }), false);
  assert.equal(
    isVisible(portrait, { query: '', category: '', tool: 'example image app', topic: 'lighting' }),
    true,
  );
  assert.equal(isVisible(portrait, { query: '', category: '', tool: '', topic: 'motion' }), false);
});

test('topic labels keep the first spelling', () => {
  assert.deepEqual(uniqueLabels([' Lighting ', 'lighting', 'video']), ['Lighting', 'video']);
});
