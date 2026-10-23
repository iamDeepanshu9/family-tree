import { loadFamily } from './data.js';
import { buildTree } from './tree.js';
import { COPY } from './i18n.js';
import { loadPreferences, savePreferences, applyPreferences } from './preferences.js';
import { readRoute, go } from './router.js';
import { renderMobileHome, renderMobileOutline, renderMobilePerson, renderMobileSearch } from './mobile-view.js';
import { createDesktop } from './desktop-view.js';

const main = document.querySelector('#app-main');
const announcer = document.querySelector('#announcer');
let prefs = loadPreferences(); let tree; let desktop; const outlineState = new Set();
applyPreferences(prefs);

function announce(message) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = message; }); }
function applyCopy() {
  const t = COPY[prefs.locale];
  document.querySelectorAll('[data-label]').forEach(element => { if (t[element.dataset.label]) element.textContent = t[element.dataset.label]; });
  if (!tree) return;
  document.querySelector('#family-title').textContent = prefs.locale === 'hi' ? (tree.family.titleHindi || tree.family.title) : tree.family.title;
  document.querySelector('#family-summary').textContent = `${tree.memberCount} ${t.members} · ${tree.generationCount} ${t.generations}`;
  document.title = `${tree.family.title} — ${tree.family.titleHindi || ''}`.replace(/ — $/, '');
}
function setPrefs(next) { prefs = { ...prefs, ...next }; savePreferences(prefs); applyPreferences(prefs); applyCopy(); desktop = null; render(); }
function renderError(error) { main.innerHTML = `<section class="error-state"><h1>The family tree could not open</h1><p>${error.message}</p>${error.details ? `<ul>${error.details.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}<p>Edit <code>data/family.json</code>, then reload this page.</p></section>`; }
function renderMobile() {
  const route = readRoute();
  document.querySelector('#settings-toggle').setAttribute('aria-expanded', 'false');
  document.querySelector('#display-settings').classList.remove('is-open');
  if (route.page === 'person') renderMobilePerson(main, tree, prefs, route.id);
  else if (route.page === 'search') renderMobileSearch(main, tree, prefs, route, viewerId => { setPrefs({ viewerId }); go('/home'); });
  else if (route.page === 'tree') renderMobileOutline(main, tree, prefs, outlineState, renderMobile);
  else renderMobileHome(main, tree, prefs);
  const heading = main.querySelector('h1');
  if (route.page !== 'search') heading?.focus({ preventScroll: true });
  if (heading) announce(heading.textContent);
}
function render() {
  if (!tree) return;
  if (matchMedia('(min-width: 900px)').matches) {
    if (!desktop) desktop = createDesktop(main, tree, prefs, announce); else desktop.refresh();
  } else { desktop = null; renderMobile(); }
}

document.querySelectorAll('[data-text-size]').forEach(button => button.addEventListener('click', () => setPrefs({ textSize: button.dataset.textSize })));
document.querySelector('#contrast-toggle').addEventListener('click', () => setPrefs({ contrast: !prefs.contrast }));
document.querySelector('#language-toggle').addEventListener('click', () => setPrefs({ locale: prefs.locale === 'en' ? 'hi' : 'en' }));
document.querySelector('#settings-toggle').addEventListener('click', event => {
  const open = event.currentTarget.getAttribute('aria-expanded') !== 'true';
  event.currentTarget.setAttribute('aria-expanded', String(open));
  document.querySelector('#display-settings').classList.toggle('is-open', open);
});
document.querySelector('#back-button').addEventListener('click', () => history.length > 1 ? history.back() : go('/home'));
window.addEventListener('hashchange', render);
const media = matchMedia('(min-width: 900px)'); media.addEventListener('change', () => { desktop = null; render(); });

try {
  const loaded = await loadFamily(); tree = buildTree(loaded.data); outlineState.add(tree.root.id); applyCopy(); render();
  if (loaded.warnings.length) console.info('Family data notes:', loaded.warnings);
} catch (error) { renderError(error); }
