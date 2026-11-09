import test from 'node:test';
import assert from 'node:assert/strict';
import { alternateName, formatDate, isDeceased, parentRelation, parseDate, years } from '../js/i18n.js';

test('separates available birth and death years clearly', () => {
  assert.equal(years({ birthYear: 1938, deathYear: 2021 }), '1938 — 2021');
  assert.equal(years({ birthYear: 1965, deathYear: null }), '1965');
  assert.equal(years({ birthYear: null, deathYear: 2021 }), '† 2021');
});

test('formats full DOB and DOD in English and Hindi', () => {
  const member = { dob: '1913-05-15', dod: '2000-11-20' };
  assert.equal(years(member, 'en'), '15 May 1913 — 20 Nov 2000');
  assert.equal(years(member, 'hi'), '15 मई 1913 — 20 नवंबर 2000');
});

test('formats year-only DOB and DOD when date/month are not known', () => {
  const member = { dob: '1913', dod: '2000' };
  assert.equal(years(member, 'en'), '1913 — 2000');
  assert.equal(years(member, 'hi'), '1913 — 2000');

  const numberYears = { dob: 1913, dod: 2000 };
  assert.equal(years(numberYears, 'en'), '1913 — 2000');
});

test('handles mixed precision dates and single known dates', () => {
  assert.equal(years({ dob: '1913-05-15', dod: '2000' }, 'en'), '15 May 1913 — 2000');
  assert.equal(years({ dob: '1913', dod: '2000-11-20' }, 'en'), '1913 — 20 Nov 2000');
  assert.equal(years({ dob: '1995-10-24' }, 'en'), '24 Oct 1995');
  assert.equal(years({ dod: '2022-01-10' }, 'en'), '† 10 Jan 2022');
  assert.equal(years({ dob: null, dod: null }), '');
});

test('parses various date formats (ISO, DMY, textual, numbers)', () => {
  assert.deepEqual(parseDate(1913), { year: 1913, month: null, day: null });
  assert.deepEqual(parseDate('1913'), { year: 1913, month: null, day: null });
  assert.deepEqual(parseDate('1995-10-24'), { year: 1995, month: 10, day: 24 });
  assert.deepEqual(parseDate('24/10/1995'), { year: 1995, month: 10, day: 24 });
  assert.deepEqual(parseDate('24-10-1995'), { year: 1995, month: 10, day: 24 });
  assert.deepEqual(parseDate('15 May 1913'), { year: 1913, month: 5, day: 15 });
  assert.deepEqual(parseDate('15 मई 1913'), { year: 1913, month: 5, day: 15 });
  assert.deepEqual(parseDate('May 1913'), { year: 1913, month: 5, day: null });
  assert.equal(parseDate(null), null);
  assert.equal(parseDate(''), null);
  assert.equal(parseDate('invalid'), undefined);
});

test('detects deceased status from dod', () => {
  assert.equal(isDeceased({ dod: '2022-01-10' }), true);
  assert.equal(isDeceased({ dod: '2022' }), true);
  assert.equal(isDeceased({ dob: '1995-10-24' }), false);
  assert.equal(isDeceased({ isDeceased: true }), true);
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

test('provides complete bilingual copy for full screen controls', async () => {
  const { COPY } = await import('../js/i18n.js');
  assert.ok(COPY.en.fullscreen && COPY.hi.fullscreen);
  assert.ok(COPY.en.exitFullscreen && COPY.hi.exitFullscreen);
  assert.equal(COPY.en.fullscreen, 'Full screen');
  assert.equal(COPY.hi.fullscreen, 'फुल स्क्रीन');
});
