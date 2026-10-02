import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addHighlight, highlightAt } from '../src/selection.js';

const text = 'abcdefghijklmnopqrstuvwxyz';

test('highlights merge when they overlap and stay separate when they do not', () => {
  const first = addHighlight([], { start: 0, end: 3, quote: 'abc' }, text);
  const merged = addHighlight(first, { start: 2, end: 5, quote: 'cde' }, text);
  assert.deepEqual(merged, [{ start: 0, end: 5, quote: 'abcde' }]);
  const both = addHighlight(first, { start: 10, end: 12, quote: 'kl' }, text);
  assert.deepEqual(both, [{ start: 0, end: 3, quote: 'abc' }, { start: 10, end: 12, quote: 'kl' }]);
});

test('a selection inside a highlight identifies that highlight', () => {
  const list = [{ start: 0, end: 3, quote: 'abc' }, { start: 10, end: 12, quote: 'kl' }];
  assert.equal(highlightAt(list, { start: 11, end: 12, quote: 'l' }, text), 1);
  assert.equal(highlightAt(list, { start: 3, end: 6, quote: 'def' }, text), -1);
});
