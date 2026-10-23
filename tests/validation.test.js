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
