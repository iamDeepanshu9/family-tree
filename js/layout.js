export const CARD_WIDTH = 272;
export const CARD_HEIGHT = 396;
export const H_GAP = 42;
export const V_GAP = 116;
export const TREE_TOP = 118;

export function layoutTree(tree, { collapsed = new Set(), maxGeneration = Infinity } = {}) {
  const visibleChildren = member => member.depth >= maxGeneration || collapsed.has(member.id) ? [] : member.children;
  const widths = new Map();
  const measure = member => {
    const children = visibleChildren(member);
    const childrenWidth = children.length ? children.reduce((sum, child) => sum + measure(child), 0) + H_GAP * (children.length - 1) : 0;
    const width = Math.max(CARD_WIDTH, childrenWidth);
    widths.set(member.id, width);
    return width;
  };
  measure(tree.root);
  const nodes = [];
  const connectors = [];
  const place = (member, left, depth) => {
    const subtreeWidth = widths.get(member.id);
    const x = left + (subtreeWidth - CARD_WIDTH) / 2;
    const y = TREE_TOP + depth * (CARD_HEIGHT + V_GAP);
    nodes.push({ member, x, y, width: CARD_WIDTH, height: CARD_HEIGHT });
    let childLeft = left;
    for (const child of visibleChildren(member)) {
      const childWidth = widths.get(child.id);
      const childX = childLeft + (childWidth - CARD_WIDTH) / 2;
      const childY = TREE_TOP + (depth + 1) * (CARD_HEIGHT + V_GAP);
      connectors.push({ from: { x: x + CARD_WIDTH / 2, y: y + CARD_HEIGHT }, to: { x: childX + CARD_WIDTH / 2, y: childY } });
      place(child, childLeft, depth + 1);
      childLeft += childWidth + H_GAP;
    }
  };
  place(tree.root, 92, 0);
  const width = widths.get(tree.root.id) + 184;
  const maxDepth = nodes.reduce((max, node) => Math.max(max, node.member.depth), 0);
  const height = TREE_TOP + (maxDepth + 1) * CARD_HEIGHT + maxDepth * V_GAP + 150;
  return { nodes, connectors, width, height };
}
