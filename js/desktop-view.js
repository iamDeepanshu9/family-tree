import { COPY, alternateName, displayName, isDeceased, years } from './i18n.js';
import { photoMarkup } from './components.js';
import { getRelation } from './relations.js';
import { CARD_HEIGHT, V_GAP, TREE_TOP, layoutTree } from './layout.js';
import { lineageToRoot, searchMembers } from './tree.js';

export function createDesktop(main, tree, prefs, announce) {
  const state = { collapsed: new Set(), maxGeneration: Infinity, selectedId: null, lineage: new Set(), searchHit: null, x: 0, y: 0, scale: 1, dragging: null, layout: null };
  main.innerHTML = `<div class="desktop-app">
    <section class="tree-masthead" aria-labelledby="desktop-tree-title">
      <img class="masthead-corner masthead-corner--left" src="img/botanical-corner.svg" alt="">
      <img class="masthead-corner masthead-corner--right" src="img/botanical-corner.svg" alt="">
      <img class="tree-emblem" src="img/tree-emblem.svg" alt="">
      <h1 id="desktop-tree-title">${tree.family.titleHindi || tree.family.title}</h1>
      <p class="masthead-summary">${prefs.locale === 'hi' ? (tree.family.titleHindi || tree.family.title) : tree.family.title} <span aria-hidden="true">·</span> ${tree.memberCount} ${COPY[prefs.locale].members} <span aria-hidden="true">·</span> ${tree.generationCount} ${COPY[prefs.locale].generations}</p>
      <span class="masthead-flourish" aria-hidden="true">◇◇</span>
    </section>
    <div class="desktop-toolbar" aria-label="Tree controls">
      <input id="desktop-search" type="search" aria-label="Search family"><button id="search-button" type="button">⌕</button>
      <select id="generation-filter" aria-label="Visible generations"></select>
      <button data-action="zoom-out" type="button" aria-label="Zoom out">−</button><button data-action="zoom-in" type="button" aria-label="Zoom in">+</button>
      <button data-action="fit" type="button"></button><button data-action="reset" type="button"></button>
      <span class="toolbar-spacer"></span><button data-action="print" type="button"></button><button data-action="png" type="button"></button>
    </div>
    <div class="tree-viewport" tabindex="0" aria-label="Interactive family tree"><div class="tree-stage"></div></div>
    <section class="overview-panel" aria-label="Tree overview">
      <header><strong>${COPY[prefs.locale].overview} <small>(${tree.memberCount} ${COPY[prefs.locale].members})</small></strong><span>${tree.generationCount} ${COPY[prefs.locale].generations}</span></header>
      <svg class="minimap" viewBox="0 0 520 170" aria-hidden="true"></svg>
    </section>
    <aside class="detail-panel" aria-labelledby="detail-heading" hidden></aside>
  </div>`;
  const root = main.querySelector('.desktop-app'); const viewport = root.querySelector('.tree-viewport'); const stage = root.querySelector('.tree-stage'); const panel = root.querySelector('.detail-panel'); const minimap = root.querySelector('.minimap');

  function translate() {
    stage.style.transform = `translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    renderMinimap();
  }
  function cardHtml(node) {
    const person = node.member; const selected = state.selectedId === person.id; const lineage = state.lineage.has(person.id); const hit = state.searchHit === person.id; const deceased = isDeceased(person); const lifeYears = years(person);
    return `<button class="tree-card${deceased ? ' is-deceased' : ''}${selected ? ' is-selected' : ''}${lineage ? ' is-lineage' : ''}${hit ? ' is-search-hit' : ''}" data-person-id="${person.id}" style="left:${node.x}px;top:${node.y}px" aria-label="${displayName(person, prefs.locale)}">
      <span class="tree-card__portrait">${photoMarkup(person, prefs.locale)}${deceased ? '<img class="memorial-garland" src="img/memorial-garland.png" alt="" aria-hidden="true">' : ''}</span>
      <span class="tree-card__identity"><strong>${displayName(person, prefs.locale)}</strong><small class="tree-card__alternate">${alternateName(person, prefs.locale)}</small>${lifeYears ? `<small class="tree-card__years">${lifeYears}</small>` : ''}</span>
      ${deceased ? `<span class="memory-label"><span aria-hidden="true">◆</span>${COPY[prefs.locale].lovingMemory}</span>` : ''}
      ${person.children.length ? `<span class="collapse-button" role="button" tabindex="0" data-collapse="${person.id}" aria-label="${state.collapsed.has(person.id) ? 'Expand' : 'Collapse'} branch">${state.collapsed.has(person.id) ? '+' : '−'}</span>` : ''}
    </button>`;
  }
  function renderTree() {
    state.layout = layoutTree(tree, state);
    stage.style.width = `${state.layout.width}px`; stage.style.height = `${state.layout.height}px`;
    const paths = state.layout.connectors.map(({ from, to }) => { const mid = from.y + (to.y - from.y) / 2; return `<path d="M ${from.x} ${from.y} V ${mid} H ${to.x} V ${to.y}"/>`; }).join('');
    const leaves = state.layout.connectors.map(({ to }) => `<g class="connector-leaf" transform="translate(${to.x - 9} ${to.y - 21})"><path d="M9 22V4"/><path d="M9 13C2 11 1 5 2 1c6 1 9 5 7 12Z"/><path d="M9 16c7-2 9-7 8-12-6 1-9 5-8 12Z"/></g>`).join('');
    const labels = [...new Set(state.layout.nodes.map(node => node.member.depth))].map(depth => `<div class="generation-label" style="top:${TREE_TOP + 20 + depth * (CARD_HEIGHT + V_GAP)}px"><span>${COPY[prefs.locale].generation} ${depth + 1}</span><i aria-hidden="true"></i></div>`).join('');
    stage.innerHTML = `<svg class="connector-layer" width="${state.layout.width}" height="${state.layout.height}">${paths}${leaves}</svg>${labels}${state.layout.nodes.map(cardHtml).join('')}<p class="drag-hint" aria-hidden="true">☜ <em>${COPY[prefs.locale].exploreTree}</em></p>`;
    stage.querySelectorAll('.tree-card').forEach(card => card.addEventListener('click', () => selectPerson(card.dataset.personId)));
    stage.querySelectorAll('[data-collapse]').forEach(control => {
      const toggle = event => { event.stopPropagation(); const id = control.dataset.collapse; state.collapsed.has(id) ? state.collapsed.delete(id) : state.collapsed.add(id); renderTree(); };
      control.addEventListener('click', toggle); control.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') toggle(event); });
    });
    renderMinimap();
  }
  function selectPerson(id) {
    const person = tree.byId.get(id); if (!person) return; state.selectedId = id; state.searchHit = null;
    const t = COPY[prefs.locale]; const viewer = prefs.viewerId || tree.root.id;
    const relatives = [tree.byId.get(person.parentId), ...person.children, ...(tree.byId.get(person.parentId)?.children || []).filter(item => item.id !== person.id)].filter(Boolean);
    panel.hidden = false; panel.innerHTML = `<button class="detail-panel__close" type="button" aria-label="${t.close}">×</button>${photoMarkup(person, prefs.locale, 'detail-photo', true)}
      <h2 id="detail-heading">${displayName(person, prefs.locale)}</h2><p>${alternateName(person, prefs.locale)}</p><p>${years(person)}</p><p class="relation-label">${getRelation(viewer, id, tree, prefs.locale)}</p>
      ${isDeceased(person) ? `<p class="memory-label">${t.lovingMemory}</p>` : ''}<p>${person.bio || t.noBio}</p>
      <button class="button quiet" id="lineage-button" type="button">${t.lineage}</button>
      <h3>${t.details}</h3><div class="detail-links">${relatives.map(relative => `<button class="button secondary" data-related-id="${relative.id}">${displayName(relative, prefs.locale)}</button>`).join('')}</div>`;
    panel.querySelector('.detail-panel__close').addEventListener('click', () => { panel.hidden = true; state.selectedId = null; renderTree(); });
    panel.querySelector('#lineage-button').addEventListener('click', () => { state.lineage = new Set(lineageToRoot(person, tree)); renderTree(); });
    panel.querySelectorAll('[data-related-id]').forEach(button => button.addEventListener('click', () => { selectPerson(button.dataset.relatedId); centerOn(button.dataset.relatedId); }));
    renderTree(); announce(`${t.viewing}: ${displayName(person, prefs.locale)}`);
  }
  function centerOn(id) {
    const node = state.layout.nodes.find(item => item.member.id === id); if (!node) return;
    state.x = viewport.clientWidth / 2 - (node.x + node.width / 2) * state.scale; state.y = viewport.clientHeight / 2 - (node.y + node.height / 2) * state.scale; translate();
  }
  function fit() {
    const pad = 80; state.scale = Math.max(.5, Math.min(1, (viewport.clientWidth - pad) / state.layout.width));
    state.x = (viewport.clientWidth - state.layout.width * state.scale) / 2; state.y = 24; translate();
  }
  function renderMinimap() {
    if (!state.layout) return; const sx = 500 / state.layout.width; const sy = 150 / state.layout.height; const scale = Math.min(sx, sy); const ox = 10, oy = 10;
    const nodes = state.layout.nodes.map(node => `<rect class="node" x="${ox + node.x * scale}" y="${oy + node.y * scale}" width="${Math.max(3, node.width * scale)}" height="${Math.max(3, node.height * scale)}" rx="2"/>`).join('');
    const vx = ox + (-state.x / state.scale) * scale; const vy = oy + (-state.y / state.scale) * scale; const vw = viewport.clientWidth / state.scale * scale; const vh = viewport.clientHeight / state.scale * scale;
    minimap.innerHTML = `${nodes}<rect class="view" x="${vx}" y="${vy}" width="${vw}" height="${vh}"/>`;
  }
  function setLabels() {
    const t = COPY[prefs.locale]; root.querySelector('#desktop-search').placeholder = t.searchPlaceholder;
    root.querySelector('[data-action="fit"]').textContent = t.fit; root.querySelector('[data-action="reset"]').textContent = t.reset; root.querySelector('[data-action="print"]').textContent = t.print; root.querySelector('[data-action="png"]').textContent = t.png;
    const select = root.querySelector('#generation-filter'); select.innerHTML = `<option value="all">${t.allGenerations}</option>${tree.generations.map((_, index) => `<option value="${index}">${t.generation} ${index + 1}</option>`).join('')}`;
  }

  setLabels(); renderTree(); requestAnimationFrame(fit);
  root.querySelector('[data-action="fit"]').addEventListener('click', fit);
  root.querySelector('[data-action="reset"]').addEventListener('click', () => { state.scale = 1; state.x = 30; state.y = 70; translate(); });
  root.querySelector('[data-action="zoom-in"]').addEventListener('click', () => { state.scale = Math.min(2, state.scale + .15); translate(); });
  root.querySelector('[data-action="zoom-out"]').addEventListener('click', () => { state.scale = Math.max(.35, state.scale - .15); translate(); });
  root.querySelector('[data-action="print"]').addEventListener('click', () => window.print());
  root.querySelector('[data-action="png"]').addEventListener('click', async button => { try { button.currentTarget.disabled = true; const { exportTreeAsPng } = await import('./export.js'); await exportTreeAsPng(stage); } catch (error) { alert(error.message); } finally { button.currentTarget.disabled = false; } });
  root.querySelector('#generation-filter').addEventListener('change', event => { state.maxGeneration = event.target.value === 'all' ? Infinity : Number(event.target.value); renderTree(); fit(); });
  const doSearch = () => { const result = searchMembers(root.querySelector('#desktop-search').value, tree).find(person => !person.embedded); if (result) { state.searchHit = result.id; state.collapsed.clear(); renderTree(); centerOn(result.id); selectPerson(result.id); } else announce(COPY[prefs.locale].noResults); };
  root.querySelector('#search-button').addEventListener('click', doSearch); root.querySelector('#desktop-search').addEventListener('keydown', event => { if (event.key === 'Enter') doSearch(); });
  viewport.addEventListener('pointerdown', event => { if (event.target.closest('.tree-card')) return; state.dragging = { x: event.clientX, y: event.clientY, ox: state.x, oy: state.y }; viewport.setPointerCapture(event.pointerId); viewport.classList.add('is-dragging'); });
  viewport.addEventListener('pointermove', event => { if (!state.dragging) return; state.x = state.dragging.ox + event.clientX - state.dragging.x; state.y = state.dragging.oy + event.clientY - state.dragging.y; translate(); });
  viewport.addEventListener('pointerup', () => { state.dragging = null; viewport.classList.remove('is-dragging'); });
  viewport.addEventListener('wheel', event => { event.preventDefault(); if (event.ctrlKey) state.scale = Math.max(.35, Math.min(2, state.scale * (event.deltaY > 0 ? .9 : 1.1))); else { state.x -= event.deltaX; state.y -= event.deltaY; } translate(); }, { passive: false });
  viewport.addEventListener('keydown', event => { if (!state.selectedId || !['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)) return; const current = tree.byId.get(state.selectedId); let next; if (event.key === 'ArrowUp') next = tree.byId.get(current.parentId); if (event.key === 'ArrowDown') next = current.children[0]; if (event.key.startsWith('ArrowL') || event.key.startsWith('ArrowR')) { const siblings = tree.byId.get(current.parentId)?.children || [current]; const index = siblings.findIndex(item => item.id === current.id); next = siblings[index + (event.key === 'ArrowLeft' ? -1 : 1)]; } if (next) { selectPerson(next.id); centerOn(next.id); event.preventDefault(); } });
  minimap.addEventListener('click', event => { const rect = minimap.getBoundingClientRect(); const px = (event.clientX - rect.left) / rect.width * state.layout.width; const py = (event.clientY - rect.top) / rect.height * state.layout.height; state.x = viewport.clientWidth / 2 - px * state.scale; state.y = viewport.clientHeight / 2 - py * state.scale; translate(); });
  return { destroy() {}, refresh() { setLabels(); renderTree(); if (state.selectedId) selectPerson(state.selectedId); } };
}
