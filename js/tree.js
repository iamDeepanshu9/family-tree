function compareMembers(a, b) {
  const orderA = a.order ?? Number.POSITIVE_INFINITY;
  const orderB = b.order ?? Number.POSITIVE_INFINITY;
  if (orderA !== orderB) return orderA - orderB;
  const birthA = a.birthYear ?? Number.POSITIVE_INFINITY;
  const birthB = b.birthYear ?? Number.POSITIVE_INFINITY;
  if (birthA !== birthB) return birthA - birthB;
  return a._index - b._index;
}

export function buildTree(data) {
  const members = data.members.map(member => ({ ...member, children: [], depth: 0 }));
  const byId = new Map(members.map(member => [member.id, member]));
  for (const member of members) if (member.parentId) byId.get(member.parentId).children.push(member);
  for (const member of members) member.children.sort(compareMembers);
  const root = byId.get(data.family.rootId);
  const generations = [];
  const walk = (member, depth, ancestors) => {
    member.depth = depth;
    member.ancestors = ancestors;
    (generations[depth] ||= []).push(member);
    member.children.forEach(child => walk(child, depth + 1, [member.id, ...ancestors]));
  };
  walk(root, 0, []);
  const spouseCount = members.reduce((sum, member) => sum + member.spouses.length, 0);
  return { family: data.family, root, members, byId, generations, memberCount: members.length + spouseCount, generationCount: generations.length };
}

export function lineageToRoot(member, tree) {
  const ids = [];
  let current = member;
  while (current) { ids.push(current.id); current = tree.byId.get(current.parentId); }
  return ids;
}

export function searchMembers(query, tree) {
  const normalized = query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  if (!normalized) return [];
  const people = [...tree.members];
  for (const husband of tree.members) husband.spouses.forEach((spouse, index) => people.push({ ...spouse, id: `spouse:${husband.id}:${index}`, spouseOf: husband.id, embedded: true }));
  return people.filter(person => `${person.name} ${person.nameHindi || ''} ${person.branch || ''}`.toLocaleLowerCase().includes(normalized));
}
