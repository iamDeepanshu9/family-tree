const MEMBER_KEYS = new Set(["id", "name", "nameHindi", "gender", "parentId", "order", "birthYear", "deathYear", "photo", "bio", "branch", "isDeceased", "spouses"]);
const SPOUSE_KEYS = new Set(["name", "nameHindi", "birthYear", "deathYear", "photo", "bio"]);

function validYear(value) {
  return value == null || (Number.isInteger(value) && value >= 1000 && value <= 2200);
}

export function validateFamily(raw) {
  const errors = [];
  const warnings = [];
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { value: null, errors: ["The file must contain one JSON object."], warnings };
  if (!raw.family || typeof raw.family !== "object") errors.push('Missing required "family" details.');
  if (!Array.isArray(raw.members) || !raw.members.length) errors.push('"members" must be a non-empty list.');
  if (errors.length) return { value: null, errors, warnings };

  const family = { ...raw.family };
  if (!family.title || typeof family.title !== "string") errors.push('family.title must be a non-empty name.');
  if (!family.rootId || typeof family.rootId !== "string") errors.push('family.rootId must name the root member.');
  if ("daughters" in raw) errors.push('Use members with gender "F" instead of a separate daughters list.');

  const ids = new Set();
  const members = raw.members.map((source, index) => {
    const label = source?.name || source?.id || `at position ${index + 1}`;
    if (!source || typeof source !== "object" || Array.isArray(source)) {
      errors.push(`Member ${index + 1} must be an object.`);
      return { id: `invalid-${index}`, name: "Invalid member", gender: "M", parentId: null, _index: index };
    }
    for (const key of Object.keys(source)) if (!MEMBER_KEYS.has(key)) errors.push(`Member "${label}": field "${key}" is not supported.`);
    if (!source.id || typeof source.id !== "string") errors.push(`Member "${label}": id is required.`);
    else if (ids.has(source.id)) errors.push(`Member "${label}": id "${source.id}" is used more than once.`);
    else ids.add(source.id);
    if (!source.name || typeof source.name !== "string") errors.push(`Member "${label}": name is required.`);
    const gender = source.gender ?? "M";
    if (!['M', 'F'].includes(gender)) errors.push(`Member "${label}": gender must be "M" or "F".`);
    if (source.parentId !== null && typeof source.parentId !== "string") errors.push(`Member "${label}": parentId must be a member id or null.`);
    if (source.order != null && (!Number.isInteger(source.order) || source.order < 1)) errors.push(`Member "${label}": order must be a positive whole number.`);
    if (!validYear(source.birthYear)) errors.push(`Member "${label}": birthYear must be a four-digit year or null.`);
    if (!validYear(source.deathYear)) errors.push(`Member "${label}": deathYear must be a four-digit year or null.`);
    if (source.isDeceased != null && typeof source.isDeceased !== 'boolean') errors.push(`Member "${label}": isDeceased must be true or false.`);
    if (source.branch != null && typeof source.branch !== 'string') errors.push(`Member "${label}": branch must be text.`);
    if (source.birthYear && source.deathYear && source.deathYear < source.birthYear) errors.push(`Member "${label}": deathYear cannot be before birthYear.`);
    if ("spouseOf" in source) errors.push(`Member "${label}": use an embedded spouses list instead of spouseOf.`);
    if (gender === "F" && source.spouses?.length) errors.push(`Member "${label}": daughters cannot have spouses in this family tree.`);
    if (source.spouses != null && !Array.isArray(source.spouses)) errors.push(`Member "${label}": spouses must be a list.`);
    const spouses = Array.isArray(source.spouses) ? source.spouses.map((spouse, spouseIndex) => {
      const spouseLabel = spouse?.name || `${spouseIndex + 1}`;
      if (!spouse || typeof spouse !== "object" || Array.isArray(spouse)) {
        errors.push(`Member "${label}": spouse ${spouseIndex + 1} must be an object.`);
        return { name: "Invalid spouse" };
      }
      for (const key of Object.keys(spouse)) if (!SPOUSE_KEYS.has(key)) errors.push(`Spouse "${spouseLabel}" under "${label}": field "${key}" is not supported.`);
      if (!spouse.name || typeof spouse.name !== "string") errors.push(`Member "${label}": spouse ${spouseIndex + 1} needs a name.`);
      if (!validYear(spouse.birthYear) || !validYear(spouse.deathYear)) errors.push(`Spouse "${spouseLabel}" under "${label}": years must be four digits or null.`);
      return { ...spouse };
    }) : [];
    return { ...source, gender, spouses, _index: index };
  });

  const byId = new Map(members.map(member => [member.id, member]));
  const roots = members.filter(member => member.parentId === null);
  if (roots.length !== 1) errors.push(`Expected exactly one root member, but found ${roots.length}.`);
  if (roots.length === 1 && roots[0].id !== family.rootId) errors.push(`family.rootId is "${family.rootId}", but the root member is "${roots[0].id}".`);
  if (byId.get(family.rootId)?.gender === "F") errors.push("The root must be male for this paternal-line tree.");

  for (const member of members) {
    if (member.parentId === member.id) errors.push(`Member "${member.name}": a person cannot be their own father.`);
    if (member.parentId !== null && !byId.has(member.parentId)) errors.push(`Member "${member.name}": parentId "${member.parentId}" does not exist.`);
    const parent = byId.get(member.parentId);
    if (parent?.gender === "F") errors.push(`Member "${parent.name}": a female member cannot be used as parentId.`);
  }

  for (const member of members) {
    const seen = new Set();
    let current = member;
    while (current?.parentId != null) {
      if (seen.has(current.id)) {
        errors.push(`A parent cycle includes member "${member.name}".`);
        break;
      }
      seen.add(current.id);
      current = byId.get(current.parentId);
    }
  }

  const groups = new Map();
  for (const member of members.filter(item => item.parentId)) {
    if (!groups.has(member.parentId)) groups.set(member.parentId, []);
    groups.get(member.parentId).push(member);
  }
  for (const siblings of groups.values()) {
    const orders = siblings.filter(item => item.order != null).map(item => item.order);
    if (new Set(orders).size !== orders.length) warnings.push(`Children of "${byId.get(siblings[0].parentId)?.name}": repeated order values; birth year will break ties.`);
    if (siblings.some(item => item.order == null)) warnings.push(`Children of "${byId.get(siblings[0].parentId)?.name}": some order values are missing; birth year or file order will be used.`);
  }

  return { value: errors.length ? null : { family, members }, errors, warnings };
}
