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
