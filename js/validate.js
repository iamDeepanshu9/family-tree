import { parseDate } from './i18n.js';

const MEMBER_KEYS = new Set(["id", "name", "nameHindi", "gender", "parentId", "order", "dob", "dod", "birthYear", "deathYear", "photo", "bio", "branch", "isDeceased", "spouses", "_index"]);
const SPOUSE_KEYS = new Set(["id", "name", "nameHindi", "gender", "dob", "dod", "birthYear", "deathYear", "photo", "bio", "isDeceased", "branch", "_index"]);

function validYear(value) {
  return value == null || (Number.isInteger(value) && value >= 1000 && value <= 2200);
}

function validDateValue(value) {
  if (value == null) return true;
  return parseDate(value) !== undefined;
}

function isDateBefore(a, b) {
  if (a.year !== b.year) return a.year < b.year;
  if (a.month != null && b.month != null && a.month !== b.month) return a.month < b.month;
  if (a.day != null && b.day != null && a.day !== b.day) return a.day < b.day;
  return false;
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
    if (source.dob !== undefined && !validDateValue(source.dob)) errors.push(`Member "${label}": dob must be a valid date or a four-digit year.`);
    if (source.dod !== undefined && !validDateValue(source.dod)) errors.push(`Member "${label}": dod must be a valid date or a four-digit year.`);
    if (source.birthYear !== undefined && !validYear(source.birthYear)) errors.push(`Member "${label}": birthYear must be a four-digit year or null.`);
    if (source.deathYear !== undefined && !validYear(source.deathYear)) errors.push(`Member "${label}": deathYear must be a four-digit year or null.`);
    if (source.isDeceased != null && typeof source.isDeceased !== 'boolean') errors.push(`Member "${label}": isDeceased must be true or false.`);
    if (source.branch != null && typeof source.branch !== 'string') errors.push(`Member "${label}": branch must be text.`);
    const birthParsed = parseDate(source.dob ?? source.birthYear);
    const deathParsed = parseDate(source.dod ?? source.deathYear);
    if (source.birthYear && source.deathYear && source.deathYear < source.birthYear) {
      errors.push(`Member "${label}": deathYear cannot be before birthYear.`);
    } else if (birthParsed && deathParsed && isDateBefore(deathParsed, birthParsed)) {
      errors.push(`Member "${label}": death date cannot be before birth date.`);
    }
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
      if (spouse.dob !== undefined && !validDateValue(spouse.dob)) errors.push(`Spouse "${spouseLabel}" under "${label}": dob must be a valid date or year.`);
      if (spouse.dod !== undefined && !validDateValue(spouse.dod)) errors.push(`Spouse "${spouseLabel}" under "${label}": dod must be a valid date or year.`);
      if (spouse.birthYear !== undefined && !validYear(spouse.birthYear)) errors.push(`Spouse "${spouseLabel}" under "${label}": years must be four digits or null.`);
      if (spouse.deathYear !== undefined && !validYear(spouse.deathYear)) errors.push(`Spouse "${spouseLabel}" under "${label}": years must be four digits or null.`);
      const spouseBirthParsed = parseDate(spouse.dob ?? spouse.birthYear);
      const spouseDeathParsed = parseDate(spouse.dod ?? spouse.deathYear);
      if (spouse.birthYear && spouse.deathYear && spouse.deathYear < spouse.birthYear) {
        errors.push(`Spouse "${spouseLabel}" under "${label}": deathYear cannot be before birthYear.`);
      } else if (spouseBirthParsed && spouseDeathParsed && isDateBefore(spouseDeathParsed, spouseBirthParsed)) {
        errors.push(`Spouse "${spouseLabel}" under "${label}": death date cannot be before birth date.`);
      }
      const sDob = spouse.dob !== undefined ? spouse.dob : (spouse.birthYear ?? null);
      const sDod = spouse.dod !== undefined ? spouse.dod : (spouse.deathYear ?? null);
      const sBirthYear = spouseBirthParsed?.year ?? (validYear(spouse.birthYear) ? spouse.birthYear : null);
      const sDeathYear = spouseDeathParsed?.year ?? (validYear(spouse.deathYear) ? spouse.deathYear : null);
      const sIsDeceased = Boolean(spouse.isDeceased || sDod != null || sDeathYear != null);
      return { ...spouse, dob: sDob, dod: sDod, birthYear: sBirthYear, deathYear: sDeathYear, isDeceased: sIsDeceased };
    }) : [];

    const dob = source.dob !== undefined ? source.dob : (source.birthYear ?? null);
    const dod = source.dod !== undefined ? source.dod : (source.deathYear ?? null);
    const birthYear = birthParsed?.year ?? (validYear(source.birthYear) ? source.birthYear : null);
    const deathYear = deathParsed?.year ?? (validYear(source.deathYear) ? source.deathYear : null);
    const isDeceased = Boolean(source.isDeceased || dod != null || deathYear != null);

    return { ...source, gender, dob, dod, birthYear, deathYear, isDeceased, spouses, _index: index };
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
