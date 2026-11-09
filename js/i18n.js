export const COPY = {
  en: {
    back: 'Back', home: 'Home', language: 'Hindi', contrast: 'High contrast', members: 'members', generations: 'generations',
    nextGeneration: 'Next generation', chooseMe: 'Choose family member', changeMe: 'Change selected member', search: 'Search family', fullTree: 'Show full tree',
    viewing: 'Viewing', father: 'Father', brothers: 'Brothers', sisters: 'Sisters', sons: 'Sons', daughters: 'Daughters', wife: 'Wife',
    who: 'Select family member', clear: 'Clear selection', searchHeading: 'Search family', searchPlaceholder: 'Type a Hindi or English name', results: 'people found', noResults: 'No family members match that name.',
    outline: 'Full family tree', lovingMemory: 'In loving memory', born: 'Born', generation: 'Generation', details: 'Family details', close: 'Close details',
    fit: 'Fit to screen', reset: 'Reset view', print: 'Print / PDF', png: 'Export PNG', lineage: 'Highlight lineage', allGenerations: 'All generations', selectedAs: 'Relationships are shown for',
    noBio: 'No biography has been added yet.', overview: 'Overview', exploreTree: 'Drag to explore the family tree',
    fullscreen: 'Full screen', exitFullscreen: 'Exit full screen', rootOnly: 'Gen 1 · Root only', upToGen: 'Gen 1–'
  },
  hi: {
    back: 'पीछे', home: 'मुखपृष्ठ', language: 'EN', contrast: 'अधिक कॉन्ट्रास्ट', members: 'सदस्य', generations: 'पीढ़ियाँ',
    nextGeneration: 'अगली पीढ़ी', chooseMe: 'परिवार सदस्य चुनें', changeMe: 'चुना सदस्य बदलें', search: 'परिवार खोजें', fullTree: 'पूरा वंशवृक्ष देखें',
    viewing: 'देख रहे हैं', father: 'पिता', brothers: 'भाई', sisters: 'बहनें', sons: 'पुत्र', daughters: 'पुत्रियाँ', wife: 'पत्नी',
    who: 'परिवार सदस्य चुनें', clear: 'चयन हटाएँ', searchHeading: 'परिवार खोजें', searchPlaceholder: 'हिंदी या अंग्रेज़ी नाम लिखें', results: 'लोग मिले', noResults: 'इस नाम से कोई सदस्य नहीं मिला।',
    outline: 'पूरा परिवार वंशवृक्ष', lovingMemory: 'स्नेहपूर्ण स्मृति में', born: 'जन्म', generation: 'पीढ़ी', details: 'परिवार विवरण', close: 'विवरण बंद करें',
    fit: 'स्क्रीन में दिखाएँ', reset: 'दृश्य रीसेट करें', print: 'प्रिंट / PDF', png: 'PNG बनाएँ', lineage: 'वंश रेखा दिखाएँ', allGenerations: 'सभी पीढ़ियाँ', selectedAs: 'संबंध इनके लिए दिखाए गए हैं',
    noBio: 'अभी जीवन परिचय नहीं जोड़ा गया है।', overview: 'अवलोकन', exploreTree: 'परिवार का वंशवृक्ष देखने के लिए खींचें',
    fullscreen: 'फुल स्क्रीन', exitFullscreen: 'फुल स्क्रीन बंद करें', rootOnly: 'पीढ़ी 1 · केवल मूल पूर्वज', upToGen: 'पीढ़ी 1–'
  }
};

export function displayName(person, locale) { return locale === 'hi' ? (person.nameHindi || person.name) : person.name; }
export function alternateName(person, locale) { const alt = locale === 'hi' ? '' : person.nameHindi; return alt && alt !== displayName(person, locale) ? alt : ''; }
export function parentRelation(person, parent, locale = 'en') {
  if (!parent) return locale === 'hi' ? 'मूल पूर्वज' : 'Root Ancestor';
  const rawName = displayName(parent, locale);
  const stripped = locale === 'hi'
    ? rawName.replace(/^(?:स्वर्गीय\s+)?श्री\s+/, '')
    : rawName.replace(/^(?:swargiya\s+)?(?:shri|mr\.?|late)\s+/i, '');
  const familiarName = stripped.trim().split(/\s+/)[0] || rawName;
  if (locale === 'hi') return `${familiarName} के ${person.gender === 'F' ? 'पुत्री' : 'पुत्र'}`;
  return `${familiarName}’s ${person.gender === 'F' ? 'Daughter' : 'Son'}`;
}
const MONTH_NAMES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  hi: ['जनवरी', 'फ़रवरी', 'मार्च', 'अप्रैल', 'मई', 'जून', 'जुलाई', 'अगस्त', 'सितंबर', 'अक्टूबर', 'नवंबर', 'दिसंबर']
};

