import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFamily } from '../js/validate.js';
import { buildTree } from '../js/tree.js';
import { layoutTree } from '../js/layout.js';
import { phaseOne } from './fixtures.js';

const tree = buildTree(validateFamily(structuredClone(phaseOne)).value);
test('centers a parent over its children', () => {
  const layout = layoutTree(tree); const root = layout.nodes.find(node => node.member.id === 'p1');
  const children = layout.nodes.filter(node => node.member.parentId === 'p1');
  const rootCenter = root.x + root.width / 2; const childSpanCenter = (children[0].x + children.at(-1).x + children.at(-1).width) / 2;
  assert.equal(rootCenter, childSpanCenter);
});
test('collapse hides descendants', () => {
  const layout = layoutTree(tree, { collapsed: new Set(['p2']) });
  assert.ok(!layout.nodes.some(node => node.member.id === 'p4'));
});

test('maxGeneration filters visible generations', () => {
  const gen1Only = layoutTree(tree, { maxGeneration: 0 });
  assert.equal(gen1Only.nodes.length, 1);
  assert.equal(gen1Only.nodes[0].member.id, 'p1');

  const gen1And2 = layoutTree(tree, { maxGeneration: 1 });
  assert.equal(gen1And2.nodes.length, 3); // p1, p2, p3
  assert.ok(!gen1And2.nodes.some(node => node.member.depth > 1));

  const allGens = layoutTree(tree, { maxGeneration: Infinity });
  assert.equal(allGens.nodes.length, 5); // p1, p2, p3, p4, p5
});

test('widens node and positions couple when member has a spouse', () => {
  const input = structuredClone(phaseOne);
  input.members[1].spouses = [{
    id: 'p2-s1',
    name: 'Wife of p2'
  }];
  const customTree = buildTree(validateFamily(input).value);
  const layout = layoutTree(customTree);
  const p2Node = layout.nodes.find(n => n.member.id === 'p2');
  assert.equal(p2Node.width, 272 + 18 + 272);
});
