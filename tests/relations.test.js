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

test('derives spouse kinship terms in English and Hindi', () => {
  const input = structuredClone(phaseOne);
  input.members[1].spouses = [{
    id: 'p2-s1',
    name: 'Wife of p2',
    nameHindi: 'पत्नी'
  }];
  const customTree = buildTree(validateFamily(input).value);
  // p4 is child of p2 -> p2-s1 is p4's mother
  assert.equal(getRelation('p4', 'p2-s1', customTree, 'en'), 'Your mother');
  assert.equal(getRelation('p4', 'p2-s1', customTree, 'hi'), 'आपकी माता');
  // p2 is husband -> p2-s1 is p2's wife
  assert.equal(getRelation('p2', 'p2-s1', customTree, 'en'), 'Your wife');
  assert.equal(getRelation('p2', 'p2-s1', customTree, 'hi'), 'आपकी पत्नी');
  // p3 is p2's brother -> p2-s1 is p3's bhabhi (sister-in-law)
  assert.equal(getRelation('p3', 'p2-s1', customTree, 'en'), 'Your sister-in-law (Bhabhi)');
  assert.equal(getRelation('p3', 'p2-s1', customTree, 'hi'), 'आपकी भाभी');
  // p1 is p2's father -> p2-s1 is daughter-in-law
  assert.equal(getRelation('p1', 'p2-s1', customTree, 'en'), 'Your daughter-in-law');
  assert.equal(getRelation('p1', 'p2-s1', customTree, 'hi'), 'आपकी पुत्रवधू (बहू)');
});