const MONTH_MAP = new Map([
  ['jan', 1], ['january', 1], ['जनवरी', 1],
  ['feb', 2], ['february', 2], ['फ़रवरी', 2], ['फरवरी', 2],
  ['mar', 3], ['march', 3], ['मार्च', 3],
  ['apr', 4], ['april', 4], ['अप्रैल', 4],
  ['may', 5], ['मई', 5],
  ['jun', 6], ['june', 6], ['जून', 6],
  ['jul', 7], ['july', 7], ['जुलाई', 7],
  ['aug', 8], ['august', 8], ['अगस्त', 8],
  ['sep', 9], ['sept', 9], ['september', 9], ['सितंबर', 9], ['सितम्बर', 9],
  ['oct', 10], ['october', 10], ['अक्टूबर', 10], ['अक्तूबर', 10],
  ['nov', 11], ['november', 11], ['नवंबर', 11], ['नवम्बर', 11],
  ['dec', 12], ['december', 12], ['दिसंबर', 12], ['दिसम्बर', 12]
]);

export function parseDate(value) {
  if (value == null) return null;
  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= 1000 && value <= 2200) {
      return { year: value, month: null, day: null };
    }
    return undefined;
  }
  const s = String(value).trim();
  if (!s) return null;
  if (/^\d{4}$/.test(s)) {
    const yr = Number(s);
    return yr >= 1000 && yr <= 2200 ? { year: yr, month: null, day: null } : undefined;
  }
  const isoMatch = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?$/);
  if (isoMatch) {
    const yr = Number(isoMatch[1]);
    const mo = Number(isoMatch[2]);
    const da = isoMatch[3] ? Number(isoMatch[3]) : null;
    if (yr >= 1000 && yr <= 2200 && mo >= 1 && mo <= 12 && (da === null || (da >= 1 && da <= 31))) {
      return { year: yr, month: mo, day: da };
    }
  }
  const dmyMatch = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const da = Number(dmyMatch[1]);
    const mo = Number(dmyMatch[2]);
    const yr = Number(dmyMatch[3]);
    if (yr >= 1000 && yr <= 2200 && mo >= 1 && mo <= 12 && da >= 1 && da <= 31) {
      return { year: yr, month: mo, day: da };
    }
  }
  const tokens = s.split(/[\s,.-]+/).filter(Boolean);
  let year = null, month = null, day = null;
  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (MONTH_MAP.has(lower)) {
      month = MONTH_MAP.get(lower);
    } else if (/^\d{4}$/.test(token)) {
      year = Number(token);
    } else if (/^\d{1,2}$/.test(token)) {
      const num = Number(token);
      if (num >= 1 && num <= 31 && day === null) {
        day = num;
      }
    }
  }
  if (year && year >= 1000 && year <= 2200) {
    return { year, month, day };
  }
  return undefined;
}

export function formatDate(value, locale = 'en') {
  const parsed = parseDate(value);
  if (!parsed) return '';
  const months = MONTH_NAMES[locale] || MONTH_NAMES.en;
  if (parsed.month && parsed.day) {
    return `${parsed.day} ${months[parsed.month - 1]} ${parsed.year}`;
  }
  if (parsed.month) {
    return `${months[parsed.month - 1]} ${parsed.year}`;
  }
  return `${parsed.year}`;
}

export function years(person, locale = 'en') {
  const b = formatDate(person.dob ?? person.birthYear, locale);
  const d = formatDate(person.dod ?? person.deathYear, locale);
  if (b && d) return `${b} — ${d}`;
  if (b) return `${b}`;
  if (d) return `† ${d}`;
  return '';
}
export function isDeceased(person) { return Boolean(person.isDeceased || person.dod != null || person.deathYear != null); }
