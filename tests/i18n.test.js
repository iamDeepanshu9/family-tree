import test from 'node:test';
import assert from 'node:assert/strict';
import { alternateName, parentRelation, years } from '../js/i18n.js';

test('separates available birth and death years clearly', () => {
  assert.equal(years({ birthYear: 1938, deathYear: 2021 }), '1938 — 2021');
  assert.equal(years({ birthYear: 1965, deathYear: null }), '1965');
  assert.equal(years({ birthYear: null, deathYear: 2021 }), '† 2021');
});

test('uses the parent given name instead of viewer-relative wording', () => {
  const parent = { name: 'Swargiya Shri Jeev', nameHindi: 'स्वर्गीय श्री जीव' };
  assert.equal(parentRelation({ gender: 'M' }, parent, 'en'), 'Jeev’s Son');
  assert.equal(parentRelation({ gender: 'F' }, parent, 'hi'), 'जीव के पुत्री');
});

test('Hindi mode does not add an English alternate name', () => {
  assert.equal(alternateName({ name: 'Chetan', nameHindi: 'चेतन' }, 'hi'), '');
  assert.equal(alternateName({ name: 'Chetan', nameHindi: 'चेतन' }, 'en'), 'चेतन');
});
