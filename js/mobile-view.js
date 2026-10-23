import { COPY, alternateName, displayName, isDeceased, parentRelation, years } from './i18n.js';
import { bindPersonLinks, personCard, photoMarkup } from './components.js';
import { searchMembers } from './tree.js';
import { go } from './router.js';

function listSection(title, people, locale, t) {
  if (!people.length) return '';
  return `<section><h2 class="section-heading">${title}<span>${people.length}</span></h2><div class="card-list">${people.map(person => personCard(person, locale, { memoryLabel: t.lovingMemory, showBranch: true })).join('')}</div></section>`;
}

function bindCards(main) { bindPersonLinks(main, id => go(`/person/${encodeURIComponent(id)}`)); }

export function renderMobileHome(main, tree, prefs) {
  const t = COPY[prefs.locale]; const root = tree.root; const alt = alternateName(root, prefs.locale);
  main.innerHTML = `<div class="mobile-page home-page">
    <section class="mobile-summary" aria-label="Family summary"><div><span>${tree.memberCount}</span><small>${t.members}</small></div><i></i><div><span>${tree.generationCount}</span><small>${t.generations}</small></div></section>
    <section class="home-hero" aria-labelledby="home-title">
      ${photoMarkup(root, prefs.locale, 'hero-photo', true)}
      <div class="home-hero__copy"><small>${prefs.locale === 'hi' ? 'मूल पूर्वज' : 'Root ancestor'}</small><h1 id="home-title" tabindex="-1">${displayName(root, prefs.locale)}</h1>
      ${alt ? `<p class="alt-name">${alt}</p>` : ''}${years(root) ? `<p>${years(root)}</p>` : ''}
      ${isDeceased(root) ? `<p class="memory-label">${t.lovingMemory}</p>` : ''}</div>
    </section>
    <div class="home-actions"><a class="button" href="#/search">⌕ ${t.search}</a><a class="button secondary" href="#/tree">☷ ${t.fullTree}</a></div>
    <button class="identity-button" id="choose-viewer" type="button"><span>◎</span><span>${prefs.viewerId ? `${t.selectedAs}: ${displayName(tree.byId.get(prefs.viewerId), prefs.locale)}` : t.chooseMe}</span><b>›</b></button>
    ${listSection(t.nextGeneration, root.children, prefs.locale, t)}
  </div>`;
  main.querySelector('#choose-viewer').addEventListener('click', () => go('/search?mode=viewer'));
  bindCards(main);
}

export function renderMobilePerson(main, tree, prefs, id) {
  const t = COPY[prefs.locale]; const person = tree.byId.get(id) || tree.root; const father = tree.byId.get(person.parentId);
  const siblings = father ? father.children.filter(item => item.id !== person.id) : [];
  const brothers = siblings.filter(item => item.gender !== 'F'); const sisters = siblings.filter(item => item.gender === 'F');
  const sons = person.children.filter(item => item.gender !== 'F'); const daughters = person.children.filter(item => item.gender === 'F');
  const relation = parentRelation(person, father, prefs.locale);
  const alt = alternateName(person, prefs.locale);
  main.innerHTML = `<div class="mobile-page">
    <p class="viewing-line">${t.viewing}: ${displayName(person, prefs.locale)}</p>
    <article class="person-head">
      ${photoMarkup(person, prefs.locale, 'hero-photo', true)}
      <h1 tabindex="-1">${displayName(person, prefs.locale)}</h1>${alt ? `<p>${alt}</p>` : ''}
      <p>${years(person)}</p><p class="relation-label">${relation}</p>
      ${isDeceased(person) ? `<p class="memory-label">${t.lovingMemory}</p>` : ''}
      ${prefs.locale === 'hi' ? (person.bioHindi ? `<p class="bio">${person.bioHindi}</p>` : '') : (person.bio ? `<p class="bio">${person.bio}</p>` : '')}
    </article>
    ${listSection(t.father, father ? [father] : [], prefs.locale, t)}
    ${listSection(t.brothers, brothers, prefs.locale, t)}
    ${listSection(t.sisters, sisters, prefs.locale, t)}
    ${listSection(t.sons, sons, prefs.locale, t)}
    ${listSection(t.daughters, daughters, prefs.locale, t)}
  </div>`;
  bindCards(main);
}

export function renderMobileSearch(main, tree, prefs, route, onViewerChange) {
  const t = COPY[prefs.locale]; const viewerMode = route.query.get('mode') === 'viewer'; const initial = route.query.get('q') || '';
  main.innerHTML = `<div class="mobile-page"><h1 tabindex="-1">${viewerMode ? t.who : t.searchHeading}</h1>
    <label class="sr-only" for="family-search">${t.searchPlaceholder}</label><input id="family-search" class="search-field" type="search" value="${initial}" placeholder="${t.searchPlaceholder}" autocomplete="off">
    ${viewerMode && prefs.viewerId ? `<button id="clear-viewer" class="button quiet" type="button">${t.clear}</button>` : ''}
    <p class="search-count" id="search-count"></p><div class="card-list" id="search-results"></div></div>`;
  const input = main.querySelector('#family-search'); const output = main.querySelector('#search-results'); const count = main.querySelector('#search-count');
  const update = () => {
    const results = searchMembers(input.value, tree).filter(person => !person.embedded);
    count.textContent = input.value ? `${results.length} ${t.results}` : '';
    output.innerHTML = input.value ? (results.length ? results.map(person => personCard(person, prefs.locale, { memoryLabel: t.lovingMemory })).join('') : `<p class="empty-note">${t.noResults}</p>`) : '';
    bindPersonLinks(output, id => viewerMode ? onViewerChange(id) : go(`/person/${id}`));
  };
  let timer; input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(update, 120); });
  main.querySelector('#clear-viewer')?.addEventListener('click', () => onViewerChange(null));
  update(); input.focus({ preventScroll: true });
}

function outlineItem(member, locale, expanded, t) {
  const hasChildren = member.children.length > 0; const isOpen = expanded.has(member.id);
  return `<li><div class="outline-row">${hasChildren ? `<button class="outline-toggle" data-outline-toggle="${member.id}" aria-expanded="${isOpen}" aria-label="${isOpen ? 'Collapse' : 'Expand'} ${displayName(member, locale)}">${isOpen ? '−' : '+'}</button>` : '<span class="outline-toggle" aria-hidden="true">•</span>'}<button class="outline-person" data-person-id="${member.id}">${displayName(member, locale)}${isDeceased(member) ? ` <span class="memory-label">†</span>` : ''}<small>${member.branch ? member.branch.replace(/ Branch$/, '') : ''}</small></button></div>${hasChildren && isOpen ? `<ul>${member.children.map(child => outlineItem(child, locale, expanded, t)).join('')}</ul>` : ''}</li>`;
}

export function renderMobileOutline(main, tree, prefs, outlineState, rerender) {
  const t = COPY[prefs.locale];
  main.innerHTML = `<div class="mobile-page"><h1 tabindex="-1">${t.outline}</h1><ul class="outline-list">${outlineItem(tree.root, prefs.locale, outlineState, t)}</ul></div>`;
  bindCards(main);
  main.querySelectorAll('[data-outline-toggle]').forEach(button => button.addEventListener('click', () => { const id = button.dataset.outlineToggle; outlineState.has(id) ? outlineState.delete(id) : outlineState.add(id); rerender(); }));
}
