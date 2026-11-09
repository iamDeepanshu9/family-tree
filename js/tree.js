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

  for (const member of members) {
    if (member.spouses && member.spouses.length) {
      member.spouses.forEach((spouse, index) => {
        const id = spouse.id || `${member.id}-s${index + 1}`;
        spouse.id = id;
        spouse.gender = spouse.gender || 'F';
        spouse.spouseOf = member.id;
        spouse.husband = member;
        spouse.depth = member.depth;
        spouse.branch = spouse.branch || member.branch;
        spouse.children = member.children;
        spouse.ancestors = member.ancestors;
        byId.set(id, spouse);
      });
    }
  }

  const spouseCount = members.reduce((sum, member) => sum + member.spouses.length, 0);
  return { family: data.family, root, members, byId, generations, memberCount: members.length + spouseCount, generationCount: generations.length };
}

export function lineageToRoot(member, tree) {
  const ids = [];
  let current = member;
  if (current?.spouseOf) {
    ids.push(current.id);
    current = tree.byId.get(current.spouseOf);
  }
  while (current) { ids.push(current.id); current = tree.byId.get(current.parentId); }
  return ids;
}

export function searchMembers(query, tree) {
  const normalized = query.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  if (!normalized) return [];
  const tokens = normalized.split(' ').filter(Boolean);
  const people = [...tree.members];
  for (const husband of tree.members) (husband.spouses || []).forEach((spouse, index) => people.push({ ...spouse, id: spouse.id || `${husband.id}-s${index + 1}`, spouseOf: husband.id, embedded: true }));
  
  const rank1 = [];
  const rank2 = [];
  const rank3 = [];
  const generic = new Set(['shri', 'swargiya', 'late', 'singh', 'kumar', 'श्री', 'स्वर्गीय', 'सिंह', 'कुमार']);

  for (const person of people) {
    const text = `${person.name} ${person.nameHindi || ''} ${person.branch || ''}`.toLocaleLowerCase();
    if (text.includes(normalized)) {
      rank1.push(person);
    } else if (tokens.length > 1 && tokens.every(tok => text.includes(tok))) {
      rank2.push(person);
    } else if (tokens.length > 1) {
      const matches = tokens.filter(tok => text.includes(tok));
      const hasSpecific = matches.some(tok => !generic.has(tok));
      if (hasSpecific) {
        rank3.push({ person, score: matches.length + (text.includes(tokens[0]) ? 2 : 0) });
      }
    }
  }
  rank3.sort((a, b) => b.score - a.score);
  return [...rank1, ...rank2, ...rank3.map(item => item.person)];
}
