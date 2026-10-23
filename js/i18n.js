export const COPY = {
  en: {
    back: 'Back', home: 'Home', language: 'Hindi', contrast: 'High contrast', members: 'members', generations: 'generations',
    nextGeneration: 'Next generation', chooseMe: 'Choose family member', changeMe: 'Change selected member', search: 'Search family', fullTree: 'Show full tree',
    viewing: 'Viewing', father: 'Father', brothers: 'Brothers', sisters: 'Sisters', sons: 'Sons', daughters: 'Daughters', wife: 'Wife',
    who: 'Select family member', clear: 'Clear selection', searchHeading: 'Search family', searchPlaceholder: 'Type a Hindi or English name', results: 'people found', noResults: 'No family members match that name.',
    outline: 'Full family tree', lovingMemory: 'In loving memory', born: 'Born', generation: 'Generation', details: 'Family details', close: 'Close details',
    fit: 'Fit to screen', reset: 'Reset view', print: 'Print / PDF', png: 'Export PNG', lineage: 'Highlight lineage', allGenerations: 'All generations', selectedAs: 'Relationships are shown for',
    noBio: 'No biography has been added yet.', overview: 'Overview', exploreTree: 'Drag to explore the family tree'
  },
  hi: {
    back: 'पीछे', home: 'मुखपृष्ठ', language: 'EN', contrast: 'अधिक कॉन्ट्रास्ट', members: 'सदस्य', generations: 'पीढ़ियाँ',
    nextGeneration: 'अगली पीढ़ी', chooseMe: 'परिवार सदस्य चुनें', changeMe: 'चुना सदस्य बदलें', search: 'परिवार खोजें', fullTree: 'पूरा वंशवृक्ष देखें',
    viewing: 'देख रहे हैं', father: 'पिता', brothers: 'भाई', sisters: 'बहनें', sons: 'पुत्र', daughters: 'पुत्रियाँ', wife: 'पत्नी',
    who: 'परिवार सदस्य चुनें', clear: 'चयन हटाएँ', searchHeading: 'परिवार खोजें', searchPlaceholder: 'हिंदी या अंग्रेज़ी नाम लिखें', results: 'लोग मिले', noResults: 'इस नाम से कोई सदस्य नहीं मिला।',
    outline: 'पूरा परिवार वंशवृक्ष', lovingMemory: 'स्नेहपूर्ण स्मृति में', born: 'जन्म', generation: 'पीढ़ी', details: 'परिवार विवरण', close: 'विवरण बंद करें',
    fit: 'स्क्रीन में दिखाएँ', reset: 'दृश्य रीसेट करें', print: 'प्रिंट / PDF', png: 'PNG बनाएँ', lineage: 'वंश रेखा दिखाएँ', allGenerations: 'सभी पीढ़ियाँ', selectedAs: 'संबंध इनके लिए दिखाए गए हैं',
    noBio: 'अभी जीवन परिचय नहीं जोड़ा गया है।', overview: 'अवलोकन', exploreTree: 'परिवार का वंशवृक्ष देखने के लिए खींचें'
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
export function years(person) {
  if (person.birthYear && person.deathYear) return `${person.birthYear} — ${person.deathYear}`;
  if (person.birthYear) return `${person.birthYear}`;
  if (person.deathYear) return `† ${person.deathYear}`;
  return '';
}
export function isDeceased(person) { return Boolean(person.isDeceased || person.deathYear); }
