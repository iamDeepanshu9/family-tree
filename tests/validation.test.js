import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFamily } from '../js/validate.js';
import { phaseOne } from './fixtures.js';

test('validates and defaults male gender', () => {
  const result = validateFamily(structuredClone(phaseOne));
  assert.equal(result.errors.length, 0);
  assert.equal(result.value.members[0].gender, 'M');
});

test('rejects duplicate ids and unknown parents', () => {
  const input = structuredClone(phaseOne);
  input.members[1].id = 'p1'; input.members[2].parentId = 'missing';
  const result = validateFamily(input);
  assert.ok(result.errors.some(error => error.includes('more than once')));
  assert.ok(result.errors.some(error => error.includes('does not exist')));
});

test('rejects a daughter used as a parent', () => {
  const input = structuredClone(phaseOne); input.members[1].gender = 'F';
  const result = validateFamily(input);
  assert.ok(result.errors.some(error => error.includes('cannot be used as parentId')));
});

test('rejects parent cycles', () => {
  const input = structuredClone(phaseOne); input.members[0].parentId = 'p4';
  const result = validateFamily(input);
  assert.ok(result.errors.some(error => error.includes('cycle')));
});

test('accepts branch and deceased status from CSV data', () => {
  const input = structuredClone(phaseOne);
  input.members[0].branch = 'Root Ancestor'; input.members[0].isDeceased = true;
  const result = validateFamily(input);
  assert.equal(result.errors.length, 0);
  assert.equal(result.value.members[0].isDeceased, true);
});

test('validates and normalizes full dob and dod dates', () => {
  const input = structuredClone(phaseOne);
  input.members[0].dob = '1913-05-15';
  input.members[0].dod = '2000-11-20';
  input.members[1].dob = '1960'; // year only
  input.members[1].dod = null;
  const result = validateFamily(input);
  assert.equal(result.errors.length, 0);
  assert.equal(result.value.members[0].dob, '1913-05-15');
  assert.equal(result.value.members[0].dod, '2000-11-20');
  assert.equal(result.value.members[0].birthYear, 1913);
  assert.equal(result.value.members[0].deathYear, 2000);
  assert.equal(result.value.members[0].isDeceased, true);
  assert.equal(result.value.members[1].birthYear, 1960);
});

test('rejects invalid dob or dod dates', () => {
  const input = structuredClone(phaseOne);
  input.members[0].dob = 'not-a-date';
  const result = validateFamily(input);
  assert.ok(result.errors.some(error => error.includes('dob must be a valid date')));
});

test('rejects dod before dob', () => {
  const input = structuredClone(phaseOne);
  input.members[0].dob = '1985-05-20';
  input.members[0].dod = '1980-01-15';
  const result = validateFamily(input);
  assert.ok(result.errors.some(error => error.includes('death date cannot be before birth date')));
});

test('validates spouse with bilingual names and deceased status', () => {
  const input = structuredClone(phaseOne);
  input.members[1].spouses = [{
    name: 'Swargiya Shrimati Kishna Devi',
    nameHindi: 'स्वर्गीय श्रीमती किशना देवी',
    isDeceased: true
  }];
  const result = validateFamily(input);
  assert.equal(result.errors.length, 0);
  assert.equal(result.value.members[1].spouses[0].name, 'Swargiya Shrimati Kishna Devi');
  assert.equal(result.value.members[1].spouses[0].nameHindi, 'स्वर्गीय श्रीमती किशना देवी');
  assert.equal(result.value.members[1].spouses[0].isDeceased, true);
});

test('accepts members and spouses with _index without error', () => {
  const input = structuredClone(phaseOne);
  input.members[0]._index = 0;
  input.members[1]._index = 1;
  const result = validateFamily(input);
  assert.equal(result.errors.length, 0);
  assert.equal(result.value.members[0]._index, 0);
});
