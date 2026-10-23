import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFamily } from '../js/validate.js';
import { buildTree, searchMembers } from '../js/tree.js';
import { phaseOne } from './fixtures.js';

test('derives generations and ordered children', () => {
  const { value } = validateFamily(structuredClone(phaseOne)); const tree = buildTree(value);
  assert.equal(tree.generationCount, 3);
  assert.deepEqual(tree.root.children.map(child => child.id), ['p2', 'p3']);
  assert.equal(tree.byId.get('p4').depth, 2);
});

test('searches names in either script', () => {
  const input = structuredClone(phaseOne); input.members[3].nameHindi = 'पोता';
  const tree = buildTree(validateFamily(input).value);
  assert.equal(searchMembers('पोता', tree)[0].id, 'p4');
  assert.equal(searchMembers('grand', tree)[0].id, 'p4');
});
