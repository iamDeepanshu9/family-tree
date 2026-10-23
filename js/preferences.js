const KEY = 'family-tree-preferences';
const browserLocale = navigator.language?.toLowerCase().startsWith('hi') ? 'hi' : 'en';

export function loadPreferences() {
  try { return { locale: browserLocale, textSize: 'default', contrast: false, viewerId: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; }
  catch { return { locale: browserLocale, textSize: 'default', contrast: false, viewerId: null }; }
}

export function savePreferences(prefs) { localStorage.setItem(KEY, JSON.stringify(prefs)); }

export function applyPreferences(prefs) {
  document.documentElement.lang = prefs.locale === 'hi' ? 'hi' : 'en';
  document.documentElement.dataset.textSize = prefs.textSize;
  document.documentElement.dataset.contrast = prefs.contrast ? 'high' : 'normal';
  document.querySelectorAll('[data-text-size]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.textSize === prefs.textSize)));
  document.querySelector('#contrast-toggle')?.setAttribute('aria-pressed', String(prefs.contrast));
}
