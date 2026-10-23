import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFamily } from '../js/validate.js';
import { buildTree } from '../js/tree.js';
import { getRelation } from '../js/relations.js';
import { phaseOne } from './fixtures.js';

const tree = buildTree(validateFamily(structuredClone(phaseOne)).value);
test('derives direct and sibling relationships', () => {
  assert.equal(getRelation('p4', 'p2', tree, 'en'), 'Your father');
  assert.equal(getRelation('p2', 'p3', tree, 'hi'), 'आपके भाई');
});
test('distinguishes paternal uncles and cousins', () => {
  assert.equal(getRelation('p4', 'p3', tree, 'en'), 'Your younger paternal uncle');
  assert.equal(getRelation('p4', 'p5', tree, 'en'), 'Your cousin brother');
});
