export const CARD_WIDTH = 272;
export const CARD_HEIGHT = 396;
export const H_GAP = 42;
export const V_GAP = 116;
export const TREE_TOP = 118;
export const COUPLE_GAP = 18;

export function getNodeWidth(member) {
  const count = member?.spouses?.length || 0;
  return count > 0 ? CARD_WIDTH + count * (CARD_WIDTH + COUPLE_GAP) : CARD_WIDTH;
}

export function layoutTree(tree, { collapsed = new Set(), maxGeneration = Infinity } = {}) {
  const visibleChildren = member => member.depth >= maxGeneration || collapsed.has(member.id) ? [] : member.children;
  const widths = new Map();
  const measure = member => {
    const children = visibleChildren(member);
    const nodeCardWidth = getNodeWidth(member);
    const childrenWidth = children.length ? children.reduce((sum, child) => sum + measure(child), 0) + H_GAP * (children.length - 1) : 0;
    const width = Math.max(nodeCardWidth, childrenWidth);
    widths.set(member.id, width);
    return width;
  };
  measure(tree.root);
  const nodes = [];
  const connectors = [];
  const place = (member, left, depth) => {
    const subtreeWidth = widths.get(member.id);
    const nodeCardWidth = getNodeWidth(member);
    const x = left + (subtreeWidth - nodeCardWidth) / 2;
    const y = TREE_TOP + depth * (CARD_HEIGHT + V_GAP);
    nodes.push({ member, x, y, width: nodeCardWidth, height: CARD_HEIGHT });
    let childLeft = left;
    for (const child of visibleChildren(member)) {
      const childWidth = widths.get(child.id);
      const childCardWidth = getNodeWidth(child);
      const childX = childLeft + (childWidth - childCardWidth) / 2;
      const childY = TREE_TOP + (depth + 1) * (CARD_HEIGHT + V_GAP);
      connectors.push({
        from: { x: x + nodeCardWidth / 2, y: y + CARD_HEIGHT },
        to: { x: childX + childCardWidth / 2, y: childY }
      });
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
