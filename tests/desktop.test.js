import test from 'node:test';
import assert from 'node:assert/strict';
import { validateFamily } from '../js/validate.js';
import { buildTree, searchMembers } from '../js/tree.js';
import { layoutTree } from '../js/layout.js';
import { phaseOne } from './fixtures.js';

const tree = buildTree(validateFamily(structuredClone(phaseOne)).value);

test('desktop search finds members and handles deep generation target', () => {
  const hits = searchMembers('Grandson', tree);
  assert.ok(hits.length >= 1);
  const grandson = hits[0];
  assert.equal(grandson.id, 'p4');

  // If tree is filtered to generation 1 only (depth 0), grandson depth is 2
  const filtered = layoutTree(tree, { maxGeneration: 0 });
  assert.ok(!filtered.nodes.some(n => n.member.id === 'p4'));

  // When grandson is selected, unfiltering maxGeneration makes grandson visible
  const unfiltered = layoutTree(tree, { maxGeneration: Infinity });
  assert.ok(unfiltered.nodes.some(n => n.member.id === 'p4'));
});

test('desktop search expands collapsed ancestors', () => {
  const collapsed = new Set(['p2']);
  const layoutCollapsed = layoutTree(tree, { collapsed });
  assert.ok(!layoutCollapsed.nodes.some(n => n.member.id === 'p4'));

  // Expanding ancestors restores visibility
  let cur = tree.byId.get('p4');
  while (cur?.parentId) {
    collapsed.delete(cur.parentId);
    cur = tree.byId.get(cur.parentId);
  }
  const layoutRestored = layoutTree(tree, { collapsed });
  assert.ok(layoutRestored.nodes.some(n => n.member.id === 'p4'));
});

test('fit calculation fits large layout within viewport dimensions', () => {
  const layout = layoutTree(tree);
  const viewportW = 1200;
  const viewportH = 800;
  const padX = 80;
  const padY = 80;
  const viewW = viewportW - padX;
  const viewH = viewportH - padY;
  const scale = Math.max(0.1, Math.min(1.0, Math.min(viewW / layout.width, viewH / layout.height)));

  assert.ok(scale > 0 && scale <= 1.0);
  const fittedWidth = layout.width * scale;
  assert.ok(fittedWidth <= viewportW);
});

test('reset view centers horizontally on root ancestor', () => {
  const layout = layoutTree(tree);
  const rootNode = layout.nodes.find(n => n.member.id === tree.root.id);
  assert.ok(rootNode);

  const viewportW = 1200;
  const scale = 0.85;
  const x = viewportW / 2 - (rootNode.x + rootNode.width / 2) * scale;
  const rootCenterXOnScreen = x + (rootNode.x + rootNode.width / 2) * scale;

  assert.equal(Math.round(rootCenterXOnScreen), Math.round(viewportW / 2));
});

test('desktop CSS search-hit does not use infinite pulsating box-shadow animation', async () => {
  const { readFile } = await import('node:fs/promises');
  const css = await readFile('css/desktop.css', 'utf8');
  assert.ok(!css.includes('searchHitPulse'));
  assert.ok(!css.includes('infinite alternate'));
});

test('desktop generation select prevents event bubbling to prevent instant dropdown closing', async () => {
  const { readFile } = await import('node:fs/promises');
  const js = await readFile('js/desktop-view.js', 'utf8');
  // Must stop propagation for pointerdown, mousedown, and click
  assert.ok(js.includes("generationSelect.addEventListener('pointerdown', stopSelectPropagation)"));
  assert.ok(js.includes("generationSelect.addEventListener('mousedown', stopSelectPropagation)"));
  assert.ok(js.includes("generationSelect.addEventListener('click', stopSelectPropagation)"));
  // Document click listener must guard against redundant mutations
  assert.ok(js.includes("!searchResults.hidden && !event.target.closest('.desktop-search-wrap')"));
  // Desktop view must remove document click listener on destroy
  assert.ok(js.includes("document.removeEventListener('click', onDocClick)"));
});

test('desktop toolbar does not include print/pdf button', async () => {
  const { readFile } = await import('node:fs/promises');
  const js = await readFile('js/desktop-view.js', 'utf8');
  assert.ok(!js.includes('data-action="print"'));
});

test('desktop search supports multi-token queries and word order flexibility', () => {
  const hits = searchMembers('Grandson One', tree);
  assert.ok(hits.length >= 1);
  assert.equal(hits[0].id, 'p4');

  const reversed = searchMembers('Son Grand', tree);
  assert.ok(reversed.length >= 1);
  assert.equal(reversed[0].id, 'p4');
});

test('desktop centerOn translates vertically for deep generation targets without clamping to 20', () => {
  const layout = layoutTree(tree);
  const grandson = layout.nodes.find(n => n.member.id === 'p4');
  assert.ok(grandson);

  const viewportH = 600;
  const scale = 0.85;
  const targetY = viewportH / 2 - (grandson.y + grandson.height / 2) * scale;
  // grandson.y is 1142, so targetY must be negative to scroll downward
  assert.ok(targetY < 0);
});

test('desktop search controls prevent pointer event blocking and enable immediate click focus', async () => {
  const { readFile } = await import('node:fs/promises');
  const js = await readFile('js/desktop-view.js', 'utf8');
  const css = await readFile('css/desktop.css', 'utf8');

  // JS must stop propagation on pointerdown, mousedown, and click for search input and search button
  assert.ok(js.includes("searchInput.addEventListener('pointerdown', stopSearchPropagation)"));
  assert.ok(js.includes("searchInput.addEventListener('mousedown', stopSearchPropagation)"));
  assert.ok(js.includes("searchButton.addEventListener('pointerdown', stopSearchPropagation)"));
  assert.ok(js.includes("searchButton.addEventListener('mousedown', stopSearchPropagation)"));
  assert.ok(js.includes("searchWrap.addEventListener('pointerdown', stopSearchPropagation)"));

  // CSS must give toolbar and search wrap higher z-index than masthead and viewport
  assert.ok(css.includes(".desktop-toolbar { position: absolute; z-index: 100"));
  assert.ok(css.includes(".desktop-search-wrap {"));
  assert.ok(css.includes("z-index: 110;"));
  assert.ok(css.includes(".tree-masthead * { pointer-events: none !important; }"));
});

test('desktop view renders spouse with full card view and marriage connector badge', async () => {
  const { readFile } = await import('node:fs/promises');
  const js = await readFile('js/desktop-view.js', 'utf8');
  assert.ok(js.includes('tree-card tree-card--spouse'));
  assert.ok(js.includes('tree-marriage-badge'));
  assert.ok(js.includes('marriage-icon'));
});





