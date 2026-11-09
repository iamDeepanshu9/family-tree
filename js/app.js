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
  const isFs = document.body.classList.contains('fullscreen-mode');
  const fsBtn = document.querySelector('#fullscreen-toggle');
  if (fsBtn) {
    fsBtn.querySelector('[data-label]').textContent = isFs ? t.exitFullscreen : t.fullscreen;
    fsBtn.querySelector('.fullscreen-icon').textContent = isFs ? '✕' : '⛶';
  }
  if (!tree) return;
  document.querySelector('#family-title').textContent = prefs.locale === 'hi' ? (tree.family.titleHindi || tree.family.title) : tree.family.title;
  document.querySelector('#family-summary').textContent = `${tree.memberCount} ${t.members} · ${tree.generationCount} ${t.generations}`;
  document.title = `${tree.family.title} — ${tree.family.titleHindi || ''}`.replace(/ — $/, '');
}
function clearDesktop() { if (desktop && typeof desktop.destroy === 'function') desktop.destroy(); desktop = null; }
function setPrefs(next) { prefs = { ...prefs, ...next }; savePreferences(prefs); applyPreferences(prefs); applyCopy(); clearDesktop(); render(); }
function renderError(error) { main.innerHTML = `<section class="error-state"><h1>The family tree could not open</h1><p>${error.message}</p>${error.details ? `<ul>${error.details.map(item => `<li>${item}</li>`).join('')}</ul>` : ''}<p>Edit <code>data/family.json</code>, then reload this page.</p></section>`; }
function renderMobile() {
  const route = readRoute();
  document.querySelector('#display-settings-menu').open = false;
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
  const desktopMode = matchMedia('(min-width: 900px)').matches;
  document.querySelector('#display-settings-menu').open = desktopMode;
  if (desktopMode) {
    if (!desktop) desktop = createDesktop(main, tree, prefs, announce); else desktop.refresh();
  } else { clearDesktop(); renderMobile(); }
}

function toggleFullscreen(forceState) {
  const next = typeof forceState === 'boolean' ? forceState : !document.body.classList.contains('fullscreen-mode');
  document.body.classList.toggle('fullscreen-mode', next);
  const fsBtn = document.querySelector('#fullscreen-toggle');
  if (fsBtn) {
    fsBtn.setAttribute('aria-pressed', String(next));
    const t = COPY[prefs.locale];
    fsBtn.querySelector('[data-label]').textContent = next ? t.exitFullscreen : t.fullscreen;
    fsBtn.querySelector('.fullscreen-icon').textContent = next ? '✕' : '⛶';
  }
  announce(next ? (prefs.locale === 'hi' ? 'फुल स्क्रीन दृश्य सक्रिय' : 'Full screen active') : (prefs.locale === 'hi' ? 'सामान्य दृश्य सक्रिय' : 'Normal view active'));

  if (next && !document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {});
  } else if (!next && document.fullscreenElement && document.exitFullscreen) {
    document.exitFullscreen().catch(() => {});
  }

  if (desktop && typeof desktop.fit === 'function') {
    requestAnimationFrame(() => desktop.fit());
  }
}

document.querySelector('#fullscreen-toggle')?.addEventListener('click', () => toggleFullscreen());
window.addEventListener('keydown', event => {
  if (event.key === 'Escape' && document.body.classList.contains('fullscreen-mode')) {
    toggleFullscreen(false);
  }
});
document.addEventListener('fullscreenchange', () => {
  if (!document.fullscreenElement && document.body.classList.contains('fullscreen-mode')) {
    toggleFullscreen(false);
  }
});

document.querySelectorAll('[data-text-size]').forEach(button => button.addEventListener('click', () => setPrefs({ textSize: button.dataset.textSize })));
document.querySelector('#contrast-toggle').addEventListener('click', () => setPrefs({ contrast: !prefs.contrast }));
document.querySelector('#language-toggle').addEventListener('click', () => setPrefs({ locale: prefs.locale === 'en' ? 'hi' : 'en' }));
document.querySelector('#back-button').addEventListener('click', () => history.length > 1 ? history.back() : go('/home'));
window.addEventListener('hashchange', render);
const media = matchMedia('(min-width: 900px)'); media.addEventListener('change', () => { clearDesktop(); render(); });

try {
  const loaded = await loadFamily(); tree = buildTree(loaded.data); outlineState.add(tree.root.id); applyCopy(); render();
  if (loaded.warnings.length) console.info('Family data notes:', loaded.warnings);
} catch (error) { renderError(error); }
